import { LEGAL_INFO } from "@/features/legal/lib/legal-info";
import type { ProductDetail } from "@/features/products/lib/types";
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";

/**
 * schema.org JSON-LD, built in one place so the shapes can't drift between the
 * pages that emit them.
 *
 * Untyped on purpose. The obvious alternative is `schema-dts`, and it is a real
 * dependency for a handful of object literals whose only consumer is a crawler
 * — the validator at search.google.com/test/rich-results is the check that
 * actually matters, and no type definition substitutes for running it.
 *
 * Two standing rules for anything added here:
 *
 * 1. **Markup may only state what the page itself states.** Structured data
 *    that disagrees with the visible page is spam, whether or not it was meant
 *    that way, and the penalty is a manual action that takes weeks to lift.
 * 2. **No `aggregateRating` until there are genuine reviews.** Review markup is
 *    the single most-policed thing in this file, and fabricating it costs far
 *    more than the stars are worth.
 */
type Schema = Record<string, unknown>;

/**
 * Stable node ids, so a `BreadcrumbList` on a product page and the
 * `Organization` on the homepage are understood as parts of one site rather
 * than as unrelated fragments repeated across pages. The fragment is arbitrary;
 * what matters is that it never changes.
 */
const ORGANIZATION_ID = absoluteUrl("/#organization");
const WEBSITE_ID = absoluteUrl("/#website");

/** BDT, and whole taka — see models/Product.ts. Never paisa, never "৳". */
const PRICE_CURRENCY = "BDT";

/**
 * The brand itself: what fills a knowledge panel, and what ties the Instagram
 * account to the domain.
 *
 * The contact facts are passed in rather than imported, because they are shop
 * settings now: the owner can change the published address from
 * /admin/settings, and a schema built from a module constant would keep
 * telling search engines the old one. `legalName` stays on LEGAL_INFO — the
 * legal entity is not something an admin form should be able to rewrite.
 */
export function organizationSchema(contact: {
  contactEmail: string;
  contactPhone: string;
  instagram: string;
}): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    legalName: LEGAL_INFO.legalName,
    url: SITE_URL,
    logo: absoluteUrl("/logo.png"),
    image: absoluteUrl("/link-preview.jpg"),
    description:
      "Handmade faux leather wallets and small goods, made in Bangladesh for daily carry.",
    email: contact.contactEmail,
    telephone: contact.contactPhone,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Dhaka",
      addressCountry: "BD",
    },
    // The one profile the footer links. `sameAs` is how a search engine
    // establishes that the account and the domain are the same business.
    sameAs: [`https://instagram.com/${contact.instagram}`],
  };
}

/**
 * The site as a thing, distinct from the business that runs it.
 *
 * The `SearchAction` describes /collection's `q` param. Google retired the
 * sitelinks searchbox in late 2023 and no longer renders it, so this is not
 * here for Google — it is valid, costs three lines, and other consumers of
 * structured data still read it.
 */
export function websiteSchema(): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    inLanguage: "en",
    publisher: { "@id": ORGANIZATION_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/collection?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export interface BreadcrumbStep {
  name: string;
  /** Site-relative, e.g. "/collection". */
  path: string;
}

/**
 * The trail shown under a result in place of the raw URL.
 *
 * The trail passed in must match the navigation the page actually offers —
 * every product page has a "The Collections" link back, which is what makes
 * `/ → The Collections → <piece>` a true statement about the site rather than a
 * hierarchy invented for the markup.
 */
export function breadcrumbSchema(steps: BreadcrumbStep[]): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: steps.map((step, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: step.name,
      item: absoluteUrl(step.path),
    })),
  };
}

/**
 * A product page's `Product` node — the item that earns a price and an
 * "In stock" line inside the search result itself, rather than a blue link.
 *
 * One `Product` with an `Offer` per colourway, not one `Product` per colourway:
 * there is a single URL per piece and a single price across its colours, and
 * the thing that genuinely differs per colour — the SKU and whether it can be
 * bought today — is exactly what an `Offer` carries. Google reads a multi-offer
 * product as a price range, which for identical prices renders as the price.
 *
 * Two recommended properties are deliberately absent, and both will show up as
 * warnings (not errors) in the Rich Results Test:
 *
 * - `priceValidUntil` — there is no expiry on these prices, and inventing a
 *   date twelve months out to silence a warning would be markup that states
 *   something the business has not decided.
 * - `hasMerchantReturnPolicy` / `shippingDetails` — worth adding, but only once
 *   the returns and shipping policies exist as published pages with confirmed
 *   numbers (SEO-CHECKLIST.md D4). Declaring a 7-day window and a delivery
 *   charge in markup before the site states them anywhere a customer can read
 *   is the wrong order to do it in.
 */
export function productSchema(product: ProductDetail): Schema {
  const url = absoluteUrl(`/collection/${product.slug}`);

  // One photograph per colourway, in the order the swatches appear. The whole
  // gallery would be mostly repeats of the same object from angles that add
  // nothing to a thumbnail decision.
  const images = product.variants
    .map((variant) => variant.images[0]?.url)
    .filter((image): image is string => Boolean(image));

  const offers = product.variants.map((variant) => ({
    "@type": "Offer",
    url,
    sku: variant.sku,
    // Named per colour so a price range reads as "which one", not "which shop".
    name: `${product.name} — ${variant.color}`,
    price: product.price,
    priceCurrency: PRICE_CURRENCY,
    itemCondition: "https://schema.org/NewCondition",
    // Derived from real stock, and the same number the page prints. A product
    // whose every colour is gone therefore advertises itself as out of stock
    // rather than quietly claiming availability it doesn't have.
    availability:
      variant.stock > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    seller: { "@id": ORGANIZATION_ID },
  }));

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name,
    url,
    // Falls back to nothing rather than to filler: an invented description is
    // worse in the markup than an absent one.
    ...(product.description ? { description: product.description } : {}),
    ...(images.length ? { image: images } : {}),
    ...(product.material ? { material: product.material } : {}),
    category: product.category,
    brand: { "@type": "Brand", name: SITE_NAME },
    // Only meaningful when there is exactly one colourway; with several, the
    // SKU that identifies the thing lives on each Offer above.
    ...(product.variants.length === 1 && product.variants[0]
      ? { sku: product.variants[0].sku }
      : {}),
    offers,
  };
}
