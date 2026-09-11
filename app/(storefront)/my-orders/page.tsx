import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth-guard";
import OrderHistoryEmpty from "@/features/orders/components/OrderHistoryEmpty";
import OrderHistoryList from "@/features/orders/components/OrderHistoryList";
import { getOrdersForUser } from "@/features/orders/lib/orders";

export const metadata: Metadata = {
  title: "My Orders",
  robots: { index: false, follow: false },
};

/**
 * The signed-in tracking path. Guests use /track instead — checkout never
 * required an account, so neither can this.
 *
 * Orders placed as a guest appear here two ways: the sign-in hook in
 * lib/auth.ts attaches any order whose guestEmail matches the user's verified
 * email, and signing up from a confirmation screen attaches that one order
 * outright (features/checkout/lib/claim-actions.ts).
 */
export default async function MyOrdersPage({
  searchParams,
}: {
  /** Set by /claim after an order is attached on the way back from Google. */
  searchParams: Promise<{ claimed?: string }>;
}) {
  const session = await requireAuth("/my-orders");
  const [{ claimed }, orders] = await Promise.all([
    searchParams,
    getOrdersForUser(session.user.id),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-5 pt-32 pb-32 md:px-16 md:pt-40">
      <header className="border-outline-variant/20 flex flex-wrap items-end justify-between gap-6 border-b pb-8">
        <div>
          <p className="text-on-surface-variant text-[12px] font-semibold tracking-[0.1em] uppercase">
            Account
          </p>
          <h1 className="text-foreground mt-4 font-serif text-[40px] leading-[1.1] tracking-tight md:text-[48px]">
            My Orders
          </h1>
          <p className="text-on-surface-variant mt-3 text-[16px] leading-relaxed">
            Every order placed with this account, newest first.
          </p>
        </div>

        {orders.length > 0 && (
          <p className="text-right">
            <span className="text-foreground block font-serif text-[20px] leading-none tabular-nums">
              {String(orders.length).padStart(2, "0")}
            </span>
            <span className="text-on-surface-variant mt-2 block text-[12px] font-semibold tracking-[0.1em] uppercase">
              {orders.length === 1 ? "Order" : "Orders"}
            </span>
          </p>
        )}
      </header>

      {claimed === "1" && orders.length > 0 && (
        <div className="border-outline-variant/20 bg-surface-container-low/40 mt-8 border px-6 py-5">
          <p className="text-on-surface-variant text-[12px] font-semibold tracking-[0.1em] uppercase">
            Added to your account
          </p>
          <p className="text-foreground mt-2 text-[15px] leading-relaxed">
            Your order now lives here, alongside every future one.
          </p>
        </div>
      )}

      <div className="mt-6">
        {orders.length === 0 ? (
          <OrderHistoryEmpty />
        ) : (
          <OrderHistoryList orders={orders} />
        )}
      </div>
    </div>
  );
}
