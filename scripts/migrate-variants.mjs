/**
 * One-off migration: product-level SKU/stock/images -> per-colourway variants.
 *
 *   node scripts/migrate-variants.mjs          # report only, writes nothing
 *   node scripts/migrate-variants.mjs --apply  # actually migrate
 *
 * Run it once against each database that has products predating the variants
 * change. It is idempotent — a product that already has a `variants` array is
 * left alone — so a second run is safe.
 *
 * Two things it does, and one it can't:
 *
 *  1. Wraps each product's `sku`, `stock` and `images` into a single variant,
 *     then unsets those fields plus the now-derived `thumbnail`.
 *
 *  2. Drops the stale `sku_1` unique index. This is the part that cannot be
 *     skipped. Mongoose only ever calls createIndex, so a database that already
 *     built that index keeps it — and once `sku` is gone from the documents
 *     they all index as null, which a unique index rejects on the *second*
 *     product saved. Without this drop, saving any second product fails with
 *     E11000 and the cause is nowhere near the symptom.
 *
 *  3. It cannot name a colour. Existing products have no colourway, so each
 *     migrated variant is written as "Standard" in near-black and every one is
 *     listed below — open each in /admin/products and give it its real name and
 *     swatch. The name is what the cart, the receipt and the packing list will
 *     say, so it is worth doing before the next order.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import mongoose from "mongoose";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Placeholder colour for a product that predates colourways entirely. */
const PLACEHOLDER_COLOR = "Standard";
const PLACEHOLDER_HEX = "#1c1b1a";

/**
 * Minimal .env.local reader. This runs outside Next, so nothing has loaded the
 * environment for us, and pulling in dotenv for one variable is not worth a
 * dependency.
 */
function readEnvLocal() {
  try {
    const raw = readFileSync(path.join(ROOT, ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (!match) continue;
      const [, key, value] = match;
      if (process.env[key] !== undefined) continue;
      process.env[key] = value.trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    // No .env.local — the variable may still come from the real environment.
  }
}

async function main() {
  const apply = process.argv.includes("--apply");

  readEnvLocal();
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error(
      "MONGODB_URI is not set (looked in the environment and .env.local).",
    );
    process.exit(1);
  }

  await mongoose.connect(uri);
  const products = mongoose.connection.db.collection("products");

  // Anything without a variants array — including a document where a previous
  // half-run left an empty one, which is not a valid product either.
  const pending = await products
    .find({
      $or: [{ variants: { $exists: false } }, { variants: { $size: 0 } }],
    })
    .toArray();

  console.log(
    apply
      ? `Migrating ${pending.length} product(s).`
      : `${pending.length} product(s) would be migrated. Re-run with --apply to write.`,
  );

  for (const product of pending) {
    const variant = {
      _id: new mongoose.Types.ObjectId(),
      color: PLACEHOLDER_COLOR,
      hex: PLACEHOLDER_HEX,
      // A product with no SKU at all can't be left without one — the field is
      // required on a variant — so the id stands in until someone edits it.
      sku: (
        product.sku ?? `SKU-${String(product._id).slice(-6)}`
      ).toUpperCase(),
      stock: typeof product.stock === "number" ? product.stock : 0,
      images: Array.isArray(product.images) ? product.images : [],
    };

    console.log(
      `  ${product.name ?? "(unnamed)"} — ${variant.sku}, ${variant.stock} in stock, ${variant.images.length} image(s)`,
    );

    if (!apply) continue;

    await products.updateOne(
      { _id: product._id },
      {
        $set: { variants: [variant] },
        // thumbnail goes too: it was a copy of images[0].url, and every surface
        // now reads that through the colourway instead.
        $unset: { sku: "", stock: "", images: "", thumbnail: "" },
      },
    );
  }

  // Always attempted, even on a report-only run's second pass: the index is the
  // failure mode that bites long after the documents look fine.
  if (apply) {
    try {
      await products.dropIndex("sku_1");
      console.log("Dropped the stale product-level sku_1 unique index.");
    } catch (error) {
      // 27 = IndexNotFound. Already gone, or never built on this database.
      if (error?.code === 27) {
        console.log("No sku_1 index to drop — nothing to do.");
      } else {
        throw error;
      }
    }
  }

  if (apply && pending.length > 0) {
    console.log(
      `\nEvery migrated colour is named "${PLACEHOLDER_COLOR}". Open each product in ` +
        `/admin/products and set its real colour name and swatch.`,
    );
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
