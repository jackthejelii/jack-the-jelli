"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Reveals its children as they scroll into view: a short rise and fade, using
 * the motion tokens in `app/globals.css`.
 *
 * This replaces the per-element `useInView` pattern the homepage used to
 * carry, where every entrance needed its own ref, its own state, its own
 * observer and its own hand-written transition classes — six of each in
 * `ProductSection` alone. The cost of that was not the boilerplate, it was
 * that each element animated in isolation: same distance, same duration, no
 * relationship between them. `index` is what fixes it. Siblings passed 0, 1,
 * 2… come in one `--motion-stagger` apart, which is the difference between
 * motion that reads as choreography and motion that reads as a page slowly
 * assembling itself.
 *
 * Renders a plain `div`, so it can take over the classes of the wrapper it
 * replaces rather than adding a level to the tree — which matters wherever
 * the revealing elements are grid items and an extra wrapper would break the
 * layout.
 *
 * `group` inverts the arrangement: the element becomes the *trigger* for the
 * `RevealItem`s inside it instead of animating itself. That is what a
 * horizontal scroller needs — a slide parked off the right edge of the
 * viewport never intersects it, so a per-item observer would leave those
 * slides invisible until the shopper had already scrolled to them.
 */

/*
 * One observer for the page rather than one per element. The old hook built a
 * fresh IntersectionObserver on *every render* — `options` was in its
 * dependency array and every caller passed a `{}` literal, so each render tore
 * the observer down and rebuilt it. This also keeps the trigger point
 * identical everywhere, which a system needs and per-component rootMargins
 * (the homepage had "-50px" and "5px" side by side) quietly prevent.
 */
let observer: IntersectionObserver | null = null;
const entered = new WeakMap<Element, () => void>();

function observe(el: Element, onEnter: () => void) {
  if (typeof IntersectionObserver === "undefined") {
    onEnter();
    return () => {};
  }

  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        // Once only. The reveal is an entrance, not a scroll effect.
        observer?.unobserve(entry.target);
        entered.get(entry.target)?.();
        entered.delete(entry.target);
      }
    },
    // Fires a little after the element's top edge clears the fold, so the
    // movement happens where it can be seen rather than off-screen.
    { rootMargin: "0px 0px -10% 0px" },
  );

  entered.set(el, onEnter);
  observer.observe(el);

  return () => {
    observer?.unobserve(el);
    entered.delete(el);
  };
}

export default function Reveal({
  children,
  className,
  index = 0,
  delay,
  group = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** Position within a group; each step waits one `--motion-stagger` longer. */
  index?: number;
  /** Explicit delay in ms. Overrides `index` — use only outside a sequence. */
  delay?: number;
  /**
   * Trigger mode: this element stays visible and reveals the `RevealItem`s
   * beneath it, rather than animating itself. `index` and `delay` belong to
   * the items in this mode and are ignored here.
   */
  group?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || revealed) return;
    return observe(el, () => setRevealed(true));
  }, [revealed]);

  return (
    <div
      ref={ref}
      data-revealed={revealed ? "true" : undefined}
      className={cn(group ? "reveal-group" : "reveal", className)}
      // Deliberately unset in group mode: --reveal-delay inherits, so a value
      // here would become the fallback for every item that didn't set its own.
      style={
        group
          ? undefined
          : ({
              "--reveal-delay":
                delay !== undefined
                  ? `${delay}ms`
                  : `calc(${index} * var(--motion-stagger))`,
            } as React.CSSProperties)
      }
    >
      {children}
    </div>
  );
}

/**
 * One member of a `<Reveal group>`. Carries its own place in the stagger but
 * none of the observation — it waits for the group around it.
 */
export function RevealItem({
  children,
  className,
  index = 0,
}: {
  children: React.ReactNode;
  className?: string;
  /** Position within the group; each step waits one `--motion-stagger` longer. */
  index?: number;
}) {
  return (
    <div
      data-reveal-item=""
      className={className}
      style={
        {
          "--reveal-delay": `calc(${index} * var(--motion-stagger))`,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
