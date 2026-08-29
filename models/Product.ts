import mongoose, { Schema } from "mongoose";
import { escapeRegex, slugify } from "@/lib/slug";

export const PRODUCT_STATUSES = ["Draft", "Published", "Archived"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export interface IProductImage {
  url: string;
  publicId: string;
}

export interface IProduct {
  name: string;
  slug: string;
  sku: string;
  category: mongoose.Types.ObjectId;
  price: number;
  description?: string;
  stock: number;
  status: ProductStatus;
  /**
   * Admin-set flag for the homepage featured strip. A dedicated boolean rather
   * than a `tags: ["featured"]` convention: it maps 1:1 to a checkbox, it can
   * be indexed alongside `status`, and it can't be broken by a typo in a free
   * text field.
   */
  featured: boolean;
  thumbnail?: string;
  images: IProductImage[];
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

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    // BDT, stored as whole taka — not paisa.
    price: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true },
    stock: { type: Number, required: true, min: 0, default: 0 },
    status: {
      type: String,
      enum: PRODUCT_STATUSES,
      default: "Draft",
      index: true,
    },
    // Absent on every document written before this field existed, which reads
    // as false to a `featured: true` query — so no backfill is needed.
    featured: { type: Boolean, default: false },
    // Cloudinary secure_url of the primary image.
    thumbnail: { type: String },
    // Objects rather than bare URLs: publicId is what makes deletion possible.
    images: { type: [productImageSchema], default: [] },
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

// Hot-reload guard — without it dev throws OverwriteModelError.
// NOTE: this also means schema/hook edits don't take effect until the dev
// server restarts, since the already-registered model is returned as-is.
const Product =
  (mongoose.models.Product as mongoose.Model<IProduct>) ||
  mongoose.model<IProduct>("Product", productSchema);

export default Product;
