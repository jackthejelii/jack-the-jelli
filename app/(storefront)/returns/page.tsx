import type { Metadata } from "next";
import LegalDocument from "@/features/legal/components/LegalDocument";
import { LEGAL_INFO } from "@/features/legal/lib/legal-info";

export const metadata: Metadata = {
  title: "Returns & Refunds",
  description:
    "How to return a Jack The Jelli piece, how long you have, what condition it must be in, and how the refund is paid.",
  alternates: { canonical: "/returns" },
};

/**
 * The returns half of the two commerce documents a cash-on-delivery shop is
 * expected to publish — see the note in the shipping page for why both exist.
 *
 * The window is quoted from `LEGAL_INFO.returnWindowDays` rather than typed, so
 * this page, the terms and the contact FAQ can never drift apart. Refunds are
 * described in cash terms on purpose: there is no payment gateway in this
 * business, so there is nothing to reverse a charge against.
 */
export default function ReturnsPolicyPage() {
  return (
    <LegalDocument
      title="Returns &amp; Refunds"
      intro={`You have ${LEGAL_INFO.returnWindowDays} days from delivery to change your mind.`}
    >
      <h2>The short version</h2>
      <p>
        If a piece is not right, tell us within{" "}
        <strong>{LEGAL_INFO.returnWindowDays} days of delivery</strong> and we
        will take it back, provided it is unused and in its original condition.
        We arrange the collection with you.
      </p>

      <h2>What we can accept</h2>
      <p>To be returned, a piece must be:</p>
      <ul>
        <li>
          <strong>Unused</strong> — not carried, not filled, not folded into a
          pocket.
        </li>
        <li>
          <strong>In its original condition</strong>, with any packaging, dust
          bag or tag it arrived with.
        </li>
        <li>
          <strong>Free of damage caused after delivery</strong> — scratches,
          water marks, ink or scent picked up in use.
        </li>
      </ul>
      <p>
        Leather is a natural material. Grain, tone and small surface markings
        vary between pieces and are not faults, so they are not on their own a
        reason we can accept a return — though if a piece is genuinely not what
        was described, that is a fault and it is covered below.
      </p>

      <h2>What we cannot accept</h2>
      <ul>
        <li>
          Anything reported more than {LEGAL_INFO.returnWindowDays} days after
          delivery.
        </li>
        <li>Pieces that have been used, altered, repaired or personalised.</li>
        <li>
          Damage caused after delivery, including normal wear, water damage and
          accidents.
        </li>
      </ul>

      <h2>If it arrived faulty, damaged or wrong</h2>
      <p>
        This is on us, not on you. If a piece arrives damaged, faulty, or is
        simply not the item you ordered, tell us within{" "}
        {LEGAL_INFO.returnWindowDays} days and we will replace it or refund it
        in full, <strong>including the delivery fee</strong>. You do not pay to
        send it back.
      </p>

      <h2>If you simply changed your mind</h2>
      <p>
        Also fine, within the same {LEGAL_INFO.returnWindowDays} days. We refund
        the price of the piece. The original delivery fee is not refunded, and
        the cost of returning the piece to us is yours.
      </p>

      <h2>How to start a return</h2>
      <p>
        There is no form to fill in. Call us on {LEGAL_INFO.contactPhone}, email{" "}
        <a href={`mailto:${LEGAL_INFO.contactEmail}`}>
          {LEGAL_INFO.contactEmail}
        </a>
        , or use our <a href="/contact">contact page</a>, and have your{" "}
        <strong>order number</strong> to hand — it is on your confirmation and
        on <a href="/track">the tracking page</a>. Tell us what is wrong and we
        will arrange the collection with you directly.
      </p>
      <p>
        Please do not send anything back before speaking to us. An unannounced
        parcel is one we cannot match to an order.
      </p>

      <h2>How the refund is paid</h2>
      <p>
        We take <strong>cash on delivery only</strong>, so there is no card
        payment to reverse. Refunds are paid back to you directly — in cash, or
        by mobile financial transfer to the number you ordered with, whichever
        suits you.
      </p>
      <p>
        We issue the refund once the returned piece reaches us and we have
        checked its condition, normally within {LEGAL_INFO.deliveryDaysMax}{" "}
        business days of it arriving.
      </p>

      <h2>Cancelling before delivery</h2>
      <p>
        You can cancel any order at no cost before it has been dispatched — just
        call us. Because payment happens at the door, cancelling costs you
        nothing: you can also simply decline the order when the courier arrives,
        though telling us in advance saves everyone the journey.
      </p>

      <h2>Questions</h2>
      <p>
        Write to us at {LEGAL_INFO.address}, call {LEGAL_INFO.contactPhone}, or
        email{" "}
        <a href={`mailto:${LEGAL_INFO.contactEmail}`}>
          {LEGAL_INFO.contactEmail}
        </a>
        . See also our <a href="/shipping">Shipping Policy</a>.
      </p>
    </LegalDocument>
  );
}
