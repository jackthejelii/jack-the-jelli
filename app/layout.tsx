import type { Metadata } from "next";
import { EB_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";
import RouteProgress from "@/components/layout/RouteProgress";
import { Toaster } from "@/components/ui/sonner";

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

const SITE_URL = "https://jackthejelli.com";

export const metadata: Metadata = {
  // Lets `openGraph.images` (and any `alternates.canonical` added per page)
  // be written as a relative path — Next resolves them against this origin.
  metadataBase: new URL(SITE_URL),
  title: "Jack The Jelli | They’re jelly of the gear",
  description:
    "Handmade leather wallets built for daily carry and the occasional second look. Pull one out and watch the table go quietly jelly.",
  openGraph: {
    type: "website",
    siteName: "Jack The Jelli",
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
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${garamond.variable} ${inter.variable} h-full scroll-smooth`}
    >
      <body className="text-primary m-0 flex min-h-full flex-col font-(--font-inter) antialiased">
        {/* Storefront chrome (nav + footer) lives in app/(storefront)/layout.tsx
            so /admin opts out by route rather than by a pathname check. */}
        {children}
        {/* Mounted at the root, above every route group, so one bar serves the
            storefront, the auth pages and /admin alike. */}
        <RouteProgress />
        <Toaster />
        {/* Real-user Core Web Vitals. Renders nothing and loads its script
            after hydration, so it costs no paint time — and it reports what
            actual shoppers on actual Bangladeshi networks experience, which
            is the only measurement that settles whether a change helped.
            Inert outside Vercel, so local dev and any other host ignore it. */}
        <SpeedInsights />
      </body>
    </html>
  );
}
