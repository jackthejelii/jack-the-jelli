"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AvailabilitySettingsForm from "@/features/admin/components/settings/AvailabilitySettingsForm";
import DeliverySettingsForm from "@/features/admin/components/settings/DeliverySettingsForm";
import OperationsSettingsForm from "@/features/admin/components/settings/OperationsSettingsForm";
import StoreSettingsForm from "@/features/admin/components/settings/StoreSettingsForm";
import type { SiteSettings } from "@/lib/settings";

/**
 * Four tabs, four separate `<form>`s, four separate actions.
 *
 * That separation is the point rather than an accident of layout: a submit
 * carries only the fields on the tab it came from, so saving a delivery fee
 * cannot overwrite the store's phone number with a blank just because that
 * input was mounted somewhere off screen. One form spanning all four tabs
 * would have made every save a full-document write.
 *
 * Tab state is local and unsynced to the URL. It is a back-office preference
 * for the next thirty seconds, not something worth a history entry — and
 * putting it in the URL would mean a Server Action's revalidation could land
 * the operator back on a tab they had left.
 */
export default function SettingsView({ settings }: { settings: SiteSettings }) {
  return (
    <Tabs defaultValue="delivery" className="gap-8">
      <TabsList className="h-auto flex-wrap justify-start rounded-none">
        <TabsTrigger value="delivery" className="rounded-none">
          Delivery
        </TabsTrigger>
        <TabsTrigger value="store" className="rounded-none">
          Store
        </TabsTrigger>
        <TabsTrigger value="operations" className="rounded-none">
          Operations
        </TabsTrigger>
        <TabsTrigger value="availability" className="rounded-none">
          Availability
        </TabsTrigger>
      </TabsList>

      <TabsContent value="delivery">
        <DeliverySettingsForm settings={settings} />
      </TabsContent>
      <TabsContent value="store">
        <StoreSettingsForm settings={settings} />
      </TabsContent>
      <TabsContent value="operations">
        <OperationsSettingsForm settings={settings} />
      </TabsContent>
      <TabsContent value="availability">
        <AvailabilitySettingsForm settings={settings} />
      </TabsContent>
    </Tabs>
  );
}
