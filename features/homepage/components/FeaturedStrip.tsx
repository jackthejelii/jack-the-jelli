"use client";

import { ArrowRight } from "lucide-react";
import AppLink from "@/components/layout/AppLink";
import Reveal, { RevealItem } from "@/components/layout/Reveal";
import {
  Carousel,
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
import type { Product } from "@/features/products/lib/types";

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
 * --reveal-delay means the row arrives as one gesture: heading, then arrows,
 * then cards, one --motion-stagger apart.
 */
export default function FeaturedStrip({ products }: { products: Product[] }) {
  // One step behind the last card, whatever the count — a fixed index would
  // leave a dead half-second before the link on a two-product strip.
  const linkIndex = Math.min(products.length - 1, 5) + 3;

  return (
    <section
      aria-labelledby="featured-heading"
      className="mx-auto max-w-360 px-5 py-32 md:px-16"
    >
      <Reveal group>
        {/* The Carousel wraps the header too, so the arrows can sit up there
            and still read the embla context — same arrangement as
            RelatedProducts. */}
        <Carousel
          opts={{ align: "start", slidesToScroll: "auto" }}
          aria-label="Featured pieces"
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <RevealItem index={0}>
              <p className="text-on-surface-variant text-[12px] font-semibold tracking-[0.1em] uppercase">
                The Selection
              </p>
              <h2
                id="featured-heading"
                className="text-foreground mt-2 font-serif text-[32px] leading-[1.3]"
              >
                Featured Pieces
              </h2>
            </RevealItem>

            <RevealItem index={1} className="flex items-center gap-2">
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
                    late. The +2 keeps the cards behind the header they belong
                    to. */}
                <RevealItem index={Math.min(i, 5) + 2}>
                  <ProductCard product={product} variant="quiet" />
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
