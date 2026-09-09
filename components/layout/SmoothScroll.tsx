"use client";

import Lenis from "lenis";
import { useEffect, useState } from "react";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

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
  // Read synchronously so a reduced-motion user never gets an instance built
  // and torn down on the first frame. This component renders null on both the
  // server and the client, so branching on a browser-only API is hydration-safe.
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia(REDUCED_MOTION).matches,
  );

  // The preference can be toggled mid-session; re-run rather than trapping the
  // user in whichever mode they loaded the page in.
  useEffect(() => {
    const query = window.matchMedia(REDUCED_MOTION);
    const onChange = (event: MediaQueryListEvent) =>
      setReducedMotion(event.matches);

    setReducedMotion(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    // Skip Lenis entirely: no instance, no rAF loop, plain native scrolling.
    // (Lenis' own `respectReducedMotion` only neutralises the easing — it still
    // constructs an instance and runs the loop.)
    if (reducedMotion) return;

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
    });

    let frame = requestAnimationFrame(function raf(time) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    });

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [reducedMotion]);

  return null;
}
