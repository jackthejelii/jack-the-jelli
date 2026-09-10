"use client";

import { useState } from "react";
import AppLink from "@/components/layout/AppLink";
import AddToCartButton from "@/features/products/components/AddToCartButton";
import ColorSwatches from "@/features/products/components/ColorSwatches";
import ProductImage from "@/features/products/components/ProductImage";
import { formatPrice } from "@/features/products/lib/format";
import { defaultVariant } from "@/features/products/lib/variants";
import { Product } from "@/features/products/lib/types";

export default function ProductCard({
  product,
  priority = false,
  variant = "default",
}: {
  product: Product;
  priority?: boolean;
  /**
   * "quiet" drops the action row and makes the whole tile one link — used
   * where the card is a suggestion rather than the page's primary CTA.
   */
  variant?: "default" | "quiet";
}) {
  const href = `/collection/${product.slug}`;

  // Opens on the first colourway that can actually be bought, so a tile whose
  // black sold out leads with the tan rather than with a dead "Sold out".
  const [selectedId, setSelectedId] = useState(
    () => defaultVariant(product.variants)?.id ?? "",
  );
  const selected =
    product.variants.find((colorway) => colorway.id === selectedId) ??
    product.variants[0];

  /*
   * data-product-frame marks the image box, data-product-caption the name and
   * price beneath it. They are styling hooks, like data-product-root below:
   * the homepage featured strip wipes the photograph in behind a clip-path,
   * retimes the hover zoom, and strikes the caption up out of its own clip a
   * beat later, and all three need to address the card from outside without
   * this component knowing where it is being used. The caption's two lines are
   * each wrapped in a span for the same reason — the clip goes on the line box
   * and the span is what travels inside it, so the strip can run the effect
   * without this file owning it. On both variants deliberately — a hook that
   * exists on only one of two identical boxes is a trap for whoever reaches
   * for it next.
   *
   * Both variants frame the image the same way: a square box, object-contain.
   * Square because a wallet is a landscape-shaped object -- the old aspect-4/5
   * was an apparel proportion that spent most of the card on empty space.
   * contain rather than cover because the source photos are not all one shape
   * (4:3, 3:4, 1:1 all exist in the catalogue today), and cover resolved that
   * by slicing up to 40% off the widest ones. Once every photo is shot to the
   * 1:1 spec in CLAUDE.md the two render identically, so this costs nothing
   * then and still fails safe if an off-spec file is ever uploaded.
   */

  if (variant === "quiet") {
    // No swatch row: this whole tile is one link, and nesting a radiogroup
    // inside an anchor would make the colours unreachable by keyboard and
    // ambiguous by mouse. A suggestion shows the default colour and hands the
    // choice to the page it opens.
    return (
      <AppLink
        href={href}
        className="focus-visible:outline-foreground group block focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        <div
          data-product-frame=""
          className="bg-surface-container relative aspect-square overflow-hidden"
        >
          <ProductImage
            src={selected?.thumbnail || "/image-placeholder.jpg"}
            alt={product.name}
            // Always below the fold where this variant is used.
            loading="lazy"
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 70vw"
            className="object-contain transition-transform duration-700 group-hover:scale-105"
          />
        </div>

        <div data-product-caption="" className="mt-4 text-center">
          <h3 className="text-foreground font-serif text-[18px] leading-[1.6]">
            <span>{product.name}</span>
          </h3>
          <p className="text-on-surface-variant mt-1 text-[16px] leading-[1.6]">
            <span>{formatPrice(product.price)}</span>
          </p>
        </div>
      </AppLink>
    );
  }

  return (
    // data-product-root marks the boundary AddToCartButton searches for the
    // image to fly to the cart — see features/cart/lib/fly-to-cart.ts.
    <div className="group" data-product-root="">
      <AppLink href={href} tabIndex={-1} aria-hidden="true">
        <div
          data-product-frame=""
          className="bg-surface-container relative aspect-square overflow-hidden"
        >
          <ProductImage
            // Keyed by the colourway so React swaps the element rather than
            // reusing it — without this the browser keeps painting the old
            // photograph until the new one has decoded. The remount is also
            // what puts the placeholder back while the new colour loads.
            key={selected?.id}
            src={selected?.thumbnail || "/image-placeholder.jpg"}
            alt={
              selected?.color
                ? `${product.name} in ${selected.color}`
                : product.name
            }
            // priority is deprecated in Next 16 — see ProductGallery.tsx.
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-contain transition-transform duration-700 group-hover:scale-105"
          />
        </div>
      </AppLink>

      <div data-product-caption="" className="mt-4 text-center">
        <h3 className="text-foreground font-serif text-[18px] leading-[1.6]">
          <span>{product.name}</span>
        </h3>
        <p className="text-on-surface-variant mt-1 text-[16px] leading-[1.6]">
          <span>{formatPrice(product.price)}</span>
        </p>

        {/* Renders nothing at all for a one-colour piece — see ColorSwatches. */}
        <ColorSwatches
          variants={product.variants}
          selectedId={selected?.id ?? ""}
          onSelect={setSelectedId}
          size="sm"
          className="mt-3 justify-center"
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {selected && (
          <AddToCartButton
            product={product}
            colorway={{
              id: selected.id,
              color: selected.color,
              hex: selected.hex,
              stock: selected.stock,
              thumbnail: selected.thumbnail,
            }}
          />
        )}
        <AppLink
          href={href}
          className="border-secondary text-foreground hover:bg-secondary hover:text-background ease-editorial inline-flex items-center justify-center rounded-none border bg-transparent px-3 py-3 text-[12px] font-semibold tracking-widest uppercase transition-[color,background-color,border-color,transform] duration-(--motion-quick) active:translate-y-px"
        >
          View details
        </AppLink>
      </div>
    </div>
  );
}
