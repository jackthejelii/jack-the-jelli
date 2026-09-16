# Jack The Jelli

A lean, near-zero-op-cost e-commerce storefront **and** admin dashboard for a
handmade leather-goods brand, built as one monolithic Next.js App Router app.
Public storefront, guest-first cart/checkout, order tracking, and the `/admin`
back-office all live in a single codebase — no separate backend service, no
Shopify/WooCommerce, no CMS.

> **This file is the project's context brief.** If you're an AI assistant or a
> developer picking this up cold, read this first, then `CLAUDE.md` (agent
> conventions). Everything below was verified against the code on
> **2026-08-28**.

---

## 1. What it is

|                |                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Brand**      | Jack The Jelli — handmade leather wallets. Tagline: _"They're jelly of the gear."_                                  |
| **Market**     | Bangladesh. Phone-first, **cash on delivery only** — there is no payment gateway anywhere in this codebase.         |
| **Currency**   | Bangladeshi Taka (৳ / BDT), stored and displayed as **whole taka** — no paisa/cents anywhere.                       |
| **Cost model** | MongoDB Atlas free tier + Cloudinary free tier + Resend free tier + Vercel. No Redis, no queue, no e-commerce SaaS. |
| **Domain**     | `jackthejelli.com` (see `app/layout.tsx` → `SITE_URL`).                                                             |

---

## 2. Stack

| Layer        | Technology                                                                         |
| ------------ | ---------------------------------------------------------------------------------- |
| Framework    | **Next.js 16.2.9** (App Router, Turbopack), React 19.2                             |
| Language     | TypeScript, `strict: true`, path alias `@/*` → repo root                           |
| Database     | MongoDB Atlas via **Mongoose 9**                                                   |
| Auth         | **Better Auth 1.6** — email/password (verified) + Google OAuth                     |
| Images       | **Cloudinary** — signed direct-from-browser upload                                 |
| Email        | **Resend** (`lib/email.ts`), three transactional messages                          |
| Styling      | **Tailwind CSS v4** (CSS-only config), **shadcn/ui** (`radix-nova`, Radix, Lucide) |
| Client state | **Zustand** (cart, persisted to `localStorage`)                                    |
| Validation   | **Zod 4** — one schema shared by client and server                                 |
| Misc         | `sonner` (toasts), `embla-carousel-react` + `-auto-scroll` (galleries), `next-themes`               |

> ### ⚠️ This is not the Next.js you remember
>
> The pinned version (16.2.9) is **ahead of most LLM training data** and has real
> breaking changes. Most importantly: **Next 16 replaced `middleware.ts` with
> `proxy.ts`** (see the root `proxy.ts`). Before touching routing, config, or
> server actions, read the shipped docs in `node_modules/next/dist/docs/01-app/`
> — especially `02-guides/upgrading/version-16.md` and
> `01-getting-started/16-proxy.md`. This rule is also stated in `AGENTS.md`.

### Commands

```bash
npm run dev
```

```bash
npm run build
```

```bash
npm run lint
```

`npm run start` serves the production build. Formatting is
`npx prettier --write <files>` (prettier-plugin-tailwindcss sorts class names);
there is no npm script for it.

**There is no test suite.** No test script, no test files, no framework
installed. Don't assume one exists — verification is reading, `npm run build`,
and manual QA (`docs/QA-AUDIT-PROMPT.md` is the reusable pre-deploy audit
brief — run it fresh rather than trusting a stale prior result).

> Scope `prettier --write` to the files you actually edited; running it over the
> whole directory rewrites CRLF → LF and dirties the entire tree.

---

## 3. Layout of the repo

**Feature-based, not colocated by route.** `app/` holds only thin route
entrypoints (page/layout/error/loading). All real logic lives in
`features/<domain>/{components,lib,hooks}` and is imported into those pages.

```
app/                        route entrypoints only
  (storefront)/             public store — nav + footer chrome
  (auth)/                   login, register, verify, forgot/reset password
  admin/                    back-office (own layout, no storefront chrome)
  api/auth/[...all]/        Better Auth handler
  api/cloudinary/sign/      signed upload params (admin-only)
  layout.tsx globals.css icon.svg apple-icon.png global-error.tsx

features/
  account/    profile form
  admin/      orders, products, categories, customers — tables, forms, actions
  auth/       login/register/reset forms + schemas
  cart/       zustand store, cart sheet, server sync
  checkout/   checkout form, delivery zones, placeOrder, receipt cookie
  contact/    contact form, schema, Server Action, FAQ + channels
  homepage/   hero, product section, featured strip, footer
  legal/      privacy + terms documents
  orders/     order state machine, receipts, timeline, /track form
  products/   collection grid, filters, search, product detail, gallery

components/
  ui/         shadcn primitives ONLY (added via `npx shadcn@latest add`)
  layout/     NavBar, MobileNav, UserMenu, Logo, AppLink, InstagramIcon,
              nav-links.ts, PageFade, RouteProgress, MessageScreen

lib/          auth.ts auth-guard.ts auth-client.ts db.ts users.ts email.ts
              cloudinary.ts rate-limit.ts mongo-errors.ts slug.ts utils.ts
models/       Cart.ts Category.ts Contact.ts Order.ts Product.ts index.ts
proxy.ts      Next 16 proxy (replaces middleware.ts)
public/       hero-image.webp, logo.svg/png, link-preview.jpg, image-placeholder.jpg
docs/         gitignored local notes: media-masters/, client handover, QA audit
```

When you add a page, put its logic in the matching `features/` folder — not
inline in `app/`.

---

## 4. Data model

Four Mongoose models in `models/`, plus four collections **owned by Better Auth**
(`user`, `session`, `account`, `verification`) that have no Mongoose model at
all. `lib/users.ts` types the raw `user` collection for the places that read it.

### `Product`

`name · slug · category(ref) · price · description · status · featured ·
variants[{_id, color, hex, sku, stock, images[{url, publicId}]}] ·
comparePrice · tags`

- **A colour is a variant inside one product, not a sibling product.** `sku`,
  `stock` and `images` live on the colourway because all three genuinely differ
  per colour; name, price, description and category stay on the parent so
  repricing can never leave two colours disagreeing.
- **`variants` is required and never empty**, so a single-colour piece is just a
  one-variant piece and no call site branches on "does this have variants?".
  The first entry is the default colour.
- **A variant's `_id` is load-bearing.** It is what a cart line, an order line
  and the stock decrement all address, so `updateProduct` reuses it rather than
  minting a fresh one — regenerating them would orphan live carts and break the
  stock restore on past orders.
- `status`: `Draft | Published | Archived`. Every storefront query filters on
  `status: "Published"`.
- Slug is auto-derived from the name in a `pre("validate")` hook, de-duplicated
  with a numeric suffix; the unique index is the last line of defence.
- Images store `publicId` as well as `url` — that's what makes Cloudinary
  deletion possible.
- Five compound indexes exist so each filter carries its sort key
  (`status+createdAt`, `status+price`, `status+category+createdAt`,
  `status+name`, `status+featured+createdAt`), plus a **unique multikey index on
  `variants.sku`**. That index only constrains across documents — MongoDB lets
  one document's array repeat a value — so two colours of the *same* product
  sharing a name or SKU are caught by a second `pre("validate")` hook instead.
- `featured` is the admin-set flag behind the homepage strip: a checkbox on
  both product forms, and a one-click column on the inventory table
  (`setProductFeatured`, which writes that key alone rather than re-validating
  the whole product). Read by `getFeaturedProducts`. Absent on documents
  written before the field existed, which reads as `false` to the query, so
  there is nothing to backfill. From `FEATURED_DRIFT_MIN` (6) pieces up the
  strip loops and drifts on its own, pausing under the cursor or on focus;
  below that it is arrows and drag only, because embla cannot loop a row it
  can't fill.
- `comparePrice` and `tags` are schema-only: no form control yet, kept so adding
  one needs no migration.

### `Category`

`name · slug · description`. The slug is **not** de-duplicated — a duplicate name
is a mistake, so the unique index rejects it and the action turns that E11000
into "this category already exists".

### `Order` — read `models/Order.ts` before touching orders

`orderNumber · idempotencyKey · userId · customerDeletedAt · guestEmail ·
phoneKey · items[] · shippingAddress · deliveryZone · subtotal · deliveryFee ·
totalAmount · status · paymentStatus · stockCommittedAt · stockRestoredAt ·
placedAt/confirmedAt/shippedAt/deliveredAt/cancelledAt/returnedAt ·
paymentUpdatedAt · statusHistory[]`

Decisions baked into the schema:

- **Line items are snapshots.** Name, colour, SKU, slug, price, lineTotal and
  thumbnail are copied at purchase time — the SKU and thumbnail are the
  *colourway's*, since that is what gets picked off the shelf. The `product` ref
  is kept for provenance only, so renaming or repricing a product can never
  rewrite order history.
- **`variantId` is the exception to that.** Unlike `product` it is not
  provenance: it is the address `restoreStock` decrements back into on a cancel
  or return, so a line without it cannot be un-sold.
- **`userId` is a plain ObjectId, deliberately not a `ref`** — Better Auth owns
  the `user` collection and there is no `models/User.ts`, so `populate()` would
  throw `MissingSchemaError`. Null means guest _or_ deleted account;
  `customerDeletedAt` is the only signal that distinguishes the two.
- **`idempotencyKey` is unique** — the double-submit guard, claimed before any
  stock moves.
- **`phoneKey`** is the normalised `01XXXXXXXXX` form: the `/track` lookup key,
  never displayed.
- Milestone timestamps record the **first** time a status was reached, so moving
  a status backwards to fix a mis-click doesn't rewrite them. `statusHistory`
  carries the full trail.

### `Cart`

`userId (unique) · items[{productId, variantId, qty}]`. Signed-in shoppers only
— guests have no document. Stores **only** the line's identity + quantity:
names, prices and stock are re-read live every time (`revalidateCart`, then
again in `placeOrder`), because a cart is a draft, not a record. A TTL index
expires carts 7 days after the last write.

That identity is the **pair** `(productId, variantId)`, not the product alone —
the same wallet in black and in tan is two lines with two stock counts. One
helper, `lineKey` in `features/cart/lib/types.ts`, defines it for both the
client store and the server actions so the two can never disagree. The persisted
localStorage cart is `jtj-cart-v2`; v1 carts are dropped rather than migrated,
because a v1 line carries no `variantId` and there is no honest way to guess
which colour it meant.

> **Hot-reload caveat on every model:** the `mongoose.models.X || mongoose.model(...)`
> guard prevents `OverwriteModelError` in dev, but it also means **schema and
> hook edits don't take effect until you restart the dev server.**

---

## 5. Routes

### Storefront — `app/(storefront)/`

| Route                                    | What it does                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `/`                                      | Hero, product section, featured strip                                                             |
| `/collection`                            | Paged grid (9/page), category filter, sort (`newest`/`price-asc`/`price-desc`), predictive search |
| `/collection/[slug]`                     | Product detail: gallery, specs, add-to-cart, related products                                     |
| `/checkout`                              | Guest-first checkout (division / district / thana, COD)                                           |
| `/checkout/success`                      | Receipt, gated by the signed receipt cookie                                                       |
| `/track`                                 | Public order lookup by order number + phone                                                       |
| `/my-orders`, `/my-orders/[orderNumber]` | Signed-in order history                                                                           |
| `/account`                               | Profile (name, phone)                                                                             |
| `/privacy`, `/terms`                     | Legal documents                                                                                   |
| `/claim` (route handler)                 | Where Google sign-up lands when it was started from the confirmation screen                       |

### Auth — `app/(auth)/`

`/login` · `/register` · `/verify-email` · `/forgot-password` · `/reset-password`

### Admin — `app/admin/`

| Route                                         | What it does                                                                 |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| `/admin`                                      | **Sales Overview** — KPIs, orders over time, zone/district/status charts    |
| `/admin/orders`                               | **Order Manager** — filter by status, search, paginate, release stale drafts |
| `/admin/orders/[id]`                          | Order detail: status controls, payment settle, customer panel, history       |
| `/admin/products`                             | Product list with filters and pagination                                     |
| `/admin/products/new`, `/admin/products/[id]` | Create/edit product, Cloudinary uploader, category manager                   |
| `/admin/customers`                            | User list, role assignment, account deletion                                 |
| `/admin/logistics`                            | Dispatch queue, bulk mark-shipped, overdue shipments, courier handoff        |
| `/admin/settings`                             | Delivery pricing, store details, operations, pause orders / maintenance      |

---

## 6. The flows that matter

### Cart

Renders **out of the browser** — Zustand in memory, mirrored to `localStorage` —
so the badge and the sheet paint instantly with no fetch and no flash, for guests
and signed-in shoppers alike. `CartSessionSync` pushes a signed-in shopper's cart
to the `Cart` collection so it survives a new device or a cleared browser.
Nothing client-side is authoritative. Limits live in one place
(`features/cart/lib/limits.ts`): `MAX_LINE_QTY = 20`, `MAX_CART_LINES = 50`.

### Placing an order — `features/checkout/lib/order-actions.ts`

Guest-first: **no `requireAuth()`**, because Better Auth requires email
verification before sign-in, so gating checkout on an account would make it
impossible to finish an order in one sitting. That makes `placeOrder` a fully
public HTTP endpoint, so every input is treated as hostile and every figure is
recomputed server-side. The client's cart is read as `(productId, variantId,
qty)` and nothing more.

Order of operations:

1. Parse and normalise (Zod).
2. Load the products; refuse the whole order if any line can't be filled.
3. Recompute subtotal, delivery fee and total from the database.
4. **Claim the `idempotencyKey` by creating a `Draft`** — before any stock moves,
   so a double-submit collides here instead of decrementing twice.
5. Guarded per-line `$inc` decrements.
6. Roll back and cancel the Draft if any line lost its race, **or**
7. Flip the Draft to `Pending`.

**No MongoDB transaction**, on purpose: each guarded `updateOne` is atomic on its
own, and the explicit rollback supplies the cross-line atomicity a transaction
would have bought — without pinning a connection (which fights the cached global
connection in `lib/db.ts`) or turning a hot product into WriteConflict retry
storms.

Order numbers look like `JJ-250805-K3M9`: a 30-character alphabet with every
visually or aurally ambiguous character removed (no `0 O 1 I L U`), because they
get read aloud on the confirmation call. Random rather than a counter — a counter
leaks daily order volume. Uniqueness comes from the unique index plus 5 retries.

### Order state machine — `features/orders/lib/order-status.ts`

`Draft → Pending → Confirmed → Shipped → Delivered`, plus `Cancelled` and
`Returned` (both terminal).

- `Draft` is internal (the idempotency claim) and excluded from every customer-
  and admin-facing query. `releaseStaleDrafts` clears ones older than 15 minutes.
- The four **live** statuses are mutually reachable in both directions, so a
  mis-click is one click to undo.
- `Delivered` cannot go to `Cancelled` — goods that reached the customer and came
  back are a **Return**, and Return is the transition that asks whether the stock
  is still sellable.
- Cancel and return restore stock exactly once, guarded by `stockRestoredAt`.
- Payment status (`pending / collected / refunded / failed`) is set by hand and
  no longer follows the delivery timeline; `paymentUpdatedAt` records when.

### Receipt cookie — `features/checkout/lib/receipt.ts`

`jtj_receipt`: HMAC-signed with `BETTER_AUTH_SECRET`, httpOnly, 24 hours, last 5
orders. It's what lets `/checkout/success` show a full order (phone, address)
without putting it in a URL or making a guest re-type their number thirty seconds
after typing it. Each entry binds `orderNumber` **and** `phoneKey`, so the cookie
authorises exactly the orders it was issued for.

### Claiming guest orders

Most orders are placed as a guest. When someone signs in, Better Auth's
`session.create.after` hook runs `claimGuestOrders(userId, email)` — but **only
if the email is verified**, otherwise anyone could sign up as someone else's
address and inherit their order history, phone and address with it.
`customerDeletedAt` stops a deleted account's orders being re-claimed if the same
email signs up again. A failure here is logged and swallowed: claiming is a
convenience and must never be why a sign-in fails.

---

## 7. Auth and security model

Configured once in `lib/auth.ts`, mounted at `app/api/auth/[...all]/route.ts`.

- **Email/password requires a verified email before sign-in**
  (`requireEmailVerification`). Password reset revokes existing sessions.
- **Google OAuth with `accountLinking` disabled** — a Google sign-in against an
  existing password account is refused rather than linked.
- **`role` is an `additionalFields` entry with `input: false`**, which is the
  actual server-side enforcement that it can never be self-assigned through
  sign-up or `update-user`. Roles are `customer | admin`
  (`features/admin/lib/roles.ts`); grant admin through `updateUserRole` in the
  admin UI, or by editing the document directly.

### Enforcement lives in `lib/auth-guard.ts`, not in `proxy.ts`

`proxy.ts` does a **cookie-presence redirect only** — it can't reach the
database, so it can't check a role or verify a token. It matches `/account/*`,
`/my-orders/*` and `/admin/*`. **`/checkout` is deliberately absent** (guest-first).

Every admin Server Action and route handler therefore calls **`requireAdmin()` as
its first statement** — Server Actions are reachable by direct POST from anyone
on the internet, so rendering a page under `/admin` protects nothing.
`requireAdmin()` re-reads `role` from the database on every call and never trusts
the session token, so revoking admin takes effect on the next request. **Adding a
privileged action means adding that call.**

### Other defences

- `lib/rate-limit.ts` — in-process, per-instance limiters on the public Server
  Actions (order placement is capped at 8/min per IP). Deliberately not Redis:
  that's the zero-cost tradeoff, and it's never the only defence on a route.
- `lib/email.ts` escapes every interpolated value — it's the one place in the app
  that builds HTML by hand.
- Cloudinary's API secret never leaves the server; the browser gets a signature
  from `/api/cloudinary/sign` (admin-guarded) and uploads directly.

---

## 8. Email — `lib/email.ts`

One Resend account, one `EMAIL_FROM`, one HTML template, three messages:
verification, password reset, and order confirmation (which fills the
`summaryHtml` slot with an itemised block).

**Dev transport switch:** outside production, a real API call is made _only_ for
`DEV_INBOX`. Every other address gets its link written to the server log as
`[email:dev] …`, so test accounts can register without `onboarding@resend.dev`
returning a 403. The Resend SDK resolves with `{ data, error }` rather than
rejecting, so the error is checked explicitly and thrown — an unchecked `await`
would report success for a 403, a bad key, or a quota trip.

---

## 9. Images

**Photographs are stored raw.** The file the admin picks is uploaded to
Cloudinary unchanged — nothing here trims, crops, pads, resizes or recompresses
it, on the client or the server, and nothing should start. The only upload-time
constraint is the format: the uploader accepts `image/jpeg` and `image/png` only
(`ProductMediaUploader.tsx`) — iPhone HEIC and WebP are rejected outright.

Framing is a **capture-and-export preference, not a processing step.** Shoot 1:1
square, 2048×2048, sRGB, on a seamless white background with the product centred
at ~85% of the frame width and the grid comes out uniform, but nothing enforces
it. `ProductCard` renders in an `aspect-square` box with **`object-contain`** —
contain, not cover, so an off-spec photo letterboxes instead of being silently
sliced, and mixed source ratios sit at visibly different sizes down the grid.
That is deliberate: the photograph is never cropped to tidy a row.
`ProductCardSkeleton` mirrors the ratio and must change with it.

The other image surfaces are **deliberately still 4:5 or fixed-size**: the
detail-page gallery (`ProductGallery` / `ProductDetailView`, whose
`lg:max-w-[calc((100svh-14rem)*4/3+3rem)]` cap is derived from 4:5), the homepage
tiles (`ProductSection`, including a 21:9 band), the cart and checkout thumbs,
receipts, and the admin table. That is a pending decision, not drift — don't
harmonise them without asking.

`next.config.ts` allows remote images from `res.cloudinary.com` and
`lh3.googleusercontent.com` (Google avatars).

---

## 10. Design system — "Quiet Luxury Editorial"

- **Zero border-radius everywhere** — all `--radius-*` forced to `0` in
  `app/globals.css`.
- **EB Garamond** (display/headings) + **Inter** (body), loaded via
  `next/font/google` in `app/layout.tsx` as `--font-garamond` / `--font-inter`.
- **Don't reach for those variables directly in components.** `globals.css` maps
  them onto Tailwind font utilities: headings use **`font-serif`** (storefront)
  or **`font-heading`** (admin, auth, and shadcn dialog/sheet titles) — both
  resolve to EB Garamond — and body text inherits Inter from `<body>`.
- Only weights **400** (both faces) and **600** (Inter, for the tracked uppercase
  `label-caps` style) are loaded. `font-medium` has no 500 to resolve to and is a
  **no-op**.
- Palette: `#f9f8f6` background, `#1a1a1a` foreground, `#8a7968` muted brown,
  `#e8e5df` hairline borders.
- **Tailwind v4 is configured entirely in CSS** (`@theme inline` in
  `app/globals.css`). There is no `tailwind.config.ts` and there should not be.
- shadcn config in `components.json`: style `radix-nova`, base colour `neutral`,
  Lucide icons. Add primitives with `npx shadcn@latest add <name>`; don't
  hand-edit `components/ui/` beyond what the CLI generates.

The original per-page design specs and reference screenshots have been deleted.
**The shipped pages are now the only reference for the visual language** — when
building new UI, match what's already in `app/` and `features/`.

---

## 11. Environment variables

`.env.local` (gitignored). `.env.example` lists the full set. `.env.vercel` is a
filled-in import file for Vercel's dashboard — **it holds real production secrets
in plaintext, so it must never be committed or shared.**

```
MONGODB_URI
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
NEXT_PUBLIC_CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
BETTER_AUTH_SECRET        # also signs the receipt cookie
BETTER_AUTH_URL           # MUST be the live origin in production
RESEND_API_KEY
EMAIL_FROM                # MUST be a verified sending domain in production
EMAIL_FROM_ORDERS         # optional: receipts only; falls back to EMAIL_FROM
SUPPORT_EMAIL             # the public support address; the default Reply-To
DEV_INBOX                 # dev-only: the one address Resend really delivers to
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

Production gotchas: `BETTER_AUTH_URL` and `EMAIL_FROM` break sign-up, sign-in and
email if left at their local values; Google OAuth needs the live callback URL
added; Atlas needs its firewall opened. The full walkthrough — including domain,
DNS and account ownership — is `docs/CLIENT-HANDOVER.md`.

---

## 12. Conventions and gotchas

- **Server Actions are public endpoints.** Validate with Zod, recompute money
  server-side, and start privileged ones with `requireAdmin()`.
- **Shared constants live in exactly one module** with no `"use client"` or
  `"use server"` directive, so both sides import the same definition:
  `cart/lib/limits.ts`, `checkout/lib/delivery.ts`, `orders/lib/order-status.ts`,
  `products/lib/constants.ts`, `admin/lib/roles.ts`.
- **URL params and action arguments are untrusted at runtime** — TypeScript
  annotations are erased before the request lands. Coerce through helpers like
  `toSortOption` / `toPageNumber` rather than casting.
- **Delivery zones and fees are defined once** in `checkout/lib/delivery.ts` (64
  districts grouped by division; thana stays free text for the MVP). The checkout
  summary renders from it and `placeOrder` recomputes from it, so the number the
  customer agrees to can never disagree with the stored one. Nothing the client
  submits about the fee is read.
- **Index changes don't apply retroactively.** Mongoose only ever calls
  `createIndex`, so changing a TTL or index options needs a one-off `collMod` /
  `dropIndex` against an existing database (see the notes in `models/Cart.ts` and
  `models/Order.ts`).
- **Better Auth stores `_id` as a native ObjectId** while exposing
  `session.user.id` as a string. Querying with the raw string silently matches
  zero documents, and `new ObjectId(bad)` throws `BSONError` — guard with
  `ObjectId.isValid()`.

### Git workflow

One feature branch at a time, merged into `main` through a single PR. **The
author owns every git operation** — agents change files and stop; they never
commit, stage, push, branch, or open PRs. This is enforced as `permissions.deny`
rules in `.claude/settings.json`. Read-only git (`status`, `diff`, `log`, `show`)
is encouraged. No worktrees in this repo.

---

## 13. Where to look next

| File                          | What's in it                                                  |
| ----------------------------- | ------------------------------------------------------------- |
| `CLAUDE.md`                   | Agent-facing conventions (a condensed form of this file)      |
| `AGENTS.md`                   | The "read the shipped Next 16 docs first" rule                |
| `NEXT-TWEAKS.md`              | What still needs doing, in priority order                     |
| `SEO-CHECKLIST.md`            | Open Graph, sitemap, structured data, measurement             |
| `AUTH_IMPLEMENTATION_PLAN.md` | The auth spec — code comments cite its § numbers              |
| `docs/CLIENT-HANDOVER.md`     | Standing the site up on the client's own accounts, end to end |
| `docs/EMAIL-SENDER-PLAN.md`   | How outbound mail is addressed, and what's deferred           |
| `docs/QA-AUDIT-PROMPT.md`     | Reusable pre-deploy QA audit brief — run fresh before launch  |

`docs/` is gitignored — local planning notes, present in this checkout only.
