import { cacheLife, cacheTag } from "next/cache";

import { connectDB } from "@/lib/db";
import { Order } from "@/models";
import {
  previousRange,
  REPORTING_TIMEZONE,
  type DateRange,
} from "@/features/admin/lib/date-range";
import {
  ADMIN_VISIBLE_STATUSES,
  LIVE_STATUSES,
  type AdminSettableStatus,
} from "@/features/orders/lib/order-status";
import { ORDERS_TAG } from "@/features/orders/lib/cache-tags";

/**
 * Reporting for `/admin`.
 *
 * Server-only: pulls in Mongoose. Everything returns plain, serializable
 * objects, because these cross into chart components that run in the browser.
 *
 * **Draft is excluded everywhere**, by `ADMIN_VISIBLE_STATUSES`. A Draft is the
 * in-flight stock claim, not an order — counting them would inflate every
 * figure on this page with checkouts that were abandoned or crashed.
 *
 * **Everything groups on `placedAt`, not `createdAt`.** For an order that went
 * through normally the two are milliseconds apart; for one that sat as a Draft
 * they are not, and `placedAt` is the moment it actually became an order.
 *
 * **Every bucket boundary is Dhaka time.** `$dateTrunc` is given the timezone
 * explicitly — without it a 6am Dhaka order falls into the previous UTC day and
 * every daily figure on the page is quietly one bucket out.
 */

const REPORTING_CACHE_LIFE = "minutes" as const;

/** Only live orders count as money; cancelled and returned ones are not sales. */
const REVENUE_STATUSES = LIVE_STATUSES;

export interface AnalyticsKpis {
  orders: number;
  revenue: number;
  /** Mean order value across the same set the revenue figure covers. */
  averageOrderValue: number;
  deliveryFees: number;
  /** Delivered, but the cash has not been marked collected. */
  codOutstanding: number;
  codOutstandingOrders: number;
  cancelled: number;
  returned: number;
  /** Orders in the previous window of equal length, for the delta. */
  previousOrders: number;
  previousRevenue: number;
}

export interface TimeseriesPoint {
  /** `YYYY-MM-DD` in Dhaka time — already a label, not a Date. */
  date: string;
  orders: number;
  revenue: number;
}

export interface ZoneSplitRow {
  zone: "inside-dhaka" | "outside-dhaka";
  orders: number;
  revenue: number;
}

export interface DistrictRow {
  district: string;
  orders: number;
  revenue: number;
}

export interface StatusRow {
  status: AdminSettableStatus;
  orders: number;
}

function rangeMatch(from: Date, to: Date) {
  return {
    status: { $in: ADMIN_VISIBLE_STATUSES },
    placedAt: { $gte: from, $lt: to },
  };
}

/**
 * Every headline figure in one round trip.
 *
 * `$facet` rather than five awaited aggregations: the pipeline stages share a
 * single pass over the same matched documents, which for a report that runs on
 * every dashboard load is the difference between one scan and five.
 */
export async function getAnalyticsKpis(
  range: DateRange,
): Promise<AnalyticsKpis> {
  "use cache";
  cacheTag(ORDERS_TAG);
  cacheLife(REPORTING_CACHE_LIFE);

  await connectDB();
  const previous = previousRange(range);

  const [result] = await Order.aggregate<{
    totals: { orders: number; revenue: number; deliveryFees: number }[];
    cod: { amount: number; orders: number }[];
    lost: { _id: string; count: number }[];
    prior: { orders: number; revenue: number }[];
  }>([
    {
      $match: {
        status: { $in: ADMIN_VISIBLE_STATUSES },
        placedAt: { $gte: previous.from, $lt: range.to },
      },
    },
    {
      $facet: {
        totals: [
          {
            $match: {
              placedAt: { $gte: range.from },
              status: { $in: REVENUE_STATUSES },
            },
          },
          {
            $group: {
              _id: null,
              orders: { $sum: 1 },
              revenue: { $sum: "$totalAmount" },
              deliveryFees: { $sum: "$deliveryFee" },
            },
          },
        ],
        cod: [
          // Money that has left the building but not come back: goods
          // delivered, cash not yet marked collected. The single figure on
          // this page that is a to-do list rather than a measurement.
          {
            $match: {
              placedAt: { $gte: range.from },
              status: "Delivered",
              paymentStatus: { $ne: "collected" },
            },
          },
          {
            $group: {
              _id: null,
              amount: { $sum: "$totalAmount" },
              orders: { $sum: 1 },
            },
          },
        ],
        lost: [
          {
            $match: {
              placedAt: { $gte: range.from },
              status: { $in: ["Cancelled", "Returned"] },
            },
          },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ],
        prior: [
          {
            $match: {
              placedAt: { $lt: range.from },
              status: { $in: REVENUE_STATUSES },
            },
          },
          {
            $group: {
              _id: null,
              orders: { $sum: 1 },
              revenue: { $sum: "$totalAmount" },
            },
          },
        ],
      },
    },
  ]);

  const totals = result?.totals?.[0];
  const cod = result?.cod?.[0];
  const prior = result?.prior?.[0];
  const lost = new Map(
    (result?.lost ?? []).map((row) => [row._id, row.count] as const),
  );

  const orders = totals?.orders ?? 0;
  const revenue = totals?.revenue ?? 0;

  return {
    orders,
    revenue,
    // Guarded rather than assumed: an empty range is the normal state of a new
    // shop, and NaN on a dashboard tile reads as a bug in the dashboard.
    averageOrderValue: orders > 0 ? Math.round(revenue / orders) : 0,
    deliveryFees: totals?.deliveryFees ?? 0,
    codOutstanding: cod?.amount ?? 0,
    codOutstandingOrders: cod?.orders ?? 0,
    cancelled: lost.get("Cancelled") ?? 0,
    returned: lost.get("Returned") ?? 0,
    previousOrders: prior?.orders ?? 0,
    previousRevenue: prior?.revenue ?? 0,
  };
}

/**
 * One point per day in the range, including the days nothing sold.
 *
 * Mongo returns only the days that have orders; the gaps are filled here. A
 * line chart that silently joins Monday to Thursday draws a slope that never
 * happened.
 */
export async function getOrdersOverTime(
  range: DateRange,
): Promise<TimeseriesPoint[]> {
  "use cache";
  cacheTag(ORDERS_TAG);
  cacheLife(REPORTING_CACHE_LIFE);

  await connectDB();

  const rows = await Order.aggregate<{
    _id: string;
    orders: number;
    revenue: number;
  }>([
    {
      $match: {
        ...rangeMatch(range.from, range.to),
        status: { $in: REVENUE_STATUSES },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$placedAt",
            timezone: REPORTING_TIMEZONE,
          },
        },
        orders: { $sum: 1 },
        revenue: { $sum: "$totalAmount" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const byDate = new Map(rows.map((row) => [row._id, row] as const));
  const points: TimeseriesPoint[] = [];

  const MS_PER_DAY = 86_400_000;
  for (let t = range.from.getTime(); t < range.to.getTime(); t += MS_PER_DAY) {
    // Formatted through Intl for the same reason the grouping uses a timezone:
    // `toISOString()` would label a Dhaka day with its UTC date.
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: REPORTING_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(t));

    const row = byDate.get(date);
    points.push({
      date,
      orders: row?.orders ?? 0,
      revenue: row?.revenue ?? 0,
    });
  }

  return points;
}

export async function getZoneSplit(range: DateRange): Promise<ZoneSplitRow[]> {
  "use cache";
  cacheTag(ORDERS_TAG);
  cacheLife(REPORTING_CACHE_LIFE);

  await connectDB();

  const rows = await Order.aggregate<{
    _id: ZoneSplitRow["zone"];
    orders: number;
    revenue: number;
  }>([
    {
      $match: {
        ...rangeMatch(range.from, range.to),
        status: { $in: REVENUE_STATUSES },
      },
    },
    {
      $group: {
        _id: "$deliveryZone",
        orders: { $sum: 1 },
        revenue: { $sum: "$totalAmount" },
      },
    },
  ]);

  // Both zones always present, in a fixed order, so the two slices keep the
  // same colour from one range to the next.
  return (["inside-dhaka", "outside-dhaka"] as const).map((zone) => {
    const row = rows.find((candidate) => candidate._id === zone);
    return { zone, orders: row?.orders ?? 0, revenue: row?.revenue ?? 0 };
  });
}

export async function getTopDistricts(
  range: DateRange,
  limit = 10,
): Promise<DistrictRow[]> {
  "use cache";
  cacheTag(ORDERS_TAG);
  cacheLife(REPORTING_CACHE_LIFE);

  await connectDB();

  const rows = await Order.aggregate<{
    _id: string;
    orders: number;
    revenue: number;
  }>([
    {
      $match: {
        ...rangeMatch(range.from, range.to),
        status: { $in: REVENUE_STATUSES },
      },
    },
    {
      $group: {
        _id: "$shippingAddress.district",
        orders: { $sum: 1 },
        revenue: { $sum: "$totalAmount" },
      },
    },
    { $sort: { orders: -1, _id: 1 } },
    { $limit: limit },
  ]);

  return rows.map((row) => ({
    district: row._id ?? "Unknown",
    orders: row.orders,
    revenue: row.revenue,
  }));
}

export async function getStatusBreakdown(
  range: DateRange,
): Promise<StatusRow[]> {
  "use cache";
  cacheTag(ORDERS_TAG);
  cacheLife(REPORTING_CACHE_LIFE);

  await connectDB();

  const rows = await Order.aggregate<{
    _id: AdminSettableStatus;
    orders: number;
  }>([
    { $match: rangeMatch(range.from, range.to) },
    { $group: { _id: "$status", orders: { $sum: 1 } } },
  ]);

  const byStatus = new Map(rows.map((row) => [row._id, row.orders] as const));

  // Every status, in state-machine order, including the empty ones — a funnel
  // with a missing stage reads as a stage that does not exist.
  return ADMIN_VISIBLE_STATUSES.map((status) => ({
    status,
    orders: byStatus.get(status) ?? 0,
  }));
}
