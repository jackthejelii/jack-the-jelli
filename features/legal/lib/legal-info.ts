// The handful of real-world facts both legal pages quote, in one place so the
// two can never disagree about who the customer is contracting with.
//
// ⚠️ EVERY VALUE MARKED `TODO` IS A PLACEHOLDER. They are not legal advice and
// not verified — the business owner must replace them, and should have the
// finished pages read by someone qualified before the store takes real orders.

export const LEGAL_INFO = {
  /** Trading name, as customers know it. */
  brand: "Jack The Jelli",
  /** TODO: the registered/legal entity name, if it differs from the brand. */
  legalName: "Jack The Jelli",
  /** TODO: the business address customers can write to. */
  address: "Dhaka, Bangladesh",
  /** TODO: a monitored inbox. Nothing receives mail on the domain yet. */
  contactEmail: "jackthejelli@gmail.com",
  /** TODO: the number already used to confirm orders by phone. */
  contactPhone: "01641857905",
  /** TODO: confirm the handle. Stored without the `@`, which the UI adds. */
  instagram: "jackthejelli",
  /**
   * TODO: confirm with the business before launch. Quoted by both pages, so
   * changing it here changes it in both.
   */
  returnWindowDays: 7,
} as const;

/**
 * Rendered under each title. Bump by hand when the wording materially changes —
 * a build-time `new Date()` would silently re-date the documents on every
 * deploy, which is the opposite of what an effective date is for.
 */
export const LEGAL_LAST_UPDATED = "21 August 2026";
