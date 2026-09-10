---
version: 1
slug: "app-storefront-contact-page-tsx"
primary_target: "app/(storefront)/contact/page.tsx"
related_targets: ["features/contact/components/ContactChannels.tsx","features/contact/components/ContactForm.tsx"]
---

Scope: the `/contact` storefront route and its three feature components.
Visitor mode: Operate.

## Audience and job

Phone-first Bangladeshi buyers, mostly arriving from Instagram, deciding whether
to trust a cash-on-delivery purchase from a shop they have not bought from
before. The job is to reach a human, or to find that their question is already
answered. Success is a tapped channel or a sent message.

Real content: four contact channels (WhatsApp, phone, email, Instagram), a
four-entry FAQ, and a message form. Reply promise is "within 24 hours".

Constraint: three of the four FAQ answers are grounded in code (cash on delivery
only, a 7 day return window from `LEGAL_INFO.returnWindowDays`, all 64 districts
from `DISTRICTS_BY_DIVISION`). Delivery duration exists nowhere in the codebase
and must come from the owner. Nothing on this page may claim otherwise.

## Direction contract

THESIS: The page owns four equal doors, not one funnel. It refuses the category
default of a hero form with contact details demoted to small print beside it.
Every channel is a full size target because the audience is phone-first and
arrives from Instagram; the form is the after-hours fallback, given last and no
louder than the rest. The doors are a ruled index, never four cards.

OWN-WORLD: Inherited unchanged. #faf9f6 ground, #1a1a1a ink, EB Garamond display
over Inter body, hairline outline-variant rules, label-caps labels, zero radius,
underline-only inputs. Recognisable with all content removed by its ruled
two-column channel index and its label-caps over serif-value pairing.

STORY: The visitor understands there is a real person reachable four ways,
believes a reply comes within a day, and either taps a channel or writes.

FIRST VIEWPORT: Centred serif h1 at 40px, 56px from md, with a one line
standfirst naming the 24 hour promise. Immediately below, the four cell ruled
channel index: all four visible above the fold on desktop, two on a phone. The
primary action is any of the four cells.

FORM: Four Doors, index 6 of a 7 candidate ranked list, seed key e4bc472e,
surface scope, mode operate.

FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, DESIGN.md, and every shipping raster carrying its
provenance.

## Memorable moment

The four doors arrive as one staggered sweep, and nothing else on the page
enters. That single authored entrance is the page's only motion beyond hover and
pending states.

## Unresolved

- Instagram handle and WhatsApp number are not yet known; `contactEmail` and
  `contactPhone` in `legal-info.ts` are still TODO placeholders.
- Delivery duration for the FAQ.
- The site themes no `::selection`, caret or focus-ring colour anywhere. That is
  a site-wide gap, deliberately not fixed from this surface.
