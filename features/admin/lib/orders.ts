// Mongoose 9 renamed FilterQuery -> QueryFilter.
import type { QueryFilter } from "mongoose";
import { connectDB } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { escapeRegex } from "@/lib/slug";
import { Order, type IOrder } from "@/models";
import { normalizeBdPhone } from "@/features/orders/lib/phone";
import { ORDER_NUMBER_PATTERN } from "@/features/orders/lib/order-number";
import {
  ADMIN_VISIBLE_STATUSES,
  type AdminSettableStatus,
} from "@/features/orders/lib/order-status";
import {
  toOrderDTO,
  toOrderSummaryDTO,
  type LeanOrder,
} from "@/features/orders/lib/orders";
import type {
  OrderDTO,
  OrderSummaryDTO,
} from "@/features/orders/lib/order-types";

// Server-only: pulls in Mongoose. Everything here returns plain, serializable
// objects because Mongoose docs don't cross the server/client boundary (§6.3).

// Rows per page and the stale-draft window are both shop settings now
// (`ordersPerPage`, `staleDraftMinutes`), read per call rather than fixed
// here. The defaults in lib/settings.ts are the 10 and 15 this file used to
// declare, so an unconfigured shop paginates and sweeps exactly as before.

export interface AdminOrderQuery {
  q?: string;
  status?: AdminSettableStatus;
  page?: number;
}

export interface AdminOrderListResult {
  orders: OrderSummaryDTO[];
  total: number;
  page: number;
  totalPages: number;
  /** Per-status totals for the filter tabs, ignoring the current filter. */
  counts: Record<AdminSettableStatus | "all", number>;
  /**
   * Drafts old enough to be holding stock for an order that will never
   * complete — surfaced so the sweep button only appears when there's
   * something to sweep.
   */
  staleDraftCount: number;
}

/**
 * Search across the three things an admin actually has in hand when a customer
 * calls: the order number they read out, their name, or their phone.
 */
function searchFilter(search: string): QueryFilter<IOrder> {
  const pattern = new RegExp(escapeRegex(search), "i");
  const conditions: QueryFilter<IOrder>[] = [
    { orderNumber: pattern },
    { "shippingAddress.fullName": pattern },
  ];

  // A phone typed any of the four ways still has to hit the stored key.
  const phoneKey = normalizeBdPhone(search);
  if (phoneKey) conditions.push({ phoneKey });
  if (ORDER_NUMBER_PATTERN.test(search.trim().toUpperCase())) {
    conditions.push({ orderNumber: search.trim().toUpperCase() });
  }

  return { $or: conditions };
}

export async function getOrders({
  q,
  status,
  page = 1,
}: AdminOrderQuery): Promise<AdminOrderListResult> {
  await connectDB();
  const { ordersPerPage, staleDraftMinutes } = await getSettings();

  // Draft is excluded everywhere: it's the in-flight stock claim, not an order.
  const base: QueryFilter<IOrder> = {
    status: { $in: ADMIN_VISIBLE_STATUSES },
  };

  const search = q?.trim();
  const filter: QueryFilter<IOrder> = {
    ...base,
    // Escaped so a stray "(" in the search box can't throw a regex error.
    ...(search ? searchFilter(search) : {}),
    ...(status ? { status } : {}),
  };

  const staleBefore = new Date(Date.now() - staleDraftMinutes * 60_000);

  const [total, grouped, staleDraftCount] = await Promise.all([
    Order.countDocuments(filter),
    // One aggregation for every tab count, rather than six countDocuments.
    Order.aggregate<{ _id: AdminSettableStatus; count: number }>([
      { $match: { ...base, ...(search ? searchFilter(search) : {}) } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Order.countDocuments({ status: "Draft", createdAt: { $lt: staleBefore } }),
  ]);

  const counts = {
    all: 0,
    Pending: 0,
    Confirmed: 0,
    Shipped: 0,
    Delivered: 0,
    Cancelled: 0,
    Returned: 0,
  } as Record<AdminSettableStatus | "all", number>;

  for (const row of grouped) {
    counts[row._id] = row.count;
    counts.all += row.count;
  }

  const totalPages = Math.max(1, Math.ceil(total / ordersPerPage));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .skip((currentPage - 1) * ordersPerPage)
    .limit(ordersPerPage)
    .lean<LeanOrder[]>();

  return {
    orders: orders.map(toOrderSummaryDTO),
    total,
    page: currentPage,
    totalPages,
    counts,
    staleDraftCount,
  };
}

/**
 * Looked up by order number rather than `_id`: it's what the admin route
 * carries, what the customer reads out on the phone, and — unlike an ObjectId
 * — it means the same thing in every environment.
 */
export async function getOrderByNumber(
  orderNumber: string,
): Promise<OrderDTO | null> {
  // Next has already decoded the route param; decoding again would throw a
  // URIError on a crafted path and turn a 404 into a 500.
  const normalised = orderNumber.trim().toUpperCase();
  if (!ORDER_NUMBER_PATTERN.test(normalised)) return null;

  await connectDB();

  const order = await Order.findOne({
    orderNumber: normalised,
    status: { $in: ADMIN_VISIBLE_STATUSES },
  }).lean<LeanOrder | null>();

  return order ? toOrderDTO(order) : null;
}
