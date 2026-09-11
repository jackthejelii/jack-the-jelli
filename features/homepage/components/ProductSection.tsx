import Image from "next/image";
import { ArrowRight } from "lucide-react";
import AppLink from "@/components/layout/AppLink";
import Reveal from "@/components/layout/Reveal";

// Real photographs, served from `public/` and optimised by next/image at
// request time. They replace two AI-mockup placeholders that were hotlinked
// from `lh3.googleusercontent.com/aida-public/…` — a host that could have
// dropped them without warning, and one heavily used by phishing kits, which
// is a bad thing for a new commerce domain to be seen loading.
//
// Imported rather than written as string paths so the build fails loudly if a
// file is renamed, and so next/image knows each one's intrinsic size.
import flameImage from "@/public/Flame_homepage.jpg";
import regularImage from "@/public/Regular.jpg";

export default function ProductSection() {
  return (
    <>
      {/* --- Flame Wallet (Main) --- */}
      <section className="mx-auto my-32 max-w-360 px-5 md:px-16">
        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-12">
          <div className="order-2 mt-12 flex flex-col justify-center md:order-1 md:col-span-4 md:col-start-2 md:mt-0">
            {/* The index restarts at 0 in each section: the stagger describes a
                relationship between siblings, so it has to be scoped to the
                group that is actually read together. */}
            <Reveal index={0}>
              <h2 className="text-foreground mb-6 font-serif text-[32px] leading-[1.3]">
                The Flame Bifold
              </h2>
            </Reveal>

            <Reveal index={1}>
              <p className="text-on-surface-variant mb-8 max-w-sm text-[18px] leading-[1.6]">
                Hand-embossed with a flame motif, this bifold is our signature
                piece. Full-grain leather that deepens with time. Six card
                slots, one unlined bill compartment.
              </p>
            </Reveal>

            <AppLink
              href="/collection?category=flame-wallet"
              className="text-foreground border-foreground hover:border-on-surface-variant hover:text-on-surface-variant ease-editorial group inline-flex w-fit items-center gap-2 border-b pb-1 text-[12px] font-semibold tracking-widest uppercase transition-[color,border-color,transform] duration-(--motion-quick) active:translate-y-px"
            >
              Discover Flame
              <ArrowRight className="ease-editorial h-4 w-4 transition-transform duration-(--motion-quick) group-hover:translate-x-1" />
            </AppLink>
          </div>

          <div className="order-1 md:order-2 md:col-span-5 md:col-start-8">
            <div className="group bg-surface-container relative aspect-4/5 overflow-hidden border border-[rgba(138,121,104,0.2)]">
              <Image
                src={flameImage}
                alt="A handcrafted leather bifold wallet with an embossed flame design"
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 40vw"
                loading="lazy"
                placeholder="blur"
                className="ease-editorial object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
          </div>
        </div>
      </section>

      {/* --- Regular Wallet --- */}
      <section className="bg-surface-container-low w-full py-32">
        <div className="mx-auto max-w-360 px-5 text-center md:px-16">
          <Reveal index={0}>
            <h2 className="text-foreground mb-12 font-serif text-[32px] leading-[1.3]">
              The Regular Bifold
            </h2>
          </Reveal>

          <div className="group bg-surface-container relative mx-auto aspect-video w-full max-w-5xl overflow-hidden border border-[rgba(138,121,104,0.2)] md:aspect-21/9">
            <Image
              src={regularImage}
              alt="A classic smooth leather bifold wallet in a natural tone"
              fill
              sizes="(max-width: 768px) 100vw, 80vw"
              loading="lazy"
              placeholder="blur"
              className="ease-editorial bg-no-repeat object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>

          <div className="mt-12">
            <Reveal index={1}>
              <p className="text-on-surface-variant mx-auto mb-8 max-w-2xl text-[18px] leading-[1.6]">
                Clean lines, no embellishment. A timeless bifold in full-grain
                leather for those who prefer understated elegance.
              </p>
            </Reveal>

            <AppLink
              href="/collection?category=regular-wallet"
              className="border-foreground text-foreground hover:bg-foreground hover:text-background ease-editorial inline-flex items-center justify-center rounded-none border bg-transparent px-10 py-4 text-[12px] font-semibold tracking-widest uppercase transition-[color,background-color,border-color,transform] duration-(--motion-quick) active:translate-y-px"
            >
              View Classic
            </AppLink>
          </div>
        </div>
      </section>
    </>
  );
}
