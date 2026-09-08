"use client";

import { cn } from "@/lib/utils";

export interface SwatchVariant {
  id: string;
  color: string;
  hex: string;
  stock: number;
}

/**
 * The colour picker, shared by the card and the detail page.
 *
 * A radiogroup rather than a row of buttons: picking a colourway is choosing
 * one of a set, which is what a radio group means, and it buys arrow-key
 * movement between the swatches for free from the browser.
 *
 * Square, hairline-bordered, zero radius — the same treatment as every other
 * bordered element on the site. Selection reads as an offset outline rather
 * than a thicker border, so the chip itself never changes size and the row
 * doesn't reflow as the shopper moves through it.
 *
 * The colour is never *only* the chip: the detail page prints the name beside
 * the row and every swatch carries it as its accessible label, because telling
 * black from espresso in a 24px square is not something a page may require.
 */
export default function ColorSwatches({
  variants,
  selectedId,
  onSelect,
  size = "md",
  className,
}: {
  variants: SwatchVariant[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** "sm" is the card's row; "md" is the detail page's. */
  size?: "sm" | "md";
  className?: string;
}) {
  // One colourway is not a choice. Rendering a single swatch would invite a
  // click that can't do anything, so the row is simply absent.
  if (variants.length < 2) return null;

  return (
    <div
      role="radiogroup"
      aria-label="Colour"
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      {variants.map((variant) => {
        const selected = variant.id === selectedId;
        const soldOut = variant.stock <= 0;

        return (
          <button
            key={variant.id}
            type="button"
            role="radio"
            aria-checked={selected}
            // Sold-out colours stay pickable on purpose — the shopper is
            // allowed to look at one, and the page says "Sold out" when they
            // do. Disabling it would answer the question by refusing it.
            aria-label={`${variant.color}${soldOut ? " — sold out" : ""}`}
            title={variant.color}
            onClick={() => onSelect(variant.id)}
            className={cn(
              "ease-editorial relative block shrink-0 border transition-[outline-color,opacity] duration-(--motion-quick)",
              "focus-visible:outline-foreground focus-visible:outline-2 focus-visible:outline-offset-2",
              selected
                ? "border-outline-variant outline-foreground outline-1 outline-offset-2"
                : "border-outline-variant/50 outline-1 outline-offset-2 outline-transparent",
              soldOut && "opacity-45",
              size === "sm" ? "size-4" : "size-6",
            )}
            style={{ backgroundColor: variant.hex }}
          >
            {/* A hairline struck corner to corner, so "sold out" is legible
                without relying on the opacity difference alone. Rotated rather
                than drawn as an SVG: one element, and it scales with the chip. */}
            {soldOut && (
              <span
                aria-hidden="true"
                className="bg-foreground/70 absolute top-1/2 left-0 h-px w-full origin-center -translate-y-1/2 rotate-45"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
