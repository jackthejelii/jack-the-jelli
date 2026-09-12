import type { ColorFamily } from "@/lib/color";

/**
 * One colourway as a card needs it. Deliberately without the image *list* —
 * a tile shows one photograph per colour, so shipping the whole gallery for
 * every colour of every product on the page would be paying for nothing.
 */
export interface ProductVariant {
  id: string;
  color: string;
  hex: string;
  stock: number;
  /** The colourway's first image — what the tile shows when it is selected. */
  thumbnail?: string;
}

/** The grid/card payload. Kept to exactly what a card renders — every extra
 *  field here is shipped to the browser for every product on the page. */
export interface Product {
  id: string;
  slug: string;
  name: string;
  price: number;
  category: string;
  /**
   * Never empty. Earns its place twice over: the swatch row renders from it,
   * and the card's add-to-cart needs a colourway's id and stock to seed a line
   * — a product id alone no longer names anything buyable.
   */
  variants: ProductVariant[];
}

/**
 * One row in the predictive search panel. Deliberately not `Product`: a
 * suggestion row draws a thumb, a name and a price and nothing else, so it
 * carries neither `id`, `variants` nor `category`.
 */
export interface ProductSuggestion {
  slug: string;
  name: string;
  price: number;
  thumbnail?: string;
  /**
   * The colourway that caused the match, when a colourway is what caused it.
   * Absent for an ordinary name match. The panel renders it as a swatch so a
   * search for "yellow" visibly explains why it returned a piece whose name
   * says nothing about yellow.
   */
  matchedColor?: { color: string; hex: string };
}

/** A category whose name matched the query, offered as a filter shortcut. */
export interface CategorySuggestion {
  name: string;
  slug: string;
}

export interface SuggestionsResult {
  /**
   * The normalised query the server actually ran, echoed back — it's what
   * separates "searched, found nothing" from "not searched yet" on the client.
   */
  q: string;
  products: ProductSuggestion[];
  categories: CategorySuggestion[];
  /** Every match, not just the ones shown — powers "See all N results". */
  total: number;
  /**
   * Colour families the query named, whether or not anything is in stock in
   * them. Lets the empty state say "no pieces in yellow right now" instead of
   * a bare "no results", which reads as a broken search box.
   */
  colorFamilies: ColorFamily[];
}

/** One image on the detail page. Mirrors IProductImage without the Mongoose types. */
export interface ProductImage {
  url: string;
  publicId: string;
}

/**
 * A colourway on the detail page — the full thing, gallery and SKU included,
 * since picking a swatch has to swap all of it.
 */
export interface ProductDetailVariant {
  id: string;
  color: string;
  hex: string;
  sku: string;
  stock: number;
  images: ProductImage[];
}

/**
 * The richer shape the product detail page needs. Kept separate from Product so
 * the collection grid keeps shipping the smaller payload.
 */
export interface ProductDetail {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  description?: string;
  /** Optional: the spec list omits the row rather than printing it empty. */
  material?: string;
  /** Optional, free text so the unit travels with the value. See models/Product.ts. */
  dimensions?: string;
  /** Never empty. The first entry is the colour the page opens on. */
  variants: ProductDetailVariant[];
}
