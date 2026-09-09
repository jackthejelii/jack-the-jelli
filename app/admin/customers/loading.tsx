import { Skeleton } from "@/components/ui/skeleton";
import AdminTableSkeleton from "@/features/admin/components/AdminTableSkeleton";

export default function AdminCustomersLoading() {
  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-72 rounded-none" />
          {/* The standfirst wraps to two lines at narrow widths. */}
          <Skeleton className="h-4 w-full max-w-lg rounded-none" />
        </div>
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-10 w-full rounded-none sm:max-w-sm" />
        <Skeleton className="h-10 w-40 rounded-none" />
      </div>

      <AdminTableSkeleton columns={7} />
    </div>
  );
}
