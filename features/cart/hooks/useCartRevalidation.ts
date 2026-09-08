"use client";

import { useEffect } from "react";
import { revalidateCart } from "@/features/cart/lib/cart-actions";
import { useCartStore } from "@/features/cart/lib/cartStore";

/**
 * Refresh the cart against the database while `active` is true — the sheet
 * being open, or /checkout being on screen.
 *
 * The current lines are read through `getState()` rather than a subscription
 * on purpose: reconcile() writes to `items`, so depending on `items` here
 * would re-fire the effect from its own result and loop forever.
 *
 * Purely a display refresh, which is why it reports nothing back and swallows
 * its own failures. placeOrder recomputes every price and re-checks every
 * stock level server-side regardless, so the worst case here is a stale
 * figure on screen — never a wrong charge.
 */
export function useCartRevalidation(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    // Pairs, not bare ids: stock lives on the colourway now, so the product
    // alone can't answer "how many are left".
    const lines = useCartStore.getState().items.map((line) => ({
      productId: line.productId,
      variantId: line.variantId,
    }));
    if (lines.length === 0) return;

    let cancelled = false;

    revalidateCart(lines)
      .then((snapshots) => {
        if (!cancelled) useCartStore.getState().reconcile(snapshots);
      })
      .catch(() => {
        // See above: a failed refresh leaves the last known prices on screen.
      });

    return () => {
      cancelled = true;
    };
  }, [active]);
}
