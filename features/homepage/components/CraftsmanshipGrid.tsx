import Image from "next/image";
import { Gem } from "lucide-react";
import Reveal from "@/components/layout/Reveal";

// TODO: Replace with actual images once we have them

const craftsmanshipImages = {
  process:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAg53evmNUh5lPc7OLH_jsrJcbflg93XUXrnXb5pJRCSqpf4DxTZXDp6SLnwj7mISorCMlod3hCPnOTuAIBJ0-ngcUaGe1UszRQmFTuXTfp4qsvMfvGe_kH9U6eVWfrnVYUQqUqwfmUhYteTpzE4uJolWVm_IsLYdwclkL7v4j7jqJmA7JTX_2DT6nT6AhJaVpbKWsvrCwP5DnB3hLYstu_-80sTGt7LbkXlxmFdZ5XK-iCXtORGO1Sc2f3YMcDhNlOWFOmg2uq7mYm",
  stitching:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDkdtNQjEg9T1Y6HPA13wW-7q-gtF02Jdtc2PAD10PounPlI7AbNWZTiJFUjtZCIm_tihprLucLFXa_YXv3lVZB9ztzv4F3l4DNXVqhF-_0M_7NlkC0whlwGhT_eKhkwaIlfd1uS3-JzE1nMaDHh5Za1xrQF3CkDYZ6Ckj2x6lxkwi6Cad3xW_cUyCRJ_0Vc89EaRS7yxXihM-PaV2RvXqTuR192lvZE_n3gCFPjPX8ZovnH0vlGZSFr8_z3BGK1q_7ofP4J7vbzXgJ",
};

export default function CraftsmanshipGrid() {
  return (
    <section
      id="craftsmanship"
      className="mx-auto max-w-360 px-5 py-32 md:px-16"
    >
      {/* Header */}
      <Reveal index={0}>
        <h2 className="text-foreground mb-12 text-center font-serif text-3xl leading-[1.3]">
          Uncompromising Quality
        </h2>
      </Reveal>

      {/* Bento grid. Reveal takes over each tile's own classes rather than
          wrapping it — these are grid items, and an extra element between the
          grid and its children would break the layout. */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Large image box */}
        <Reveal
          index={1}
          className="group relative overflow-hidden border border-[rgba(138,121,104,0.2)] md:h-125"
        >
          {craftsmanshipImages.process ? (
            <Image
              src={craftsmanshipImages.process}
              alt="An artisan's workbench with a hand holding a leatherworking awl"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              loading="lazy"
              className="ease-editorial object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-white/50">
              Image placeholder
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent p-8">
            <h3 className="mb-2 font-serif text-[32px] leading-[1.3] text-white">
              The Process
            </h3>
            <p className="text-[16px] leading-[1.6] text-white/80">
              Every piece takes time.
            </p>
          </div>
        </Reveal>

        {/* Two stacked boxes */}
        <div className="grid h-full grid-rows-2 gap-8">
          {/* Icon + text box. The hover shadow is a separate transition from
              the entrance, so it is declared on an inner element: putting
              `transition-shadow` on the tile itself is what previously stopped
              this box revealing at all — it overrode the entrance transition,
              leaving the opacity and translate to snap. */}
          <Reveal index={2} className="flex flex-1 flex-col">
            <div className="bg-surface-container ease-editorial flex flex-1 flex-col justify-center border border-[rgba(138,121,104,0.2)] p-8 transition-shadow duration-(--motion-quick) hover:shadow-[0px_12px_32px_rgba(26,26,26,0.04)]">
              <Gem className="text-foreground mb-6 h-8 w-8" />
              <h3 className="text-foreground mb-2 text-[18px] leading-[1.6] font-semibold">
                Vegetable Tanned
              </h3>
              <p className="text-on-surface-variant text-[16px] leading-[1.6]">
                Sourced from the finest tanneries in Tuscany, utilizing organic
                tannins for a superior finish.
              </p>
            </div>
          </Reveal>

          {/* Stitching image box */}
          <Reveal
            index={3}
            className="group relative aspect-2/1 flex-1 overflow-hidden border border-[rgba(138,121,104,0.2)] bg-(--surface-container) md:aspect-auto"
          >
            {craftsmanshipImages.stitching ? (
              <Image
                src={craftsmanshipImages.stitching}
                alt="Close up of perfectly aligned linen thread stitching on leather"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                loading="lazy"
                className="ease-editorial object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-(--on-surface-variant)">
                Image placeholder
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent p-8">
              <h3 className="text-[18px] leading-[1.6] font-semibold text-white">
                Saddle Stitched
              </h3>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
