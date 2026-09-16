import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Image from "next/image";
import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import ArchiveProductButton from "@/features/admin/components/ArchiveProductButton";
import FeaturedRowToggle from "@/features/admin/components/FeaturedRowToggle";
import ProductFilters from "@/features/admin/components/ProductFilters";
import ProductPagination from "@/features/admin/components/ProductPagination";
import StockIndicator from "@/features/admin/components/StockIndicator";
import { getProducts } from "@/features/admin/lib/products";
import type { StockStatus } from "@/features/products/lib/stock";
import { totalStock } from "@/features/products/lib/variants";
import { getSettings } from "@/lib/settings";

const STOCK_FILTERS: StockStatus[] = ["in-stock", "low-stock", "out-of-stock"];

interface AdminInventoryProps {
  searchParams: Promise<{
    q?: string;
    stock?: string;
    status?: string;
    page?: string;
  }>;
}

// TODO: Add a loading state for when the products are being fetched.
// TODO: Make the table scrollable.

export default async function AdminInventory({
  searchParams,
}: AdminInventoryProps) {
  const params = await searchParams;

  // Anything unrecognised is dropped rather than passed to Mongo.
  const stock = STOCK_FILTERS.find((value) => value === params.stock);
  const status =
    params.status === "Draft" ||
    params.status === "Published" ||
    params.status === "Archived"
      ? params.status
      : undefined;
  const page = Number.parseInt(params.page ?? "1", 10);

  // The same threshold getProducts filters by, so the badge on a row and the
  // filter that selected it can never disagree. Cached, so it is not a second
  // database round trip.
  const { lowStockThreshold } = await getSettings();

  const {
    products,
    total,
    page: currentPage,
    totalPages,
  } = await getProducts({
    q: params.q,
    stock,
    status,
    page: Number.isFinite(page) ? page : 1,
  });

  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex flex-col gap-3">
          <h1 className="font-heading text-3xl tracking-widest">
            Inventory Catalog
          </h1>
        </div>
        <Button
          asChild
          variant="default"
          className="rounded-none px-8 py-6 text-sm tracking-widest uppercase"
        >
          <Link href="/admin/products/new">
            <Plus className="size-4" />
            Add Item
          </Link>
        </Button>
      </header>

      <ProductFilters />

      <div className="border-border bg-card flex-1 overflow-hidden border transition-shadow duration-500 hover:shadow-[0px_12px_32px_rgba(26,26,26,0.04)]">
        <Table className="min-w-220">
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock Status</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Featured</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-base">
            {products.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-muted-foreground py-16 text-center text-sm"
                >
                  {total === 0 && !params.q && !stock && !status
                    ? "No products yet. Use “Add Item” to create the first one."
                    : "No products match these filters."}
                </TableCell>
              </TableRow>
            )}

            {products.map((product) => (
              <TableRow key={product.id} className="hover:bg-muted">
                <TableCell className="py-8">
                  <div className="flex items-center gap-4">
                    <div className="bg-accent relative size-16 shrink-0 overflow-hidden rounded-none">
                      <Image
                        // The first colourway's first photograph — there is no
                        // product-level image any more.
                        src={
                          product.variants[0]?.images[0]?.url ||
                          "/image-placeholder.jpg"
                        }
                        alt={product.name}
                        fill
                        sizes="4rem"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="font-heading text-foreground text-base">
                        {product.name}
                      </span>
                      {product.variants.length > 1 && (
                        <span className="flex items-center gap-1">
                          {product.variants.map((colorway) => (
                            <span
                              key={colorway.id}
                              title={`${colorway.color} — ${colorway.stock} in stock`}
                              className="border-border size-3 shrink-0 border"
                              style={{ backgroundColor: colorway.hex }}
                            />
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-8">
                  {/* One row per product, so a multi-colour piece shows its
                      first SKU and says how many more there are rather than
                      pretending it has only one. */}
                  <span className="text-foreground font-mono text-sm tracking-wide">
                    {product.variants[0]?.sku ?? "—"}
                  </span>
                  {product.variants.length > 1 && (
                    <span className="text-muted-foreground mt-1 block text-xs tracking-widest uppercase">
                      +{product.variants.length - 1} more
                    </span>
                  )}
                </TableCell>
                <TableCell className="py-8">
                  <span className="text-foreground text-sm">
                    {product.categoryName}
                  </span>
                </TableCell>
                <TableCell className="py-8">
                  <span className="text-foreground text-sm">
                    ৳{" "}
                    {product.price.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </TableCell>
                <TableCell className="py-8">
                  {/* Summed across colourways — a piece is out of stock only
                      when every colour is. The per-colour counts sit in the
                      swatch tooltips beside the name, and in the editor. */}
                  <StockIndicator
                    count={totalStock(product.variants)}
                    threshold={lowStockThreshold}
                  />
                </TableCell>
                <TableCell className="py-8">
                  <span
                    className={
                      product.status === "Published"
                        ? "text-foreground text-xs font-semibold tracking-widest uppercase"
                        : product.status === "Archived"
                          ? "text-muted-foreground/60 border-border border border-dashed px-2 py-1 text-xs font-semibold tracking-widest uppercase line-through"
                          : "text-muted-foreground border-border border px-2 py-1 text-xs font-semibold tracking-widest uppercase"
                    }
                  >
                    {product.status}
                  </span>
                </TableCell>
                <TableCell className="py-8">
                  <FeaturedRowToggle
                    productId={product.id}
                    productName={product.name}
                    featured={product.featured}
                  />
                </TableCell>
                <TableCell className="py-8">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${product.name}`}
                      className="text-muted-foreground hover:text-foreground rounded-none"
                    >
                      <Link href={`/admin/products/${product.id}`}>
                        <Pencil className="size-4" />
                      </Link>
                    </Button>
                    <ArchiveProductButton
                      productId={product.id}
                      productName={product.name}
                      status={product.status}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ProductPagination
        page={currentPage}
        totalPages={totalPages}
        total={total}
        params={{ q: params.q, stock: params.stock, status: params.status }}
      />
    </div>
  );
}
