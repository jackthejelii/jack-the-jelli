import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetailView from "@/features/products/components/ProductDetailView";
import RelatedProductsSection from "@/features/products/components/RelatedProductsSection";
import RelatedProductsSkeleton from "@/features/products/components/RelatedProductsSkeleton";
import { getPublicProductBySlug } from "@/features/products/lib/products";

/**
 * Product pages are read far more often than they change, so they're cached and
 * refreshed in the background rather than rebuilt on every request —
 * `force-dynamic` ruled that out entirely. Five minutes is short enough that
 * the stock line ("Only 3 remaining") can't drift far.
 *
 * When checkout lands and stock starts moving in real time, call
 * `revalidatePath` from the admin product actions rather than shortening this.
 */
export const revalidate = 300;

/**
 * Returns nothing on purpose. `revalidate` alone leaves a dynamic segment
 * fully on-demand — the route only becomes cacheable once it is registered as
 * prerenderable, which is what this does. With `dynamicParams` left at its
 * default of `true`, each slug is still rendered on first request and then
 * cached, so the build never needs a database connection.
 */
export function generateStaticParams() {
  return [];
}

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  // Deduped with the page body below by React `cache` — one query, not two.
  const product = await getPublicProductBySlug(slug);

  if (!product) {
    return { title: "Piece not found | Jack The Jelli" };
  }

  return {
    title: `${product.name} | Jack The Jelli`,
    description:
      product.description ??
      `${product.name} from the ${product.category} collection. Built for daily carry, and for the odd second glance.`,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getPublicProductBySlug(slug);

  if (!product) notFound();

  return (
    <>
      <ProductDetailView product={product} />
      {/* Streams in after the piece itself — the suggestions never hold up
          first paint. */}
      <Suspense fallback={<RelatedProductsSkeleton />}>
        <RelatedProductsSection productId={product.id} price={product.price} />
      </Suspense>
    </>
  );
}
