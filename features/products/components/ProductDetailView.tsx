"use client";

import { useState } from "react";
import AppLink from "@/components/layout/AppLink";
import Reveal from "@/components/layout/Reveal";
import { ArrowLeft } from "lucide-react";
import { getStockStatus } from "@/features/products/lib/stock";
import { defaultVariant } from "@/features/products/lib/variants";
import AddToCartButton from "@/features/products/components/AddToCartButton";
import ColorSwatches from "@/features/products/components/ColorSwatches";
import ProductGallery from "@/features/products/components/ProductGallery";
import ProductSpecList from "@/features/products/components/ProductSpecList";
import { formatPrice } from "@/features/products/lib/format";
import type { ProductDetail } from "@/features/products/lib/types";

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

  const soldOut = (selected?.stock ?? 0) <= 0;

  return (
    // data-product-root: the boundary AddToCartButton searches for the image it
    // sends to the cart — features/cart/lib/fly-to-cart.ts.
    <div
      className="mx-auto max-w-360 px-5 pt-32 pb-32 md:px-16 md:pt-40"
      data-product-root=""
    >
      <AppLink
        href="/collection"
        className="text-on-surface-variant hover:text-foreground ease-editorial mb-8 inline-flex w-fit items-center gap-2 text-[12px] font-semibold tracking-[0.1em] uppercase transition-colors duration-(--motion-quick)"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        The Collections
      </AppLink>

      {/* The two columns arrive one stagger step apart rather than together:
          the photograph is what the page is for, and the details answer it.
          Reveal takes over each column's own classes instead of wrapping them,
          so the flex row and the sticky column keep the same DOM they had. */}
      <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
        <Reveal index={0} className="w-full lg:w-3/5">
          {/* Keyed by colourway so switching colours mounts a fresh carousel.
              Without it embla keeps the old slide index, and picking a colour
              from the third photo of the last one opens on its third photo. */}
          <ProductGallery
            key={selected?.id}
            images={images}
            alt={
              selected?.color
                ? `${product.name} in ${selected.color}`
                : product.name
            }
          />
        </Reveal>

        <div className="w-full lg:w-2/5">
          <Reveal index={1} className="flex flex-col lg:sticky lg:top-32">
            <p className="text-on-surface-variant text-[12px] font-semibold tracking-[0.1em] uppercase">
              {product.category}
            </p>
            <h1 className="text-foreground mt-2 font-serif text-[40px] leading-[1.2] tracking-tight md:text-[56px] md:leading-[1.1]">
              {product.name}
            </h1>
            <p className="text-foreground mt-4 text-[18px] leading-[1.6]">
              {formatPrice(product.price)}
            </p>

            {product.description && (
              <div className="border-outline-variant/20 mt-8 border-t pt-6">
                <p className="text-on-surface-variant text-[16px] leading-[1.6]">
                  {product.description}
                </p>
              </div>
            )}

            {/* Absent entirely for a one-colour piece, so nothing on the page
                implies a choice that isn't there. The name sits in the label
                rather than under the row: it is the answer to "which one am I
                looking at", and it belongs where the eye already is. */}
            {product.variants.length > 1 && (
              <div className="mt-8">
                <p className="text-on-surface-variant text-[12px] font-semibold tracking-[0.1em] uppercase">
                  Colour —{" "}
                  <span className="text-foreground">{selected?.color}</span>
                </p>
                <ColorSwatches
                  variants={product.variants}
                  selectedId={selected?.id ?? ""}
                  onSelect={setSelectedId}
                  className="mt-3"
                />
              </div>
            )}

            <div className="mt-8 flex flex-col gap-4">
              <p className="text-on-surface-variant flex items-center gap-2 text-[12px] font-semibold tracking-[0.1em] uppercase">
                <span
                  aria-hidden="true"
                  className={`size-2 ${soldOut ? "bg-outline-variant" : "bg-foreground"}`}
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
            </div>

            {/* The reference is the colourway's SKU — it changes with the
                swatch, because it is what the shopper would quote to ask about
                this exact piece. */}
            <ProductSpecList
              sku={selected?.sku ?? ""}
              category={product.category}
            />
          </Reveal>
        </div>
      </div>
    </div>
  );
}
