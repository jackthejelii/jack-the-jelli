import type { Metadata } from "next";
import Reveal from "@/components/layout/Reveal";
import ContactChannels from "@/features/contact/components/ContactChannels";
import ContactFaq from "@/features/contact/components/ContactFaq";
import ContactForm from "@/features/contact/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Send Jack The Jelli a message and we will reply within 24 hours, or call us. Answers to the common questions about delivery, payment and returns.",
  alternates: { canonical: "/contact" },
};

/**
 * Public by design, and deliberately reachable without an order: most of the
 * questions this page answers are asked before anyone buys anything.
 *
 * The order is the whole argument. The form comes first because it is the one
 * route that works at any hour and needs nothing of the visitor but typing;
 * the answers come next, because a question already answered never has to be
 * asked; the phone and the Instagram account come last, for the two cases the
 * first two cannot serve.
 *
 * Chrome comes from the storefront layout, so this stays a route entrypoint.
 */
export default function ContactPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col px-5 pt-32 pb-32 md:px-16 md:pt-40">
      {/* The page's one entrance. Everything below it stays static on purpose:
          the form is the primary action, and an action that has to be revealed
          is an action that can fail to appear. */}
      <Reveal className="mb-16 text-center">
        <h1 className="text-foreground font-serif text-[40px] leading-[1.1] tracking-tight md:text-[56px]">
          Get In Touch
        </h1>
        <p className="text-on-surface-variant mx-auto mt-4 max-w-md text-[18px] leading-relaxed">
          Write to us below and we will reply within 24 hours.
        </p>
      </Reveal>

      <ContactForm />

      <div className="mt-20">
        <ContactFaq />
      </div>

      <div className="mt-20">
        <ContactChannels />
      </div>
    </div>
  );
}
