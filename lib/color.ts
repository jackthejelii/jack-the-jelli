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
