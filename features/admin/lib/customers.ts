import { Types } from "mongoose";
import type { Filter } from "mongodb";
import { escapeRegex } from "@/lib/slug";
import { getUsersCollection, type UserDocument } from "@/lib/users";
import { Order } from "@/models";
import { normalizeBdPhone } from "@/features/orders/lib/phone";
import { ADMIN_VISIBLE_STATUSES } from "@/features/orders/lib/order-status";
import { normalizeRole, type UserRole } from "@/features/admin/lib/roles";
import type { CustomerDTO } from "@/features/admin/lib/customer-types";

// Server-only: reaches straight into the `user` collection Better Auth owns
// (there is no models/User.ts to go through) and into Mongoose for the order
// rollup. Everything here returns plain, serializable objects because neither
// a driver document nor a Date crosses the server/client boundary (§6.3).
//
// NOTE: this lists *accounts*, not everyone who has ever bought something. Most
// orders on a COD storefront are placed as a guest and carry no `userId` at
// all; those buyers show up on the orders screen, and are folded into a row
// here only once they sign up and claimGuestOrders attaches their history.

const CUSTOMERS_PER_PAGE = 10;

/**
 * Orders that count toward lifetime value.
 *
 * Cancelled and Returned are excluded: both have already given their stock
 * back, and counting them would credit a customer for money the business never
 * kept. Pending is included — an order awaiting its confirmation call is still
 * a sale in progress, and excluding it would show ৳0.00 for every customer who
 * ordered this morning.
 */
const REVENUE_STATUSES = ["Pending", "Confirmed", "Shipped", "Delivered"];

export interface AdminCustomerQuery {
  q?: string;
  role?: UserRole;
  page?: number;
}

export interface AdminCustomerListResult {
  customers: CustomerDTO[];
  total: number;
  page: number;
  totalPages: number;
  /** Per-role totals for the filter tabs, ignoring the current role filter. */
  counts: Record<UserRole | "all", number>;
}

/** What an admin actually has in hand: a name, an email, or a phone number. */
function searchFilter(search: string): Filter<UserDocument> {
  const pattern = new RegExp(escapeRegex(search), "i");
  const conditions: Filter<UserDocument>[] = [
    { name: pattern },
    { email: pattern },
    { phone: pattern },
  ];

  // `user.phone` is stored as the customer typed it — unlike an order's
  // phoneKey, it was never normalised — so a search for "+880 1712-345678" has
  // to also match a stored "01712345678". Matching on the trailing 10 digits
  // covers every form the number can have been saved in.
  const canonical = normalizeBdPhone(search);
  if (canonical) {
    conditions.push({ phone: canonical });
    conditions.push({ phone: new RegExp(`${canonical.slice(1)}$`) });
  }

  return { $or: conditions };
}

/**
 * Anything that isn't literally "admin" is a customer — including the accounts
 * that predate the `role` default and carry no field at all, which `$ne` picks
 * up and an equality match would miss.
 */
function roleFilter(role: UserRole): Filter<UserDocument> {
  return role === "admin" ? { role: "admin" } : { role: { $ne: "admin" } };
}

/** The order rollup for one account. */
interface OrderStats {
  orderCount: number;
  lifetimeValue: number;
  lastOrderAt?: Date;
}

/**
 * One aggregation for the whole page of customers, rather than three queries
 * per row. Only the ten ids actually on screen are looked up.
 */
async function getOrderStats(
  ids: Types.ObjectId[],
): Promise<Map<string, OrderStats>> {
  const stats = new Map<string, OrderStats>();
  if (ids.length === 0) return stats;

  const rows = await Order.aggregate<{
    _id: Types.ObjectId;
    orderCount: number;
    lifetimeValue: number;
    lastOrderAt: Date;
  }>([
    // Draft is the in-flight stock claim, not an order anyone placed.
    {
      $match: { userId: { $in: ids }, status: { $in: ADMIN_VISIBLE_STATUSES } },
    },
    {
      $group: {
        _id: "$userId",
        orderCount: { $sum: 1 },
        lifetimeValue: {
          $sum: {
            $cond: [{ $in: ["$status", REVENUE_STATUSES] }, "$totalAmount", 0],
          },
        },
        lastOrderAt: { $max: "$createdAt" },
      },
    },
  ]);

  for (const row of rows) {
    stats.set(String(row._id), {
      orderCount: row.orderCount,
      lifetimeValue: row.lifetimeValue,
      lastOrderAt: row.lastOrderAt,
    });
  }

  return stats;
}

function toCustomerDTO(user: UserDocument, stats?: OrderStats): CustomerDTO {
  return {
    id: String(user._id),
    // A Google account can arrive without a display name; the email is the
    // only thing guaranteed to be there.
    name: user.name?.trim() || user.email,
    email: user.email,
    emailVerified: Boolean(user.emailVerified),
    phone: user.phone?.trim() || undefined,
    image: user.image || undefined,
    role: normalizeRole(user.role),
    joinedAt: user.createdAt?.toISOString() ?? "",
    orderCount: stats?.orderCount ?? 0,
    lifetimeValue: stats?.lifetimeValue ?? 0,
    lastOrderAt: stats?.lastOrderAt?.toISOString(),
  };
}

export async function getCustomers({
  q,
  role,
  page = 1,
}: AdminCustomerQuery): Promise<AdminCustomerListResult> {
  // getUsersCollection() calls connectDB() itself.
  const users = await getUsersCollection();

  const search = q?.trim();
  const conditions: Filter<UserDocument>[] = [];
  // Escaped so a stray "(" in the search box can't throw a regex error.
  if (search) conditions.push(searchFilter(search));
  if (role) conditions.push(roleFilter(role));
  // `$and` rather than a merged object: both halves are `$or`s, and spreading
  // them into one document would silently drop the first.
  const filter: Filter<UserDocument> =
    conditions.length > 0 ? { $and: conditions } : {};

  const [total, grouped] = await Promise.all([
    users.countDocuments(filter),
    // Tab counts ignore the role filter but honour the search, so switching
    // tabs never changes the numbers on them.
    users
      .aggregate<{ _id: string | null; count: number }>([
        ...(search ? [{ $match: searchFilter(search) }] : []),
        { $group: { _id: "$role", count: { $sum: 1 } } },
      ])
      .toArray(),
  ]);

  const counts: Record<UserRole | "all", number> = {
    all: 0,
    customer: 0,
    admin: 0,
  };
  for (const row of grouped) {
    counts[normalizeRole(row._id)] += row.count;
    counts.all += row.count;
  }

  const totalPages = Math.max(1, Math.ceil(total / CUSTOMERS_PER_PAGE));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const documents = await users
    .find(filter)
    .sort({ createdAt: -1 })
    .skip((currentPage - 1) * CUSTOMERS_PER_PAGE)
    .limit(CUSTOMERS_PER_PAGE)
    .toArray();

  // Both packages resolve to the same BSON class at runtime — mongoose just
  // pins its own nested copy of the driver, so the two ObjectId types are
  // nominally distinct to TS. Same workaround as lib/auth.ts.
  const stats = await getOrderStats(
    documents.map((user) => new Types.ObjectId(String(user._id))),
  );

  return {
    customers: documents.map((user) =>
      toCustomerDTO(user, stats.get(String(user._id))),
    ),
    total,
    page: currentPage,
    totalPages,
    counts,
  };
}
