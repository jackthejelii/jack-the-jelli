"use client";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useSettingsForm } from "@/features/admin/hooks/useSettingsForm";
import { updateStoreSettings } from "@/features/admin/lib/settings-actions";
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
 * Who customers are told they are dealing with.
 *
 * Each field says where it surfaces, because none of these is only a label —
 * the address and phone are what a customer chasing an order will use, and
 * the email is published on the legal pages a payment processor or a Search
 * Console reviewer reads.
 *
 * NOTE: these values are stored and validated, but most of the pages that
 * quote contact details still read them from `features/legal/lib/legal-info.ts`.
 * Wiring those over is its own pass; until it lands, editing here changes the
 * stored setting and not yet every page that prints it.
 */
export default function StoreSettingsForm({
  settings,
}: {
  settings: SiteSettings;
}) {
  const { state, formAction, pending, isDirty, markDirty } =
    useSettingsForm(updateStoreSettings);

  return (
    <form action={formAction} onChange={markDirty} noValidate>
      <SettingsCard
        title="Store details"
        description="How customers reach the shop. Published on the legal pages, quoted in the contact FAQ, and used as the reply address on transactional email."
        footer={<SettingsSaveBar pending={pending} isDirty={isDirty} />}
      >
        <Field data-invalid={Boolean(state.errors?.contactEmail) || undefined}>
          <FieldLabel htmlFor="contactEmail" className={fieldLabelClassName}>
            Contact email
          </FieldLabel>
          <Input
            id="contactEmail"
            name="contactEmail"
            type="email"
            defaultValue={state.values?.contactEmail ?? settings.contactEmail}
            aria-invalid={Boolean(state.errors?.contactEmail)}
            className={boxedInputClassName}
          />
          <FieldDescription>
            Shown on /privacy, /terms, /returns and /shipping, and used as
            Reply-To.
          </FieldDescription>
          <FieldError>{state.errors?.contactEmail}</FieldError>
        </Field>

        <Field data-invalid={Boolean(state.errors?.contactPhone) || undefined}>
          <FieldLabel htmlFor="contactPhone" className={fieldLabelClassName}>
            Contact phone
          </FieldLabel>
          <Input
            id="contactPhone"
            name="contactPhone"
            inputMode="tel"
            defaultValue={state.values?.contactPhone ?? settings.contactPhone}
            aria-invalid={Boolean(state.errors?.contactPhone)}
            className={boxedInputClassName}
          />
          <FieldDescription>
            Any format is accepted — it is stored as 01XXXXXXXXX, the same form
            every order carries, so a number can be matched to an order later.
          </FieldDescription>
          <FieldError>{state.errors?.contactPhone}</FieldError>
        </Field>

        <Field data-invalid={Boolean(state.errors?.instagram) || undefined}>
          <FieldLabel htmlFor="instagram" className={fieldLabelClassName}>
            Instagram handle
          </FieldLabel>
          <Input
            id="instagram"
            name="instagram"
            defaultValue={state.values?.instagram ?? settings.instagram}
            aria-invalid={Boolean(state.errors?.instagram)}
            className={boxedInputClassName}
          />
          <FieldDescription>
            Without the @ — it is added wherever the handle is displayed. Leave
            empty to fall back to the shipped handle.
          </FieldDescription>
          <FieldError>{state.errors?.instagram}</FieldError>
        </Field>

        <Field data-invalid={Boolean(state.errors?.address) || undefined}>
          <FieldLabel htmlFor="address" className={fieldLabelClassName}>
            Business address
          </FieldLabel>
          <Input
            id="address"
            name="address"
            defaultValue={state.values?.address ?? settings.address}
            aria-invalid={Boolean(state.errors?.address)}
            className={boxedInputClassName}
          />
          <FieldDescription>
            The address customers can write to. Appears on the legal pages and
            in the footer of transactional email.
          </FieldDescription>
          <FieldError>{state.errors?.address}</FieldError>
        </Field>
      </SettingsCard>
    </form>
  );
}
