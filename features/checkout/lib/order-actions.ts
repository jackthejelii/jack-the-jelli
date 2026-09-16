"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { Types } from "mongoose";
import { getSession } from "@/lib/auth-guard";
import { connectDB } from "@/lib/db";
import { getSettings, toDeliveryRates } from "@/lib/settings";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { getDuplicateKeyFields } from "@/lib/mongo-errors";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";
import {
  Order,
  Product,
  type IOrderItem,
  type IProductVariant,
} from "@/models";
// Pure FormData/zod helpers — nothing admin-specific about either, they just
// happen to have been written for the admin actions first.
import { collectValues, toFieldErrors } from "@/features/admin/lib/form-state";
import type { UnavailableLine } from "@/features/cart/lib/types";
import { ORDERS_TAG } from "@/features/orders/lib/cache-tags";
import {
  CHECKOUT_VALUE_FIELDS,
  checkoutSchema,
  readCheckoutFormData,
} from "@/features/checkout/lib/checkout-schema";
import type { CheckoutFormState } from "@/features/checkout/lib/checkout-state";
import {
  getDeliveryFee,
  getDeliveryZone,
  getDivisionForDistrict,
} from "@/features/checkout/lib/delivery";
import { appendReceipt } from "@/features/checkout/lib/receipt";
import {
  generateOrderNumber,
  ORDER_NUMBER_ATTEMPTS,
} from "@/features/orders/lib/order-number";

/** The product fields an order line is snapshotted from. */
type PurchasableProduct = {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  price: number;
  status: string;
  /** SKU, stock and photographs all live per colourway — see models/Product.ts. */
  variants: IProductVariant[];
};

const RETRY_MESSAGE =
  "Something went wrong while placing your order. Nothing has been charged — please try again.";

/**
 * Placement brake. Nothing gates order creation — cash on delivery means no
 * payment step — so an unthrottled script could walk stock to zero, and every
 * order it lands sends a Resend email to an address it chose. The cap is
 * deliberately generous: a real customer submits once (maybe twice after a
 * stock conflict), while carrier-grade NAT can put a whole neighbourhood
 * behind one x-forwarded-for.
 */
const placementLimiter = createRateLimiter({ windowMs: 60_000, max: 8 });

/**
 * Place a cash-on-delivery order.
 *
 * Guest-first: there is no requireAuth() here, because Better Auth requires
 * email verification before sign-in and gating checkout on an account would
 * make it impossible to finish an order in one sitting. That makes this a
 * fully public HTTP endpoint, so every input is treated as hostile and every
 * figure — price, delivery fee, total — is recomputed from the database. The
 * client's cart is read as a list of (productId, qty) and nothing more.
 *
 * Order of operations, and why:
 *   1. parse + normalise
 *   2. load the products, refuse the whole order if any line can't be filled
 *   3. recompute all money server-side
 *   4. claim the idempotencyKey by creating a Draft — before any stock moves,
 *      so a double-submit collides here rather than decrementing twice
 *   5. guarded per-line $inc decrements
 *   6. roll back and cancel the Draft if any line lost its race, or
 *   7. flip the Draft to Pending
 *
 * No MongoDB transaction: each guarded `updateOne` is atomic on its own, and
 * the explicit rollback in step 6 supplies the cross-line atomicity a
 * transaction would have bought — without pinning a connection (which fights
 * the cached global connection in lib/db.ts) or turning a hot product into
 * WriteConflict retry storms.
 */
export async function placeOrder(
  _prevState: CheckoutFormState,
  formData: FormData,
): Promise<CheckoutFormState> {
  const values = collectValues(formData, CHECKOUT_VALUE_FIELDS);

  // After collectValues so a false positive still echoes the address back
  // instead of wiping the form, but before the parse and every database call —
  // a throttled request must cost nothing beyond reading the FormData.
  if (placementLimiter(await clientKey())) {
    return {
      ok: false,
      values,
      message: "Too many attempts. Please wait a minute and try again.",
    };
  }

  // The shop's own settings, read once and used for two things below: whether
  // orders are being taken at all, and what delivery costs.
  //
  // A cached read, so this is not a database round trip per checkout — see
  // getSettings(). It also cannot throw, which is why it is safe to have it
  // this early, ahead of the try/catch: a settings failure falls back to the
  // rates this codebase shipped with rather than refusing the order.
  const settings = await getSettings();

  // Refused server-side, not merely hidden in the UI. /checkout stops
  // rendering the form while the shop is closed, but the form is a public HTTP
  // endpoint: a tab opened before the switch was flipped still holds a live
  // one, and a direct POST never saw the page at all. This is the only check
  // that actually stops an order.
  if (settings.maintenanceMode || settings.ordersPaused) {
    return {
      ok: false,
      values,
      message: settings.maintenanceMode
        ? settings.maintenanceMessage
        : settings.ordersPausedMessage,
    };
  }

  const parsed = checkoutSchema.safeParse(readCheckoutFormData(formData));

  if (!parsed.success) {
    return {
      ok: false,
      errors: toFieldErrors(parsed.error),
      values,
      message: "Please correct the highlighted fields.",
    };
  }

  const {
    fullName,
    phone,
    email,
    district,
    thana,
    street,
    notes,
    items,
    idempotencyKey,
  } = parsed.data;

  // Derived, never taken from the form — the Division select exists only to
  // shorten the district list.
  const division = getDivisionForDistrict(district);
  if (!division) {
    return {
      ok: false,
      errors: { district: "Select your district" },
      values,
      message: "Please correct the highlighted fields.",
    };
  }

  let placedOrderNumber: string | null = null;
  let receiptEmail: string | undefined;
  let summary: {
    items: IOrderItem[];
    subtotal: number;
    deliveryFee: number;
    totalAmount: number;
  } | null = null;

  try {
    await connectDB();

    // Fast path for a double-submit whose first attempt already finished.
    const prior = await Order.findOne({ idempotencyKey })
      .select("orderNumber status")
      .lean<{ orderNumber: string; status: string } | null>();

    if (prior) {
      if (prior.status === "Draft") {
        // A Draft with this key means a placement is mid-flight (or crashed
        // between claiming the key and committing stock). Never start a second.
        return {
          ok: false,
          values,
          message:
            "We're still placing this order. Give it a moment, then refresh this page.",
        };
      }
      if (prior.status === "Cancelled") {
        // Never redirect to /checkout/success for a cancelled order — that
        // announces "Order Confirmed" about an order holding no stock.
        //
        // An attempt that lost a stock race releases its key (see the rollback
        // below), so it never reaches here; this is the other case — an order
        // that really was placed and was cancelled afterwards. It can't be
        // replayed, and its key can't be reused, so the customer is told to
        // touch the cart, which rotates the key and frees them to re-order.
        return {
          ok: false,
          values,
          message:
            "That order was cancelled, so it can't be reopened. Adjust your cart and place it again.",
        };
      }
      placedOrderNumber = prior.orderNumber;
    }

    if (!placedOrderNumber) {
      // Deduped: two colourways of one piece are two lines against one
      // document, and asking Mongo for it twice would be a wasted read.
      const products = await Product.find({
        _id: {
          $in: [...new Set(items.map((line) => line.productId))].map(
            (id) => new Types.ObjectId(id),
          ),
        },
      })
        .select("name slug price status variants")
        .lean<PurchasableProduct[]>();

      const byId = new Map(
        products.map((product) => [String(product._id), product]),
      );

      /** The colourway a line names, or undefined if it no longer exists. */
      const findVariant = (
        product: PurchasableProduct | undefined,
        variantId: string,
      ) =>
        product?.variants?.find((variant) => String(variant._id) === variantId);

      // Checked before anything is written: an order that can't be filled
      // should never create a row at all.
      const unavailable: UnavailableLine[] = [];
      for (const line of items) {
        const product = byId.get(line.productId);
        const variant = findVariant(product, line.variantId);

        // A deleted colourway is treated exactly like an unpublished product:
        // there is nothing to sell, and the cart is told to drop the line.
        if (!product || product.status !== "Published" || !variant) {
          unavailable.push({
            productId: line.productId,
            variantId: line.variantId,
            name: product?.name ?? "One of your pieces",
            color: variant?.color ?? "",
            available: 0,
            requested: line.qty,
            reason: "unpublished",
          });
        } else if (variant.stock <= 0) {
          unavailable.push({
            productId: line.productId,
            variantId: line.variantId,
            name: product.name,
            color: variant.color,
            available: 0,
            requested: line.qty,
            reason: "sold-out",
          });
        } else if (variant.stock < line.qty) {
          unavailable.push({
            productId: line.productId,
            variantId: line.variantId,
            name: product.name,
            color: variant.color,
            available: variant.stock,
            requested: line.qty,
            reason: "insufficient-stock",
          });
        }
      }

      if (unavailable.length > 0) {
        return {
          ok: false,
          values,
          unavailable,
          message:
            "Your cart has changed since you started. Nothing was placed.",
        };
      }

      // Every display field is snapshotted here. Nothing on an order screen
      // ever reads through to the live product again.
      const orderItems: IOrderItem[] = items.map((line) => {
        const product = byId.get(line.productId)!;
        // Non-null: the loop above returned for every line whose product or
        // colourway was missing, so anything reaching here has both.
        const variant = findVariant(product, line.variantId)!;
        return {
          product: product._id,
          variantId: variant._id,
          name: product.name,
          color: variant.color,
          // The variant's SKU and photograph, not the product's — the shelf is
          // picked by colourway and the receipt should show what was bought.
          sku: variant.sku,
          slug: product.slug,
          price: product.price,
          qty: line.qty,
          lineTotal: product.price * line.qty,
          thumbnail: variant.images[0]?.url,
        };
      });

      const subtotal = orderItems.reduce(
        (total, line) => total + line.lineTotal,
        0,
      );
      const deliveryZone = getDeliveryZone(district);
      // Priced from the shop's settings, read server-side at the top of this
      // action — never from anything the client sent. The checkout page quotes
      // the same numbers, but only so the customer can see them; this is the
      // figure that becomes money, and it is computed here from scratch.
      const deliveryFee = getDeliveryFee(
        deliveryZone,
        subtotal,
        toDeliveryRates(settings),
      );
      const totalAmount = subtotal + deliveryFee;

      // Attach the order to the account when there is one, but never require
      // one. A signed-in customer's email is also stored as guestEmail so the
      // receipt and the claim-by-email path behave identically either way.
      const session = await getSession();
      const userId =
        session?.user.id && Types.ObjectId.isValid(session.user.id)
          ? new Types.ObjectId(session.user.id)
          : undefined;
      const contactEmail = email ?? session?.user.email ?? undefined;

      const claimedAt = new Date();
      let draftId: Types.ObjectId | null = null;
      let orderNumber = "";

      // The order number is random, so a collision is possible but rare; the
      // unique index is what actually guarantees it, and this is the retry.
      for (let attempt = 0; attempt < ORDER_NUMBER_ATTEMPTS; attempt += 1) {
        orderNumber = generateOrderNumber(claimedAt);
        try {
          const draft = await Order.create({
            orderNumber,
            idempotencyKey,
            userId,
            guestEmail: contactEmail,
            phoneKey: phone,
            items: orderItems,
            shippingAddress: {
              fullName,
              phone,
              division,
              district,
              thana,
              street,
              notes,
            },
            deliveryZone,
            subtotal,
            deliveryFee,
            totalAmount,
            status: "Draft",
            paymentStatus: "pending",
            statusHistory: [{ status: "Draft", at: claimedAt }],
          });
          draftId = draft._id as Types.ObjectId;
          break;
        } catch (error) {
          const duplicated = getDuplicateKeyFields(error);

          if (duplicated.includes("idempotencyKey")) {
            // Two submits raced past the findOne above. The other one owns it.
            return {
              ok: false,
              values,
              message:
                "We're still placing this order. Give it a moment, then refresh this page.",
            };
          }
          if (duplicated.includes("orderNumber")) continue; // re-roll
          throw error;
        }
      }

      if (!draftId) {
        console.error(
          `placeOrder could not mint a free order number in ${ORDER_NUMBER_ATTEMPTS} attempts`,
        );
        return { ok: false, values, message: RETRY_MESSAGE };
      }

      // Stock is not reserved at add-to-cart, so this is the first and only
      // moment it moves. The filter does the checking: matching the colourway
      // and `stock: {$gte: qty}` in one $elemMatch makes the read-and-write a
      // single atomic operation, which a read-then-check-then-write could never
      // be. `variants.$` writes back to exactly the element that matched, so
      // decrementing the black bifold can never touch the tan one.
      const decremented: IOrderItem[] = [];
      let lost: UnavailableLine | null = null;

      for (const line of orderItems) {
        const result = await Product.updateOne(
          {
            _id: line.product,
            status: "Published",
            variants: {
              $elemMatch: { _id: line.variantId, stock: { $gte: line.qty } },
            },
          },
          { $inc: { "variants.$.stock": -line.qty } },
        );

        if (result.modifiedCount === 1) {
          decremented.push(line);
          continue;
        }

        // Someone else got there first between the pre-check and now. Projected
        // down to the one colourway rather than pulling the whole variants
        // array back just to read a single number off it.
        const current = await Product.findOne(
          { _id: line.product },
          { status: 1, variants: { $elemMatch: { _id: line.variantId } } },
        ).lean<{ status: string; variants?: { stock: number }[] } | null>();
        const available =
          current && current.status === "Published"
            ? Math.max(0, current.variants?.[0]?.stock ?? 0)
            : 0;

        lost = {
          productId: String(line.product),
          variantId: String(line.variantId),
          name: line.name,
          color: line.color,
          available,
          requested: line.qty,
          reason: available === 0 ? "sold-out" : "insufficient-stock",
        };
        break;
      }

      if (lost) {
        // Orders are all-or-nothing — never ship a partial order.
        if (decremented.length > 0) {
          await Product.bulkWrite(
            decremented.map((line) => ({
              updateOne: {
                // Addressed by colourway, mirroring the decrement above —
                // returning the units to the product would put them back on
                // whichever colour happened to sit first in the array.
                filter: { _id: line.product, "variants._id": line.variantId },
                update: { $inc: { "variants.$.stock": line.qty } },
              },
            })),
          );
        }

        const cancelledAt = new Date();
        await Order.updateOne(
          { _id: draftId, status: "Draft" },
          {
            $set: {
              status: "Cancelled",
              cancelledAt,
              // Set even though the rollback above already returned the units:
              // it's what stops a later cancel restoring them a second time.
              stockRestoredAt: cancelledAt,
              // Release the key. This attempt never became an order, so the
              // customer has to be able to retry the very same cart — and
              // their key only rotates when the cart changes. Suffixed with
              // the (unique) order number so the released form stays unique
              // against the index too.
              idempotencyKey: `${idempotencyKey}:void:${orderNumber}`,
            },
            $push: {
              statusHistory: {
                status: "Cancelled",
                at: cancelledAt,
                note: "Insufficient stock at placement",
              },
            },
          },
        );

        return {
          ok: false,
          values,
          unavailable: [lost],
          message:
            "Your cart has changed since you started. Nothing was placed.",
        };
      }

      // Only now is the order real.
      const committedAt = new Date();
      await Order.updateOne(
        { _id: draftId, status: "Draft" },
        {
          $set: {
            status: "Pending",
            stockCommittedAt: committedAt,
            placedAt: committedAt,
          },
          $push: { statusHistory: { status: "Pending", at: committedAt } },
        },
      );

      placedOrderNumber = orderNumber;
      receiptEmail = contactEmail;
      summary = { items: orderItems, subtotal, deliveryFee, totalAmount };
    }
  } catch (error) {
    console.error("placeOrder failed", error);
    return { ok: false, values, message: RETRY_MESSAGE };
  }

  // The receipt cookie is what lets /checkout/success show this order in full
  // without a phone number in the URL.
  await appendReceipt({ orderNumber: placedOrderNumber, phoneKey: phone });

  if (receiptEmail && summary) {
    // Awaited but never allowed to throw: the order is already placed and
    // committed, so a Resend hiccup must not turn into a failed checkout.
    try {
      await sendOrderConfirmationEmail({
        to: receiptEmail,
        orderNumber: placedOrderNumber,
        customerName: fullName,
        items: summary.items.map((line) => ({
          name: line.name,
          color: line.color,
          qty: line.qty,
          lineTotal: line.lineTotal,
        })),
        subtotal: summary.subtotal,
        deliveryFee: summary.deliveryFee,
        totalAmount: summary.totalAmount,
      });
    } catch (error) {
      console.error("Order confirmation email failed", error);
    }
  }

  revalidatePath("/admin/orders");
  revalidateTag(ORDERS_TAG, "max");
  revalidatePath("/collection");
  for (const line of summary?.items ?? []) {
    revalidatePath(`/collection/${line.slug}`);
  }

  // redirect() throws by design — it must stay outside the try/catch (§6.6).
  redirect(`/checkout/success?order=${encodeURIComponent(placedOrderNumber)}`);
}
