import { connection } from "next/server";
import { notFound } from "next/navigation";
import ProductEditor from "@/features/admin/components/ProductEditor";
import { getCategoryOptions } from "@/features/admin/lib/categories";
import { getProductById } from "@/features/admin/lib/products";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({
  params,
}: EditProductPageProps) {
  // Admin data is never baked into a build. These pages read no cookies,
  // headers or searchParams of their own, so without this Next would try to
  // prerender them and fail on the clock read inside Mongoose. connection()
  // is what `export const dynamic = "force-dynamic"` used to say, in the form
  // Cache Components accepts.
  await connection();

  const { id } = await params;

  const [product, categories] = await Promise.all([
    getProductById(id),
    getCategoryOptions(),
  ]);

  if (!product) notFound();

  return <ProductEditor product={product} categories={categories} />;
}
