// Orders are real now: the mock `Order`/`OrderItem` interfaces that used to
// live here are gone, along with the `material` field they carried — there was
// never a counterpart for it on models/Product.ts, so it was dropped rather
// than invented. These re-exports keep the admin components importing from one
// place while the shapes themselves live with the orders feature.
export type {
  OrderStatus,
  PaymentStatus,
  AdminSettableStatus,
} from "@/features/orders/lib/order-status";
export type {
  OrderDTO,
  OrderItemDTO,
  OrderStatusEntryDTO,
  OrderSummaryDTO,
  ShippingAddressDTO,
} from "@/features/orders/lib/order-types";

// Type-only import/re-export: erased at compile time, so client components
// importing from here never pull Mongoose into the bundle.
import type { IProductImage, ProductStatus } from "@/models/Product";

export type { IProductImage, ProductStatus };

/**
 * Serializable product for client components. Mongoose documents don't survive
 * the server/client boundary (§6.3) — `_id` and `Date` both break — so every
 * query maps through `toProductDTO` in features/admin/lib/products.ts.
 */
/**
 * One colourway, as the admin forms and table see it.
 *
 * `id` is empty for a row the admin has just added and not yet saved — the
 * variant editor needs to render and address a colourway that has no `_id`
 * yet, and an empty string is the one value no ObjectId can collide with.
 */
export interface ProductVariantDTO {
  id: string;
  color: string;
  /** Six-digit hex, e.g. "#1c1b1a" — the swatch fill. */
  hex: string;
  sku: string;
  stock: number;
  images: IProductImage[];
}

export interface ProductDTO {
  id: string;
  name: string;
  slug: string;
  /** ObjectId string — what the category <Select> submits. */
  categoryId: string;
  /** Resolved via populate, for display. */
  categoryName: string;
  price: number;
  description?: string;
  material?: string;
  dimensions?: string;
  status: ProductStatus;
  /** Surfaces this product in the homepage featured strip. */
  featured: boolean;
  /**
   * Never empty. SKU, stock and photographs all live here — see
   * models/Product.ts. The table derives its single-line summary (a thumbnail,
   * a SKU, a stock count) from this rather than from product-level fields,
   * which no longer exist.
   */
  variants: ProductVariantDTO[];
  createdAt: string;
  updatedAt: string;
}
