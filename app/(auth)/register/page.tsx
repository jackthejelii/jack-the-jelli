import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-guard";
import RegisterForm from "@/features/auth/components/RegisterForm";
import { hasReceiptFor } from "@/features/checkout/lib/receipt";
import { getOrderByNumber } from "@/features/orders/lib/orders";

export const metadata: Metadata = {
  title: "Create Account",
};

interface RegisterPageProps {
  /** `claim` is set by the confirmation screen's "Create an account" CTA. */
  searchParams: Promise<{ claim?: string }>;
}

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  // A signed-in visitor can't create a second account from this form — the
  // sign-up call would just fail against their own session's email.
  const session = await getSession();
  if (session) redirect("/");

  const { claim } = await searchParams;
  const claimOrder = await resolveClaim(claim);

  return (
    <RegisterForm
      claimOrder={claimOrder?.orderNumber}
      defaultEmail={claimOrder?.guestEmail}
    />
  );
}

/**
 * The order number reaches this page through a URL a visitor can edit, so it's
 * re-checked against the receipt cookie here rather than trusted. An
 * unverifiable value is dropped silently — the form still works, it just
 * doesn't offer to attach anything.
 *
 * The prefilled address is read off the order rather than passed in the URL for
 * the same reason: it's the address that was actually typed at checkout, and it
 * can't be swapped for someone else's by editing the link.
 */
async function resolveClaim(claim: string | undefined) {
  const orderNumber = claim?.trim();
  if (!orderNumber) return null;
  if (!(await hasReceiptFor(orderNumber))) return null;

  return await getOrderByNumber(orderNumber);
}
