"use client";

import Lenis from "lenis";
import { useEffect } from "react";

/**
 * Lenis-driven smooth scroll, mounted once at the root (app/layout.tsx).
 *
 * Renders nothing: Lenis binds to `window`/`document`, not to a subtree, so a
 * null-rendering sibling wraps the app just as effectively as a provider that
 * walks `children` — and matches how RouteProgress and Toaster already mount.
 *
 * Replaces the `scroll-smooth` class that used to sit on <html>. The two
 * cannot coexist: CSS `scroll-behavior: smooth` animates the same scroll
 * position Lenis is writing every frame, and they fight. The native scrollbar
 * is hidden in app/globals.css to match.
 */
export default function SmoothScroll() {
  useEffect(() => {
    // Runs at every OS setting. This used to skip Lenis entirely under
    // prefers-reduced-motion; that branch was removed along with the rest of
    // the project's reduced-motion handling (see the note in app/globals.css).
    // Lenis' own `respectReducedMotion` is deliberately left off for the same
    // reason rather than being switched on as a middle ground.
    const lenis = new Lenis({
      // Inner scrollers — the cart sheet's item list, the collection search
      // dropdown, the admin sidebar, every Radix select/dropdown — are found by
      // walking the event path. Off (the default), a wheel over any of them
      // scrolls the page behind it instead.
      allowNestedScroll: true,
      // Route the eventual `href="#section"` click through Lenis' own scrollTo.
      // Nothing in the app uses a hash link today; this keeps the first one
      // that does from jumping natively against the animated position.
      anchors: true,
      // Clicking a nav link mid-coast otherwise leaves inertia running into the
      // router's scroll-to-top, which reads as the new page drifting on entry.
      stopInertiaOnNavigate: true,
      // Read the scroll limit live from the document on every wheel tick
      // instead of trusting Lenis’ cached Dimensions. Cached, the limit is a
      // snapshot taken when this effect runs and refreshed only by its
      // ResizeObserver on <html> or a window resize — so anything that gives
      // <html> a fixed height silently freezes it, and the page then hard-stops
      // mid-scroll because the wheel is preventDefault()ed before the clamp.
      // app/layout.tsx keeps <html> unsized so the observer does work; this is
      // the belt to that pair of braces, and it costs two layout reads a tick.
      naiveDimensions: true,
      // Radix overlays (cart sheet, mobile nav, every select and dialog) mount
      // react-remove-scroll, which sets `overflow: hidden` on <body> via
      // [data-scroll-locked]. <html> has no overflow of its own, so that
      // propagates to the viewport and collapses documentElement.scrollHeight
      // for as long as the overlay is open. Bowing out here lets
      // react-remove-scroll’s own non-passive handler do the blocking, rather
      // than Lenis measuring against a collapsed page or scrolling it behind
      // the overlay. <body> is in the path Lenis walks, so this matches.
      prevent: (node) => node.hasAttribute("data-scroll-locked"),
    });

    let frame = requestAnimationFrame(function raf(time) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    });

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return null;
}
