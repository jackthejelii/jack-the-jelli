import { connection } from "next/server";
import NewProductForm from "@/features/admin/components/NewProductForm";
import { getCategoryOptions } from "@/features/admin/lib/categories";

export const metadata = {
  title: "Add New Product",
};

// The category list is admin-managed data (D7) — never bake it into a build.
// Nothing is needed to enforce that any more: with cacheComponents enabled,
// pages are dynamic unless they opt in with `use cache`, and this one never
// should. The old `export const dynamic = "force-dynamic"` is now rejected by
// the compiler, so the rule lives in this comment rather than in code.

export default async function NewProductPage() {
  // Admin data is never baked into a build. These pages read no cookies,
  // headers or searchParams of their own, so without this Next would try to
  // prerender them and fail on the clock read inside Mongoose. connection()
  // is what `export const dynamic = "force-dynamic"` used to say, in the form
  // Cache Components accepts.
  await connection();

  // Zero categories is a normal state: the form's category field manages them
  // inline, so there's no dead end to route around.
  const categories = await getCategoryOptions();

  return <NewProductForm categories={categories} />;
}
