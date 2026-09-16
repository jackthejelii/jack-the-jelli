import mongoose, { Schema } from "mongoose";

/**
 * The shop's own settings — the handful of facts the owner has to be able to
 * change without a deploy.
 *
 * **A singleton, enforced by the schema rather than by convention.** `_id` is a
 * fixed string instead of an ObjectId, so every write addresses the same
 * document and the collection cannot structurally hold a second one. A
 * `findOne()` with no filter would otherwise be a promise the code makes to
 * itself and can break by accident.
 *
 * **Nothing here is required, and nothing carries a schema default.** That is
 * the important decision. `lib/settings.ts` owns the defaults — they are the
 * constants the app shipped with — and merges this document over them. An
 * absent field therefore means "the shop never changed this", which is exactly
 * what an empty collection on a fresh database should mean, and it keeps the
 * fallback in one place instead of splitting it between here and there.
 *
 * Read through `getSettings()` in `lib/settings.ts`, never directly: that is
 * where the cache tag, the cache lifetime and the never-throws guarantee live.
 */
export interface ISettings {
  /** Always `SETTINGS_DOC_ID`. */
  _id: string;

  // ── Delivery ──────────────────────────────────────────────────────────
  /** Whole taka. Quoted at checkout and recomputed by `placeOrder`. */
  feeInsideDhaka?: number;
  feeOutsideDhaka?: number;
  /** Subtotal at or above which delivery is free. */
  freeDeliveryThreshold?: number;
  /** The courier window quoted at checkout, in the FAQ and on /shipping. */
  deliveryDaysMin?: number;
  deliveryDaysMax?: number;

  // ── Store ─────────────────────────────────────────────────────────────
  /** Published on the legal pages and used as Reply-To. */
  contactEmail?: string;
  contactPhone?: string;
  /** Stored without the leading `@`, which the UI adds. */
  instagram?: string;
  address?: string;

  // ── Operations ────────────────────────────────────────────────────────
  /** At or below this stock count a variant reads as "low stock". */
  lowStockThreshold?: number;
  /** How long a Draft may hold stock before the sweep may release it. */
  staleDraftMinutes?: number;
  /** Rows per page in the admin order and product tables. */
  ordersPerPage?: number;

  // ── Availability ──────────────────────────────────────────────────────
  /**
   * Catalogue stays browsable and indexable; checkout closes and `placeOrder`
   * refuses. The softer of the two switches — a cart is a draft, so nothing
   * about pausing orders needs to empty one.
   */
  ordersPaused?: boolean;
  /** Shown in place of the checkout form. */
  ordersPausedMessage?: string;
  /**
   * The whole storefront is replaced by a notice and marked `noindex`. Admins
   * with a live session still see the real site.
   */
  maintenanceMode?: boolean;
  maintenanceMessage?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

/** The one `_id` this collection ever holds. */
export const SETTINGS_DOC_ID = "settings";

const settingsSchema = new Schema<ISettings>(
  {
    _id: { type: String, default: SETTINGS_DOC_ID },

    // Money and counts are whole numbers everywhere in this app — the shop
    // prices in whole taka and there is no paisa anywhere in the data model.
    // `min: 0` is the floor a Zod schema also enforces at the form; having it
    // here too means a hand-edit in Atlas can't create a negative fee either.
    feeInsideDhaka: { type: Number, min: 0 },
    feeOutsideDhaka: { type: Number, min: 0 },
    freeDeliveryThreshold: { type: Number, min: 0 },
    deliveryDaysMin: { type: Number, min: 0 },
    deliveryDaysMax: { type: Number, min: 0 },

    contactEmail: { type: String, trim: true, lowercase: true, maxlength: 200 },
    contactPhone: { type: String, trim: true, maxlength: 32 },
    instagram: { type: String, trim: true, maxlength: 100 },
    address: { type: String, trim: true, maxlength: 300 },

    lowStockThreshold: { type: Number, min: 0 },
    staleDraftMinutes: { type: Number, min: 1 },
    ordersPerPage: { type: Number, min: 1, max: 100 },

    ordersPaused: { type: Boolean },
    ordersPausedMessage: { type: String, trim: true, maxlength: 500 },
    maintenanceMode: { type: Boolean },
    maintenanceMessage: { type: String, trim: true, maxlength: 500 },
  },
  {
    timestamps: true,
    // Mongoose would otherwise add its own `_id: ObjectId` on top of the
    // String one declared above.
    _id: false,
  },
);

// No index declarations: a one-document collection addressed by `_id` is
// already served by the primary key index, and every other field here is
// written, never queried on.

// Hot-reload guard — without it dev throws OverwriteModelError.
// NOTE: this also means schema edits don't take effect until the dev server
// restarts, since the already-registered model is returned as-is.
const Settings =
  (mongoose.models.Settings as mongoose.Model<ISettings>) ||
  mongoose.model<ISettings>("Settings", settingsSchema);

export default Settings;
