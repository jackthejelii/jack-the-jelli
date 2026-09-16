import { AlertTriangle } from "lucide-react";

import { getSettings } from "@/lib/settings";
import SettingsView from "@/features/admin/components/settings/SettingsView";

/**
 * The shop's own settings.
 *
 * A thin route entrypoint, like every other page under `app/`: it reads the
 * settings and hands them to the view. The four forms and their actions live
 * in `features/admin`.
 *
 * No `connection()` here, unlike `/admin/orders/[id]`. That page needs it
 * because it reads the database uncached and would otherwise be prerendered
 * against a clock; this one reads `getSettings()`, which is a `"use cache"`
 * function and therefore prerenderable on purpose. The role gate in
 * `app/admin/layout.tsx` is what makes the page private, and it already sits
 * behind its own Suspense boundary.
 */
export default async function AdminSettingsPage() {
  const settings = await getSettings();

  const closed = settings.maintenanceMode || settings.ordersPaused;

  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="font-heading text-3xl tracking-widest">Settings</h1>
      </header>

      {/* A shop left closed by accident is the failure this page can most
          plausibly cause, and the switch that did it lives four tabs deep. So
          the state is restated at the top of the page, where it cannot be
          missed, whichever tab is open. */}
      {closed && (
        <div
          role="status"
          className="border-destructive/40 bg-destructive/10 text-destructive flex items-start gap-3 border px-5 py-4"
        >
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <div className="text-sm">
            <p className="font-semibold tracking-widest uppercase">
              {settings.maintenanceMode
                ? "The storefront is closed"
                : "Orders are paused"}
            </p>
            <p className="mt-1">
              {settings.maintenanceMode
                ? "Customers see a maintenance notice instead of the shop. You see the real site because you are signed in as an admin."
                : "The catalogue is browsable, but checkout is closed and any order submitted is refused."}{" "}
              Turn this off under <strong>Availability</strong>.
            </p>
          </div>
        </div>
      )}

      <SettingsView settings={settings} />
    </div>
  );
}
