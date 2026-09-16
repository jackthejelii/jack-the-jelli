// Brand terms shown on every product detail page. Kept here so the wording is
// edited in one place rather than inside the markup.

import { formatTaka } from "@/features/products/lib/format";

/**
 * The delivery line carries the actual charge, not just a duration.
 *
 * It takes the figures rather than importing them, because both are shop
 * settings now — a constant built at module load would be the fee the server
 * happened to boot with, not the fee the order will be priced at. A shopper
 * meeting a courier charge for the first time on the checkout page is the most
 * reliable abandonment cause in cash-on-delivery commerce, so this line has to
 * be right.
 *
 * Deliberately makes no free-delivery claim: the shop does not advertise one
 * on the product page even though a large enough order gets it.
 *
 * NOTE — this used to read "Delivered in 3 to 5 working days", a figure that
 * appeared nowhere else. `/shipping`, the contact FAQ and `LEGAL_INFO` all say
 * five to seven. Two different promises on two pages of the same shop is a
 * defect whichever one is right, so this now quotes the same window as
 * everything else.
 */
export function shippingCopy({
  feeInsideDhaka,
  feeOutsideDhaka,
  deliveryDaysMin,
  deliveryDaysMax,
}: {
  feeInsideDhaka: number;
  feeOutsideDhaka: number;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
}): string {
  return `${formatTaka(feeInsideDhaka)} in Dhaka, ${formatTaka(
    feeOutsideDhaka,
  )} elsewhere in Bangladesh. Delivered in ${deliveryDaysMin} to ${deliveryDaysMax} working days.`;
}

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
