"use client";

import { useEffect, useRef, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartCount, useCartStore } from "@/features/cart/lib/cartStore";

/**
 * The NavBar's cart trigger. Its own component so the badge — the one piece of
 * chrome that reads persisted state — can re-render without the rest of the
 * nav subscribing to the cart.
 */
export default function CartButton() {
  const openCart = useCartStore((state) => state.openCart);
  // 0 until the persisted cart is read back, matching the server's render.
  const count = useCartCount();

  /*
   * Adding from the grid confirms itself with a toast in the corner, which
   * leaves nothing changed where the shopper is actually looking. The badge
   * beats once when the count goes up so the cart itself acknowledges it.
   *
   * Only on an increase, and never on the first pass: the initial change is
   * the persisted cart being read back after hydration, which is not something
   * the shopper just did. `pulse` doubles as the key, so each addition
   * restarts the animation rather than being swallowed while one is running.
   */
  const previousCount = useRef<number | null>(null);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const previous = previousCount.current;
    previousCount.current = count;
    if (previous === null) return;
    if (count > previous) setPulse((n) => n + 1);
  }, [count]);

  return (
    <button
      type="button"
      onClick={openCart}
      // Where an added piece flies to — features/cart/lib/fly-to-cart.ts finds
      // it by this attribute rather than by a ref, since the thing being
      // animated is a detached clone in `document.body`, not part of any tree
      // this button shares.
      data-cart-target=""
      // Negative margin holds the icon in place while the padding gives it a
      // 40px hit area; bare, it was a 20px target.
      className="text-foreground focus-visible:ring-ring/50 ease-editorial relative -m-2.5 p-2.5 outline-hidden transition-opacity duration-(--motion-quick) hover:opacity-70 focus-visible:ring-3"
      aria-label={
        count === 0 ? "Cart: empty" : `Cart: ${count} pieces. Open cart.`
      }
    >
      <ShoppingBag className="h-5 w-5" aria-hidden="true" />
      {count > 0 && (
        <span
          key={pulse}
          aria-hidden="true"
          className={cn(
            "bg-foreground text-background absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center text-[10px] leading-none font-semibold tabular-nums",
            pulse > 0 && "cart-tick",
          )}
        >
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
}
