import type { Metadata } from "next";
import CollectionGrid from "@/features/products/components/CollectionGrid";
import CollectionHero from "@/features/products/components/CollectionHero";
import { getCategoryFilterOptions } from "@/features/products/lib/categories";
import { toSortOption } from "@/features/products/lib/constants";
import { getPublicProducts } from "@/features/products/lib/products";

// No `dynamic` export: reading `searchParams` already opts this route into
// dynamic rendering, so `force-dynamic` only restated the default.

export const metadata: Metadata = {
  title: "The Collections | Jack The Jelli",
  description:
    "Every piece we make, in one place: the wallets people notice, ask about, and then go looking for themselves.",
};

interface CollectionPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    sort?: string;
  }>;
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
