import { z } from "zod";

import { normalizeBdPhone } from "@/features/orders/lib/phone";

/**
 * Validation for the four settings forms.
 *
 * Client-safe on purpose — the form components import the field-name lists
 * from here so `collectValues` echoes back exactly the inputs that exist, and
 * a renamed field can't silently stop being refilled after a failed submit.
 *
 * One schema per tab rather than one schema for everything: each tab is its
 * own `<form>`, so a submit only ever carries its own fields, and validating
 * the whole document against a partial FormData would fail on every field the
 * user wasn't looking at.
 */

/**
 * A number typed into a text input.
 *
 * Digits are matched before anything is converted, rather than leaning on
 * `z.coerce.number()`. Coercion is too permissive in both directions here: it
 * turns `""` into `0`, which would silently set a delivery fee to zero when
 * someone cleared the box meaning to retype it, and it accepts `"70.5"` and
 * `"-70"` into fields that are whole non-negative taka by definition. A digits
 * pattern rules all three out at once and says so in one message.
 */
function wholeNumber(label: string, min: number, max: number) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((value) => /^\d+$/.test(value), `${label} must be a whole number`)
    .transform(Number)
    .pipe(
      z
        .number()
        .min(min, `${label} cannot be below ${min}`)
        .max(max, `${label} cannot be above ${max}`),
    );
}

/**
 * A Radix Switch submits `"on"` when checked and omits the key entirely when
 * not, the same as a native checkbox — so "absent" is the falsy case and must
 * be accepted rather than rejected as missing.
 */
const switchBoolean = z
  .union([z.literal("on"), z.literal(""), z.undefined(), z.null()])
  .transform((value) => value === "on");

/** Optional free text that falls back to the shipped default when cleared. */
function optionalMessage(label: string) {
  return z
    .string()
    .trim()
    .max(500, `${label} cannot exceed 500 characters`)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));
}

// ── Delivery ────────────────────────────────────────────────────────────

export const DELIVERY_FIELDS = [
  "feeInsideDhaka",
  "feeOutsideDhaka",
  "freeDeliveryThreshold",
  "deliveryDaysMin",
  "deliveryDaysMax",
] as const;

export const deliverySettingsSchema = z
  .object({
    feeInsideDhaka: wholeNumber("Inside Dhaka fee", 0, 10_000),
    feeOutsideDhaka: wholeNumber("Outside Dhaka fee", 0, 10_000),
    freeDeliveryThreshold: wholeNumber("Free delivery threshold", 0, 1_000_000),
    deliveryDaysMin: wholeNumber("Fastest delivery day", 1, 60),
    deliveryDaysMax: wholeNumber("Slowest delivery day", 1, 60),
  })
  // Reported against the field the operator should change, not the form, so
  // the message lands under an input instead of floating above the whole tab.
  .refine((value) => value.deliveryDaysMin <= value.deliveryDaysMax, {
    path: ["deliveryDaysMax"],
    message: "The slowest day cannot be earlier than the fastest",
  });

// ── Store ───────────────────────────────────────────────────────────────

export const STORE_FIELDS = [
  "contactEmail",
  "contactPhone",
  "instagram",
  "address",
] as const;

export const storeSettingsSchema = z.object({
  contactEmail: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "A contact address is required")
    .max(200, "Address cannot exceed 200 characters")
    .pipe(z.email("That doesn't look like an email address")),

  // Stored in the canonical 01XXXXXXXXX form, the same as every phone number
  // in this app, so the one on the legal pages and the one on an order can be
  // compared without re-normalising either.
  contactPhone: z
    .string()
    .trim()
    .min(1, "A contact number is required")
    .transform((value) => normalizeBdPhone(value))
    .refine((value): value is string => value !== null, {
      message: "Enter a Bangladeshi mobile number, e.g. 01712345678",
    }),

  // The UI adds the `@`, so it is stripped here rather than stored twice over.
  instagram: z
    .string()
    .trim()
    .max(100, "Handle cannot exceed 100 characters")
    .transform((value) => value.replace(/^@+/, ""))
    .refine((value) => value === "" || /^[A-Za-z0-9._]+$/.test(value), {
      message:
        "A handle can only contain letters, numbers, dots and underscores",
    })
    .transform((value) => (value.length > 0 ? value : undefined)),

  address: z
    .string()
    .trim()
    .min(5, "An address is required")
    .max(300, "Address cannot exceed 300 characters"),
});

// ── Operations ──────────────────────────────────────────────────────────

export const OPERATIONS_FIELDS = [
  "lowStockThreshold",
  "staleDraftMinutes",
  "ordersPerPage",
] as const;

export const operationsSettingsSchema = z.object({
  lowStockThreshold: wholeNumber("Low stock threshold", 0, 1_000),
  // Below a minute the sweep starts cancelling drafts belonging to orders that
  // are still being placed; a day is far longer than any checkout takes.
  staleDraftMinutes: wholeNumber("Stale draft window", 1, 1_440),
  ordersPerPage: wholeNumber("Rows per page", 1, 100),
});

// ── Availability ────────────────────────────────────────────────────────

export const AVAILABILITY_FIELDS = [
  "ordersPaused",
  "ordersPausedMessage",
  "maintenanceMode",
  "maintenanceMessage",
] as const;

export const availabilitySettingsSchema = z.object({
  ordersPaused: switchBoolean,
  ordersPausedMessage: optionalMessage("Paused message"),
  maintenanceMode: switchBoolean,
  maintenanceMessage: optionalMessage("Maintenance message"),
});

export type DeliverySettingsInput = z.infer<typeof deliverySettingsSchema>;
export type StoreSettingsInput = z.infer<typeof storeSettingsSchema>;
export type OperationsSettingsInput = z.infer<typeof operationsSettingsSchema>;
export type AvailabilitySettingsInput = z.infer<
  typeof availabilitySettingsSchema
>;

/** Every field name the settings page submits, for the `values` echo. */
export const SETTINGS_VALUE_FIELDS = [
  ...DELIVERY_FIELDS,
  ...STORE_FIELDS,
  ...OPERATIONS_FIELDS,
  ...AVAILABILITY_FIELDS,
] as const;
