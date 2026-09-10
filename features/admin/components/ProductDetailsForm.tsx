import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import CategorySelect from "@/features/admin/components/CategorySelect";
import FeaturedToggle from "@/features/admin/components/FeaturedToggle";
import type { CategoryOption } from "@/features/admin/lib/category-schema";
import type { ProductDTO } from "@/features/admin/lib/types";
import {
  fieldLabelClassName,
  underlineInputClassName,
} from "@/features/admin/lib/product-form";

interface ProductDetailsFormProps {
  product: ProductDTO;
  /** Loaded from the database server-side (D7). */
  categories: CategoryOption[];
  errors?: Record<string, string>;
  /** Raw submitted strings echoed back after a failed save. */
  values?: Record<string, string>;
  onDirty: () => void;
}

/**
 * The fields of the edit page. Deliberately NOT a <form> — ProductEditor owns
 * the form element so the media uploader's hidden `images` input and the
 * Draft/Publish submit buttons all post together.
 */
export default function ProductDetailsForm({
  product,
  categories,
  errors,
  values,
  onDirty,
}: ProductDetailsFormProps) {
  return (
    <div className="flex flex-col gap-12 sm:gap-20 md:gap-32">
      <section>
        <h3 className="border-border font-heading text-foreground mb-8 border-b pb-4 text-2xl">
          Basic Information
        </h3>
        <div className="flex flex-col gap-12">
          <Field data-invalid={Boolean(errors?.name) || undefined}>
            <FieldLabel htmlFor="product-name" className={fieldLabelClassName}>
              Product Name
            </FieldLabel>
            <Input
              id="product-name"
              name="name"
              defaultValue={values?.name ?? product.name}
              aria-invalid={Boolean(errors?.name)}
              className={`${underlineInputClassName} py-3 text-lg`}
            />
            <FieldError>{errors?.name}</FieldError>
          </Field>

          {/* SKU and stock are not here: both belong to a colourway, and the
              colour editor below owns them. Price stays, because it is the one
              commercial figure that is deliberately shared across colours. */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <CategorySelect
              categories={categories}
              defaultValue={values?.category ?? product.categoryId}
              error={errors?.category}
              triggerClassName="border-b-border h-12 rounded-none border-t-0 border-r-0 border-b border-l-0"
              onDirty={onDirty}
            />
            <Field data-invalid={Boolean(errors?.price) || undefined}>
              <FieldLabel htmlFor="price" className={fieldLabelClassName}>
                Price (BDT)
              </FieldLabel>
              <Input
                id="price"
                name="price"
                type="text"
                inputMode="decimal"
                defaultValue={values?.price ?? String(product.price)}
                aria-invalid={Boolean(errors?.price)}
                className={underlineInputClassName}
                pattern="^\d+(\.\d{1,2})?$"
                placeholder="0.00"
              />
              <FieldError>{errors?.price}</FieldError>
            </Field>
          </div>
        </div>
      </section>

      <section>
        <h3 className="border-border font-heading text-foreground mb-8 border-b pb-4 text-2xl">
          Homepage Placement
        </h3>
        <FeaturedToggle
          // `values` only carries a key for `featured` when the box was ticked
          // on the rejected submit, so its absence is a deliberate "unticked"
          // — fall back to the saved product only when nothing was submitted.
          defaultChecked={values ? values.featured === "on" : product.featured}
          onDirty={onDirty}
        />
      </section>

      <section>
        <h3 className="border-border font-heading text-foreground mb-8 border-b pb-4 text-2xl">
          Product Description
        </h3>
        <Field data-invalid={Boolean(errors?.description) || undefined}>
          <Textarea
            id="description"
            name="description"
            defaultValue={values?.description ?? product.description ?? ""}
            aria-invalid={Boolean(errors?.description)}
            placeholder="Describe the product story, materials, care instructions..."
            className="border-b-border min-h-50 resize-y rounded-none border-t-0 border-b border-l-0 text-base"
          />
          <FieldError>{errors?.description}</FieldError>
        </Field>
      </section>

      {/* The two facts a considered buyer compares makers on, and the two the
          storefront could not state before this section existed. Both optional:
          leave either blank and the detail page omits the row rather than
          printing an empty one. */}
      <section>
        <h3 className="border-border font-heading text-foreground mb-8 border-b pb-4 text-2xl">
          Specifications
        </h3>
        <div className="grid gap-8 md:grid-cols-2">
          <Field data-invalid={Boolean(errors?.material) || undefined}>
            <FieldLabel htmlFor="material" className={fieldLabelClassName}>
              Material
            </FieldLabel>
            <Input
              id="material"
              name="material"
              type="text"
              defaultValue={values?.material ?? product.material ?? ""}
              aria-invalid={Boolean(errors?.material)}
              className={underlineInputClassName}
              placeholder="Full-grain calfskin"
            />
            <FieldError>{errors?.material}</FieldError>
          </Field>

          <Field data-invalid={Boolean(errors?.dimensions) || undefined}>
            <FieldLabel htmlFor="dimensions" className={fieldLabelClassName}>
              Dimensions
            </FieldLabel>
            <Input
              id="dimensions"
              name="dimensions"
              type="text"
              defaultValue={values?.dimensions ?? product.dimensions ?? ""}
              aria-invalid={Boolean(errors?.dimensions)}
              className={underlineInputClassName}
              placeholder="11 x 9 cm closed"
            />
            <FieldError>{errors?.dimensions}</FieldError>
          </Field>
        </div>
      </section>
    </div>
  );
}
