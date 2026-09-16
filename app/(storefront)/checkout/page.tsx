import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth-guard";
import { getSettings, toDeliveryRates } from "@/lib/settings";
import { getUsersCollection } from "@/lib/users";
import { ObjectId } from "mongodb";
import MessageScreen, {
  messageScreenActionClass,
} from "@/components/layout/MessageScreen";
import CheckoutView from "@/features/checkout/components/CheckoutView";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your order. Cash on delivery across Bangladesh.",
  // Nothing here should ever be indexed.
  robots: { index: false, follow: false },
};

/**
 * Checkout is deliberately outside proxy.ts's matcher: it's guest-first, and
 * gating it on an account would be fatal when Better Auth requires email
 * verification before sign-in.
 *
 * Being signed in only prefills the form. `phone` comes from the `user`
 * collection directly because it's a Better Auth additionalField, and the
 * session payload isn't where it's authoritative.
 */
export default async function CheckoutPage() {
  const settings = await getSettings();

  // The courteous half of "orders are paused": the shopper is told before
  // filling in an address, rather than after pressing the button. The half
  // that actually stops an order is in `placeOrder`, which refuses the same
  // request whether or not this screen was ever rendered — a tab opened
  // before the switch was flipped still holds a live form.
  //
  // The cart is deliberately left alone. Pausing orders is a temporary state,
  // and emptying someone's basket over it would cost the shop the sale it is
  // trying to defer.
  if (settings.ordersPaused) {
    return (
      <MessageScreen
        eyebrow="Closed"
        title="We're not taking orders right now"
        description={settings.ordersPausedMessage}
        actions={
          <Link href="/collection" className={messageScreenActionClass}>
            Keep Browsing
          </Link>
        }
      />
    );
  }

  const session = await getSession();

  let phone: string | undefined;
  if (session && ObjectId.isValid(session.user.id)) {
    const users = await getUsersCollection();
    const user = await users.findOne({ _id: new ObjectId(session.user.id) });
    phone = user?.phone;
  }

  return (
    <CheckoutView
      defaults={{
        fullName: session?.user.name,
        email: session?.user.email,
        phone,
      }}
      rates={toDeliveryRates(settings)}
    />
  );
}
