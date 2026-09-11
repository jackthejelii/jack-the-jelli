import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-guard";
import ForgotPasswordForm from "@/features/auth/components/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password",
};

export default async function ForgotPasswordPage() {
  // Already signed in — there is nothing to recover from here.
  const session = await getSession();
  if (session) redirect("/account");

  return <ForgotPasswordForm />;
}
