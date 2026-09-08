"use client";

import Image from "next/image";
import { ArrowRight, Loader2, Truck } from "lucide-react";
import { lineKey, type UnavailableLine } from "@/features/cart/lib/types";
import {
  lineLabel,
  useCartStore,
  type CartItem,
} from "@/features/cart/lib/cartStore";
import {
  amountToFreeDelivery,
  getDeliveryFee,
  getDeliveryZone,
} from "@/features/checkout/lib/delivery";
import { formatPrice } from "@/features/products/lib/format";

/**
 * The order summary column, and the only place the "Complete Order" button
 * lives — it sits inside the same <form> as the fields (the whole two-column
 * grid is one form), so no `form=` attribute plumbing is needed.
 *
 * Every figure here is a preview. placeOrder recomputes all of it from the
 * database and stores its own numbers; nothing rendered on this screen is
 * submitted as money.
 */
export default function CheckoutSummary({
  items,
  district,
  pending,
  unavailable,
  blocked,
  notice,
}: {
  items: CartItem[];
  district: string;
  pending: boolean;
  unavailable?: UnavailableLine[];
  /** True while a line can't be ordered — holds the submit button shut. */
  blocked: boolean;
  /** Form-level message from the last attempt, shown with the alert. */
  notice?: string;
}) {
  const setQty = useCartStore((state) => state.setQty);
  const removeItem = useCartStore((state) => state.removeItem);

  // revalidateCart clamps a line to the stock that's actually left, which can
  // be zero — the line stays so it can be shown as sold out rather than
  // silently vanishing. It must not be priced, and must not be submitted.
  const sellable = items.filter((line) => line.qty > 0);

  const subtotal = sellable.reduce(
    (total, line) => total + line.price * line.qty,
    0,
  );
  // Delivery can only be priced once a district is picked, so until then the
  // summary says so rather than quoting a number it might have to revise.
  const deliveryFee = district
    ? getDeliveryFee(getDeliveryZone(district), subtotal)
    : null;
  const total = subtotal + (deliveryFee ?? 0);
  const shortfall = amountToFreeDelivery(subtotal);

  return (
    <aside className="border-outline-variant bg-surface-container-low border p-6 md:p-8 lg:sticky lg:top-32">
      <h2 className="text-foreground font-serif text-[28px] leading-tight tracking-tight">
        Order Summary
      </h2>

      <ul className="border-outline-variant/20 mt-6 border-b pb-6">
        {items.map((line) => (
          <li key={lineKey(line)} className="flex gap-4 py-3">
            <div className="bg-surface-container relative h-16 w-14 shrink-0 overflow-hidden">
              <Image
                src={line.thumbnail || "/image-placeholder.jpg"}
                alt=""
                fill
                sizes="56px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-foreground text-[15px] leading-snug">
                {line.name}
              </p>
              {line.color && (
                <p className="text-on-surface-variant mt-0.5 flex items-center gap-1.5 text-[12px]">
                  <span
                    aria-hidden="true"
                    className="border-outline-variant/50 size-2.5 shrink-0 border"
                    style={{ backgroundColor: line.hex }}
                  />
                  {line.color}
                </p>
              )}
              <p
                className={`mt-1 text-[11px] font-semibold tracking-widest uppercase ${
                  line.qty > 0 ? "text-on-surface-variant" : "text-destructive"
                }`}
              >
                {line.qty > 0 ? `Qty ${line.qty}` : "Sold out"}
              </p>
            </div>
            <p className="text-foreground shrink-0 text-[14px] tabular-nums">
              {line.qty > 0 ? formatPrice(line.price * line.qty) : "—"}
            </p>
          </li>
        ))}
      </ul>

      {unavailable && unavailable.length > 0 && (
        <div
          role="alert"
          className="border-destructive/40 bg-destructive/5 mt-6 border p-4"
        >
          <p className="text-destructive text-[12px] font-semibold tracking-widest uppercase">
            Some pieces are no longer available
          </p>
          {notice && (
            <p className="text-on-surface-variant mt-2 text-[13px] leading-relaxed">
              {notice}
            </p>
          )}
          <ul className="mt-3 flex flex-col gap-3">
            {unavailable.map((line) => (
              <li key={lineKey(line)} className="text-[14px]">
                <p className="text-foreground">
                  {/* Named with its colour: "sold out" against a bare product
                      name is unreadable when the cart holds two of them. */}
                  {lineLabel(line)}:{" "}
                  {line.available === 0
                    ? "sold out"
                    : `only ${line.available} left, you asked for ${line.requested}`}
                </p>
                <div className="mt-1.5 flex gap-4">
                  {line.available > 0 && (
                    <button
                      type="button"
                      onClick={() => setQty(lineKey(line), line.available)}
                      className="text-foreground text-[12px] font-semibold tracking-widest uppercase underline underline-offset-4"
                    >
                      Reduce to {line.available}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeItem(lineKey(line))}
                    className="text-on-surface-variant hover:text-foreground text-[12px] font-semibold tracking-widest uppercase underline underline-offset-4"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <dl className="mt-6 flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <dt className="text-on-surface-variant text-[15px]">Subtotal</dt>
          <dd className="text-foreground text-[15px] tabular-nums">
            {formatPrice(subtotal)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-on-surface-variant text-[15px]">Delivery</dt>
          <dd className="text-foreground text-right text-[15px] tabular-nums">
            {deliveryFee === null
              ? "Select your district"
              : deliveryFee === 0
                ? "Free"
                : formatPrice(deliveryFee)}
          </dd>
        </div>
        {shortfall > 0 && (
          <p className="text-on-surface-variant text-[12px] leading-relaxed">
            Add {formatPrice(shortfall)} more for free delivery.
          </p>
        )}
      </dl>

      <div className="border-outline-variant/20 mt-6 flex items-baseline justify-between border-t pt-6">
        <span className="text-foreground text-[12px] font-semibold tracking-widest uppercase">
          Total
        </span>
        <span className="text-foreground font-serif text-[32px] leading-none tabular-nums">
          {formatPrice(total)}
        </span>
      </div>

      <button
        type="submit"
        disabled={pending || blocked || sellable.length === 0}
        className="bg-foreground text-background hover:bg-secondary group mt-6 inline-flex w-full items-center justify-center gap-2 py-4 text-[12px] font-semibold tracking-widest uppercase transition-colors duration-300 disabled:pointer-events-none disabled:opacity-40"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Placing your order…
          </>
        ) : (
          <>
            Complete Order
            <ArrowRight
              className="size-4 transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden="true"
            />
          </>
        )}
      </button>

      <p className="text-on-surface-variant mt-4 flex items-center justify-center gap-2 text-[12px]">
        <Truck className="size-3.5" aria-hidden="true" />
        Pay in cash when it arrives
      </p>
    </aside>
  );
}
