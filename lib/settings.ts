import { cacheLife, cacheTag } from "next/cache";

import { connectDB } from "@/lib/db";
import { Settings, SETTINGS_DOC_ID, type ISettings } from "@/models";
import {
  DEFAULT_DELIVERY_RATES,
  type DeliveryRates,
} from "@/features/checkout/lib/delivery";
import { LEGAL_INFO } from "@/features/legal/lib/legal-info";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "@/features/products/lib/stock";

/**
 * The one way anything reads the shop's settings.
 *
 * Server-only: it pulls in Mongoose. Client components take what they need as
 * props — the checkout form gets its delivery rates handed down rather than
 * importing them, the same arrangement `features/checkout/lib/delivery.ts`
 * already describes for itself.
 */

/** Invalidated by `updateTag` in the settings action. */
export const SETTINGS_TAG = "site-settings";

export interface SiteSettings {
  feeInsideDhaka: number;
  feeOutsideDhaka: number;
  freeDeliveryThreshold: number;
  deliveryDaysMin: number;
  deliveryDaysMax: number;

  contactEmail: string;
  contactPhone: string;
  instagram: string;
  address: string;

  lowStockThreshold: number;
  staleDraftMinutes: number;
  ordersPerPage: number;

  ordersPaused: boolean;
  ordersPausedMessage: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

/**
 * What the shop does when the database has never been written to, or cannot be
 * reached at all.
 *
 * **Every value here is what the app shipped with**, imported from the module
 * that used to be its only home rather than retyped — so an unconfigured shop
 * and an unreachable database both behave exactly like the version of this
 * codebase that had no settings at all. That is the whole safety property: the
 * database can only ever *override* a working default, never remove one.
 *
 * The three operations values are declared here rather than imported because
 * their current homes (`features/admin/lib/orders.ts`,
 * `features/products/lib/stock.ts`) sit downstream of this module — importing
 * the admin order helpers here would drag Mongoose and the Order model into
 * every consumer's trace for two integers.
 */
export const DEFAULT_SETTINGS: SiteSettings = {
  feeInsideDhaka: DEFAULT_DELIVERY_RATES.feeInsideDhaka,
  feeOutsideDhaka: DEFAULT_DELIVERY_RATES.feeOutsideDhaka,
  freeDeliveryThreshold: DEFAULT_DELIVERY_RATES.freeDeliveryThreshold,
  deliveryDaysMin: LEGAL_INFO.deliveryDaysMin,
  deliveryDaysMax: LEGAL_INFO.deliveryDaysMax,

  contactEmail: LEGAL_INFO.contactEmail,
  contactPhone: LEGAL_INFO.contactPhone,
  instagram: LEGAL_INFO.instagram,
  address: LEGAL_INFO.address,

  lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
  // Mirrors STALE_DRAFT_MINUTES in features/admin/lib/orders.ts, which starts
  // reading this instead in the pass that rewires the consumers.
  staleDraftMinutes: 15,
  ordersPerPage: 10,

  ordersPaused: false,
  ordersPausedMessage:
    "We have paused new orders for a short while. Please check back soon.",
  maintenanceMode: false,
  maintenanceMessage:
    "We are making a few changes to the shop and will be back shortly.",
};

/**
 * Merge a stored document over the defaults, field by field.
 *
 * Deliberately not `{ ...DEFAULT_SETTINGS, ...doc }`: a spread would let a
 * `null` written by hand in Atlas, or a field Mongoose stored as `null` rather
 * than omitting it, overwrite a perfectly good default with nothing. Each
 * field is taken only when it is actually present and of the right type.
 */
function merge(doc: ISettings | null): SiteSettings {
  if (!doc) return DEFAULT_SETTINGS;

  const num = (value: unknown, fallback: number) =>
    typeof value === "number" && Number.isFinite(value) ? value : fallback;
  const str = (value: unknown, fallback: string) =>
    typeof value === "string" && value.trim() ? value.trim() : fallback;
  const bool = (value: unknown, fallback: boolean) =>
    typeof value === "boolean" ? value : fallback;

  const d = DEFAULT_SETTINGS;

  return {
    feeInsideDhaka: num(doc.feeInsideDhaka, d.feeInsideDhaka),
    feeOutsideDhaka: num(doc.feeOutsideDhaka, d.feeOutsideDhaka),
    freeDeliveryThreshold: num(
      doc.freeDeliveryThreshold,
      d.freeDeliveryThreshold,
    ),
    deliveryDaysMin: num(doc.deliveryDaysMin, d.deliveryDaysMin),
    deliveryDaysMax: num(doc.deliveryDaysMax, d.deliveryDaysMax),

    contactEmail: str(doc.contactEmail, d.contactEmail),
    contactPhone: str(doc.contactPhone, d.contactPhone),
    instagram: str(doc.instagram, d.instagram),
    address: str(doc.address, d.address),

    lowStockThreshold: num(doc.lowStockThreshold, d.lowStockThreshold),
    staleDraftMinutes: num(doc.staleDraftMinutes, d.staleDraftMinutes),
    ordersPerPage: num(doc.ordersPerPage, d.ordersPerPage),

    ordersPaused: bool(doc.ordersPaused, d.ordersPaused),
    ordersPausedMessage: str(doc.ordersPausedMessage, d.ordersPausedMessage),
    maintenanceMode: bool(doc.maintenanceMode, d.maintenanceMode),
    maintenanceMessage: str(doc.maintenanceMessage, d.maintenanceMessage),
  };
}

/**
 * The shop's settings, cached until something changes them.
 *
 * `cacheLife("max")` matters more than it looks. This is read on the checkout
 * page, the product page, the shipping page and — once the maintenance gate
 * lands — inside the storefront layout, which is to say on essentially every
 * request the site serves. Without the cache that is a Mongo round trip per
 * render for four integers that change a few times a year. With it, the read
 * costs nothing and `updateTag(SETTINGS_TAG)` in the save action is what makes
 * a change appear, immediately and everywhere.
 *
 * A cached read also stays *prerenderable*, which is the property the
 * maintenance gate depends on: reading settings does not by itself make a
 * component dynamic, so the storefront keeps its static shell.
 *
 * **It never throws.** A settings lookup is not worth taking the storefront
 * down for, and the fallback is the behaviour the site had before settings
 * existed. The failure is logged and cached only briefly, so a transient Atlas
 * problem doesn't pin the defaults in place for the `max` lifetime — this is
 * the one place where `cacheLife` is called in two branches, exactly one of
 * which runs.
 */
export async function getSettings(): Promise<SiteSettings> {
  "use cache";
  cacheTag(SETTINGS_TAG);

  try {
    await connectDB();
    const doc = await Settings.findById(SETTINGS_DOC_ID).lean<ISettings>();

    cacheLife("max");
    return merge(doc);
  } catch (error) {
    console.error("getSettings failed — falling back to defaults", error);

    // Short, so the next few minutes of traffic retry rather than inheriting a
    // bad moment for as long as `max` would have held it.
    cacheLife("minutes");
    return DEFAULT_SETTINGS;
  }
}

/**
 * Just the three numbers the pricing helpers need.
 *
 * Client Components get this rather than the whole settings object: the rest
 * of it — the contact address, the maintenance copy, the sweep window — is
 * back-office detail that would otherwise be serialised into the RSC payload
 * of every checkout page for no reason, and the availability flags in
 * particular have no business being readable from the browser.
 */
export function toDeliveryRates(settings: SiteSettings): DeliveryRates {
  return {
    feeInsideDhaka: settings.feeInsideDhaka,
    feeOutsideDhaka: settings.feeOutsideDhaka,
    freeDeliveryThreshold: settings.freeDeliveryThreshold,
  };
}
