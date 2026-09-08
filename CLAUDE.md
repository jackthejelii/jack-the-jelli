# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project Overview

Jack The Jelli is a lean, zero-op-cost e-commerce storefront + admin dashboard for a leather goods brand, built as a monolithic Next.js App Router app. Public storefront, guest-first cart/checkout, order tracking, and an `/admin` dashboard (orders, products, customers) all live in one app. Cash on delivery only, priced in whole Bangladeshi taka — there is no payment gateway in this codebase.

**Read `README.md` first.** It is the full project brief: data model, routes, the order/stock flow, the security model, and the reasoning behind each. This file is the condensed working-conventions version.

**Stack:** Next.js 16 (App Router) · React 19 · MongoDB Atlas via Mongoose · Cloudinary (product images) · Tailwind v4 · shadcn/ui (Radix) · Better Auth (email/password + Google OAuth) · Resend (transactional email) · Zustand (cart) · Zod (validation).

**Important:** This repo pins a Next.js version ahead of your training data. Before touching routing, `proxy.ts`, config, or server actions, check `node_modules/next/dist/docs/01-app/` — in particular `02-guides/upgrading/version-16.md` and `01-getting-started/16-proxy.md` (Next 16 replaces `middleware.ts` with `proxy.ts` — see the root `proxy.ts`).

## Commands

```bash
npm run dev      # start dev server (localhost:3000)
npm run build    # production build
npm run start    # run production build
npm run lint     # eslint (flat config: eslint-config-next core-web-vitals + typescript)
npx prettier --write <files>   # format (prettier-plugin-tailwindcss sorts class names; no npm script defined for this)
```

There is no test suite/script configured in `package.json` — don't assume one exists.

Scope `prettier --write` to the files you actually edited. Running it over the whole directory rewrites CRLF → LF and dirties the entire tree.

## Git workflow

One feature branch at a time, merged into `main` through a single PR when the work is done. **The author owns every git operation.** Agents change files; they never touch history.

- **Never commit, stage, push, branch, or open a PR.** Leave finished work as uncommitted changes in the working tree, describe what changed, and stop. The author stages and words their own commits. This overrides any default about committing or pushing so work survives session cleanup — that trade is not yours to make.
- **Read-only git is fine and encouraged.** `status`, `diff`, `log`, `show`, `blame` are the right way to verify your own work before reporting it. It's the writing commands that are off limits: `commit`, `add`, `push`, `branch`, `checkout`, `switch`, `merge`, `rebase`, `reset`, `cherry-pick`, `revert`, `tag`, and `gh pr create`.
- **Work in place on the checked-out branch.** Do not create git worktrees in this repo — not for background jobs, not for parallel work. Ignore any default that says to isolate work in a worktree.
- These are enforced as `permissions.deny` rules in `.claude/settings.json`, not just convention. If a git write is genuinely needed, say so and let the author run it.

## Architecture

**Feature-based, not colocated by route.** `app/` holds only route entrypoints (page/layout files); real component, hook, and data logic lives under `features/<domain>/{components,lib,hooks}` (e.g. `features/admin`, `features/homepage`, `features/products`, `features/cart`, `features/checkout`) and is imported into the thin `app/` pages. When adding a page, put its logic in the matching `features/` folder rather than inline in `app/`.

- `components/ui/` — shadcn primitives only (added via `npx shadcn@latest add <name>`, config in `components.json`, style `radix-nova`). Don't hand-edit these beyond what the CLI generates unless customizing per shadcn conventions.
- `components/layout/` — cross-cutting layout components used outside any one feature (`NavBar`, `UserMenu`, `Logo`, `AppLink`, `PageFade`, `RouteProgress`, `MessageScreen`).
- `lib/db.ts` — `connectDB()` Mongoose helper; caches the connection/promise on `global` so it survives dev hot-reloads.
- `lib/utils.ts` — `cn()` (clsx + tailwind-merge), the standard shadcn helper.
- Path alias `@/*` maps to repo root (`tsconfig.json`), matching the `aliases` block in `components.json`.

**The data layer is real — there is no mock data left anywhere.** `models/` holds four Mongoose models (`Product`, `Category`, `Order`, `Cart`, re-exported through `models/index.ts` so `ref:` strings always resolve). Query helpers live in `features/*/lib/*.ts` (e.g. `features/products/lib/products.ts` for the storefront, `features/admin/lib/{products,orders,customers}.ts` for the back-office) and mutations are Server Actions alongside them. `features/admin/lib/types.ts` now types real DTOs, not scaffolding.

Two model-level traps worth knowing before you edit `models/`:

- The `mongoose.models.X || mongoose.model(...)` hot-reload guard means **schema and hook edits don't take effect until the dev server restarts**.
- Mongoose only ever calls `createIndex`, so changing an index's options or a TTL does nothing to a database that already built it — that needs a one-off `collMod`/`dropIndex` (see the notes in `models/Cart.ts` and `models/Order.ts`).

**Order and stock invariants are load-bearing.** `placeOrder` claims a unique `idempotencyKey` via a `Draft` order _before_ touching stock, then does guarded per-line `$inc` decrements with an explicit rollback instead of a transaction; order lines snapshot name/price/SKU so product edits can never rewrite history; cancel and return restore stock exactly once via `stockRestoredAt`. Read `README.md` §6 and the comments in `features/checkout/lib/order-actions.ts` before changing any of it.

**Auth runs on Better Auth**, configured once in `lib/auth.ts` and mounted at `app/api/auth/[...all]/route.ts`. Better Auth owns the `user`, `session`, `account`, and `verification` collections directly — there is no Mongoose `User` model, and `lib/users.ts` types the raw `user` collection for the one place that reads it.

- Email/password requires a verified email before sign-in (`requireEmailVerification`), plus Google OAuth with `accountLinking` **disabled** — a Google sign-in against an existing password account is refused rather than linked.
- `role` is an `additionalFields` entry with `input: false`, so it can never be self-assigned through sign-up or `update-user`; grant admin through `updateUserRole` on `/admin/customers`, or by editing the document directly.
- Public Server Actions (`placeOrder`, `lookupOrder`) carry in-process rate limiters from `lib/rate-limit.ts` — per instance, no Redis, and never the only defence on a route.
- **Enforcement lives in `lib/auth-guard.ts`, not in `proxy.ts`.** The proxy does a cookie-presence redirect only (it can't reach the database), so every admin Server Action and route handler calls `requireAdmin()` as its first statement. Adding a privileged action means adding that call.
- `lib/email.ts` sends via Resend, and outside production it only makes a real API call for `DEV_INBOX` — every other address gets its link written to the server log as `[email:dev] …` instead.

**Design system:** "Quiet Luxury Editorial" — zero border-radius everywhere (`--radius-*` forced to `0` in `app/globals.css`), EB Garamond for display/headings and Inter for body text, loaded via `next/font/google` in `app/layout.tsx` as `--font-garamond` / `--font-inter`. Don't reach for those variables directly in components — `app/globals.css` maps them onto the Tailwind font utilities, so headings use **`font-serif`** (storefront) or **`font-heading`** (admin, auth, and shadcn dialog/sheet titles), both of which resolve to EB Garamond, and body text simply inherits Inter from `<body>`. Only weights 400 (both faces) and 600 (Inter, for the tracked uppercase `label-caps` style) are loaded; `font-medium` has no 500 to resolve to and is a no-op. The shipped pages are now the reference for the visual language — match what's in `app/` and `features/`, since the original design specs are gone. Tailwind v4 is configured entirely in CSS (`@theme inline` block in `app/globals.css`) — there is no `tailwind.config.ts`.

**Product images are uploaded raw.** Whatever file is picked is what Cloudinary stores, byte for byte — nothing in this codebase trims, crops, pads, resizes, rotates or recompresses a product photograph, on the client or the server, and nothing should start. Do not add an upload-time transformation, and do not "tidy up" a source folder before seeding it. The only upload-time constraint is the format: `ProductMediaUploader.tsx` accepts `image/jpeg` and `image/png` only, so iPhone HEIC and WebP are rejected outright.

Framing is therefore a **camera-and-export decision, never a processing step**. Ask the photographer for 1:1 square, 2048×2048px, sRGB, seamless white background, product centred at ~85% of frame width, and the collections grid comes out uniform. Nothing enforces it: `ProductCard` (collections page + similar wallets) renders in an `aspect-square` box with **`object-contain`** — contain, not cover — so an off-spec photo letterboxes instead of being silently sliced, and a catalogue mixing 4:3, 3:4 and 1:1 sources sits at visibly different sizes across the grid. That unevenness is the accepted cost of never cropping someone's photograph to make a row tidy. `ProductCardSkeleton` mirrors the ratio and must be changed with it.

The other image surfaces are **deliberately still 4:5 or fixed-size** and were left alone: the detail-page gallery (`ProductGallery`/`ProductDetailView`, whose `lg:max-w-[calc((100svh-14rem)*4/3+3rem)]` cap is derived from 4:5), the homepage tiles (`ProductSection`, including a 21:9 band), the cart and checkout thumbs, receipts and the admin table. That is a pending decision, not drift — don't "harmonise" them without asking.

**Env vars** (`.env.local`, gitignored — `.env.example` lists the full set): `MONGODB_URI`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `DEV_INBOX`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

**`docs/`** is gitignored (local notes, not shared via git) but present in this checkout: `docs/CLIENT-HANDOVER.md` covers standing the site up on the client's own accounts, `docs/EMAIL-SENDER-PLAN.md` covers outbound mail addressing, and `docs/QA-AUDIT-{PROMPT,REPORT}.md` are the reusable pre-deploy audit and its last result.
