"use client";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useSettingsForm } from "@/features/admin/hooks/useSettingsForm";
import { updateOperationsSettings } from "@/features/admin/lib/settings-actions";
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
 * The back-office knobs. Only the first of the three reaches a customer.
 */
export default function OperationsSettingsForm({
  settings,
}: {
  settings: SiteSettings;
}) {
  const { state, formAction, pending, isDirty, markDirty } = useSettingsForm(
    updateOperationsSettings,
  );

  return (
    <form action={formAction} onChange={markDirty} noValidate>
      <SettingsCard
        title="Operations"
        description="How the back office behaves. The low-stock threshold is the only one of these a customer ever sees."
        footer={<SettingsSaveBar pending={pending} isDirty={isDirty} />}
      >
        <Field
          data-invalid={Boolean(state.errors?.lowStockThreshold) || undefined}
        >
          <FieldLabel
            htmlFor="lowStockThreshold"
            className={fieldLabelClassName}
          >
            Low stock at or below
          </FieldLabel>
          <Input
            id="lowStockThreshold"
            name="lowStockThreshold"
            inputMode="numeric"
            defaultValue={
              state.values?.lowStockThreshold ??
              String(settings.lowStockThreshold)
            }
            aria-invalid={Boolean(state.errors?.lowStockThreshold)}
            className={boxedInputClassName}
          />
          <FieldDescription>
            Drives the Low stock filter and badge on the product table, and the
            “Only {settings.lowStockThreshold} remaining” line a shopper sees on
            a product page.
          </FieldDescription>
          <FieldError>{state.errors?.lowStockThreshold}</FieldError>
        </Field>

        <Field
          data-invalid={Boolean(state.errors?.staleDraftMinutes) || undefined}
        >
          <FieldLabel
            htmlFor="staleDraftMinutes"
            className={fieldLabelClassName}
          >
            Release held stock after (minutes)
          </FieldLabel>
          <Input
            id="staleDraftMinutes"
            name="staleDraftMinutes"
            inputMode="numeric"
            defaultValue={
              state.values?.staleDraftMinutes ??
              String(settings.staleDraftMinutes)
            }
            aria-invalid={Boolean(state.errors?.staleDraftMinutes)}
            className={boxedInputClassName}
          />
          <FieldDescription>
            A checkout that starts but never finishes holds its stock as a
            Draft. This is how old a Draft must be before the Order Manager
            offers to release it. Shorter than a checkout actually takes and the
            sweep would cancel orders still being placed.
          </FieldDescription>
          <FieldError>{state.errors?.staleDraftMinutes}</FieldError>
        </Field>

        <Field data-invalid={Boolean(state.errors?.ordersPerPage) || undefined}>
          <FieldLabel htmlFor="ordersPerPage" className={fieldLabelClassName}>
            Rows per page
          </FieldLabel>
          <Input
            id="ordersPerPage"
            name="ordersPerPage"
            inputMode="numeric"
            defaultValue={
              state.values?.ordersPerPage ?? String(settings.ordersPerPage)
            }
            aria-invalid={Boolean(state.errors?.ordersPerPage)}
            className={boxedInputClassName}
          />
          <FieldDescription>
            Applies to the order and product tables in this dashboard. The
            storefront collection grid keeps its own page size, which is a
            three-column layout decision rather than this setting.
          </FieldDescription>
          <FieldError>{state.errors?.ordersPerPage}</FieldError>
        </Field>
      </SettingsCard>
    </form>
  );
}
