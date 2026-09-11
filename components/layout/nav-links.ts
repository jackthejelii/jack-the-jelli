/**
 * The storefront's primary destinations, in one directive-free module so the
 * server-rendered desktop bar and the client-rendered mobile drawer can never
 * drift apart.
 *
 * Only the primary three. The two surfaces that render navigation do not want
 * the same list, so neither one filters: the desktop bar takes this array as
 * it stands, and the mobile drawer appends `LEGAL_LINKS` to it. Putting the
 * legal pair in here instead would leak them into the desktop bar, and slicing
 * them back off there would hide the intent behind an index that breaks the
 * day a fourth destination is added.
 */
export const NAV_LINKS = [
  { label: "Collection", href: "/collection" },
  { label: "Track Order", href: "/track" },
  { label: "Contact", href: "/contact" },
] as const;

/**
 * The footnote links, rendered by the footer on every screen and appended to
 * the mobile drawer's list. On a phone the footer is several screens of
 * scrolling away, and the drawer is the only navigation surface that is one
 * tap from anywhere.
 */
export const LEGAL_LINKS = [
  { label: "Shipping", href: "/shipping" },
  { label: "Returns", href: "/returns" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
] as const;
