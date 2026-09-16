"use server";

import { type ClientSession } from "mongoose";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guard";
import { connectDB } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { Order, Product, type IOrderItem } from "@/models";
import type { AdminFormState } from "@/features/admin/lib/form-state";

import { ORDERS_TAG } from "@/features/orders/lib/cache-tags";
import { ORDER_NUMBER_PATTERN } from "@/features/orders/lib/order-number";
import {
  ADMIN_SETTABLE_STATUSES,
  PAYMENT_STATUS_COPY,
  PAYMENT_STATUSES,
  predecessorsOf,
  type AdminSettableStatus,
  type OrderStatus,
} from "@/features/orders/lib/order-status";

/** Which timestamp each status stamps the first time it's reached. */
const STATUS_TIMESTAMP: Record<AdminSettableStatus, string> = {
  Pending: "placedAt",
  Confirmed: "confirmedAt",
  Shipped: "shippedAt",
  Delivered: "deliveredAt",
  Cancelled: "cancelledAt",
  Returned: "returnedAt",
};

const statusInputSchema = z.object({
  orderNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(ORDER_NUMBER_PATTERN, "Unknown order"),
  status: z.enum(ADMIN_SETTABLE_STATUSES),
});

const orderNumberSchema = z.object({
  orderNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(ORDER_NUMBER_PATTERN, "Unknown order"),
});

const paymentInputSchema = z.object({
  orderNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(ORDER_NUMBER_PATTERN, "Unknown order"),
  paymentStatus: z.enum(PAYMENT_STATUSES),
});

// `/admin` here always meant the order list, which now lives at its own
// `/admin/orders`. The reporting page that took over `/admin` is invalidated by
// cache tag rather than by path, so it is deliberately not listed.
function revalidateOrder(orderNumber: string) {
  // The reporting page reads through cached aggregations rather than a path,
  // so it is invalidated by tag. "max" serves the existing figures while the
  // new ones are computed — a dashboard may be a second behind; it must not
  // make an admin wait.
  revalidateTag(ORDERS_TAG, "max");
  revalidatePath("/admin/logistics");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderNumber}`);
  revalidatePath("/my-orders");
}

/** The optional operator note carried by the cancel and return dialogs. */
function readNote(formData: FormData): string | undefined {
  const raw = formData.get("note");
  if (typeof raw !== "string") return undefined;
  return raw.trim().slice(0, 200) || undefined;
}

/**
 * Hand every line's units back to sellable stock.
 *
 * The session is not optional. Restoring stock is always the second half of a
 * claim — the order update that stamps stockRestoredAt — and the two only mean
 * anything committed together, so every caller has a transaction to join.
 *
 * Addressed by colourway, mirroring the decrement in placeOrder. This is why
 * IOrderItem carries `variantId` as more than provenance: without it there is
 * no way to say *which* colour to un-sell, and the units would land on
 * whichever variant happened to sit first in the array. A colourway an admin
 * has since deleted matches nothing and is quietly skipped — bulkWrite reports
 * the miss rather than throwing, and there is no sensible place to put stock
 * for a colour that no longer exists.
 */
function restoreStock(items: IOrderItem[], session: ClientSession) {
  return Product.bulkWrite(
    items.map((item) => ({
      updateOne: {
        filter: { _id: item.product, "variants._id": item.variantId },
        update: { $inc: { "variants.$.stock": item.qty } },
      },
    })),
    { session },
  );
}

/**
 * Move an order to another status.
 *
 * The legal predecessors go in the **query filter**, not into a JavaScript
 * check: `findOneAndUpdate` with `{status: {$in: predecessorsOf(to)}}` reads
 * and writes as one atomic operation, so two admins clicking "Shipped" at the
 * same moment produce one transition and one history entry. A
 * read-then-check-then-write could not. That still holds now the table admits
 * backward edges — the filter just matches a wider set.
 *
 * Cancelling and returning are routed away because each also has to settle the
 * stock, which no ordinary move does.
 *
 * Draft is subtracted from that set because Draft→Pending is a legal edge that
 * belongs to checkout alone — see the filter below.
 */
export async function updateOrderStatus(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();

  const parsed = statusInputSchema.safeParse({
    orderNumber: formData.get("orderNumber"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return { ok: false, message: "That status change isn't valid." };
  }

  const { orderNumber, status } = parsed.data;
  if (status === "Cancelled") return cancelOrder(_prevState, formData);
  if (status === "Returned") return returnOrder(_prevState, formData);

  try {
    await connectDB();

    const at = new Date();
    const stamp = STATUS_TIMESTAMP[status];
    const updated = await Order.findOneAndUpdate(
      // `$ne: "Draft"` because predecessorsOf("Pending") includes it: an
      // in-flight Draft is checkout's to promote, and stealing that transition
      // would strand its commit and its rollback, which both match on Draft.
      { orderNumber, status: { $in: predecessorsOf(status), $ne: "Draft" } },
      // A pipeline rather than a plain update, so the milestone timestamp can
      // depend on its own current value. Payment is untouched on purpose: it's
      // set by hand now, and Delivered no longer implies collected.
      [
        {
          $set: {
            status,
            // First reach wins. Statuses move backwards to undo a mis-click,
            // and re-entering a stage must not rewrite when the order
            // originally got there — statusHistory keeps the full trail.
            [stamp]: { $ifNull: [`$${stamp}`, at] },
            statusHistory: {
              $concatArrays: [
                { $ifNull: ["$statusHistory", []] },
                [{ status, at }],
              ],
            },
          },
        },
      ],
      // `new` is deprecated in Mongoose 9 in favour of returnDocument, and
      // Mongoose 9 refuses an array update unless updatePipeline is declared.
      { returnDocument: "after", updatePipeline: true },
    )
      .select("status")
      .lean<{ status: OrderStatus } | null>();

    if (!updated) {
      // Either the order is gone, or it's somewhere this status can't be
      // reached from — a Delivered order rejecting a further change, say.
      const current = await Order.findOne({ orderNumber })
        .select("status")
        .lean<{ status: OrderStatus } | null>();

      return {
        ok: false,
        message: current
          ? `This order is ${current.status} — it can't be moved to ${status}.`
          : "That order no longer exists.",
      };
    }
  } catch (error) {
    console.error("updateOrderStatus failed", error);
    return { ok: false, message: "Something went wrong updating this order." };
  }

  revalidateOrder(orderNumber);
  return { ok: true, message: `Order marked ${status}.` };
}

/**
 * Cancel an order and return its stock — exactly once.
 *
 * `stockRestoredAt: null` is in the filter, so of two concurrent cancels only
 * one can match and only one restores. The status update itself is an
 * aggregation-pipeline update: every expression inside it sees the document as
 * it was *before* the write, which is what lets statusHistory be appended to
 * in the same operation that replaces the status.
 *
 * That filter settles the race, but not the crash: the claim and the restore are
 * two writes, and a process killed between them would leave stockRestoredAt
 * stamped over units nobody ever gave back — permanently, since every retry then
 * fails the very filter that protects it. So the two share a transaction, and a
 * failed restore rolls the cancel back with it and the operator can just click
 * again. Same reasoning as hardDeleteCustomer (features/admin/lib/customer-actions.ts):
 * a rare admin action can afford a pinned connection; placeOrder's hot path can't.
 *
 * Cancelling says nothing about the money — see updatePaymentStatus.
 */
export async function cancelOrder(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();

  const parsed = orderNumberSchema.safeParse({
    orderNumber: formData.get("orderNumber"),
  });
  if (!parsed.success) {
    return { ok: false, message: "That order no longer exists." };
  }

  const { orderNumber } = parsed.data;
  const note = readNote(formData);

  try {
    const mongooseInstance = await connectDB();
    const dbSession = await mongooseInstance.startSession();
    let previous: { items: IOrderItem[]; status: OrderStatus } | null = null;

    try {
      await dbSession.withTransaction(async () => {
        // Fresh inside the callback: withTransaction re-runs it on a transient
        // error, and the stamps should date the attempt that actually commits.
        const at = new Date();
        // The pre-update document is the one that still carries the items to
        // restore and the status that decides the payment outcome.
        previous = await Order.findOneAndUpdate(
          {
            orderNumber,
            // Excluded for a sharper reason than in updateOrderStatus: the
            // restore below is unconditional, while a Draft may not have reached
            // its own decrement yet, so cancelling one could hand back units it
            // never took. Releasing drafts is releaseStaleDrafts' job — it checks
            // stockCommittedAt first, precisely because this can't.
            status: { $in: predecessorsOf("Cancelled"), $ne: "Draft" },
            stockRestoredAt: null,
          },
          [
            {
              $set: {
                status: "Cancelled",
                cancelledAt: at,
                stockRestoredAt: at,
                // paymentStatus is deliberately not written. Whether the courier
                // came back with cash is the operator's call, not something to
                // infer from the status this order happened to die in.
                statusHistory: {
                  $concatArrays: [
                    { $ifNull: ["$statusHistory", []] },
                    [{ status: "Cancelled", at, ...(note ? { note } : {}) }],
                  ],
                },
              },
            },
          ],
          // Mongoose 9 refuses an array update unless the pipeline is declared
          // explicitly — without this it throws rather than running the update.
          {
            returnDocument: "before",
            updatePipeline: true,
            session: dbSession,
          },
        ).lean<{ items: IOrderItem[]; status: OrderStatus } | null>();

        // Matched nothing, so wrote nothing: the empty transaction commits and
        // the diagnostic below explains why outside it.
        if (!previous) return;

        // Only reached by the single caller that won the filter above.
        if (previous.items.length > 0) {
          await restoreStock(previous.items, dbSession);
        }
      });
    } finally {
      await dbSession.endSession();
    }

    if (!previous) {
      const current = await Order.findOne({ orderNumber })
        .select("status stockRestoredAt")
        .lean<{ status: OrderStatus; stockRestoredAt?: Date } | null>();

      if (!current)
        return { ok: false, message: "That order no longer exists." };
      // The common case by far: someone already cancelled it. Refusing here is
      // what stops the stock being restored a second time.
      return {
        ok: false,
        message:
          current.status === "Cancelled"
            ? "This order is already cancelled."
            : `A ${current.status} order can't be cancelled.`,
      };
    }
  } catch (error) {
    console.error("cancelOrder failed", error);
    return {
      ok: false,
      message: "Something went wrong cancelling this order.",
    };
  }

  revalidateOrder(orderNumber);
  revalidatePath("/collection");
  return { ok: true, message: "Order cancelled and stock returned." };
}

/**
 * Close an order that came back — from the courier, or from the customer after
 * delivery.
 *
 * Whether the goods rejoin sellable stock is the caller's decision, not a rule:
 * a piece returned because it was defective belongs in the workshop, while one
 * returned because the customer changed their mind belongs back on the shelf.
 * That's the whole reason this isn't just a Cancelled with a note — cancelling
 * always restocks.
 *
 * The restock branch reuses cancelOrder's exactly-once guarantee, by putting
 * `stockRestoredAt: null` in the filter — and its transaction, so a restore that
 * fails takes the whole return down with it rather than stranding the claim. A
 * return that *doesn't* restock must leave that guard unclaimed, since its units
 * stay committed; it writes no stock at all, and shares the transaction only so
 * there's one path through here instead of two.
 */
export async function returnOrder(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();

  const parsed = orderNumberSchema.safeParse({
    orderNumber: formData.get("orderNumber"),
  });
  if (!parsed.success) {
    return { ok: false, message: "That order no longer exists." };
  }

  const { orderNumber } = parsed.data;
  const note = readNote(formData);
  const restock = formData.get("restock") === "on";

  try {
    const mongooseInstance = await connectDB();
    const dbSession = await mongooseInstance.startSession();
    let previous: { items: IOrderItem[]; status: OrderStatus } | null = null;

    try {
      await dbSession.withTransaction(async () => {
        // Fresh per attempt, as in cancelOrder.
        const at = new Date();
        // The pre-update document still carries the items to restore.
        previous = await Order.findOneAndUpdate(
          {
            orderNumber,
            status: { $in: predecessorsOf("Returned") },
            ...(restock ? { stockRestoredAt: null } : {}),
          },
          [
            {
              $set: {
                status: "Returned",
                returnedAt: at,
                ...(restock ? { stockRestoredAt: at } : {}),
                statusHistory: {
                  $concatArrays: [
                    { $ifNull: ["$statusHistory", []] },
                    [{ status: "Returned", at, ...(note ? { note } : {}) }],
                  ],
                },
              },
            },
          ],
          {
            returnDocument: "before",
            updatePipeline: true,
            session: dbSession,
          },
        ).lean<{ items: IOrderItem[]; status: OrderStatus } | null>();

        if (!previous) return;

        // Only reached by the single caller that won the filter above.
        if (restock && previous.items.length > 0) {
          await restoreStock(previous.items, dbSession);
        }
      });
    } finally {
      await dbSession.endSession();
    }

    if (!previous) {
      const current = await Order.findOne({ orderNumber })
        .select("status")
        .lean<{ status: OrderStatus } | null>();

      if (!current)
        return { ok: false, message: "That order no longer exists." };
      return {
        ok: false,
        message:
          current.status === "Returned"
            ? "This order is already marked returned."
            : `A ${current.status} order can't be returned — only a shipped or delivered one can.`,
      };
    }
  } catch (error) {
    console.error("returnOrder failed", error);
    return { ok: false, message: "Something went wrong returning this order." };
  }

  revalidateOrder(orderNumber);
  if (restock) revalidatePath("/collection");
  return {
    ok: true,
    message: restock
      ? "Order returned and stock restored."
      : "Order returned. Stock left unchanged.",
  };
}

/**
 * Set the payment outcome by hand.
 *
 * Deliberately free of any state machine. Cash on delivery doesn't settle on a
 * schedule the order status can predict — a courier can hand over the goods and
 * come back short, and a refund happens days after Delivered — so any value is
 * reachable at any time, and nothing else in this file writes the field.
 */
export async function updatePaymentStatus(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();

  const parsed = paymentInputSchema.safeParse({
    orderNumber: formData.get("orderNumber"),
    paymentStatus: formData.get("paymentStatus"),
  });
  if (!parsed.success) {
    return { ok: false, message: "That payment status isn't valid." };
  }

  const { orderNumber, paymentStatus } = parsed.data;

  try {
    await connectDB();

    // Draft is the in-flight stock claim, not an order anyone collects on.
    const result = await Order.updateOne(
      { orderNumber, status: { $ne: "Draft" } },
      { $set: { paymentStatus, paymentUpdatedAt: new Date() } },
    );

    if (result.matchedCount === 0) {
      return { ok: false, message: "That order no longer exists." };
    }
  } catch (error) {
    console.error("updatePaymentStatus failed", error);
    return { ok: false, message: "Something went wrong updating this order." };
  }

  revalidateOrder(orderNumber);
  return {
    ok: true,
    message: `Payment marked "${PAYMENT_STATUS_COPY[paymentStatus].admin}".`,
  };
}

/**
 * Release stock held by Drafts that never became orders.
 *
 * A Draft is created before stock is decremented and flipped to Pending after,
 * so a crash in that window leaves one holding units for an order nobody
 * placed. This is the sweep — run by hand from the orders screen rather than
 * by a cron service, which is the whole reason it costs nothing.
 *
 * A Draft that predates its own decrement holds nothing, hence the
 * `stockCommittedAt` check before anything is given back.
 *
 * One transaction per draft, not one around the sweep: each release is
 * independent, so a draft whose restore fails should roll back alone and leave
 * the ones already released standing. Re-running the sweep picks up the rest.
 */
export async function releaseStaleDrafts(): Promise<AdminFormState> {
  await requireAdmin();

  let released = 0;

  try {
    const mongooseInstance = await connectDB();

    // The same window getOrders counts with, so the button's badge and what
    // the sweep actually releases can never disagree.
    const { staleDraftMinutes } = await getSettings();
    const staleBefore = new Date(Date.now() - staleDraftMinutes * 60_000);
    const drafts = await Order.find({
      status: "Draft",
      createdAt: { $lt: staleBefore },
      stockRestoredAt: null,
    })
      .select("orderNumber idempotencyKey items stockCommittedAt")
      .lean<
        {
          orderNumber: string;
          idempotencyKey: string;
          items: IOrderItem[];
          stockCommittedAt?: Date;
        }[]
      >();

    const dbSession = await mongooseInstance.startSession();

    try {
      for (const draft of drafts) {
        let claimed = false;

        await dbSession.withTransaction(async () => {
          // Reset per attempt: withTransaction can re-run this callback, and a
          // claim from a rolled-back attempt didn't happen.
          claimed = false;
          const at = new Date();
          // Same single-restore guarantee as cancelOrder: the filter, not a
          // check — and the same transaction, so the restore below either
          // commits with this claim or leaves the draft to be swept again.
          const result = await Order.updateOne(
            {
              orderNumber: draft.orderNumber,
              status: "Draft",
              stockRestoredAt: null,
            },
            {
              $set: {
                status: "Cancelled",
                cancelledAt: at,
                stockRestoredAt: at,
                paymentStatus: "failed",
                // Same release as the checkout rollback: this draft never became
                // an order, so the customer's browser must be able to retry the
                // identical cart under the key it is still holding.
                idempotencyKey: `${draft.idempotencyKey}:void:${draft.orderNumber}`,
              },
              $push: {
                statusHistory: {
                  status: "Cancelled",
                  at,
                  note: "Abandoned draft released by sweep",
                },
              },
            },
            { session: dbSession },
          );

          if (result.modifiedCount !== 1) return;
          claimed = true;

          if (draft.stockCommittedAt && draft.items.length > 0) {
            await restoreStock(draft.items, dbSession);
          }
        });

        // Counted out here, never inside the callback: a retried transaction
        // runs that body more than once, and only the commit is real.
        if (claimed) released += 1;
      }
    } finally {
      await dbSession.endSession();
    }
  } catch (error) {
    console.error("releaseStaleDrafts failed", error);
    return { ok: false, message: "Could not release the held drafts." };
  }

  revalidatePath("/admin/orders");
  revalidatePath("/collection");
  revalidateTag(ORDERS_TAG, "max");
  return {
    ok: true,
    message:
      released === 0
        ? "Nothing to release."
        : `Released ${released} abandoned draft${released === 1 ? "" : "s"}.`,
  };
}
