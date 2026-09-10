"use client";

import { useState } from "react";
import AppLink from "@/components/layout/AppLink";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStockStatus } from "@/features/products/lib/stock";
import { defaultVariant } from "@/features/products/lib/variants";
import AddToCartButton from "@/features/products/components/AddToCartButton";
import ColorSwatches from "@/features/products/components/ColorSwatches";
import MobileBuyBar from "@/features/products/components/MobileBuyBar";
import ProductGallery from "@/features/products/components/ProductGallery";
import ProductSpecList from "@/features/products/components/ProductSpecList";
import { formatPrice } from "@/features/products/lib/format";
import type {
  ProductDetail,
  ProductDetailVariant,
} from "@/features/products/lib/types";

function stockLabel(stock: number) {
  switch (getStockStatus(stock)) {
    case "out-of-stock":
      return "Sold out";
    case "low-stock":
      return `Only ${stock} remaining`;
    case "in-stock":
      return "In stock";
  }
}

/**
 * The entrance for the two columns.
 *
 * This used to be `<Reveal>`, which sets `opacity: 0` in CSS and waits for an
 * IntersectionObserver to clear it. That is right for content further down a
 * page and wrong here: these two columns *are* the first viewport, so the
 * photograph, name, price and buy button all rendered invisible until
 * hydration finished — and stayed invisible if it never did. `app/globals.css`
 * already states the rule ("nothing may be left permanently invisible when an
 * animation fails to run"); the observer was the thing breaking it.
 *
 * `animate-in` plays on mount from a filled `both` state and rests visible, so
 * the motion is unchanged to anyone watching and the content is present on the
 * first frame for anyone who is not — no JS, failed hydration, or a crawler.
 * Same pattern the related-products rail already uses.
 */
const COLUMN_ENTRANCE =
  "animate-in fade-in slide-in-from-bottom-4 fill-mode-both ease-editorial duration-(--motion-reveal)";

/**
 * A client component, unlike the rest of the detail route, because the selected
 * colourway is state that four separate things read: the gallery, the stock
 * line, the buy button and the reference number in the spec list. Holding it in
 * one place above all four is what makes a swatch click swap the whole page
 * with no navigation and no refetch — the payload for every colour is already
 * here.
 */
export default function ProductDetailView({
  product,
}: {
  product: ProductDetail;
}) {
  // Opens on the first colourway with stock — see defaultVariant.
  const [selectedId, setSelectedId] = useState(
    () => defaultVariant(product.variants)?.id ?? "",
  );
  const selected =
    product.variants.find((colorway) => colorway.id === selectedId) ??
    product.variants[0];

  // Fall back through the colourway's gallery, then the placeholder the
  // collection grid already uses — the gallery expects a non-empty list.
  const images = selected?.images.length
    ? selected.images
    : [{ url: "/image-placeholder.jpg" }];

  const stockStatus = getStockStatus(selected?.stock ?? 0);
  const soldOut = stockStatus === "out-of-stock";

  // The nearest colourway that can actually be bought, offered when the
  // selected one cannot. Sold out used to be the end of the page: a disabled
  // grey slab and nothing else, at the exact moment the shopper had already
  // decided they wanted the object. Naming a colour that is ready to ship
  // costs one line and keeps the demand the page has just created.
  const alternative: ProductDetailVariant | undefined = soldOut
    ? defaultVariant(product.variants.filter((colorway) => colorway.stock > 0))
    : undefined;

  return (
    // data-product-root: the boundary AddToCartButton searches for the image it
    // sends to the cart — features/cart/lib/fly-to-cart.ts.
    <div
      // pt-24 on mobile rather than pt-32: 32px of the old top padding bought
      // nothing on a phone and cost 32px of the only screen that decides
      // whether the shopper keeps scrolling. pb clears the fixed buy bar.
      className="mx-auto max-w-360 px-5 pt-24 pb-40 md:px-16 md:pt-40 md:pb-32"
      data-product-root=""
    >
      <AppLink
        href="/collection"
        className="text-on-surface-variant hover:text-foreground ease-editorial label-caps mb-8 inline-flex w-fit items-center gap-2 transition-colors duration-(--motion-quick)"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        The Collections
      </AppLink>

      {/* The two columns arrive one stagger step apart rather than together:
          the photograph is what the page is for, and the details answer it.
          The entrance class sits on each column's own element rather than in a
          wrapper, so the flex row and the sticky column keep the DOM they had
          when this was an observer-driven Reveal. */}
      <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
        <div className={cn(COLUMN_ENTRANCE, "w-full lg:w-3/5")}>
          {/* Keyed by colourway so switching colours mounts a fresh carousel.
              Without it embla keeps the old slide index, and picking a colour
              from the third photo of the last one opens on its third photo.
              The remount is also what the crossfade rides on: a fresh mount
              replays ProductGallery's own entrance, so a swatch click reads as
              one photograph dissolving into another instead of a hard cut. */}
          <ProductGallery
            key={selected?.id}
            images={images}
            alt={
              selected?.color
                ? `${product.name} in ${selected.color}`
                : product.name
            }
          />
        </div>

        <div className="w-full lg:w-2/5">
          <div
            className={cn(COLUMN_ENTRANCE, "flex flex-col lg:sticky lg:top-32")}
            // One stagger step behind the photograph: the picture is what the
            // page is for, and the details answer it.
            style={{ animationDelay: "var(--motion-stagger)" }}
          >
            <p className="text-on-surface-variant label-caps">
              {product.category}
            </p>
            <h1 className="text-foreground mt-2 font-serif text-[40px] leading-[1.2] tracking-tight md:text-[56px] md:leading-[1.1]">
              {product.name}
            </h1>
            <p className="text-foreground mt-4 text-[18px] leading-[1.6]">
              {formatPrice(product.price)}
            </p>

            {product.description && (
              <div className="border-outline-variant/40 mt-8 border-t pt-6">
                <p className="text-on-surface-variant text-[16px] leading-[1.6]">
                  {product.description}
                </p>
              </div>
            )}

            {/* Absent entirely for a one-colour piece, so nothing on the page
                implies a choice that isn't there. */}
            {product.variants.length > 1 && (
              <div className="mt-8">
                {/* Just "Colour" now. The selected name used to be appended
                    here after an em-dash, because it was the only place any
                    colour was named; every chip carries its own name below it
                    instead, which is where the eye already is when choosing. */}
                <p className="text-on-surface-variant label-caps">Colour</p>
                <ColorSwatches
                  variants={product.variants}
                  selectedId={selected?.id ?? ""}
                  onSelect={setSelectedId}
                  showNames
                  className="mt-4"
                />
              </div>
            )}

            {/* aria-live, because a swatch click rewrites this line, the
                gallery, and the button's meaning with no navigation — a
                screen reader otherwise gets silence and a changed page. */}
            <div className="mt-8 flex flex-col gap-4" aria-live="polite">
              <p
                className={cn(
                  "label-caps flex items-center gap-2",
                  // Low stock earns the darker weight: scarcity is one of only
                  // two honest persuasion levers this brand has, and it used to
                  // render identically to "In stock" three shades down the
                  // page. getStockStatus has always returned three states; this
                  // is the first time the page shows three.
                  stockStatus === "low-stock"
                    ? "text-foreground"
                    : "text-on-surface-variant",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-2",
                    soldOut ? "bg-outline-variant" : "bg-foreground",
                  )}
                />
                {/* About the selected colour, not the piece: a sold-out black
                    says nothing about the tan sitting next to it. */}
                {stockLabel(selected?.stock ?? 0)}
              </p>
              {selected && (
                <AddToCartButton
                  product={product}
                  colorway={{
                    id: selected.id,
                    color: selected.color,
                    hex: selected.hex,
                    stock: selected.stock,
                    thumbnail: selected.images[0]?.url,
                  }}
                  variant="detail"
                />
              )}

              {/* Only when there is somewhere to send them. A sold-out piece
                  with every colour gone gets the plain disabled button, because
                  offering a route that does not exist is worse than none. */}
              {alternative && (
                <button
                  type="button"
                  onClick={() => setSelectedId(alternative.id)}
                  className="text-foreground decoration-outline-variant hover:decoration-foreground ease-editorial self-start text-left text-[15px] leading-[1.6] underline underline-offset-4 transition-colors duration-(--motion-quick)"
                >
                  The {alternative.color} is ready to ship.
                </button>
              )}
            </div>

            {/* Product-level, not colourway-level: material and dimensions are
                the same whichever leather you pick, so this no longer changes
                under the swatch. */}
            <ProductSpecList
              material={product.material}
              dimensions={product.dimensions}
            />
          </div>
        </div>
      </div>

      {selected && (
        <MobileBuyBar
          product={product}
          colorway={{
            id: selected.id,
            color: selected.color,
            hex: selected.hex,
            stock: selected.stock,
            thumbnail: selected.images[0]?.url,
          }}
          price={product.price}
        />
      )}
    </div>
  );
}
