import type { MetadataRoute } from "next";
import { getSitemapProducts } from "@/features/products/lib/products";
import { absoluteUrl } from "@/lib/site";

/**
 * Served at /sitemap.xml, and named by `app/robots.ts`.
 *
 * Lists only what a stranger arriving from a search result can actually use: no
 * checkout, no account, no order history, nothing behind a session. Those are
 * disallowed in robots.txt for the same reason.
 *
 * `priority` and `changeFrequency` are included because they cost nothing, not
 * because they carry weight — Google has said for years that it ignores both.
 * What it does read is `lastModified`, which is why the product entries carry a
 * real `updatedAt` rather than `new Date()`: a sitemap that claims every page
 * changed at the moment it was generated is a sitemap whose dates get ignored
 * too.
 *
 * No explicit staleness config here. The one query behind it is cached for a
 * day and tagged (see getSitemapProducts), so the admin publishing a piece is
 * what refreshes this, not the clock.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getSitemapProducts();

  // The date the catalogue itself last moved — the two pages that list products
  // are exactly as fresh as the newest product on them. `getSitemapProducts`
  // sorts by `updatedAt` descending, so the first entry is that date.
  const catalogueUpdatedAt = products[0]?.updatedAt;

  return [
    {
      url: absoluteUrl("/"),
      lastModified: catalogueUpdatedAt,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/collection"),
      lastModified: catalogueUpdatedAt,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...products.map(({ slug, updatedAt }) => ({
      url: absoluteUrl(`/collection/${slug}`),
      lastModified: updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    // Public and worth indexing, but never the page someone should land on
    // first — hence the lower priority. /track earns its place despite being a
    // bare form: "jack the jelli track order" is a real thing people type, and
    // the alternative is they type it and land on a competitor.
    {
      url: absoluteUrl("/track"),
      changeFrequency: "yearly" as const,
      priority: 0.5,
    },
    {
      url: absoluteUrl("/contact"),
      changeFrequency: "yearly" as const,
      priority: 0.5,
    },
    {
      url: absoluteUrl("/privacy"),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    {
      url: absoluteUrl("/terms"),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
  ];
}
