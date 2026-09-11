import type { Metadata } from "next";
import FeaturedSection from "@/features/homepage/components/FeaturedSection";
import HeroSection from "@/features/homepage/components/HeroSection";
import ProductSection from "@/features/homepage/components/ProductSection";
import JsonLd from "@/features/seo/components/JsonLd";
import {
  organizationSchema,
  websiteSchema,
} from "@/features/seo/lib/structured-data";

/**
 * Only a canonical. Title and description are inherited from the root layout,
 * where they are already written for this page — `title.default` and the site
 * description exist to describe the front door.
 *
 * The canonical matters more here than anywhere: the homepage is what campaign
 * links, Instagram bio taps and QR codes all land on, and every one of them
 * arrives with a different query string attached.
 */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <>
      {/* The brand and the site as separate nodes, emitted once on the one page
          that is about the site rather than about a piece. Everything else
          references them by @id — see features/seo/lib/structured-data.ts. */}
      <JsonLd schema={organizationSchema()} />
      <JsonLd schema={websiteSchema()} />
      <HeroSection />
      <div id="collection">
        <ProductSection />
      </div>
      <FeaturedSection />
    </>
  );
}
