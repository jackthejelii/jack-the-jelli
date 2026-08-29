"use client";

import Link from "next/link";
import { useActionState, useCallback, useRef, useState } from "react";
import { ArrowLeft, Check, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDirtyGuard } from "@/features/admin/hooks/useDirtyGuard";
import { useProductSubmit } from "@/features/admin/hooks/useProductSubmit";
import CategorySelect from "@/features/admin/components/CategorySelect";
import FeaturedToggle from "@/features/admin/components/FeaturedToggle";
import ProductFormSection from "@/features/admin/components/ProductFormSection";
import ProductMediaUploader, {
  type ProductMediaUploaderHandle,
} from "@/features/admin/components/ProductMediaUploader";
import type { CategoryOption } from "@/features/admin/lib/category-schema";
import { emptyFormState } from "@/features/admin/lib/form-state";
import { createProduct } from "@/features/admin/lib/product-actions";
import { createProductSchema } from "@/features/admin/lib/product-schema";
import {
  boxedInputClassName,
  fieldLabelClassName,
} from "@/features/admin/lib/product-form";

interface NewProductFormProps {
  /** Loaded from the database server-side — categories are data, not an enum (D7). */
  categories: CategoryOption[];
}

export default function NewProductForm({ categories }: NewProductFormProps) {
  // React 19 returns isPending as the third element — no useFormStatus needed.
  const [state, formAction, isPending] = useActionState(
    createProduct,
    emptyFormState,
  );
  const [mediaKey, setMediaKey] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const uploaderRef = useRef<ProductMediaUploaderHandle>(null);
  const { markDirty, clearDirty } = useDirtyGuard();

  // A successful create redirects server-side, so the beforeunload guard has to
  // stand down as the submit starts. Any later edit re-marks it via onChange.
  const { handleSubmit, isUploading, errors } = useProductSubmit({
    uploaderRef,
    formAction,
    state,
    schema: createProductSchema,
    onBeforeDispatch: clearDirty,
  });

  const isSubmitBlocked = isPending || isUploading;

  const handleDiscard = useCallback(() => {
    formRef.current?.reset();
    // Remount the uploader to drop every staged preview.
    setMediaKey((key) => key + 1);
    clearDirty();
  }, [clearDirty]);

  return (
    <form
      ref={formRef}
      action={formAction}
      onChange={markDirty}
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-3xl flex-col gap-16"
    >
      {/* Header */}
      <header className="border-border border-b pb-8">
        <Link
          href="/admin/products"
          className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span className="text-xs font-semibold tracking-widest uppercase">
            Back to Inventory
          </span>
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="font-heading text-3xl tracking-widest">
            Add New Product
          </h1>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="rounded-none px-8 py-6 text-sm tracking-widest uppercase"
              onClick={handleDiscard}
              disabled={isSubmitBlocked}
            >
              <X className="size-4" />
              Discard
            </Button>
            <Button
              type="submit"
              name="intent"
              value="draft"
              variant="outline"
              className="rounded-none px-8 py-6 text-sm tracking-widest uppercase"
              disabled={isSubmitBlocked}
            >
              <FileText className="size-4" />
              Save as Draft
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
          <p
            role="alert"
            className="text-destructive mt-4 text-sm"
            aria-live="polite"
          >
            {state.message}
          </p>
        )}
      </header>

      <div className="flex flex-col gap-20 pb-16 md:gap-24">
        <ProductFormSection
          title="Basic Information"
          description="Essential identifying details for the new addition to the curated collection."
        >
          <div className="flex flex-col gap-8">
            <Field data-invalid={Boolean(errors?.name) || undefined}>
              <FieldLabel
                htmlFor="product-name"
                className={fieldLabelClassName}
              >
                Product Name
              </FieldLabel>
              <Input
                id="product-name"
                name="name"
                defaultValue={state.values?.name}
                aria-invalid={Boolean(errors?.name)}
                placeholder="e.g. Hand-Burnished Leather Satchel"
                className={`${boxedInputClassName} text-lg`}
              />
              <FieldError>{errors?.name}</FieldError>
            </Field>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <Field data-invalid={Boolean(errors?.sku) || undefined}>
                <FieldLabel htmlFor="sku" className={fieldLabelClassName}>
                  SKU
                </FieldLabel>
                <Input
                  id="sku"
                  name="sku"
                  maxLength={16}
                  defaultValue={state.values?.sku}
                  aria-invalid={Boolean(errors?.sku)}
                  placeholder="JTJ-LHT-001"
                  className={boxedInputClassName}
                />
                <FieldError>{errors?.sku}</FieldError>
              </Field>
              <CategorySelect
                categories={categories}
                defaultValue={state.values?.category}
                error={errors?.category}
                triggerClassName={boxedInputClassName}
                onDirty={markDirty}
              />
            </div>

            <Field
              className="md:w-1/2 md:pr-4"
              data-invalid={Boolean(errors?.price) || undefined}
            >
              <FieldLabel htmlFor="price" className={fieldLabelClassName}>
                Price (BDT)
              </FieldLabel>
              <div className="relative flex items-center">
                <span className="text-muted-foreground pointer-events-none absolute left-5 text-base">
                  ৳
                </span>
                <Input
                  id="price"
                  name="price"
                  type="text"
                  inputMode="decimal"
                  pattern="^\d+(\.\d{1,2})?$"
                  defaultValue={state.values?.price}
                  aria-invalid={Boolean(errors?.price)}
                  placeholder="0.00"
                  className={`${boxedInputClassName} pl-10`}
                />
              </div>
              <FieldError>{errors?.price}</FieldError>
            </Field>
          </div>
        </ProductFormSection>

        <ProductFormSection
          title="Product Media"
          description="High-fidelity imagery capturing the texture and craftsmanship of the item."
        >
          <ProductMediaUploader
            key={mediaKey}
            ref={uploaderRef}
            onChange={markDirty}
          />
          <FieldError>{errors?.images}</FieldError>
        </ProductFormSection>

        <ProductFormSection
          title="Inventory Logic"
          description="Stock management and scarcity controls for luxury distribution."
        >
          <Field
            className="md:w-1/2 md:pr-4"
            data-invalid={Boolean(errors?.stock) || undefined}
          >
            <FieldLabel htmlFor="stock" className={fieldLabelClassName}>
              Current Stock
            </FieldLabel>
            <Input
              id="stock"
              name="stock"
              type="number"
              min={0}
              defaultValue={state.values?.stock}
              aria-invalid={Boolean(errors?.stock)}
              placeholder="25"
              className={boxedInputClassName}
            />
            <FieldError>{errors?.stock}</FieldError>
          </Field>
        </ProductFormSection>

        <ProductFormSection
          title="Homepage Placement"
          description="Whether this piece is part of the selection shown on the front page."
        >
          <FeaturedToggle
            defaultChecked={state.values?.featured === "on"}
            onDirty={markDirty}
          />
        </ProductFormSection>

        <ProductFormSection
          title="Product Description"
          description="The narrative of the piece. Use this space to describe heritage, materials, and artisan details."
        >
          <Field data-invalid={Boolean(errors?.description) || undefined}>
            <Textarea
              id="description"
              name="description"
              defaultValue={state.values?.description}
              aria-invalid={Boolean(errors?.description)}
              placeholder="Begin the product narrative..."
              className="border-border bg-muted/50 focus-visible:bg-card focus-visible:border-foreground min-h-60 resize-y rounded-none border p-5 text-base leading-relaxed transition-colors"
            />
            <FieldError>{errors?.description}</FieldError>
          </Field>
        </ProductFormSection>
      </div>
    </form>
  );
}
