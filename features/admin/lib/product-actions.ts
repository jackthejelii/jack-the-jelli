"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Types } from "mongoose";
import { requireAdmin } from "@/lib/auth-guard";
import { CLOUDINARY_UPLOAD_FOLDER, deleteImage } from "@/lib/cloudinary";
import { connectDB } from "@/lib/db";
import { getDuplicateKeyFields } from "@/lib/mongo-errors";
import { Category, Product } from "@/models";
import {
  type AdminFormState,
  collectValues,
  toFieldErrors,
} from "@/features/admin/lib/form-state";
import {
  createProductSchema,
  OBJECT_ID_PATTERN,
  PRODUCT_VALUE_FIELDS,
  productFeaturedSchema,
  productIdSchema,
  readProductFormData,
  updateProductSchema,
} from "@/features/admin/lib/product-schema";

/** E11000 on a unique index -> the field the admin can actually fix. */
function duplicateKeyErrors(error: unknown): Record<string, string> | null {
  const fields = getDuplicateKeyFields(error);
  if (fields.length === 0) return null;

  const errors: Record<string, string> = {};
  for (const field of fields) {
    if (field === "sku") {
      errors.sku = "That SKU is already in use";
    } else if (field === "slug") {
      // The slug is derived from the name, so surface it on the name input.
      errors.name = "A product with this name already exists";
    } else {
      errors[field] = "That value is already in use";
    }
  }
  return errors;
}

/**
 * Delete the Cloudinary assets a save just detached from a product.
 *
 * Runs only *after* the document is saved: deleting when an image is removed in
 * the UI would destroy the asset even if the admin then abandoned the form,
 * leaving the saved product pointing at a dead URL — strictly worse than an
 * orphan. Never throws for the same reason; the product is already saved, so a
 * failed cleanup must not surface as a failed save.
 */
async function deleteDetachedImages(previous: string[], next: string[]) {
  const kept = new Set(next);
  const detached = previous.filter((publicId) => !kept.has(publicId));
  if (detached.length === 0) return;

  await Promise.allSettled(
    detached.map(async (publicId) => {
      try {
        // Defensive: never pull an asset another product still points at.
        const stillReferenced = await Product.countDocuments({
          "images.publicId": publicId,
        });
        if (stillReferenced > 0) return;

        await deleteImage(publicId);
      } catch (error) {
        console.error(`Could not delete Cloudinary asset ${publicId}`, error);
      }
    }),
  );
}

/**
 * Pre-flight check, run BEFORE any image leaves the browser.
 *
 * Images are uploaded to Cloudinary as part of submitting, so anything that
 * rejects the save afterwards strands them there as orphans. This front-loads
 * every check that doesn't need the images to exist — the shared zod schema
 * plus the two things only the database knows: whether the SKU is taken, and
 * whether the category still exists.
 *
 * Not a security boundary; the real actions re-validate. This exists purely so
 * the common failures happen before the upload rather than after.
 */
export async function validateProductDraft(
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();

  // createProductSchema strips `id`, so this covers the edit form too.
  const parsed = createProductSchema.safeParse(readProductFormData(formData));
  if (!parsed.success) {
    return {
      ok: false,
      errors: toFieldErrors(parsed.error),
      message: "Please correct the highlighted fields.",
    };
  }

  const submittedId = formData.get("id");
  const currentId =
    typeof submittedId === "string" && OBJECT_ID_PATTERN.test(submittedId)
      ? submittedId
      : undefined;

  try {
    await connectDB();

    const skuTaken = await Product.exists({
      sku: parsed.data.sku,
      ...(currentId ? { _id: { $ne: currentId } } : {}),
    });
    if (skuTaken) {
      return {
        ok: false,
        errors: { sku: "That SKU is already in use" },
        message: "Please correct the highlighted fields.",
      };
    }

    // A form left open while the category was deleted elsewhere.
    const categoryExists = await Category.exists({ _id: parsed.data.category });
    if (!categoryExists) {
      return {
        ok: false,
        errors: { category: "That category no longer exists" },
        message: "Please correct the highlighted fields.",
      };
    }
  } catch (error) {
    console.error("validateProductDraft failed", error);
    return {
      ok: false,
      message: "Could not verify this product. Please try again.",
    };
  }

  return { ok: true };
}

/**
 * Delete images that were uploaded for a save that then failed, so a rejected
 * submit leaves nothing behind in Cloudinary.
 *
 * Scoped to the product folder: an admin session shouldn't be able to delete
 * arbitrary assets from the account by passing crafted public ids.
 */
export async function discardUploads(publicIds: string[]): Promise<void> {
  await requireAdmin();

  const scoped = publicIds.filter((publicId) =>
    publicId.startsWith(`${CLOUDINARY_UPLOAD_FOLDER}/`),
  );
  if (scoped.length === 0) return;

  await Promise.allSettled(
    scoped.map(async (publicId) => {
      try {
        await deleteImage(publicId);
      } catch (error) {
        console.error(`Could not discard upload ${publicId}`, error);
      }
    }),
  );
}

export async function createProduct(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();

  const values = collectValues(formData, PRODUCT_VALUE_FIELDS);
  const parsed = createProductSchema.safeParse(readProductFormData(formData));

  if (!parsed.success) {
    return {
      ok: false,
      errors: toFieldErrors(parsed.error),
      values,
      message: "Please correct the highlighted fields.",
    };
  }

  const {
    name,
    sku,
    category,
    price,
    stock,
    description,
    images,
    featured,
    intent,
  } = parsed.data;

  try {
    await connectDB();
    // The slug is derived and de-duplicated by the model's pre("validate") hook.
    await Product.create({
      name,
      sku,
      category: new Types.ObjectId(category),
      price,
      stock,
      description,
      status: intent === "publish" ? "Published" : "Draft",
      featured,
      images,
      thumbnail: images[0]?.url,
    });
  } catch (error) {
    const duplicates = duplicateKeyErrors(error);
    if (duplicates) {
      return {
        ok: false,
        errors: duplicates,
        values,
        message: "Please correct the highlighted fields.",
      };
    }

    console.error("createProduct failed", error);
    return {
      ok: false,
      values,
      message: "Something went wrong while saving this product.",
    };
  }

  revalidatePath("/admin/products");
  // The homepage renders the featured strip, so it goes stale on any change to
  // what is featured, published, named or priced — not just on the flag.
  revalidatePath("/");
  // redirect() throws by design — it must stay outside the try/catch (§6.6).
  redirect("/admin/products");
}

export async function updateProduct(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();

  const values = collectValues(formData, PRODUCT_VALUE_FIELDS);
  const parsed = updateProductSchema.safeParse(readProductFormData(formData));

  if (!parsed.success) {
    return {
      ok: false,
      errors: toFieldErrors(parsed.error),
      values,
      message: "Please correct the highlighted fields.",
    };
  }

  const {
    id,
    name,
    sku,
    category,
    price,
    stock,
    description,
    images,
    featured,
    intent,
  } = parsed.data;

  // Captured before the images are replaced, so the cleanup below knows what
  // was dropped.
  let previousImageIds: string[] = [];

  try {
    await connectDB();
    const product = await Product.findById(id);
    if (!product) {
      return { ok: false, values, message: "That product no longer exists." };
    }

    previousImageIds = product.images.map((image) => image.publicId);

    product.name = name;
    product.sku = sku;
    product.category = new Types.ObjectId(category);
    product.price = price;
    product.stock = stock;
    product.description = description;
    // Same intent switch as create (D4), so this is also how a draft ships.
    product.status = intent === "publish" ? "Published" : "Draft";
    product.featured = featured;
    product.images = images;
    product.thumbnail = images[0]?.url;
    // save() rather than findByIdAndUpdate so the slug hook runs on a rename.
    await product.save();
  } catch (error) {
    const duplicates = duplicateKeyErrors(error);
    if (duplicates) {
      return {
        ok: false,
        errors: duplicates,
        values,
        message: "Please correct the highlighted fields.",
      };
    }

    console.error("updateProduct failed", error);
    return {
      ok: false,
      values,
      message: "Something went wrong while saving this product.",
    };
  }

  // Only reached when the save succeeded — every catch branch above returns.
  await deleteDetachedImages(
    previousImageIds,
    images.map((image) => image.publicId),
  );

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/");
  redirect("/admin/products");
}

/**
 * The Featured column on the inventory table.
 *
 * Deliberately not a partial `updateProduct`: this is one reversible flag, and
 * routing it through the full product schema would mean a piece whose category
 * was since deleted, or whose name now collides, could not be un-featured
 * without first fixing unrelated fields. It writes the one key it owns.
 *
 * The flag is independent of `status` — a Draft can carry it — because the
 * storefront query filters on Published anyway. That way publishing a piece
 * that was already marked puts it straight into the strip, instead of silently
 * dropping the mark while it sat in Draft.
 */
export async function setProductFeatured(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();

  const featured = formData.get("featured");
  const parsed = productFeaturedSchema.safeParse({
    id: formData.get("id"),
    // FormData yields null for a missing key, which `.optional()` would reject
    // as a type error rather than read as "not featured".
    featured: typeof featured === "string" ? featured : undefined,
  });
  if (!parsed.success) {
    return { ok: false, message: "That product no longer exists." };
  }

  try {
    await connectDB();
    const updated = await Product.findByIdAndUpdate(parsed.data.id, {
      featured: parsed.data.featured,
    });
    if (!updated) {
      return { ok: false, message: "That product no longer exists." };
    }
  } catch (error) {
    console.error("setProductFeatured failed", error);
    return {
      ok: false,
      message: "Something went wrong while updating this product.",
    };
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${parsed.data.id}`);
  revalidatePath("/");
  return {
    ok: true,
    message: parsed.data.featured
      ? "Added to the homepage selection."
      : "Removed from the homepage selection.",
  };
}

/**
 * Soft-delete: hides a product from the default admin list and (once built)
 * the storefront, without removing the row. A hard delete would leave any
 * order that references this product's id dangling, so this is the only
 * removal path — nothing here needs an order-count guard, because nothing is
 * actually deleted.
 */
export async function archiveProduct(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();

  const parsed = productIdSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) {
    return { ok: false, message: "That product no longer exists." };
  }

  try {
    await connectDB();
    const archived = await Product.findByIdAndUpdate(parsed.data.id, {
      status: "Archived",
    });
    if (!archived) {
      return { ok: false, message: "That product no longer exists." };
    }
  } catch (error) {
    console.error("archiveProduct failed", error);
    return {
      ok: false,
      message: "Something went wrong while archiving this product.",
    };
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${parsed.data.id}`);
  // A featured product that leaves Published has to leave the homepage too.
  revalidatePath("/");
  return { ok: true, message: "Product archived." };
}

/**
 * Restores an archived product to Draft — not Published. Bringing a product
 * back into view shouldn't also put it live for sale; the admin publishes
 * deliberately, same as the create/edit intent switch.
 */
export async function restoreProduct(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();

  const parsed = productIdSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) {
    return { ok: false, message: "That product no longer exists." };
  }

  try {
    await connectDB();
    const restored = await Product.findByIdAndUpdate(parsed.data.id, {
      status: "Draft",
    });
    if (!restored) {
      return { ok: false, message: "That product no longer exists." };
    }
  } catch (error) {
    console.error("restoreProduct failed", error);
    return {
      ok: false,
      message: "Something went wrong while restoring this product.",
    };
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${parsed.data.id}`);
  // A featured product that leaves Published has to leave the homepage too.
  revalidatePath("/");
  return { ok: true, message: "Product restored to Draft." };
}
