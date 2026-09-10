"use client";

import AddToCartButton, {
  type AddToCartColorway,
  type AddToCartProduct,
} from "@/features/products/components/AddToCartButton";
import { formatPrice } from "@/features/products/lib/format";

/**
 * The buy bar for phones, and only for phones.
 *
 * Measured on the page this replaces: at 390x844 the product title sat 685px
 * down, the price 749px, and the Add to Cart button 1,114px — roughly 270px
 * below the fold, on the surface where most of this shop's traffic arrives
 * from Instagram. The desktop column has had `lg:sticky lg:top-32` all along;
 * everything under 1024px had nothing, which is exactly backwards for a
 * phone-first audience.
 *
 * It carries the price as well as the button because the price is the fact
 * that decides whether the scroll continues, and the colour name because the
 * button's meaning changes with the swatch — "Add to cart" on its own, pinned
 * over a gallery the shopper has scrolled away from, would not say which of
 * eight colourways it means.
 *
 * Deliberately not rendered at all when there is no colourway to buy: an empty
 * bar pinned to the bottom of every viewport is worse than no bar.
 */
export default function MobileBuyBar({
  product,
  colorway,
  price,
}: {
  product: AddToCartProduct;
  colorway: AddToCartColorway;
  price: number;
}) {
  const soldOut = colorway.stock <= 0;

  return (
    <div
      className={
        // Opaque, not a translucent blurred panel. This design language has no
        // elevation anywhere — the carousel arrows were moved out of the images
        // for exactly that reason — so a frosted bar would be the only surface
        // on the site pretending to float. It also measured 1.1:1 through the
        // backdrop filter with a photograph scrolling under it, which is the
        // practical version of the same objection.
        //
        // `pb-[env(safe-area-inset-bottom)]` keeps the button clear of the home
        // indicator on a notched phone, where a flush-bottom bar is partially
        // untappable.
        "bg-background border-outline-variant/40 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] lg:hidden"
      }
    >
      <div className="flex items-center justify-between gap-4 px-5 py-3">
        <div className="min-w-0">
          <p className="text-foreground text-[17px] leading-tight tabular-nums">
            {formatPrice(price)}
          </p>
          {/* truncate, so a long colourway name pushes the button off the row
              rather than wrapping the bar to two lines mid-scroll. */}
          <p className="text-on-surface-variant label-caps mt-1 truncate">
            {soldOut ? "Sold out" : colorway.color}
          </p>
        </div>

        <AddToCartButton
          product={product}
          colorway={colorway}
          variant="sticky"
        />
      </div>
    </div>
  );
}
