// Collection constants shared by the server query layer and the client grid.
// Deliberately free of Mongoose imports so both sides can import one definition
// instead of keeping duplicated copies in sync by hand.

export const PRODUCTS_PER_PAGE = 9;

export const SORT_OPTIONS = ["newest", "price-asc", "price-desc"] as const;

export type SortOption = (typeof SORT_OPTIONS)[number];

export const DEFAULT_SORT: SortOption = "newest";

/**
 * Pieces the homepage featured strip will show. A cap, not a target — the
 * strip renders whatever the admin has flagged, and nothing at all if that is
 * none. Kept small because a "featured" list long enough to need paging is no
 * longer a selection.
 */
export const FEATURED_LIMIT = 8;

/** Rows the predictive search panel shows before deferring to "See all N". */
export const SUGGESTION_LIMIT = 6;

/** Categories are a hint above the product rows, not a second list to scan. */
export const CATEGORY_SUGGESTION_LIMIT = 2;

/**
 * A single letter matches most of the catalogue, so the panel stays shut until
 * the query is worth a round trip.
 */
export const SEARCH_MIN_CHARS = 2;

/**
 * Shorter than the admin tables' 300ms: this opens a panel in place rather than
 * pushing a URL, so it can afford to feel immediate.
 */
export const SUGGEST_DEBOUNCE_MS = 180;

/**
 * URL search params and Server Action arguments are untrusted at runtime — the
 * TypeScript annotations on both are erased before the request arrives. Every
 * entry point coerces through these rather than casting.
 */
export function toSortOption(value: unknown): SortOption {
  return SORT_OPTIONS.includes(value as SortOption)
    ? (value as SortOption)
    : DEFAULT_SORT;
}

/** Coerces anything to a positive integer page, falling back to the first. */
export function toPageNumber(value: unknown): number {
  const page =
    typeof value === "number"
      ? value
      : Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(page) && page > 0 ? page : 1;
}
