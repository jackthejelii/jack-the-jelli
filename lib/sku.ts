// Stock-code helpers. A SKU is minted once, on the save that first persists a
// colourway, and never changes afterwards — see the generator hook in
// models/Product.ts. Everything here is pure and node-free, so a client
// component could import it if one ever needed to preview a code.

import { slugify } from "@/lib/slug";

/** The cap the schema, the model and the generator all agree on. */
export const SKU_MAX_LENGTH = 16;

/** Generated codes look like CLABIF-BLK-01 — stem, colour, counter. */
export const GENERATED_SKU_PATTERN = /^[A-Z0-9]{3,6}-[A-Z0-9]{1,3}-\d{2,3}$/;

/** How many characters each half of a two-word stem contributes. */
const TOKEN_CHARS = 3;
/** A one-word name gets the whole budget to itself. */
const STEM_CHARS = TOKEN_CHARS * 2;

/**
 * The handful of colours whose conventional stock abbreviation isn't simply
 * the first three letters. Purely cosmetic, and safe to extend or delete: the
 * counter is what makes a SKU unique, so a miss here only means the code reads
 * BLA rather than BLK.
 */
const COLOR_CODES: Record<string, string> = {
  black: "BLK",
  brown: "BRN",
  white: "WHT",
  green: "GRN",
  grey: "GRY",
  gray: "GRY",
  navy: "NVY",
};

/**
 * The product half of a SKU: "Classic Bifold" -> CLABIF, "Cardholder" ->
 * CARDHO, "" -> PRD.
 *
 * Two words contribute three characters each; one word takes all six. Longer
 * names are simply truncated — the stem identifies a product to a human
 * reading a shelf label, it doesn't have to round-trip back to the name.
 */
export function skuStem(name: string): string {
  const tokens = slugify(name).split("-").filter(Boolean);
  if (tokens.length === 0) return "PRD";

  const stem =
    tokens.length === 1
      ? tokens[0].slice(0, STEM_CHARS)
      : tokens
          .slice(0, 2)
          .map((token) => token.slice(0, TOKEN_CHARS))
          .join("");

  // A name of one or two characters ("Q", "XL") would leave a stem too short
  // to read as a code, so it is padded rather than left ragged.
  return stem.toUpperCase().padEnd(3, "X");
}

/** The colour half: "Black" -> BLK, "Tan" -> TAN, "Cognac" -> COG. */
export function colorCode(color: string): string {
  const normalised = slugify(color).replace(/-/g, "");
  if (!normalised) return "STD";
  return COLOR_CODES[normalised] ?? normalised.slice(0, 3).toUpperCase();
}

/** The stem+colour half, without the counter — the key a counter runs within. */
export function skuPrefix(name: string, color: string): string {
  return `${skuStem(name)}-${colorCode(color)}`;
}

/**
 * The lowest `PREFIX-NN` not already spoken for, counting from 01.
 *
 * `taken` is every SKU sharing this prefix — both the ones already in the
 * database and the ones handed out moments ago in the same save. Past 99 the
 * counter simply grows a digit; at six stem characters that is still 14, well
 * inside SKU_MAX_LENGTH.
 */
export function nextSku(prefix: string, taken: ReadonlySet<string>): string {
  for (let counter = 1; ; counter += 1) {
    const candidate = `${prefix}-${String(counter).padStart(2, "0")}`;
    if (!taken.has(candidate)) return candidate;
  }
}
