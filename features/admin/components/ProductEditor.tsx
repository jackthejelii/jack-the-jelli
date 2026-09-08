"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useRef, useState, useTransition } from "react";
import {
  ArrowLeft,
  Check,
  FileText,
  Loader2,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type { CategoryOption } from "@/features/admin/lib/category-schema";
import type { ProductDTO } from "@/features/admin/lib/types";
import { useDirtyGuard } from "@/features/admin/hooks/useDirtyGuard";
import { useProductSubmit } from "@/features/admin/hooks/useProductSubmit";
import ProductDetailsForm from "@/features/admin/components/ProductDetailsForm";
import VariantEditor, {
  type VariantEditorHandle,
} from "@/features/admin/components/VariantEditor";
import { emptyFormState } from "@/features/admin/lib/form-state";
import {
  archiveProduct,
  restoreProduct,
  updateProduct,
} from "@/features/admin/lib/product-actions";
import { updateProductSchema } from "@/features/admin/lib/product-schema";

interface ProductEditorProps {
  product: ProductDTO;
  categories: CategoryOption[];
}

export default function ProductEditor({
  product,
  categories,
}: ProductEditorProps) {
  const [state, formAction, isPending] = useActionState(
    updateProduct,
    emptyFormState,
  );
  const variantsRef = useRef<VariantEditorHandle>(null);
  const { markDirty, clearDirty } = useDirtyGuard();

  // A successful save redirects server-side, so the guard stands down as the
  // submit starts; any later edit re-marks it via onChange.
  const { handleSubmit, isUploading, errors } = useProductSubmit({
    variantsRef,
    formAction,
    state,
    schema: updateProductSchema,
    onBeforeDispatch: clearDirty,
  });

  const isSubmitBlocked = isPending || isUploading;

  const router = useRouter();
  const isArchived = product.status === "Archived";
  const [isArchivePending, startArchiveTransition] = useTransition();
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  // Dispatched imperatively (not a nested <form>) because this button lives
  // inside the outer product <form> — a nested form would bubble its submit
  // into the parent, same reasoning as CategoryManagerDialog's delete button.
  const handleArchive = () => {
    startArchiveTransition(async () => {
      const body = new FormData();
      body.append("id", product.id);
      const result = await archiveProduct(emptyFormState, body);
      if (result.ok) {
        setArchiveDialogOpen(false);
        router.push("/admin/products");
      }
    });
  };

  const handleRestore = () => {
    startArchiveTransition(async () => {
      const body = new FormData();
      body.append("id", product.id);
      const result = await restoreProduct(emptyFormState, body);
      if (result.ok) router.refresh();
    });
  };

  return (
    <form
      action={formAction}
      onChange={markDirty}
      onSubmit={handleSubmit}
      className="flex min-h-screen flex-col"
    >
      <input type="hidden" name="id" value={product.id} />

      {/* Header */}
      <header className="border-border border-b px-4 py-6 md:px-12 md:py-8">
        <Link
          href="/admin/products"
          className="group text-muted-foreground hover:text-foreground flex items-center gap-2 pb-4 transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span className="text-xs font-semibold tracking-widest uppercase">
            Back to Inventory
          </span>
        </Link>
        <div className="flex flex-col items-center gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="sr-only">Product editing</h2>
            <h1 className="text-2xl font-semibold tracking-widest uppercase sm:text-3xl md:text-4xl">
              {product.name}
            </h1>
            <p className="text-muted-foreground mt-2 text-xs font-semibold tracking-widest uppercase">
              Currently {product.status}
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 md:flex-row">
            <Button
              asChild
              variant="ghost"
              className="rounded-none px-8 py-6 text-sm tracking-widest uppercase"
            >
              <Link href="/admin/products">Cancel</Link>
            </Button>
            {/* Soft-delete only — see product-actions.ts. Archiving hides the
                product from the default admin list; it never removes the row. */}
            {isArchived ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleRestore}
                disabled={isArchivePending}
                className="rounded-none px-8 py-6 text-sm tracking-widest uppercase"
              >
                {isArchivePending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RotateCcw className="size-4" />
                )}
                Restore to Draft
              </Button>
            ) : (
              <Dialog
                open={archiveDialogOpen}
                onOpenChange={setArchiveDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-destructive/40 text-destructive hover:bg-destructive rounded-none px-8 py-6 text-sm tracking-widest uppercase hover:text-white"
                  >
                    <Trash2 className="size-4" />
                    Archive
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-none sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Archive this product?</DialogTitle>
                    <DialogDescription>
                      “{product.name}” will disappear from the default inventory
                      list and the storefront, but nothing is deleted — it can
                      be restored at any time.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-none text-xs tracking-widest uppercase"
                      >
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleArchive}
                      disabled={isArchivePending}
                      className="rounded-none text-xs tracking-widest uppercase"
                    >
                      {isArchivePending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        "Confirm Archive"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            {/* Same intent switch as the create form (D4) — this is how a
                draft gets published, and how a live product gets pulled. */}
            <Button
              type="submit"
              name="intent"
              value="draft"
              variant="outline"
              className="rounded-none px-8 py-6 text-sm tracking-widest uppercase"
              disabled={isSubmitBlocked}
            >
              <FileText className="size-4" />
              {product.status === "Published" ? "Unpublish" : "Save as Draft"}
            </Button>
            <Button
              type="submit"
              name="intent"
              value="publish"
              className="rounded-none px-8 py-6 text-sm tracking-widest uppercase"
              disabled={isSubmitBlocked}
            >
              <Check className="size-4" />
              {isSubmitBlocked ? "Saving…" : "Publish"}
            </Button>
          </div>
        </div>

        {state.message && (
          <p role="alert" className="text-destructive mt-4 text-sm">
            {state.message}
          </p>
        )}
      </header>

      {/* Content. Stacked rather than the old two-column split: photographs
          are no longer one product-level gallery that can sit in a narrow
          sidebar — there is a set per colourway, and the colour editor needs
          the full width to show them. */}
      <main className="bg-surface flex flex-1 flex-col">
        <div className="bg-muted/40 w-full">
          <div className="max-w-2xl px-6 py-12 md:px-16">
            <ProductDetailsForm
              product={product}
              categories={categories}
              errors={errors}
              values={state.values}
              onDirty={markDirty}
            />
          </div>
        </div>

        <div className="w-full px-4 py-12 md:px-16">
          <div className="mb-8">
            <h3 className="font-heading text-foreground text-2xl">
              Colours &amp; Inventory
            </h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Each colourway carries its own SKU, stock count and photographs.
            </p>
          </div>
          {/* Seeded with the saved colourways so a save never wipes them. */}
          <VariantEditor
            ref={variantsRef}
            initialVariants={product.variants}
            echoedValue={state.values?.variants}
            error={errors?.variants}
            onDirty={markDirty}
          />
        </div>
      </main>
    </form>
  );
}
