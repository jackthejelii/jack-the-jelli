"use client";

import AppLink from "@/components/layout/AppLink";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { ArrowRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  cartCount,
  cartSubtotal,
  useCartHydrated,
  useCartStore,
} from "@/features/cart/lib/cartStore";
import { useCartRevalidation } from "@/features/cart/hooks/useCartRevalidation";
import { lineKey } from "@/features/cart/lib/types";
import CartLine from "@/features/cart/components/CartLine";
import {
  amountToFreeDelivery,
  FREE_DELIVERY_THRESHOLD,
} from "@/features/checkout/lib/delivery";
import { formatPrice } from "@/features/products/lib/format";

/**
 * The slide-over cart. Mounted once in the NavBar rather than per page, so the
 * open/closed state and the revalidation it triggers survive navigation.
 *
 * There is deliberately no /cart page — this plus /checkout is the whole flow.
 */
export default function CartSheet() {
  const isOpen = useCartStore((state) => state.isOpen);
  const setOpen = useCartStore((state) => state.setOpen);
  const closeCart = useCartStore((state) => state.closeCart);
  const items = useCartStore((state) => state.items);
  const withdrawn = useCartStore((state) => state.withdrawn);
  const hydrated = useCartHydrated();
  const pathname = usePathname();

  // Re-prices and re-checks stock every time the sheet is opened.
  useCartRevalidation(isOpen);

  // /checkout renders its own summary, and leaving the sheet open over it
  // would put two live copies of the cart on screen at once.
  useEffect(() => {
    if (pathname.startsWith("/checkout")) closeCart();
  }, [pathname, closeCart]);

  // Until the persisted cart is read back, the sheet must render what the
  // server rendered: nothing.
  const lines = hydrated ? items : [];
  const count = cartCount(lines);
  const subtotal = cartSubtotal(lines);
  const shortfall = amountToFreeDelivery(subtotal);
  const hasSoldOut = lines.some((line) => line.maxQty === 0);

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      {/* The shadcn primitive slides in on `ease-in-out`, which is the one
          curve the rest of the site never uses. Overridden here rather than in
          components/ui/sheet.tsx so the primitive stays what the CLI
          generated: same distance, same duration band, the site's curve. */}
      <SheetContent
        side="right"
        className="bg-background ease-editorial w-full gap-0 border-l p-0 duration-300 sm:max-w-md"
      >
        <SheetHeader className="border-outline-variant/20 border-b px-6 py-6">
          <SheetTitle className="font-serif text-[24px] leading-tight font-normal tracking-tight">
            Your Cart
          </SheetTitle>
          <SheetDescription className="text-on-surface-variant text-[12px] font-semibold tracking-[0.1em] uppercase">
            {count === 0
              ? "Empty"
              : `${count} ${count === 1 ? "piece" : "pieces"}`}
          </SheetDescription>
        </SheetHeader>

        {/* Rendered above both branches on purpose: withdrawing the only line
            empties the cart, and that is exactly when the explanation matters
            most. Safe for hydration — `withdrawn` is never persisted, so the
            server and the client's first paint both start empty. */}
        {withdrawn.length > 0 && (
          <p
            role="status"
            className="border-outline-variant/20 text-on-surface-variant border-b px-6 py-4 text-[13px] leading-relaxed"
          >
            {withdrawn.length === 1
              ? `${withdrawn[0]} is no longer available and has been removed.`
              : `${withdrawn.length} pieces are no longer available and have been removed.`}
          </p>
        )}

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
            <p className="text-on-surface-variant text-[16px] leading-relaxed">
              Nothing here yet. Every piece is made in small numbers.
            </p>
            <AppLink
              href="/collection"
              onClick={closeCart}
              className="border-foreground text-foreground hover:bg-foreground hover:text-background inline-flex items-center justify-center border px-8 py-3.5 text-[12px] font-semibold tracking-[0.1em] uppercase transition-colors duration-300"
            >
              Browse the collection
            </AppLink>
          </div>
        ) : (
          <>
            <ul data-lenis-prevent className="flex-1 overflow-y-auto px-6">
              {lines.map((line) => (
                <CartLine
                  key={lineKey(line)}
                  line={line}
                  onNavigate={closeCart}
                />
              ))}
            </ul>

            <div className="border-outline-variant/20 border-t px-6 py-6">
              <div className="flex items-baseline justify-between">
                <span className="text-on-surface-variant text-[12px] font-semibold tracking-[0.1em] uppercase">
                  Subtotal
                </span>
                <span className="text-foreground font-serif text-[22px] tabular-nums">
                  {formatPrice(subtotal)}
                </span>
              </div>

              <p className="text-on-surface-variant mt-2 text-[13px] leading-relaxed">
                {shortfall > 0
                  ? `Delivery calculated at checkout. Free above ${formatPrice(FREE_DELIVERY_THRESHOLD)}.`
                  : "Delivery is on us."}
              </p>

              {hasSoldOut && (
                <p className="text-destructive mt-3 text-[13px]" role="alert">
                  Remove the sold-out piece to continue.
                </p>
              )}

              {hasSoldOut ? (
                <span
                  aria-disabled="true"
                  className="bg-foreground text-background mt-5 inline-flex w-full items-center justify-center gap-2 py-4 text-[12px] font-semibold tracking-[0.1em] uppercase opacity-40"
                >
                  Checkout
                </span>
              ) : (
                <AppLink
                  href="/checkout"
                  onClick={closeCart}
                  className="bg-foreground text-background hover:bg-secondary group mt-5 inline-flex w-full items-center justify-center gap-2 py-4 text-[12px] font-semibold tracking-[0.1em] uppercase transition-colors duration-300"
                >
                  Checkout
                  <ArrowRight
                    className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </AppLink>
              )}

              <button
                type="button"
                onClick={closeCart}
                className="text-on-surface-variant hover:text-foreground mt-4 w-full text-[12px] font-semibold tracking-[0.1em] uppercase transition-colors duration-300"
              >
                Continue shopping
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
