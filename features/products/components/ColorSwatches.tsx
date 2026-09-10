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
 * The colour is never *only* the chip: every swatch carries the name as its
 * accessible label, and on the detail page (`showNames`) it is printed under
 * the chip as well. Telling ivory from pewter in a 24px square is not
 * something a page may require of anyone, and `title` — which is what this
 * used to rely on — does not exist on a touch device, which is most of this
 * shop's traffic.
 */
export default function ColorSwatches({
  variants,
  selectedId,
  onSelect,
  size = "md",
  showNames = false,
  className,
}: {
  variants: SwatchVariant[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** "sm" is the card's row; "md" is the detail page's 44px target. */
  size?: "sm" | "md";
  /**
   * Print each colour's name beneath its chip. The detail page turns this on:
   * it is the page where the choice is actually made, and eight anonymous
   * chips there is a memory test, not a picker.
   */
  showNames?: boolean;
  className?: string;
}) {
  // One colourway is not a choice. Rendering a single swatch would invite a
  // click that can't do anything, so the row is simply absent.
  if (variants.length < 2) return null;

  return (
    <div
      role="radiogroup"
      aria-label="Colour"
      className={cn(
        "flex flex-wrap",
        showNames ? "items-start gap-x-4 gap-y-5" : "items-center gap-2",
        className,
      )}
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
            aria-label={`${variant.color}${soldOut ? ", sold out" : ""}`}
            title={variant.color}
            onClick={() => onSelect(variant.id)}
            className={cn(
              "ease-editorial shrink-0 transition-opacity duration-(--motion-quick)",
              // The ring is drawn on the chip inside, not here, so the hit area
              // can be 44px without a 44px block of colour.
              "focus-visible:outline-foreground focus-visible:outline-2 focus-visible:outline-offset-2",
              soldOut && "opacity-45",
              showNames ? "flex w-16 flex-col items-center gap-2" : "block",
            )}
          >
            <span
              className={cn(
                "ease-editorial relative block border transition-[outline-color] duration-(--motion-quick)",
                selected
                  ? "border-outline-variant outline-foreground outline-1 outline-offset-2"
                  : "border-outline-variant/50 outline-1 outline-offset-2 outline-transparent",
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
            </span>

            {showNames && (
              <span
                aria-hidden="true"
                className={cn(
                  "ease-editorial text-center text-[11px] leading-[1.3] transition-colors duration-(--motion-quick)",
                  selected ? "text-foreground" : "text-on-surface-variant",
                )}
              >
                {variant.color}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
