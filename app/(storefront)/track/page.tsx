import type { Metadata } from "next";
import TrackOrderForm from "@/features/orders/components/TrackOrderForm";

export const metadata: Metadata = {
  title: "Track Your Order",
  description:
    "Drop in your order number and the phone number you gave, and we’ll show you exactly where your gear is, and how long until the compliments start.",
  // `?order=…` prefills the form from a link in a confirmation email, so this
  // page has as many URLs as there are orders. They are all one page.
  alternates: { canonical: "/track" },
};

/**
 * Public, by design: checkout is guest-first, so tracking can't be behind an
 * account either. The order number alone reveals nothing — the lookup requires
 * the phone number the order was placed with.
 */
export default async function TrackOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;

  return (
    <div className="mx-auto flex max-w-3xl flex-col px-5 pt-32 pb-32 md:px-16 md:pt-40">
      <header className="mb-16 text-center">
        <h1 className="text-foreground font-serif text-[40px] leading-[1.1] tracking-tight md:text-[56px]">
          Track Your Order
        </h1>
        <p className="text-on-surface-variant mx-auto mt-4 max-w-md text-[18px] leading-relaxed">
          Enter your order number and the phone number you gave to see where
          your piece is.
        </p>
      </header>

      <TrackOrderForm defaultOrderNumber={order} />
    </div>
  );
}
