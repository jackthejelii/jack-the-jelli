"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  fieldLabelClassName,
  underlineInputClassName,
} from "@/features/checkout/lib/checkout-form";
import { submitContactMessage } from "@/features/contact/lib/contact-actions";
import { emptyContactState } from "@/features/contact/lib/contact-state";

/**
 * shadcn's own invalid state draws `ring-3`, which is a box-shadow and so paints
 * all four sides however the borders are set. On a boxed input that reads as
 * intended; on this design system's underline-only field it draws a red
 * rectangle around nothing. `aria-invalid:ring-0` drops it and lets the red
 * bottom border alone carry the error.
 *
 * NOTE: the shared `underlineInputClassName` has the same gap, so checkout and
 * account still show that rectangle. Left alone rather than changed from here,
 * since it would restyle three surfaces this task never looked at.
 */
const invalidUnderlineFix = "aria-invalid:ring-0";

/** The underline treatment, minus the fixed height an input gets. */
const underlineTextareaClassName =
  "border-outline-variant/50 focus-visible:border-foreground min-h-28 resize-none rounded-none border-0 border-b bg-transparent px-0 text-[16px] shadow-none transition-colors focus-visible:ring-0 aria-invalid:border-destructive aria-invalid:ring-0";

export default function ContactForm() {
  const [state, formAction, pending] = useActionState(
    submitContactMessage,
    emptyContactState,
  );

  /**
   * When the form became usable, read server-side to reject submissions that
   * arrive faster than a person could type.
   *
   * Written straight to the DOM node rather than held in state: it is a value
   * for the server, never something this component renders from, so putting it
   * in state would buy a second render and nothing else. Writing it after
   * mount also keeps the server and client markup identical.
   *
   * The `0` it ships with fails the server's check open, which is the right
   * way round. A hidden field that never got updated must not be the reason a
   * real message is dropped.
   */
  const startedAtRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (startedAtRef.current) startedAtRef.current.value = String(Date.now());
  }, []);

  if (state.ok) {
    return (
      <div className="border-outline-variant/20 bg-surface-container-low/40 flex flex-col items-center border p-8 text-center md:p-10">
        <h2 className="text-foreground font-serif text-[28px] leading-tight tracking-tight">
          Message sent
        </h2>
        <p
          role="status"
          className="text-on-surface-variant mt-3 max-w-sm text-[15px] leading-relaxed"
        >
          {state.message}
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      aria-label="Send us a message"
      className="border-outline-variant/20 bg-surface-container-low/40 relative border p-8 md:p-10"
    >
      {/* No heading of its own. The form sits directly under the page title,
          which already says what it is; an "Or write to us" here was left over
          from when this block came last, and now only repeats the standfirst
          two lines above it. The aria-label carries the name for anyone who
          reaches the form out of that context. */}

      {/* Honeypot. Positioned off-screen rather than display:none, which some
          bots know to skip, and hidden from assistive tech and the tab order
          so nobody can fill it by accident. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 -left-[9999px] h-px w-px overflow-hidden"
      >
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <input
        type="hidden"
        name="startedAt"
        ref={startedAtRef}
        defaultValue="0"
      />

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-6 md:flex-row">
          <Field className="flex-1" data-invalid={Boolean(state.errors?.name)}>
            <FieldLabel htmlFor="name" className={fieldLabelClassName}>
              Your Name
            </FieldLabel>
            <Input
              id="name"
              name="name"
              defaultValue={state.values?.name}
              autoComplete="name"
              aria-invalid={Boolean(state.errors?.name)}
              className={`${underlineInputClassName} ${invalidUnderlineFix}`}
            />
            <FieldError>{state.errors?.name}</FieldError>
          </Field>

          <Field className="flex-1" data-invalid={Boolean(state.errors?.email)}>
            <FieldLabel htmlFor="email" className={fieldLabelClassName}>
              Email
            </FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              defaultValue={state.values?.email}
              aria-invalid={Boolean(state.errors?.email)}
              className={`${underlineInputClassName} ${invalidUnderlineFix}`}
            />
            <FieldError>{state.errors?.email}</FieldError>
          </Field>
        </div>

        <Field data-invalid={Boolean(state.errors?.phone)}>
          <FieldLabel htmlFor="phone" className={fieldLabelClassName}>
            Phone (optional)
          </FieldLabel>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="01XXXXXXXXX"
            defaultValue={state.values?.phone}
            aria-invalid={Boolean(state.errors?.phone)}
            className={`${underlineInputClassName} ${invalidUnderlineFix}`}
          />
          <p className="text-on-surface-variant mt-1 text-[12px]">
            Only if you would rather we called you back.
          </p>
          <FieldError>{state.errors?.phone}</FieldError>
        </Field>

        <Field data-invalid={Boolean(state.errors?.message)}>
          <FieldLabel htmlFor="message" className={fieldLabelClassName}>
            Message
          </FieldLabel>
          <Textarea
            id="message"
            name="message"
            rows={4}
            defaultValue={state.values?.message}
            aria-invalid={Boolean(state.errors?.message)}
            className={underlineTextareaClassName}
          />
          <FieldError>{state.errors?.message}</FieldError>
        </Field>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="bg-foreground text-background hover:bg-secondary focus-visible:outline-foreground mt-10 inline-flex items-center justify-center gap-2 px-10 py-3.5 text-[12px] font-semibold tracking-[0.1em] uppercase transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 disabled:pointer-events-none disabled:opacity-40"
      >
        {pending && (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        )}
        Send Message
      </button>

      {state.message && (
        <p
          role="alert"
          aria-live="polite"
          className="text-destructive mt-6 text-[14px]"
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
