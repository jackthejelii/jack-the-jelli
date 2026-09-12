import Image from "next/image";
import { ArrowRight } from "lucide-react";
import AppLink from "@/components/layout/AppLink";
import HeroVideo from "@/features/homepage/components/HeroVideo";
import heroPoster from "@/public/media/hero/hero-poster-v1.webp";

export default function HeroSection() {
  return (
    // min-h-dvh rather than h-screen: `vh` is measured against the tallest
    // viewport a mobile browser can have, so with the URL bar showing the hero
    // was always taller than the screen. The old min-h-200 floor (800px) did
    // the same thing on a laptop — it pushed the call to action below the fold
    // on anything shorter, which is most 1366×768 screens.
    //
    // items-end, not items-center: the clip is the whole hero now, and the
    // wallet sits dead centre in it. Edge-detecting the master across the full
    // loop, the product never leaves x 18.75–81.25% and never reaches past 94%
    // of frame height, so the bottom edge is the one place the lockup can sit
    // without standing in front of the thing it is selling. `.hero-stage` is
    // position:absolute and so out of flow — this alignment moves nothing but
    // the lockup.
    <header className="relative flex min-h-dvh w-full items-end justify-center overflow-hidden">
      {/* Media stage. `hero-stage` paints the clip's own backdrop colours, so
          on a tall viewport — where the footage sits in a band rather than
          filling the frame — the studio sweep appears to continue past it
          instead of ending at an edge. See app/globals.css. */}
      <div className="hero-stage">
        {/* `hero-settle` sits here rather than on the image so the poster and
            the video scale as one. On the image alone the poster would still
            be mid-settle while the video faded in at true scale, and the seam
            between the two layers would show. */}
        <div className="hero-media hero-settle">
          {/* The poster is the LCP element, so it is never deferred: a Suspense
              boundary would only delay it, since next/image doesn't suspend and
              the bytes are what cost time, not a data fetch. It is also the
              permanent fallback — under reduced motion, on a metered
              connection, or if autoplay is refused, this is the hero.

              object-cover is what makes one poster serve both arrangements: in
              the banded case the box is 11:9, which crops this 16:9 frame to
              exactly the region the portrait encode contains. */}
          <Image
            src={heroPoster}
            alt="A handcrafted bifold wallet in silver and deep red faux leather, standing against a studio backdrop"
            fill
            sizes="100vw"
            placeholder="blur"
            className="object-cover"
            // priority is deprecated in Next 16 — see ProductGallery.tsx.
            loading="eager"
            fetchPriority="high"
          />

          <HeroVideo />
        </div>
      </div>

      {/* Drawn over the stage rather than inside it, so it is unaffected by
          hero-settle's scale and cannot drift at the edges while the media
          comes to rest. See .hero-veil in app/globals.css for why the hero's
          original no-scrim decision does not extend to a hero with copy. */}
      <div aria-hidden="true" className="hero-veil" />

      {/* The lockup. Centred rather than set to one side, because the wallet is
          centred in the frame and stays inside x 18.75-81.25% for the whole
          rotation: a left-aligned block would collide with the product, while a
          centred one stacks under it and reads as one composition with it.

          Same container as NavBar (max-w-360, px-5 / md:px-16) so it shares the
          page's gutter. No scrim, which is the decision this hero already made
          and is worth keeping: measured against the worst frame of the
          rotation the backdrop here is 8.3:1 or better against #1a1a1a, and
          every element below sets its own colour from the foreground rather
          than from grey.

          Entrances are CSS, not <Reveal>. See the .hero-* block in
          app/globals.css for why an above-the-fold entrance cannot depend on
          an IntersectionObserver firing after hydration. --hero-delay is the
          running order, and it reads top to bottom in the markup. */}
      <div className="relative z-10 mx-auto flex w-full max-w-360 flex-col items-center px-5 pb-12 text-center md:px-16 md:pb-16">
        {/* The system's own device, drawn left to right. Not an eyebrow: there
            is no label riding on it, and the heading beneath carries itself. */}
        <span
          aria-hidden="true"
          className="hero-rule bg-foreground/60 mb-7 block h-px w-14 md:mb-9 md:w-20"
          style={{ "--hero-delay": "180ms" } as React.CSSProperties}
        />

        {/* The homepage's only h1, and now a visible one. Two lines, each
            rising out of its own clip so the pair reads as type being set
            rather than a block fading in. */}
        <h1 className="text-foreground font-serif text-[clamp(2rem,5.6vw,3.5rem)] leading-[1.08] tracking-[-0.02em] text-balance">
          <span className="hero-mask">
            <span style={{ "--hero-delay": "300ms" } as React.CSSProperties}>
              Everyday wallets,
            </span>
          </span>
          <span className="hero-mask">
            <span style={{ "--hero-delay": "400ms" } as React.CSSProperties}>
              without the noise.
            </span>
          </span>
        </h1>

        {/* Both facts are on record and neither is social proof: cash on
            delivery is the strongest trust signal a shop with no order history
            can honestly make, and it is the one thing a first-time buyer
            arriving from a link actually needs to hear. */}
        <p
          className="hero-rise text-on-surface-variant mt-5 max-w-sm text-[15px] leading-[1.6] md:mt-6 md:text-[17px]"
          style={{ "--hero-delay": "620ms" } as React.CSSProperties}
        >
          Handmade in Bangladesh. Cash on delivery, anywhere in the country.
        </p>

        <div
          className="hero-rise mt-8 md:mt-10"
          style={{ "--hero-delay": "740ms" } as React.CSSProperties}
        >
          <AppLink
            href="/collection"
            className="bg-foreground text-background hover:bg-foreground/90 ease-editorial cta-sheen group inline-flex items-center gap-3 rounded-none px-11 py-4.5 text-[12px] font-semibold tracking-[0.18em] uppercase transition-[color,background-color,transform] duration-(--motion-quick) active:translate-y-px"
          >
            Explore the collection
            <ArrowRight
              strokeWidth={1.5}
              className="ease-editorial h-4 w-4 transition-transform duration-(--motion-quick) group-hover:translate-x-1"
            />
          </AppLink>
        </div>
      </div>
    </header>
  );
}
