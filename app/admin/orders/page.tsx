import OrderFilters from "@/features/admin/components/OrderFilters";
import OrderTable from "@/features/admin/components/OrderTable";
import ProductPagination from "@/features/admin/components/ProductPagination";
import ReleaseDraftsButton from "@/features/admin/components/ReleaseDraftsButton";
import { getOrders } from "@/features/admin/lib/orders";
import { ADMIN_SETTABLE_STATUSES } from "@/features/orders/lib/order-status";
import type { AdminSettableStatus } from "@/features/admin/lib/types";

interface AdminOrdersProps {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}

export default async function AdminOrdersPage({
  searchParams,
}: AdminOrdersProps) {
  const params = await searchParams;

  // Anything unrecognised is dropped rather than passed to Mongo.
  const status = ADMIN_SETTABLE_STATUSES.find(
    (value): value is AdminSettableStatus => value === params.status,
  );
  const parsedPage = Number.parseInt(params.page ?? "1", 10);

  const { orders, total, page, totalPages, counts, staleDraftCount } =
    await getOrders({
      q: params.q,
      status,
      page: Number.isFinite(parsedPage) ? parsedPage : 1,
    });

  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="font-heading text-3xl tracking-widest">Order Manager</h1>
        <ReleaseDraftsButton count={staleDraftCount} />
      </header>

      <OrderFilters counts={counts} />

      <OrderTable orders={orders} filtered={Boolean(params.q || status)} />

      <ProductPagination
        page={page}
        totalPages={totalPages}
        total={total}
        params={{ q: params.q, status: params.status }}
        label="Order pages"
      />
    </div>
  );
}
