import { z } from "zod";
import { MAX_CART_LINES, MAX_LINE_QTY } from "@/features/cart/lib/limits";
import { lineKey } from "@/features/cart/lib/types";
import { isKnownDistrict } from "@/features/checkout/lib/delivery";
import { normalizeBdPhone } from "@/features/orders/lib/phone";

// One schema, imported by both the Server Action (authoritative) and the
// client (instant feedback), mirroring features/admin/lib/product-schema.ts so
// the rules can't drift.
//
// A Server Action is a public HTTP endpoint, so even though there is no
// requireAdmin() on checkout, every field here is treated as hostile.

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

/** Text fields echoed back into the form after a failed submit. */
export const CHECKOUT_VALUE_FIELDS = [
  "fullName",
  "phone",
  "email",
  "division",
  "district",
  "thana",
  "street",
  "notes",
] as const;

/**
 * The cart as far as the server is concerned: ids and quantities, nothing
 * else. Names, prices and the delivery fee are never read from the client —
 * they're recomputed from the database in placeOrder.
 *
 * `variantId` is as required as `productId`: stock and SKU live on the
 * colourway, so a line without one names nothing the warehouse could pick.
 */
export const orderLineSchema = z.object({
  productId: z.string().regex(OBJECT_ID_PATTERN, "Unknown product"),
  variantId: z.string().regex(OBJECT_ID_PATTERN, "Unknown colour"),
  qty: z
    .number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .max(MAX_LINE_QTY, `Quantity cannot exceed ${MAX_LINE_QTY}`),
});

export type OrderLineInput = z.infer<typeof orderLineSchema>;

// The lines reach the action as a JSON string in a hidden input, the same way
// product images do (features/admin/lib/product-schema.ts).
const itemsField = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const raw = value.trim();
    if (raw.length === 0) return [];
    try {
      return JSON.parse(raw);
    } catch {
      // Left as the raw string so the array check reports the failure.
      return value;
    }
  },
  z
    .array(orderLineSchema, { error: "Your cart could not be read" })
    .min(1, "Your cart is empty")
    .max(MAX_CART_LINES, "That's too many pieces for one order")
    .refine(
      // By the composite key, not the product: the same wallet in black and in
      // tan is two legitimate lines, and collapsing them would be the bug.
      (lines) => new Set(lines.map(lineKey)).size === lines.length,
      "The same piece appears twice in your cart",
    ),
);

export const checkoutSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Your name is required")
    .max(120, "Name cannot exceed 120 characters"),
  // Normalised here rather than in the action so the client sees the same
  // rejection the server would give, and so `phoneKey` and the displayed
  // number are derived from one transform.
  phone: z
    .string()
    .trim()
    .min(1, "A phone number is required — we call to confirm every order")
    .transform((value, ctx) => {
      const normalised = normalizeBdPhone(value);
      if (!normalised) {
        ctx.addIssue({
          code: "custom",
          message: "Enter a Bangladeshi mobile number, e.g. 01712345678",
        });
        return z.NEVER;
      }
      return normalised;
    }),
  // Optional by design: an email is how we send a receipt and how a guest
  // order is later claimed onto an account, but requiring one would cost
  // conversions on a cash-on-delivery order.
  email: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined))
    .refine(
      (value) => value === undefined || z.email().safeParse(value).success,
      "That doesn't look like an email address",
    ),
  district: z
    .string()
    .trim()
    .min(1, "Select your district")
    .refine(isKnownDistrict, "Select your district"),
  thana: z
    .string()
    .trim()
    .min(2, "Your thana or upazila is required")
    .max(80, "Thana cannot exceed 80 characters"),
  street: z
    .string()
    .trim()
    .min(5, "A street address is required")
    .max(240, "Address cannot exceed 240 characters"),
  notes: z
    .string()
    .trim()
    .max(500, "Notes cannot exceed 500 characters")
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  items: itemsField,
  // Minted in the browser and unique on the order, so a double-submit resolves
  // to one row. Length-checked only — its value is opaque to the server.
  idempotencyKey: z
    .string()
    .trim()
    .min(8, "Could not identify this order")
    .max(100, "Could not identify this order"),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** Shape the action feeds to zod — every value straight off the FormData. */
export function readCheckoutFormData(formData: FormData) {
  const get = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : undefined;
  };

  return {
    fullName: get("fullName") ?? "",
    phone: get("phone") ?? "",
    email: get("email"),
    district: get("district") ?? "",
    thana: get("thana") ?? "",
    street: get("street") ?? "",
    notes: get("notes"),
    items: get("items") ?? "[]",
    idempotencyKey: get("idempotencyKey") ?? "",
  };
}
