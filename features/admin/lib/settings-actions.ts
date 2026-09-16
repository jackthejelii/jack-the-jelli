"use server";

import { revalidatePath, revalidateTag, updateTag } from "next/cache";

import { requireAdmin } from "@/lib/auth-guard";
import { connectDB } from "@/lib/db";
import { SETTINGS_TAG } from "@/lib/settings";
import { Settings, SETTINGS_DOC_ID } from "@/models";
import {
  CATALOGUE_TAG,
  FEATURED_PRODUCTS_TAG,
} from "@/features/products/lib/constants";
import {
  collectValues,
  toFieldErrors,
  type AdminFormState,
} from "@/features/admin/lib/form-state";
import {
  AVAILABILITY_FIELDS,
  availabilitySettingsSchema,
  DELIVERY_FIELDS,
  deliverySettingsSchema,
  OPERATIONS_FIELDS,
  operationsSettingsSchema,
  STORE_FIELDS,
  storeSettingsSchema,
} from "@/features/admin/lib/settings-schema";

/**
 * The four settings writes.
 *
 * Each is its own action because each tab is its own `<form>`: a submit
 * carries only the fields the operator was actually looking at, so saving the
 * delivery tab can never overwrite the store tab with blanks.
 */

/**
 * Write the fields a tab submitted, leaving every other field alone.
 *
 * `undefined` is the interesting case. A cleared optional input parses to
 * `undefined`, which must `$unset` the stored field rather than `$set` it —
 * Mongoose drops `undefined` from an update object entirely, so a `$set`
 * would silently leave the old value in place and the operator would watch
 * their deletion fail to take. Unsetting hands the field back to
 * `DEFAULT_SETTINGS`, which is what "cleared" should mean for a value that
 * has a shipped default.
 */
async function saveSettings(patch: Record<string, unknown>): Promise<void> {
  const set: Record<string, unknown> = {};
  const unset: Record<string, ""> = {};

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) unset[key] = "";
    else set[key] = value;
  }

  await connectDB();
  await Settings.findByIdAndUpdate(
    SETTINGS_DOC_ID,
    {
      ...(Object.keys(set).length > 0 ? { $set: set } : {}),
      ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
    },
    {
      upsert: true,
      // The schema's own min/max are a second line of defence behind Zod, but
      // only if the update path is told to run them — Mongoose skips
      // validators on findOneAndUpdate by default.
      runValidators: true,
      new: true,
    },
  );
}

/**
 * Make a settings change visible everywhere at once.
 *
 * `updateTag` is the primary mechanism: every read goes through `getSettings`,
 * which tags its cache entry, and `updateTag` expires that entry immediately
 * rather than serving one more stale response — the operator needs to see the
 * new fee on the checkout page they are about to go and check.
 *
 * The `revalidatePath` calls are not redundant with it. A page that is itself
 * `"use cache"` has already *baked* the old figure into its rendered output,
 * and that output is a separate cache entry from the settings lookup that fed
 * it. Rather than depend on tags propagating outward through nested cache
 * scopes, the pages that quote a setting are named explicitly.
 */
function revalidateSettingsConsumers() {
  updateTag(SETTINGS_TAG);

  // Delivery charge and the courier window are quoted on all of these.
  revalidatePath("/checkout");
  revalidatePath("/shipping");
  revalidatePath("/returns");
  revalidatePath("/collection");
  revalidatePath("/collection/[slug]", "page");

  // Contact details reach the legal pages, the footer and the Organization
  // JSON-LD, which is emitted from the root layout.
  revalidatePath("/privacy");
  revalidatePath("/terms");
  revalidatePath("/contact");
  revalidatePath("/", "layout");

  // Product copy quotes the delivery charge, and the low-stock threshold
  // decides whether a variant reads as "only a few left".
  revalidateTag(CATALOGUE_TAG, "max");
  revalidateTag(FEATURED_PRODUCTS_TAG, "max");

  // Rows per page and the stale-draft window are read by the admin tables.
  revalidatePath("/admin/orders");
  revalidatePath("/admin/products");
  revalidatePath("/admin/settings");
}

/** Shared failure copy — the operator gets the same sentence whichever tab. */
function failed(values: Record<string, string>): AdminFormState {
  return {
    ok: false,
    values,
    message: "Something went wrong while saving these settings.",
  };
}

export async function updateDeliverySettings(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();

  const values = collectValues(formData, DELIVERY_FIELDS);
  const parsed = deliverySettingsSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, errors: toFieldErrors(parsed.error), values };
  }

  try {
    await saveSettings(parsed.data);
  } catch (error) {
    console.error("updateDeliverySettings failed", error);
    return failed(values);
  }

  revalidateSettingsConsumers();
  return { ok: true, message: "Delivery settings saved." };
}

export async function updateStoreSettings(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();

  const values = collectValues(formData, STORE_FIELDS);
  const parsed = storeSettingsSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, errors: toFieldErrors(parsed.error), values };
  }

  try {
    await saveSettings(parsed.data);
  } catch (error) {
    console.error("updateStoreSettings failed", error);
    return failed(values);
  }

  revalidateSettingsConsumers();
  return { ok: true, message: "Store details saved." };
}

export async function updateOperationsSettings(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();

  const values = collectValues(formData, OPERATIONS_FIELDS);
  const parsed = operationsSettingsSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, errors: toFieldErrors(parsed.error), values };
  }

  try {
    await saveSettings(parsed.data);
  } catch (error) {
    console.error("updateOperationsSettings failed", error);
    return failed(values);
  }

  revalidateSettingsConsumers();
  return { ok: true, message: "Operations settings saved." };
}

export async function updateAvailabilitySettings(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();

  const values = collectValues(formData, AVAILABILITY_FIELDS);
  // An unchecked Switch submits nothing at all, so the raw FormData is read
  // here rather than the `values` echo — `collectValues` only carries keys
  // that were present, and the schema needs to see the absence to turn it
  // into `false`.
  const parsed = availabilitySettingsSchema.safeParse({
    ordersPaused: formData.get("ordersPaused"),
    ordersPausedMessage: formData.get("ordersPausedMessage") ?? undefined,
    maintenanceMode: formData.get("maintenanceMode"),
    maintenanceMessage: formData.get("maintenanceMessage") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, errors: toFieldErrors(parsed.error), values };
  }

  try {
    await saveSettings(parsed.data);
  } catch (error) {
    console.error("updateAvailabilitySettings failed", error);
    return failed(values);
  }

  revalidateSettingsConsumers();

  const { ordersPaused, maintenanceMode } = parsed.data;
  return {
    ok: true,
    message: maintenanceMode
      ? "Maintenance mode is ON — the storefront is closed to customers."
      : ordersPaused
        ? "Orders are paused — the catalogue is still browsable."
        : "The shop is open.",
  };
}
