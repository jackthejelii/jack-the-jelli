/**
 * Shared styling for the product carousels (related products, homepage
 * featured strip), so a second strip can't quietly drift from the first.
 *
 * Arrows live in the header row rather than floating over the images: the
 * design language has no elevation, so overlay controls would need a shadow to
 * stay legible. This overrides shadcn's default `absolute … rounded-full`;
 * `my-0` neutralises the `my-auto` its horizontal orientation still applies,
 * and size-11 (44px) clears the minimum touch target.
 */
export const CAROUSEL_ARROW_CLASS =
  "border-secondary hover:bg-foreground hover:text-background static my-0 size-11 shrink-0 translate-x-0 translate-y-0 rounded-none border transition-colors duration-(--motion-quick) ease-editorial disabled:opacity-40";

/** One slide per breakpoint, shared so both strips break at the same widths. */
export const CAROUSEL_ITEM_CLASS =
  "basis-[70%] pl-4 sm:basis-1/2 md:pl-8 lg:basis-1/3 xl:basis-1/4";
