"use client";

import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { lineLabel, useCartStore } from "@/features/cart/lib/cartStore";
import { findProductImage, flyToCart } from "@/features/cart/lib/fly-to-cart";

/**
 * What the button needs to put a line in the cart. Only the ids and `qty` are
 * ever authoritative — the rest is snapshotted so the sheet can render
 * instantly, and every figure is recomputed server-side at placement.
 */
export interface AddToCartProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
}

/**
 * The colourway being added. Separate from the product because it is the half
 * that changes as the shopper clicks a swatch — and because stock, and so
 * whether this button is even usable, lives here rather than on the product.
 */
export interface AddToCartColorway {
  id: string;
  color: string;
  hex: string;
  stock: number;
  thumbnail?: string;
}

interface AddToCartButtonProps {
  product: AddToCartProduct;
  colorway: AddToCartColorway;
  /**
   * "detail" is the full-width primary CTA, "card" the compact grid variant,
   * and "sticky" the one in the mobile buy bar — same fill, shorter, and
   * without the arrow, because it sits beside the price rather than under a
   * column of copy.
   */
  variant?: "card" | "detail" | "sticky";
  className?: string;
}

export default function AddToCartButton({
  product,
  colorway,
  variant = "card",
  className,
}: AddToCartButtonProps) {
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Stock is per colourway, so "sold out" is a statement about the selected
  // colour — a product with a sold-out black and a stocked tan is not sold out.
  const soldOut = colorway.stock <= 0;

  const handleClick = () => {
    // Read the image and start the flight before the store update, so the
    // measurement is taken against the layout the shopper actually clicked.
    flyToCart(findProductImage(buttonRef.current));

    addItem({
      productId: product.id,
      variantId: colorway.id,
      slug: product.slug,
      name: product.name,
      color: colorway.color,
      hex: colorway.hex,
      price: product.price,
      thumbnail: colorway.thumbnail,
      maxQty: colorway.stock,
    });
    // The toast is the whole confirmation. Opening the sheet here used to be,
    // but it interrupts the common case — adding several pieces from the grid
    // — by covering the grid after every click. The sheet is offered instead,
    // and stays something the shopper opens.
    toast("Added to your cart.", {
      // Names the colour: adding the tan wallet right after the black one must
      // not produce two identical toasts.
      description: lineLabel({ name: product.name, color: colorway.color }),
      action: { label: "View cart", onClick: openCart },
    });
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={handleClick}
      disabled={soldOut}
      className={cn(
        // hover:bg-secondary-hover, not hover:bg-secondary: the latter put the
        // #faf9f6 label at 3.98:1, under the AA floor for this 12px/600 text,
        // so the primary action got harder to read the moment you pointed at
        // it. See the token note in app/globals.css.
        "bg-foreground text-background hover:bg-secondary-hover ease-editorial group inline-flex items-center justify-center gap-2 rounded-none tracking-widest uppercase transition-[color,background-color,transform] duration-(--motion-quick) active:translate-y-px disabled:pointer-events-none disabled:opacity-40",
        "label-caps",
        variant === "detail" && "w-full py-4",
        variant === "card" && "w-full px-3 py-3",
        variant === "sticky" && "shrink-0 px-6 py-3.5",
        className,
      )}
    >
      {soldOut ? "Sold out" : "Add to cart"}
      {variant === "detail" && !soldOut && (
        <ArrowRight
          className="ease-editorial size-4 transition-transform duration-(--motion-quick) group-hover:translate-x-1"
          aria-hidden="true"
        />
      )}
    </button>
  );
}
