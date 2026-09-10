"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

interface ProductGalleryProps {
  /** Already resolved by the caller — never empty. */
  images: { url: string }[];
  alt: string;
}

/**
 * One gallery slide, fading up as its bytes land.
 *
 * Nothing in this codebase resizes or recompresses a product photograph, which
 * is a deliberate constraint and not one to work around — so these arrive as
 * full-size Cloudinary originals, and on the mobile connections most of this
 * shop's buyers are on, they used to snap in at full opacity the instant they
 * decoded. Against the near-white page that reads as a flicker rather than an
 * arrival.
 *
 * `onLoad` rather than a blur placeholder: `placeholder="blur"` needs a
 * `blurDataURL` per image, which for remote Cloudinary sources means either
 * generating one at upload time (a processing step this project does not do)
 * or shipping a second request per photo. A fade costs neither and is honest
 * about what it is.
 *
 * Starts opaque when the image is already complete — a cached photo, or a
 * remount on a swatch click — so switching colours never re-fades a picture
 * the browser already has.
 */
function GalleryImage({
  src,
  alt,
  loading,
  fetchPriority,
  sizes,
}: {
  src: string;
  alt: string;
  loading: "eager" | "lazy";
  fetchPriority: "high" | "auto";
  sizes: string;
}) {
  const [loaded, setLoaded] = useState(false);

  // A cached image can finish decoding before React attaches onLoad, and that
  // event never replays — the classic way a fade-in strands a photograph at
  // zero opacity forever. The ref callback catches that case on mount by
  // asking the element whether it is already done.
  const markIfComplete = (node: HTMLImageElement | null) => {
    if (node?.complete) setLoaded(true);
  };

  return (
    <Image
      src={src}
      alt={alt}
      fill
      ref={markIfComplete}
      loading={loading}
      fetchPriority={fetchPriority}
      sizes={sizes}
      onLoad={() => setLoaded(true)}
      // contain, not cover: the whole photo has to be visible on this page, so
      // the box mats the image rather than cropping it to fit.
      className={cn(
        "ease-editorial object-contain transition-opacity duration-(--motion-reveal)",
        loaded ? "opacity-100" : "opacity-0",
      )}
    />
  );
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
                <GalleryImage
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
              <Image
                src={image.url}
                alt=""
                fill
                // 120px only holds for the 6-column desktop strip; the mobile
                // strip is 4 columns of a much narrower gallery.
                sizes="(min-width: 1024px) 120px, (min-width: 640px) 16vw, 25vw"
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
