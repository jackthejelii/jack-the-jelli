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
   * TODO: replace with a monitored inbox on the domain (support@jackthejelli.com).
   * Nothing receives mail on the domain yet, and a free webmail address on a
   * commerce site is a trust signal working against us — see the Search Console
   * "Deceptive pages" flag.
   *
   * ⚠️ Spelling is unconfirmed: the brand Google account is `jackthejelii@`
   * (…jel-i-i) while this reads `jackthejelli@` (…jel-l-i). One of the two does
   * not exist. Do not quote this address anywhere new until that is settled.
   */
  contactEmail: "jackthejelli@gmail.com",
  /** Confirmed: the number already used to confirm orders by phone. */
  contactPhone: "01641857905",
  /** TODO: confirm the handle. Stored without the `@`, which the UI adds. */
  instagram: "jackthejelli",
  /**
   * Confirmed: 7 days from delivery. Quoted by the returns page, the terms and
   * the contact FAQ, so changing it here changes it everywhere.
   */
  returnWindowDays: 7,
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
