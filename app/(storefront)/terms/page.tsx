import type { Metadata } from "next";
import LegalDocument from "@/features/legal/components/LegalDocument";
import { LEGAL_INFO } from "@/features/legal/lib/legal-info";

export const metadata: Metadata = {
  title: "Terms of Service | Jack The Jelli",
  description:
    "The terms you agree to when you order from Jack The Jelli: ordering, cash on delivery, delivery across Bangladesh, cancellations and returns.",
};

/**
 * The companion to /privacy, and the second URL Google requires before the
 * OAuth consent screen can be published. Written against how the store
 * actually works: guest checkout, phone confirmation, cash on delivery, and
 * the delivery zones in features/checkout/lib/delivery.ts.
 */
export default function TermsOfServicePage() {
  return (
    <LegalDocument
      title="Terms of Service"
      intro="The agreement between you and us when you order a piece from this shop."
    >
      <h2>These terms</h2>
      <p>
        By placing an order at jackthejelli.com you agree to what follows. We
        are {LEGAL_INFO.legalName}, of {LEGAL_INFO.address}. If anything here is
        unclear, ask us before you order: {LEGAL_INFO.contactPhone} or{" "}
        <a href={`mailto:${LEGAL_INFO.contactEmail}`}>
          {LEGAL_INFO.contactEmail}
        </a>
        .
      </p>
      <p>
        You must be 18 or older to order, or have the agreement of a parent or
        guardian.
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
        Tell us before an order ships and we will cancel it, at no cost. Once it
        is with the courier, treat it as a return instead.
      </p>

      <h2>Returns</h2>
      <p>
        If a piece is faulty, damaged in transit, or not what you ordered,
        contact us within {LEGAL_INFO.returnWindowDays} days of delivery and we
        will arrange a replacement or a refund. Items must be unused and in the
        condition they arrived in, with any packaging.
      </p>
      <p>
        Leather is a natural material. Grain, colour and markings vary from
        piece to piece and darken with use. That variation is a property of the
        material, not a fault, and product photographs are representative rather
        than exact.
      </p>

      <h2>Your account</h2>
      <p>
        You do not need an account to order. If you make one, keep your password
        to yourself and tell us if you think someone else has used it. We may
        suspend an account that is being used to abuse the shop or its staff.
      </p>

      <h2>Our content</h2>
      <p>
        The photographs, text, designs and branding on this site belong to{" "}
        {LEGAL_INFO.legalName}. Please do not copy or reuse them commercially
        without asking us first.
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
        {LEGAL_INFO.contactPhone} ·{" "}
        <a href={`mailto:${LEGAL_INFO.contactEmail}`}>
          {LEGAL_INFO.contactEmail}
        </a>{" "}
        · {LEGAL_INFO.address}
      </p>
    </LegalDocument>
  );
}
