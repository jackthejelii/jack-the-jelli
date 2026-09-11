import type { Metadata } from "next";
import LegalDocument from "@/features/legal/components/LegalDocument";
import { LEGAL_INFO } from "@/features/legal/lib/legal-info";
import {
  DELIVERY_FEE_INSIDE_DHAKA,
  DELIVERY_FEE_OUTSIDE_DHAKA,
} from "@/features/checkout/lib/delivery";

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
 * Every figure here is imported rather than typed. The fees come from
 * `features/checkout/lib/delivery.ts`, which is what pricing actually charges,
 * and the delivery window from `LEGAL_INFO`, which the contact FAQ also quotes.
 * A policy page that disagrees with the checkout it describes is worse than no
 * policy page.
 */
export default function ShippingPolicyPage() {
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
          <strong>Inside Dhaka</strong>: ৳{DELIVERY_FEE_INSIDE_DHAKA}
        </li>
        <li>
          <strong>Anywhere else in Bangladesh</strong>: ৳
          {DELIVERY_FEE_OUTSIDE_DHAKA}
        </li>
      </ul>

      <h2>How long it takes</h2>
      <p>
        <strong>
          {LEGAL_INFO.deliveryDaysMin} to {LEGAL_INFO.deliveryDaysMax} business
          days
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
        Check the piece before the courier leaves if you can. If it arrives
        damaged, or is not what you ordered, tell us within{" "}
        {LEGAL_INFO.returnWindowDays} days of delivery and we will replace it or
        refund it at our cost — see the <a href="/returns">Returns Policy</a>.
      </p>

      <h2>Questions</h2>
      <p>
        Call or write to us on {LEGAL_INFO.contactPhone}, email{" "}
        <a href={`mailto:${LEGAL_INFO.contactEmail}`}>
          {LEGAL_INFO.contactEmail}
        </a>
        , or use the form on our <a href="/contact">contact page</a>. We are at{" "}
        {LEGAL_INFO.address}.
      </p>
    </LegalDocument>
  );
}
