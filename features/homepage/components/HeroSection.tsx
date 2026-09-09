import Image from "next/image";
import { ArrowRight } from "lucide-react";
import AppLink from "@/components/layout/AppLink";
import Reveal from "@/components/layout/Reveal";
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
    // of frame height, so the bottom edge is the one place a control can sit
    // without standing in front of the thing it is selling. `.hero-stage` is
    // position:absolute and so out of flow — this alignment moves nothing but
    // the link.
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
            alt="A handcrafted bifold wallet in silver and deep red leather, turning slowly against a studio backdrop"
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

      {/* The homepage's only h1, and the hero no longer shows one. Kept in the
          document rather than dropped: every other route has a top-level
          heading, and the most-linked page on the site should not be the one
          that goes without. The clip says the same thing to everyone who can
          see it. */}
      <h1 className="sr-only">Jack The Jelli — handcrafted leather wallets</h1>

      {/* One control, centred under the product. Same container as NavBar
          (max-w-360, px-5 / md:px-16) so it shares the page's gutter. No
          scrim: measured against the worst frame of the rotation, the backdrop
          here is 8.3:1 or better against #1a1a1a, and the block carries its
          own contrast regardless. */}
      <div className="relative z-10 mx-auto flex w-full max-w-360 justify-center px-5 pb-10 md:px-16 md:pb-12">
        <Reveal index={0}>
          <AppLink
            href="/collection"
            className="bg-foreground text-background hover:bg-foreground/90 ease-editorial cta-sheen group inline-flex items-center gap-3 rounded-none px-10 py-4 text-[12px] font-semibold tracking-widest uppercase transition-[color,background-color,transform] duration-(--motion-quick) active:translate-y-px"
          >
            Explore the collection
            <ArrowRight className="ease-editorial h-4 w-4 transition-transform duration-(--motion-quick) group-hover:translate-x-1" />
          </AppLink>
        </Reveal>
      </div>
    </header>
  );
}
