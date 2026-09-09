import type { NextConfig } from "next";

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
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
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
