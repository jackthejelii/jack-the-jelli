import type { NextConfig } from "next";

/**
 * The Cloudinary account whose images this app's optimizer is allowed to fetch.
 *
 * Read from the environment rather than written out as a literal, because the
 * cloud name changes: docs/CLIENT-HANDOVER.md stands the site up on the
 * client's own Cloudinary account, and a hardcoded name would survive that
 * move silently and then break every product photograph in production.
 *
 * Verified that this works: Next loads `.env*` before evaluating this file, so
 * the variable is populated here the same way it is in `lib/cloudinary.ts`.
 *
 * Throws rather than falling back. The two available fallbacks are both worse
 * than a failed build — `"/undefined/**"` breaks every image with a 400 that
 * points nowhere near the cause, and omitting `pathname` reopens exactly the
 * hole this exists to close. Loud and early matches how the rest of the build
 * already treats missing infrastructure (see getPrebuildableProductSlugs).
 */
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

if (!CLOUDINARY_CLOUD_NAME) {
  throw new Error(
    "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not set — next.config.ts needs it to " +
      "scope the image optimizer to your own Cloudinary account. See .env.example.",
  );
}

const nextConfig: NextConfig = {
  cacheComponents: true,

  images: {
    // AVIF first, WebP as the fallback. Next only ships one format per request
    // — it picks the first entry the browser's Accept header allows — so the
    // order is the preference order, and a browser without AVIF support still
    // gets WebP rather than the original. AVIF typically lands 20-30% under
    // WebP at matched quality, which on an image-led storefront is the single
    // largest byte saving available. It costs more CPU to encode, but only on
    // the first request for a given size; every later hit is a cache read.
    formats: ["image/avif", "image/webp"],
    /**
     * Every entry is scoped by `pathname` and `search`, not just by hostname.
     *
     * Next's own docs are blunt about why: an omitted `pathname` means an
     * implied `**`, and a hostname-only rule on a shared CDN lets anyone point
     * `/_next/image?url=…` at *any* account on that host. The transformations
     * are then computed and billed on this project. `res.cloudinary.com` hosts
     * every Cloudinary customer, so "trust the hostname" is not a constraint at
     * all — it is an open proxy with an invoice attached.
     *
     * `search: ""` blocks query strings outright. No URL this app stores has
     * one (a Cloudinary `secure_url` is all path), and leaving it open is the
     * other half of the same hole — the docs call out that an unconstrained
     * `search` lets a URL be varied endlessly to defeat the optimizer's cache.
     * If a cache-buster is ever genuinely needed, it will fail loudly with a
     * 400 rather than quietly costing money.
     *
     * Note this governs the *optimizer* only. The link-preview cards in
     * features/seo/lib/social-card.ts are absolute URLs in meta tags that
     * social scrapers fetch directly from Cloudinary, so they never pass
     * through here.
     */
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        // The AI-mockup placeholders in ProductSection.tsx, and nothing else.
        // Google avatars don't need an entry — UserMenu renders them through a
        // plain <img>, not next/image, so they bypass the optimizer entirely.
        //
        // This whole entry goes away with SEO-CHECKLIST.md D2, which replaces
        // those placeholders with real Cloudinary assets. Scoped rather than
        // left open in the meantime: same billing hole, same one-line fix.
        pathname: "/aida-public/**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: `/${CLOUDINARY_CLOUD_NAME}/**`,
        search: "",
      },
    ],
  },

  experimental: {
    // `radix-ui` is the unified package (see components/ui/*), and unlike
    // `lucide-react` it is NOT in Next's built-in optimize list — verified
    // against node_modules/next/dist/server/config.js, which names
    // lucide-react and never mentions radix-ui. Without this, a barrel import
    // like `import { Dialog } from "radix-ui"` can pull sibling primitives
    // that are never rendered into the client bundle.
    //
    // lucide-react is deliberately absent here: it is already covered by the
    // default list, and restating it would imply the default doesn't apply.
    optimizePackageImports: ["radix-ui"],
  },

  /**
   * Security headers. Deliberately no Content-Security-Policy: this app loads
   * images from Cloudinary and Google's avatar CDN and runs Google OAuth, so a
   * CSP written without measuring the real request set would break sign-in
   * rather than harden it. That is worth doing, but as its own change with a
   * report-only rollout — not smuggled in behind a performance pass.
   */
  async headers() {
    return [
      {
        /**
         * The hero clip and its poster. Next only applies its own
         * `immutable` caching to the SHA-named files under `_next/static`;
         * anything served straight out of `public/` gets revalidated on every
         * visit unless told otherwise, which for a ~500 KB video on the
         * landing page is a round trip nobody needs.
         *
         * Safe because the filenames carry a version (`hero-landscape-v1…`):
         * re-encoding means bumping to `-v2` in scripts/encode-hero.mjs and
         * in HeroVideo.tsx, which changes the URL rather than the bytes
         * behind it. Never overwrite one of these files in place.
         */
        source: "/media/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            // Lets the browser resolve DNS for Cloudinary et al. while it is
            // still parsing, instead of waiting until it hits the tag.
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            // Two years, subdomains included. `preload` is omitted on purpose:
            // submitting to the HSTS preload list is close to irreversible and
            // is the site owner's decision, not a config default.
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            // Sends the full URL to our own origin and the bare origin
            // cross-site, so outbound links can't leak an order number or a
            // search query in the Referer.
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
