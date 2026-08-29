"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { loginSchema } from "@/features/auth/lib/auth-schema";
import {
  boxedInputClassName,
  fieldLabelClassName,
} from "@/features/auth/lib/auth-form";

const emailSchema = loginSchema.pick({ email: true });

export default function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const parsed = emailSchema.safeParse({ email: formData.get("email") });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid email");
      return;
    }

    setIsPending(true);
    // The server answers 200 whether or not the address is registered, so an
    // error here is never about account existence — it's a transport failure,
    // a 429, or a misconfigured server. Reporting "check your email" for those
    // strands the user waiting on a message that was never sent.
    const { error: requestError } = await authClient.requestPasswordReset({
      email: parsed.data.email,
      redirectTo: "/reset-password",
    });
    setIsPending(false);

    if (requestError) {
      setError(
        requestError.status === 429
          ? "Too many requests. Wait a moment and try again."
          : "We couldn't send the reset link. Check your connection and try again.",
      );
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 text-center">
        <h1 className="font-heading text-3xl tracking-widest">
          Check Your Email
        </h1>
        <p className="text-muted-foreground text-sm">
          If an account exists for that address, we&apos;ve sent a link to reset
          your password.
        </p>
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

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-md flex-col gap-8"
    >
      <header className="border-border border-b pb-6">
        <h1 className="font-heading text-3xl tracking-widest">
          Forgot Password
        </h1>
        <p className="text-muted-foreground mt-4 text-sm">
          Enter your email and we&apos;ll send you a link to reset your
          password.
        </p>
      </header>

      <Field data-invalid={Boolean(error) || undefined}>
        <FieldLabel htmlFor="email" className={fieldLabelClassName}>
          Email
        </FieldLabel>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(error)}
          placeholder="rafiq@example.com"
          className={boxedInputClassName}
        />
        <FieldError>{error}</FieldError>
      </Field>

      <Button
        type="submit"
        disabled={isPending}
        className="h-12 rounded-none text-sm tracking-widest uppercase"
      >
        {isPending ? "Sending…" : "Send Reset Link"}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        <Link
          href="/login"
          className="text-foreground underline underline-offset-4"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
