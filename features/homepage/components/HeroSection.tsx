"use client";

import Image from "next/image";
import { useInView } from "@/lib/hooks/useInView";
import AppLink from "@/components/layout/AppLink";
import heroImage from "@/public/hero-image.webp";

export default function HeroSection() {
  const { ref: ref1, isVisible: vis1 } = useInView({}, "-50px");
  const { ref: ref2, isVisible: vis2 } = useInView({}, "-50px");
  const { ref: ref3, isVisible: vis3 } = useInView({}, "-50px");

  return (
    <header className="bg-surface-container relative flex h-screen min-h-200 w-full items-center justify-center overflow-hidden">
      {/* Background image. This is the LCP element, so it is never deferred:
          a Suspense boundary would only delay it, since next/image doesn't
          suspend and the bytes are what cost time, not a data fetch. What
          actually pays off is letting the optimizer serve a device-sized
          variant (`unoptimized` was defeating both that and `sizes`), and
          covering the gap before it arrives with the blurred placeholder that
          the static import generates at build time. */}
      <div className="absolute inset-0 h-full w-full">
        <Image
          src={heroImage}
          alt="A cinematic, high-end editorial close-up of a handcrafted leather wallet on a stone pedestal"
          fill
          sizes="100vw"
          placeholder="blur"
          className="origin-center scale-105 object-cover transition-transform duration-[10s] ease-out hover:scale-100"
          // priority is deprecated in Next 16 — see ProductGallery.tsx.
          loading="eager"
          fetchPriority="high"
        />
      </div>

      {/* Hero content */}
      <div className="bg-background/30 relative z-10 mx-auto max-w-360 px-5 py-8 text-center md:px-16">
        <div
          ref={ref1}
          className={`transition-all duration-1000 ${vis1 ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}
        >
          <span className="text-foreground mb-6 block text-sm font-semibold tracking-[0.2em] uppercase">
            The Heritage Collection
          </span>
        </div>

        <div
          ref={ref2}
          className={`transition-all delay-100 duration-1000 ${vis2 ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}
        >
          <h1
            className="text-foreground mx-auto mb-8 max-w-3xl font-serif text-[40px] leading-[1.1] md:text-[64px] md:leading-tight"
            style={{ letterSpacing: "-0.02em" }}
          >
            Quiet Craftsmanship.
            <br className="hidden md:block" />
            Loud Compliments.
          </h1>
        </div>

        <div
          ref={ref3}
          className={`transition-all delay-200 duration-1000 ${vis3 ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}
        >
          <AppLink
            href="/collection"
            className="bg-foreground text-background hover:bg-foreground/90 inline-flex items-center justify-center rounded-none px-10 py-4 text-[12px] font-semibold tracking-widest uppercase transition-colors duration-300"
          >
            Explore Collection
          </AppLink>
        </div>
      </div>
    </header>
  );
}
