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

/**
 * Featured pieces needed before the strip loops and drifts on its own.
 *
 * embla's `loop` needs enough slides to fill the viewport *and* the clones it
 * positions on either side; below that it disables looping itself and logs a
 * warning. The widest breakpoint shows four cards, so six is the point where
 * the loop has something to work with and the drift stops looking like a row
 * of three sliding back and forth.
 *
 * Under it the strip stays exactly as it is now — arrows and drag, no
 * movement. That means an admin never has to know this number exists; they
 * flag pieces, and the strip starts moving once there are enough of them.
 */
export const FEATURED_DRIFT_MIN = 6;

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
 * Words one query may carry before the rest are ignored.
 *
 * Each token becomes its own `$or` branch inside an `$and`, so an uncapped
 * query lets a hand-crafted request build an arbitrarily large filter out of a
 * 100-character string. Six is well past any real search of a wallet
 * catalogue — "black croc bifold wallet" is four.
 */
export const SEARCH_MAX_TOKENS = 6;

/**
 * The query split into the words search will actually match on.
 *
 * Lives here, beside the other Mongoose-free constants, because three places
 * need to agree on it: the filter builder, the panel's match-reason lookup,
 * and the highlighter that bolds the hit inside a row. If the highlighter
 * tokenised differently it would bold text the query never matched.
 *
 * A plural "s" is stripped because searching the stem is strictly more
 * permissive — "wallet" is a substring of "wallets" but not the reverse — so
 * "wallets" stops coming back empty while "wallet" returns the catalogue.
 * Guarded on length and on a preceding "s" so "dress" doesn't become "dres".
 */
export function searchTokens(query: string): string[] {
  return (
    query
      // NFKC folds styled Unicode back to plain letters — Mathematical Bold out
      // of a caption generator, fullwidth forms, ligatures — so a shopper who
      // pastes a stylised product name searches for the real word instead of
      // codepoints nothing in the catalogue contains.
      .normalize("NFKC")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, SEARCH_MAX_TOKENS)
      .map((token) =>
        token.length >= 4 && /[^s]s$/i.test(token) ? token.slice(0, -1) : token,
      )
  );
}

/** Past searches offered when the box is focused but effectively empty. */
export const RECENT_SEARCHES_LIMIT = 5;

/**
 * Namespaced because an Artifact-style origin is shared with nothing, but the
 * storefront's own localStorage already holds the Zustand cart — an unprefixed
 * "recent-searches" is the kind of key a future feature collides with.
 */
export const RECENT_SEARCHES_KEY = "jtj:recent-searches";

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

/**
 * How many product pages are prerendered at build time (newest first).
 * Everything past this still renders on first request and is cached from then
 * on, so this trades build time for the cold-render cost of the long tail.
 */
export const PRERENDER_LIMIT = 24;

/**
 * Cache tag for the homepage featured strip. It exists because the strip is a
 * `use cache` component on an otherwise fully static page: without a tag to
 * invalidate, flagging a piece as featured in the admin would not show up on
 * the front page until the cache aged out on its own.
 */
export const FEATURED_PRODUCTS_TAG = "featured-products";

/**
 * Products `app/sitemap.ts` will list. A guard rail, not a target: the protocol
 * caps a single sitemap at 50,000 URLs, and a catalogue anywhere near this
 * number needs splitting via `generateSitemaps` rather than a bigger constant.
 */
export const SITEMAP_LIMIT = 5000;

/**
 * Cache tag for "which products are published, and when did each last change" —
 * the only question `app/sitemap.ts` asks.
 *
 * Separate from FEATURED_PRODUCTS_TAG because the two answer to different
 * events. The featured strip cares about a flag; the sitemap cares about
 * publication, and about the `updatedAt` it reports as `lastModified`. They are
 * invalidated from the same places today, but a tag named for the strip would
 * be the wrong thing to reach for the day the sitemap grows a second reader.
 */
export const CATALOGUE_TAG = "published-catalogue";
