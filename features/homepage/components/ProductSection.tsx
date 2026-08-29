import Image from "next/image";
import { ArrowRight } from "lucide-react";
import AppLink from "@/components/layout/AppLink";
import Reveal from "@/components/layout/Reveal";

// TODO: Remove this once we have a proper image service

const flameImage =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCHtIARaKt5BvtQN4y3QXm-c-ZFBa8b15Wy5cQoRhRiInTj483QUDl26DBNdnBm6mwXh0J5vjJi8h1RKg0JCP9Z5BIMhMEiwlVGDetafXRgU5Wh46B5-lG0d6IJ0J1P35nu735UGEb61fGDepBSnwGT_moQ3bii2YU8p_Y00Mhw5hlbVdGSDNp2FoWI5PIG-ifj49ZZgv853DBUW3_FlmDEHjZZaQJtOvwjPzwAPtGR-4jhXMMYqh4n0iFIKkxL7urEqsqZQxVdh0OD";

const regularImage =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCGsD0T_IBGaLXNSbF6aA2nFDdW4mMG9CtVwXXzatVVVjnjvkgf6XSWkA5tkEyJkp7hOZjk7fzJzOVkrv57e_1M_mPRJGFGLww2IaGBMfkg_7otGwbVddyCMvrfUZ-6hz5FZ4Vo3MrqssbPDcpldUGweGbUfiKUzOM4LjjvfkYn8n2-akp5kyzJ5PgS0lWzAueIWvwMPsYP1HI7jSzjxXIIvCYj0ZU3GV0lbMCaOr1HbFiZnDLuvkYP-QY225sPAJVp0q0uWVJjtq-I";

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
              <span className="text-on-surface-variant mb-4 block text-[12px] font-semibold tracking-widest uppercase">
                01 / Signature
              </span>
            </Reveal>

            <Reveal index={1}>
              <h2 className="text-foreground mb-6 font-serif text-[32px] leading-[1.3]">
                The Flame Bifold
              </h2>
            </Reveal>

            <Reveal index={2}>
              <p className="text-on-surface-variant mb-8 max-w-sm text-[18px] leading-[1.6]">
                Hand-embossed with a flame motif, this bifold is our signature
                piece. Full-grain leather that deepens with time. Six card
                slots, one unlined bill compartment.
              </p>
            </Reveal>

            <AppLink
              href="/collection?category=flame-wallet"
              className="text-foreground border-foreground hover:border-on-surface-variant hover:text-on-surface-variant ease-editorial inline-flex w-fit items-center gap-2 border-b pb-1 text-[12px] font-semibold tracking-widest uppercase transition-colors duration-(--motion-quick)"
            >
              Discover Flame
              <ArrowRight className="h-4 w-4" />
            </AppLink>
          </div>

          <div className="order-1 md:order-2 md:col-span-5 md:col-start-8">
            <div className="group bg-surface-container relative aspect-4/5 overflow-hidden border border-[rgba(138,121,104,0.2)]">
              {flameImage ? (
                <Image
                  src={flameImage}
                  alt="A handcrafted leather bifold wallet with an embossed flame design"
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 40vw"
                  loading="lazy"
                  className="ease-editorial object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="text-on-surface-variant absolute inset-0 flex items-center justify-center text-sm">
                  Image placeholder
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* --- Regular Wallet --- */}
      <section className="bg-surface-container-low w-full py-32">
        <div className="mx-auto max-w-360 px-5 text-center md:px-16">
          <Reveal index={0}>
            <span className="text-on-surface-variant mb-4 block text-[12px] font-semibold tracking-widest uppercase">
              02 / Classic
            </span>
          </Reveal>

          <Reveal index={1}>
            <h2 className="text-foreground mb-12 font-serif text-[32px] leading-[1.3]">
              The Regular Bifold
            </h2>
          </Reveal>

          <div className="group bg-surface-container relative mx-auto aspect-video w-full max-w-5xl overflow-hidden border border-[rgba(138,121,104,0.2)] md:aspect-21/9">
            {regularImage ? (
              <Image
                src={regularImage}
                alt="A classic smooth leather bifold wallet in a natural tone"
                fill
                sizes="(max-width: 768px) 100vw, 80vw"
                loading="lazy"
                className="ease-editorial bg-no-repeat object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="text-on-surface-variant absolute inset-0 flex items-center justify-center text-sm">
                Image placeholder
              </div>
            )}
          </div>

          <div className="mt-12">
            <Reveal index={2}>
              <p className="text-on-surface-variant mx-auto mb-8 max-w-2xl text-[18px] leading-[1.6]">
                Clean lines, no embellishment. A timeless bifold in full-grain
                leather for those who prefer understated elegance.
              </p>
            </Reveal>

            <AppLink
              href="/collection?category=regular-wallet"
              className="border-foreground text-foreground hover:bg-foreground hover:text-background ease-editorial inline-flex items-center justify-center rounded-none border bg-transparent px-10 py-4 text-[12px] font-semibold tracking-widest uppercase transition-colors duration-(--motion-quick)"
            >
              View Classic
            </AppLink>
          </div>
        </div>
      </section>
    </>
  );
}
