"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The moving layer of the hero, stacked over the poster in `HeroSection`.
 *
 * The poster underneath is the LCP element and the permanent fallback, which
 * is what lets this component be as cautious as it is: every path where the
 * video does not arrive — refused, gated out, unsupported, still loading —
 * ends with the poster on screen and nothing missing. So it never competes
 * for the bytes that matter.
 *
 * Three things it will not do:
 *
 *  · Load before the page has finished loading. The clip is ~500 KB against a
 *    33 KB poster; started eagerly it would contend with the fonts and the
 *    product grid for no gain, since nobody can see it until it decodes
 *    anyway. It waits for `load`, then for an idle callback.
 *
 *  · Load on a metered or slow connection (`Save-Data`, 2g/3g).
 *
 * Reduced motion is deliberately *not* one of them. The rotation is this
 * surface's argument rather than decoration laid over one, and playing it at
 * every setting is an explicit product decision — see the note in the
 * prefers-reduced-motion block in app/globals.css, which the hero is likewise
 * absent from. Restore the gate only if that decision is revisited.
 *
 * `poster=` is deliberately absent: the next/image layer beneath is a better
 * poster in every way — AVIF, device-sized, build-time blur placeholder — and
 * setting the attribute would fetch the same frame a second time.
 */

/**
 * Kept in step with `.hero-media` in app/globals.css, which does the matching
 * layout swap. Viewport *shape*, not width, because the thing being decided is
 * whether a cover-crop still contains the product: the wallet spans 20.0%-79.7%
 * of the clip's width, and a 5:4 viewport shows the middle 70% of the frame.
 * Anything taller crops into it, so anything taller gets the 11:9 encode in a
 * band instead. A phone held sideways should get the wide one, and a width
 * breakpoint would give it the wrong answer.
 */
const WIDE = "(min-aspect-ratio: 5/4)";

type Orientation = "landscape" | "portrait";

/** Codec strings are the levels the encoder actually wrote (3.1 landscape, 3.0
 *  portrait — verified with ffprobe), not a guess. Being precise is what lets a
 *  browser without AV1 skip straight to the MP4 rather than fetching the WebM,
 *  failing to decode it, and only then falling through. */
const SOURCES: Record<
  Orientation,
  { av1: string; av1Type: string; h264: string }
> = {
  landscape: {
    av1: "/media/hero/hero-landscape-v1.av1.webm",
    av1Type: 'video/webm; codecs="av01.0.05M.08"',
    h264: "/media/hero/hero-landscape-v1.h264.mp4",
  },
  portrait: {
    av1: "/media/hero/hero-portrait-v1.av1.webm",
    av1Type: 'video/webm; codecs="av01.0.04M.08"',
    h264: "/media/hero/hero-portrait-v1.h264.mp4",
  },
};

/** Chromium-only and absent from lib.dom. Narrowed here rather than declared
 *  globally: one component reads it, and an ambient declaration would suggest
 *  it can be relied on. */
type ConnectionNavigator = Navigator & {
  connection?: { saveData?: boolean; effectiveType?: string };
};

const SLOW_CONNECTIONS = new Set(["slow-2g", "2g", "3g"]);

function shouldSkipVideo() {
  const connection = (navigator as ConnectionNavigator).connection;
  if (!connection) return false;

  return (
    connection.saveData === true ||
    SLOW_CONNECTIONS.has(connection.effectiveType ?? "")
  );
}

export default function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  // Null until we have decided to play at all — which is also what keeps the
  // <source> elements out of the markup, and so keeps the bytes unrequested.
  const [orientation, setOrientation] = useState<Orientation | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const choose = () => {
      if (cancelled || shouldSkipVideo()) return;
      setOrientation(
        window.matchMedia(WIDE).matches ? "landscape" : "portrait",
      );
    };

    const whenIdle = () => {
      if (cancelled) return;
      if (typeof window.requestIdleCallback === "function") {
        // The timeout matters more than the idle part: on a busy page the
        // callback might otherwise not run at all.
        window.requestIdleCallback(choose, { timeout: 2000 });
      } else {
        setTimeout(choose, 200);
      }
    };

    if (document.readyState === "complete") whenIdle();
    else window.addEventListener("load", whenIdle, { once: true });

    // `.hero-media` re-evaluates this same query live, so reading it once here
    // would leave the two disagreeing the moment a phone is rotated: CSS goes
    // full-bleed while the DOM still holds the portrait encode, which then
    // gets cover-cropped into a wide box and cuts into the wallet. The guard
    // matters as much as the listener — a rotation must never be what *starts*
    // the download, or the load-then-idle deferral above buys nothing.
    const shape = window.matchMedia(WIDE);
    const onShapeChange = (event: MediaQueryListEvent) => {
      setOrientation((current) =>
        current === null ? null : event.matches ? "landscape" : "portrait",
      );
    };
    shape.addEventListener("change", onShapeChange);

    return () => {
      cancelled = true;
      window.removeEventListener("load", whenIdle);
      shape.removeEventListener("change", onShapeChange);
    };
  }, []);

  // A <video> does not rescan its <source> children when they change, so
  // rendering them is not enough on its own.
  useEffect(() => {
    if (!orientation) return;
    ref.current?.load();
  }, [orientation]);

  const source = orientation ? SOURCES[orientation] : null;

  return (
    <video
      ref={ref}
      // Decorative. The poster beneath carries the description, and there is
      // nothing here a keyboard user can act on.
      aria-hidden="true"
      tabIndex={-1}
      autoPlay
      muted
      loop
      playsInline
      preload="none"
      onCanPlay={() => {
        // autoPlay covers this almost everywhere; the explicit call is for the
        // cases it doesn't, and the catch is the point. iOS Low Power Mode and
        // desktop battery saver reject the promise, and an uncaught rejection
        // would be the only trace of a hero that simply never appeared.
        ref.current?.play().catch(() => {
          /* Poster stays. Nothing to recover. */
        });
      }}
      // `playing`, not `canplay`: fading on canplay can reveal a frame the
      // compositor has not painted yet.
      onPlaying={() => setPlaying(true)}
      className={cn(
        "ease-editorial absolute inset-0 h-full w-full object-cover transition-opacity duration-(--motion-reveal-lg)",
        playing ? "opacity-100" : "opacity-0",
      )}
    >
      {source && (
        <>
          <source src={source.av1} type={source.av1Type} />
          <source src={source.h264} type="video/mp4" />
        </>
      )}
    </video>
  );
}
