import type { Metadata } from "next";
import { getSession } from "@/lib/auth-guard";
import { getUsersCollection } from "@/lib/users";
import { ObjectId } from "mongodb";
import CheckoutView from "@/features/checkout/components/CheckoutView";

export const metadata: Metadata = {
  title: "Checkout | Jack The Jelli",
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
    />
  );
}
