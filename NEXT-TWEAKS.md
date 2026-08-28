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

### Admin and operations

- [ ] **`/admin` opens straight into the order manager.** There is no overview —
      no revenue, no order counts, no low-stock summary, nothing to glance at
      before drilling in.
- [ ] **Low stock is visible only if you go looking for it.** Nothing surfaces a
      product about to run out, so the first signal is a customer failing to buy
      it.
- [ ] **Products have no variants.** One stock number per product, which is fine
      for wallets and blocks the first colour or size the brand introduces.

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
