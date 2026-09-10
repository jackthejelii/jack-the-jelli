---
target: the featured products section
total_score: 25
max_score: 32
na_heuristics: 7,10
p0_count: 1
p1_count: 3
target_identity: "file:E:\\Projects\\jack-the-jelli\\features\\homepage\\components\\FeaturedStrip.tsx"
target_fingerprint: "sha256:1510dc25105d0bc439939eb4c0a41dcf9772154f2bae9483f6817af66727fcd5"
target_path: "E:\\Projects\\jack-the-jelli\\features\\homepage\\components\\FeaturedStrip.tsx"
timestamp: 2026-09-10T09-17-31Z
slug: features-homepage-components-featuredstrip-tsx
---
# Critique — featured products strip

Method: dual-agent (A design review, B detector + browser evidence, both isolated).
Browser: desktop only. Chrome on this machine refuses window resizes, so mobile was
never observed; all mobile claims below are source-derived and marked as such.

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | loop:true means arrows never disable and there are no dots |
| 2 | Match system / real world | 4 | "The Selection" is plain and honest, no manufactured urgency |
| 3 | User control and freedom | 2 | Motion self-starts; stop mechanisms are pointer/keyboard only |
| 4 | Consistency and standards | 3 | Four CTA verbs for one destination on one page |
| 5 | Error prevention | 3 | FEATURED_DRIFT_MIN and null empty state are real guards; 1-4 products unguarded |
| 6 | Recognition over recall | 3 | Name and price only, on a moving target, six near-identical colourways |
| 7 | Flexibility and efficiency | n/a | Persuade surface; arrows and drag both exist |
| 8 | Aesthetic and minimalist | 4 | Strongest axis. Quiet type, real hairline, zero fabricated proof |
| 9 | Error recovery | 3 | Empty case silently deletes the page's closing CTA |
| 10 | Help and documentation | n/a | Marketing strip |
| Total | | 25/32 | Good (78%) |

## Design specificity verdict

Authored at the wrong altitude. The devices are genuinely systemic: .featured-mask and
.hero-mask are the same mechanism, .featured-rule and .hero-rule the same left-origin
draw. The content is category-interchangeable: eyebrow, serif heading, arrows top-right,
square tiles with name and price, centred closing link. Nothing here knows it is selling
leather, or Bangladeshi, or cash-on-delivery.

Verified in browser: the entrance choreography played below the fold. Full timeline ran
to 1540ms; the group fired when the eyebrow was ~70px above the viewport bottom while the
cards sat ~230px lower. Captured mid-flight frame was a blank viewport.

Deterministic scan: file scan returned 0 findings; the URL scan against the running DOM
returned 13 (exit 2). The file scanner's zero is regex that does not match this codebase,
not a pass. Live findings: overused-font (Inter 64%), marquee on .cta-sheen,
layout-transition on an unattributed `transition: height` (likely Radix or Embla), 9
advisory image-hover-transform on the shared ProductCard zoom, and a low-contrast hit on
the hero caption sampled via canvas-video-underlay (assessed as a false positive: the
sampler cannot see the .hero-veil layered above the video).

## Priority issues

P0 The entrance plays below the fold. FIXED: Reveal gained an optional triggerRef, and
the strip now observes a zero-height sentinel sitting immediately above CarouselContent
instead of the group wrapper. Card stagger capped at 4 (what fits the viewport) instead
of 6, base moved from +3 to +2.

P1 Drift collides with the entrance and the two triggers are different elements.
autoScroll.play(1200) counted from the <section>, whose py-32 put it 128px above the
entrance trigger; the gap widened the slower you scrolled. FIXED: Reveal gained an
onReveal callback, the second IntersectionObserver was deleted, and the delay raised to
1600ms.

P1 Auto-scroll has no stop for touch. stopOnMouseEnter/stopOnFocusIn are pointer and
keyboard mechanisms; stopOnInteraction:false reverted a drag on finger-lift. FIXED:
stopOnInteraction is now true, with a pointerUp handler resuming after 6s of dwell.

P1 OPEN. The empty state deletes the page's closing CTA. "View the full collection" lives
inside FeaturedStrip, which returns null when nothing is featured. On day one the
homepage's last words are "View Classic" then the footer. Fix: lift the link out into
page.tsx so it renders regardless of featured count. Keep the null strip.

P2 OPEN. The photo wipe clips a box the photograph does not fill. object-contain in an
aspect-square frame means each card's wipe starts late and ends early by a different
amount, which is what undoes a synchronised reveal. Cannot be uniform until the 1:1
shooting spec lands. Do not crop the photographs.

## Craft-floor violation not flagged by either agent

The strip opens with a "THE SELECTION" eyebrow above the heading. The craft floor bans
eyebrows outright ("no brief earns it back"). Left in place because it predates this work
and removing it changes copy structure. Cheapest single upgrade available.

## Minor, all open

- formatPrice forces two decimals on a whole-taka currency; its own doc comment says so.
- Product names in the database carry banned em-dashes ("Flame Bifold — Croc").
- Four CTA verbs, one destination, on one page.
- ~256px of dead space between ProductSection and the strip from stacked py-32.
- Doubled accessible name: section and nested carousel region both "Featured pieces".
- Six of eight featured pieces are Flame Bifold colourways. Is that a selection, or a
  colour picker with a serif heading?

## Motion policy

This project now ships no prefers-reduced-motion branch at all, by explicit owner
decision. The @media block in globals.css was removed along with the JS consumers in
SmoothScroll, fly-to-cart and FeaturedStrip, and the motion-safe: variants in
RelatedProducts and CollectionGrid. Two guarantees were kept deliberately: nothing is
left permanently invisible when an animation fails to run, and no control becomes
unreachable while something is moving.
