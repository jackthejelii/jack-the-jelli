"use client";

import Image from "next/image";
import AppLink from "@/components/layout/AppLink";
import { Minus, Plus, X } from "lucide-react";
import { useCartStore, type CartItem } from "@/features/cart/lib/cartStore";
import { MAX_LINE_QTY } from "@/features/cart/lib/limits";
import { formatPrice } from "@/features/products/lib/format";

/**
 * One line in the cart sheet. Split out of CartSheet because it owns the
 * stepper's bounds logic, which is fiddly enough to be worth reading on its
 * own.
 */
export default function CartLine({
  line,
  onNavigate,
}: {
  line: CartItem;
  /** Closes the sheet when the piece's own page is opened from inside it. */
  onNavigate: () => void;
}) {
  const setQty = useCartStore((state) => state.setQty);
  const removeItem = useCartStore((state) => state.removeItem);

  // maxQty is only known once revalidateCart has run; until then the stepper
  // trusts the global ceiling rather than blocking the customer.
  const ceiling = Math.min(line.maxQty ?? MAX_LINE_QTY, MAX_LINE_QTY);
  const soldOut = line.maxQty === 0;

  return (
    <li
      className={`border-outline-variant/20 flex gap-4 border-b py-6 ${
        soldOut ? "opacity-60" : ""
      }`}
    >
      <AppLink
        href={`/collection/${line.slug}`}
        onClick={onNavigate}
        tabIndex={-1}
        aria-hidden="true"
        className="bg-surface-container relative h-24 w-20 shrink-0 overflow-hidden"
      >
        <Image
          src={line.thumbnail || "/image-placeholder.jpg"}
          alt=""
          fill
          sizes="80px"
          className="object-cover"
        />
      </AppLink>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <AppLink
            href={`/collection/${line.slug}`}
            onClick={onNavigate}
            className="text-foreground hover:text-secondary font-serif text-[16px] leading-snug transition-colors duration-300"
          >
            {line.name}
          </AppLink>
          <button
            type="button"
            onClick={() => removeItem(line.productId)}
            aria-label={`Remove ${line.name} from cart`}
            className="text-on-surface-variant hover:text-foreground -m-1.5 shrink-0 p-1.5 transition-colors duration-300"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <p className="text-on-surface-variant mt-1 text-[13px]">
          {formatPrice(line.price)}
        </p>

        {soldOut ? (
          <p className="text-destructive mt-auto pt-3 text-[11px] font-semibold tracking-[0.1em] uppercase">
            Sold out. Please remove
          </p>
        ) : (
          <div className="mt-auto flex items-end justify-between gap-3 pt-3">
            <div className="border-outline-variant/40 inline-flex items-center border">
              <button
                type="button"
                onClick={() => setQty(line.productId, line.qty - 1)}
                aria-label={`Decrease quantity of ${line.name}`}
                className="text-foreground hover:bg-surface-container px-2.5 py-1.5 transition-colors duration-300"
              >
                <Minus className="size-3.5" aria-hidden="true" />
              </button>
              <span
                aria-live="polite"
                className="min-w-8 text-center text-[13px] tabular-nums"
              >
                {line.qty}
              </span>
              <button
                type="button"
                onClick={() => setQty(line.productId, line.qty + 1)}
                disabled={line.qty >= ceiling}
                aria-label={`Increase quantity of ${line.name}`}
                className="text-foreground hover:bg-surface-container px-2.5 py-1.5 transition-colors duration-300 disabled:pointer-events-none disabled:opacity-30"
              >
                <Plus className="size-3.5" aria-hidden="true" />
              </button>
            </div>

            <p className="text-foreground text-[14px] tabular-nums">
              {formatPrice(line.price * line.qty)}
            </p>
          </div>
        )}

        {/* Only shown once the server has confirmed the shortfall — before
            revalidateCart runs, maxQty is undefined and nothing is claimed. */}
        {!soldOut && line.maxQty !== undefined && line.qty >= line.maxQty && (
          <p className="text-on-surface-variant mt-2 text-[11px] tracking-wide">
            Only {line.maxQty} remaining
          </p>
        )}
      </div>
    </li>
  );
}
