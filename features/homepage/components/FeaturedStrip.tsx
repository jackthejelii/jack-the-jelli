"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import AutoScroll from "embla-carousel-auto-scroll";
import { ArrowRight } from "lucide-react";
import AppLink from "@/components/layout/AppLink";
import Reveal, { RevealItem } from "@/components/layout/Reveal";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import ProductCard from "@/features/products/components/ProductCard";
import {
  CAROUSEL_ARROW_CLASS,
  CAROUSEL_ITEM_CLASS,
} from "@/features/products/lib/carousel";
import { FEATURED_DRIFT_MIN } from "@/features/products/lib/constants";
import type { Product } from "@/features/products/lib/types";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getReducedMotion() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** No media queries on the server, and nothing has moved at first paint. */
function getReducedMotionOnServer() {
  return false;
}

/**
 * Reduced-motion as a live subscription rather than the one-shot check in
 * fly-to-cart.ts: that one runs at the moment of a click and is over, this
 * decides whether the auto-scroll plugin is mounted for as long as the page is
 * open, so it has to survive the setting being changed while someone is
 * looking at the page.
 *
 * useSyncExternalStore rather than an effect writing state: a media query is
 * exactly the external store it exists for, and it gets the value into the
 * first client render instead of a render-then-correct.
 */
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotion,
    getReducedMotionOnServer,
  );
}

/**
 * The homepage selection. Replaces the static "Uncompromising Quality" bento
 * that sat here: three fixed tiles that said the same thing to every visitor
 * forever, and never mentioned a product anyone could buy.
 *
 * Client-side because embla is; the query itself runs on the server in
 * FeaturedSection, so the browser only ever receives the products that are
 * actually shown.
 *
 * The whole section is one `<Reveal group>` rather than a reveal per element.
 * A strip that scrolls sideways can't use a per-item observer — the slides past
 * the right edge never intersect the viewport, so they would sit at opacity 0
 * until the shopper dragged them into view and then fade in underneath the
 * cursor. Observing the section once and staggering the items off their own
 * --reveal-delay means the row arrives as one gesture.
 *
 * The entrance itself is richer than the site's shared rise-and-fade, and the
 * rules for it live under "Featured strip" in app/globals.css: the eyebrow
 * hairline draws itself, the heading rises out of a mask, the cards drift in
 * from the right, and each photograph is wiped upward inside its frame just
 * behind its own card. This is the one surface that gets that budget — it is
 * seen once per visit, which is the tier where delight is allowed; the
 * catalogue and the checkout are not.
 */
export default function FeaturedStrip({ products }: { products: Product[] }) {
  const [api, setApi] = useState<CarouselApi>();
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  /*
   * The strip only loops and drifts once there are enough pieces to loop
   * convincingly — see FEATURED_DRIFT_MIN. Below that it stays what it is
   * today: arrows and drag, and nothing that moves on its own.
   */
  const drift = products.length >= FEATURED_DRIFT_MIN && !prefersReducedMotion;

  // Memoised because embla re-initialises when either identity changes, and a
  // fresh object literal every render would tear the carousel down mid-drift.
  const opts = useMemo(
    () => ({
      align: "start" as const,
      slidesToScroll: "auto" as const,
      loop: drift,
    }),
    [drift],
  );

  const plugins = useMemo(
    () =>
      drift
        ? [
            AutoScroll({
              // A card roughly every eight seconds. Anything quicker stops
              // being a drift and becomes a slideshow demanding to be watched.
              speed: 1,
              // Started by the observer below instead, so a strip nobody has
              // scrolled to yet is not already moving when they arrive.
              playOnInit: false,
              // Pauses under the cursor, so a shopper reaching for a card is
              // never chasing it.
              stopOnMouseEnter: true,
              // And when the keyboard lands on a card link, which is the same
              // guarantee for anyone who is not using a pointer.
              stopOnFocusIn: true,
              // Resumes afterwards rather than dying permanently: a drag or an
              // arrow press is the shopper taking the wheel for a moment, not
              // switching the behaviour off for the rest of the visit.
              stopOnInteraction: false,
            }),
          ]
        : [],
    [drift],
  );

  useEffect(() => {
    const el = sectionRef.current;
    const autoScroll = api?.plugins()?.autoScroll;
    if (!el || !autoScroll) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        // Long enough for the entrance stagger to finish landing, so the row
        // comes to rest before it starts moving rather than arriving and
        // drifting at the same time.
        autoScroll.play(1200);
      },
      // Matches the trigger point in Reveal.tsx, so the drift is timed off the
      // same moment the entrance is.
      { rootMargin: "0px 0px -10% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [api]);

  // One step behind the last card, whatever the count — a fixed index would
  // leave a dead half-second before the link on a two-product strip.
  const linkIndex = Math.min(products.length - 1, 5) + 4;

  return (
    <section
      ref={sectionRef}
      aria-labelledby="featured-heading"
      className="featured-strip mx-auto max-w-360 px-5 py-32 md:px-16"
    >
      <Reveal group>
        {/* The Carousel wraps the header too, so the arrows can sit up there
            and still read the embla context — same arrangement as
            RelatedProducts. */}
        <Carousel
          opts={opts}
          plugins={plugins}
          setApi={setApi}
          aria-label="Featured pieces"
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <RevealItem index={0}>
                <p className="text-on-surface-variant flex items-center gap-3 text-[12px] font-semibold tracking-[0.1em] uppercase">
                  <span
                    aria-hidden="true"
                    className="featured-rule bg-on-surface-variant h-px w-10 shrink-0"
                  />
                  The Selection
                </p>
              </RevealItem>

              <h2
                id="featured-heading"
                className="featured-mask text-foreground mt-2 font-serif text-[32px] leading-[1.3]"
                // One stagger step behind the eyebrow. Set here rather than by
                // a RevealItem because the mask is the animation — wrapping it
                // in the shared rise as well would move the heading twice.
                style={
                  {
                    "--reveal-delay": "calc(1 * var(--motion-stagger))",
                  } as React.CSSProperties
                }
              >
                <span>Featured Pieces</span>
              </h2>
            </div>

            <RevealItem index={2} className="flex items-center gap-2">
              <CarouselPrevious
                variant="ghost"
                className={CAROUSEL_ARROW_CLASS}
              />
              <CarouselNext variant="ghost" className={CAROUSEL_ARROW_CLASS} />
            </RevealItem>
          </div>

          <CarouselContent className="mt-10 -ml-4 md:-ml-8">
            {products.map((product, i) => (
              <CarouselItem key={product.id} className={CAROUSEL_ITEM_CLASS}>
                {/* Capped at index 5: the stagger is there to relate the cards
                    to each other, and past half a second the last one is just
                    late. The +3 keeps the cards behind the header they belong
                    to. */}
                <RevealItem
                  index={Math.min(i, 5) + 3}
                  className="featured-drift featured-frame"
                >
                  {/* Separate from the reveal item so the hover lift is not
                      inheriting the entrance's 420ms transition. */}
                  <div className="featured-lift">
                    <ProductCard product={product} variant="quiet" />
                  </div>
                </RevealItem>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <RevealItem index={linkIndex} className="mt-16 text-center">
          <AppLink
            href="/collection"
            className="text-foreground border-foreground hover:border-on-surface-variant hover:text-on-surface-variant ease-editorial group inline-flex w-fit items-center gap-2 border-b pb-1 text-[12px] font-semibold tracking-widest uppercase transition-[color,border-color,transform] duration-(--motion-quick) active:translate-y-px"
          >
            View the full collection
            <ArrowRight className="ease-editorial h-4 w-4 transition-transform duration-(--motion-quick) group-hover:translate-x-1" />
          </AppLink>
        </RevealItem>
      </Reveal>
    </section>
  );
}
