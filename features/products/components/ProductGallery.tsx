"use client";

import { useEffect, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import ProductImage from "@/features/products/components/ProductImage";
import { cn } from "@/lib/utils";

interface ProductGalleryProps {
  /** Already resolved by the caller — never empty. */
  images: { url: string }[];
  alt: string;
}

export default function ProductGallery({ images, alt }: ProductGalleryProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const hasMultiple = images.length > 1;

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  return (
    // The whole gallery fades on mount, and ProductDetailView remounts it by
    // `key` whenever the colourway changes — so switching swatch dissolves one
    // photograph into the next instead of cutting. `fill-mode-both` means it
    // rests visible if the animation never runs.
    <div className="animate-in fade-in fill-mode-both ease-editorial flex flex-col gap-2 duration-(--motion-reveal)">
      <Carousel
        setApi={setApi}
        opts={{ loop: hasMultiple, active: hasMultiple }}
        className="w-full"
        aria-label={`${alt}: product images`}
      >
        <CarouselContent className="ml-0">
          {images.map((image, i) => (
            <CarouselItem key={`${image.url}-${i}`} className="pl-0">
              {/* Page background, not `surface-container`. The reference design
                  puts a surface panel behind these images, but that assumes the
                  photo fills the box — under object-contain a non-square source
                  leaves the panel showing as bars. Matching the page instead
                  lets the photo sit in open space, which is what the surface
                  was standing in for.
                  aspect-square matches ProductCard and the mandated 1:1 upload
                  spec. The height cap lives here (not on the row) so a short
                  viewport only shrinks the image, not the info column next to
                  it — `svh` so a collapsing mobile URL bar doesn't overshoot;
                  above ~2K the cap exceeds the column width and goes inert. */}
              <div className="bg-background relative aspect-square overflow-hidden lg:mx-auto lg:max-w-[calc(100svh-14rem)]">
                <ProductImage
                  src={image.url}
                  alt={
                    hasMultiple
                      ? `${alt}, view ${i + 1} of ${images.length}`
                      : alt
                  }
                  // Only the visible slide loads up front — see the multi-image
                  // note in next/image's docs (priority is deprecated in 16).
                  loading={i === 0 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : "auto"}
                  // Above the 1440px container cap the slot stops being 60vw —
                  // it settles at a fixed ~758px — so keep declaring 60vw there
                  // and the browser fetches roughly twice the pixels it needs.
                  sizes="(min-width: 1440px) 760px, (min-width: 1024px) 60vw, 100vw"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        {hasMultiple && (
          <>
            <CarouselPrevious
              variant="ghost"
              size="icon"
              className="bg-background/80 text-foreground hover:bg-foreground hover:text-background left-4 size-10 rounded-none transition-colors duration-300 disabled:opacity-40"
            />
            <CarouselNext
              variant="ghost"
              size="icon"
              className="bg-background/80 text-foreground hover:bg-foreground hover:text-background right-4 size-10 rounded-none transition-colors duration-300 disabled:opacity-40"
            />
          </>
        )}
      </Carousel>

      {hasMultiple && (
        // auto-fit tracks rather than a fixed 4/6 columns: with the two
        // photographs most pieces actually have, a six-column grid left four
        // empty cells trailing off under the picture, which reads as missing
        // content rather than as a short strip. The row now ends where the
        // thumbnails end. loading.tsx mirrors this.
        <div className="grid grid-cols-[repeat(auto-fit,minmax(0,5rem))] justify-start gap-2 sm:grid-cols-[repeat(auto-fit,minmax(0,7.5rem))]">
          {images.map((image, i) => (
            <button
              key={`thumb-${image.url}-${i}`}
              type="button"
              onClick={() => api?.scrollTo(i)}
              aria-label={`View image ${i + 1} of ${images.length}`}
              aria-current={i === current}
              className={cn(
                "bg-surface-container relative aspect-square overflow-hidden border transition-opacity duration-300",
                i === current
                  ? "border-foreground opacity-100"
                  : "border-transparent opacity-60 hover:opacity-100",
              )}
            >
              <ProductImage
                src={image.url}
                alt=""
                // Tracks the auto-fit strip above: 120px is the desktop cell,
                // 80px the mobile one.
                sizes="(min-width: 640px) 120px, 80px"
                // Matches the slide it selects — a cropped thumbnail would
                // preview a framing the main image never shows.
                className="object-contain"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
