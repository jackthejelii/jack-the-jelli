"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import GoogleButton from "@/features/auth/components/GoogleButton";
import { claimReceiptOrder } from "@/features/checkout/lib/claim-actions";
import { registerSchema } from "@/features/auth/lib/auth-schema";
import {
  boxedInputClassName,
  fieldLabelClassName,
} from "@/features/auth/lib/auth-form";

type FieldErrors = Partial<
  Record<"name" | "email" | "password" | "phone", string>
>;

// Better Auth's own strings for these read as internal status ("Password too
// short") rather than as something to do about it.
const REGISTER_ERROR_MESSAGES: Record<string, string> = {
  PASSWORD_TOO_SHORT: "Password must be at least 8 characters.",
  PASSWORD_TOO_LONG: "That password is too long.",
  INVALID_EMAIL: "Enter a valid email address.",
  FAILED_TO_CREATE_USER:
    "We couldn't create your account. Try again in a moment.",
};

interface RegisterFormProps {
  /**
   * An order number this browser holds a receipt for, already verified by the
   * page. When present, sign-up attaches that order to the new account.
   */
  claimOrder?: string;
  /** The address given at checkout, when there was one. */
  defaultEmail?: string;
}

export default function RegisterForm({
  claimOrder,
  defaultEmail,
}: RegisterFormProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    const parsed = registerSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      phone: formData.get("phone"),
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

    const { error } = await authClient.signUp.email({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      phone: parsed.data.phone,
      // Where the emailed link lands. The claim flag has to ride along here
      // too — verification often happens later, in a tab that never saw the
      // push below.
      callbackURL: claimOrder ? "/verify-email?claimed=1" : "/verify-email",
    });

    setIsPending(false);

    if (error) {
      // Note there is no "email already registered" branch to write: with
      // requireEmailVerification on, Better Auth answers a duplicate sign-up
      // with a normal success response and sends nothing, so sign-up can't be
      // used to probe which addresses exist. VerifyEmailNotice carries the
      // recovery hint for that case instead.
      if (error.status === 429) {
        setFormError("Too many attempts. Wait a moment and try again.");
        return;
      }
      setFormError(
        REGISTER_ERROR_MESSAGES[error.code ?? ""] ??
          error.message ??
          "Registration failed. Please try again.",
      );
      return;
    }

    // Attach the order now, while the receipt cookie is still in this browser
    // and the account is seconds old — not on first sign-in, which may be
    // hours later on a different device.
    let claimed = false;
    if (claimOrder) {
      try {
        ({ claimed } = await claimReceiptOrder(claimOrder, parsed.data.email));
      } catch {
        // The account was created; failing to attach the order must not read
        // as a failed sign-up. /track still finds it by number and phone.
      }
    }

    // requireEmailVerification means sign-up does not create a session —
    // the account exists but can't sign in until the emailed link is
    // clicked, so send them to check their inbox instead of the homepage.
    const query = new URLSearchParams({ email: parsed.data.email });
    if (claimed) query.set("claimed", "1");
    router.push(`/verify-email?${query}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-md flex-col gap-8"
    >
      <header className="border-border border-b pb-6">
        <h1 className="font-heading text-3xl tracking-widest">
          Create Account
        </h1>
        {claimOrder && (
          <p className="text-muted-foreground mt-3 text-sm">
            Order{" "}
            <span className="text-foreground tracking-[0.08em]">
              {claimOrder}
            </span>{" "}
            will be moved into this account.
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
      </header>

      <div className="flex flex-col gap-6">
        <Field data-invalid={Boolean(errors.name) || undefined}>
          <FieldLabel htmlFor="name" className={fieldLabelClassName}>
            Full Name
          </FieldLabel>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            placeholder="Rafiq Ahmed"
            className={boxedInputClassName}
          />
          <FieldError>{errors.name}</FieldError>
        </Field>

        <Field data-invalid={Boolean(errors.email) || undefined}>
          <FieldLabel htmlFor="email" className={fieldLabelClassName}>
            Email
          </FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={defaultEmail}
            aria-invalid={Boolean(errors.email)}
            placeholder="rafiq@example.com"
            className={boxedInputClassName}
          />
          <FieldError>{errors.email}</FieldError>
        </Field>

        <Field data-invalid={Boolean(errors.password) || undefined}>
          <FieldLabel htmlFor="password" className={fieldLabelClassName}>
            Password
          </FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            placeholder="At least 8 characters"
            className={boxedInputClassName}
          />
          <FieldError>{errors.password}</FieldError>
        </Field>

        <Field data-invalid={Boolean(errors.phone) || undefined}>
          <FieldLabel htmlFor="phone" className={fieldLabelClassName}>
            Phone <span className="normal-case">(optional)</span>
          </FieldLabel>
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            aria-invalid={Boolean(errors.phone)}
            placeholder="01XXXXXXXXX"
            className={boxedInputClassName}
          />
          <FieldError>{errors.phone}</FieldError>
        </Field>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="h-12 rounded-none text-sm tracking-widest uppercase"
      >
        {isPending ? "Creating Account…" : "Create Account"}
      </Button>

      <div className="flex items-center gap-4">
        <div className="border-border h-px flex-1 border-t" />
        <span className="text-muted-foreground text-xs tracking-widest uppercase">
          Or
        </span>
        <div className="border-border h-px flex-1 border-t" />
      </div>

      {/* Google returns with a session but no way to run the claim inline, so
          it lands on /claim, which does it and forwards to My Orders. */}
      <GoogleButton
        callbackURL={
          claimOrder
            ? `/claim?order=${encodeURIComponent(claimOrder)}`
            : undefined
        }
      />

      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-foreground underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
