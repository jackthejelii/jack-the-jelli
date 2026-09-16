import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import LegalDocument from "@/features/legal/components/LegalDocument";
import { LEGAL_INFO } from "@/features/legal/lib/legal-info";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms you agree to when you order from Jack The Jelli: ordering, cash on delivery, delivery across Bangladesh, inspecting your parcel at the door, and our all-sales-final policy.",
  alternates: { canonical: "/terms" },
};

/**
 * The companion to /privacy, and the second URL Google requires before the
 * OAuth consent screen can be published. Written against how the store
 * actually works: guest checkout, phone confirmation, cash on delivery, and
 * the delivery zones in features/checkout/lib/delivery.ts.
 *
 * The remedy this shop offers is refusal at the door, not a return window:
 * sales are final once the courier has delivered and the cash has changed
 * hands. /returns and /shipping say the same thing in the same words, and the
 * three must be changed together or the shop is publishing two policies.
 */
export default async function TermsOfServicePage() {
  // Contact details are shop settings now — the owner can change the published
  // address or number from /admin/settings without a deploy. `legalName` stays
  // on LEGAL_INFO: the legal entity a customer contracts with is not something
  // an admin form should be able to rewrite.
  const { contactEmail, contactPhone, address } = await getSettings();

  return (
    <LegalDocument
      title="Terms of Service"
      intro="The agreement between you and us when you order a piece from this shop."
    >
      <h2>These terms</h2>
      <p>
        By placing an order at jackthejelli.com you agree to what follows. We
        are {LEGAL_INFO.legalName}, of {address}. If anything here is unclear,
        ask us before you order: {contactPhone} or{" "}
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
      </p>
      <p>
        You must be 18 or older to order, or have the agreement of a parent or
        guardian.
      </p>

      <h2>What we make</h2>
      <p>
        Our pieces are crafted from{" "}
        <strong>premium synthetic (faux) leather</strong>, as specified on each
        product listing. They are not animal leather and we never describe them
        as such.
      </p>

      <h2>Orders</h2>
      <p>
        An order placed on this site is an offer to buy, not a concluded sale.{" "}
        <strong>
          We call you on the number you gave to confirm every order
        </strong>{" "}
        before it is prepared. The sale is made when we confirm it.
      </p>
      <p>
        We may decline or cancel an order, for example if an item has sold out,
        if a price was listed in error, or if we cannot reach you to confirm.
        Nothing has been charged at that point, because payment is taken on
        delivery.
      </p>

      <h2>Prices and delivery fees</h2>
      <p>
        Prices are in Bangladeshi Taka and are the prices shown on the product
        page at the time you order. A delivery fee is added at checkout and
        depends on whether the address is inside or outside Dhaka; the fee shown
        in the order summary is the fee you pay.
      </p>

      <h2>Payment</h2>
      <p>
        <strong>We accept cash on delivery only.</strong> You pay the courier,
        in full, when your order arrives. We do not take card payments or
        mobile-wallet payments through this website, and nobody from this shop
        will ever ask you for card details or a wallet PIN.
      </p>

      <h2>Delivery</h2>
      <p>
        We deliver across Bangladesh through a courier. Delivery times quoted
        anywhere on this site are estimates, not guarantees. They depend on the
        courier, the address, and occasionally on weather or holidays.
      </p>
      <p>
        Please give an address someone can receive the parcel at, and a phone
        number that will be answered. Repeated failed delivery attempts may mean
        an order is returned to us and cancelled.
      </p>
      <p>
        You can check where an order has got to at{" "}
        <a href="/track">jackthejelli.com/track</a>.
      </p>

      <h2>Cancellations</h2>
      <p>
        Tell us before an order ships and we will cancel it at no cost. Nothing
        has been paid at that point, so there is nothing to refund. Once the
        parcel is with the courier, your remaining option is to decline it at
        the door.
      </p>

      <h2>Inspect your order before you pay</h2>
      <p>
        Because payment happens at your door, the minute the courier is standing
        there is your opportunity to check the piece.{" "}
        <strong>
          Please open the parcel and inspect it before you hand over the cash or
          accept the delivery.
        </strong>{" "}
        If it is damaged, faulty, or not the item you ordered, refuse it there
        and then — it returns to us at no cost to you, and we will replace it or
        cancel the order.
      </p>

      <h2>All sales are final</h2>
      <p>
        <strong>
          Once an order has been successfully delivered by the courier and
          payment is completed, all sales are strictly final.
        </strong>{" "}
        We do not offer returns, exchanges or refunds after successful delivery
        and payment completion. That is why the inspection above matters: it is
        the point at which a problem can still be put right.
      </p>
      <p>
        Colour, finish and small surface markings vary a little between pieces
        and between screens, and product photographs are representative rather
        than exact.
      </p>

      <h2>Your account</h2>
      <p>
        You do not need an account to order. If you make one, keep your password
        to yourself and tell us if you think someone else has used it. We may
        suspend an account that is being used to abuse the shop or its staff.
      </p>

      <h2>Intellectual property</h2>
      <p>
        All designs, graphics, photographs, branding and content on this site
        are the sole property of {LEGAL_INFO.legalName} and may not be
        reproduced without our written permission.
      </p>

      <h2>Where we stand</h2>
      <p>
        We take care over what we make and what we say about it, but we cannot
        promise the website will never be unavailable or that every listing will
        always be free of error. Our responsibility for any order is limited to
        the amount paid for it. Nothing here limits any right you have under
        Bangladeshi consumer law.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of Bangladesh, and disputes fall to
        the courts of Bangladesh.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms; the date at the top of this page shows when
        they last changed. The terms that apply to your order are the ones
        published when you placed it.
      </p>

      <h2>Contact</h2>
      <p>
        {contactPhone} · <a href={`mailto:${contactEmail}`}>{contactEmail}</a> ·{" "}
        {address}
      </p>
    </LegalDocument>
  );
}
