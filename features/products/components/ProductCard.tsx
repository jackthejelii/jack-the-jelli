import Image from "next/image";
import AppLink from "@/components/layout/AppLink";
import AddToCartButton from "@/features/products/components/AddToCartButton";
import { formatPrice } from "@/features/products/lib/format";
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

  /*
   * data-product-frame marks the image box. It is a styling hook, like
   * data-product-root below it: the homepage featured strip wipes the
   * photograph in behind a clip-path and retimes the hover zoom, and both need
   * to address the frame from outside without this component knowing where it
   * is being used. On both variants deliberately — a hook that exists on only
   * one of two identical boxes is a trap for whoever reaches for it next.
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
    return (
      <AppLink
        href={href}
        className="focus-visible:outline-foreground group block focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        <div
          data-product-frame=""
          className="bg-surface-container relative aspect-square overflow-hidden"
        >
          <Image
            src={product.thumbnail || "/image-placeholder.jpg"}
            alt={product.name}
            fill
            // Always below the fold where this variant is used.
            loading="lazy"
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 70vw"
            className="ease-editorial object-contain transition-transform duration-700 group-hover:scale-105"
          />
        </div>

        <div className="mt-4 text-center">
          <h3 className="text-foreground font-serif text-[18px] leading-[1.6]">
            {product.name}
          </h3>
          <p className="text-on-surface-variant mt-1 text-[16px] leading-[1.6]">
            {formatPrice(product.price)}
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
          <Image
            src={product.thumbnail || "/image-placeholder.jpg"}
            alt={product.name}
            fill
            // priority is deprecated in Next 16 — see ProductGallery.tsx.
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="ease-editorial object-contain transition-transform duration-700 group-hover:scale-105"
          />
        </div>
      </AppLink>

      <div className="mt-4 text-center">
        <h3 className="text-foreground font-serif text-[18px] leading-[1.6]">
          {product.name}
        </h3>
        <p className="text-on-surface-variant mt-1 text-[16px] leading-[1.6]">
          {formatPrice(product.price)}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <AddToCartButton product={product} />
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
