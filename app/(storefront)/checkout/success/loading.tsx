import { Skeleton } from "@/components/ui/skeleton";

/** The three "what happens next" cards below the receipt. */
const NEXT_STEPS = 3;
const RECEIPT_LINES = 3;

/**
 * The confirmation screen reads the receipt cookie and the session before it
 * can prove the order belongs to whoever is asking, so there is a real wait
 * here — and it lands right after checkout, the least forgiving moment on the
 * site to show a blank page.
 */
export default function CheckoutSuccessLoading() {
  return (
    <div className="mx-auto max-w-3xl px-5 pt-32 pb-32 md:px-16 md:pt-40">
      <div className="text-center">
        <Skeleton className="mx-auto h-11 w-72 rounded-none md:h-14" />
        <Skeleton className="mx-auto mt-4 h-5 w-full max-w-md rounded-none" />
      </div>

      <div className="mt-16 flex flex-col gap-6">
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

      <div className="mt-16 flex flex-col gap-8">
        {Array.from({ length: NEXT_STEPS }).map((_, index) => (
          <div key={index}>
            <Skeleton className="h-5 w-56 rounded-none" />
            <Skeleton className="mt-3 h-4 w-full rounded-none" />
            <Skeleton className="mt-2 h-4 w-3/4 rounded-none" />
          </div>
        ))}
      </div>
    </div>
  );
}
