"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CollectionFilters from "@/features/products/components/CollectionFilters";
import DiscoverMoreButton from "@/features/products/components/DiscoverMoreButton";
import ProductCard from "@/features/products/components/ProductCard";
import ProductCardSkeleton from "@/features/products/components/ProductCardSkeleton";
import type { CategoryFilterOption } from "@/features/products/lib/categories";
import {
  PRODUCTS_PER_PAGE,
  type SortOption,
} from "@/features/products/lib/constants";
import { loadMoreProducts } from "@/features/products/lib/product-actions";
import type { Product } from "@/features/products/lib/types";

interface CollectionGridProps {
  products: Product[];
  categories: CategoryFilterOption[];
  total: number;
  totalPages: number;
  query: { q?: string; category?: string; sort: SortOption };
}

export default function CollectionGrid({
  products: initialProducts,
  categories,
  total,
  totalPages,
  query,
}: CollectionGridProps) {
  const [products, setProducts] = useState(initialProducts);
  // The server always renders page 1; later pages are appended from here.
  const [page, setPage] = useState(1);
  const [addedCount, setAddedCount] = useState(0);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Shared by the "Discover More" button and the retry link so a second click
  // while a request is in flight is a no-op rather than firing a duplicate page fetch.
  const isLoadingRef = useRef(false);

  const handleLoadMore = () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoadMoreError(false);

    startTransition(async () => {
      try {
        const result = await loadMoreProducts({
          q: query.q,
          category: query.category,
          sort: query.sort,
          page: page + 1,
        });
        setProducts((prev) => [...prev, ...result.products]);
        setPage(result.page);
        setAddedCount(result.products.length);
      } catch {
        setLoadMoreError(true);
      } finally {
        isLoadingRef.current = false;
      }
    });
  };

  /**
   * Drops params from the URL, which is where every filter on this page lives.
   * Written here rather than reached for from CollectionFilters because the
   * empty state renders in the grid, and threading a callback up through the
   * filter row to come back down would be more wiring than a URLSearchParams.
   */
  const clearParams = (...keys: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of keys) params.delete(key);
    const next = params.toString();
    startTransition(() => router.replace(next ? `?${next}` : "?"));
  };

  // Genuinely nothing published, as opposed to nothing left after filtering —
  // the first has no filter to clear and shouldn't be offered one.
  const isEmptyCatalogue = total === 0 && !query.q && !query.category;

  return (
    // data-collection / data-results pair with the [data-pending] flag
    // CollectionFilters already sets on its own row: while a filter or sort is
    // resolving, the results it is about to replace step back. The rule lives
    // in app/globals.css, so neither this component nor the filters re-render
    // to express it. Nothing is threaded between them but the DOM.
    <section
      className="mx-auto max-w-360 px-5 pb-32 md:px-16"
      data-collection=""
    >
      <CollectionFilters categories={categories} />

      {products.length > 0 ? (
        <div
          className="mt-12 grid grid-cols-1 gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3"
          data-results=""
        >
          {/* Deliberately a mount animation rather than the scroll-driven
              Reveal the homepage uses: this is the catalogue, and cards that
              stayed invisible until an observer hydrated would be the wrong
              trade on the page people come here to browse. Same tokens, so it
              still reads as one system. The delay is capped so a long result
              set never ends in a card waiting two seconds. */}
          {products.map((product, i) => (
            <div
              key={product.id}
              className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both ease-editorial duration-(--motion-reveal)"
              style={{
                animationDelay: `calc(${Math.min(i, 5)} * var(--motion-stagger))`,
              }}
            >
              <ProductCard product={product} priority={i < 3} />
            </div>
          ))}
        </div>
      ) : (
        <div
          role="status"
          className="mt-16 flex flex-col items-center gap-5 text-center"
          data-results=""
        >
          <p className="text-on-surface-variant text-[16px]">
            {isEmptyCatalogue
              ? "No pieces are available yet. Check back soon."
              : "No pieces match your filters."}
          </p>
          {/* A filtered-to-nothing grid used to end in prose telling the
              shopper to clear a filter, without giving them anything to press.
              These are that sentence made operable. */}
          {!isEmptyCatalogue && (
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {query.q && (
                <button
                  type="button"
                  onClick={() => clearParams("q")}
                  className="text-foreground hover:text-on-surface-variant border-b border-current pb-0.5 text-[12px] font-semibold tracking-widest uppercase transition-colors duration-300"
                >
                  Clear search
                </button>
              )}
              {(query.q || query.category) && (
                <button
                  type="button"
                  onClick={() => clearParams("q", "category")}
                  className="text-foreground hover:text-on-surface-variant border-b border-current pb-0.5 text-[12px] font-semibold tracking-widest uppercase transition-colors duration-300"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {isPending && (
        <div
          className="mt-12 grid grid-cols-1 gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3"
          aria-hidden="true"
        >
          {Array.from({ length: PRODUCTS_PER_PAGE }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      )}

      {loadMoreError && (
        <p
          role="alert"
          className="text-on-surface-variant mt-12 text-center text-[14px]"
        >
          Couldn&apos;t load more pieces.{" "}
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isPending}
            className="text-foreground underline underline-offset-2 disabled:pointer-events-none disabled:opacity-60"
          >
            Try again
          </button>
        </p>
      )}

      {products.length > 0 && (
        <DiscoverMoreButton
          onClick={handleLoadMore}
          isPending={isPending}
          hasMore={page < totalPages}
          addedCount={addedCount}
        />
      )}
    </section>
  );
}
