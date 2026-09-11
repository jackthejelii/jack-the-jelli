import type { Metadata } from "next";
import CollectionGrid from "@/features/products/components/CollectionGrid";
import CollectionHero from "@/features/products/components/CollectionHero";
import { getCategoryFilterOptions } from "@/features/products/lib/categories";
import { toSortOption } from "@/features/products/lib/constants";
import { getPublicProducts } from "@/features/products/lib/products";
import JsonLd from "@/features/seo/components/JsonLd";
import { breadcrumbSchema } from "@/features/seo/lib/structured-data";

// No `dynamic` export: reading `searchParams` already opts this route into
// dynamic rendering, so `force-dynamic` only restated the default.

interface CollectionPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    sort?: string;
  }>;
}

/**
 * A function rather than a constant so it can set a canonical, which is the
 * whole point (SEO-CHECKLIST.md A4).
 *
 * This route takes `q`, `category` and `sort`, so every filter permutation is a
 * distinct crawlable URL serving a subset of the same grid —
 * `?sort=price-asc&category=wallets` and `?category=wallets&sort=price-asc`
 * included, which are the same page twice. Left alone that is the standard
 * storefront duplicate-content bug: crawl budget spent enumerating facets, and
 * ranking signals split across dozens of near-identical URLs.
 *
 * Pointing every filtered view at the bare `/collection` consolidates them.
 * Deliberately *not* combined with `robots: { index: false }` on filtered
 * views: noindex and a canonical on the same page are contradictory
 * instructions — one says "drop this", the other "credit that" — and Google's
 * own guidance is to pick one. The canonical is the one that keeps the links.
 *
 * The filtered views still stay fully crawlable (`follow` is untouched), so a
 * product reachable only from a category filter is still reachable.
 */
export async function generateMetadata({
  searchParams,
}: CollectionPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const search = q?.trim();

  return {
    // Titled by what is on screen. A searched grid is a different page to the
    // shopper who bookmarked it, even though it canonicalises to the same URL.
    title: search ? `“${search}” in The Collections` : "The Collections",
    description:
      "Every piece we make, in one place: the wallets people notice, ask about, and then go looking for themselves.",
    alternates: { canonical: "/collection" },
  };
}

export default async function CollectionPage({
  searchParams,
}: CollectionPageProps) {
  const params = await searchParams;

  const sort = toSortOption(params.sort);
  const q = params.q?.trim() || undefined;
  const category = params.category?.trim() || undefined;

  const [{ products, total, totalPages }, categories] = await Promise.all([
    getPublicProducts({ q, categorySlug: category, sort }),
    getCategoryFilterOptions(),
  ]);

  const query = { q, category, sort };

  return (
    <>
      <JsonLd
        schema={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "The Collections", path: "/collection" },
        ])}
      />
      <CollectionHero />
      {/* Remounts the grid on any filter change, so pages appended by
          "Discover More" don't survive into a different result set. */}
      <CollectionGrid
        key={`${q ?? ""}-${category ?? ""}-${sort}`}
        products={products}
        categories={categories}
        total={total}
        totalPages={totalPages}
        query={query}
      />
    </>
  );
}
