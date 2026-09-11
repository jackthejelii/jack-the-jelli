import type { Metadata } from "next";
import { getSession } from "@/lib/auth-guard";
import VerifyEmailNotice from "@/features/auth/components/VerifyEmailNotice";

export const metadata: Metadata = {
  title: "Verify Email",
};

interface VerifyEmailPageProps {
  searchParams: Promise<{ email?: string; error?: string; claimed?: string }>;
}

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const { email, error, claimed } = await searchParams;
  // Resolved here rather than from authClient.useSession() in the client
  // component: Better Auth's verify-email endpoint redirects here with the
  // session cookie already set, so the very first render can show the verified
  // state. Waiting on a client-side session fetch flashed "Check Your Email"
  // at someone who had just clicked the link and verified successfully.
  const session = await getSession();

  return (
    <VerifyEmailNotice
      email={email ?? session?.user.email}
      error={error}
      verified={session?.user.emailVerified === true}
      // Purely presentational — the order was already attached at sign-up, so
      // a hand-edited flag changes nothing but the copy.
      claimed={claimed === "1"}
    />
  );
}
