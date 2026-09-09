import { Skeleton } from "@/components/ui/skeleton";

/** Timeline rails drawn while the order loads. Four is the common case. */
const TIMELINE_STEPS = 4;
const RECEIPT_LINES = 3;

/**
 * This route awaits the session and then the order itself, so it is two round
 * trips deep before anything paints. Mirrors the real page's back-link,
 * header rule, timeline and receipt blocks at their actual sizes.
 */
export default function MyOrderDetailLoading() {
  return (
    <div className="mx-auto max-w-3xl px-5 pt-32 pb-32 md:px-16 md:pt-40">
      <Skeleton className="mb-8 h-4 w-28 rounded-none" />

      <div className="border-outline-variant/20 mb-12 flex flex-wrap items-end justify-between gap-4 border-b pb-6">
        <div>
          <Skeleton className="h-9 w-52 rounded-none md:h-11" />
          <Skeleton className="mt-2 h-5 w-40 rounded-none" />
        </div>
        <div className="flex flex-col items-end">
          <Skeleton className="h-4 w-20 rounded-none" />
          <Skeleton className="mt-1 h-5 w-28 rounded-none" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        {Array.from({ length: TIMELINE_STEPS }).map((_, index) => (
          <div key={index} className="flex flex-1 flex-col items-center gap-3">
            <Skeleton className="size-4 rounded-none" />
            <Skeleton className="h-3 w-16 rounded-none" />
          </div>
        ))}
      </div>

      <div className="mt-16">
        <Skeleton className="border-outline-variant/20 mb-6 h-4 w-24 rounded-none" />
        <div className="flex flex-col gap-6">
          {Array.from({ length: RECEIPT_LINES }).map((_, index) => (
            <div key={index} className="flex items-center gap-4">
              <Skeleton className="size-16 shrink-0 rounded-none" />
              <div className="flex-1">
                <Skeleton className="h-5 w-2/3 rounded-none" />
                <Skeleton className="mt-2 h-4 w-1/4 rounded-none" />
              </div>
              <Skeleton className="h-5 w-20 rounded-none" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
