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
export interface ProductDTO {
  id: string;
  name: string;
  slug: string;
  sku: string;
  /** ObjectId string — what the category <Select> submits. */
  categoryId: string;
  /** Resolved via populate, for display. */
  categoryName: string;
  price: number;
  description?: string;
  stock: number;
  status: ProductStatus;
  /** Surfaces this product in the homepage featured strip. */
  featured: boolean;
  thumbnail?: string;
  images: IProductImage[];
  createdAt: string;
  updatedAt: string;
}
