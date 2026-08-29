"use client";

import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/features/cart/lib/cartStore";
import { findProductImage, flyToCart } from "@/features/cart/lib/fly-to-cart";

/**
 * What the button needs to put a line in the cart. Only `id` and `qty` are
 * ever authoritative — the rest is snapshotted so the sheet can render
 * instantly, and every figure is recomputed server-side at placement.
 */
export interface AddToCartProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  thumbnail?: string;
  stock: number;
}

interface AddToCartButtonProps {
  product: AddToCartProduct;
  /** "detail" is the full-width primary CTA; "card" is the compact grid variant. */
  variant?: "card" | "detail";
  className?: string;
}

export default function AddToCartButton({
  product,
  variant = "card",
  className,
}: AddToCartButtonProps) {
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const soldOut = product.stock <= 0;

  const handleClick = () => {
    // Read the image and start the flight before the store update, so the
    // measurement is taken against the layout the shopper actually clicked.
    flyToCart(findProductImage(buttonRef.current));

    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      thumbnail: product.thumbnail,
      maxQty: product.stock,
    });
    // The toast is the whole confirmation. Opening the sheet here used to be,
    // but it interrupts the common case — adding several pieces from the grid
    // — by covering the grid after every click. The sheet is offered instead,
    // and stays something the shopper opens.
    toast("Added to your cart.", {
      description: product.name,
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
        "bg-foreground text-background hover:bg-secondary ease-editorial group inline-flex items-center justify-center gap-2 rounded-none text-[12px] font-semibold tracking-widest uppercase transition-[color,background-color,transform] duration-(--motion-quick) active:translate-y-px disabled:pointer-events-none disabled:opacity-40",
        variant === "detail" ? "w-full py-4" : "w-full px-3 py-3",
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
