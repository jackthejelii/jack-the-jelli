import FeaturedStrip from "@/features/homepage/components/FeaturedStrip";
import { getFeaturedProducts } from "@/features/products/lib/products";

/**
 * Server half of the homepage selection: the query lives here so the strip
 * stays a presentational client component and no Mongoose reaches the bundle.
 *
 * Renders nothing at all when no product is flagged. An empty strip with a
 * heading over it would advertise a selection the shop hasn't made — better
 * that the page simply ends after the product sections until an admin ticks
 * "Feature this piece" on something.
 *
 * The homepage is cached, so the strip only changes when a product mutation
 * calls `revalidatePath("/")` — every path in features/admin/lib/product-actions.ts
 * that can change what is featured, published, named or priced does.
 */
export default async function FeaturedSection() {
  const products = await getFeaturedProducts();
  if (products.length === 0) return null;

  return <FeaturedStrip products={products} />;
}
