import type { Metadata } from "next";
import ResetPasswordForm from "@/features/auth/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password",
};

interface ResetPasswordPageProps {
  // Better Auth's /reset-password/:token callback redirects here with either
  // ?token=… on success or ?error=INVALID_TOKEN when the token is expired,
  // already consumed, or unknown — the two cases need different copy.
  searchParams: Promise<{ token?: string; error?: string }>;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { token, error } = await searchParams;
  return <ResetPasswordForm token={token} linkError={error} />;
}
