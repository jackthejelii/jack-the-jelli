import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth-guard";
import { hasReceiptFor } from "@/features/checkout/lib/receipt";
import ClearCartOnMount from "@/features/checkout/components/ClearCartOnMount";
import OrderReceipt from "@/features/orders/components/OrderReceipt";
import {
  getOrderByNumber,
  getOrderForUser,
} from "@/features/orders/lib/orders";

export const metadata: Metadata = {
  title: "Order Confirmed",
  robots: { index: false, follow: false },
};

const WHAT_HAPPENS_NEXT = [
  {
    title: "We call to confirm",
    body: "Someone from the workshop will ring the number you gave, usually within a few hours, to confirm the order before anything is packed.",
  },
  {
    title: "Your piece is prepared",
    body: "Once confirmed, it's checked, wrapped and handed to the courier.",
  },
  {
    title: "You pay on delivery",
    body: "Please keep the exact total in cash ready for the courier.",
  },
];

/**
 * Reachable two ways, and only two:
 *   - the signed receipt cookie placeOrder just set (guests), or
 *   - the order being attached to the signed-in user's account.
 *
 * The order number in the URL is never sufficient on its own — otherwise this
 * page would hand a stranger's address and phone number to anyone who guessed
 * a number.
 */
export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: requestedOrder } = await searchParams;
  const orderNumber = requestedOrder?.trim() ?? "";

  const session = await getSession();
  const order = orderNumber
    ? (await hasReceiptFor(orderNumber))
      ? await getOrderByNumber(orderNumber)
      : session
        ? await getOrderForUser(orderNumber, session.user.id)
        : null
    : null;

  if (!order) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center px-5 pt-40 pb-40 text-center md:px-16">
        <h1 className="text-foreground font-serif text-[40px] leading-tight tracking-tight">
          We can&apos;t show that order
        </h1>
        <p className="text-on-surface-variant mt-4 text-[16px] leading-relaxed">
          This confirmation link has expired, or it belongs to another browser.
          You can still look the order up with its number and the phone number
          you gave.
        </p>
        <Link
          href="/track"
          className="border-foreground text-foreground hover:bg-foreground hover:text-background mt-10 inline-flex items-center justify-center border px-10 py-4 text-[12px] font-semibold tracking-[0.1em] uppercase transition-colors duration-300"
        >
          Track an order
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-5 pt-32 pb-32 text-center md:px-16 md:pt-40">
      {/* The cart is only emptied here — a rejected order has to leave it
          intact so the customer can fix a line and retry. */}
      <ClearCartOnMount orderNumber={order.orderNumber} />

      <h1 className="text-foreground font-serif text-[40px] leading-[1.1] tracking-tight md:text-[56px]">
        Order Confirmed
      </h1>
      <p className="text-on-surface-variant mt-6 max-w-md text-[16px] leading-relaxed">
        Your acquisition has been secured. We are preparing your piece with the
        utmost care.
      </p>

      <div className="border-outline-variant/20 mt-12 flex w-full max-w-sm flex-col items-center gap-3 border-y py-8">
        <span className="text-on-surface-variant text-[12px] font-semibold tracking-[0.1em] uppercase">
          Order Number
        </span>
        <span className="text-foreground text-[18px] tracking-[0.15em]">
          {order.orderNumber}
        </span>
      </div>

      <section className="mt-16 w-full text-left">
        <h2 className="border-outline-variant/20 text-on-surface-variant border-b pb-3 text-[12px] font-semibold tracking-[0.1em] uppercase">
          What happens next
        </h2>
        <ol className="mt-6 flex flex-col gap-6">
          {WHAT_HAPPENS_NEXT.map((step, index) => (
            <li key={step.title} className="flex gap-5">
              <span className="text-on-surface-variant shrink-0 font-serif text-[20px] tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-foreground font-serif text-[18px]">
                  {step.title}
                </h3>
                <p className="text-on-surface-variant mt-1 text-[15px] leading-relaxed">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-16 w-full">
        <h2 className="border-outline-variant/20 text-on-surface-variant mb-6 border-b pb-3 text-left text-[12px] font-semibold tracking-[0.1em] uppercase">
          Your order
        </h2>
        <OrderReceipt order={order} />
      </section>

      {/* Offered after the order, never as a gate — the whole point of the
          guest-first flow is that this screen is the first time an account is
          even mentioned. */}
      {!session && (
        <div className="border-outline-variant/20 bg-surface-container-low/40 mt-12 w-full border p-8 text-left">
          <h2 className="text-foreground font-serif text-[22px]">
            Keep track of this order
          </h2>
          {/* Deliberately makes no promise about the email matching: the
              order is attached from this browser's receipt cookie, not by
              address, so it works even when checkout was completed without
              one. */}
          <p className="text-on-surface-variant mt-2 text-[15px] leading-relaxed">
            Create an account and this order comes with it, plus every future
            one, under My Orders. Any email will do; the order is carried across
            from this browser.
          </p>
          <Link
            href={`/register?claim=${encodeURIComponent(order.orderNumber)}`}
            className="bg-foreground text-background hover:bg-secondary mt-6 inline-flex items-center justify-center px-10 py-3.5 text-[12px] font-semibold tracking-[0.1em] uppercase transition-colors duration-300"
          >
            Create an account
          </Link>
        </div>
      )}

      <div className="mt-16 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/collection"
          className="border-foreground text-foreground hover:bg-foreground hover:text-background inline-flex items-center justify-center border px-10 py-4 text-[12px] font-semibold tracking-[0.1em] uppercase transition-colors duration-300"
        >
          Continue shopping
        </Link>
        <Link
          href={`/track?order=${encodeURIComponent(order.orderNumber)}`}
          className="text-on-surface-variant hover:text-foreground px-4 py-4 text-[12px] font-semibold tracking-[0.1em] uppercase transition-colors duration-300"
        >
          Track this order
        </Link>
      </div>
    </div>
  );
}
