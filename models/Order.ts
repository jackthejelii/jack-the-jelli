import mongoose, { Schema } from "mongoose";
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  type OrderStatus,
  type PaymentStatus,
} from "@/features/orders/lib/order-status";
import {
  DELIVERY_ZONES,
  type DeliveryZone,
} from "@/features/checkout/lib/delivery";

/**
 * A line as it was at the moment of purchase.
 *
 * Every display field is snapshotted rather than populated from the live
 * product. Nothing on an order screen ever reads through `product` — it is
 * kept for provenance only (stock restore on cancel, "what did this customer
 * buy" reporting) — so renaming, repricing, or archiving a product can never
 * rewrite order history.
 */
export interface IOrderItem {
  product: mongoose.Types.ObjectId;
  /**
   * Which colourway of that product. Unlike `product` this is not provenance
   * only — it is the address the stock restore on cancel/return decrements
   * back into, so an order line without it cannot be un-sold.
   */
  variantId: mongoose.Types.ObjectId;
  name: string;
  /**
   * The colour as it was named at purchase, e.g. "Black". Snapshotted like
   * every other display field: renaming a colourway must not rewrite what a
   * past receipt or packing list says was shipped.
   */
  color: string;
  /** The *variant's* SKU — what is actually picked off the shelf. */
  sku: string;
  slug: string;
  /** Unit price in whole taka, as charged. */
  price: number;
  qty: number;
  /** price × qty, stored so a historical total never depends on re-multiplying. */
  lineTotal: number;
  thumbnail?: string;
}

export interface IShippingAddress {
  fullName: string;
  /** As typed by the customer, for the confirmation call. */
  phone: string;
  division: string;
  district: string;
  /** Upazila / thana — free text for the MVP. */
  thana: string;
  street: string;
  notes?: string;
}

export interface IOrderStatusEntry {
  status: OrderStatus;
  at: Date;
  note?: string;
}

export interface IOrder {
  orderNumber: string;
  /**
   * Minted by the client and unique — the double-submit guard. Claimed before
   * any stock is touched, so an E11000 here means "you already placed this".
   */
  idempotencyKey: string;
  /**
   * Plain ObjectId, deliberately NOT a `ref`: Better Auth owns the `user`
   * collection and there is no models/User.ts to point at, so populate() would
   * throw MissingSchemaError.
   *
   * Nullable: set to null when the account is hard-deleted, which is also what
   * a guest checkout looks like.
   */
  userId?: mongoose.Types.ObjectId | null;
  /**
   * The *only* signal that this order's customer was deleted.
   *
   * A null `userId` alone says nothing — most orders on a COD storefront are
   * placed as a guest and never had one. Only this stamp distinguishes "the
   * account behind this order was erased" from "there never was an account",
   * and it is what stops claimGuestOrders re-attaching the history if the same
   * email signs up again.
   */
  customerDeletedAt?: Date | null;
  /** Lowercased. What claimGuestOrders matches a verified email against. */
  guestEmail?: string;
  /** Normalised to 01XXXXXXXXX — the /track lookup key, never displayed. */
  phoneKey: string;
  items: IOrderItem[];
  shippingAddress: IShippingAddress;
  deliveryZone: DeliveryZone;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  /** Set when the guarded $inc decrements succeeded. */
  stockCommittedAt?: Date;
  /** Set exactly once, by whichever cancel wins the race. */
  stockRestoredAt?: Date;
  /**
   * Each stamps the *first* time the order reached that state. Statuses can be
   * moved backwards to fix a mis-click, and re-entering a state must not
   * rewrite when it was originally reached — statusHistory carries the full
   * trail, these carry the milestone.
   */
  placedAt?: Date;
  confirmedAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  returnedAt?: Date;
  /**
   * When an admin last set paymentStatus. Payment no longer follows from the
   * delivery timeline, so without this there's no record of when it settled.
   */
  paymentUpdatedAt?: Date;
  statusHistory: IOrderStatusEntry[];
  createdAt?: Date;
  updatedAt?: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    color: { type: String, required: true },
    sku: { type: String, required: true },
    slug: { type: String, required: true },
    // BDT, whole taka — matches models/Product.ts.
    price: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
    thumbnail: { type: String },
  },
  { _id: false },
);

const shippingAddressSchema = new Schema<IShippingAddress>(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    division: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    thana: { type: String, required: true, trim: true },
    street: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
  },
  { _id: false },
);

const statusEntrySchema = new Schema<IOrderStatusEntry>(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    at: { type: Date, required: true },
    note: { type: String, trim: true },
  },
  { _id: false },
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    idempotencyKey: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId },
    customerDeletedAt: { type: Date, default: null },
    guestEmail: { type: String, lowercase: true, trim: true },
    phoneKey: { type: String, required: true, index: true },
    items: { type: [orderItemSchema], required: true },
    shippingAddress: { type: shippingAddressSchema, required: true },
    deliveryZone: { type: String, enum: DELIVERY_ZONES, required: true },
    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "Draft",
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "pending",
      required: true,
    },
    stockCommittedAt: { type: Date },
    stockRestoredAt: { type: Date, default: null },
    placedAt: { type: Date },
    confirmedAt: { type: Date },
    shippedAt: { type: Date },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },
    returnedAt: { type: Date },
    paymentUpdatedAt: { type: Date },
    statusHistory: { type: [statusEntrySchema], default: [] },
  },
  { timestamps: true },
);

// The admin list filters on status then sorts by recency; without the sort key
// in the same index Mongo sorts the whole matching set in memory.
orderSchema.index({ status: 1, createdAt: -1 });

// The reporting range scan behind /admin and /admin/logistics. Those group by
// `placedAt` — the moment an order actually became an order — rather than
// `createdAt`, which for a Draft is when the idempotency key was claimed. The
// two are usually milliseconds apart and occasionally are not, and a report
// that silently counts abandoned checkouts is worse than no report.
//
// Not covered by {status, createdAt} above: that index leads with status, so a
// date range across every live status cannot use it. Same caveat as every
// other index in this file — Mongoose only ever calls createIndex, so changing
// this later needs a manual dropIndex.
orderSchema.index({ placedAt: -1 });
// /my-orders.
orderSchema.index({ userId: 1, createdAt: -1 });
// claimGuestOrders, which runs from the session.create hook on *every* sign-in.
// All three are equality predicates, so this is ordered by selectivity; without
// it the claim scans the whole collection, and that cost grows with every order
// ever placed.
//
// NOTE: there is deliberately no { orderNumber, phoneKey } index. /track always
// supplies both, but orderNumber is unique, so its own index already resolves
// the lookup to a single document — the phone is a predicate that document is
// then checked against, not something an index has to narrow. Mongoose only
// ever calls createIndex, so a database that already built that index keeps it
// until a one-off db.orders.dropIndex("orderNumber_1_phoneKey_1").
orderSchema.index({ guestEmail: 1, userId: 1, customerDeletedAt: 1 });

// Hot-reload guard — without it dev throws OverwriteModelError.
// NOTE: this also means schema edits don't take effect until the dev server
// restarts, since the already-registered model is returned as-is.
const Order =
  (mongoose.models.Order as mongoose.Model<IOrder>) ||
  mongoose.model<IOrder>("Order", orderSchema);

export default Order;
