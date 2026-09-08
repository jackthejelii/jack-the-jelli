import mongoose, { Schema } from "mongoose";
import { MAX_LINE_QTY } from "@/features/cart/lib/limits";

/**
 * A signed-in shopper's saved cart — the durable half of the cart.
 *
 * The browser is still the fast path: localStorage renders the badge and the
 * sheet instantly, and this collection is what makes that survive a new device,
 * a cleared browser, or signing back in. Guests have no document here at all.
 *
 * Only the line's identity and `qty` are stored, deliberately. A cart is not a
 * record of anything — names, prices and stock are read live off Product every
 * time the cart is shown (revalidateCart) and recomputed again at placement
 * (placeOrder), so snapshotting them here would only create a second, staler
 * copy of the truth. Contrast IOrderItem, which snapshots everything precisely
 * because an order *is* a record and must not change under later edits.
 *
 * That identity is the *pair* (productId, variantId), not the product alone:
 * the black bifold and the tan bifold are two lines with two stock counts, and
 * keying on the product would silently collapse them into one.
 */
export interface ICartItem {
  productId: mongoose.Types.ObjectId;
  /** Which colourway — the `_id` of an entry in that product's `variants`. */
  variantId: mongoose.Types.ObjectId;
  qty: number;
}

export interface ICart {
  /**
   * One cart per account. A plain ObjectId rather than a ref, matching
   * IOrder.userId — Better Auth owns the `user` collection, so there is no
   * Mongoose model on the other end of a populate.
   */
  userId: mongoose.Types.ObjectId;
  items: ICartItem[];
}

const cartItemSchema = new Schema<ICartItem>(
  {
    productId: { type: Schema.Types.ObjectId, required: true },
    variantId: { type: Schema.Types.ObjectId, required: true },
    qty: { type: Number, required: true, min: 1, max: MAX_LINE_QTY },
  },
  { _id: false },
);

const cartSchema = new Schema<ICart>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, unique: true },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true },
);

// Carts expire on their own a week after the last write. A cart is a draft, not
// a record: one nobody has touched in seven days is not one anyone is coming
// back to, and every write refreshes updatedAt, so an actively used cart never
// ages out.
//
// NOTE: MongoDB will not change expireAfterSeconds on an index that already
// exists — Mongoose's autoIndex only calls createIndex, which fails with
// IndexOptionsConflict rather than updating it, and nothing here listens for
// that error. Editing this number only affects databases where the index has yet
// to be built; an existing deployment needs a one-off collMod to match.
cartSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });

// Hot-reload guard — without it dev throws OverwriteModelError.
// NOTE: this also means schema edits don't take effect until the dev server
// restarts, since the already-registered model is returned as-is.
const Cart =
  (mongoose.models.Cart as mongoose.Model<ICart>) ||
  mongoose.model<ICart>("Cart", cartSchema);

export default Cart;
