import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import OrderCustomerPanel from "@/features/admin/components/OrderCustomerPanel";
import OrderHistoryPanel from "@/features/admin/components/OrderHistoryPanel";
import OrderItemsPanel from "@/features/admin/components/OrderItemsPanel";
import OrderPanel from "@/features/admin/components/OrderPanel";
import OrderStatusControls from "@/features/admin/components/OrderStatusControls";
import { getOrderByNumber } from "@/features/admin/lib/orders";
import { ORDER_STATUS_COPY } from "@/features/orders/lib/order-status";

/**
 * A Server Component on real data — the mock array and the `setTimeout` "save"
 * that used to back this screen are gone. Route param is the order number, not
 * an ObjectId: it's what the customer reads out on the phone.
 *
 * Loads the order and composes the panels; the panels themselves live in
 * features/admin/components. Every value they render comes from the order's own
 * snapshot, so editing or deleting a product afterwards can never rewrite what
 * was bought.
 */
export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Admin data is never baked into a build. These pages read no cookies,
  // headers or searchParams of their own, so without this Next would try to
  // prerender them and fail on the clock read inside Mongoose. connection()
  // is what `export const dynamic = "force-dynamic"` used to say, in the form
  // Cache Components accepts.
  await connection();

  const { id } = await params;
  const order = await getOrderByNumber(id);
  if (!order) notFound();

  const unitCount = order.items.reduce((total, item) => total + item.qty, 0);

  return (
    <div className="flex flex-col gap-12">
      <header className="border-border flex flex-col gap-4 border-b pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-4">
          <Link
            href="/admin/orders"
            className="text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span className="text-xs font-semibold tracking-widest uppercase">
              Back to Orders
            </span>
          </Link>
          <h1 className="font-heading text-foreground text-2xl tracking-wide">
            Order {order.orderNumber}
          </h1>
          <p className="text-muted-foreground text-sm">
            Placed{" "}
            {new Date(order.placedAt ?? order.createdAt).toLocaleString(
              "en-GB",
              {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              },
            )}{" "}
            · {ORDER_STATUS_COPY[order.status].description}
          </p>
        </div>

        {order.status === "Pending" && (
          <Button
            asChild
            className="rounded-none px-8 py-6 text-sm tracking-widest uppercase"
          >
            {/* The anti-fake-order gate: nothing gets packed until someone
                rings the customer. */}
            <a href={`tel:${order.shippingAddress.phone}`}>
              <Phone className="size-4" />
              Call to confirm
            </a>
          </Button>
        )}
      </header>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="space-y-8 lg:col-span-4">
          <OrderCustomerPanel order={order} />

          <OrderPanel title="Delivery & Payment">
            <OrderStatusControls
              orderNumber={order.orderNumber}
              status={order.status}
              paymentStatus={order.paymentStatus}
              unitCount={unitCount}
            />
          </OrderPanel>

          <OrderHistoryPanel history={order.statusHistory} />
        </div>

        <div className="lg:col-span-8">
          <OrderItemsPanel order={order} unitCount={unitCount} />
        </div>
      </div>
    </div>
  );
}
