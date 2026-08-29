/**
 * Sends a copy of the product image across the page to the cart button when a
 * piece is added.
 *
 * Adding from the grid used to confirm itself twice in places the shopper
 * wasn't looking: a toast in the corner, and the badge beat in the far top
 * right (`cart-tick`). Neither connects the thing that was clicked to the place
 * it went. This does — it is the one animation on a storefront that carries
 * information rather than decorating a state change, which is why it is worth
 * the DOM work.
 *
 * Deliberately plain Web Animations API rather than an animation library. The
 * element being animated is a throwaway clone that React must never see: it is
 * created outside the tree, animated on the compositor (transform and opacity
 * only), and removed when it lands. Nothing here needs reconciliation, so
 * nothing here needs a renderer.
 *
 * Every failure path is a silent no-op. A missing image, a cart button that
 * isn't mounted, a zero-size rect mid-layout, a browser without `animate` —
 * none of those are worth an error when the toast has already confirmed the
 * add.
 */

/** Matches the `--motion-ease` token: fast departure, long settle. */
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const DURATION = 620;

export function flyToCart(source: HTMLImageElement | null | undefined) {
  if (!source || typeof window === "undefined") return;

  // The same preference the CSS honours, checked here because this animation
  // is built in script and never passes through a stylesheet.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const target = document.querySelector<HTMLElement>("[data-cart-target]");
  if (!target || typeof source.animate !== "function") return;

  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (!from.width || !from.height || !to.width) return;

  const clone = source.cloneNode(true) as HTMLImageElement;
  // The original carries layout classes (`absolute inset-0`, the hover scale,
  // its own transition) that would all fight this. The clone keeps only its
  // pixels.
  clone.removeAttribute("class");
  clone.removeAttribute("id");
  clone.setAttribute("aria-hidden", "true");
  clone.style.cssText = [
    "position:fixed",
    `left:${from.left}px`,
    `top:${from.top}px`,
    `width:${from.width}px`,
    `height:${from.height}px`,
    "margin:0",
    "object-fit:contain",
    "pointer-events:none",
    // Under the navbar's backdrop blur (z-50) would hide the landing.
    "z-index:55",
  ].join(";");

  document.body.appendChild(clone);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  // Down to roughly the badge's size, floored so a large hero image doesn't
  // vanish before it arrives.
  const scale = Math.max(to.width / from.width, 0.06);

  const animation = clone.animate(
    [
      { transform: "translate3d(0, 0, 0) scale(1)", opacity: 1 },
      {
        // Lifts off the straight line into a shallow arc. A linear flight
        // reads as a file transfer; the arc reads as something thrown.
        transform: `translate3d(${dx * 0.55}px, ${dy * 0.55 - 32}px, 0) scale(${(1 + scale) / 2})`,
        opacity: 0.85,
        offset: 0.55,
      },
      {
        transform: `translate3d(${dx}px, ${dy}px, 0) scale(${scale})`,
        opacity: 0,
      },
    ],
    { duration: DURATION, easing: EASE, fill: "forwards" },
  );

  const remove = () => clone.remove();
  animation.addEventListener("finish", remove, { once: true });
  animation.addEventListener("cancel", remove, { once: true });
}

/**
 * The image a given control should send to the cart: the first one inside the
 * nearest product root. Both `ProductCard` and `ProductDetailView` mark that
 * boundary with `data-product-root`, so the button doesn't need a ref threaded
 * down from whichever surface it happens to be rendered on.
 */
export function findProductImage(from: HTMLElement | null) {
  return from?.closest("[data-product-root]")?.querySelector("img") ?? null;
}
