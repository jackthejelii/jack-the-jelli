/**
 * The one definition of a swatch colour, in a module that imports nothing.
 *
 * It has to live outside models/Product.ts: the admin product schema validates
 * against it and that schema is imported by client components, so reaching for
 * the model would drag Mongoose — and through it `net`/`tls` — into the browser
 * bundle. features/admin/lib/types.ts carries the same warning for the same
 * reason, and imports the model's types only.
 */

/** Six-digit hex, e.g. "#1c1b1a". Three-digit shorthand is deliberately not accepted. */
export const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

/**
 * The plain-English colour families a search box has to speak.
 *
 * The catalogue names its colourways editorially — Citron, Oxblood, Taupe,
 * Pewter — but shoppers type "yellow", "red", "brown", "grey". Bridging that
 * gap from the `hex` every variant already stores means a new colourway is
 * searchable the moment an admin saves it, with no synonym table to remember
 * to update. See `hexFamilies` and `familiesForWord` below.
 */
export type ColorFamily =
  | "black"
  | "white"
  | "grey"
  | "brown"
  | "red"
  | "pink"
  | "orange"
  | "yellow"
  | "green"
  | "teal"
  | "blue"
  | "purple";

/** `#bbaa02` -> `[54, 0.98, 0.37]` (degrees, 0-1, 0-1), or null if unparseable. */
function toHsl(hex: string): [number, number, number] | null {
  if (!HEX_COLOR_PATTERN.test(hex)) return null;

  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) return [0, 0, l];

  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  const h =
    max === r
      ? (g - b) / delta + (g < b ? 6 : 0)
      : max === g
        ? (b - r) / delta + 2
        : (r - g) / delta + 4;

  return [h * 60, s, l];
}

/**
 * Every family a swatch plausibly belongs to.
 *
 * Returns a *set*, not one bucket, and the hue bands below deliberately
 * overlap: this feeds a search box, where missing a match a shopper expected
 * costs more than including one they didn't. Olive is both yellow and green,
 * and someone typing either word should find it.
 *
 * Ordering is load-bearing. Lightness decides first (a near-black is black
 * whatever its hue), then brown — which has no hue band of its own, being
 * nothing but a dark, muted orange-red — and only then the neutral check.
 * Running grey earlier would swallow Chestnut (7% saturation, but plainly
 * brown); running it later would let Silver out as orange.
 *
 * The thresholds are calibrated against the shipped catalogue rather than
 * derived from theory. If a colourway ever classifies visibly wrong, the fix
 * is to widen a band here, not to special-case the name.
 */
export function hexFamilies(hex: string): ColorFamily[] {
  const hsl = toHsl(hex);
  if (!hsl) return [];

  const [h, s, l] = hsl;

  if (l <= 0.18) return ["black"];
  if (l >= 0.8) return ["white"];

  // Brown: muted and mid-dark, in the orange-through-red arc. Split in two
  // because the red side has to stay darker to qualify — otherwise Rose, a
  // light dusty pink, reads as brown.
  const muted = s >= 0.06 && s < 0.45;
  if (muted && h >= 20 && h < 50 && l < 0.68) return ["brown"];
  if (muted && h < 20 && l < 0.5) return ["brown"];

  // Neutral. The second clause catches light warm greys like Silver, which
  // carry just enough hue to escape the first.
  if (s <= 0.1) return ["grey"];
  if (s <= 0.18 && l >= 0.65) return ["grey"];

  const families = new Set<ColorFamily>();
  if (h < 15 || h >= 345) families.add("red");
  // Pink is a *light* red, not a hue of its own — lightness is what separates
  // Rose from Crimson, which sit only a few degrees apart.
  if (l >= 0.55 && (h < 30 || h >= 320)) families.add("pink");
  if (h >= 12 && h < 45) families.add("orange");
  if (h >= 45 && h < 72) families.add("yellow");
  if (h >= 60 && h < 165) families.add("green");
  if (h >= 165 && h < 200) families.add("teal");
  if (h >= 185 && h < 255) families.add("blue");
  if (h >= 250 && h < 290) families.add("purple");
  if (h >= 285 && h < 350) families.add("pink");

  return [...families];
}

/**
 * Generic colour words only — never a colourway's own name.
 *
 * "Citron" and "Navy" are deliberately absent: both already match exactly
 * against `variants.color`, and routing them through here would widen a
 * precise request into every yellow or every blue in the catalogue. A shopper
 * who typed the brand's own word for a colour meant that colour. This table
 * exists solely for the shopper who didn't know it.
 */
const WORD_FAMILIES: Record<string, ColorFamily[]> = {
  black: ["black"],
  charcoal: ["black"],
  ebony: ["black"],
  white: ["white"],
  cream: ["white"],
  offwhite: ["white"],
  bone: ["white"],
  grey: ["grey"],
  gray: ["grey"],
  silver: ["grey"],
  brown: ["brown"],
  tan: ["brown"],
  chocolate: ["brown"],
  coffee: ["brown"],
  camel: ["brown"],
  beige: ["brown", "white"],
  red: ["red"],
  maroon: ["red"],
  burgundy: ["red"],
  wine: ["red"],
  scarlet: ["red"],
  pink: ["pink"],
  blush: ["pink"],
  magenta: ["pink"],
  fuchsia: ["pink"],
  orange: ["orange"],
  rust: ["orange", "brown"],
  copper: ["orange", "brown"],
  amber: ["orange", "yellow"],
  peach: ["orange", "pink"],
  yellow: ["yellow"],
  gold: ["yellow"],
  golden: ["yellow"],
  mustard: ["yellow"],
  lemon: ["yellow"],
  green: ["green"],
  emerald: ["green"],
  mint: ["green"],
  khaki: ["green", "brown"],
  teal: ["teal"],
  cyan: ["teal"],
  turquoise: ["teal"],
  aqua: ["teal"],
  blue: ["blue"],
  azure: ["blue"],
  indigo: ["blue", "purple"],
  purple: ["purple"],
  violet: ["purple"],
  lilac: ["purple"],
  lavender: ["purple"],
  plum: ["purple", "red"],
};

/**
 * The families one search token asks for, or an empty array when the token
 * isn't a colour word at all — which is the common case, and the signal the
 * caller uses to skip the hex branch of the query entirely.
 */
export function familiesForWord(word: string): ColorFamily[] {
  // Strips the hyphen out of "off-white" and the trailing "s" a shopper might
  // type; anything left that isn't a letter can't be a colour word.
  const normalised = word.toLowerCase().replace(/[^a-z]/g, "");
  return (
    WORD_FAMILIES[normalised] ??
    WORD_FAMILIES[normalised.replace(/s$/, "")] ??
    []
  );
}
