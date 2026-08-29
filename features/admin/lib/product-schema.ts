import { z } from "zod";

// One schema, imported by both the Server Action (authoritative) and the client
// (instant feedback), so the rules can't drift. Mongoose validation is the last
// line of defence.

export const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

/** Text fields echoed back into the form after a failed submit. */
export const PRODUCT_VALUE_FIELDS = [
  "name",
  "sku",
  "category",
  "price",
  "stock",
  "description",
  "featured",
] as const;

// FormData yields strings for everything (§6.7), so numbers get coerced rather
// than trusted. Coercion is spelled out instead of using z.coerce.number() so a
// non-numeric entry reports "Price must be a number", not "expected number,
// received NaN".
const numberField = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine(
      (value) => Number.isFinite(Number(value)),
      `${label} must be a number`,
    )
    .transform(Number)
    .refine((value) => value >= 0, `${label} cannot be negative`);

const optionalNumberField = (label: string, fallback: number) =>
  z
    .string()
    .optional()
    .transform((value) => {
      const trimmed = value?.trim();
      return trimmed && trimmed.length > 0 ? trimmed : String(fallback);
    })
    .pipe(numberField(label));

/**
 * An unchecked checkbox is absent from FormData entirely, so "missing" is the
 * false case rather than a validation failure. `"on"` is what a native
 * checkbox submits; `"true"` is accepted so the echoed-back value from a
 * failed submit round-trips.
 */
const checkboxField = z
  .string()
  .optional()
  .transform((value) => value === "on" || value === "true");

export const productImageSchema = z.object({
  url: z.url("An uploaded image has an invalid URL"),
  publicId: z.string().min(1, "An uploaded image is missing its Cloudinary id"),
});

export type ProductImageInput = z.infer<typeof productImageSchema>;

// Images reach the action as a JSON string in a hidden input (§5).
const imagesField = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const raw = value.trim();
    if (raw.length === 0) return [];
    try {
      return JSON.parse(raw);
    } catch {
      // Leave it as the raw string so the array check reports the failure.
      return value;
    }
  },
  z.array(productImageSchema, { error: "Uploaded images could not be read" }),
);

/** Which button was pressed (D4) — decides the persisted status. */
const productIntentSchema = z
  .enum(["draft", "publish"])
  .optional()
  .default("draft");

export const createProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Product name is required")
    .max(120, "Product name cannot exceed 120 characters"),
  sku: z
    .string()
    .trim()
    .min(3, "SKU is required")
    .max(16, "SKU cannot exceed 16 characters")
    .transform((value) => value.toUpperCase()),
  category: z.string().trim().regex(OBJECT_ID_PATTERN, "Select a category"),
  price: numberField("Price"),
  stock: optionalNumberField("Stock", 0),
  description: z
    .string()
    .trim()
    .max(5000, "Description cannot exceed 5000 characters")
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  images: imagesField,
  featured: checkboxField,
  intent: productIntentSchema,
});

export const updateProductSchema = createProductSchema.extend({
  id: z.string().trim().regex(OBJECT_ID_PATTERN, "Unknown product"),
});

/** Shared by archiveProduct/restoreProduct — status-only mutations need no other field. */
export const productIdSchema = z.object({
  id: z.string().trim().regex(OBJECT_ID_PATTERN, "Unknown product"),
});

/**
 * The Featured column on the inventory table: an id plus the state being moved
 * to. The next state is sent explicitly rather than inferred as "flip it" so
 * two quick clicks, or a stale row, can't land on the opposite of what the
 * admin saw when they clicked.
 */
export const productFeaturedSchema = productIdSchema.extend({
  featured: checkboxField,
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

/** Shape the action feeds to zod — every value straight off the FormData. */
export function readProductFormData(formData: FormData) {
  const get = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : undefined;
  };

  return {
    // Only read by updateProductSchema; createProductSchema strips it.
    id: get("id") ?? "",
    name: get("name") ?? "",
    sku: get("sku") ?? "",
    category: get("category") ?? "",
    price: get("price") ?? "",
    stock: get("stock"),
    description: get("description"),
    images: get("images") ?? "[]",
    featured: get("featured"),
    intent: get("intent"),
  };
}
