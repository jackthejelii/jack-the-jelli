import { Skeleton } from "@/components/ui/skeleton";
import AdminTableSkeleton from "@/features/admin/components/AdminTableSkeleton";

/**
 * Covers the order manager only. It used to sit at `app/admin/loading.tsx` and
 * double as the fallback for every admin child route without one of its own;
 * that general-purpose job stayed behind in the file at that path, and this
 * one is now free to be shaped like the screen it actually stands in for.
 *
 * It renders inside app/admin/layout.tsx, so the sidebar is already on screen
 * and only the content column is stood in for — the layout's requireAdmin()
 * has resolved by the time this shows.
 */
export default function AdminOrdersLoading() {
  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <Skeleton className="h-9 w-64 rounded-none" />
        <Skeleton className="h-10 w-40 rounded-none" />
      </header>

      {/* OrderFilters: a search box beside the status tabs. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-10 w-full rounded-none sm:max-w-sm" />
        <Skeleton className="h-10 w-64 rounded-none" />
      </div>

      <AdminTableSkeleton columns={5} minWidth="min-w-3xl" />
    </div>
  );
}
