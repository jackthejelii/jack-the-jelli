import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth-guard";
import AccountForm from "@/features/account/components/AccountForm";

export const metadata: Metadata = {
  title: "Account",
  // The one signed-in page that was missing this. Everything on it belongs to
  // one person; robots.txt already disallows the path, and this is the half
  // that survives someone linking straight to it.
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const session = await requireAuth("/account");

  return (
    <div className="mx-auto w-full max-w-360 px-5 py-16 pt-32 md:px-16 md:pt-40">
      <AccountForm
        email={session.user.email}
        emailVerified={session.user.emailVerified}
        name={session.user.name}
        phone={session.user.phone ?? undefined}
      />
    </div>
  );
}
