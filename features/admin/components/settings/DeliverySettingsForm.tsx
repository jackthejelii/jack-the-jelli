"use client";

import { useState } from "react";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useSettingsForm } from "@/features/admin/hooks/useSettingsForm";
import { updateDeliverySettings } from "@/features/admin/lib/settings-actions";
import {
  boxedInputClassName,
  fieldLabelClassName,
} from "@/features/admin/lib/product-form";
import {
  SettingsCard,
  SettingsSaveBar,
} from "@/features/admin/components/settings/SettingsCard";
import type { SiteSettings } from "@/lib/settings";

/**
 * The only tab on this page whose fields become money.
 *
 * Everything here is quoted to the customer before they order and recomputed
 * by `placeOrder` when they do, so a typo is not a cosmetic problem — it is
 * the shop undercharging for every delivery until someone notices. That is
 * what the preview underneath the fields is for: it restates the numbers as
 * the sentence a shopper would actually read, which is how a missing zero
 * gets caught before Save rather than after.
 */
export default function DeliverySettingsForm({
  settings,
}: {
  settings: SiteSettings;
}) {
  const { state, formAction, pending, isDirty, markDirty } = useSettingsForm(
    updateDeliverySettings,
  );

  // Local copies purely so the preview can follow what is being typed. The
  // submitted values are still whatever is in the inputs — these never become
  // the source of truth for the save, only for the sentence below.
  const [inside, setInside] = useState(
    state.values?.feeInsideDhaka ?? String(settings.feeInsideDhaka),
  );
  const [outside, setOutside] = useState(
    state.values?.feeOutsideDhaka ?? String(settings.feeOutsideDhaka),
  );
  const [threshold, setThreshold] = useState(
    state.values?.freeDeliveryThreshold ??
      String(settings.freeDeliveryThreshold),
  );

  const num = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  };

  const insideFee = num(inside);
  const outsideFee = num(outside);
  const freeAt = num(threshold);

  return (
    <form
      action={formAction}
      onChange={markDirty}
      // The browser's own validation bubbles would fire before the action
      // runs and pre-empt the field messages Zod produces, which are the ones
      // written for this shop.
      noValidate
    >
      <SettingsCard
        title="Delivery"
        description="What a customer is charged to have an order delivered, and how long they are told it will take. Quoted at checkout, on every product page and in the shipping policy."
        footer={<SettingsSaveBar pending={pending} isDirty={isDirty} />}
      >
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <Field
            data-invalid={Boolean(state.errors?.feeInsideDhaka) || undefined}
          >
            <FieldLabel
              htmlFor="feeInsideDhaka"
              className={fieldLabelClassName}
            >
              Inside Dhaka (৳)
            </FieldLabel>
            <Input
              id="feeInsideDhaka"
              name="feeInsideDhaka"
              inputMode="numeric"
              value={inside}
              onChange={(event) => setInside(event.target.value)}
              aria-invalid={Boolean(state.errors?.feeInsideDhaka)}
              className={boxedInputClassName}
            />
            <FieldError>{state.errors?.feeInsideDhaka}</FieldError>
          </Field>

          <Field
            data-invalid={Boolean(state.errors?.feeOutsideDhaka) || undefined}
          >
            <FieldLabel
              htmlFor="feeOutsideDhaka"
              className={fieldLabelClassName}
            >
              Anywhere else (৳)
            </FieldLabel>
            <Input
              id="feeOutsideDhaka"
              name="feeOutsideDhaka"
              inputMode="numeric"
              value={outside}
              onChange={(event) => setOutside(event.target.value)}
              aria-invalid={Boolean(state.errors?.feeOutsideDhaka)}
              className={boxedInputClassName}
            />
            <FieldError>{state.errors?.feeOutsideDhaka}</FieldError>
          </Field>
        </div>

        <Field
          data-invalid={
            Boolean(state.errors?.freeDeliveryThreshold) || undefined
          }
        >
          <FieldLabel
            htmlFor="freeDeliveryThreshold"
            className={fieldLabelClassName}
          >
            Free delivery from (৳)
          </FieldLabel>
          <Input
            id="freeDeliveryThreshold"
            name="freeDeliveryThreshold"
            inputMode="numeric"
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
            aria-invalid={Boolean(state.errors?.freeDeliveryThreshold)}
            className={boxedInputClassName}
          />
          <FieldError>{state.errors?.freeDeliveryThreshold}</FieldError>
        </Field>

        {/* The whole reason this tab is worth building. */}
        <div className="border-border bg-muted/40 border border-dashed px-5 py-4">
          <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            What a customer will see
          </p>
          {insideFee === null || outsideFee === null || freeAt === null ? (
            <p className="text-muted-foreground mt-2 text-sm">
              Fill in all three figures to preview.
            </p>
          ) : (
            <ul className="text-foreground mt-2 flex flex-col gap-1 text-sm">
              <li>
                A ৳{Math.max(0, freeAt - 100).toLocaleString()} order to Dhaka
                pays <strong>৳{insideFee.toLocaleString()}</strong> delivery.
              </li>
              <li>
                The same order to Chattogram pays{" "}
                <strong>৳{outsideFee.toLocaleString()}</strong>.
              </li>
              <li>
                Anything from <strong>৳{freeAt.toLocaleString()}</strong> up
                ships free, wherever it goes.
              </li>
            </ul>
          )}
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <Field
            data-invalid={Boolean(state.errors?.deliveryDaysMin) || undefined}
          >
            <FieldLabel
              htmlFor="deliveryDaysMin"
              className={fieldLabelClassName}
            >
              Fastest (days)
            </FieldLabel>
            <Input
              id="deliveryDaysMin"
              name="deliveryDaysMin"
              inputMode="numeric"
              defaultValue={
                state.values?.deliveryDaysMin ??
                String(settings.deliveryDaysMin)
              }
              aria-invalid={Boolean(state.errors?.deliveryDaysMin)}
              className={boxedInputClassName}
            />
            <FieldError>{state.errors?.deliveryDaysMin}</FieldError>
          </Field>

          <Field
            data-invalid={Boolean(state.errors?.deliveryDaysMax) || undefined}
          >
            <FieldLabel
              htmlFor="deliveryDaysMax"
              className={fieldLabelClassName}
            >
              Slowest (days)
            </FieldLabel>
            <Input
              id="deliveryDaysMax"
              name="deliveryDaysMax"
              inputMode="numeric"
              defaultValue={
                state.values?.deliveryDaysMax ??
                String(settings.deliveryDaysMax)
              }
              aria-invalid={Boolean(state.errors?.deliveryDaysMax)}
              className={boxedInputClassName}
            />
            <FieldError>{state.errors?.deliveryDaysMax}</FieldError>
          </Field>
        </div>
      </SettingsCard>
    </form>
  );
}
