"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * A product photograph that shows a placeholder while it loads, then fades up.
 *
 * The fade on its own left a hole: an image at `opacity: 0` is indistinguishable
 * from an empty frame, so on a slow connection the gallery read as a blank
 * square rather than as a picture on its way. This puts the same sweeping
 * placeholder the rest of the site uses for loading behind it, so the space is
 * always occupied by something that says "a photograph belongs here".
 *
 * Nothing in this codebase resizes or recompresses a product photograph, and
 * nothing should — so these arrive as full-size Cloudinary originals and the
 * gap between layout and paint is real, not a bug to optimise away. It is a
 * placeholder's job to cover it.
 *
 * Deliberately not `placeholder="blur"`: that needs a `blurDataURL` per image,
 * which for remote sources means either generating one at upload time (a
 * processing step this project does not do) or a second request per photo.
 *
 * **Requires a positioned ancestor** — it renders the placeholder as an
 * absolutely positioned sibling, and every caller already wraps its image in a
 * `relative aspect-square` frame for `fill` anyway.
 */
export default function ProductImage({
  src,
  alt,
  sizes,
  loading = "lazy",
  fetchPriority = "auto",
  className,
}: {
  src: string;
  alt: string;
  sizes: string;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "auto";
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  // "A client is running and has told us this image has not painted yet."
  // False during SSR, which is the whole point — see `hidden` below.
  const [pending, setPending] = useState(false);

  const attach = (node: HTMLImageElement | null) => {
    if (!node) return;
    // A cached image can finish decoding before React attaches onLoad, and that
    // event never replays — the classic way a fade-in strands a photograph at
    // zero opacity behind a placeholder that sweeps forever. Ask the element
    // whether it is already done instead of waiting for an event that has been
    // and gone.
    if (node.complete) setLoaded(true);
    else setPending(true);
  };

  // The fade is only ever applied by a live client. Server-rendered markup
  // leaves the photograph at full opacity, so if JavaScript never runs — or
  // hydration fails — the image still paints the moment its bytes land, over
  // a placeholder that is sitting behind it rather than on top.
  //
  // Flipping to hidden on mount costs no flash: an <img> that has not decoded
  // yet is painting nothing at that moment anyway, so there are no pixels to
  // take away. This is the same rule app/globals.css states for entrances —
  // nothing may be left permanently invisible when an animation fails to run.
  const hidden = pending && !loaded;

  return (
    <>
      {/* First in the DOM, so the photograph paints over it rather than under
          it — which is what keeps the no-JS case honest.
          Unmounted once the photograph is up, rather than left underneath at
          zero opacity: an infinite background animation on every tile of a
          collection grid is real work for a phone to keep doing for nothing. */}
      {!loaded && (
        <span
          aria-hidden="true"
          className="skeleton-sweep bg-muted absolute inset-0"
        />
      )}
      <Image
        src={src}
        alt={alt}
        fill
        ref={attach}
        loading={loading}
        fetchPriority={fetchPriority}
        sizes={sizes}
        onLoad={() => setLoaded(true)}
        // A broken image clears the placeholder too. Sweeping forever over a
        // photograph that is never going to arrive tells the shopper to keep
        // waiting; letting the alt text through tells them the truth.
        onError={() => setLoaded(true)}
        className={cn(
          "ease-editorial transition-opacity duration-(--motion-reveal)",
          hidden ? "opacity-0" : "opacity-100",
          className,
        )}
      />
    </>
  );
}
