"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth-guard";
import { ORDERS_TAG } from "@/features/orders/lib/cache-tags";
import { filterConfirmedOrderNumbers } from "@/features/admin/lib/logistics";
import { updateOrderStatus } from "@/features/admin/lib/order-actions";
import type { AdminFormState } from "@/features/admin/lib/form-state";
import { ORDER_NUMBER_PATTERN } from "@/features/orders/lib/order-number";

/** Matches the checkbox limit on the queue, so a bad post can't be unbounded. */
const MAX_BULK = 50;

const bulkSchema = z
  .array(
    z
      .string()
      .trim()
      .toUpperCase()
      .regex(ORDER_NUMBER_PATTERN, "Unknown order"),
  )
  .min(1, "Select at least one order")
  .max(MAX_BULK, `Ship at most ${MAX_BULK} orders at a time`);

/**
 * Mark a batch of Confirmed orders as Shipped.
 *
 * **This loops `updateOrderStatus` rather than issuing an `updateMany`**, and
 * that is the whole design of this file. A bulk write would be one round trip
 * instead of fifty, and would also skip every invariant the single-order path
 * exists to hold: the `ALLOWED_NEXT` guard, the first-reach-wins milestone
 * timestamp, the `statusHistory` entry, and the atomic
 * `findOneAndUpdate({status: {$in: predecessorsOf(...)}})` that makes two
 * admins clicking at once produce one transition. Fifty round trips against a
 * queue someone is working by hand is not a performance problem; a second,
 * looser path through the order state machine is a correctness one.
 *
 * Orders are re-checked server-side before anything moves: the form posts
 * whatever was ticked, and a row can have been shipped by someone else between
 * the page rendering and the button being pressed.
 */
export async function bulkMarkShipped(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();

  const parsed = bulkSchema.safeParse(formData.getAll("orderNumber"));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message };
  }

  // Deduped: a malformed post could repeat a number, and shipping the same
  // order twice would append two history entries for one event.
  const requested = [...new Set(parsed.data)];

  let shippable: string[];
  try {
    shippable = await filterConfirmedOrderNumbers(requested);
  } catch (error) {
    console.error("bulkMarkShipped lookup failed", error);
    return { ok: false, message: "Could not read the dispatch queue." };
  }

  let shipped = 0;
  const failures: string[] = [];

  for (const orderNumber of shippable) {
    const body = new FormData();
    body.set("orderNumber", orderNumber);
    body.set("status", "Shipped");

    // Each call revalidates on its own, which is redundant across a loop but
    // harmless — and leaving updateOrderStatus untouched is worth more than
    // saving the repeat work.
    const result = await updateOrderStatus({ ok: false }, body);
    if (result.ok) shipped += 1;
    else failures.push(orderNumber);
  }

  revalidatePath("/admin/logistics");
  revalidatePath("/admin/orders");
  revalidateTag(ORDERS_TAG, "max");

  // Orders that were ticked but are no longer Confirmed aren't failures —
  // someone else got there first, and saying so is more useful than a number.
  const skipped = requested.length - shippable.length;

  if (shipped === 0) {
    return {
      ok: false,
      message:
        skipped > 0
          ? "Nothing to ship — those orders have already moved on."
          : "Could not ship those orders.",
    };
  }

  const parts = [`${shipped} order${shipped === 1 ? "" : "s"} marked shipped.`];
  if (skipped > 0) parts.push(`${skipped} had already moved on.`);
  if (failures.length > 0) parts.push(`${failures.length} could not be moved.`);

  return { ok: true, message: parts.join(" ") };
}
