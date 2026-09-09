import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown while requireAuth() resolves the session. Mirrors AccountForm's
 * max-w-md column and its header/field rhythm so the real form lands in the
 * same place. Every Skeleton carries `rounded-none`: the base primitive ships
 * `rounded-md`, which this design system overrides at each call site.
 */
const FIELDS = 3;

export default function AccountLoading() {
  return (
    <div className="mx-auto w-full max-w-360 px-5 py-16 pt-32 md:px-16 md:pt-40">
      <div className="mx-auto flex w-full max-w-md flex-col gap-8">
        <div className="border-border border-b pb-6">
          <Skeleton className="h-9 w-40 rounded-none" />
        </div>

        {Array.from({ length: FIELDS }).map((_, index) => (
          <div key={index}>
            <Skeleton className="h-4 w-24 rounded-none" />
            <Skeleton className="mt-3 h-11 w-full rounded-none" />
          </div>
        ))}

        <Skeleton className="h-12 w-full rounded-none" />
      </div>
    </div>
  );
}
