// Brand terms shown on every product detail page. Kept here so the wording is
// edited in one place rather than inside the markup.

import {
  DELIVERY_FEE_INSIDE_DHAKA,
  DELIVERY_FEE_OUTSIDE_DHAKA,
} from "@/features/checkout/lib/delivery";
import { formatTaka } from "@/features/products/lib/format";

/**
 * The delivery line carries the actual charge, not just a duration.
 *
 * It reads the two fees from `features/checkout/lib/delivery.ts` rather than
 * restating them, because a shopper meeting a courier charge for the first
 * time on the checkout page is the most reliable abandonment cause in
 * cash-on-delivery commerce — and a hardcoded number here would eventually
 * disagree with the one the order is actually priced at.
 *
 * Deliberately makes no free-delivery claim: the shop does not offer one.
 */
export const SHIPPING_COPY = `${formatTaka(DELIVERY_FEE_INSIDE_DHAKA)} in Dhaka, ${formatTaka(
  DELIVERY_FEE_OUTSIDE_DHAKA,
)} elsewhere in Bangladesh. Delivered in 3 to 5 working days.`;

/**
 * The single strongest reassurance this brand has, and it used to appear
 * nowhere on the page where the decision is made. With no reviews, ratings or
 * order counts to point at, "you pay nothing until it is in your hand" is the
 * argument.
 */
export const PAYMENT_COPY =
  "Cash to the courier when it arrives. Nothing before.";

export const RETURNS_COPY =
  "Exchanges within 14 days, unused and in its original packaging.";
