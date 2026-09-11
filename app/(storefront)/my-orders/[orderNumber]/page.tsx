import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAuth } from "@/lib/auth-guard";
import OrderReceipt from "@/features/orders/components/OrderReceipt";
import OrderTimeline from "@/features/orders/components/OrderTimeline";
import { getOrderForUser } from "@/features/orders/lib/orders";
import { PAYMENT_STATUS_COPY } from "@/features/orders/lib/order-status";

export const metadata: Metadata = {
  title: "Order",
  robots: { index: false, follow: false },
};

/**
 * Scoped to the signed-in user by the query itself — getOrderForUser filters
 * on `userId`, so someone else's order number resolves to nothing rather than
 * to a 403 that would confirm the order exists.
 */
export default async function MyOrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const session = await requireAuth("/my-orders");

  // Next has already decoded the param; decoding again would throw a URIError
  // on a crafted path like /my-orders/%zz and turn a 404 into a 500.
  const order = await getOrderForUser(orderNumber, session.user.id);
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-3xl px-5 pt-32 pb-32 md:px-16 md:pt-40">
      <Link
        href="/my-orders"
        className="text-on-surface-variant hover:text-foreground mb-8 inline-flex items-center gap-2 text-[12px] font-semibold tracking-[0.1em] uppercase transition-colors duration-300"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        My Orders
      </Link>

      <header className="border-outline-variant/20 mb-12 flex flex-wrap items-end justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-foreground font-serif text-[32px] leading-tight tracking-[0.06em] md:text-[40px]">
            {order.orderNumber}
          </h1>
          <p className="text-on-surface-variant mt-2 text-[15px]">
            Placed{" "}
            {new Date(order.placedAt ?? order.createdAt).toLocaleDateString(
              "en-GB",
              { day: "numeric", month: "long", year: "numeric" },
            )}
          </p>
        </div>
        <div className="text-right">
          <p className="text-on-surface-variant text-[12px] font-semibold tracking-[0.1em] uppercase">
            Payment
          </p>
          <p className="text-foreground mt-1 text-[15px]">
            {PAYMENT_STATUS_COPY[order.paymentStatus].customer}
          </p>
        </div>
      </header>

      <OrderTimeline order={order} />

      <div className="mt-16">
        <h2 className="border-outline-variant/20 text-on-surface-variant mb-6 border-b pb-3 text-[12px] font-semibold tracking-[0.1em] uppercase">
          Your order
        </h2>
        <OrderReceipt order={order} />
      </div>
    </div>
  );
}
