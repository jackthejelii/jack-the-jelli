/**
 * The handful of facts every SEO surface needs to agree on: `metadataBase` in
 * the root layout, `app/robots.ts`, `app/sitemap.ts` and the JSON-LD builders
 * in `features/seo`.
 *
 * Deliberately a hardcoded origin rather than an env var or Vercel's
 * `VERCEL_URL`. Canonical tags, sitemap entries and `@id` values must all point
 * at the one address the site is meant to be found at — if a preview deployment
 * derived them from its own hostname, every preview would advertise itself as a
 * separate, indexable copy of the store. Pointing them at production instead is
 * the failure mode you want: a stray preview canonicalises to the real page.
 */
export const SITE_URL = "https://jackthejelli.com";

/** The brand as customers know it — see LEGAL_INFO for the legal entity. */
export const SITE_NAME = "Jack The Jelli";

/**
 * Absolute URL for a site-relative path. Next resolves relative paths in
 * `metadata` against `metadataBase` on its own, so this is for the places that
 * get no such treatment: robots, the sitemap and JSON-LD, where schema.org
 * requires fully-qualified URLs.
 */
export function absoluteUrl(path: string): string {
  const url = new URL(path, SITE_URL).toString();

  // `new URL("/", origin)` gives back a trailing slash; the `<link rel=canonical>`
  // Next writes for the homepage does not. The two forms are the same URL by
  // RFC 3986 and Google says so explicitly — but the sitemap, the breadcrumb
  // trail and the canonical all describe the same page, and a report that lists
  // them as two entries is a minute wasted every time someone reads it.
  return url === `${SITE_URL}/` ? SITE_URL : url;
}
