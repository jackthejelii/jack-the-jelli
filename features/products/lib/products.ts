import { cacheLife, cacheTag } from "next/cache";
import { Types, type QueryFilter } from "mongoose";
import { connectDB } from "@/lib/db";
import { escapeRegex } from "@/lib/slug";
import { Category, Product, type IProduct } from "@/models";
import {
  CATALOGUE_TAG,
  CATEGORY_SUGGESTION_LIMIT,
  DEFAULT_SORT,
  FEATURED_LIMIT,
  FEATURED_PRODUCTS_TAG,
  PRERENDER_LIMIT,
  PRODUCTS_PER_PAGE,
  SEARCH_MIN_CHARS,
  SITEMAP_LIMIT,
  SUGGESTION_LIMIT,
  type SortOption,
} from "@/features/products/lib/constants";
import type {
  CategorySuggestion,
  Product as PublicProduct,
  ProductDetail,
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

/** The projection behind a search suggestion — see getProductSuggestions. */
type LeanSuggestion = {
  slug: string;
  name: string;
  price: number;
  variants?: { images?: { url: string }[] }[];
};

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
    // A category deleted out from under a product shouldn't crash the grid.
    category: product.category?.name ?? "Uncategorised",
    variants: (product.variants ?? []).map((variant) => ({
      id: String(variant._id),
      color: variant.color,
      hex: variant.hex,
      stock: variant.stock,
      thumbnail: variant.images?.[0]?.url,
    })),
  };
}

function toProductDetail(product: LeanProduct): ProductDetail {
  return {
    id: String(product._id),
    slug: product.slug,
    name: product.name,
    // A category deleted out from under a product shouldn't crash the page.
    category: product.category?.name ?? "Uncategorised",
    price: product.price,
    description: product.description,
    material: product.material,
    dimensions: product.dimensions,
    variants: (product.variants ?? []).map((variant) => ({
      id: String(variant._id),
      color: variant.color,
      hex: variant.hex,
      sku: variant.sku,
      stock: variant.stock,
      images: (variant.images ?? []).map((image) => ({
        url: image.url,
        publicId: image.publicId,
      })),
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

  const search = q?.trim();
  const slug = categorySlug?.trim();

  // Phase 1. These two read different collections and neither needs the
  // other's answer, so they go out together. Sequentially they were two full
  // round trips to Atlas before the product query had even been built, which
  // on a cross-region cluster is the difference between a fast page and a
  // visibly slow one.
  const [searchMatch, categoryId] = await Promise.all([
    search ? matchSearch(search) : null,
    slug ? resolveCategoryId(slug) : null,
  ]);

  const filter: QueryFilter<IProduct> = { status: "Published" };
  if (searchMatch) Object.assign(filter, searchMatch.filter);

  if (slug) {
    // An unknown slug matches nothing, rather than silently showing everything.
    if (!categoryId) return EMPTY_RESULT;
    filter.category = categoryId;
  }

  const requestedPage = Math.max(1, page);
  const order = SORT_MAP[sort] ?? SORT_MAP[DEFAULT_SORT];

  // Phase 2. The count and the page itself also run together. The old order
  // made the find wait on the count purely to clamp an out-of-range `page`,
  // which costs every well-formed request a round trip to protect against a
  // hand-edited URL. Page 1 — the only page this route renders on the server —
  // is in range by definition, and any later page the UI can reach came from a
  // totalPages the client was already handed.
  const [total, requestedProducts] = await Promise.all([
    Product.countDocuments(filter),
    findLeanProducts(filter, {
      sort: order,
      skip: (requestedPage - 1) * PRODUCTS_PER_PAGE,
      limit: PRODUCTS_PER_PAGE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PRODUCTS_PER_PAGE));
  const currentPage = Math.min(requestedPage, totalPages);

  // Only the overflow case pays for a second query, and it re-reads exactly
  // what the sequential version would have fetched in the first place.
  const products =
    currentPage === requestedPage
      ? requestedProducts
      : await findLeanProducts(filter, {
          sort: order,
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
  // The thumb has to come through `variants` — there is no product-level image
  // any more — but only the first colourway's first photo is ever shown.
  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(SORT_MAP[DEFAULT_SORT])
      .limit(SUGGESTION_LIMIT)
      .select("slug name price variants.images")
      .lean<LeanSuggestion[]>(),
    Product.countDocuments(filter),
  ]);

  return {
    q: search,
    products: products.map((product) => ({
      slug: product.slug,
      name: product.name,
      price: product.price,
      thumbnail: product.variants?.[0]?.images?.[0]?.url,
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
  "use cache";
  // Keeps the homepage a fully prerendered page under Cache Components. Without
  // this the single query below would make `/` dynamic — a database round trip
  // on the most-visited route on the site, for data that changes when an admin
  // ticks a checkbox.
  cacheTag(FEATURED_PRODUCTS_TAG);
  cacheLife("days");

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
 * Cached rather than wrapped in React's `cache`. The old wrapper existed
 * because both `generateMetadata` and the page body call this, and Next
 * dedupes `fetch` but not arbitrary async functions — two identical round
 * trips per product view otherwise. `use cache` subsumes that: it dedupes
 * within a render *and* across requests, which React's `cache` never did.
 *
 * It is also what makes the route prerenderable at all. Mongoose stamps
 * `new Date()` internally, and reading the clock in a Server Component before
 * any uncached data is not allowed under Cache Components — `generateMetadata`
 * is a separate entry point, so the page's own `use cache` does not cover it.
 *
 * The lifetime matches the page body's deliberately: metadata and content
 * going stale at different rates would let a shared link show one title while
 * the page rendered another.
 */
export async function getPublicProductBySlug(
  slug: string,
): Promise<ProductDetail | null> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 60 * 60 * 24 * 365 });

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
}

export interface SitemapProduct {
  slug: string;
  /** Feeds `lastModified`; absent on documents written before `timestamps`. */
  updatedAt?: Date;
}

/**
 * Every product `app/sitemap.ts` is allowed to advertise.
 *
 * The `status: "Published"` filter is the whole point: a Draft or an Archived
 * slug 404s on the storefront (see getPublicProductBySlug), so listing one in
 * the sitemap is an explicit invitation for Google to crawl a dead URL and
 * report the site as serving soft 404s. Any change to what "live" means has to
 * land here as well as in the query helpers above.
 *
 * Cached rather than read per request for the same reason getFeaturedProducts
 * is: under Cache Components a metadata route is prerendered unless something
 * in it reaches for uncached data, and a sitemap nobody but a crawler reads is
 * not worth a round trip to Atlas on every hit. A day is the right staleness —
 * `CATALOGUE_TAG` is invalidated by the admin product actions, so publishing a
 * piece puts it in the sitemap immediately rather than tomorrow.
 */
export async function getSitemapProducts(
  limit: number = SITEMAP_LIMIT,
): Promise<SitemapProduct[]> {
  "use cache";
  cacheTag(CATALOGUE_TAG);
  cacheLife("days");

  await connectDB();

  const products = await Product.find({ status: "Published" })
    .sort({ updatedAt: -1, _id: -1 })
    .limit(limit)
    .select("slug updatedAt")
    .lean<{ slug: string; updatedAt?: Date }[]>();

  // Rebuilt field by field rather than returned as-is: `lean()` still hands
  // back `_id` as an ObjectId, and a `use cache` boundary serializes what
  // crosses it — an ObjectId throws there. Dates survive; ObjectIds do not.
  return products.map(({ slug, updatedAt }) => ({ slug, updatedAt }));
}

/**
 * A slug that `slugify` can never produce — it strips every non-alphanumeric
 * run down to a dash, so nothing with an underscore is reachable — used to keep
 * `generateStaticParams` non-empty when the catalogue has no published pieces.
 */
export const NO_PREBUILDABLE_SLUG = "__no_published_products__";

/**
 * Slugs to prerender at build time, newest first.
 *
 * The product route used to hand back an empty array so the build never needed
 * a database — but the homepage already queries `getFeaturedProducts` during
 * prerender, so that property was spent before this was reached. What it cost
 * was real: with nothing prebuilt, the first visitor to *every* product paid a
 * cold render plus a round trip to Atlas, and on a catalogue this size that is
 * most visitors.
 *
 * Bounded rather than exhaustive. Prerendering the whole catalogue would make
 * build time grow with the shop, and `dynamicParams` is left at its default so
 * anything past this limit still renders on first request and is cached from
 * then on — the same behaviour every product had before, now only for the tail.
 *
 * Never returns an empty array. Under Cache Components a `generateStaticParams`
 * that yields nothing is a hard build failure (`EmptyGenerateStaticParamsError`,
 * E898) rather than a fallback to on-demand rendering, so an unseeded catalogue
 * would take the build down. The sentinel stands in for "nothing to prebuild":
 * it prerenders as a 404 and, with `dynamicParams` at its default, changes
 * nothing for any real slug.
 *
 * Deliberately does NOT swallow a connection error. It used to, on the theory
 * that a sleeping cluster should degrade the build rather than break it — but
 * that theory was already false (`getFeaturedProducts` on the homepage throws
 * on the same dead connection), and under Cache Components the swallow turned a
 * plain `MongooseServerSelectionError` into an opaque complaint about
 * `generateStaticParams`. If Atlas is unreachable at build time — usually
 * Network Access missing `0.0.0.0/0`, see docs/CLIENT-HANDOVER.md — the build
 * should say exactly that.
 */
export async function getPrebuildableProductSlugs(
  limit: number = PRERENDER_LIMIT,
): Promise<string[]> {
  await connectDB();

  const products = await Product.find({ status: "Published" })
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .select("slug")
    .lean<{ slug: string }[]>();

  if (products.length === 0) return [NO_PREBUILDABLE_SLUG];

  return products.map((product) => product.slug);
}
