import Image from "next/image";
import AppLink from "@/components/layout/AppLink";
import Reveal from "@/components/layout/Reveal";
import heroImage from "@/public/hero-image.webp";

export default function HeroSection() {
  return (
    // min-h-dvh rather than h-screen: `vh` is measured against the tallest
    // viewport a mobile browser can have, so with the URL bar showing the hero
    // was always taller than the screen. The old min-h-200 floor (800px) did
    // the same thing on a laptop — it pushed the call to action below the fold
    // on anything shorter, which is most 1366×768 screens.
    <header className="bg-surface-container relative flex min-h-dvh w-full items-center justify-center overflow-hidden">
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
          // Lands at 1.06 and settles to true scale once, on load — see
          // `hero-settle` in app/globals.css. The previous version parked the
          // image at scale-105 and unwound it over ten seconds *on hover*,
          // which meant the movement only ever played for a visitor whose
          // cursor happened to rest on the photograph, and reversed when it
          // left.
          className="hero-settle object-cover"
          // priority is deprecated in Next 16 — see ProductGallery.tsx.
          loading="eager"
          fetchPriority="high"
        />
      </div>

      {/* Hero content. The three lines arrive in sequence rather than all at
          once — eyebrow, headline, then the call to action, which is the order
          they are meant to be read in. */}
      <div className="bg-background/30 relative z-10 mx-auto max-w-360 px-5 py-8 text-center md:px-16">
        <Reveal index={0}>
          <span className="text-foreground mb-6 block text-sm font-semibold tracking-[0.2em] uppercase">
            The Heritage Collection
          </span>
        </Reveal>

        <Reveal index={1}>
          <h1
            className="text-foreground mx-auto mb-8 max-w-3xl font-serif text-[40px] leading-[1.1] md:text-[64px] md:leading-tight"
            style={{ letterSpacing: "-0.02em" }}
          >
            Quiet Craftsmanship.
            <br className="hidden md:block" />
            Loud Compliments.
          </h1>
        </Reveal>

        <Reveal index={2}>
          <AppLink
            href="/collection"
            className="bg-foreground text-background hover:bg-foreground/90 ease-editorial inline-flex items-center justify-center rounded-none px-10 py-4 text-[12px] font-semibold tracking-widest uppercase transition-[color,background-color,transform] duration-(--motion-quick) active:translate-y-px"
          >
            Explore Collection
          </AppLink>
        </Reveal>
      </div>
    </header>
  );
}
