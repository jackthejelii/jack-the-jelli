import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/**
 * Served at /robots.txt.
 *
 * Belt-and-braces, not access control. Real enforcement lives in
 * `lib/auth-guard.ts`, and several of these routes already set
 * `robots: { index: false, follow: false }` in their own metadata — but a
 * crawler has to fetch a page to read that meta tag, and these are pages it can
 * never usefully render. This stops it spending crawl budget finding that out
 * one redirect at a time.
 *
 * Worth knowing about the overlap: a crawler that obeys a `Disallow` never
 * fetches the page, so it never reads that page's `noindex` either. The two are
 * not additive. The meta tags stay because they are the half that keeps working
 * if this file is ever removed or misedited, and because a disallowed URL can
 * still be listed (URL only, no snippet) when something links to it — which is
 * the one thing `noindex` prevents and `Disallow` does not.
 *
 * Nothing here is secret: robots.txt is public, so it names route prefixes and
 * nothing more specific. Never list a path whose existence is itself sensitive.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        // Back office. Cookie-gated in proxy.ts, role-gated in auth-guard.ts.
        "/admin",
        // Signed-in, per-customer, and different for every visitor.
        "/account",
        "/my-orders",
        // A cart is session state; there is nothing here to index.
        "/checkout",
        // Route handler, not a page — it consumes a claim token and redirects.
        "/claim",
        // Auth screens: thin, duplicated across the funnel, and worthless in a
        // result page. A shopper reaches them from the nav, never from Google.
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/verify-email",
        // Better Auth and the Cloudinary signer. JSON, and POST at that.
        "/api",
      ],
    },
    // Absolute by spec — a relative sitemap line is ignored by every crawler.
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
