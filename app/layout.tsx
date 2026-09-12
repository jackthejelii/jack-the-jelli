import type { Metadata } from "next";
import { EB_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import RouteProgress from "@/components/layout/RouteProgress";
import SmoothScroll from "@/components/layout/SmoothScroll";
import { Toaster } from "@/components/ui/sonner";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const garamond = EB_Garamond({
  variable: "--font-garamond",
  subsets: ["latin"],
  weight: "400",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  // Lets `openGraph.images` (and any `alternates.canonical` added per page)
  // be written as a relative path — Next resolves them against this origin.
  metadataBase: new URL(SITE_URL),
  title: {
    // What `/` and any page that declares no title of its own renders.
    default: "Jack The Jelli | They’re jelly of the gear",
    // Every child page now supplies only its own name — "The Collections",
    // "Contact", a product's name — and the brand is appended here. Pages used
    // to hand-write the suffix, which worked until one of them forgot to.
    // `absolute` is still available to any page that needs to opt out.
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Handmade faux leather wallets built for daily carry and the occasional second look. Pull one out and watch the table go quietly jelly.",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    // Deliberately no `title`/`description`/`url` here. `openGraph` is
    // inherited wholesale by any page that doesn't declare its own, so setting
    // them would stamp the homepage's copy onto every shared product link.
    // Left blank, Next fills og:title/og:description from each page's own
    // `title`/`description`, and the image below still applies everywhere.
    images: [
      {
        // public/link-preview.jpg is 2001x2001 — square, not the 1.91:1
        // Facebook prefers, so it renders as a large square card and X
        // centre-crops it. Swap the file (same name) to change that.
        url: "/link-preview.jpg",
        width: 2001,
        height: 2001,
        alt: "Jack The Jelli",
      },
    ],
  },
  // No `twitter` block: Next derives twitter:title/description/image from
  // `openGraph` and picks `summary_large_image` whenever an image is present.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  /* No height on <html> — deliberately. Lenis (SmoothScroll below) tracks
   page height with a ResizeObserver on document.documentElement, and a
   ResizeObserver watches the *content box*: `height: 100%` pins that box
   to the viewport, so it never fires as content loads and Lenis is left
   clamping every wheel event against the height the page had at
   hydration. The page then hard-stops mid-scroll with no native fallback,
   because Lenis preventDefault()s the wheel before it clamps. Lenis ships
   `html.lenis, html.lenis body { height: auto }` in lenis.css for exactly
   this reason (imported in app/globals.css); leaving it off here means the
   two agree instead of overriding each other. Hence min-h-dvh on <body>
   rather than min-h-full: a percentage min-height needs a sized parent,
   and <html> no longer is one. */
  return (
    <html lang="en" className={`${garamond.variable} ${inter.variable}`}>
      <body className="text-primary m-0 flex min-h-dvh flex-col font-(--font-inter) antialiased">
        {/* Storefront chrome (nav + footer) lives in app/(storefront)/layout.tsx
            so /admin opts out by route rather than by a pathname check. */}
        {children}
        {/* Mounted at the root, above every route group, so one bar serves the
            storefront, the auth pages and /admin alike. */}
        <RouteProgress />
        {/* Lenis smooth scroll. Renders nothing and binds to the window, so it
            covers every route group. It runs at every OS motion setting — the
            reduced-motion opt-out was removed with the rest of the project's
            reduced-motion handling (see the note in app/globals.css). */}
        <SmoothScroll />
        <Toaster />
        {/* Real-user Core Web Vitals. Renders nothing and loads its script
            after hydration, so it costs no paint time — and it reports what
            actual shoppers on actual Bangladeshi networks experience, which
            is the only measurement that settles whether a change helped.
            Inert outside Vercel, so local dev and any other host ignore it. */}
        <SpeedInsights />
        {/* Page views and referrers, enabled on the Vercel project on
            11 September 2026. Cookieless and it stores no personal data, which
            is what lets the privacy policy keep its short processor list — if
            that ever changes, the policy changes with it. Same deal as
            SpeedInsights: no paint cost, inert off Vercel. */}
        <Analytics />
      </body>
    </html>
  );
}
