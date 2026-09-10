import mongoose, { Schema } from "mongoose";
import { HEX_COLOR_PATTERN } from "@/lib/color";
import { escapeRegex, slugify } from "@/lib/slug";

export const PRODUCT_STATUSES = ["Draft", "Published", "Archived"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export interface IProductImage {
  url: string;
  publicId: string;
}

/**
 * One colourway of a product — the thing a shopper actually buys.
 *
 * `sku`, `stock` and `images` live here rather than on the product because all
 * three genuinely differ per colour: the black bifold and the tan bifold are
 * counted, photographed and picked from the shelf separately. What does *not*
 * differ — name, price, description, category — deliberately stays on the
 * parent, so repricing a piece can never leave two colours disagreeing.
 *
 * `variants` is required with at least one entry, so a single-colour product is
 * just a one-variant product. That is the whole point: no call site anywhere
 * has to branch on "does this product have variants?", because every one does.
 *
 * These keep their `_id` (unlike IProductImage, which is `{ _id: false }`) —
 * it is the id a cart line, an order line and the stock decrement all address.
 */
export interface IProductVariant {
  _id: mongoose.Types.ObjectId;
  /** Display name of the colourway, e.g. "Black". Unique within the product. */
  color: string;
  /** The swatch fill. Not checked against the photo — it is a label, not the product. */
  hex: string;
  sku: string;
  stock: number;
  images: IProductImage[];
}

export interface IProduct {
  name: string;
  slug: string;
  category: mongoose.Types.ObjectId;
  price: number;
  description?: string;
  /**
   * What the piece is made of, as the shopper would want it stated — "Full-grain
   * calfskin", not a tannery code. Optional because the catalogue predates the
   * field; the detail page simply omits the row when it is empty.
   */
  material?: string;
  /** Closed dimensions, free text so the unit travels with the value: "11 x 9 cm closed". */
  dimensions?: string;
  status: ProductStatus;
  /**
   * Admin-set flag for the homepage featured strip. A dedicated boolean rather
   * than a `tags: ["featured"]` convention: it maps 1:1 to a checkbox, it can
   * be indexed alongside `status`, and it can't be broken by a typo in a free
   * text field.
   */
  featured: boolean;
  /** Never empty — see IProductVariant. The first entry is the default colour. */
  variants: IProductVariant[];
  /** Schema-only (D3a): no form control yet, kept so adding one needs no migration. */
  comparePrice?: number;
  /** Schema-only (D3a): see comparePrice. */
  tags: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

const productImageSchema = new Schema<IProductImage>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false },
);

const productVariantSchema = new Schema<IProductVariant>({
  color: { type: String, required: true, trim: true, maxlength: 40 },
  hex: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [
      HEX_COLOR_PATTERN,
      "Swatch colour must be a hex value like #1c1b1a",
    ],
  },
  sku: { type: String, required: true, uppercase: true, trim: true },
  stock: { type: Number, required: true, min: 0, default: 0 },
  // Objects rather than bare URLs: publicId is what makes deletion possible.
  images: { type: [productImageSchema], default: [] },
});

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    // BDT, stored as whole taka — not paisa.
    price: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true },
    material: { type: String, trim: true, maxlength: 120 },
    dimensions: { type: String, trim: true, maxlength: 120 },
    status: {
      type: String,
      enum: PRODUCT_STATUSES,
      default: "Draft",
      index: true,
    },
    // Absent on every document written before this field existed, which reads
    // as false to a `featured: true` query — so no backfill is needed.
    featured: { type: Boolean, default: false },
    variants: {
      type: [productVariantSchema],
      // `default: undefined` rather than the implicit `[]`, so an omitted
      // variants array fails `required` instead of saving an empty product.
      default: undefined,
      required: true,
      validate: {
        validator: (variants: IProductVariant[]) => variants.length > 0,
        message: "A product needs at least one colour",
      },
    },
    comparePrice: { type: Number, min: 0 },
    tags: { type: [String], default: [] },
  },
  { timestamps: true },
);

// Every storefront query filters on `status: "Published"` and then sorts, so
// the sort key has to ride along in the same index or Mongo falls back to an
// in-memory sort over the whole matching set.
productSchema.index({ status: 1, createdAt: -1 }); // default browse + "newest"
productSchema.index({ status: 1, price: 1 }); // price sorts + related products
productSchema.index({ status: 1, category: 1, createdAt: -1 }); // category filter
productSchema.index({ status: 1, featured: 1, createdAt: -1 }); // homepage strip

// Search is an unanchored /foo/i regex, which can never *seek* an index — this
// only lets Mongo scan the index instead of the collection. A modest win, and
// the honest fix if search ever gets slow is a text index or Atlas Search.
productSchema.index({ status: 1, name: 1 });

// A SKU identifies one colourway of one product, so uniqueness moved down here
// with the field. This is a *multikey* unique index, which constrains values
// across separate documents only — MongoDB permits a single document's array
// to repeat a value, so duplicates within one product are caught by the
// pre("validate") hook below instead.
//
// NOTE: this does not remove the old product-level `sku_1` index. Mongoose only
// ever calls createIndex, so a database that already built it keeps it — and
// once `sku` no longer exists on the documents they all index as null, which a
// unique index rejects on the *second* product saved. An existing deployment
// needs a one-off db.products.dropIndex("sku_1"); scripts/migrate-variants.mjs
// does exactly that.
productSchema.index({ "variants.sku": 1 }, { unique: true });

// Derive the slug from the name, de-duplicating with a numeric suffix. The
// unique index is still the last line of defence against a race.
productSchema.pre("validate", async function () {
  if (!this.isModified("name") && this.slug) return;

  const base = slugify(this.name ?? "") || "product";
  const model = this.constructor as mongoose.Model<IProduct>;
  const taken = await model
    .find({
      slug: new RegExp(`^${escapeRegex(base)}(-\\d+)?$`, "i"),
      _id: { $ne: this._id },
    })
    .select("slug")
    .lean();

  const used = new Set(taken.map((doc) => doc.slug));
  if (!used.has(base)) {
    this.slug = base;
    return;
  }

  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  this.slug = `${base}-${suffix}`;
});

// The half of variant uniqueness no index can enforce (see above): two colours
// of the *same* product sharing a name or a SKU. A repeated colour is
// unpickable — two identical swatches — and a repeated SKU makes the warehouse
// copy ambiguous, so both are rejected rather than quietly merged.
productSchema.pre("validate", function () {
  const colors = new Set<string>();
  const skus = new Set<string>();

  for (const variant of this.variants ?? []) {
    const color = variant.color?.trim().toLowerCase();
    const sku = variant.sku?.trim().toUpperCase();

    if (color) {
      if (colors.has(color)) {
        this.invalidate(
          "variants",
          `Two colours are both named "${variant.color}"`,
        );
        return;
      }
      colors.add(color);
    }
    if (sku) {
      if (skus.has(sku)) {
        this.invalidate("variants", `Two colours share the SKU ${sku}`);
        return;
      }
      skus.add(sku);
    }
  }
});

// Hot-reload guard — without it dev throws OverwriteModelError.
// NOTE: this also means schema/hook edits don't take effect until the dev
// server restarts, since the already-registered model is returned as-is.
const Product =
  (mongoose.models.Product as mongoose.Model<IProduct>) ||
  mongoose.model<IProduct>("Product", productSchema);

export default Product;
