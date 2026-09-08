"use client";

import { useActionState, useState } from "react";
import AppLink from "@/components/layout/AppLink";
import { Truck } from "lucide-react";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCartRevalidation } from "@/features/cart/hooks/useCartRevalidation";
import { useCartHydrated, useCartStore } from "@/features/cart/lib/cartStore";
import { lineKey, type UnavailableLine } from "@/features/cart/lib/types";
import CheckoutSummary from "@/features/checkout/components/CheckoutSummary";
import DistrictFields from "@/features/checkout/components/DistrictFields";
import {
  fieldLabelClassName,
  sectionHeadingClassName,
  underlineInputClassName,
} from "@/features/checkout/lib/checkout-form";
import { emptyCheckoutState } from "@/features/checkout/lib/checkout-state";
import { placeOrder } from "@/features/checkout/lib/order-actions";

export interface CheckoutDefaults {
  fullName?: string;
  email?: string;
  phone?: string;
}

/**
 * The whole checkout screen: one <form> spanning both columns, so the
 * "Complete Order" button in the summary submits the fields on the left
 * without any `form=` plumbing.
 *
 * The cart is client-only, so it reaches the Server Action as a JSON hidden
 * input of `(productId, qty)` pairs — the same shape the images field uses in
 * the admin product form. Nothing else about the cart is sent, and nothing
 * sent about it is trusted.
 */
export default function CheckoutView({
  defaults,
}: {
  defaults: CheckoutDefaults;
}) {
  const [state, formAction, pending] = useActionState(
    placeOrder,
    emptyCheckoutState,
  );

  const hydrated = useCartHydrated();
  const items = useCartStore((state) => state.items);
  const withdrawn = useCartStore((state) => state.withdrawn);
  const idempotencyKey = useCartStore((state) => state.idempotencyKey);
  const [district, setDistrict] = useState(state.values?.district ?? "");

  // Re-price and re-check stock once the persisted cart is available, so a
  // week-old cart doesn't quote last month's numbers on the final screen.
  useCartRevalidation(hydrated);

  const lines = hydrated ? items : [];

  // A line revalidateCart clamped to zero is kept in the cart so it can be
  // shown as sold out, but it must never be submitted: the schema requires
  // qty >= 1, and a rejected `items` array has no field on screen to hang its
  // error on — the customer would get "correct the highlighted fields" with
  // nothing highlighted and no way forward.
  const sellable = lines.filter((line) => line.qty > 0);
  const soldOut: UnavailableLine[] = lines
    .filter((line) => line.qty <= 0)
    .map((line) => ({
      productId: line.productId,
      variantId: line.variantId,
      name: line.name,
      color: line.color,
      available: 0,
      requested: 1,
      reason: "sold-out" as const,
    }));

  // The server's verdict from the last attempt, minus any line the customer has
  // since put right — removed outright, or reduced to within what was actually
  // left. Quantity and not just membership, or the alert keeps offering
  // "Reduce to 2" for a line already sitting at 2, and keeps saying "you asked
  // for 5" after they've complied. A line no longer in the cart has no quantity
  // to compare, which is what drops it.
  // Keyed by the (product, colour) pair: matching on the product alone would
  // let a corrected black wallet clear the alert still owed for the tan one.
  const currentQty = new Map(lines.map((line) => [lineKey(line), line.qty]));
  const reported = (state.unavailable ?? []).filter((line) => {
    const qty = currentQty.get(lineKey(line));
    return qty !== undefined && qty > line.available;
  });

  const blockers = soldOut.length > 0 ? soldOut : reported;

  if (hydrated && lines.length === 0) {
    return (
      <div className="mx-auto flex max-w-360 flex-col items-center px-5 pt-40 pb-40 text-center md:px-16">
        <h1 className="text-foreground font-serif text-[40px] leading-tight tracking-tight">
          Nothing to check out
        </h1>
        <p className="text-on-surface-variant mt-4 max-w-md text-[16px] leading-relaxed">
          {withdrawn.length > 0
            ? "The last of your pieces sold out or was withdrawn before you could order it. Nothing was placed."
            : "Your cart is empty. Every piece is made in small numbers, and the collection is worth a look."}
        </p>
        <AppLink
          href="/collection"
          className="border-foreground text-foreground hover:bg-foreground hover:text-background mt-10 inline-flex items-center justify-center border px-10 py-4 text-[12px] font-semibold tracking-[0.1em] uppercase transition-colors duration-300"
        >
          Browse the collection
        </AppLink>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="mx-auto max-w-360 px-5 pt-32 pb-32 md:px-16 md:pt-40"
    >
      {/* The cart, reduced to the only three things the server reads. */}
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(
          sellable.map((line) => ({
            productId: line.productId,
            variantId: line.variantId,
            qty: line.qty,
          })),
        )}
      />
      {/* Rotated by the store on every cart mutation, held steady across
          network retries — this is what makes a double-click one order. */}
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <h1 className="text-foreground font-serif text-[40px] leading-[1.1] tracking-tight md:text-[48px]">
            Secure Checkout
          </h1>
          <p className="text-on-surface-variant mt-3 text-[16px] leading-relaxed">
            Please provide your details below to complete your order.
          </p>

          {withdrawn.length > 0 && (
            <p
              role="status"
              className="border-outline-variant/40 bg-surface-container-low text-on-surface-variant mt-8 border px-4 py-3 text-[14px]"
            >
              {withdrawn.length === 1
                ? `${withdrawn[0]} is no longer available and has been removed from your order.`
                : `${withdrawn.length} pieces are no longer available and have been removed from your order.`}
            </p>
          )}

          {state.message && !state.unavailable && (
            <p
              role="alert"
              aria-live="polite"
              className="border-destructive/40 bg-destructive/5 text-destructive mt-8 border px-4 py-3 text-[14px]"
            >
              {/* `items` and `idempotencyKey` are hidden inputs, so their zod
                  errors have no field on screen to render under. Promoting
                  them here stops "correct the highlighted fields" from
                  pointing at nothing highlighted. */}
              {state.errors?.items ??
                state.errors?.idempotencyKey ??
                state.message}
            </p>
          )}

          <section className="mt-12">
            <h2 className={sectionHeadingClassName}>Contact Information</h2>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Field
                data-invalid={Boolean(state.errors?.fullName) || undefined}
              >
                <FieldLabel htmlFor="fullName" className={fieldLabelClassName}>
                  Full Name
                </FieldLabel>
                <Input
                  id="fullName"
                  name="fullName"
                  autoComplete="name"
                  defaultValue={state.values?.fullName ?? defaults.fullName}
                  aria-invalid={Boolean(state.errors?.fullName)}
                  placeholder="e.g. Rafiq Ahmed"
                  className={underlineInputClassName}
                />
                <FieldError>{state.errors?.fullName}</FieldError>
              </Field>

              <Field data-invalid={Boolean(state.errors?.phone) || undefined}>
                <FieldLabel htmlFor="phone" className={fieldLabelClassName}>
                  Phone Number
                </FieldLabel>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  defaultValue={state.values?.phone ?? defaults.phone}
                  aria-invalid={Boolean(state.errors?.phone)}
                  placeholder="01XXXXXXXXX"
                  className={underlineInputClassName}
                />
                <FieldError>{state.errors?.phone}</FieldError>
                <p className="text-on-surface-variant mt-1 text-[12px]">
                  We call this number to confirm every order before it ships.
                </p>
              </Field>

              <Field
                className="sm:col-span-2"
                data-invalid={Boolean(state.errors?.email) || undefined}
              >
                <FieldLabel htmlFor="email" className={fieldLabelClassName}>
                  Email <span className="normal-case">(optional)</span>
                </FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  defaultValue={state.values?.email ?? defaults.email}
                  aria-invalid={Boolean(state.errors?.email)}
                  placeholder="you@example.com"
                  className={underlineInputClassName}
                />
                <FieldError>{state.errors?.email}</FieldError>
                <p className="text-on-surface-variant mt-1 text-[12px]">
                  For a written receipt. Leave it blank if you&apos;d rather
                  not.
                </p>
              </Field>
            </div>
          </section>

          <section className="mt-12">
            <h2 className={sectionHeadingClassName}>Shipping Destination</h2>
            <div className="mt-6 flex flex-col gap-6">
              <Field data-invalid={Boolean(state.errors?.street) || undefined}>
                <FieldLabel htmlFor="street" className={fieldLabelClassName}>
                  Street Address / Apartment
                </FieldLabel>
                <Input
                  id="street"
                  name="street"
                  autoComplete="street-address"
                  defaultValue={state.values?.street}
                  aria-invalid={Boolean(state.errors?.street)}
                  placeholder="House / Flat No., Road Name, Area"
                  className={underlineInputClassName}
                />
                <FieldError>{state.errors?.street}</FieldError>
              </Field>

              <DistrictFields
                errors={state.errors}
                values={state.values}
                district={district}
                onDistrictChange={setDistrict}
              />

              <Field data-invalid={Boolean(state.errors?.notes) || undefined}>
                <FieldLabel htmlFor="notes" className={fieldLabelClassName}>
                  Delivery Notes <span className="normal-case">(optional)</span>
                </FieldLabel>
                <Textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  defaultValue={state.values?.notes}
                  aria-invalid={Boolean(state.errors?.notes)}
                  placeholder="Landmark, preferred delivery time, anything else the courier should know."
                  className="border-outline-variant/50 focus-visible:border-foreground rounded-none border-0 border-b bg-transparent px-0 text-[16px] shadow-none transition-colors focus-visible:ring-0"
                />
                <FieldError>{state.errors?.notes}</FieldError>
              </Field>
            </div>
          </section>

          <section className="mt-12">
            <h2 className={sectionHeadingClassName}>Payment Method</h2>
            {/* One method, so this is a statement rather than a choice. An
                online-payment tile would be a promise the storefront can't
                keep — there is no gateway. */}
            <div className="border-outline-variant/40 bg-surface-container-low mt-6 flex items-center gap-4 border p-5">
              <Truck
                className="text-on-surface-variant size-5 shrink-0"
                aria-hidden="true"
              />
              <div>
                <p className="text-foreground text-[16px]">
                  Cash on Delivery (COD)
                </p>
                <p className="text-on-surface-variant mt-0.5 text-[13px]">
                  Pay the courier in cash when your piece arrives.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-5">
          <CheckoutSummary
            items={lines}
            district={district}
            pending={pending}
            unavailable={blockers}
            blocked={soldOut.length > 0}
            notice={state.unavailable ? state.message : undefined}
          />
        </div>
      </div>
    </form>
  );
}
