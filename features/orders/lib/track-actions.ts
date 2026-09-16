"use server";

import { clientKey, createRateLimiter } from "@/lib/rate-limit";
import { getSettings } from "@/lib/settings";
import { getOrderForTracking } from "@/features/orders/lib/orders";
import type { TrackState } from "@/features/orders/lib/track-state";

/**
 * Deliberately identical for every failure: wrong number, wrong phone, right
 * number with the wrong phone, or a number that was never issued. Anything
 * more specific turns /track into an oracle for whether an order exists.
 */
const NOT_FOUND =
  "No order matches that number and phone. Check both and try again.";

/**
 * Brute-force brake on the lookup. It won't stop a distributed attacker, but
 * it does stop the realistic one (a script from one address walking the
 * order-number space), and requiring a matching phone number is the actual
 * defence.
 */
const lookupLimiter = createRateLimiter({ windowMs: 60_000, max: 12 });

/**
 * Public order lookup. No session required — this is the guest tracking path,
 * and requiring an account here would be pointless when checkout doesn't.
 */
export async function lookupOrder(
  _prevState: TrackState,
  formData: FormData,
): Promise<TrackState> {
  const orderNumber =
    typeof formData.get("order") === "string"
      ? String(formData.get("order")).trim()
      : "";
  const phone =
    typeof formData.get("phone") === "string"
      ? String(formData.get("phone")).trim()
      : "";

  const values = { order: orderNumber, phone };

  if (!orderNumber || !phone) {
    return {
      searched: true,
      values,
      message: "Enter both your order number and the phone number you gave.",
    };
  }

  // Tracking survives "orders paused" on purpose — a customer with a live
  // order still needs to know where it is, and refusing them would punish the
  // people who already bought. Only full maintenance closes it, and even then
  // this is the check that counts: the storefront gate stops /track rendering,
  // but this action is a public endpoint reachable without it.
  const { maintenanceMode, maintenanceMessage } = await getSettings();
  if (maintenanceMode) {
    return { searched: true, values, message: maintenanceMessage };
  }

  if (lookupLimiter(await clientKey())) {
    return {
      searched: true,
      values,
      message: "Too many attempts. Please wait a minute and try again.",
    };
  }

  try {
    const order = await getOrderForTracking(orderNumber, phone);
    if (!order) return { searched: true, values, message: NOT_FOUND };

    return { searched: true, values, order };
  } catch (error) {
    console.error("lookupOrder failed", error);
    return {
      searched: true,
      values,
      message: "Something went wrong looking that up. Please try again.",
    };
  }
}
