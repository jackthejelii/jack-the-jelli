import { Skeleton } from "@/components/ui/skeleton";

/**
 * Closer than the inherited `app/admin/loading.tsx`, and shaped like the tab
 * strip and single card that actually arrive.
 */
export default function AdminSettingsLoading() {
  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <Skeleton className="h-9 w-48 rounded-none" />
      </header>

      <div className="flex flex-col gap-8">
        <Skeleton className="h-10 w-full max-w-md rounded-none" />
        <Skeleton className="h-96 w-full rounded-none" />
      </div>
    </div>
  );
}
