"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import GoogleButton from "@/features/auth/components/GoogleButton";
import { loginSchema } from "@/features/auth/lib/auth-schema";
import {
  boxedInputClassName,
  fieldLabelClassName,
} from "@/features/auth/lib/auth-form";

type FieldErrors = Partial<Record<"email" | "password", string>>;

/**
 * Codes Better Auth's OAuth callback appends to errorCallbackURL, plus the
 * ones Google itself sends back. Anything unmapped falls through to the
 * generic message rather than surfacing a raw snake_case code.
 *
 * `account_not_linked` deliberately does NOT offer to connect Google:
 * account.accountLinking is disabled in lib/auth.ts (§3.2), so there is no
 * flow — implicit or manual — that would attach the provider afterwards.
 */
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  account_not_linked:
    "This email is already registered with a password. Sign in with your email and password instead.",
  email_not_found:
    "Google didn't share an email address for that account. Sign in with your email and password instead.",
  signup_disabled: "New accounts can't be created with Google right now.",
  invalid_code: "Google sign-in expired before it completed. Try again.",
  no_code: "Google sign-in expired before it completed. Try again.",
  unable_to_get_user_info:
    "We couldn't read your Google profile. Try again in a moment.",
  unable_to_create_user:
    "We couldn't create your account. Try again in a moment.",
  unable_to_create_session:
    "We couldn't start your session. Try again in a moment.",
  internal_server_error: "Something went wrong on our end. Try again.",
};

// Google's own code for "user pressed Cancel on the consent screen". Not a
// failure — showing it in red accuses the user of breaking something they
// chose to do.
const OAUTH_CANCELLED = new Set(["access_denied", "user_cancelled_login"]);

function oauthErrorMessage(code: string | undefined) {
  if (!code || OAUTH_CANCELLED.has(code)) return null;
  return (
    OAUTH_ERROR_MESSAGES[code] ?? "Google sign-in failed. Please try again."
  );
}

interface LoginFormProps {
  oauthError?: string;
  redirectTo: string;
  passwordReset?: boolean;
}

export default function LoginForm({
  oauthError,
  redirectTo,
  passwordReset,
}: LoginFormProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(() =>
    oauthErrorMessage(oauthError),
  );
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendState, setResendState] = useState<"idle" | "pending" | "sent">(
    "idle",
  );
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setUnverifiedEmail(null);
    setResendState("idle");

    const formData = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setIsPending(true);

    const { error } = await authClient.signIn.email({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    setIsPending(false);

    if (error) {
      if (error.code === "EMAIL_NOT_VERIFIED") {
        setUnverifiedEmail(parsed.data.email);
        setFormError(
          "Verify your email before signing in. Check your inbox for the link we sent when you registered.",
        );
        return;
      }
      if (error.code === "INVALID_EMAIL_OR_PASSWORD") {
        // Better Auth returns the same code whether the address is unknown or
        // the password is wrong, so the message must stay ambiguous too —
        // splitting it would turn this form into an account-existence oracle.
        setFormError("That email and password don't match an account.");
        return;
      }
      if (error.status === 429) {
        setFormError("Too many attempts. Wait a moment and try again.");
        return;
      }
      setFormError(error.message ?? "Sign in failed. Please try again.");
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  async function handleResend() {
    if (!unverifiedEmail) return;
    setResendState("pending");
    const { error } = await authClient.sendVerificationEmail({
      email: unverifiedEmail,
      callbackURL: "/verify-email",
    });
    if (error) {
      setResendState("idle");
      setFormError(
        error.message ??
          "Couldn't resend the email. Check your connection and try again.",
      );
      return;
    }
    setResendState("sent");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-md flex-col gap-8"
    >
      <header className="border-border border-b pb-6">
        <h1 className="font-heading text-3xl tracking-widest">Sign In</h1>
        {passwordReset && !formError && (
          <p className="mt-4 text-sm" aria-live="polite">
            Password updated. Sign in with your new password.
          </p>
        )}
        {formError && (
          <p
            role="alert"
            className="text-destructive mt-4 text-sm"
            aria-live="polite"
          >
            {formError}
          </p>
        )}
        {unverifiedEmail && (
          <div className="mt-3">
            {resendState === "sent" ? (
              <p className="text-sm">
                Verification email sent. Check your inbox.
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendState === "pending"}
                className="text-foreground text-sm underline underline-offset-4"
              >
                {resendState === "pending"
                  ? "Sending…"
                  : "Resend verification email"}
              </button>
            )}
          </div>
        )}
      </header>

      <div className="flex flex-col gap-6">
        <Field data-invalid={Boolean(errors.email) || undefined}>
          <FieldLabel htmlFor="email" className={fieldLabelClassName}>
            Email
          </FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            placeholder="rafiq@example.com"
            className={boxedInputClassName}
          />
          <FieldError>{errors.email}</FieldError>
        </Field>

        <Field data-invalid={Boolean(errors.password) || undefined}>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="password" className={fieldLabelClassName}>
              Password
            </FieldLabel>
            <Link
              href="/forgot-password"
              className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-4"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            placeholder="Your password"
            className={boxedInputClassName}
          />
          <FieldError>{errors.password}</FieldError>
        </Field>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="h-12 rounded-none text-sm tracking-widest uppercase"
      >
        {isPending ? "Signing In…" : "Sign In"}
      </Button>

      <div className="flex items-center gap-4">
        <div className="border-border h-px flex-1 border-t" />
        <span className="text-muted-foreground text-xs tracking-widest uppercase">
          Or
        </span>
        <div className="border-border h-px flex-1 border-t" />
      </div>

      <GoogleButton callbackURL={redirectTo} />

      <p className="text-muted-foreground text-center text-sm">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="text-foreground underline underline-offset-4"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}
