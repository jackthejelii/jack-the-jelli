import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import LegalDocument from "@/features/legal/components/LegalDocument";
import { LEGAL_INFO } from "@/features/legal/lib/legal-info";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What Jack The Jelli collects when you shop, why we hold it, who processes it, and how to ask for a copy or its deletion.",
  alternates: { canonical: "/privacy" },
};

/**
 * Required before Google will publish the OAuth consent screen, but written to
 * describe what the app genuinely does — the checkout fields in
 * models/Order.ts, the Better Auth collections, and the four processors the
 * env vars name. Keep it in step with the code: if a new field or a new
 * third-party service appears, it belongs here too.
 */
export default async function PrivacyPolicyPage() {
  // Contact details are shop settings now — the owner can change the published
  // address or number from /admin/settings without a deploy. `legalName` stays
  // on LEGAL_INFO: the legal entity a customer contracts with is not something
  // an admin form should be able to rewrite.
  const { contactEmail, contactPhone, address } = await getSettings();

  return (
    <LegalDocument
      title="Privacy Policy"
      intro="What we collect when you shop with us, why we hold it, and how to ask for it back."
    >
      <h2>Who we are</h2>
      <p>
        {LEGAL_INFO.legalName} sells faux leather goods at jackthejelli.com and
        decides how the information described below is used. We respect your
        privacy and are committed to protecting the personal information you
        share with us. You can reach us at{" "}
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a> or {contactPhone},
        or write to us at {address}.
      </p>

      <h2>What we collect</h2>

      <h3>When you place an order</h3>
      <p>
        Checkout does not require an account. To deliver an order and confirm it
        by phone we ask for your full name, phone number, delivery address
        (division, district, upazila or thana, and street) and any delivery
        notes you choose to add. An email address is optional, and we use it
        only to send your order confirmation.
      </p>
      <p>
        We also store the order itself: the items, quantities, prices at the
        time of purchase, delivery fee, total, and the record of how the order
        moved from placed to delivered.
      </p>

      <h3>When you create an account</h3>
      <p>
        An account stores your name, your email address, and (if you register
        with a password) a cryptographic hash of that password. We never store
        the password itself. If you sign in with Google instead, Google tells us
        your name, email address and profile picture; we request nothing more,
        and we never gain access to your Gmail, contacts or Drive.
      </p>
      <p>
        We ask you to verify your email address before you can sign in, so that
        an account cannot be created in your name against an address you do not
        control.
      </p>

      <h3>While you browse</h3>
      <p>
        Your basket is kept in your own browser&rsquo;s storage. If you are
        signed in it is also saved to your account, so it follows you between
        devices. Signing in or out clears the basket held on that device.
      </p>
      <p>
        We set one cookie: the session cookie that keeps you signed in. It is
        not used for advertising, and we run no advertising pixels and no
        third-party advertising trackers of any kind.
      </p>
      <p>
        We do measure how the site itself performs, through Vercel&rsquo;s Speed
        Insights and Web Analytics. These record things like which page was
        loaded, how quickly it rendered, the referring site, and a coarse
        country-level location. They set no cookies, do not follow you to other
        websites, and are not used to build a profile of you — we use them to
        find slow and broken pages, nothing else.
      </p>

      <h2>How we use it</h2>
      <p>Your information is used to do these things and nothing else:</p>
      <ul>
        <li>process your order and confirm it with you by phone;</li>
        <li>arrange delivery, and let the courier reach you;</li>
        <li>send your order confirmation and any message about that order;</li>
        <li>answer you when you contact us for support;</li>
        <li>keep the records a business is expected to keep.</li>
      </ul>
      <p>
        We do not use it for advertising, and we do not build a profile of you.
      </p>

      <h2>Payment</h2>
      <p>
        <strong>
          We take cash on delivery only, so we never ask for and never hold card
          numbers, bank details or mobile-wallet credentials.
        </strong>{" "}
        Payment is handled in person, by the courier, at your door — there is no
        payment gateway on this website and no card data for anyone, us
        included, to store.
      </p>

      <h2>Who else processes it</h2>
      <p>
        We keep the list of third parties deliberately short. Each one processes
        data on our instructions, for the purpose named:
      </p>
      <ul>
        <li>
          <strong>Vercel</strong>: hosts the website, keeps standard server
          logs, and provides the performance measurement described above.
        </li>
        <li>
          <strong>MongoDB Atlas</strong>: stores orders, accounts and baskets.
        </li>
        <li>
          <strong>Resend</strong>: sends order confirmations, email verification
          and password-reset messages.
        </li>
        <li>
          <strong>Google</strong>: only if you choose to sign in with Google.
        </li>
        <li>
          <strong>Cloudinary</strong>: serves our product photographs. It
          receives no customer information.
        </li>
        <li>
          <strong>Our delivery courier</strong>: receives your name, phone
          number and address, because it cannot deliver without them.
        </li>
      </ul>
      <p>
        We do not sell, rent or trade your personal information, and we do not
        share it for anyone else&rsquo;s marketing.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Order records are kept as business and accounting records. Account
        details are kept until you ask us to delete the account. If an account
        is deleted, its past orders remain as records of a sale but are no
        longer linked to a person.
      </p>

      <h2>Your choices</h2>
      <p>
        Write to us at <a href={`mailto:${contactEmail}`}>{contactEmail}</a> to
        ask for a copy of what we hold about you, to correct something that is
        wrong, or to have your account deleted. We will ask a question or two to
        confirm the request comes from you.
      </p>
      <p>
        You can see your own orders at any time from your account, or look up a
        single order at <a href="/track">jackthejelli.com/track</a> using its
        order number and the phone number it was placed with.
      </p>

      <h2>How we protect it</h2>
      <p>
        The site is served over HTTPS, passwords are stored only as hashes, and
        access to the admin dashboard is restricted to named accounts. No system
        is perfect, and we will tell affected customers promptly if something
        goes wrong.
      </p>

      <h2>Children</h2>
      <p>
        This shop is intended for adults. We do not knowingly collect
        information from children under 18.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes we will update the date at the top of this page.
        Material changes will be explained here rather than made quietly.
      </p>
    </LegalDocument>
  );
}
