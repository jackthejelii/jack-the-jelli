import Image from "next/image";
import { formatPrice } from "@/features/products/lib/format";
import { formatBdPhone } from "@/features/orders/lib/phone";
import type { OrderDTO } from "@/features/orders/lib/order-types";

/**
 * The itemised order, shared by /checkout/success and /track.
 *
 * A server component with no interactivity: every value comes from the order's
 * own snapshot, so nothing here can drift when a product is later renamed,
 * repriced or archived.
 */
export default function OrderReceipt({ order }: { order: OrderDTO }) {
  const { shippingAddress: address } = order;

  return (
    <div className="border-outline-variant/20 border">
      <ul className="divide-outline-variant/20 divide-y">
        {order.items.map((item) => (
          <li
            key={`${item.productId}-${item.sku}`}
            className="flex items-center gap-5 px-5 py-5 md:px-6"
          >
            <div className="bg-surface-container relative size-16 shrink-0 overflow-hidden">
              <Image
                src={item.thumbnail || "/image-placeholder.jpg"}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-on-surface-variant text-[10px] font-semibold tracking-[0.1em] uppercase">
                {item.sku}
              </p>
              <p className="text-foreground mt-1 font-serif text-[17px] leading-snug">
                {item.name}
              </p>
              {item.color && (
                <p className="text-on-surface-variant mt-0.5 text-[13px]">
                  {item.color}
                </p>
              )}
              <p className="text-on-surface-variant mt-0.5 text-[13px]">
                {formatPrice(item.price)} × {item.qty}
              </p>
            </div>
            <p className="text-foreground shrink-0 text-[15px] tabular-nums">
              {formatPrice(item.lineTotal)}
            </p>
          </li>
        ))}
      </ul>

      <dl className="border-outline-variant/20 flex flex-col gap-3 border-t px-5 py-5 text-left md:px-6">
        <div className="flex items-baseline justify-between">
          <dt className="text-on-surface-variant text-[15px]">Subtotal</dt>
          <dd className="text-foreground text-[15px] tabular-nums">
            {formatPrice(order.subtotal)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt className="text-on-surface-variant text-[15px]">Delivery</dt>
          <dd className="text-foreground text-[15px] tabular-nums">
            {order.deliveryFee === 0 ? "Free" : formatPrice(order.deliveryFee)}
          </dd>
        </div>
        <div className="border-outline-variant/20 mt-2 flex items-baseline justify-between border-t pt-4">
          <dt className="text-foreground text-[12px] font-semibold tracking-[0.1em] uppercase">
            Total due on delivery
          </dt>
          <dd className="text-foreground font-serif text-[26px] leading-none tabular-nums">
            {formatPrice(order.totalAmount)}
          </dd>
        </div>
      </dl>

      <div className="border-outline-variant/20 border-t px-5 py-5 text-left md:px-6">
        <p className="text-on-surface-variant text-[12px] font-semibold tracking-[0.1em] uppercase">
          Delivering to
        </p>
        <p className="text-foreground mt-3 text-[15px] leading-relaxed">
          {address.fullName}
          <br />
          {address.street}
          <br />
          {address.thana}, {address.district}, {address.division}
          <br />
          {formatBdPhone(address.phone)}
        </p>
        {address.notes && (
          <p className="text-on-surface-variant mt-3 text-[13px] leading-relaxed italic">
            “{address.notes}”
          </p>
        )}
      </div>
    </div>
  );
}
