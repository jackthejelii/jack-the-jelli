// The handful of real-world facts the legal pages quote, in one place so they
// can never disagree about who the customer is contracting with.
//
// Confirmed by the business owner on 12 September 2026, except where a value
// still carries a `TODO`. These are not legal advice: the finished pages should
// be read by someone qualified.

export const LEGAL_INFO = {
  /** Trading name, as customers know it. */
  brand: "Jack The Jelli",
  /** Confirmed: no separate registered entity — the trading name is the name. */
  legalName: "Jack The Jelli",
  /** Confirmed: the business address customers can write to. */
  address: "Shekhertek 9, Mohammadpur, Dhaka 1207, Bangladesh",
  /**
   * The address customers are shown. It receives: the root `@` MX points at
   * Resend's inbound endpoint, and `app/api/email/inbound` forwards each
   * message to the owner's real inbox (`SUPPORT_FORWARD_TO`).
   *
   * Keep this and the `SUPPORT_EMAIL` env var naming the same mailbox — this
   * constant is what the legal pages and the Organization JSON-LD publish,
   * that env var is where the contact form delivers and where Reply-To points.
   *
   * It replaced a Gmail address deliberately: a free webmail address on a shop
   * that takes money at the door is a trust signal working against us, and one
   * of the things the Search Console "Deceptive pages" review looks at.
   */
  contactEmail: "support@jackthejelli.com",
  /** Confirmed: the number already used to confirm orders by phone. */
  contactPhone: "01641857905",
  /** TODO: confirm the handle. Stored without the `@`, which the UI adds. */
  instagram: "jackthejelli",
  // There is deliberately no `returnWindowDays` here any more. The shop's
  // policy is that sales are final once an order has been delivered and paid
  // for, and the remedy is refusal at the door before payment — see /returns,
  // /terms and /shipping, which must always agree with each other.
  /** Confirmed: the courier window quoted at checkout and in the FAQ. */
  deliveryDaysMin: 5,
  /** Confirmed: the upper end of that same window. */
  deliveryDaysMax: 7,
} as const;

/**
 * Rendered under each title. Bump by hand when the wording materially changes —
 * a build-time `new Date()` would silently re-date the documents on every
 * deploy, which is the opposite of what an effective date is for.
 */
export const LEGAL_LAST_UPDATED = "12 September 2026";
