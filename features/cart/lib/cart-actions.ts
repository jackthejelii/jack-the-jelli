"use server";

import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Product, type IProductVariant } from "@/models";
import { MAX_CART_LINES } from "@/features/cart/lib/limits";
import { lineKey, type CartSnapshot } from "@/features/cart/lib/types";

/** Just enough of a product to re-price and re-stock every colourway of it. */
type LeanPurchasable = {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  price: number;
  status: string;
  variants: IProductVariant[];
};

/**
 * Current price, stock and published state for the lines a browser is holding.
 *
 * Called when the cart sheet opens and again on entering /checkout, so a cart
 * that has been sitting in localStorage for a week doesn't quote last month's
 * price or offer a colour that has since sold out. Purely advisory — it changes
 * what the customer sees, never what they're charged. `placeOrder` re-reads
 * all of this itself and is the only authority on either.
 *
 * Takes (productId, variantId) pairs rather than bare product ids: stock now
 * lives on the colourway, so "how many are left" has no answer at the product
 * level. A pair whose product is gone returns nothing at all and the line is
 * withdrawn; a pair whose *colourway* was deleted out from under it still
 * returns a snapshot, marked unavailable, so the sheet can name what it
 * dropped instead of a piece silently vanishing.
 *
 * No auth guard: it exposes nothing a visitor can't already read off the
 * public product page.
 */
export async function revalidateCart(
  lines: { productId: string; variantId: string }[],
): Promise<CartSnapshot[]> {
  // Deduped by the same key the store uses, so two requests for one line cost
  // one lookup and the browser can't inflate the cap by repeating itself.
  const wanted = new Map<string, { productId: string; variantId: string }>();
  for (const line of lines) {
    if (!Types.ObjectId.isValid(line.productId)) continue;
    if (!Types.ObjectId.isValid(line.variantId)) continue;
    if (wanted.size >= MAX_CART_LINES && !wanted.has(lineKey(line))) continue;
    wanted.set(lineKey(line), {
      productId: line.productId,
      variantId: line.variantId,
    });
  }

  if (wanted.size === 0) return [];

  await connectDB();

  const productIds = Array.from(
    new Set([...wanted.values()].map((line) => line.productId)),
  ).map((id) => new Types.ObjectId(id));

  const products = await Product.find({ _id: { $in: productIds } })
    .select("name slug price status variants")
    .lean<LeanPurchasable[]>();

  const byId = new Map(
    products.map((product) => [String(product._id), product]),
  );

  const snapshots: CartSnapshot[] = [];

  for (const line of wanted.values()) {
    const product = byId.get(line.productId);
    if (!product) continue; // Deleted outright — the store withdraws the line.

    const variant = product.variants?.find(
      (candidate) => String(candidate._id) === line.variantId,
    );

    if (!variant) {
      // The product is fine, this colour is not. Still answered, so the sheet
      // can say which piece it removed rather than dropping it in silence.
      snapshots.push({
        productId: line.productId,
        variantId: line.variantId,
        name: product.name,
        color: "",
        hex: "#000000",
        slug: product.slug,
        price: product.price,
        stock: 0,
        available: false,
      });
      continue;
    }

    snapshots.push({
      productId: line.productId,
      variantId: line.variantId,
      name: product.name,
      color: variant.color,
      hex: variant.hex,
      slug: product.slug,
      price: product.price,
      thumbnail: variant.images[0]?.url,
      stock: variant.stock,
      // Draft and Archived pieces are not buyable, whatever the cart remembers.
      available: product.status === "Published",
    });
  }

  return snapshots;
}
