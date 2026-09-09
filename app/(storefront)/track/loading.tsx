import { Skeleton } from "@/components/ui/skeleton";

/**
 * The heading and standfirst are static copy, so they are rendered for real
 * rather than greyed out — skeletoning text we already have would be a
 * downgrade, and it guarantees this block doesn't move when the form arrives.
 * Only TrackOrderForm, which waits on `searchParams`, is stood in for.
 */
export default function TrackOrderLoading() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col px-5 pt-32 pb-32 md:px-16 md:pt-40">
      <header className="mb-16 text-center">
        <h1 className="text-foreground font-serif text-[40px] leading-[1.1] tracking-tight md:text-[56px]">
          Track Your Order
        </h1>
        <p className="text-on-surface-variant mx-auto mt-4 max-w-md text-[18px] leading-relaxed">
          Enter your order number and the phone number you gave to see where
          your piece is.
        </p>
      </header>

      <div className="flex flex-col gap-6">
        <div>
          <Skeleton className="h-4 w-32 rounded-none" />
          <Skeleton className="mt-3 h-11 w-full rounded-none" />
        </div>
        <div>
          <Skeleton className="h-4 w-28 rounded-none" />
          <Skeleton className="mt-3 h-11 w-full rounded-none" />
        </div>
        <Skeleton className="mt-2 h-12 w-full rounded-none" />
      </div>
    </div>
  );
}
