import { Skeleton } from "@/components/ui/skeleton";
import AdminTableSkeleton from "@/features/admin/components/AdminTableSkeleton";

/**
 * Shaped like the two worklists that arrive. The page is uncached by design
 * (see its comment), so this is what an operator sees on every visit rather
 * than only the first.
 */
export default function AdminLogisticsLoading() {
  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col gap-2">
        <Skeleton className="h-9 w-56 rounded-none" />
        <Skeleton className="h-4 w-96 max-w-full rounded-none" />
      </header>

      <div className="flex flex-col gap-4">
        <Skeleton className="h-7 w-52 rounded-none" />
        <AdminTableSkeleton columns={7} minWidth="min-w-3xl" />
      </div>

      <div className="flex flex-col gap-4">
        <Skeleton className="h-7 w-52 rounded-none" />
        <AdminTableSkeleton columns={5} minWidth="min-w-3xl" />
      </div>
    </div>
  );
}
