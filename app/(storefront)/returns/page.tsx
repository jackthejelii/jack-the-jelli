import type { Metadata } from "next";
import LegalDocument from "@/features/legal/components/LegalDocument";
import { LEGAL_INFO } from "@/features/legal/lib/legal-info";

export const metadata: Metadata = {
  title: "Returns & Refunds",
  description:
    "Jack The Jelli sales are final once an order is delivered and paid for. Inspect your parcel at the door and refuse it there if anything is wrong.",
  alternates: { canonical: "/returns" },
};

/**
 * The returns half of the two commerce documents a cash-on-delivery shop is
 * expected to publish — see the note in the shipping page for why both exist.
 *
 * This page used to promise a 7-day window, including change-of-mind refunds.
 * It no longer does: sales are final once the courier has delivered and the
 * cash has changed hands, and the remedy moved to the only moment a
 * cash-on-delivery shop can actually offer one — inspection at the door,
 * before payment. /terms and /shipping carry the same policy in the same
 * words, and the three must be changed together or the shop is publishing two
 * policies.
 *
 * A page still lives here, rather than being deleted, because "Returns" is
 * what a shopper looks for in the nav and what a marketplace review checks
 * for. Saying plainly that there are none is the honest version of that page.
 */
export default function ReturnsPolicyPage() {
  return (
    <LegalDocument
      title="Returns &amp; Refunds"
      intro="Check the piece at your door, before you pay. That is the moment anything can be put right."
    >
      <h2>The short version</h2>
      <p>
        You pay the courier, in cash, at your door. Open the parcel and look at
        the piece <strong>before</strong> you hand over the money — if anything
        is wrong, refuse the delivery and it comes straight back to us at no
        cost to you.{" "}
        <strong>
          Once an order has been delivered and paid for, the sale is final.
        </strong>
      </p>

      <h2>Inspect before you pay</h2>
      <p>
        The courier can wait while you check. Look for the things that matter:
      </p>
      <ul>
        <li>
          <strong>Is it the piece you ordered</strong> — the right model, the
          right colour?
        </li>
        <li>
          <strong>Did it arrive undamaged</strong> — no crushing, tearing or
          water damage in transit?
        </li>
        <li>
          <strong>Is the workmanship sound</strong> — stitching, edges, card
          slots, the fold?
        </li>
      </ul>
      <p>
        If the answer to any of those is no, do not pay. Refuse the parcel, and
        call us on {LEGAL_INFO.contactPhone} so we know to expect it back. We
        will send a replacement or cancel the order, whichever you prefer. You
        are not charged for a refused delivery, and you do not pay the return
        courier.
      </p>

      <h2>All sales are final after delivery</h2>
      <p>
        <strong>
          Once the courier has successfully delivered your order and payment is
          complete, all sales are strictly final.
        </strong>{" "}
        We do not offer returns, exchanges or refunds after successful delivery
        and payment completion — including for change of mind.
      </p>
      <p>
        We know that is a firm line, so we would rather you took the extra
        minute at the door than discovered a problem afterwards. Nothing here
        limits any right you have under Bangladeshi consumer law.
      </p>

      <h2>About the material</h2>
      <p>
        Our pieces are made from premium synthetic (faux) leather. Colour,
        finish and small surface markings vary a little between pieces and
        between screens, so product photographs are representative rather than
        exact. That variation is a property of the material and is not a fault.
      </p>

      <h2>Cancelling before delivery</h2>
      <p>
        You can cancel any order at no cost before it has been dispatched — just
        call us on {LEGAL_INFO.contactPhone}. Because payment happens at the
        door, cancelling costs you nothing.
      </p>
      <p>
        After dispatch we cannot pull a parcel back from the courier, but you
        can still decline it when it arrives. Telling us in advance saves
        everyone the journey.
      </p>

      <h2>If something goes wrong anyway</h2>
      <p>
        Talk to us. If a piece fails in a way that looks like a genuine defect
        rather than wear, we would still like to hear about it — call{" "}
        {LEGAL_INFO.contactPhone}, email{" "}
        <a href={`mailto:${LEGAL_INFO.contactEmail}`}>
          {LEGAL_INFO.contactEmail}
        </a>
        , or use our <a href="/contact">contact page</a>, with your{" "}
        <strong>order number</strong> to hand. It is on your confirmation and on{" "}
        <a href="/track">the tracking page</a>. We make no promise of a refund
        here, and we will tell you honestly what we can do.
      </p>
      <p>
        Please do not send anything back before speaking to us. An unannounced
        parcel is one we cannot match to an order.
      </p>

      <h2>Questions</h2>
      <p>
        Write to us at {LEGAL_INFO.address}, call {LEGAL_INFO.contactPhone}, or
        email{" "}
        <a href={`mailto:${LEGAL_INFO.contactEmail}`}>
          {LEGAL_INFO.contactEmail}
        </a>
        . See also our <a href="/shipping">Shipping Policy</a> and our{" "}
        <a href="/terms">Terms of Service</a>.
      </p>
    </LegalDocument>
  );
}
