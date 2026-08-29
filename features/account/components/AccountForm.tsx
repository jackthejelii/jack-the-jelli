"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { accountSchema } from "@/features/account/lib/account-schema";
import {
  boxedInputClassName,
  fieldLabelClassName,
} from "@/features/account/lib/account-form";

type FieldErrors = Partial<Record<"name" | "phone", string>>;

interface AccountFormProps {
  email: string;
  emailVerified: boolean;
  name: string;
  phone?: string;
}

export default function AccountForm({
  email,
  emailVerified,
  name: initialName,
  phone: initialPhone,
}: AccountFormProps) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "pending" | "sent">(
    "idle",
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    const formData = new FormData(event.currentTarget);
    const parsed = accountSchema.safeParse({
      name: formData.get("name"),
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

    try {
      // phone has additionalFields input: true, so it's updatable here — role
      // (input: false) is never accepted by this endpoint, by construction.
      const { error } = await authClient.updateUser({
        name: parsed.data.name,
        phone: parsed.data.phone ?? "",
      });

      if (error) {
        setFormError(error.message ?? "Couldn't save your changes. Try again.");
        return;
      }

      setSuccessMessage("Changes saved.");
    } catch {
      // A fulfilled request reports failure through `error`; only a request
      // that never completed (offline, aborted) rejects, and without this the
      // button would stay stuck on "Saving…".
      setFormError("Couldn't reach the server. Check your connection.");
    } finally {
      setIsPending(false);
    }
  }

  async function handleResendVerification() {
    // Both flows share formError, so a stale message from a failed save would
    // otherwise sit above a resend that succeeded.
    setFormError(null);
    setResendState("pending");
    try {
      const { error } = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/verify-email",
      });
      if (error) {
        setResendState("idle");
        setFormError(error.message ?? "Couldn't resend the email. Try again.");
        return;
      }
      setResendState("sent");
    } catch {
      setResendState("idle");
      setFormError("Couldn't reach the server. Check your connection.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-md flex-col gap-8"
    >
      <header className="border-border border-b pb-6">
        <h1 className="font-heading text-3xl tracking-widest">Account</h1>
        {formError && (
          <p
            role="alert"
            className="text-destructive mt-4 text-sm"
            aria-live="polite"
          >
            {formError}
          </p>
        )}
        {successMessage && (
          <p className="mt-4 text-sm" aria-live="polite">
            {successMessage}
          </p>
        )}
      </header>

      <div className="flex flex-col gap-6">
        <Field>
          <FieldLabel htmlFor="email" className={fieldLabelClassName}>
            Email
          </FieldLabel>
          <Input
            id="email"
            value={email}
            disabled
            className={boxedInputClassName}
          />
          <div className="mt-1 flex items-center gap-2">
            {emailVerified ? (
              <Badge variant="outline">Verified</Badge>
            ) : (
              <>
                <Badge variant="destructive">Not verified</Badge>
                {resendState === "sent" ? (
                  <span className="text-muted-foreground text-xs">
                    Verification email sent. Check your inbox.
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendState === "pending"}
                    className="text-foreground text-xs underline underline-offset-4"
                  >
                    {resendState === "pending"
                      ? "Sending…"
                      : "Resend verification email"}
                  </button>
                )}
              </>
            )}
          </div>
        </Field>

        <Field data-invalid={Boolean(errors.name) || undefined}>
          <FieldLabel htmlFor="name" className={fieldLabelClassName}>
            Full Name
          </FieldLabel>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            defaultValue={initialName}
            aria-invalid={Boolean(errors.name)}
            className={boxedInputClassName}
          />
          <FieldError>{errors.name}</FieldError>
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
            defaultValue={initialPhone}
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
        {isPending ? "Saving…" : "Save Changes"}
      </Button>
    </form>
  );
}
