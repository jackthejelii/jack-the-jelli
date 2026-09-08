# Next tweaks

What still needs doing, in rough priority order. **This file lists _what_ and
_why_ — not how.** Decide the approach when you pick the item up.

Companion files: `SEO-CHECKLIST.md` (search, social, measurement — not repeated
here) and `docs/CLIENT-HANDOVER.md` (accounts, domain, DNS).

---

## Priority

### 1. A real contact feature

There is no way for a customer to reach the shop. The email and phone number
exist only as inline text buried inside `/privacy` and `/terms` — no contact
page, no form, no link in the footer, no social handles anywhere on the site.
For a cash-on-delivery storefront where the confirmation call is part of the
flow, "how do I ask a question before I order" currently has no answer.

### 2. Make the homepage live, not static

`features/homepage/components/ProductSection.tsx` is a `"use client"` component
with **hardcoded products and hardcoded image URLs**. It never touches the
database, so nothing an admin publishes, renames, reprices, or takes out of
stock ever shows up on the front page. The homepage is currently a picture of a
store rather than the store.

### ~~3. Decide what follows the product section~~ — done

`CraftsmanshipGrid` — the "Uncompromising Quality" bento of three static image
tiles — was removed and replaced by the featured strip below.

### ~~4. A product needs to come in more than one colour~~ — done

Settled as **a variant inside one product**, not a sibling product per colour:
one name, one price, one page, a swatch row that swaps the gallery.

`sku`, `stock` and `images` left `Product` entirely and moved onto a required
`variants[]` (min 1), so a single-colour piece is just a one-variant piece and
no call site branches on "does this have variants?". A cart line is now keyed by
the `(productId, variantId)` pair through one shared `lineKey` helper; the
persisted cart bumped to `jtj-cart-v2` and v1 carts are dropped, since a line
with no variant id can't be honestly migrated onto a colour. `placeOrder`'s
guarded decrement became `$elemMatch` + `$inc: {"variants.$.stock": -qty}` —
still one atomic op, still no transaction — and `restoreStock` mirrors it, which
is why `IOrderItem` carries `variantId` as load-bearing rather than provenance.
Order lines snapshot the colour name too, so receipts, the confirmation email
and the packing list all say which one shipped.

**Run `node scripts/migrate-variants.mjs --apply` before using this against an
existing database.** It wraps each product's old fields into one variant _and_
drops the stale `sku_1` unique index — without that drop every product indexes
`sku: null` and the second one saved fails with E11000, a long way from its
cause. Every migrated colour is named "Standard"; the script can't invent a real
name, so rename them in `/admin/products`.

Deliberately not done, if they ever matter: a colour can't carry its own price
or be hidden without archiving the whole product, colours can't be hand-ordered
(the first is the default), and the suggestion-tile card variant shows the
default colour with no swatches — it is one link, and a radiogroup inside an
anchor is unreachable by keyboard.

### ~~5. A featured-products carousel on the homepage~~ — done

`FeaturedSection` / `FeaturedStrip` now sit where the craftsmanship grid was: a
draggable embla strip of whatever an admin has flagged — from the Featured
column on `/admin/products`, or the checkbox on either product form — entering
as one staggered reveal. It is a real query
(`getFeaturedProducts`), so it does not inherit #2's problem, and it renders
nothing at all when nothing is flagged.

Neither shortlisted animation library was needed — the existing `Reveal`
component and the `--motion-*` tokens covered it, so no new dependency.
`tags` was left alone: `featured` is its own indexed boolean on `Product`, which
maps to a checkbox and can't be broken by a typo in a free-text field.

Two things it deliberately does not do, if they ever matter: the strip is
ordered newest-first with no way to hand-order it (that needs a `featuredOrder`
field), and nothing caps how many products an admin can flag beyond
`FEATURED_LIMIT` truncating the display at 8.

---

## Also worth doing

### Content and trust

- [ ] **The homepage images are hotlinked from Google.** `ProductSection`
      loads AI-generated placeholders from `lh3.googleusercontent.com`, marked
      with a `TODO` to replace them. They are third-party URLs on someone
      else's CDN — they can break without notice, and they are not the actual
      product. Real photography is overdue.
- [ ] **The footer is a dead end.** The logo links to `#`, and the only links
      are Privacy and Terms. No contact, no social, no shipping/returns, no
      collection link.
- [ ] **No social proof anywhere** — no reviews, testimonials, or customer
      photos on a product page a first-time buyer is deciding from.
- [ ] **Shipping and returns deserve their own page.** The terms page covers
      the return window legally, but a buyer looking for "how long, how much,
      what if it doesn't fit" shouldn't have to read terms of service.

### Customer experience

- [ ] **The customer hears nothing after ordering.** The only order email is the
      confirmation. Nothing is sent when an order is confirmed, shipped, or
      delivered — on COD, where the customer has paid nothing and holds nothing,
      that silence is what generates "where is my order" calls.
- [ ] **Sale pricing and tags are invisible.** `comparePrice` and `tags` exist
      on the product schema with no form control and no storefront display, so
      there is no way to run a discount or group products beyond category.
- [ ] **The product image has no loading state.** On the detail page the gallery
      box is just page background until the Cloudinary image decodes, so a slow
      connection shows an empty square with nothing to say a photo is on its
      way — on a page whose whole job is the photograph. `ProductCard` has the
      same gap.
- [ ] **The avatar pops in twice.** While the session resolves, `UserMenu`
      renders an empty 32px gap; the moment it resolves the Radix fallback
      paints the initials, then the Google-hosted photo replaces them when it
      arrives. Two visible swaps in the navbar on every load, and neither of
      them reads as loading.

### Admin and operations

- [ ] **`/admin` opens straight into the order manager.** There is no overview —
      no revenue, no order counts, no low-stock summary, nothing to glance at
      before drilling in.
- [ ] **Low stock is visible only if you go looking for it.** Nothing surfaces a
      product about to run out, so the first signal is a customer failing to buy
      it.

### Housekeeping

- [ ] **`.env.vercel` holds ten production secrets in plaintext** in the project
      folder — Mongo URI, Cloudinary secret, Resend key, Google client secret,
      auth secret. It's gitignored, so nothing leaked, but Vercel already has
      them and this copy has no reason to still exist.
- [ ] **Rate limiting is per-instance and in-memory.** Counts reset on every
      redeploy and aren't shared between serverless instances, so the real
      ceiling is higher than the configured one. Acceptable for now; worth
      knowing before order volume grows.
- [ ] **No analytics or error monitoring.** There is no measurement of traffic,
      conversion, or runtime errors in production — problems are currently
      found by noticing them.
