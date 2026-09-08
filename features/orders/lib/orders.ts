import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Order, type IOrder } from "@/models";
import { normalizeBdPhone } from "@/features/orders/lib/phone";
import { ORDER_NUMBER_PATTERN } from "@/features/orders/lib/order-number";
import { ADMIN_VISIBLE_STATUSES } from "@/features/orders/lib/order-status";
import type {
  OrderDTO,
  OrderSummaryDTO,
} from "@/features/orders/lib/order-types";

// Server-only: pulls in Mongoose. Everything here returns plain, serializable
// objects because Mongoose docs don't cross the server/client boundary (§6.3).

/** A lean order — `_id` is an ObjectId and every date is a Date. */
export type LeanOrder = IOrder & { _id: Types.ObjectId };

/**
 * Draft orders are excluded from every query in this module. A Draft is the
 * in-flight stock claim, not an order anyone should ever see — not the
 * customer, not the admin.
 */
const VISIBLE = { status: { $in: ADMIN_VISIBLE_STATUSES } };

function iso(date: Date | undefined): string | undefined {
  return date?.toISOString();
}

export function toOrderDTO(order: LeanOrder): OrderDTO {
  return {
    id: String(order._id),
    orderNumber: order.orderNumber,
    userId: order.userId ? String(order.userId) : undefined,
    customerDeleted: Boolean(order.customerDeletedAt),
    guestEmail: order.guestEmail,
    shippingAddress: {
      fullName: order.shippingAddress.fullName,
      phone: order.shippingAddress.phone,
      division: order.shippingAddress.division,
      district: order.shippingAddress.district,
      thana: order.shippingAddress.thana,
      street: order.shippingAddress.street,
      notes: order.shippingAddress.notes,
    },
    deliveryZone: order.deliveryZone,
    items: order.items.map((item) => ({
      productId: String(item.product),
      variantId: String(item.variantId),
      name: item.name,
      color: item.color,
      sku: item.sku,
      slug: item.slug,
      price: item.price,
      qty: item.qty,
      lineTotal: item.lineTotal,
      thumbnail: item.thumbnail,
    })),
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    totalAmount: order.totalAmount,
    status: order.status,
    paymentStatus: order.paymentStatus,
    placedAt: iso(order.placedAt),
    confirmedAt: iso(order.confirmedAt),
    shippedAt: iso(order.shippedAt),
    deliveredAt: iso(order.deliveredAt),
    cancelledAt: iso(order.cancelledAt),
    returnedAt: iso(order.returnedAt),
    paymentUpdatedAt: iso(order.paymentUpdatedAt),
    statusHistory: (order.statusHistory ?? []).map((entry) => ({
      status: entry.status,
      at: entry.at.toISOString(),
      note: entry.note,
    })),
    createdAt: order.createdAt?.toISOString() ?? "",
    updatedAt: order.updatedAt?.toISOString() ?? "",
  };
}

export function toOrderSummaryDTO(order: LeanOrder): OrderSummaryDTO {
  return {
    id: String(order._id),
    orderNumber: order.orderNumber,
    customerName: order.shippingAddress.fullName,
    customerPhone: order.shippingAddress.phone,
    customerEmail: order.guestEmail,
    customerDeleted: Boolean(order.customerDeletedAt),
    itemCount: order.items.reduce((total, item) => total + item.qty, 0),
    totalAmount: order.totalAmount,
    status: order.status,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt?.toISOString() ?? "",
  };
}

/**
 * Public tracking lookup — order number AND phone, both required.
 *
 * Requiring the phone is what stops /track being an order-number oracle:
 * knowing (or guessing) a number alone reveals nothing. The phone is
 * normalised on the way in for the same reason it's normalised on the way out
 * at checkout — someone who typed `+880 1712-345678` then will type
 * `01712345678` now.
 */
export async function getOrderForTracking(
  orderNumber: string,
  phone: string,
): Promise<OrderDTO | null> {
  const normalisedNumber = orderNumber.trim().toUpperCase();
  const phoneKey = normalizeBdPhone(phone);

  // Cheap shape checks first, so a junk request never reaches the database.
  if (!phoneKey || !ORDER_NUMBER_PATTERN.test(normalisedNumber)) return null;

  await connectDB();

  const order = await Order.findOne({
    orderNumber: normalisedNumber,
    phoneKey,
    ...VISIBLE,
  }).lean<LeanOrder | null>();

  return order ? toOrderDTO(order) : null;
}

/**
 * Full order by number, with no phone check.
 *
 * The caller MUST have already established the reader is entitled to it —
 * today that's the signed receipt cookie on /checkout/success. Never call this
 * straight from a searchParam.
 */
export async function getOrderByNumber(
  orderNumber: string,
): Promise<OrderDTO | null> {
  const normalised = orderNumber.trim().toUpperCase();
  if (!ORDER_NUMBER_PATTERN.test(normalised)) return null;

  await connectDB();

  const order = await Order.findOne({
    orderNumber: normalised,
    ...VISIBLE,
  }).lean<LeanOrder | null>();

  return order ? toOrderDTO(order) : null;
}

export async function getOrdersForUser(
  userId: string,
): Promise<OrderSummaryDTO[]> {
  if (!Types.ObjectId.isValid(userId)) return [];

  await connectDB();

  const orders = await Order.find({
    userId: new Types.ObjectId(userId),
    ...VISIBLE,
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean<LeanOrder[]>();

  return orders.map(toOrderSummaryDTO);
}

export async function getOrderForUser(
  orderNumber: string,
  userId: string,
): Promise<OrderDTO | null> {
  const normalised = orderNumber.trim().toUpperCase();
  if (!ORDER_NUMBER_PATTERN.test(normalised)) return null;
  if (!Types.ObjectId.isValid(userId)) return null;

  await connectDB();

  const order = await Order.findOne({
    orderNumber: normalised,
    userId: new Types.ObjectId(userId),
    ...VISIBLE,
  }).lean<LeanOrder | null>();

  return order ? toOrderDTO(order) : null;
}

/**
 * Attach a signed-in user's guest orders to their account.
 *
 * Matched on `guestEmail` only, and only for a verified address — an unverified
 * one would let anyone sign up as someone else's email and inherit their order
 * history, addresses and phone number included. Phone is deliberately not a
 * matching key for the same reason: nothing verifies it.
 *
 * Idempotent, so calling it on every sign-in is free after the first.
 */
export async function claimGuestOrders(
  userId: string,
  email: string,
): Promise<number> {
  if (!Types.ObjectId.isValid(userId)) return 0;

  const normalisedEmail = email.trim().toLowerCase();
  if (!normalisedEmail) return 0;

  await connectDB();

  const result = await Order.updateMany(
    // `userId: null` matches both a missing field and an explicitly null one;
    // `$exists: false` would miss the latter, and silently stop claiming if
    // anything ever writes the field as null.
    //
    // customerDeletedAt is what makes a hard delete stick. A deleted customer's
    // orders keep their guestEmail — it's part of the snapshot — so without this
    // clause, the same person signing up again and verifying the same address
    // would silently inherit the history that was just erased.
    { guestEmail: normalisedEmail, userId: null, customerDeletedAt: null },
    { $set: { userId: new Types.ObjectId(userId) } },
  );

  return result.modifiedCount;
}
