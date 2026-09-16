import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import LegalDocument from "@/features/legal/components/LegalDocument";

export const metadata: Metadata = {
  title: "Shipping Policy",
  description:
    "Where Jack The Jelli delivers, how long it takes, what it costs, and what happens when nobody is home.",
  alternates: { canonical: "/shipping" },
};

/**
 * The delivery half of the two commerce documents a cash-on-delivery shop is
 * expected to publish. Written after the store was flagged in Search Console
 * under "Deceptive pages": a shop that takes money at the door and publishes
 * neither a shipping nor a returns policy reads as a scam to a classifier and
 * to a human reviewer alike.
 *
 * Every figure here is read rather than typed. The fees and the delivery
 * window both come from `getSettings()`, which is what pricing actually
 * charges and what the checkout page quotes. A policy page that disagrees with
 * the checkout it describes is worse than no policy page — and now that the
 * owner can change a fee from `/admin/settings`, "imported from the constant"
 * would no longer have been the same thing as "what you will be charged".
 */
export default async function ShippingPolicyPage() {
  const {
    feeInsideDhaka,
    feeOutsideDhaka,
    deliveryDaysMin,
    deliveryDaysMax,
    contactEmail,
    contactPhone,
    address,
  } = await getSettings();

  return (
    <LegalDocument
      title="Shipping Policy"
      intro="Where we deliver, how long it takes, and what it costs."
    >
      <h2>Where we deliver</h2>
      <p>
        We deliver to <strong>all 64 districts of Bangladesh</strong>. We do not
        ship outside the country.
      </p>

      <h2>What it costs</h2>
      <p>
        The delivery fee is set by the district you choose at checkout, and you
        see the exact amount before you confirm the order — it is never added
        afterwards.
      </p>
      <ul>
        <li>
          <strong>Inside Dhaka</strong>: ৳{feeInsideDhaka}
        </li>
        <li>
          <strong>Anywhere else in Bangladesh</strong>: ৳{feeOutsideDhaka}
        </li>
      </ul>

      <h2>How long it takes</h2>
      <p>
        <strong>
          {deliveryDaysMin} to {deliveryDaysMax} business days
        </strong>{" "}
        from the day we confirm your order. Business days do not include Fridays
        or public holidays.
      </p>
      <p>
        We call to confirm every order before it is prepared, so keep the phone
        number you ordered with to hand. If we cannot reach you, the order waits
        rather than being cancelled — but the clock does not start until we have
        spoken to you.
      </p>

      <h2>How you pay</h2>
      <p>
        <strong>Cash on delivery, always.</strong> You pay the courier in cash
        when the order reaches you. We never ask for card numbers, bank details
        or mobile-wallet credentials, and no money leaves your hands before the
        piece does.
      </p>
      <p>
        The amount due at the door is the order total shown at checkout,
        including the delivery fee.
      </p>

      <h2>Tracking your order</h2>
      <p>
        Track any order at <a href="/track">jackthejelli.com/track</a> using the
        order number and the phone number it was placed with. You do not need an
        account for this.
      </p>

      <h2>If nobody is home</h2>
      <p>
        The courier will attempt delivery and call the number on the order. If
        the attempt fails, they will normally try once more. If the order still
        cannot be delivered it is returned to us, and we will contact you to
        arrange a new attempt or to cancel the order.
      </p>

      <h2>If something arrives damaged</h2>
      <p>
        <strong>Check the piece before the courier leaves.</strong> Payment
        happens at your door, so that is the moment a problem can still be put
        right: if the parcel arrives damaged, or is not what you ordered, refuse
        it there and then and call us on {contactPhone}. It returns to us at no
        cost to you and we will replace it or cancel the order.
      </p>
      <p>
        Once an order has been delivered and paid for, the sale is final — see
        the <a href="/returns">Returns Policy</a>.
      </p>

      <h2>Questions</h2>
      <p>
        Call or write to us on {contactPhone}, email{" "}
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>, or use the form
        on our <a href="/contact">contact page</a>. We are at {address}.
      </p>
    </LegalDocument>
  );
}
