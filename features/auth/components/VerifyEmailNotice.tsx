"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import {
  boxedInputClassName,
  fieldLabelClassName,
} from "@/features/auth/lib/auth-form";

/**
 * Better Auth redirects here with `?error=<BASE_ERROR_CODES key>` when the
 * verify-email endpoint rejects a token. Only these three are reachable —
 * anything else falls back to the generic copy rather than showing a raw code.
 */
const VERIFY_ERRORS: Record<string, { heading: string; body: string }> = {
  TOKEN_EXPIRED: {
    heading: "Link Expired",
    body: "Verification links are valid for one hour. Enter your email and we'll send a fresh one.",
  },
  INVALID_TOKEN: {
    heading: "Invalid Link",
    body: "That link is malformed or has already been used. Enter your email to get a new one.",
  },
  USER_NOT_FOUND: {
    heading: "Account Not Found",
    body: "We couldn't find an account for that link. It may have been removed. Create a new account to continue.",
  },
};

const GENERIC_ERROR = {
  heading: "Verification Failed",
  body: "We couldn't verify that link. Enter your email and we'll send a new one.",
};

interface VerifyEmailNoticeProps {
  email?: string;
  error?: string;
  verified: boolean;
  /** An order was attached to this account during sign-up. Copy only. */
  claimed?: boolean;
}

export default function VerifyEmailNotice({
  email: initialEmail,
  error,
  verified,
  claimed = false,
}: VerifyEmailNoticeProps) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [sent, setSent] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleResend(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) {
      setFormError("Enter your email to resend the link.");
      return;
    }
    setIsPending(true);
    setFormError(null);

    const { error: resendError } = await authClient.sendVerificationEmail({
      email: email.trim(),
      callbackURL: "/verify-email",
    });

    setIsPending(false);

    if (resendError) {
      setFormError(
        resendError.message ??
          "Couldn't resend the email. Check your connection and try again.",
      );
      return;
    }

    setSent(true);
  }

  if (verified) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 text-center">
        <h1 className="font-heading text-3xl tracking-widest">
          Email Verified
        </h1>
        <p className="text-muted-foreground text-sm">
          {claimed
            ? "Your account is ready, and your order is waiting inside it."
            : "Your account is ready. Welcome to Jack The Jelli."}
        </p>
        <Button
          asChild
          className="h-12 rounded-none text-sm tracking-widest uppercase"
        >
          {/* Someone who just verified in order to keep an order should land
              on the order, not on the homepage. */}
          <Link href={claimed ? "/my-orders" : "/"}>
            {claimed ? "View My Orders" : "Continue Shopping"}
          </Link>
        </Button>
      </div>
    );
  }

  const failure = error ? (VERIFY_ERRORS[error] ?? GENERIC_ERROR) : null;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 text-center">
      <h1 className="font-heading text-3xl tracking-widest">
        {failure ? failure.heading : "Check Your Email"}
      </h1>
      <p className="text-muted-foreground text-sm">
        {failure
          ? failure.body
          : initialEmail
            ? `We sent a verification link to ${initialEmail}. Click it to activate your account.`
            : "We sent a verification link to your email. Click it to activate your account."}
      </p>

      {claimed && !failure && (
        <p className="text-on-surface-variant text-sm">
          Your order is already attached. It will be under My Orders as soon as
          you verify.
        </p>
      )}

      {sent ? (
        <p className="text-sm">Verification email sent. Check your inbox.</p>
      ) : (
        <form onSubmit={handleResend} className="flex flex-col gap-4 text-left">
          {(failure || !initialEmail) && (
            <Field>
              <FieldLabel
                htmlFor="resend-email"
                className={fieldLabelClassName}
              >
                Email
              </FieldLabel>
              <Input
                id="resend-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="rafiq@example.com"
                className={boxedInputClassName}
              />
            </Field>
          )}
          {formError && (
            <p role="alert" className="text-destructive text-sm">
              {formError}
            </p>
          )}
          <Button
            type="submit"
            disabled={isPending}
            className="h-12 rounded-none text-sm tracking-widest uppercase"
          >
            {isPending ? "Sending…" : "Resend Verification Email"}
          </Button>
        </form>
      )}

      {/* Registering with an address that already has an account returns a
          success response and sends nothing — Better Auth does that on purpose
          so sign-up can't be used to probe which emails are registered. That
          leaves this screen as the dead end unless it says so. */}
      {!failure && (
        <p className="text-muted-foreground text-sm">
          Nothing arriving? This address may already have an account:{" "}
          <Link
            href="/login"
            className="text-foreground underline underline-offset-4"
          >
            sign in
          </Link>{" "}
          or{" "}
          <Link
            href="/forgot-password"
            className="text-foreground underline underline-offset-4"
          >
            reset your password
          </Link>
          .
        </p>
      )}

      <p className="text-muted-foreground text-sm">
        <Link
          href="/login"
          className="text-foreground underline underline-offset-4"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
