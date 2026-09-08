// Import every model from here so refs like `ref: "Category"` always resolve,
// whatever order the consuming module happens to pull them in.
import Cart from "./Cart";
import Category from "./Category";
import Order from "./Order";
import Product from "./Product";

export { Cart, Category, Order, Product };
export type { ICart, ICartItem } from "./Cart";
export type { ICategory } from "./Category";
export type {
  IOrder,
  IOrderItem,
  IOrderStatusEntry,
  IShippingAddress,
} from "./Order";
export type {
  IProduct,
  IProductImage,
  IProductVariant,
  ProductStatus,
} from "./Product";
export { PRODUCT_STATUSES } from "./Product";
