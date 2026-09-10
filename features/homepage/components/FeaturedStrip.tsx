"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AutoScroll from "embla-carousel-auto-scroll";
import { ArrowRight } from "lucide-react";
import AppLink from "@/components/layout/AppLink";
import Reveal, { RevealItem } from "@/components/layout/Reveal";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import ProductCard from "@/features/products/components/ProductCard";
import { CAROUSEL_ITEM_CLASS } from "@/features/products/lib/carousel";
import { FEATURED_DRIFT_MIN } from "@/features/products/lib/constants";
import type { Product } from "@/features/products/lib/types";

/** How long a drag or arrow press buys before the drift picks up again. */
const RESUME_AFTER_INTERACTION = 6000;

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
  // Sits with the cards rather than at the top of the section, and is what the
  // entrance is timed off. See the sentinel in the markup below.
  const cardsRef = useRef<HTMLDivElement>(null);
  // The whole section, watched only for the off-screen pause below.
  const sectionRef = useRef<HTMLElement>(null);
  // Whether the entrance has already started the drift once.
  const startedRef = useRef(false);

  /*
   * The strip only loops and drifts once there are enough pieces to loop
   * convincingly — see FEATURED_DRIFT_MIN. Below that it stays what it is
   * today: arrows and drag, and nothing that moves on its own.
   */
  const drift = products.length >= FEATURED_DRIFT_MIN;

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
              // Must stay false, and not for the reason the name suggests.
              // The plugin only registers its `mouseleave` and `focusout`
              // resumes when this is false (see its init: both are guarded on
              // `!options.stopOnInteraction`). Setting it true therefore does
              // not just change what a drag does — it silently removes the
              // only way the drift ever comes back after a hover or a tab-in,
              // so the row stops for good the first time a cursor crosses it.
              //
              // The touch problem it was reached for is real but belongs
              // elsewhere: on a phone there is no hover and no focus, and the
              // plugin's own pointerUp resume fires on `settle`, a fraction of
              // a second after the finger lifts. The pointerUp handler below
              // solves that by winning the race with a longer dwell, which
              // leaves these two resumes intact.
              stopOnInteraction: false,
            }),
          ]
        : [],
    [drift],
  );

  // Started on the same beat the entrance fires, handed to <Reveal> below
  // rather than run off a second observer of its own. The old arrangement
  // watched the <section>, whose py-32 put its trigger 128px above the one the
  // entrance used, so the two drifted further apart the slower you scrolled.
  const startDrift = useCallback(() => {
    const autoScroll = api?.plugins()?.autoScroll;
    if (!autoScroll) return;
    startedRef.current = true;
    // Longer than the stagger below takes to land, so the row comes to rest
    // before it starts moving rather than arriving and drifting at once.
    autoScroll.play(1600);
  }, [api]);

  useEffect(() => {
    const autoScroll = api?.plugins()?.autoScroll;
    if (!api || !autoScroll) return;

    /*
     * Gives a drag real dwell before the row moves again. The plugin has its
     * own pointerUp resume, which waits only for `settle` — on a phone that is
     * a fraction of a second after the finger lifts, so the strip snaps back
     * into drifting under the thumb.
     *
     * This wins by getting there first rather than by fighting: the plugin
     * registers during carousel init, we register after `setApi`, and embla
     * calls listeners in registration order. Its handler only *arms* a settle
     * listener; ours starts the timer and flips the plugin's own
     * `autoScrollActive` guard, so when settle does fire its start is a no-op.
     */
    const resume = () => autoScroll.play(RESUME_AFTER_INTERACTION);
    api.on("pointerUp", resume);
    return () => {
      api.off("pointerUp", resume);
    };
  }, [api]);

  /*
   * Stops the drift while the strip is off screen, and picks it up again when
   * it comes back. Without this the row runs for the rest of the session once
   * it has started — a permanent rAF on the shop's most-visited route, on an
   * audience mostly holding mid-range Android phones, animating something
   * nobody is looking at.
   *
   * A second observer on the section rather than a job for the entrance
   * trigger above: that one fires once, at the top of the card row, and is
   * deliberately never re-armed, because an entrance that replays is a glitch.
   * This one has to keep firing in both directions for as long as the page is
   * open. Same reason it does not reuse the sentinel — full margins here, so
   * the drift is already moving by the time the row is actually in view.
   */
  useEffect(() => {
    const el = sectionRef.current;
    const autoScroll = api?.plugins()?.autoScroll;
    if (!el || !autoScroll) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        // Only ever resumes something the entrance already started, so this
        // cannot race ahead of the first play's settling delay.
        if (startedRef.current) autoScroll.play();
      } else {
        autoScroll.stop();
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [api]);

  /*
   * Card stagger caps at four rather than six: four is what fits the viewport
   * at the container's max width, so steps five and six were staggering cards
   * nobody could see and pushing the last photo wipe out past 1.5s. The +2
   * keeps the cards just behind the header they belong to.
   */
  const cardIndex = (i: number) => Math.min(i, 3) + 2;

  // One step behind the last card that actually gets its own step.
  const linkIndex = cardIndex(products.length - 1) + 1;

  return (
    <section
      ref={sectionRef}
      aria-labelledby="featured-heading"
      className="featured-strip mx-auto max-w-360 px-5 py-32 md:px-16"
    >
      <Reveal group triggerRef={cardsRef} onReveal={startDrift}>
        {/* The header sits outside the Carousel now. It used to be inside so
            the arrows could read the embla context from up here; with the
            arrows gone there is nothing in this block that needs it. */}
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

        <Carousel
          opts={opts}
          plugins={plugins}
          setApi={setApi}
          aria-label="Featured pieces"
        >
          {/* The marker the entrance is observed on. Zero-height and aria
              -hidden, sitting immediately above the row so the sequence fires
              when the *cards* approach the fold rather than when the eyebrow
              does. Watched instead of the group wrapper, whose top edge is a
              section's padding plus a header higher up the page — far enough
              that the photo wipes, the most expensive gesture on the site, were
              measurably finishing below the fold before anyone saw them. */}
          <div ref={cardsRef} aria-hidden="true" className="h-0" />

          <CarouselContent className="mt-10 -ml-4 md:-ml-8">
            {products.map((product, i) => (
              <CarouselItem key={product.id} className={CAROUSEL_ITEM_CLASS}>
                <RevealItem
                  index={cardIndex(i)}
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
