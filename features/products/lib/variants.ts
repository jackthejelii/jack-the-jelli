// The two questions every surface asks about a product's colourways, in one
// place so a card, a detail page and the admin table all answer them the same
// way. No `"use client"` or `"use server"` directive — both sides import this.

/**
 * The colourway a page or tile should open on: the first one that can actually
 * be bought, falling back to the first that exists.
 *
 * Leading with a sold-out colour would open the page on a dead "Add to cart"
 * for a piece that is perfectly available in another leather — the shopper
 * would have to discover the working colour by clicking around.
 */
export function defaultVariant<T extends { stock: number }>(
  variants: T[],
): T | undefined {
  return variants.find((variant) => variant.stock > 0) ?? variants[0];
}

/**
 * Stock across every colourway — what "is this piece in stock at all" means
 * once no single number can answer it. Used for the admin table's summary and
 * its low-stock filter, never for the buy button, which is always about the
 * one colour selected.
 */
export function totalStock(variants: { stock: number }[]): number {
  return variants.reduce((total, variant) => total + variant.stock, 0);
}
