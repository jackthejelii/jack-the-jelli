import Image from "next/image";
import { Package } from "lucide-react";
import { formatPrice } from "@/features/products/lib/format";
import type { OrderDTO } from "@/features/orders/lib/order-types";

/**
 * The itemised order and what the courier collects.
 *
 * The admin twin of features/orders/components/OrderReceipt — deliberately not
 * shared with it. That one renders in the storefront's token set; this one is in
 * the admin panel's, and every line here is a per-unit SKU-first read for
 * whoever is packing the box rather than a customer's receipt.
 *
 * Keeps its own heading rather than OrderPanel's: this one leads the column in
 * serif and carries the unit count opposite it.
 */
export default function OrderItemsPanel({
  order,
  unitCount,
}: {
  order: OrderDTO;
  unitCount: number;
}) {
  return (
    <section className="border-border space-y-6 border p-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-heading text-foreground text-lg">Order Items</h2>
          <div className="bg-border mt-2 h-px w-16" />
        </div>
        <p className="text-muted-foreground/80 text-xs font-semibold tracking-widest uppercase">
          {unitCount} Unit{unitCount === 1 ? "" : "s"} Total
        </p>
      </div>

      <div className="space-y-4">
        {order.items.map((item) => (
          <div
            key={`${item.productId}-${item.sku}`}
            className="border-border hover:bg-accent/20 flex items-center gap-6 border px-5 py-5 transition-colors duration-300"
          >
            <div className="bg-accent relative size-20 shrink-0 overflow-hidden">
              {item.thumbnail ? (
                <Image
                  src={item.thumbnail}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              ) : (
                <div className="text-muted-foreground/30 flex size-full items-center justify-center">
                  <Package className="size-6" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-muted-foreground/40 mb-1 text-[10px] font-semibold tracking-widest uppercase">
                SKU: {item.sku}
              </p>
              <h3 className="font-heading text-foreground text-base">
                {item.name}
              </h3>
              {/* The colour is what the packing list is picked by, so it sits
                  with the name rather than in a detail line below the price. */}
              {item.color && (
                <p className="text-foreground mt-0.5 text-sm">{item.color}</p>
              )}
              <p className="text-muted-foreground mt-0.5 text-sm">
                {formatPrice(item.price)} each
              </p>
            </div>
            <div className="text-right">
              <p className="text-foreground text-sm font-semibold">
                {formatPrice(item.lineTotal)}
              </p>
              <p className="text-muted-foreground/40 mt-1 text-[10px] font-semibold tracking-widest uppercase">
                Qty: {item.qty}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-border border-t pt-6">
        <div className="flex flex-col items-end space-y-4">
          <div className="w-full space-y-3 md:w-72">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">
                {formatPrice(order.subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Delivery ({order.shippingAddress.district})
              </span>
              <span className="text-foreground">
                {order.deliveryFee === 0
                  ? "Free"
                  : formatPrice(order.deliveryFee)}
              </span>
            </div>
          </div>
          <div className="bg-border h-px w-full md:w-72" />
          <div className="flex w-full items-center justify-end md:w-72">
            <span className="text-foreground text-xs font-semibold tracking-widest uppercase">
              Total to collect
            </span>
            <span className="font-heading text-foreground ml-6 text-3xl">
              {formatPrice(order.totalAmount)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
