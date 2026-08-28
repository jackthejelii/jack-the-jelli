# SEO & production-polish checklist

Companion to `docs/CLIENT-HANDOVER.md`. That file covers getting the app
_running_ in production (env vars, auth callbacks, database firewall,
domain/DNS). This one covers
getting it _found_ — search, social previews, rich results, measurement — plus
the hardening a storefront taking real orders should have.

Priority markers: 🔴 do before/around launch · 🟡 do soon after · 🟢 nice to have.

---

## ✅ Already done

**Open Graph / social previews** — `app/layout.tsx` now sets `metadataBase` plus
an `openGraph` block pointing at `public/link-preview.jpg`. Before this, the
site emitted **zero** `og:` tags, so Facebook fell back to scraping the navbar
`logo.svg` and every shared link showed the bare wordmark.

Two things about that block worth not undoing:

- It deliberately sets **no** `openGraph.title`, `description`, or `url`.
  `openGraph` is inherited _wholesale_ by any page that doesn't declare its own,
  so filling those in would stamp the homepage's copy onto every shared product
  link. Left blank, Next fills `og:title`/`og:description` from each page's own
  `title`/`description` while the image still applies site-wide.
- There is **no** `twitter` block, because Next derives `twitter:*` from
  `openGraph` and auto-selects `summary_large_image` when an image is present.

> ⚠️ `public/link-preview.jpg` is currently **untracked**. It must be committed,
> or the production build has no image to serve and previews break.

> ⚠️ The file is 2001×2001 — square, not the 1.91:1 Facebook prefers. Messenger
> and WhatsApp render it as a large square card (fine); X centre-crops top and
> bottom. To fix, drop a 1200×630 version in under the same filename and update
> the `width`/`height` in `app/layout.tsx`.

**After every deploy that changes a title, description, or the image:** run the
URL through the
[Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) and
hit **Scrape Again**. Facebook caches previews indefinitely and will keep
serving the old card otherwise. LinkedIn has its own
[Post Inspector](https://www.linkedin.com/post-inspector/). WhatsApp caches
separately and is the most stubborn — append `?v=2` to force a fresh fetch when
testing.

---

## A. SEO plumbing — 🔴 currently missing entirely

### A1. `app/robots.ts`

Does not exist. Without it, every private route is crawlable.

Must disallow: `/admin`, `/account`, `/my-orders`, `/checkout`, `/claim`,
`/api`. Must reference the sitemap URL.

Note this is belt-and-braces, not access control — several of those routes
already set `robots: { index: false, follow: false }` in their page metadata,
and real enforcement lives in `lib/auth-guard.ts`. `robots.ts` just stops
crawlers wasting budget on pages they can never render.

### A2. `app/sitemap.ts`

Does not exist. Generate it from MongoDB:

- `/` and `/collection`
- every product with `status: "Published"` — **Draft and Archived must be
  excluded**, or Google indexes URLs that 404
- `/privacy`, `/terms`, `/track`

Use `getPublicProducts` from `features/products/lib/products` so the sitemap
can't drift from what the collection page actually shows. Set `lastModified`
from the document's `updatedAt`.

### A3. Google Search Console — 🔴

1. Verify the domain (a DNS TXT record is the durable option — it survives host
   changes).
2. Submit the sitemap.
3. Actually watch **Indexing → Pages** for the first few weeks. Submitting and
   never looking again is the usual failure mode; that report is where you find
   out Google is refusing your product pages, and why.

Do **Bing Webmaster Tools** as well — it imports directly from Search Console,
so it's a two-minute job for a second search engine plus the ChatGPT/Copilot
surfaces that lean on Bing's index.

### A4. Canonical URLs — 🔴

`/collection` accepts `q`, `category`, and `sort` search params, which means
every filter permutation is a distinct crawlable URL serving near-identical
content. This is the single most common duplicate-content bug on storefronts.

Fix either way:

- set `alternates: { canonical: "/collection" }` on filtered views, **or**
- set `robots: { index: false, follow: true }` whenever search params are
  present.

`metadataBase` is already configured, so canonicals can be written as relative
paths.

### A5. Title template — 🟢

Every page hand-writes the `"… | Jack The Jelli"` suffix. Setting
`title: { default: …, template: "%s | Jack The Jelli" }` in the root layout lets
pages just say `"The Collections"`. Cosmetic, but it stops the suffix drifting
as pages get added.

---

## B. Rich results — 🔴 the actual ecommerce differentiator

### B1. JSON-LD structured data

The codebase currently has **zero** structured data (`grep` for `schema.org`
returns nothing). This is what makes Google show price and "In stock" _inside_
the search result rather than just a blue link — the highest-leverage item on
this list for a product-led store.

Add:

| Schema                     | Where                      | Notes                                                                                                                |
| -------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `Product`                  | product pages              | `name`, `image`, `description`, `sku`, `brand`, and an `offers` object with `price`, `priceCurrency`, `availability` |
| `BreadcrumbList`           | product + collection pages | drives the breadcrumb trail in results                                                                               |
| `Organization` + `WebSite` | homepage                   | brand panel, sitelinks searchbox                                                                                     |

`models/Product.ts` already carries every field needed — `name`, `slug`, `sku`,
`price`, `description`, `stock`, `category`, `images`. Derive `availability`
from `stock > 0`.

**Do not add `aggregateRating` until you have genuine reviews.** Fabricated
review markup is a manual-action risk, and a manual action costs far more to
undo than the rich result was ever worth.

Validate with the
[Rich Results Test](https://search.google.com/test/rich-results).

### B2. Per-product OG images — 🟡

Right now every shared product link shows the brand card. In the product's
`generateMetadata` (`app/(storefront)/collection/[slug]/page.tsx`), set
`openGraph.images` from `product.thumbnail`.

No new assets needed — Cloudinary can do the crop as a URL transform:
`c_pad,b_white,w_1200,h_630`. That pads to 1.91:1 on white, which matches the
product photography spec in `CLAUDE.md` (seamless white background) rather than
fighting it.

For a store where people share individual wallets into Messenger and WhatsApp
chats, this is high-leverage and cheap.

### B3. Google Merchant Center — 🟡

Free Shopping listings. Requires a product feed plus **published shipping and
returns policies** (see D4). Needs a GTIN, or `brand` + `mpn` for products
without one.

---

## C. Measurement — 🟡

Without this you're optimising blind.

- **Vercel Analytics + Speed Insights** — two packages, near-zero config, gives
  real-user Core Web Vitals rather than lab numbers.
- **GA4 with proper ecommerce events** — `view_item`, `add_to_cart`,
  `begin_checkout`, `purchase`. Page views alone tell you nothing about where
  the funnel leaks.
- **Meta Pixel _and_ Conversions API** — if you're running Facebook ads (and
  links are already being shared into Messenger, so that's likely). Pixel-only
  attribution is badly degraded by iOS ATT; the server-side CAPI recovers a
  large share of it. The `purchase` event fires naturally at
  `/checkout/success`.

---

## D. Hardening & cleanup

### D1. 🔴 Cloudinary remote pattern is unrestricted

`next.config.ts` allows `hostname: "res.cloudinary.com"` with **no `pathname`
constraint**. Anyone can pipe any Cloudinary account's images through your Next
image optimizer and bill the transformations to you.

Add `pathname: "/<your-cloud-name>/**"`.

### D2. 🔴 Placeholder images still live on the homepage

Four `lh3.googleusercontent.com/aida-public/…` URLs are being served in
production at `w=3840`. These are AI-mockup placeholders — they will disappear
without warning, and they're hurting LCP right now.

Replace them with real Cloudinary assets, then drop the
`lh3.googleusercontent.com` entry from `next.config.ts` entirely.

### D3. 🟡 Security headers

Add via `headers()` in `next.config.ts`: HSTS, `X-Content-Type-Options: nosniff`,
`Referrer-Policy`, and a Content-Security-Policy. A store collecting delivery
addresses and phone numbers should have these, and they're flagged by the basic
security scanners a client might run.

### D4. 🔴 Missing commerce pages

`/privacy` and `/terms` exist. A real store also needs:

- **Returns / Refunds policy**
- **Shipping policy** (delivery windows, coverage, charges)
- **Contact** page with a real way to reach a human

Merchant Center requires these (B3), and their absence is a visible trust gap
right at the point of checkout. Follow the existing pattern —
`features/legal/components/LegalDocument` with content in
`features/legal/lib/legal-info.ts`.

### D5. 🟢 `app/manifest.ts`

Name, theme colour, icons. `app/icon.svg` and `app/apple-icon.png` already
exist. Improves Android add-to-homescreen and address-bar theming.

### D6. 🔴 Email deliverability DNS

Confirm **SPF, DKIM, and DMARC** are configured on `jackthejelli.com` for
Resend. Without them, order confirmations land in spam — which reads to the
customer as "my order didn't go through" and generates support load.
`docs/CLIENT-HANDOVER.md` covers verifying the sending domain; the DNS records
are the other half.

---

## Suggested order

1. **D1, D2, D6** — active liabilities (billing abuse, images that will vanish,
   mail landing in spam).
2. **A1, A2, A4** — the plumbing, so crawling starts from a correct picture.
3. **A3** — verify and submit, then let it index while you do the rest.
4. **B1, B2** — rich results and shareable product cards.
5. **D4** — unblocks B3.
6. **C, B3, D3, D5, A5** — growth and polish.
