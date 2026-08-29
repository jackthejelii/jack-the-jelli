import AppLink from "@/components/layout/AppLink";
import { ArrowLeft } from "lucide-react";
import { getStockStatus } from "@/features/products/lib/stock";
import AddToCartButton from "@/features/products/components/AddToCartButton";
import ProductGallery from "@/features/products/components/ProductGallery";
import ProductSpecList from "@/features/products/components/ProductSpecList";
import { formatPrice } from "@/features/products/lib/format";
import type { ProductDetail } from "@/features/products/lib/types";

function stockLabel(stock: number) {
  switch (getStockStatus(stock)) {
    case "out-of-stock":
      return "Sold out";
    case "low-stock":
      return `Only ${stock} remaining`;
    case "in-stock":
      return "In stock";
  }
}

export default function ProductDetailView({
  product,
}: {
  product: ProductDetail;
}) {
  // Fall back through the gallery, then the thumbnail, then the placeholder the
  // collection grid already uses — the gallery expects a non-empty list.
  const images = product.images.length
    ? product.images
    : [{ url: product.thumbnail || "/image-placeholder.jpg" }];

  const soldOut = product.stock <= 0;

  return (
    <div className="mx-auto max-w-360 px-5 pt-32 pb-32 md:px-16 md:pt-40">
      <AppLink
        href="/collection"
        className="text-on-surface-variant hover:text-foreground ease-editorial mb-8 inline-flex w-fit items-center gap-2 text-[12px] font-semibold tracking-[0.1em] uppercase transition-colors duration-(--motion-quick)"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        The Collections
      </AppLink>

      <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
        <div className="w-full lg:w-3/5">
          <ProductGallery images={images} alt={product.name} />
        </div>

        <div className="w-full lg:w-2/5">
          <div className="flex flex-col lg:sticky lg:top-32">
            <p className="text-on-surface-variant text-[12px] font-semibold tracking-[0.1em] uppercase">
              {product.category}
            </p>
            <h1 className="text-foreground mt-2 font-serif text-[40px] leading-[1.2] tracking-tight md:text-[56px] md:leading-[1.1]">
              {product.name}
            </h1>
            <p className="text-foreground mt-4 text-[18px] leading-[1.6]">
              {formatPrice(product.price)}
            </p>

            {product.description && (
              <div className="border-outline-variant/20 mt-8 border-t pt-6">
                <p className="text-on-surface-variant text-[16px] leading-[1.6]">
                  {product.description}
                </p>
              </div>
            )}

            <div className="mt-8 flex flex-col gap-4">
              <p className="text-on-surface-variant flex items-center gap-2 text-[12px] font-semibold tracking-[0.1em] uppercase">
                <span
                  aria-hidden="true"
                  className={`size-2 ${soldOut ? "bg-outline-variant" : "bg-foreground"}`}
                />
                {stockLabel(product.stock)}
              </p>
              <AddToCartButton product={product} variant="detail" />
            </div>

            <ProductSpecList sku={product.sku} category={product.category} />
          </div>
        </div>
      </div>
    </div>
  );
}
