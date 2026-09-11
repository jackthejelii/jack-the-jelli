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
import JsonLd from "@/features/seo/components/JsonLd";
import {
  SOCIAL_CARD_HEIGHT,
  SOCIAL_CARD_WIDTH,
  toSocialCardUrl,
} from "@/features/seo/lib/social-card";
import {
  breadcrumbSchema,
  productSchema,
} from "@/features/seo/lib/structured-data";
import { SITE_NAME } from "@/lib/site";

/**
 * Registers this segment as prerenderable — `revalidate` alone would leave it
 * fully on-demand — and prebuilds the newest slugs while it is here.
 *
 * This used to return an empty array so the build needed no database. That
 * property was already gone: the homepage prerenders `getFeaturedProducts`.
 * Keeping it here bought nothing and cost the first visitor to every product a
 * cold render. `dynamicParams` stays at its default of `true`, so anything
 * past the limit behaves exactly as it did before.
 *
 * The helper guarantees at least one entry — Cache Components treats an empty
 * result as a build error, not as "prerender nothing" — so there is no empty
 * case to handle here.
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
    // No canonical and no card: this renders as a 404, and pointing a canonical
    // at a URL that doesn't resolve is worse than pointing at nothing.
    return { title: "Piece not found" };
  }

  const description =
    product.description ??
    `${product.name} from the ${product.category} collection. Built for daily carry, and for the odd second glance.`;

  // The first colourway's first photograph — what the page itself opens on.
  const card = toSocialCardUrl(product.variants[0]?.images[0]?.url);

  return {
    title: product.name,
    description,
    // Relative, resolved against `metadataBase`. Products are reachable from
    // the grid, from search and from the related rail, and a shared link
    // regularly picks up a tracking param on the way into a chat — every one of
    // those is this URL.
    alternates: { canonical: `/collection/${product.slug}` },
    // Present only when there is a card to show. `openGraph` is *replaced*
    // wholesale by the last segment that declares it, never merged — so an
    // `openGraph: {}` on a piece with no usable photograph would not fall back
    // to the root layout's brand card, it would delete it. Omitting the key
    // entirely is what inherits.
    //
    // `siteName` and `type` are restated for the same reason: overriding the
    // image means overriding the whole block. `title` and `description` are
    // still left out deliberately, so Next fills og:title/og:description from
    // the two above rather than from a second copy kept in step by hand.
    ...(card
      ? {
          openGraph: {
            type: "website" as const,
            siteName: SITE_NAME,
            images: [
              {
                url: card,
                width: SOCIAL_CARD_WIDTH,
                height: SOCIAL_CARD_HEIGHT,
                alt: product.name,
              },
            ],
          },
        }
      : {}),
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
      {/* Rendered here rather than inside ProductDetailView, which is a client
          component: this has to be in the prerendered HTML for a crawler that
          runs no JavaScript, and it describes the piece as a whole — a swatch
          click changes which colour is on screen, not which product this is.
          The Offer for every colourway is already in the markup. */}
      <JsonLd schema={productSchema(product)} />
      <JsonLd
        schema={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "The Collections", path: "/collection" },
          // The trail the page actually offers — ProductDetailView opens with a
          // link back to /collection, so this is a description of the site, not
          // a hierarchy invented for the markup.
          { name: product.name, path: `/collection/${product.slug}` },
        ])}
      />
      <ProductDetailView product={product} />
      {/* Streams in after the piece itself — the suggestions never hold up
          first paint. */}
      <Suspense fallback={<RelatedProductsSkeleton />}>
        <RelatedProductsSection productId={product.id} price={product.price} />
      </Suspense>
    </>
  );
}
