import { Skeleton } from "@/components/ui/skeleton";

/**
 * Checkout reads the session and then the `user` collection for the stored
 * phone, so there is a real gap before CheckoutView renders. Mirrors its
 * 7/5 split and the address block's two-column field grid.
 */
const SUMMARY_LINES = 3;

export default function CheckoutLoading() {
  return (
    <div className="mx-auto max-w-360 px-5 pt-32 pb-32 md:px-16 md:pt-40">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <Skeleton className="h-10 w-72 rounded-none md:h-12" />

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {Array.from({ length: 5 }).map((_, index) => (
              // The last field spans both columns in the real form.
              <div key={index} className={index === 4 ? "sm:col-span-2" : ""}>
                <Skeleton className="h-4 w-28 rounded-none" />
                <Skeleton className="mt-3 h-11 w-full rounded-none" />
              </div>
            ))}
          </div>

          <Skeleton className="mt-10 h-14 w-full rounded-none" />
        </div>

        <div className="lg:col-span-5">
          <Skeleton className="h-6 w-36 rounded-none" />

          <div className="mt-8 flex flex-col gap-6">
            {Array.from({ length: SUMMARY_LINES }).map((_, index) => (
              <div key={index} className="flex items-center gap-4">
                <Skeleton className="size-14 shrink-0 rounded-none" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/4 rounded-none" />
                  <Skeleton className="mt-2 h-4 w-1/3 rounded-none" />
                </div>
              </div>
            ))}
          </div>

          <div className="border-outline-variant/20 mt-8 border-t pt-6">
            <Skeleton className="h-5 w-full rounded-none" />
            <Skeleton className="mt-3 h-5 w-2/3 rounded-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
