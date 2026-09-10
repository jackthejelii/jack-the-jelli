"use client";

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

export default function RelatedProducts({ products }: { products: Product[] }) {
  if (products.length === 0) return null;

  return (
    <section
      aria-labelledby="related-products-heading"
      className="mx-auto max-w-360 px-5 pb-32 md:px-16"
    >
      {/* Rule sits inside the gutters so it lines up with the spec-list
          hairlines above it rather than running past them. */}
      <div className="border-outline-variant/20 border-t pt-16 md:pt-24">
        {/* The Carousel wraps the header too, so the arrows can sit up there
            and still read the embla context. */}
        <Carousel
          opts={{ align: "start", slidesToScroll: "auto" }}
          aria-label="Similar products"
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-on-surface-variant text-[12px] font-semibold tracking-[0.1em] uppercase">
                You may also like
              </p>
              <h2
                id="related-products-heading"
                className="text-foreground mt-2 font-serif text-[32px] leading-[1.3]"
              >
                Pieces at This Level
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <CarouselPrevious
                variant="ghost"
                className={CAROUSEL_ARROW_CLASS}
              />
              <CarouselNext variant="ghost" className={CAROUSEL_ARROW_CLASS} />
            </div>
          </div>

          <CarouselContent className="mt-10 -ml-4 md:-ml-8">
            {products.map((product, i) => (
              <CarouselItem key={product.id} className={CAROUSEL_ITEM_CLASS}>
                {/* Mount-triggered for the same reason as the collection
                    grid, and additionally because these sit in a carousel: a
                    scroll observer would leave the off-screen slides hidden
                    until they were scrolled into view. */}
                <div
                  className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both ease-editorial duration-(--motion-reveal)"
                  style={{
                    animationDelay: `calc(${Math.min(i, 5)} * var(--motion-stagger))`,
                  }}
                >
                  <ProductCard product={product} variant="quiet" />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </section>
  );
}
