// Mongoose 9 renamed FilterQuery -> QueryFilter.
import { Types, type QueryFilter } from "mongoose";
import { connectDB } from "@/lib/db";
import { escapeRegex } from "@/lib/slug";
import { getSettings } from "@/lib/settings";
import { Category, Product, type IProduct } from "@/models";
import type { StockStatus } from "@/features/products/lib/stock";
import type { ProductDTO } from "@/features/admin/lib/types";

// Server-only: pulls in Mongoose. Everything here returns plain, serializable
// objects because Mongoose docs don't cross the server/client boundary (§6.3).

// Rows per page is `ordersPerPage` in the shop's settings now, read per call.
// Note this is the ADMIN table's page size — the storefront collection grid
// has its own PRODUCTS_PER_PAGE of 9 in features/products/lib/constants.ts,
// which is a layout decision about a three-column grid and deliberately not
// the same knob.

/** A lean product with its category ref resolved by populate. */
type LeanProduct = Omit<IProduct, "category"> & {
  _id: Types.ObjectId;
  category: { _id: Types.ObjectId; name: string } | null;
};

function toProductDTO(product: LeanProduct): ProductDTO {
  return {
    id: String(product._id),
    name: product.name,
    slug: product.slug,
    categoryId: product.category ? String(product.category._id) : "",
    // A category deleted out from under a product shouldn't crash the table.
    categoryName: product.category?.name ?? "Uncategorised",
    price: product.price,
    description: product.description,
    material: product.material,
    dimensions: product.dimensions,
    status: product.status,
    // Coerced: documents written before the field existed have no value.
    featured: Boolean(product.featured),
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
    createdAt: product.createdAt?.toISOString() ?? "",
    updatedAt: product.updatedAt?.toISOString() ?? "",
  };
}

/**
 * Mirror of getStockStatus (D3b) expressed as a Mongo query — against the sum
 * across every colourway, which is what `totalStock` means on the storefront
 * side. A piece is out of stock only when *no* colour is left.
 *
 * `$expr` rather than a field predicate because that sum exists nowhere on the
 * document, and it cannot use an index. That is affordable here and only here:
 * this is the admin table, filtered by hand over a catalogue of tens. Nothing
 * on the storefront's hot path filters by stock.
 *
 * The threshold is passed in so this stays a mirror of `getStockStatus` rather
 * than drifting from it: both now read the same shop setting, and the filter a
 * row is selected by agrees with the badge printed on it.
 */
const variantStockSum = { $sum: "$variants.stock" };

function stockFilter(
  stock: StockStatus,
  threshold: number,
): QueryFilter<IProduct> {
  switch (stock) {
    case "out-of-stock":
      return { $expr: { $lte: [variantStockSum, 0] } };
    case "low-stock":
      return {
        $expr: {
          $and: [
            { $gt: [variantStockSum, 0] },
            { $lte: [variantStockSum, threshold] },
          ],
        },
      };
    case "in-stock":
      return { $expr: { $gt: [variantStockSum, threshold] } };
  }
}

export interface ProductQuery {
  q?: string;
  stock?: StockStatus;
  status?: "Draft" | "Published" | "Archived";
  page?: number;
}

export interface ProductListResult {
  products: ProductDTO[];
  total: number;
  page: number;
  totalPages: number;
}

export async function getProducts({
  q,
  stock,
  status,
  page = 1,
}: ProductQuery): Promise<ProductListResult> {
  await connectDB();
  const { lowStockThreshold, ordersPerPage } = await getSettings();

  const filter: QueryFilter<IProduct> = {};

  const search = q?.trim();
  if (search) {
    // Escaped so a stray "(" in the search box can't throw a regex error.
    const pattern = new RegExp(escapeRegex(search), "i");
    // SKUs moved onto the colourway, so the search reaches into the array —
    // typing a black bifold's SKU still finds the product it belongs to.
    filter.$or = [{ name: pattern }, { "variants.sku": pattern }];
  }
  if (stock) Object.assign(filter, stockFilter(stock, lowStockThreshold));
  // Archived products are hidden from the default (unfiltered) list — that's
  // the whole point of archiving instead of a hard delete — but still fully
  // queryable by explicitly selecting the Archived filter.
  filter.status = status ?? { $ne: "Archived" };

  const total = await Product.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / ordersPerPage));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const products = await Product.find(filter)
    .sort({ createdAt: -1 })
    .skip((currentPage - 1) * ordersPerPage)
    .limit(ordersPerPage)
    .populate<{ category: { _id: Types.ObjectId; name: string } | null }>(
      "category",
      "name",
    )
    .lean<LeanProduct[]>();

  return {
    products: products.map(toProductDTO),
    total,
    page: currentPage,
    totalPages,
  };
}

export async function getProductById(id: string): Promise<ProductDTO | null> {
  if (!Types.ObjectId.isValid(id)) return null;

  await connectDB();
  // Referenced so the "Category" model is registered before populate runs.
  void Category;

  const product = await Product.findById(id)
    .populate<{ category: { _id: Types.ObjectId; name: string } | null }>(
      "category",
      "name",
    )
    .lean<LeanProduct | null>();

  return product ? toProductDTO(product) : null;
}
