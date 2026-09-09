import { Skeleton } from "@/components/ui/skeleton";
import AdminTableSkeleton from "@/features/admin/components/AdminTableSkeleton";

export default function AdminProductsLoading() {
  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <Skeleton className="h-9 w-72 rounded-none" />
        <Skeleton className="h-12 w-36 rounded-none" />
      </header>

      {/* ProductFilters: search, then the stock and status selects. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-10 w-full rounded-none sm:max-w-sm" />
        <div className="flex gap-4">
          <Skeleton className="h-10 w-40 rounded-none" />
          <Skeleton className="h-10 w-40 rounded-none" />
        </div>
      </div>

      <AdminTableSkeleton columns={8} minWidth="min-w-220" />
    </div>
  );
}
