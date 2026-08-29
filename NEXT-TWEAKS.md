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

### 3. Replace the Craftsmanship section

`CraftsmanshipGrid` is three static image tiles with a heading. Whatever
replaces it should give a visitor something to do or something that moves —
that stretch of the page currently earns no attention and converts nothing.

### 4. A product needs to come in more than one colour

The brand's next natural move — the same wallet in black and tan — has nowhere
to live. This is not a display detail: `Product` carries one `sku` and one
`stock` number, the cart keys a line by `productId` alone (`setQty` and
`removeItem` take nothing else), and an order line snapshots a single
name/SKU/price. A colour therefore changes what a cart line *is*, which stock
count gets decremented, and what the receipt says it sold. Worth settling one
question before any code: is a colour a variant inside one product, or its own
product sharing a page?

### 5. A featured-products carousel on the homepage

Nothing on the front page moves or invites browsing — the visitor either clicks
"Explore Collection" or leaves. A featured strip that animates (motion-primitives
or Watermelon UI were the two shortlisted; **confirm Watermelon's licence first**,
its site refused to serve terms) would give the homepage something to do.

Depends on #2: it has to be a real query, not a second hardcoded strip, or it
inherits the same problem. Also needs a way to mark a product as featured — the
unused `tags` field on the schema is the obvious candidate.

---

## Also worth doing

### Content and trust

- [ ] **The homepage images are hotlinked from Google.** Both
      `ProductSection` and `CraftsmanshipGrid` load AI-generated placeholders
      from `lh3.googleusercontent.com`, each marked with a `TODO` to replace
      them. They are third-party URLs on someone else's CDN — they can break
      without notice, and they are not the actual product. Real photography is
      overdue.
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
