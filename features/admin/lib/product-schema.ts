import { z } from "zod";
// Never from models/Product.ts: this module is imported by client components,
// and the model would drag Mongoose into the browser bundle.
import { HEX_COLOR_PATTERN } from "@/lib/color";

// One schema, imported by both the Server Action (authoritative) and the client
// (instant feedback), so the rules can't drift. Mongoose validation is the last
// line of defence.

export const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

/**
 * A ceiling, not a target. Nothing in the data model needs one — it exists so a
 * malformed or hostile payload can't post a thousand colourways, each with its
 * own image list, into a single document.
 */
export const MAX_VARIANTS = 12;

/**
 * Text fields echoed back into the form after a failed submit.
 *
 * `variants` rides along as its JSON string: the whole colour editor — names,
 * swatches, SKUs, stock and the images already uploaded — would otherwise be
 * wiped by a rejected save, which is a great deal more work to redo than a
 * mistyped price.
 */
export const PRODUCT_VALUE_FIELDS = [
  "name",
  "category",
  "price",
  "description",
  "featured",
  "variants",
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

/**
 * Both `images` and `variants` reach the action as a JSON string in a hidden
 * input (§5), so both are parsed the same way — a bad string is left as-is for
 * the array check below to report, rather than throwing inside zod.
 */
const jsonField = (value: unknown) => {
  if (typeof value !== "string") return value;
  const raw = value.trim();
  if (raw.length === 0) return [];
  try {
    return JSON.parse(raw);
  } catch {
    // Leave it as the raw string so the array check reports the failure.
    return value;
  }
};

/**
 * Stock arrives as a real number through the variants JSON, but the editor's
 * input is a string and a hand-built payload could send either — so both are
 * accepted and normalised here rather than assumed.
 */
const variantStockField = z
  .union([z.number(), z.string()])
  .transform((value) =>
    typeof value === "number" ? value : Number(value.trim() || "0"),
  )
  .refine((value) => Number.isFinite(value), "Stock must be a number")
  .refine(
    (value) => Number.isInteger(value) && value >= 0,
    "Stock must be a whole number, zero or more",
  );

/**
 * One colourway as the form submits it.
 *
 * `id` is the existing subdocument `_id`, absent for a colour the admin just
 * added. It is what lets an edit rewrite a colourway in place instead of
 * replacing it — and that matters more than it looks: every cart line and
 * order line addresses a colour by this id, so regenerating them on every save
 * would silently orphan carts and break the stock restore on past orders.
 */
export const productVariantInputSchema = z.object({
  id: z
    .string()
    .trim()
    .optional()
    .transform((value) =>
      value && OBJECT_ID_PATTERN.test(value) ? value : undefined,
    ),
  color: z
    .string()
    .trim()
    .min(1, "Every colour needs a name")
    .max(40, "A colour name cannot exceed 40 characters"),
  hex: z
    .string()
    .trim()
    .regex(HEX_COLOR_PATTERN, "Every colour needs a swatch, e.g. #1c1b1a")
    .transform((value) => value.toLowerCase()),
  sku: z
    .string()
    .trim()
    .min(3, "Every colour needs its own SKU")
    .max(16, "A SKU cannot exceed 16 characters")
    .transform((value) => value.toUpperCase()),
  stock: variantStockField,
  images: z.array(productImageSchema, {
    error: "Uploaded images could not be read",
  }),
});

export type ProductVariantInput = z.infer<typeof productVariantInputSchema>;

const variantsField = z.preprocess(
  jsonField,
  z
    .array(productVariantInputSchema, {
      error: "The colours could not be read",
    })
    // The model enforces this too, but a form that posts no colours should say
    // so under the editor rather than surface as a Mongoose validation failure.
    .min(1, "A product needs at least one colour")
    .max(
      MAX_VARIANTS,
      `A product cannot have more than ${MAX_VARIANTS} colours`,
    )
    .refine(
      (variants) =>
        new Set(variants.map((variant) => variant.color.toLowerCase())).size ===
        variants.length,
      "Two colours share a name",
    )
    .refine(
      (variants) =>
        new Set(variants.map((variant) => variant.sku)).size ===
        variants.length,
      "Two colours share a SKU",
    ),
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
  category: z.string().trim().regex(OBJECT_ID_PATTERN, "Select a category"),
  price: numberField("Price"),
  description: z
    .string()
    .trim()
    .max(5000, "Description cannot exceed 5000 characters")
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  variants: variantsField,
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
    category: get("category") ?? "",
    price: get("price") ?? "",
    description: get("description"),
    variants: get("variants") ?? "[]",
    featured: get("featured"),
    intent: get("intent"),
  };
}
