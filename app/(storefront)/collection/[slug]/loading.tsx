import { Skeleton } from "@/components/ui/skeleton";

export default function ProductLoading() {
  return (
    <>
      {/* Mirrors ProductDetailView's split layout so there's no shift on swap-in */}
      <div className="mx-auto max-w-360 px-5 pt-32 pb-32 md:px-16 md:pt-40">
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
          <div className="w-full lg:w-3/5">
            <Skeleton className="bg-surface-container aspect-square w-full rounded-none lg:mx-auto lg:max-w-[calc(100svh-14rem)]" />
            {/* Mirrors ProductGallery's auto-fit strip, and two thumbs rather
                than four — most pieces have two photographs, so four
                placeholders promised a strip that then shrank on swap-in. */}
            <div className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(0,5rem))] justify-start gap-2 sm:grid-cols-[repeat(auto-fit,minmax(0,7.5rem))]">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square" />
              ))}
            </div>
          </div>

          <div className="flex w-full flex-col lg:w-2/5">
            <Skeleton className="h-4 w-40 rounded-none" />
            <Skeleton className="mt-10 h-4 w-28 rounded-none" />
            <Skeleton className="mt-2 h-12 w-4/5 rounded-none md:h-16" />
            <Skeleton className="mt-4 h-6 w-32 rounded-none" />

            <div className="border-outline-variant/40 mt-8 border-t pt-6">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="mt-2 h-5 w-full" />
              <Skeleton className="mt-2 h-5 w-2/3" />
            </div>

            {/* "Colour", then the swatch row — chips now carry their names
                underneath, so the row stands ~54px tall rather than 24. */}
            <Skeleton className="mt-8 h-4 w-20" />
            <Skeleton className="mt-4 h-14 w-full" />

            {/* Stock line, then the full-width CTA. */}
            <Skeleton className="mt-8 h-4 w-36" />
            <Skeleton className="mt-4 h-13 w-full" />

            {/* The spec list: five hairline-ruled rows at py-6, so ~72px each
                rather than the 20px this used to draw. Matching the real
                height is the whole point of the placeholder — the old one let
                everything below the fold jump on swap-in. */}
            <div className="border-outline-variant/40 mt-8 border-b">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="border-outline-variant/40 flex justify-between gap-8 border-t py-6"
                >
                  <Skeleton className="h-4 w-24 shrink-0" />
                  <Skeleton className="h-4 w-2/5" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
