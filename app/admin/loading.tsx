import { Skeleton } from "@/components/ui/skeleton";

/**
 * The fallback for `/admin` itself, and for any admin child route that has no
 * closer `loading.tsx` of its own — today that means `/admin/products/new` and
 * `/admin/products/[id]`, which have always relied on this file rather than
 * carrying one each.
 *
 * That inheritance is why this file still exists after the order manager moved
 * out to `/admin/orders`: the order-table skeleton went with it, and without a
 * replacement here the two product forms would have silently lost their
 * fallback and flashed an empty column instead.
 *
 * Deliberately shape-agnostic. The old version was a table skeleton standing
 * in for a form, which is worse than a neutral block — it promises a layout
 * that never arrives. It renders inside app/admin/layout.tsx, so the sidebar
 * is already on screen and the layout's requireAdmin() has resolved.
 */
export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <Skeleton className="h-9 w-64 rounded-none" />
      </header>

      <div className="flex flex-col gap-4">
        <Skeleton className="h-32 w-full rounded-none" />
        <Skeleton className="h-32 w-full rounded-none" />
      </div>
    </div>
  );
}
