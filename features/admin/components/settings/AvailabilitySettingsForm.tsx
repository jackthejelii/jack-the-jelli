"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useSettingsForm } from "@/features/admin/hooks/useSettingsForm";
import { updateAvailabilitySettings } from "@/features/admin/lib/settings-actions";
import { fieldLabelClassName } from "@/features/admin/lib/product-form";
import {
  SettingsCard,
  SettingsSaveBar,
} from "@/features/admin/components/settings/SettingsCard";
import type { SiteSettings } from "@/lib/settings";

/**
 * The two switches that close the shop.
 *
 * They are controlled rather than uncontrolled, for one reason: the warning
 * under each has to describe what is *about* to be true when Save is pressed,
 * not what was true when the page loaded. A switch that silently flips the
 * storefront off deserves to say so before it is saved, not after.
 *
 * Neither switch is a security control and neither pretends to be. Turning one
 * on stops `/checkout` rendering its form, but the refusal that actually stops
 * an order lives in `placeOrder` — a tab opened a minute earlier still holds a
 * live form, and a direct POST never saw this page at all.
 */
export default function AvailabilitySettingsForm({
  settings,
}: {
  settings: SiteSettings;
}) {
  const { state, formAction, pending, isDirty, markDirty } = useSettingsForm(
    updateAvailabilitySettings,
  );

  const [paused, setPaused] = useState(settings.ordersPaused);
  const [maintenance, setMaintenance] = useState(settings.maintenanceMode);

  return (
    <form action={formAction} onChange={markDirty} noValidate>
      <SettingsCard
        title="Availability"
        description="Close the shop to customers, either partly or completely. Both switches leave /admin reachable so you can turn them off again."
        footer={
          <SettingsSaveBar
            pending={pending}
            isDirty={isDirty}
            label="Save availability"
          />
        }
      >
        {/* ── Pause orders ─────────────────────────────────────────── */}
        <div className="border-border flex flex-col gap-4 border-b pb-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <FieldLabel
                htmlFor="ordersPaused"
                className={fieldLabelClassName}
              >
                Pause orders
              </FieldLabel>
              <p className="text-muted-foreground mt-1 text-sm">
                The catalogue stays open and browsable. Checkout closes, and any
                order submitted anyway is refused. Carts are left alone —
                pausing is temporary, and emptying someone&apos;s basket over it
                would cost the sale you are trying to defer.
              </p>
            </div>
            <Switch
              id="ordersPaused"
              name="ordersPaused"
              checked={paused}
              onCheckedChange={(next) => {
                setPaused(next);
                markDirty();
              }}
            />
          </div>

          <Field
            data-invalid={
              Boolean(state.errors?.ordersPausedMessage) || undefined
            }
          >
            <FieldLabel
              htmlFor="ordersPausedMessage"
              className={fieldLabelClassName}
            >
              What customers are told
            </FieldLabel>
            <Textarea
              id="ordersPausedMessage"
              name="ordersPausedMessage"
              rows={2}
              defaultValue={
                state.values?.ordersPausedMessage ??
                settings.ordersPausedMessage
              }
              aria-invalid={Boolean(state.errors?.ordersPausedMessage)}
              className="border-border bg-muted/50 focus-visible:bg-card focus-visible:border-foreground rounded-none border px-5 py-3 text-base transition-colors"
            />
            <FieldDescription>
              Shown on the checkout page. Clear the box to go back to the
              default wording.
            </FieldDescription>
            <FieldError>{state.errors?.ordersPausedMessage}</FieldError>
          </Field>
        </div>

        {/* ── Full maintenance ─────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-6">
            <div>
              <FieldLabel
                htmlFor="maintenanceMode"
                className={fieldLabelClassName}
              >
                Full maintenance
              </FieldLabel>
              <p className="text-muted-foreground mt-1 text-sm">
                The entire storefront is replaced by a notice and marked
                noindex. Order tracking closes too. You will still see the real
                site, because you are signed in as an admin — which is also the
                only way to check your work before reopening.
              </p>
            </div>
            <Switch
              id="maintenanceMode"
              name="maintenanceMode"
              checked={maintenance}
              onCheckedChange={(next) => {
                setMaintenance(next);
                markDirty();
              }}
            />
          </div>

          <Field
            data-invalid={
              Boolean(state.errors?.maintenanceMessage) || undefined
            }
          >
            <FieldLabel
              htmlFor="maintenanceMessage"
              className={fieldLabelClassName}
            >
              Notice shown to visitors
            </FieldLabel>
            <Textarea
              id="maintenanceMessage"
              name="maintenanceMessage"
              rows={2}
              defaultValue={
                state.values?.maintenanceMessage ?? settings.maintenanceMessage
              }
              aria-invalid={Boolean(state.errors?.maintenanceMessage)}
              className="border-border bg-muted/50 focus-visible:bg-card focus-visible:border-foreground rounded-none border px-5 py-3 text-base transition-colors"
            />
            <FieldDescription>
              Clear the box to go back to the default wording.
            </FieldDescription>
            <FieldError>{state.errors?.maintenanceMessage}</FieldError>
          </Field>

          {maintenance && (
            <p className="text-destructive flex items-start gap-2 text-sm">
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              <span>
                Saving this closes the storefront to every customer. Search
                engines are told not to index the notice, but the page still
                answers 200 rather than 503 — a layout cannot set a status code
                — so keep it short.
              </span>
            </p>
          )}
        </div>
      </SettingsCard>
    </form>
  );
}
