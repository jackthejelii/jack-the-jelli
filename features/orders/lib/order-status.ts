// The order state machine, in one place. Imported by the admin actions (which
// enforce it), the customer-facing pages (which label it), and models/Order.ts
// (which enumerates it) — so none of the three can drift from the others.
//
// Deliberately free of any server-only import: client components render from
// ORDER_STATUS_COPY, and pulling Mongoose in behind it would ship the driver to
// the browser.

export const ORDER_STATUSES = [
  "Draft",
  "Pending",
  "Confirmed",
  "Shipped",
  "Delivered",
  "Cancelled",
  "Returned",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "pending",
  "collected",
  "refunded",
  "failed",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/**
 * The four states an order passes through while it's still in play. They're
 * mutually reachable in both directions, so a mis-click is one click to undo —
 * the admin panel shows all four at once rather than only the next one.
 */
export const LIVE_STATUSES = [
  "Pending",
  "Confirmed",
  "Shipped",
  "Delivered",
] as const satisfies readonly OrderStatus[];

/** Every live status except the one given. */
function otherLiveStatuses(self: OrderStatus): OrderStatus[] {
  return LIVE_STATUSES.filter((status) => status !== self);
}

/**
 * `Draft` is internal: an order is created as Draft to claim its
 * idempotencyKey, stock is decremented second, and only then does it flip to
 * Pending. It must be excluded from every customer- and admin-facing query —
 * ADMIN_VISIBLE_STATUSES below is what the admin list filters on.
 *
 * Derived from LIVE_STATUSES rather than written out, so the "any live status
 * to any other" rule can't rot into an inconsistent hand-maintained matrix.
 */
export const ALLOWED_NEXT: Record<OrderStatus, readonly OrderStatus[]> = {
  Draft: ["Pending", "Cancelled"],
  Pending: [...otherLiveStatuses("Pending"), "Cancelled"],
  Confirmed: [...otherLiveStatuses("Confirmed"), "Cancelled"],
  Shipped: [...otherLiveStatuses("Shipped"), "Cancelled", "Returned"],
  // No Cancelled here on purpose: an order that reached the customer and came
  // back is a Return, and Return is the one that asks whether the goods are
  // still sellable. Cancelling would silently assume they are.
  Delivered: [...otherLiveStatuses("Delivered"), "Returned"],
  // Terminal — both have settled the stock and the money.
  Cancelled: [],
  Returned: [],
};

/** Statuses an admin may move an order to by hand — Draft is never one. */
export const ADMIN_SETTABLE_STATUSES = [
  "Pending",
  "Confirmed",
  "Shipped",
  "Delivered",
  "Cancelled",
  "Returned",
] as const satisfies readonly OrderStatus[];

export type AdminSettableStatus = (typeof ADMIN_SETTABLE_STATUSES)[number];

export const ADMIN_VISIBLE_STATUSES = ADMIN_SETTABLE_STATUSES;

/**
 * Which statuses may legally precede `to`.
 *
 * This is the whole point of the module: the transition is enforced by putting
 * `{status: {$in: predecessorsOf(to)}}` in the `findOneAndUpdate` *filter*, so
 * two concurrent admins can't both advance the same order. A
 * read-then-check-then-write in JavaScript would race.
 */
export function predecessorsOf(to: OrderStatus): OrderStatus[] {
  return ORDER_STATUSES.filter((from) => ALLOWED_NEXT[from].includes(to));
}

export function isTerminal(status: OrderStatus): boolean {
  return ALLOWED_NEXT[status].length === 0;
}

interface StatusCopy {
  /** Customer-facing name. "Pending" means nothing to a buyer. */
  label: string;
  /** One line of "where is my order" explanation for /track and /my-orders. */
  description: string;
}

export const ORDER_STATUS_COPY: Record<OrderStatus, StatusCopy> = {
  Draft: {
    label: "Order Placed",
    description: "Your order is being registered.",
  },
  Pending: {
    label: "Order Placed",
    description:
      "We have received your order and will call to confirm it shortly.",
  },
  Confirmed: {
    label: "Order Confirmed",
    description: "Confirmed over the phone. Your piece is being prepared.",
  },
  Shipped: {
    label: "In Transit",
    description: "Handed to the courier. Please keep the cash amount ready.",
  },
  Delivered: {
    label: "Delivered",
    // Says nothing about money: payment is set by hand and can still be
    // AWAITING COLLECTION while this renders. See PAYMENT_STATUS_COPY.
    description: "Delivered to your address.",
  },
  Cancelled: {
    label: "Cancelled",
    description: "This order was cancelled.",
  },
  Returned: {
    label: "Returned",
    description: "This order came back to us and has been closed.",
  },
};

/**
 * How a status should *read* on a customer surface, as opposed to what it means
 * operationally: an order still moving, one that arrived, or one that stopped.
 *
 * Every customer-facing screen was deriving this by hand — /my-orders with a
 * `Cancelled ? destructive : muted` ternary, OrderTimeline with its own branch —
 * so a new terminal status would have had to be remembered in each of them.
 * Deliberately semantic rather than a class string: the Tailwind vocabulary
 * differs between the storefront and the admin panel, so only the meaning is
 * shared and each surface picks its own colours from it.
 */
export type OrderStatusTone = "live" | "complete" | "halted";

export const ORDER_STATUS_TONE: Record<OrderStatus, OrderStatusTone> = {
  Draft: "live",
  Pending: "live",
  Confirmed: "live",
  Shipped: "live",
  Delivered: "complete",
  Cancelled: "halted",
  Returned: "halted",
};

interface PaymentCopy {
  /** Admin wording — the operator needs the collection state, not a euphemism. */
  admin: string;
  /** Customer wording, for /track and /my-orders. */
  customer: string;
}

/**
 * Payment is set by hand now — nothing derives it from the delivery status —
 * so its wording has to live somewhere both sides read from. Keeping it here
 * means a new payment state can't be added without its customer-facing copy
 * following it.
 */
export const PAYMENT_STATUS_COPY: Record<PaymentStatus, PaymentCopy> = {
  pending: { admin: "Awaiting collection", customer: "Cash on delivery" },
  collected: { admin: "Collected", customer: "Collected" },
  refunded: { admin: "Refunded", customer: "Refunded" },
  failed: { admin: "Not collected", customer: "Not collected" },
};

/**
 * The timeline shown on /track, oldest first. Cancelled is excluded because a
 * cancelled order stops the timeline rather than advancing through it.
 */
export const TRACKING_STEPS = [
  "Pending",
  "Confirmed",
  "Shipped",
  "Delivered",
] as const satisfies readonly OrderStatus[];
