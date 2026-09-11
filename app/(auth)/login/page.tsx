import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-guard";
import LoginForm from "@/features/auth/components/LoginForm";
import { safeRedirectPath } from "@/features/auth/lib/redirect";

export const metadata: Metadata = {
  title: "Sign In",
};

interface LoginPageProps {
  searchParams: Promise<{
    error?: string;
    redirect?: string;
    reset?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo = safeRedirectPath(params.redirect);

  // Someone already signed in has nothing to do here — and if proxy.ts sent
  // them with a ?redirect, honouring it now saves a pointless round trip.
  const session = await getSession();
  if (session) redirect(redirectTo);

  return (
    <LoginForm
      oauthError={params.error}
      redirectTo={redirectTo}
      passwordReset={params.reset === "1"}
    />
  );
}
