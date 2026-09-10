---
target: the product details page
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 3
target_identity: "file:E:\\Projects\\jack-the-jelli\\features\\products\\components\\ProductDetailView.tsx"
target_fingerprint: "sha256:b5356eabbb521cde68ad48b2ce2bf94839319e037f662ce988643fe79f84de6c"
target_path: "E:\\Projects\\jack-the-jelli\\features\\products\\components\\ProductDetailView.tsx"
timestamp: 2026-09-10T11-03-03Z
slug: features-products-components-productdetailview-tsx
---
Method: dual-agent (A: design review, isolated · B: detector + browser evidence, isolated).
Target: features/products/components/ProductDetailView.tsx + app/(storefront)/collection/[slug]/

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2 | Three stock states computed (stock.ts:9-13), two rendered — "Only 3 remaining" and "In stock" are visually identical (ProductDetailView.tsx:132-135). No aria-live on variant change. |
| 2 | Match System / Real World | 2 | Internal SKU shown as "Reference"; formatPrice forces 2 decimals on whole-taka currency; "Pieces at This Level" is price-band jargon. |
| 3 | User Control and Freedom | 3 | Sold-out colourways stay selectable by design; defaultVariant opens on a buyable colour. No quantity; sold-out is a dead end. |
| 4 | Consistency and Standards | 2 | 44px touch minimum applied to related-products arrows (carousel.ts:9,12), skipped on swatches (24px) and gallery arrows (40px). Zero-radius not in token. Em-dashes in rendered copy. |
| 5 | Error Prevention | 3 | Strong. Per-colourway stock everywhere, CTA disables on selected colour, maxQty caps quantity. |
| 6 | Recognition Rather Than Recall | 1 | Eight unlabelled 24x24px chips; only selected is named; title attr does nothing on touch. |
| 7 | Flexibility and Efficiency | 2 | No gallery zoom, no quantity, no sticky buy bar below lg. |
| 8 | Aesthetic and Minimalist Design | 3 | Real typographic register; minimalism tipped into omission. Two images render into sm:grid-cols-6. |
| 9 | Error Recovery | 1 | Sold-out is a 2.49:1 slab with no restock note, alternative, or contact. No error.tsx. |
| 10 | Help and Documentation | 1 | Never says how the buyer pays (COD absent from PDP) or what delivery costs (delivery.ts:121-127 knows). No dimensions, material, capacity. |
| **Total** | | **20/40** | **Acceptable — significant improvements needed** |

## Design Specificity Verdict

Authored above the neck, generic below it. The top third has a real point of view: EB Garamond 56px against 12px Inter-600 eyebrows, a confident 3/5-2/5 split, and a rotated 1px hairline on sold-out chips (ColorSwatches.tsx:79-87) instead of a slash icon.

The IA underneath is Shopify Dawn with the corners filed off. ProductSpecList.tsx:20-25 is four rows where two are byte-identical on every product and a third is an internal SKU. models/Product.ts:44-45 has only price and description — no field for tannage, dimensions, or card slots. The page cannot argue about leather even if you wanted it to.

DETERMINISTIC SCAN: File mode returned [] exit 0, but Assessment B validated this against a control file full of deliberate anti-patterns (font-medium, text-[9px], #777 on #888, alt-less img, onClick on span, h1 to h4 skip) which ALSO returned []. The v0.1.5 file ruleset does not fire on TSX. URL mode: exit 2, 12 findings, identical on both products and both viewports.

- kicker-above-heading x2 — GENUINE. Independently confirms that eight semantic jobs share one 12px uppercase style.
- layout-transition (transition: height) — GENUINE, from transition-all in button.tsx:8.
- overused-font (Inter 75%) — real but not actionable; Garamond/Inter is a binding brand decision.
- image-hover-transform x8 (advisory) — FALSE POSITIVE; fires on related cards (ProductCard.tsx:80,121), not the gallery.
- Zero-radius produced no findings; the expected false positive never materialised.

OVERLAY: injection succeeded, live server on port 8400, console reported "[impeccable] 1 anti-pattern found" (one page-level group of 12), real overlay banner rendered, server stopped and verified. Side effect: starting it appended a 25-line impeccable-ignore block to .gitignore that stop did not remove.

## Overall Impression

Code craft is unusually high; the problems are almost entirely informational. The page is beautiful and not persuasive, because it withholds every fact a Bangladeshi buyer needs to hand over cash: material, size, delivery cost, and that they pay nothing up front. Biggest opportunity: cash on delivery is the brand's strongest trust asset and the page never mentions it.

## What's Working

1. Colourway as page state, not navigation (ProductDetailView.tsx:41-54). Swatch click swaps gallery, stock, SKU and CTA with no route change or refetch. Stock is scoped to the selected colour. key={selected?.id} fixes the embla index-carryover bug most implementations ship with.
2. object-contain held through the entire chain — main slide, thumbnails, fly-to-cart clone. Three places a lesser implementation drifts.
3. The sold-out swatch: 45% opacity plus a rotated hairline so state never depends on opacity alone, plus aria-label, plus the deliberate choice to leave it clickable.

## Priority Issues

### [P0] Product content invisible until JavaScript runs

.reveal sets opacity:0 in CSS (globals.css:241-247); both detail columns are Reveal wrappers (ProductDetailView.tsx:76,92). Reveal.tsx falls back when IntersectionObserver is undefined but NOT when hydration fails. globals.css:754-756 already states the rule this breaks.

FIX: do not gate above-fold content on an observer. Drop Reveal from the two detail columns, or give .reveal a first-viewport fallback that rests visible.
COMMAND: /impeccable animate

### [P0] Buy button 270px below the fold on mobile, no sticky bar

Measured at verified 390x844 (resize_window is a no-op in this environment; B used a same-origin iframe):
title 685 | price 749 (bottom 778, just clears) | swatches 1024 | Add to Cart 1114.
lg:sticky lg:top-32 applies only from 1024px. Real mobile browser chrome eats 100-140px, pushing price to the edge in practice.

NOTE: Assessment A estimated price was below fold; B's measurement shows it clears by ~66px. The buy button is the real problem.

FIX: mobile-only sticky bottom bar under lg (price + colour + CTA; AddToCartButton already takes a variant). Cut pt-32 to pt-24 on mobile, cap gallery to max-h-[60svh].
COMMAND: /impeccable adapt

### [P1] Page never states how the buyer pays or what delivery costs

SHIPPING_COPY gives a duration and stops. delivery.ts:121-127 knows 60/120/free above 5000. COD is the trust story with reviews unavailable, and it is buried past the decision.

FIX: concrete rows — "Delivery: 60 in Dhaka, 120 elsewhere. Free above 5,000. 3 to 5 working days." / "Payment: Cash to the courier. Nothing before." Drop Reference. Import constants from delivery.ts so they cannot drift.
COMMAND: /impeccable clarify

### [P1] Eight unlabelled 24px chips are the page's only decision and its worst-built element

Measured 24x24 at both viewports — worst tap target on the page, while related-products arrows get an explicit 44px with a comment about touch targets.

FIX: size-10/size-11 chips with the colour NAME under each at 11px label-caps. Eight named 44px chips in two rows of four. Keep size-4 for the card row.
COMMAND: /impeccable adapt

### [P1] Sold out is a dead end; low stock is invisible; CTA gets less readable on hover

- Sold-out button composites to 2.49:1 (WCAG exempts disabled controls, but it is barely legible and offers nothing).
- Low stock renders identically to in stock — scarcity is one of only two allowed persuasion levers, at the lowest emphasis available.
- hover:bg-secondary computes to 3.98:1, under AA for 12px/600. Confirmed by independent calculation and live measurement.

FIX: low-stock gets text-foreground; sold-out replaces the dead slab with a link selecting the nearest in-stock variant; darken --secondary for hover or hover to --secondary with --foreground text.
COMMAND: /impeccable harden

### [P2] Photograph's white ground shows as a lighter rectangle on the page ground

ProductGallery.tsx:60 sets bg-background (#faf9f6) behind object-contain images shot on pure #ffffff. The comment at :49-55 reasons correctly then lands on a solution with the same artefact.

FIX: either add #faf9f6 to the photographer's export spec, or set the gallery box to #ffffff so it reads as an intentional plate. Current state is neither.
COMMAND: none — a brief decision.

## Motion and Loading Animations

Commit 501acb1 removed reduced-motion handling deliberately; no prefers-reduced-motion branch is recommended. Everything here works within that.

HAS: two-column Reveal stagger (420ms, cubic-bezier(0.22,1,0.36,1), 70ms), geometry-accurate skeletons in loading.tsx and RelatedProductsSkeleton, staggered fade-and-rise on related cards, and flyToCart — which sends the actual product photograph into the cart button. Best motion on the site; it carries information.

MISSING:
1. No image load-in transition anywhere in the product surface — no placeholder, no blur, no fade. Raw Cloudinary JPEGs pop against white. Biggest perceived-performance win on Bangladeshi mobile data. Remote images need blurDataURL, so the cheap version is an onLoad opacity transition.
2. Colourway switch is a hard cut — key remount is correct for the embla bug but leaves the page's most interactive moment with no transition. A crossfade here is the highest-value addition.
3. Skeleton pulse is the only unauthored motion — stock shadcn animate-pulse in a codebase that defines its whole vocabulary as two durations and one curve. A sweep on --motion-ease would match.

NOT WORTH ADDING: pending state on Add to Cart. The store write is synchronous; the toast is the right confirmation.

## Persona Red Flags

PHONE-FIRST INSTAGRAM BUYER: blank screen while Reveal waits on hydration, then a photograph filling screen one. 685px to the name, 749 to the price, 1114 to the buy button, no sticky bar. Eight 24px dots they cannot distinguish or read the names of. Never told they pay the courier.

GIFT BUYER: no dimensions, no card count, no schema field for either. "3-5 working days" with no cutoff or cost. 14-day exchange in the same grey as the SKU, silent on who pays return courier — the exact COD question.

SEARCH-LED CONSIDERED BUYER: no leather type as a field, no thickness, tannage, hardware, stitch, dimensions, weight, capacity, care, warranty. The one product-specific row is the SKU. Related rail sorts purely by price distance with no category filter (products.ts:400-419), surfacing unfinished entries "Notun 2" and "notun" alongside real pieces (database rows, not code).

## Minor Observations

- Em-dashes render in three forbidden places: ProductDetailView.tsx:118, cartStore.ts:48, ColorSwatches.tsx:65. Database product names too.
- No aria-live anywhere in the detail view.
- Spec-list hairlines compute to 1.09:1 against the page — very nearly invisible.
- font-medium appears 11 times in untouched shadcn primitives, reaching this page via button.tsx:8; live font-weight:500 confirmed, a weight that is not loaded.
- No error.tsx on this route.
- Unselected swatch focus ring UNCONFIRMED: B measured transparent outline-color on focus, but programmatic .focus() does not trigger :focus-visible and focus-visible:outline-foreground is present at ColorSwatches.tsx:220. Needs one real Tab press.
- Clean: one h1, no skipped levels, 11/14 images with meaningful alt (3 empty are correct), no React errors, no hydration warnings, no horizontal overflow at 390px.
- toLocaleString("en-US") uses Western grouping — wrong above 1,00,000 taka.

## Questions to Consider

1. If Reference and Collection became dimensions, leather, and card capacity, would anyone notice the loss — and would the page stop being usable by any other catalogue?
2. Is the quiet restraint, or a data model never asked to describe leather?
3. Why does the buyer only learn about cash on delivery after they commit?
4. Eight colours means eight leathers chosen deliberately. Why are they anonymous dots?
5. Would you show a phone-first buyer a full-bleed photograph before the buy button, knowing it is 1,114 pixels down?
