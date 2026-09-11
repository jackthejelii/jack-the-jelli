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

> ✅ `public/link-preview.jpg` is now tracked — `git ls-files` finds it, so the
> production build has an image to serve.

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

## A. SEO plumbing

### A1. `app/robots.ts` — ✅ done

Disallows `/admin`, `/account`, `/my-orders`, `/checkout`, `/claim`, `/api` and
the five auth screens, and names the sitemap absolutely.

Belt-and-braces, not access control — real enforcement lives in
`lib/auth-guard.ts`. One interaction worth remembering, written into the file
itself: a crawler that obeys `Disallow` never fetches the page and so never
reads that page's `noindex`. The two are not additive, and the meta tags are
what keeps working if this file is ever removed.

### A2. `app/sitemap.ts` — ✅ done

Generated from MongoDB via `getSitemapProducts` (`features/products/lib/products`),
which filters `status: "Published"` so Draft and Archived slugs — which 404 on
the storefront — can never be advertised. `lastModified` comes from each
document's real `updatedAt`, not from `new Date()`.

Lists `/`, `/collection`, every published product, then `/track`, `/contact`,
`/privacy`, `/terms`.

The query is `use cache` + `cacheLife("days")`, tagged `CATALOGUE_TAG` and
invalidated by all five admin product actions — so publishing a piece puts it in
the sitemap immediately rather than a day later, and a crawler hit doesn't cost
a round trip to Atlas.

### A3. Google Search Console — 🔴 **you have to do this one by hand**

1. Verify the domain (a DNS TXT record is the durable option — it survives host
   changes).
2. Submit the sitemap.
3. Actually watch **Indexing → Pages** for the first few weeks. Submitting and
   never looking again is the usual failure mode; that report is where you find
   out Google is refusing your product pages, and why.

Do **Bing Webmaster Tools** as well — it imports directly from Search Console,
so it's a two-minute job for a second search engine plus the ChatGPT/Copilot
surfaces that lean on Bing's index.

### A4. Canonical URLs — ✅ done

`/collection` took `q`, `category` and `sort`, so every filter permutation was a
distinct crawlable URL serving a subset of the same grid —
`?sort=price-asc&category=wallets` and `?category=wallets&sort=price-asc`
included, which are the same page twice. Its `metadata` constant is now a
`generateMetadata` that sets `alternates: { canonical: "/collection" }` on every
view, filtered or not.

Deliberately **not** combined with `robots: { index: false }` on filtered views.
A canonical and a noindex on the same page are contradictory instructions — one
says "drop this", the other "credit that" — and Google's own guidance is to pick
one. The canonical is the one that keeps the links. Filtered views stay
crawlable, so a product reachable only behind a category filter is still
reachable.

Canonicals also added to `/`, `/collection/[slug]`, `/track` (which takes
`?order=…` from confirmation emails), `/contact`, `/privacy` and `/terms`.
Written relative, resolved against the already-configured `metadataBase`.

`/account` picked up the `robots: { index: false, follow: false }` it was the
only signed-in page missing.

### A5. Title template — ✅ done

The root layout now sets
`title: { default: …, template: "%s | Jack The Jelli" }`, and all fourteen pages
that hand-wrote the suffix had it stripped. `app/global-error.tsx` keeps its
full `<title>` — it replaces the root layout, so no template reaches it.

---

## B. Rich results

### B1. JSON-LD structured data — ✅ done

Built in `features/seo/lib/structured-data.ts`, emitted by
`features/seo/components/JsonLd.tsx`.

| Schema                     | Where                   | Notes                                                                        |
| -------------------------- | ----------------------- | ---------------------------------------------------------------------------- |
| `Product`                  | `/collection/[slug]`    | one `Offer` per colourway, each with its own `sku` and real `availability`   |
| `BreadcrumbList`           | product + `/collection` | `/ → The Collections → <piece>`, matching the links the page actually offers |
| `Organization` + `WebSite` | `/`                     | brand panel + `sameAs` to Instagram; `SearchAction` over `/collection?q=`    |

One `Product` with an `Offer` per colourway, not one `Product` per colourway:
there is a single URL and a single price per piece, and the SKU and the "can I
buy this today" are exactly what an `Offer` carries. Google reads multiple
offers as a price range, which for identical prices renders as the price. The
`Organization` and `WebSite` nodes carry stable `@id`s that the offers'
`seller` references, so the pages read as one site.

Rendered from the server component, not from `ProductDetailView` — it has to be
in the prerendered HTML for a crawler that runs no JavaScript.

**No `aggregateRating`**, per the original note, and the rule is written into
the module so it survives the next person who reads it.

Two recommended properties are knowingly absent, and both surface as _warnings_
(not errors) in the Rich Results Test:

- `priceValidUntil` — nothing expires these prices, and a date invented to
  silence a warning is markup asserting a decision the business hasn't made.
- `hasMerchantReturnPolicy` / `shippingDetails` — **worth adding, blocked on
  D4.** Declaring a 7-day window and a delivery charge in markup before the
  site states them on a page a customer can read is the wrong order.

Validate with the
[Rich Results Test](https://search.google.com/test/rich-results) once deployed —
it needs a public URL.

### B2. Per-product OG images — ✅ done

`features/seo/lib/social-card.ts` rewrites a stored Cloudinary URL into
`c_pad,b_white,w_1200,h_630,f_jpg,q_auto`, and the product's `generateMetadata`
sets it as `openGraph.images`. Verified end to end: the transformed URL returns
`200 image/jpeg` at ~22 KB, comfortably under the few-hundred-KB ceiling above
which WhatsApp silently drops a preview.

**This is a delivery-time transform, not an upload-time one.** The stored bytes
are untouched, which is what `CLAUDE.md`'s rule is about. `c_pad` rather than
`c_fill` for the same reason `ProductCard` uses `object-contain` — a 1:1 shot
cropped to 1.91:1 loses the top and bottom of the wallet.

Two traps handled, worth not undoing:

- `openGraph` is **replaced** wholesale by the last segment that declares it,
  never merged. A piece with no usable photograph therefore omits the key
  entirely rather than declaring an empty one, which would have deleted the
  root layout's brand card instead of falling back to it.
- `f_jpg`, not `f_auto`. Scrapers are not browsers; several send no usable
  `Accept` header and simply fail on AVIF or WebP, which reads as a link with
  no image at all.

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

### D1. ✅ done — remote patterns are now scoped

`next.config.ts` allowed `hostname: "res.cloudinary.com"` with no `pathname`
constraint, and `res.cloudinary.com` hosts every Cloudinary customer — so the
rule was not a constraint at all. Anyone could point `/_next/image?url=…` at any
account on that host and have the transformations computed and billed here.

Both entries are now scoped by `pathname` **and** `search`:

- `res.cloudinary.com` → `/${NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/**`
- `lh3.googleusercontent.com` → `/aida-public/**` (see D2)

The cloud name is read from the environment rather than written out as a
literal, because `docs/CLIENT-HANDOVER.md` moves the site to the client's own
Cloudinary account — a hardcoded name would survive that move silently and then
break every product photograph. Verified that Next loads `.env*` before
evaluating `next.config.ts`, so the variable is populated there. It **throws**
if unset: `"/undefined/**"` would break every image with a 400 pointing nowhere
near the cause, and omitting `pathname` would reopen the hole.

`search: ""` blocks query strings. No stored Cloudinary URL has one, and an
unconstrained `search` lets a URL be varied endlessly to defeat the optimizer's
cache — the same billing problem by another route.

Verified against a production server:

| request                                                     | result                |
| ----------------------------------------------------------- | --------------------- |
| own account's image                                         | 200                   |
| `res.cloudinary.com/demo/…` (other account)                 | **400** — hole closed |
| own image with `?v=2` appended                              | **400**               |
| `lh3.googleusercontent.com/aida-public/…`                   | 200                   |
| any other `lh3.googleusercontent.com` path                  | **400**               |
| every optimized image on `/`, `/collection`, a product page | 200, 0 failures       |

Google OAuth avatars need no entry — `UserMenu` renders them through a plain
`<img>`, not `next/image`, so they never touch the optimizer.

### D2. 🔴 Placeholder images still live on the homepage

Four `lh3.googleusercontent.com/aida-public/…` URLs are being served in
production at `w=3840`. These are AI-mockup placeholders — they will disappear
without warning, and they're hurting LCP right now.

Replace them with real Cloudinary assets, then drop the
`lh3.googleusercontent.com` entry from `next.config.ts` entirely. D1 scoped that
entry to `/aida-public/**` in the meantime; deleting it outright is still the
endpoint.

### D3. 🟡 Security headers — mostly done

`headers()` in `next.config.ts` now sets HSTS (two years, subdomains, no
`preload`), `X-Content-Type-Options: nosniff`, `X-Frame-Options`,
`Referrer-Policy` and `X-DNS-Prefetch-Control`.

Still outstanding: **Content-Security-Policy**. Deliberately not written blind —
this app loads images from Cloudinary and Google's avatar CDN and runs Google
OAuth, so a policy written without measuring the real request set breaks sign-in
rather than hardening anything. Do it as its own change with a report-only
rollout first.

### D4. 🔴 Missing commerce pages

`/privacy`, `/terms` and `/contact` exist — `/contact` shipped since this list
was written, with a form, the FAQ and a real phone number.

Still missing:

- **Returns / Refunds policy**
- **Shipping policy** (delivery windows, coverage, charges)

Merchant Center requires these (B3), they are a visible trust gap right at the
point of checkout, and they are what unblocks the `hasMerchantReturnPolicy` and
`shippingDetails` left out of the product markup in B1. Follow the existing
pattern — `features/legal/components/LegalDocument` with content in
`features/legal/lib/legal-info.ts`.

⚠️ Confirm the numbers first. `LEGAL_INFO.returnWindowDays` is still marked
`TODO`, and a returns window is not something to guess at in markup Google
reads.

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

**Done:** A1, A2, A4, A5, B1, B2 — the whole code half of the SEO work — plus
D1. All verified against a production build; none of the search-facing half can
be checked against Google until the site is deployed.

**Next, in this order:**

1. **D2, D6** — the remaining active liabilities, and neither is SEO work anyone
   can do from inside the app's metadata. Homepage images that will vanish
   without warning, and order confirmations landing in spam. (**D1** is done.)
2. **A3** — verify in Search Console and submit `/sitemap.xml`. This cannot
   happen before the first production deploy, and everything above is waiting on
   it to show whether it worked. Run the product URL through the
   [Rich Results Test](https://search.google.com/test/rich-results) and a shared
   link through the
   [Sharing Debugger](https://developers.facebook.com/tools/debug/) at the same
   time — those are the checks B1 and B2 are still owed.
3. **D4** — unblocks B3, and unblocks the two `Offer` properties B1 left out.
4. **C, B3, D3's CSP, D5** — measurement, then growth and polish.
