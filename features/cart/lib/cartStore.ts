"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { MAX_LINE_QTY } from "@/features/cart/lib/limits";
import {
  lineKey,
  type CartLineInput,
  type CartSnapshot,
} from "@/features/cart/lib/types";

/**
 * The cart renders out of the browser — React memory, mirrored to localStorage
 * — so the badge and the sheet paint instantly with no fetch and no flash, for
 * guests and signed-in shoppers alike.
 *
 * For a signed-in shopper that mirror is backed by a Cart document in Mongo
 * (models/Cart.ts), pushed by CartSessionSync so the cart survives a new
 * device or a cleared browser. A guest's cart is localStorage and nothing else;
 * the server learns nothing about it until `placeOrder` runs.
 *
 * Nothing here is authoritative. `name`, `color`, `price` and `thumbnail` exist
 * only so the sheet renders instantly without a fetch; the server recomputes
 * every figure from the database and only ever reads the (productId, variantId)
 * pair and `qty`.
 */
export interface CartItem {
  productId: string;
  /** Which colourway. Half of the line's identity — see lineKey. */
  variantId: string;
  slug: string;
  name: string;
  /** The colourway's display name, e.g. "Black". Display only. */
  color: string;
  /** The swatch fill, so the sheet can show which colour without a fetch. */
  hex: string;
  /** Last known unit price, refreshed by revalidateCart. Display only. */
  price: number;
  thumbnail?: string;
  qty: number;
  /** Last known stock *of this colourway*, so the stepper can stop before the server has to. */
  maxQty?: number;
}

/** How a line names itself in a toast or a "no longer available" notice. */
export function lineLabel(line: { name: string; color: string }): string {
  // Comma, not an em-dash: the storefront's voice rule bans the em-dash from
  // rendered copy, and this string goes straight into a toast.
  return line.color ? `${line.name}, ${line.color}` : line.name;
}

/**
 * The idempotency key travels with the order and is `unique` on it, so a
 * double-clicked "Place Order" resolves to one row rather than two. It lives
 * in the store (not component state) precisely so it survives a re-render, a
 * failed submit and a page reload — and rotates on every cart mutation, since
 * a changed cart is a genuinely different order.
 */
function newIdempotencyKey(): string {
  // randomUUID needs a secure context; localhost counts, and so does every
  // deployment. The fallback keeps a plain-http preview from crashing.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface CartState {
  items: CartItem[];
  idempotencyKey: string;
  /** Sheet visibility — UI state, deliberately not persisted. */
  isOpen: boolean;
  /**
   * Labels of pieces the last reconcile had to drop because they are no longer
   * on sale. Always the result of the most recent reconcile — never persisted,
   * never accumulated — so it needs no explicit clearing and no effect.
   */
  withdrawn: string[];
  /**
   * Whose cart this is: a user id, or null for a guest. Persisted alongside the
   * items, and reconciled against the live session on every load by
   * CartSessionSync.
   *
   * Without it the cart belongs to the *browser* rather than the shopper —
   * sign out, sign in as someone else, and the previous account's pieces are
   * still sitting there. localStorage has no notion of who is signed in, so
   * the stamp has to be carried explicitly.
   */
  ownerId: string | null;

  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
  /** Both take a `lineKey`, never a bare product id — two colours, two lines. */
  setQty: (key: string, qty: number) => void;
  removeItem: (key: string) => void;
  /** Applies a fresh server snapshot: reprices, clamps, drops what's gone. */
  reconcile: (snapshots: CartSnapshot[]) => void;
  clear: () => void;
  /** Replaces the cart with the server's copy and stamps it with its owner. */
  adoptCart: (ownerId: string, lines: CartLineInput[]) => void;
  /**
   * Drops the local cart and leaves it unstamped. The saved copy lives on the
   * server under whoever owned it, so this destroys nothing. Used on sign-out,
   * and when a cart belonging to another account can't be swapped for the
   * signed-in one.
   */
  resetForSignOut: () => void;
  openCart: () => void;
  closeCart: () => void;
  setOpen: (open: boolean) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      idempotencyKey: newIdempotencyKey(),
      isOpen: false,
      withdrawn: [],
      ownerId: null,

      addItem: (item, qty = 1) =>
        set((state) => {
          const ceiling = Math.min(item.maxQty ?? MAX_LINE_QTY, MAX_LINE_QTY);
          const key = lineKey(item);
          const existing = state.items.find((line) => lineKey(line) === key);

          const items = existing
            ? state.items.map((line) =>
                lineKey(line) === key
                  ? {
                      // Re-snapshot the display fields: the tile that was just
                      // clicked is fresher than whatever the cart remembers.
                      ...line,
                      ...item,
                      qty: Math.min(line.qty + qty, ceiling),
                    }
                  : line,
              )
            : [...state.items, { ...item, qty: Math.min(qty, ceiling) }];

          return { items, idempotencyKey: newIdempotencyKey() };
        }),

      setQty: (key, qty) =>
        set((state) => {
          if (qty <= 0) {
            return {
              items: state.items.filter((line) => lineKey(line) !== key),
              idempotencyKey: newIdempotencyKey(),
            };
          }
          return {
            items: state.items.map((line) =>
              lineKey(line) === key
                ? {
                    ...line,
                    qty: Math.min(
                      qty,
                      line.maxQty ?? MAX_LINE_QTY,
                      MAX_LINE_QTY,
                    ),
                  }
                : line,
            ),
            idempotencyKey: newIdempotencyKey(),
          };
        }),

      removeItem: (key) =>
        set((state) => ({
          items: state.items.filter((line) => lineKey(line) !== key),
          idempotencyKey: newIdempotencyKey(),
        })),

      reconcile: (snapshots) =>
        set((state) => {
          const byKey = new Map(snapshots.map((s) => [lineKey(s), s]));
          let changed = false;
          const withdrawn: string[] = [];

          const items = state.items.flatMap((line) => {
            const fresh = byKey.get(lineKey(line));
            // Unpublished, archived or deleted since it was added — or the
            // colourway itself was removed from the product. There is nothing
            // to show a price or a stepper for, so the line has to go — but it
            // is named in `withdrawn` so the sheet can say what happened. A
            // piece disappearing from a cart with no explanation reads as the
            // shop losing the order.
            if (!fresh || !fresh.available) {
              changed = true;
              withdrawn.push(lineLabel(line));
              return [];
            }

            const qty = Math.max(
              0,
              Math.min(line.qty, fresh.stock, MAX_LINE_QTY),
            );
            // Out of stock entirely: keep the line at 0 so the sheet can say
            // "sold out" instead of the piece silently vanishing.
            const next: CartItem = {
              ...line,
              name: fresh.name,
              color: fresh.color,
              hex: fresh.hex,
              slug: fresh.slug,
              price: fresh.price,
              thumbnail: fresh.thumbnail,
              maxQty: fresh.stock,
              qty,
            };

            if (
              next.price !== line.price ||
              next.qty !== line.qty ||
              next.name !== line.name ||
              next.color !== line.color
            ) {
              changed = true;
            }
            return [next];
          });

          // Only rotate the key when something actually moved — a revalidate
          // that changed nothing must not invalidate an in-flight submit.
          return changed
            ? { items, withdrawn, idempotencyKey: newIdempotencyKey() }
            : { items, withdrawn };
        }),

      clear: () =>
        set({ items: [], withdrawn: [], idempotencyKey: newIdempotencyKey() }),

      // The server stores ids and quantities only, so the adopted lines arrive
      // without a name, colour, price or thumbnail. That is the same state a
      // cart restored from a week-old localStorage is in, and it takes the same
      // route out: useCartRevalidation fills the display fields in from the
      // live products. Until it does, the sheet shows a placeholder rather
      // than a stale price.
      adoptCart: (ownerId, lines) =>
        set({
          ownerId,
          items: lines.map((line) => ({
            productId: line.productId,
            variantId: line.variantId,
            slug: "",
            name: "",
            color: "",
            hex: "#000000",
            price: 0,
            qty: line.qty,
          })),
          withdrawn: [],
          // A different cart is a different order.
          idempotencyKey: newIdempotencyKey(),
          // Whoever just signed in did not ask to see the sheet.
          isOpen: false,
        }),

      resetForSignOut: () =>
        set({
          items: [],
          withdrawn: [],
          ownerId: null,
          idempotencyKey: newIdempotencyKey(),
          isOpen: false,
        }),

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      setOpen: (open) => set({ isOpen: open }),
    }),
    {
      // Versioned key: the item shape can change later without a stale payload
      // crashing the sheet on someone's next visit.
      //
      // Bumped to v2 when a line stopped being "a product" and became "a
      // product in a colour". A v1 line carries no variantId, and there is no
      // honest way to guess which colourway it meant, so those carts are
      // dropped rather than migrated onto an arbitrary colour.
      name: "jtj-cart-v2",
      storage: createJSONStorage(() => localStorage),
      // isOpen is UI state — persisting it would pop the sheet open on load.
      // `withdrawn` is the result of the last reconcile and would be a lie on
      // the next visit. `ownerId` must persist: it is what a fresh page load
      // compares against the live session, and a cart that forgets whose it is
      // is exactly the leak this fixes.
      partialize: (state) => ({
        items: state.items,
        idempotencyKey: state.idempotencyKey,
        ownerId: state.ownerId,
      }),
    },
  ),
);

/**
 * Whether the persisted cart has been read back yet.
 *
 * Without this every cart-derived number is a hydration mismatch: the server
 * renders an empty cart (it has no localStorage), the client's first paint
 * renders the restored one, and React throws them out. Everything that shows a
 * count, a subtotal or a line reads through this and renders the empty state
 * until it flips.
 */
export function useCartHydrated(): boolean {
  // useSyncExternalStore rather than an effect: localStorage is synchronous,
  // so hydration has usually already finished before any effect could run,
  // and a subscription alone would then never fire. This reads the real value
  // on the client while pinning the server snapshot to `false`, which is what
  // makes the two renders agree.
  return useSyncExternalStore(
    (onChange) => useCartStore.persist.onFinishHydration(onChange),
    () => useCartStore.persist.hasHydrated(),
    () => false,
  );
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((total, line) => total + line.qty, 0);
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((total, line) => total + line.price * line.qty, 0);
}

/** Total pieces in the cart, or 0 until the persisted cart is available. */
export function useCartCount(): number {
  const hydrated = useCartHydrated();
  const items = useCartStore((state) => state.items);
  return hydrated ? cartCount(items) : 0;
}
