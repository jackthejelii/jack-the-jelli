import { connectDB } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { Order, type IOrder } from "@/models";
import type { PaymentStatus } from "@/features/orders/lib/order-status";

/**
 * The fulfilment worklist behind `/admin/logistics`.
 *
 * Deliberately **not** cached, unlike the reporting helpers in analytics.ts.
 * This is a queue an operator works through and then acts on, and a dispatch
 * list even a minute stale is one that shows an order somebody else has
 * already shipped. Reporting can be a few minutes old; a worklist cannot.
 *
 * It also carries its own row type rather than reusing `OrderSummaryDTO`. That
 * shape is built for the Order Manager table and knows nothing about where an
 * order is going or how long it has been waiting, which is the entire content
 * of a dispatch list.
 *
 * Server-only: pulls in Mongoose, returns plain serializable objects.
 */

/** How many rows either list shows before it stops being a worklist. */
const QUEUE_LIMIT = 50;

export interface DispatchRow {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  district: string;
  thana: string;
  itemCount: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  /** ISO — when it entered the state this queue is about. */
  since: string;
  /** Whole days it has been sitting there, Dhaka-agnostic (a duration). */
  daysWaiting: number;
}

export interface DispatchQueue {
  /** Confirmed and waiting to go out, oldest first. */
  ready: DispatchRow[];
  readyTotal: number;
  /** Shipped longer ago than the delivery window promises, oldest first. */
  aging: DispatchRow[];
  agingTotal: number;
  /** The promise those aging orders are measured against. */
  deliveryDaysMax: number;
  /** Ready-to-ship counts by district, so a courier handoff can be batched. */
  byDistrict: { district: string; orders: number }[];
}

type QueueDoc = Pick<
  IOrder,
  | "orderNumber"
  | "shippingAddress"
  | "items"
  | "totalAmount"
  | "paymentStatus"
  | "confirmedAt"
  | "shippedAt"
  | "createdAt"
>;

const MS_PER_DAY = 86_400_000;

function toDispatchRow(order: QueueDoc, since: Date | undefined): DispatchRow {
  const at = since ?? order.createdAt ?? new Date();
  return {
    orderNumber: order.orderNumber,
    customerName: order.shippingAddress.fullName,
    customerPhone: order.shippingAddress.phone,
    district: order.shippingAddress.district,
    thana: order.shippingAddress.thana,
    itemCount: order.items.reduce((total, line) => total + line.qty, 0),
    totalAmount: order.totalAmount,
    paymentStatus: order.paymentStatus,
    since: at.toISOString(),
    daysWaiting: Math.max(
      0,
      Math.floor((Date.now() - at.getTime()) / MS_PER_DAY),
    ),
  };
}

const QUEUE_FIELDS =
  "orderNumber shippingAddress items totalAmount paymentStatus confirmedAt shippedAt createdAt";

export async function getDispatchQueue(): Promise<DispatchQueue> {
  await connectDB();
  const { deliveryDaysMax } = await getSettings();

  // The cutoff a shipment has to be older than to count as late. Measured from
  // shippedAt rather than placedAt: the window the shop promises runs from the
  // handover, and an order still sitting in Confirmed is the *ready* queue's
  // problem, not a late delivery.
  const lateBefore = new Date(Date.now() - deliveryDaysMax * MS_PER_DAY);

  const readyFilter = { status: "Confirmed" } as const;
  const agingFilter = {
    status: "Shipped",
    shippedAt: { $lt: lateBefore },
  } as const;

  const [ready, readyTotal, aging, agingTotal, byDistrict] = await Promise.all([
    // Oldest first — the opposite of every other table in this dashboard, and
    // on purpose. A queue is worked from the front.
    Order.find(readyFilter)
      .select(QUEUE_FIELDS)
      .sort({ confirmedAt: 1, createdAt: 1 })
      .limit(QUEUE_LIMIT)
      .lean<QueueDoc[]>(),
    Order.countDocuments(readyFilter),
    Order.find(agingFilter)
      .select(QUEUE_FIELDS)
      .sort({ shippedAt: 1 })
      .limit(QUEUE_LIMIT)
      .lean<QueueDoc[]>(),
    Order.countDocuments(agingFilter),
    Order.aggregate<{ _id: string; orders: number }>([
      { $match: readyFilter },
      { $group: { _id: "$shippingAddress.district", orders: { $sum: 1 } } },
      { $sort: { orders: -1, _id: 1 } },
    ]),
  ]);

  return {
    ready: ready.map((order) => toDispatchRow(order, order.confirmedAt)),
    readyTotal,
    aging: aging.map((order) => toDispatchRow(order, order.shippedAt)),
    agingTotal,
    deliveryDaysMax,
    byDistrict: byDistrict.map((row) => ({
      district: row._id ?? "Unknown",
      orders: row.orders,
    })),
  };
}

/**
 * The order numbers a bulk action is allowed to touch.
 *
 * The bulk-ship form posts whatever checkboxes were ticked, which is client
 * input like any other — so the action re-reads which of those orders really
 * is Confirmed rather than trusting the list it was handed.
 */
export async function filterConfirmedOrderNumbers(
  orderNumbers: string[],
): Promise<string[]> {
  if (orderNumbers.length === 0) return [];

  await connectDB();
  const rows = await Order.find({
    orderNumber: { $in: orderNumbers },
    status: "Confirmed",
  })
    .select("orderNumber")
    .lean<Pick<IOrder, "orderNumber">[]>();

  return rows.map((row) => row.orderNumber);
}
