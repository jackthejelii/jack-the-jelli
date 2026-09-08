/**
 * A cart line reduced to the only fields the server ever stores or reads.
 * The same shape the checkout hidden input submits — everything else about a
 * line is a display snapshot the server recomputes rather than trusts.
 *
 * The identity is the *pair*: a product alone no longer names something that
 * can be bought, because stock, SKU and photographs all live on the colourway.
 */
export interface CartLineInput {
  productId: string;
  variantId: string;
  qty: number;
}

/**
 * The key a cart line is addressed by, everywhere — the store's `setQty` and
 * `removeItem`, the reconcile lookup, the sheet's React key, and the map
 * `placeOrder` matches its loaded products against.
 *
 * It lives here, in the one module both the `"use client"` store and the
 * `"use server"` actions can import, precisely so the two can never disagree
 * about what makes two lines the same line.
 */
export function lineKey(line: {
  productId: string;
  variantId: string;
}): string {
  return `${line.productId}:${line.variantId}`;
}

/**
 * What the server says about a line the browser is holding.
 *
 * Lives outside cart-actions.ts because a `"use server"` module is only meant
 * to export async functions, and outside cartStore.ts because that file is
 * `"use client"` — this shape has to be importable from both sides.
 */
export interface CartSnapshot {
  productId: string;
  variantId: string;
  name: string;
  /** The colourway's display name, refreshed in case an admin renamed it. */
  color: string;
  hex: string;
  slug: string;
  price: number;
  thumbnail?: string;
  stock: number;
  /**
   * False when the product is no longer Published, no longer exists, or no
   * longer carries this colourway — a variant an admin deleted leaves the
   * product perfectly valid and the line pointing at nothing.
   */
  available: boolean;
}

/** A line `placeOrder` refused, with enough detail for the cart to offer a fix. */
export interface UnavailableLine {
  productId: string;
  variantId: string;
  name: string;
  /** Named alongside the product so "Sold out" says *which* colour sold out. */
  color: string;
  /** How many are actually left. 0 means sold out. */
  available: number;
  requested: number;
  reason: "sold-out" | "insufficient-stock" | "unpublished";
}
