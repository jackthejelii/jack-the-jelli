"use client";

import {
  useEffect,
  useId,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RECENT_SEARCHES_KEY,
  RECENT_SEARCHES_LIMIT,
  SEARCH_MIN_CHARS,
  SUGGEST_DEBOUNCE_MS,
} from "@/features/products/lib/constants";
import { formatPrice } from "@/features/products/lib/format";
import { highlightMatch } from "@/features/products/lib/highlight";
import { searchProductSuggestions } from "@/features/products/lib/product-actions";
import type {
  CategorySuggestion,
  ProductSuggestion,
  SuggestionsResult,
} from "@/features/products/lib/types";

/**
 * One keyboard-addressable row in the panel. Flattened across both groups so
 * arrow keys walk a single list regardless of how the rows are grouped visually.
 */
type Row =
  | {
      kind: "category";
      key: string;
      href: string;
      category: CategorySuggestion;
    }
  | { kind: "product"; key: string; href: string; product: ProductSuggestion }
  /** A past search, offered while the box is focused but effectively empty. */
  | { kind: "recent"; key: string; query: string }
  /** The way out of a search that matched nothing. */
  | { kind: "browse"; key: string }
  | { kind: "all"; key: string; total: number };

/** "yellow" / "yellow or green" — the colour words a fruitless query named. */
const listColours = (families: string[]) =>
  new Intl.ListFormat("en", { type: "disjunction" }).format(families);

/**
 * The collection's search box, with a predictive panel underneath.
 *
 * Suggestions are a read that never touches the URL — the address bar still
 * only changes on submit or on picking a row, which is what the storefront
 * wanted in keeping search submit-triggered. Typing is debounced against a
 * Server Action, not pushed through the router.
 *
 * Implements the WAI-ARIA combobox pattern by hand: neither cmdk nor a popover
 * primitive is installed, and one dropdown doesn't earn a dependency.
 */
export default function CollectionSearch({
  onSearch,
}: {
  /** Applies the query to the URL. Owned by CollectionFilters, alongside the
   *  category and sort params. */
  onSearch: (value: string) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listboxId = useId();

  const currentQ = searchParams.get("q") ?? "";
  const [search, setSearch] = useState(currentQ);
  const [isOpen, setIsOpen] = useState(false);
  /** -1 means nothing is active, so Enter submits the raw query. */
  const [activeIndex, setActiveIndex] = useState(-1);

  /**
   * Every query this mount has asked about: the result, or `null` if the
   * request failed. Keying by query does three jobs at once — backspacing to a
   * seen query is instant with no round trip, Server Action replies (which are
   * POSTs and can't be aborted) land in their own slot so an out-of-order one
   * can't overwrite a newer answer, and a failure is remembered rather than
   * retried on every render.
   */
  const [cache, setCache] = useState(
    () => new Map<string, SuggestionsResult | null>(),
  );

  /**
   * Past searches, read from localStorage on first focus rather than during
   * render — reading it in the render path makes the server and client markup
   * disagree. Every access is wrapped: Safari in private mode throws on both
   * read and write rather than returning null.
   */
  const [recent, setRecent] = useState<string[]>([]);

  const loadRecent = () => {
    try {
      const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      setRecent(
        Array.isArray(parsed)
          ? parsed
              .filter((entry): entry is string => typeof entry === "string")
              .slice(0, RECENT_SEARCHES_LIMIT)
          : [],
      );
    } catch {
      setRecent([]);
    }
  };

  const writeRecent = (next: string[]) => {
    setRecent(next);
    try {
      window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
    } catch {
      // A shopper who can't persist history can still search.
    }
  };

  const rememberSearch = (value: string) => {
    const entry = value.trim();
    if (entry.length < SEARCH_MIN_CHARS) return;
    writeRecent(
      [
        entry,
        ...recent.filter(
          (previous) => previous.toLowerCase() !== entry.toLowerCase(),
        ),
      ].slice(0, RECENT_SEARCHES_LIMIT),
    );
  };

  // Re-sync the box when the URL changes from elsewhere (back button, a reset
  // link). Adjusting state during render rather than in an effect — an effect
  // here would be a cascading render.
  const [syncedQ, setSyncedQ] = useState(currentQ);
  if (currentQ !== syncedQ) {
    setSyncedQ(currentQ);
    setSearch(currentQ);
    setIsOpen(false);
    setActiveIndex(-1);
  }

  const query = search.trim();
  // Submitting ANDs the query with whatever category is applied, so the panel
  // has to search inside it too — otherwise "See all N results" would promise
  // matches the grid then filters back out. Part of the cache key for the same
  // reason: the same words mean different results under a different filter.
  const category = searchParams.get("category") ?? "";
  const cacheKey = `${category} ${query}`;

  // Anything that changes the rows invalidates whichever one was highlighted.
  // Same render-phase adjustment as the URL re-sync above, rather than a
  // setState in the fetch effect — that would be a cascading render.
  const [activeKey, setActiveKey] = useState(cacheKey);
  if (activeKey !== cacheKey) {
    setActiveKey(cacheKey);
    setActiveIndex(-1);
  }

  // undefined = never asked; null = asked and the request failed.
  const cached = cache.get(cacheKey);
  const results = cached ?? null;
  // Wanting an answer we don't have yet is the whole definition of loading —
  // no separate flag to keep in step.
  const isLoading = query.length >= SEARCH_MIN_CHARS && !cache.has(cacheKey);

  useEffect(() => {
    if (!isLoading) return;

    const timer = setTimeout(() => {
      searchProductSuggestions({ q: query, category })
        .then((result) =>
          setCache((prev) => new Map(prev).set(cacheKey, result)),
        )
        // A failed suggestion isn't worth an error state: the panel simply
        // doesn't open and the box still submits, which is the path that
        // renders errors properly.
        .catch(() => setCache((prev) => new Map(prev).set(cacheKey, null)));
    }, SUGGEST_DEBOUNCE_MS);

    return () => clearTimeout(timer);
    // `isLoading`, not `cache`: a reply landing for some *other* query leaves
    // this false→false and so can't restart the debounce on the current one.
  }, [query, category, cacheKey, isLoading]);

  const isIdle = query.length < SEARCH_MIN_CHARS;

  const rows = useMemo<Row[]>(() => {
    // Nothing typed yet: the panel offers where the shopper has already been
    // rather than sitting there blank.
    if (isIdle) {
      return recent.map((entry) => ({
        kind: "recent" as const,
        key: `recent-${entry}`,
        query: entry,
      }));
    }

    if (!results || results.q !== query) return [];

    const categoryRows = results.categories.map((category): Row => {
      const params = new URLSearchParams(searchParams.toString());
      // Picking the category replaces the text search rather than stacking on
      // top of it — otherwise the grid would come back filtered by both.
      params.delete("q");
      params.set("category", category.slug);
      return {
        kind: "category",
        key: `category-${category.slug}`,
        href: `?${params.toString()}`,
        category,
      };
    });

    const productRows = results.products.map((product): Row => ({
      kind: "product",
      key: `product-${product.slug}`,
      href: `/collection/${product.slug}`,
      product,
    }));

    return [
      ...categoryRows,
      ...productRows,
      ...(results.total > results.products.length
        ? [{ kind: "all" as const, key: "all", total: results.total }]
        : []),
      // A search that found no pieces ends in a door rather than a full stop.
      // Offered even when a category matched, since the category shortcut
      // narrows where this widens.
      ...(productRows.length
        ? []
        : [{ kind: "browse" as const, key: "browse" }]),
    ];
  }, [results, query, searchParams, isIdle, recent]);

  // The detail route is prerenderable (revalidate = 300), so warming it while
  // the row is merely highlighted makes the eventual push feel instant.
  useEffect(() => {
    const row = rows[activeIndex];
    if (row?.kind === "product") router.prefetch(row.href);
  }, [rows, activeIndex, router]);

  const close = () => {
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const activateRow = (row: Row) => {
    close();
    switch (row.kind) {
      case "all":
        rememberSearch(query);
        onSearch(query);
        break;
      case "recent":
        setSearch(row.query);
        rememberSearch(row.query);
        onSearch(row.query);
        break;
      case "browse":
        // Drops the query rather than the whole filter set — the category
        // select is its own control and clearing it from here would undo a
        // choice the shopper never asked to lose.
        setSearch("");
        onSearch("");
        break;
      default:
        router.push(row.href);
    }
  };

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    close();
    rememberSearch(query);
    onSearch(query);
  };

  const clearSearch = () => {
    setSearch("");
    close();
    onSearch("");
  };

  const forgetSearch = (entry: string) =>
    writeRecent(recent.filter((previous) => previous !== entry));

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      // Closes the panel but keeps the text — Escape shouldn't cost the query.
      close();
      return;
    }
    if (!isOpen || rows.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((index) => (index + 1) % rows.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((index) => (index <= 0 ? rows.length - 1 : index - 1));
    } else if (e.key === "Enter" && rows[activeIndex]) {
      // Only claim Enter when a row is highlighted; otherwise it falls through
      // to the form and runs the ordinary search.
      e.preventDefault();
      activateRow(rows[activeIndex]);
    }
  };

  const showSkeleton = isLoading && !isIdle && rows.length === 0;
  // Distinct from "no rows": a fruitless query still renders the browse row,
  // so the message is what has to be keyed off the product count.
  const showEmpty =
    !isLoading && !isIdle && results?.q === query && !results.products.length;
  // Nothing to show also covers a failed request: the box quietly falls back to
  // plain submit-to-filter rather than hanging an empty frame under it.
  const isPanelOpen = isOpen && (showSkeleton || showEmpty || rows.length > 0);
  const activeId = activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined;

  const rowClasses = (index: number) =>
    `flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-colors duration-150 ${
      index === activeIndex ? "bg-surface-container" : ""
    }`;

  return (
    <div
      className="relative w-full sm:max-w-xs"
      onBlur={(e) => {
        // Focus genuinely leaving the widget, not moving inside it.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          close();
        }
      }}
    >
      <form onSubmit={submitSearch} role="search" className="relative">
        <button
          type="submit"
          aria-label="Search"
          className="absolute top-1/2 left-0 -translate-y-1/2"
        >
          <Search className="text-on-surface-variant h-4 w-4" />
        </button>
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            // Always open now: below the minimum length the panel has recent
            // searches to show, and `isPanelOpen` closes it when it has not.
            setIsOpen(true);
          }}
          onFocus={() => {
            loadRecent();
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search collection..."
          aria-label="Search collection"
          maxLength={100}
          role="combobox"
          aria-expanded={isPanelOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          autoComplete="off"
          className="border-secondary h-auto rounded-none border-0 border-b bg-transparent py-1.5 pr-6 pl-6 text-[16px] shadow-none focus-visible:ring-0"
        />
        {search && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="Clear search"
            className="absolute top-1/2 right-0 -translate-y-1/2"
          >
            <X className="text-on-surface-variant h-4 w-4" />
          </button>
        )}
      </form>

      {isPanelOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Search suggestions"
          aria-busy={isLoading || undefined}
          data-lenis-prevent
          /* max-h: a matched category can pull in a full six rows plus the
             footer, which ran off the bottom of the viewport at the top of the
             page. Scroll inside the panel rather than off the screen. */
          className="bg-background absolute top-full left-0 z-50 mt-px max-h-[min(60vh,28rem)] w-full overflow-y-auto border border-[rgba(138,121,104,0.2)] shadow-[0_8px_30px_rgba(0,0,0,0.06)] sm:w-[24rem]"
        >
          {showSkeleton &&
            [0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                <Skeleton className="size-10 rounded-none" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-2/3 rounded-none" />
                  <Skeleton className="h-3 w-1/4 rounded-none" />
                </div>
              </div>
            ))}

          {showEmpty && (
            <p className="text-on-surface-variant px-3 py-4 text-[14px]">
              {results.colorFamilies.length
                ? // The query was understood, the colour just isn't in stock.
                  // Saying so is the difference between a search that failed
                  // and a search that answered.
                  `No pieces in ${listColours(results.colorFamilies)} right now.`
                : `No pieces match “${query}”.`}
            </p>
          )}

          {rows.some((row) => row.kind === "recent") && (
            <div role="group" aria-label="Recent searches">
              <div className="text-on-surface-variant flex items-center justify-between px-3 pt-3 pb-1 text-[11px] font-semibold tracking-widest uppercase">
                <span>Recent</span>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    writeRecent([]);
                  }}
                  className="hover:text-foreground transition-colors duration-150"
                >
                  Clear
                </button>
              </div>
              {rows.map((row, index) =>
                row.kind !== "recent" ? null : (
                  <div
                    key={row.key}
                    id={`${listboxId}-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      activateRow(row);
                    }}
                    className={rowClasses(index)}
                  >
                    <Clock
                      aria-hidden
                      className="text-on-surface-variant size-3.5 shrink-0"
                    />
                    <span className="text-foreground truncate text-[14px]">
                      {row.query}
                    </span>
                    {/* Not a <button>: it sits inside a role="option", where a
                        nested control is invalid ARIA and unreachable by the
                        arrow keys anyway. Keyboard users drop the entry by
                        searching something else; this is a pointer affordance. */}
                    <span
                      role="presentation"
                      aria-hidden
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        forgetSearch(row.query);
                      }}
                      className="text-on-surface-variant hover:text-foreground ml-auto cursor-pointer p-1 transition-colors duration-150"
                    >
                      <X className="size-3.5" />
                    </span>
                  </div>
                ),
              )}
            </div>
          )}

          {rows.some((row) => row.kind === "category") && (
            <div role="group" aria-label="Categories">
              {rows.map((row, index) =>
                row.kind !== "category" ? null : (
                  <div
                    key={row.key}
                    id={`${listboxId}-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseEnter={() => setActiveIndex(index)}
                    // mousedown, not click: activation has to beat the blur
                    // that would otherwise close the panel first.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      activateRow(row);
                    }}
                    className={rowClasses(index)}
                  >
                    <span className="text-foreground font-serif text-[15px]">
                      {highlightMatch(row.category.name, query)}
                    </span>
                    <span className="text-on-surface-variant ml-auto text-[11px] tracking-widest uppercase">
                      Category
                    </span>
                  </div>
                ),
              )}
            </div>
          )}

          {rows.some((row) => row.kind === "product") && (
            <div
              role="group"
              aria-label="Products"
              className="border-t border-[rgba(138,121,104,0.2)] first:border-t-0"
            >
              {rows.map((row, index) =>
                row.kind !== "product" ? null : (
                  <div
                    key={row.key}
                    id={`${listboxId}-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      activateRow(row);
                    }}
                    className={rowClasses(index)}
                  >
                    <div className="bg-surface-container relative size-10 shrink-0 overflow-hidden">
                      <Image
                        src={row.product.thumbnail || "/image-placeholder.jpg"}
                        alt=""
                        fill
                        loading="lazy"
                        sizes="40px"
                        // contain, matching ProductCard — an off-spec upload
                        // letterboxes rather than being sliced.
                        className="object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-foreground truncate font-serif text-[15px] leading-[1.5]">
                        {highlightMatch(row.product.name, query)}
                      </p>
                      <p className="text-on-surface-variant flex items-center gap-1.5 text-[13px] leading-[1.5]">
                        <span>{formatPrice(row.product.price)}</span>
                        {/* Why this row is here at all. Searching "yellow"
                            and being handed "Flame Bifold — Croc" reads as a
                            broken search until the Citron swatch says
                            otherwise. */}
                        {row.product.matchedColor && (
                          <>
                            <span
                              aria-hidden
                              className="size-2.5 shrink-0 border border-[rgba(138,121,104,0.35)]"
                              style={{
                                background: row.product.matchedColor.hex,
                              }}
                            />
                            <span className="truncate">
                              {row.product.matchedColor.color}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}

          {rows.map((row, index) =>
            row.kind !== "all" ? null : (
              <div
                key={row.key}
                id={`${listboxId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  activateRow(row);
                }}
                className={`text-foreground cursor-pointer border-t border-[rgba(138,121,104,0.2)] px-3 py-3 text-center text-[12px] font-semibold tracking-widest uppercase transition-colors duration-150 ${
                  index === activeIndex ? "bg-surface-container" : ""
                }`}
              >
                See all {row.total} results →
              </div>
            ),
          )}

          {rows.map((row, index) =>
            row.kind !== "browse" ? null : (
              <div
                key={row.key}
                id={`${listboxId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  activateRow(row);
                }}
                className={`text-foreground cursor-pointer border-t border-[rgba(138,121,104,0.2)] px-3 py-3 text-center text-[12px] font-semibold tracking-widest uppercase transition-colors duration-150 ${
                  index === activeIndex ? "bg-surface-container" : ""
                }`}
              >
                Browse all pieces →
              </div>
            ),
          )}
        </div>
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {isPanelOpen && !isIdle && !isLoading && results?.q === query
          ? results.total === 0
            ? results.colorFamilies.length
              ? `No pieces in ${listColours(results.colorFamilies)}. Browse all pieces to start over.`
              : "No results."
            : `${results.total} result${results.total === 1 ? "" : "s"} available.`
          : ""}
      </p>
    </div>
  );
}
