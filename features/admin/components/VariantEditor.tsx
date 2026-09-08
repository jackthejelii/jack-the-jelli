"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import ProductMediaUploader, {
  type ProductImageValue,
  type ProductMediaUploaderHandle,
} from "@/features/admin/components/ProductMediaUploader";
import { MAX_VARIANTS } from "@/features/admin/lib/product-schema";
import { fieldLabelClassName } from "@/features/admin/lib/product-form";
import type { ProductVariantDTO } from "@/features/admin/lib/types";

/** One colourway as the form posts it — the shape variantsField parses. */
export interface VariantPayload {
  /** The saved subdocument `_id`, absent for a colour just added. */
  id?: string;
  color: string;
  hex: string;
  sku: string;
  stock: number;
  images: ProductImageValue[];
}

/**
 * Mirrors ProductMediaUploaderHandle, because this is what the submit pipeline
 * now talks to instead. useProductSubmit's whole upload-then-roll-back dance is
 * unchanged; it simply has one thing to commit rather than one uploader, and
 * gets the assembled colourways back along with the ids a failure must clean up.
 */
export interface VariantEditorHandle {
  pendingCount(): number;
  restage(publicIds: string[]): void;
  commit(
    onProgress?: (uploaded: number, total: number) => void,
  ): Promise<{ variants: VariantPayload[]; uploadedPublicIds: string[] }>;
}

/** A row being edited. Numbers stay strings until submit — inputs hold text. */
interface VariantRow {
  /** Stable local identity, so React and the uploader refs survive a reorder. */
  key: string;
  id: string;
  color: string;
  hex: string;
  sku: string;
  stock: string;
  /** Only what is already on Cloudinary; new files live inside the uploader. */
  images: ProductImageValue[];
}

const DEFAULT_HEX = "#1c1b1a";

function toRow(variant: ProductVariantDTO): VariantRow {
  return {
    key: crypto.randomUUID(),
    id: variant.id,
    color: variant.color,
    hex: variant.hex || DEFAULT_HEX,
    sku: variant.sku,
    stock: String(variant.stock),
    images: variant.images,
  };
}

function blankRow(): VariantRow {
  return {
    key: crypto.randomUUID(),
    id: "",
    color: "",
    hex: DEFAULT_HEX,
    sku: "",
    stock: "0",
    images: [],
  };
}

/**
 * Seed the editor. A rejected submit echoes the whole colour list back as JSON
 * (PRODUCT_VALUE_FIELDS), and that wins over the saved product — otherwise a
 * validation failure would silently discard every colour the admin had just
 * entered, images included, which is far more work to redo than a mistyped
 * price. A payload that won't parse falls back rather than throwing.
 */
function seedRows(
  initialVariants: ProductVariantDTO[],
  echoed?: string,
): VariantRow[] {
  if (echoed) {
    try {
      const parsed = JSON.parse(echoed) as ProductVariantDTO[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((variant) =>
          toRow({
            id: variant.id ?? "",
            color: variant.color ?? "",
            hex: variant.hex ?? DEFAULT_HEX,
            sku: variant.sku ?? "",
            stock: Number(variant.stock ?? 0),
            images: variant.images ?? [],
          }),
        );
      }
    } catch {
      // Unreadable echo — fall through to the saved product.
    }
  }

  return initialVariants.length > 0 ? initialVariants.map(toRow) : [blankRow()];
}

/**
 * The colour editor: a repeatable row per colourway, each with its own SKU,
 * stock count and set of photographs.
 *
 * This is where the shape of the data model shows up in the UI. A colour is not
 * a label on a product — it is the thing with a SKU, a shelf count and a photo
 * shoot — so the form gives each one a card rather than a field.
 */
export default function VariantEditor({
  initialVariants = [],
  echoedValue,
  error,
  onDirty,
  ref,
}: {
  initialVariants?: ProductVariantDTO[];
  /** The `variants` JSON echoed back by a failed submit, if there was one. */
  echoedValue?: string;
  /** Every variant issue lands on one key — see toFieldErrors. */
  error?: string;
  onDirty?: () => void;
  ref?: React.Ref<VariantEditorHandle>;
}) {
  const [rows, setRows] = useState<VariantRow[]>(() =>
    seedRows(initialVariants, echoedValue),
  );

  // One uploader per row, addressed by the row's stable key.
  const uploadersRef = useRef(new Map<string, ProductMediaUploaderHandle>());

  // commit() runs from an event handler and must not close over a stale render.
  // Synced in an effect rather than during render — same as the uploader's own
  // assetsRef, and writing a ref mid-render is what react-hooks/refs forbids.
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const patchRow = useCallback(
    (key: string, patch: Partial<VariantRow>) => {
      setRows((current) =>
        current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
      );
      onDirty?.();
    },
    [onDirty],
  );

  const addRow = useCallback(() => {
    setRows((current) =>
      current.length >= MAX_VARIANTS ? current : [...current, blankRow()],
    );
    onDirty?.();
  }, [onDirty]);

  const removeRow = useCallback(
    (key: string) => {
      setRows((current) =>
        // Never below one: a product with no colourway cannot be saved, and an
        // empty editor gives the admin nothing to type into.
        current.length <= 1
          ? current
          : current.filter((row) => row.key !== key),
      );
      uploadersRef.current.delete(key);
      onDirty?.();
    },
    [onDirty],
  );

  useImperativeHandle(
    ref,
    () => ({
      pendingCount: () =>
        rowsRef.current.reduce(
          (total, row) =>
            total + (uploadersRef.current.get(row.key)?.pendingCount() ?? 0),
          0,
        ),

      // Broadcast: each uploader keeps only the ids it actually owns, so the
      // ones that match nothing are a no-op.
      restage: (publicIds) => {
        for (const uploader of uploadersRef.current.values()) {
          uploader.restage(publicIds);
        }
      },

      commit: async (onProgress) => {
        const current = rowsRef.current;
        const total = current.reduce(
          (sum, row) =>
            sum + (uploadersRef.current.get(row.key)?.pendingCount() ?? 0),
          0,
        );

        const variants: VariantPayload[] = [];
        const uploadedPublicIds: string[] = [];
        let done = 0;

        // Sequential across colourways for the same reason the uploader is
        // sequential within one: stable ordering, and a failure that stops the
        // rest from uploading needlessly.
        for (const row of current) {
          const uploader = uploadersRef.current.get(row.key);
          const before = done;

          let images = row.images;
          if (uploader) {
            try {
              const result = await uploader.commit((uploaded) =>
                // Offset into the run as a whole, so the toast counts
                // "image 5 of 9" across every colour rather than restarting.
                onProgress?.(before + uploaded, total),
              );
              images = result.images;
              uploadedPublicIds.push(...result.uploadedPublicIds);
              done = before + result.uploadedPublicIds.length;
            } catch (error) {
              // Everything that landed before the failure — across every
              // colourway, not just this one — is the caller's to clean up.
              throw Object.assign(
                error instanceof Error ? error : new Error("Upload failed"),
                {
                  uploadedPublicIds: [
                    ...uploadedPublicIds,
                    ...((error as { uploadedPublicIds?: string[] })
                      .uploadedPublicIds ?? []),
                  ],
                },
              );
            }
          }

          variants.push({
            id: row.id || undefined,
            color: row.color,
            hex: row.hex,
            sku: row.sku,
            stock: Number(row.stock.trim() || "0"),
            images,
          });
        }

        return { variants, uploadedPublicIds };
      },
    }),
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      {/* The no-JS fallback and the failed-submit echo. The JS path overwrites
          this wholesale in useProductSubmit once the uploads have landed, so
          the images here are only the ones already on Cloudinary — exactly what
          the single-uploader form posted before. */}
      <input
        type="hidden"
        name="variants"
        value={JSON.stringify(
          rows.map((row) => ({
            id: row.id || undefined,
            color: row.color,
            hex: row.hex,
            sku: row.sku,
            stock: Number(row.stock.trim() || "0"),
            images: row.images,
          })),
        )}
      />

      {rows.map((row, index) => (
        <div key={row.key} className="border-border border p-5 sm:p-6">
          <div className="border-border mb-6 flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="border-border size-5 shrink-0 border"
                style={{ backgroundColor: row.hex }}
              />
              <h4 className="font-heading text-foreground text-lg">
                {row.color.trim() || `Colour ${index + 1}`}
              </h4>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => removeRow(row.key)}
              disabled={rows.length <= 1}
              className="text-muted-foreground hover:text-destructive rounded-none text-xs tracking-widest uppercase"
            >
              <Trash2 className="size-4" />
              <span className="sr-only sm:not-sr-only">Remove</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Field>
              <FieldLabel
                htmlFor={`variant-color-${row.key}`}
                className={fieldLabelClassName}
              >
                Colour name
              </FieldLabel>
              <Input
                id={`variant-color-${row.key}`}
                value={row.color}
                onChange={(event) =>
                  patchRow(row.key, { color: event.target.value })
                }
                maxLength={40}
                placeholder="e.g. Black"
                className="border-b-border h-12 rounded-none border-t-0 border-r-0 border-b border-l-0"
              />
            </Field>

            <Field>
              <FieldLabel
                htmlFor={`variant-hex-${row.key}`}
                className={fieldLabelClassName}
              >
                Swatch
              </FieldLabel>
              {/* The picker and the hex sit side by side rather than one behind
                  the other: the swatch is a rough stand-in for a photograph, and
                  an exact value pasted from the shoot beats one eyeballed here. */}
              <div className="flex items-center gap-3">
                <input
                  id={`variant-hex-${row.key}`}
                  type="color"
                  value={row.hex}
                  onChange={(event) =>
                    patchRow(row.key, { hex: event.target.value })
                  }
                  aria-label={`Swatch colour for ${row.color.trim() || `colour ${index + 1}`}`}
                  className="border-border size-12 shrink-0 cursor-pointer border bg-transparent p-1"
                />
                <Input
                  value={row.hex}
                  onChange={(event) =>
                    patchRow(row.key, { hex: event.target.value })
                  }
                  maxLength={7}
                  aria-label="Hex value"
                  placeholder="#1c1b1a"
                  className="border-b-border h-12 rounded-none border-t-0 border-r-0 border-b border-l-0 font-mono"
                />
              </div>
            </Field>

            <Field>
              <FieldLabel
                htmlFor={`variant-sku-${row.key}`}
                className={fieldLabelClassName}
              >
                SKU
              </FieldLabel>
              <Input
                id={`variant-sku-${row.key}`}
                value={row.sku}
                onChange={(event) =>
                  patchRow(row.key, { sku: event.target.value })
                }
                maxLength={16}
                placeholder="JTJ-BIF-BLK"
                className="border-b-border h-12 rounded-none border-t-0 border-r-0 border-b border-l-0"
              />
            </Field>

            <Field>
              <FieldLabel
                htmlFor={`variant-stock-${row.key}`}
                className={fieldLabelClassName}
              >
                Stock
              </FieldLabel>
              <Input
                id={`variant-stock-${row.key}`}
                type="number"
                min={0}
                value={row.stock}
                onChange={(event) =>
                  patchRow(row.key, { stock: event.target.value })
                }
                className="border-b-border h-12 rounded-none border-t-0 border-r-0 border-b border-l-0"
              />
            </Field>
          </div>

          <div className="mt-6">
            <ProductMediaUploader
              // No hidden input: this editor posts one `variants` payload for
              // every colour, and a dozen inputs named "images" would be junk.
              hiddenInputName={null}
              compact
              initialImages={row.images}
              onChange={onDirty}
              ref={(handle) => {
                if (handle) uploadersRef.current.set(row.key, handle);
                else uploadersRef.current.delete(row.key);
              }}
            />
          </div>
        </div>
      ))}

      <FieldError>{error}</FieldError>

      <Button
        type="button"
        variant="outline"
        onClick={addRow}
        disabled={rows.length >= MAX_VARIANTS}
        className={cn(
          "w-full rounded-none border-dashed py-6 text-xs tracking-widest uppercase",
        )}
      >
        <Plus className="size-4" />
        {rows.length >= MAX_VARIANTS
          ? `Limit of ${MAX_VARIANTS} colours reached`
          : "Add another colour"}
      </Button>
    </div>
  );
}
