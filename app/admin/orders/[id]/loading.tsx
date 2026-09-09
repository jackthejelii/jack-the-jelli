import { Skeleton } from "@/components/ui/skeleton";

/** Panels stacked below the header on the order detail page. */
const DETAIL_PANELS = 2;

export default function AdminOrderDetailLoading() {
  return (
    <div className="flex flex-col gap-12">
      <header className="border-border flex flex-col gap-4 border-b pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-4">
          <Skeleton className="h-4 w-32 rounded-none" />
          <Skeleton className="h-8 w-64 rounded-none" />
          <Skeleton className="h-4 w-80 max-w-full rounded-none" />
        </div>
        <Skeleton className="h-12 w-48 rounded-none" />
      </header>

      {Array.from({ length: DETAIL_PANELS }).map((_, panel) => (
        <div key={panel} className="border-border bg-card border p-6">
          <Skeleton className="h-4 w-40 rounded-none" />
          <div className="mt-6 flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, line) => (
              <Skeleton key={line} className="h-5 w-full rounded-none" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
