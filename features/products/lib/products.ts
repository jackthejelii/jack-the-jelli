import { cache } from "react";
import { Types, type QueryFilter } from "mongoose";
import { connectDB } from "@/lib/db";
import { escapeRegex } from "@/lib/slug";
import { Category, Product, type IProduct } from "@/models";
import {
  CATEGORY_SUGGESTION_LIMIT,
  DEFAULT_SORT,
  FEATURED_LIMIT,
  PRODUCTS_PER_PAGE,
  SEARCH_MIN_CHARS,
  SUGGESTION_LIMIT,
  type SortOption,
} from "@/features/products/lib/constants";
import type {
  CategorySuggestion,
  Product as PublicProduct,
  ProductDetail,
  ProductSuggestion,
  SuggestionsResult,
} from "@/features/products/lib/types";

// Server-only: pulls in Mongoose. Returns plain, serializable objects since
// Mongoose docs don't cross the server/client boundary (§6.3).

// `_id` breaks ties on every sort. Without it Mongo's ordering is unstable
// between the separate skip/limit queries that back "Discover More", so two
// products at the same price could both appear on page 1 and page 2 while a
// third never appears at all.
const SORT_MAP: Record<SortOption, Record<string, 1 | -1>> = {
  newest: { createdAt: -1, _id: -1 },
  "price-asc": { price: 1, _id: 1 },
  "price-desc": { price: -1, _id: 1 },
};

type PopulatedCategory = { _id: Types.ObjectId; name: string } | null;

/** A lean product with its category ref resolved by populate. */
type LeanProduct = Omit<IProduct, "category"> & {
  _id: Types.ObjectId;
  category: PopulatedCategory;
};

/** The one place the populate/lean incantation lives. */
function findLeanProducts(
  filter: QueryFilter<IProduct>,
  {
    sort,
    skip = 0,
    limit,
  }: { sort: Record<string, 1 | -1>; skip?: number; limit: number },
): Promise<LeanProduct[]> {
  return Product.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate<{ category: PopulatedCategory }>("category", "name")
    .lean<LeanProduct[]>();
}

function toPublicProduct(product: LeanProduct): PublicProduct {
  return {
    id: String(product._id),
    slug: product.slug,
    name: product.name,
    price: product.price,
    thumbnail: product.thumbnail,
    // A category deleted out from under a product shouldn't crash the grid.
    category: product.category?.name ?? "Uncategorised",
    stock: product.stock,
  };
}

function toProductDetail(product: LeanProduct): ProductDetail {
  return {
    id: String(product._id),
    slug: product.slug,
    name: product.name,
    sku: product.sku,
    // A category deleted out from under a product shouldn't crash the page.
    category: product.category?.name ?? "Uncategorised",
    price: product.price,
    description: product.description,
    stock: product.stock,
    thumbnail: product.thumbnail,
    images: (product.images ?? []).map((image) => ({
      url: image.url,
      publicId: image.publicId,
    })),
  };
}

/**
 * Categories are addressed by slug, never by `_id` — an ObjectId in a link is
 * unreadable and, worse, only valid against the database it was copied from.
 */
async function resolveCategoryId(
  slug: string | undefined,
): Promise<Types.ObjectId | null> {
  const normalised = slug?.trim().toLowerCase();
  if (!normalised) return null;

  const category = await Category.findOne({ slug: normalised })
    .select("_id")
    .lean<{ _id: Types.ObjectId } | null>();

  return category?._id ?? null;
}

type LeanCategory = { _id: Types.ObjectId; name: string; slug: string };

interface SearchMatch {
  /** Merged into the product filter. */
  filter: QueryFilter<IProduct>;
  /** The categories the query hit, for the search panel's shortcut rows. */
  categories: LeanCategory[];
}

/**
 * The one definition of what "searching the collection" means, shared by the
 * grid and the predictive panel. If only one of them knew about the category
 * widening, the panel's "See all 7 results" would land on a grid showing 3.
 *
 * Matches a product when its own name matches, or when it sits in a category
 * whose name does — so "wallets" finds the whole category, not just the pieces
 * with "wallet" in the title.
 */
async function matchSearch(search: string): Promise<SearchMatch> {
  // Escaped so a stray "(" in the search box can't throw a regex error.
  const pattern = new RegExp(escapeRegex(search), "i");

  // Unbounded on purpose: a storefront has a handful of categories, and the
  // filter needs every matching id even though the panel only shows two.
  const categories = await Category.find({ name: pattern })
    .sort({ name: 1 })
    .select("name slug")
    .lean<LeanCategory[]>();

  return {
    filter: categories.length
      ? {
          $or: [
            { name: pattern },
            { category: { $in: categories.map((c) => c._id) } },
          ],
        }
      : // No pointless $or when nothing matched.
        { name: pattern },
    categories,
  };
}

export interface PublicProductQuery {
  q?: string;
  categorySlug?: string;
  sort?: SortOption;
  page?: number;
}

export interface PublicProductListResult {
  products: PublicProduct[];
  total: number;
  page: number;
  totalPages: number;
}

const EMPTY_RESULT: PublicProductListResult = {
  products: [],
  total: 0,
  page: 1,
  totalPages: 1,
};

export async function getPublicProducts({
  q,
  categorySlug,
  sort = DEFAULT_SORT,
  page = 1,
}: PublicProductQuery): Promise<PublicProductListResult> {
  await connectDB();

  const filter: QueryFilter<IProduct> = { status: "Published" };

  const search = q?.trim();
  if (search) {
    Object.assign(filter, (await matchSearch(search)).filter);
  }

  if (categorySlug?.trim()) {
    const categoryId = await resolveCategoryId(categorySlug);
    // An unknown slug matches nothing, rather than silently showing everything.
    if (!categoryId) return EMPTY_RESULT;
    filter.category = categoryId;
  }

  const total = await Product.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / PRODUCTS_PER_PAGE));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const products = await findLeanProducts(filter, {
    sort: SORT_MAP[sort] ?? SORT_MAP[DEFAULT_SORT],
    skip: (currentPage - 1) * PRODUCTS_PER_PAGE,
    limit: PRODUCTS_PER_PAGE,
  });

  return {
    products: products.map(toPublicProduct),
    total,
    page: currentPage,
    totalPages,
  };
}

const EMPTY_SUGGESTIONS: Omit<SuggestionsResult, "q"> = {
  products: [],
  categories: [],
  total: 0,
};

/**
 * Backs the predictive search panel. Runs on the same `matchSearch` filter as
 * the grid, and honours the category filter the grid is currently under, so the
 * "See all N results" count is the number the shopper actually lands on after
 * submitting.
 *
 * The category *rows* deliberately stay unfiltered: they switch the filter
 * rather than sit inside it, so they're the way out when the active category
 * has no match for what was typed.
 */
export async function getProductSuggestions({
  q,
  categorySlug,
}: {
  q: string;
  categorySlug?: string;
}): Promise<SuggestionsResult> {
  const search = q.trim();
  if (search.length < SEARCH_MIN_CHARS) {
    return { q: search, ...EMPTY_SUGGESTIONS };
  }

  await connectDB();

  const { filter: searchFilter, categories } = await matchSearch(search);
  const categorySuggestions = categories
    .slice(0, CATEGORY_SUGGESTION_LIMIT)
    .map(({ name, slug }): CategorySuggestion => ({ name, slug }));

  const filter: QueryFilter<IProduct> = {
    status: "Published",
    ...searchFilter,
  };

  if (categorySlug?.trim()) {
    const categoryId = await resolveCategoryId(categorySlug);
    // Same rule as getPublicProducts: an unknown slug matches nothing rather
    // than quietly widening to everything.
    if (!categoryId) {
      return {
        q: search,
        ...EMPTY_SUGGESTIONS,
        categories: categorySuggestions,
      };
    }
    filter.category = categoryId;
  }

  // No `populate` and a narrow `select`, unlike findLeanProducts: a suggestion
  // row draws a thumb, a name and a price, so anything else is a wasted read.
  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(SORT_MAP[DEFAULT_SORT])
      .limit(SUGGESTION_LIMIT)
      .select("slug name price thumbnail")
      .lean<ProductSuggestion[]>(),
    Product.countDocuments(filter),
  ]);

  return {
    q: search,
    products: products.map((product) => ({
      slug: product.slug,
      name: product.name,
      price: product.price,
      thumbnail: product.thumbnail,
    })),
    categories: categorySuggestions,
    total,
  };
}

/**
 * The homepage featured strip. `featured` is an explicit admin flag on the
 * product (see models/Product.ts), so this is a real query — an admin
 * unpublishing or unflagging a piece takes it off the front page, and the
 * strip is empty until someone flags something rather than falling back to
 * "newest" and pretending to be curated.
 *
 * Ordered newest-first: there is no per-product sort key, so the most recent
 * addition to the selection leads. Reordering the strip by hand would need a
 * `featuredOrder` field, which nothing has asked for yet.
 */
export async function getFeaturedProducts(
  limit: number = FEATURED_LIMIT,
): Promise<PublicProduct[]> {
  await connectDB();

  const products = await findLeanProducts(
    { status: "Published", featured: true },
    { sort: { createdAt: -1, _id: -1 }, limit },
  );

  return products.map(toPublicProduct);
}

export interface RelatedProductQuery {
  /** The product being viewed — excluded from its own suggestions. */
  productId: string;
  price: number;
  limit?: number;
}

/**
 * Pieces nearest in price to the one being viewed, regardless of category.
 * Two bounded queries (one on each side of the price) beat scanning the whole
 * catalogue and sorting the distance in memory.
 */
export async function getRelatedProducts({
  productId,
  price,
  limit = 8,
}: RelatedProductQuery): Promise<PublicProduct[]> {
  if (!Types.ObjectId.isValid(productId)) return [];

  await connectDB();

  const base: QueryFilter<IProduct> = {
    status: "Published",
    _id: { $ne: new Types.ObjectId(productId) },
  };

  const [atOrAbove, below] = await Promise.all([
    findLeanProducts(
      { ...base, price: { $gte: price } },
      { sort: { price: 1, createdAt: -1, _id: 1 }, limit },
    ),
    findLeanProducts(
      { ...base, price: { $lt: price } },
      { sort: { price: -1, createdAt: -1, _id: 1 }, limit },
    ),
  ]);

  return [...atOrAbove, ...below]
    .sort((a, b) => {
      const distance = Math.abs(a.price - price) - Math.abs(b.price - price);
      if (distance !== 0) return distance;
      // Same distance (a tie above and below, or identical prices): newest wins.
      return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
    })
    .slice(0, limit)
    .map(toPublicProduct);
}

/**
 * Looks up a single product for the storefront detail page. Filters on
 * Published so a Draft or Archived slug 404s instead of leaking.
 *
 * Wrapped in React's `cache` because both `generateMetadata` and the page body
 * need it — Next dedupes `fetch`, but not arbitrary async functions, so without
 * this every product view costs two identical round trips.
 */
export const getPublicProductBySlug = cache(
  async (slug: string): Promise<ProductDetail | null> => {
    const normalised = slug.trim().toLowerCase();
    if (!normalised) return null;

    await connectDB();

    const product = await Product.findOne({
      slug: normalised,
      status: "Published",
    })
      .populate<{ category: PopulatedCategory }>("category", "name")
      .lean<LeanProduct | null>();

    return product ? toProductDetail(product) : null;
  },
);
