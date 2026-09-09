# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Three confirmed audiences. All are in Bangladesh, all are phone-first, and all pay cash
on delivery.

- **Social-led urban professionals** — roughly 22-35, Dhaka and other cities, arriving
  from Instagram and Facebook. They browse on a phone, often message the page before
  ordering, and expect to finish a purchase in one sitting without creating an account.
- **Gift buyers** — buying for someone else (Eid, birthdays, corporate gifting). They
  decide on quality signals, delivery timing and presentation rather than personal fit,
  and they need to know when it will arrive.
- **Search-led considered buyers** — actively comparing local makers before deciding.
  Slower, more specification-driven, more likely to read a full product page.

Guest checkout is not a convenience for these users, it is the default path: Better Auth
requires a verified email before sign-in, so gating checkout on an account would make it
impossible to finish an order in one sitting.

The other user of this codebase is the **shop operator** — one or two people working the
`/admin` dashboard to confirm orders, settle cash payments, move stock and manage the
catalogue. Their surface is a working tool, not a shopfront.

## Product Purpose

Sell handmade leather wallets direct to Bangladeshi buyers, with no marketplace, no
e-commerce SaaS and no recurring platform cost. One Next.js app carries both the public
storefront and the back-office that runs it. Success is an order placed by a phone-first
guest in one sitting, confirmed by a phone call, and delivered cash-on-delivery, with
stock and money correct on both sides of that without manual reconciliation.

## Positioning

**A design point of view**, in a local market that skews ornate, logo-forward and heavily
branded. The restraint is the differentiator: what the pieces and the storefront look
like is the argument for buying them.

Explicitly *not* the positioning, and not claimable: price leadership, a named tannery or
hide source, or craft provenance built on identifiable makers. Confirmed with the owner —
future work must not reach for any of those instead.

## Operating Context

- **Bangladesh only.** Cash on delivery is the only payment method in the product; there
  is no payment gateway anywhere in the codebase.
- **Whole Bangladeshi taka.** No paisa, no cents, no second currency.
- **Delivery is zoned**, defined once in `features/checkout/lib/delivery.ts`: 64
  districts grouped by division, with thana left as free text for the MVP.
- **Orders are confirmed by phone.** Order numbers (`JJ-250805-K3M9`) drop every visually
  or aurally ambiguous character because they get read aloud on that call.
- **Order tracking is public**, by order number plus phone, because most buyers never
  make an account.
- **Zero recurring operational cost is a product constraint, not a preference**: free
  tiers of MongoDB Atlas, Cloudinary, Resend and Vercel. No Redis, no queue, no CMS.
- Live domain: `jackthejelli.com`.
- Interface and copy are **English throughout**. No Bangla localisation exists and none
  has been decided on — an open question, not a settled no.

## Capabilities and Constraints

**Shipped capability:** storefront (home, collection grid with category filter, sort and
predictive search, product detail, cart, guest checkout, receipt, public order tracking,
signed-in order history, account profile, privacy/terms), and an admin back-office
(order manager with status and payment controls, product and category management with
Cloudinary upload, customer list with role assignment).

**Terminology that is load-bearing:**

- A **colour is a variant inside one product**, never a sibling product. Stock, SKU and
  images live on the colourway; name, price, description and category live on the parent.
- A cart line's identity is the **pair** `(productId, variantId)`, not the product.
- **Draft** is an internal order status (the idempotency claim), never shown to anyone.
- **Return** is not a cancellation — goods that reached the customer and came back are a
  Return, and Return is the transition that asks whether the stock is still sellable.

**Constraints future work must preserve:**

- Product photographs are stored **raw**. Nothing trims, crops, pads, resizes, rotates or
  recompresses them, on the client or the server, and nothing should start. The uploader
  accepts `image/jpeg` and `image/png` only.
- Server Actions are public HTTP endpoints. Money and stock are recomputed server-side;
  privileged ones begin with `requireAdmin()`.
- Next.js 16 with `proxy.ts` (not `middleware.ts`), Tailwind v4 configured in CSS only,
  no test suite.

**Explicitly undecided, recorded so nobody invents an answer:**

- `comparePrice` and `tags` exist on the `Product` schema with no form control yet.
- Image aspect ratios are deliberately inconsistent across surfaces — `object-contain`
  1:1 on the collection grid, 4:5 on the detail gallery, fixed sizes elsewhere. A pending
  decision, not drift.
- Dark mode is half-built and the decision is open. `app/globals.css` defines a full
  `.dark` palette (~lines 125-147), but nothing ever sets the class and no `next-themes`
  provider is mounted, so the site is light-only and those tokens are dead. Finish it or
  delete the block; a committed light editorial storefront is a legitimate answer.
- The navbar carries no links. `components/layout/NavBar.tsx` is a 96px (`h-24`) bar
  holding only the logo, an account icon and a cart icon, so there is no path to
  `/collection` from the chrome on any page except through the homepage hero. Left
  deliberately untouched so far; it is a conversion question before it is a taste one.
- Bangla localisation, above.

## Brand Commitments

- **Name:** Jack The Jelli. **Tagline:** "They're jelly of the gear."
- **Assets on hand:** `public/logo.svg`, `public/logo.png`, `public/link-preview.jpg`,
  `app/icon.svg`, `app/apple-icon.png`.
- **Voice:** editorial and understated. A taste pass across the storefront removed the
  em-dash from all rendered copy and metadata; that is a standing rule for new copy, not
  a one-time cleanup.
- **A visual system is already shipped and binding** — "Quiet Luxury Editorial", zero
  border-radius, EB Garamond over Inter. It is recorded here only as a constraint that
  exists; the system itself belongs in DESIGN.md, which does not exist yet.

## Evidence on Hand

- **Real product photography** of the actual wallets, uploaded raw to Cloudinary. Framing
  is a capture-and-export preference (1:1, 2048px, sRGB, seamless white, product at ~85%
  of frame width) that nothing in the code enforces, so the real library is uneven.
- Hero media in `public/media/hero/` (AV1/H.264 landscape and portrait, WebP poster).

**Nothing else exists. This is a new business with no customers yet.** There are no
testimonials, reviews, ratings, star counts, order or customer counts, press mentions,
awards, "as seen in" or "trusted by" logos, founder or workshop photography, and no
years-in-business or units-sold figure. Future design work must not fabricate any of
these, and must not design a slot that implies one exists and is merely unfilled.

## Product Principles

1. **Finish the order in one sitting.** Guest-first is the default path, not a fallback.
   Anything that asks a phone-first buyer to make an account, re-type a number they just
   typed, or come back later is a regression.
2. **The photograph is never cropped to tidy a row.** Uneven grid sizing is the accepted
   cost of never slicing someone's product photo.
3. **The client is never authoritative about money or stock.** Every figure is recomputed
   server-side from the database, and order lines snapshot what was bought so later edits
   cannot rewrite history.
4. **Zero recurring cost shapes the product, not just the bill.** Features that require a
   paid tier, a queue, or a third-party platform are out of scope by default.
5. **Claim nothing the brand has not earned.** With no customers yet, proof has to come
   from the product and the photography, never from invented social proof.
