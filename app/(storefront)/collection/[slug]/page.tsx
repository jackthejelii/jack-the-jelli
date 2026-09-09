import { Suspense } from "react";
import { cacheLife } from "next/cache";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetailView from "@/features/products/components/ProductDetailView";
import RelatedProductsSection from "@/features/products/components/RelatedProductsSection";
import RelatedProductsSkeleton from "@/features/products/components/RelatedProductsSkeleton";
import {
  getPrebuildableProductSlugs,
  getPublicProductBySlug,
} from "@/features/products/lib/products";

/**
 * Registers this segment as prerenderable — `revalidate` alone would leave it
 * fully on-demand — and prebuilds the newest slugs while it is here.
 *
 * This used to return an empty array so the build needed no database. That
 * property was already gone: the homepage prerenders `getFeaturedProducts`.
 * Keeping it here bought nothing and cost the first visitor to every product a
 * cold render. `dynamicParams` stays at its default of `true`, so anything
 * past the limit behaves exactly as it did before, and the query fails soft so
 * an unreachable cluster degrades the build rather than breaking it.
 */
export async function generateStaticParams() {
  const slugs = await getPrebuildableProductSlugs();
  return slugs.map((slug) => ({ slug }));
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
  "use cache";
  /**
   * Product pages are read far more often than they change, so they're cached
   * and refreshed in the background rather than rebuilt on every request.
   *
   * This replaces `export const revalidate = 300`, which cacheComponents
   * rejects. The numbers are spelled out rather than reusing the built-in
   * `minutes` profile because that profile revalidates every 60s — six times
   * the database traffic for no editorial benefit. Five minutes is short
   * enough that the stock line ("Only 3 remaining") can't drift far.
   *
   * `expire` caps how long a page nobody has asked for may still be served;
   * a year matches what this route already reported.
   *
   * When stock starts moving in real time, call `revalidatePath` from the
   * admin product actions rather than shortening this.
   */
  cacheLife({ stale: 300, revalidate: 300, expire: 60 * 60 * 24 * 365 });

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
