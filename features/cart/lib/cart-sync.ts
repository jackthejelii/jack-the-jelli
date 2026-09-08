"use server";

import { Types } from "mongoose";
import { z } from "zod";
import { getSession } from "@/lib/auth-guard";
import { connectDB } from "@/lib/db";
import { Cart } from "@/models";
import { MAX_CART_LINES } from "@/features/cart/lib/limits";
import { orderLineSchema } from "@/features/checkout/lib/checkout-schema";
import { lineKey, type CartLineInput } from "@/features/cart/lib/types";

/**
 * The saved cart, read and written for signed-in shoppers only.
 *
 * Deliberately `getSession()` and not `requireAuth()`: requireAuth redirects to
 * /login, which is right for a privileged page and wrong for a background sync.
 * A guest calling either of these should get a quiet no-op, not a navigation —
 * checkout is guest-first and must keep working with no session at all.
 *
 * Neither action is an authority on anything. The cart is a draft; every price
 * and stock level is re-read live by revalidateCart and again by placeOrder.
 */

// The exact shape the checkout hidden input sends, reused rather than
// redeclared so the two can't drift. Deduped rather than rejected on a repeat:
// a Server Action is a public endpoint, but this one's job is to store a draft,
// and refusing the whole cart over a duplicated line would be a worse answer
// than folding it. Last write wins, matching how addItem merges.
const cartLinesSchema = z
  .array(orderLineSchema)
  .max(MAX_CART_LINES)
  .transform((lines) => {
    // Keyed by the (product, colour) pair — deduping on the product alone
    // would throw away the second colourway of the same piece.
    const byKey = new Map(lines.map((line) => [lineKey(line), line]));
    return [...byKey.values()].filter(
      (line) =>
        Types.ObjectId.isValid(line.productId) &&
        Types.ObjectId.isValid(line.variantId),
    );
  });

function toDocuments(lines: z.infer<typeof cartLinesSchema>) {
  return lines.map((line) => ({
    productId: new Types.ObjectId(line.productId),
    variantId: new Types.ObjectId(line.variantId),
    qty: line.qty,
  }));
}

function toLines(
  items: {
    productId: Types.ObjectId;
    variantId: Types.ObjectId;
    qty: number;
  }[],
): CartLineInput[] {
  return items.map((item) => ({
    productId: String(item.productId),
    variantId: String(item.variantId),
    qty: item.qty,
  }));
}

/**
 * Better Auth exposes `user.id` as a string while its MongoDB adapter stores a
 * native ObjectId, and `new Types.ObjectId()` throws BSONError on anything that
 * isn't 24 hex characters — which would turn a background sync into a 500.
 * Same guard requireAdmin() applies for the same reason.
 */
async function currentUserObjectId(): Promise<Types.ObjectId | null> {
  const session = await getSession();
  if (!session || !Types.ObjectId.isValid(session.user.id)) return null;
  return new Types.ObjectId(session.user.id);
}

/**
 * Settles which cart wins when a session appears, and returns the authoritative
 * lines for the browser to adopt.
 *
 * `guestItems` must only ever be lines from a cart with no owner — the caller
 * enforces that. Handing over a cart that belongs to a different account is the
 * exact bug this whole change exists to fix.
 *
 * A non-empty guest cart replaces whatever the account had saved: someone who
 * just picked pieces out means those pieces, not a cart they filled last month.
 * An *empty* guest cart must not be treated as a decision — signing in on a
 * fresh browser pulls the saved cart down rather than destroying it.
 */
export async function syncCartOnSignIn(
  guestItems: CartLineInput[],
): Promise<CartLineInput[] | null> {
  const userId = await currentUserObjectId();
  if (!userId) return null;

  const parsed = cartLinesSchema.safeParse(guestItems);
  const incoming = parsed.success ? parsed.data : [];

  await connectDB();

  if (incoming.length > 0) {
    await Cart.updateOne(
      { userId },
      { $set: { items: toDocuments(incoming) } },
      { upsert: true },
    );
    return incoming;
  }

  const saved = await Cart.findOne({ userId }).lean<{
    items: {
      productId: Types.ObjectId;
      variantId: Types.ObjectId;
      qty: number;
    }[];
  } | null>();

  return saved ? toLines(saved.items) : [];
}

/**
 * Mirrors a mutation to the saved cart. Fire-and-forget from the client's point
 * of view: localStorage is what that device renders from either way, so a
 * failed write costs the shopper nothing until they switch devices, and the
 * next mutation retries.
 */
export async function saveCart(items: CartLineInput[]): Promise<void> {
  const userId = await currentUserObjectId();
  if (!userId) return;

  const parsed = cartLinesSchema.safeParse(items);
  // A cart the schema can't read is a bug or an attack, and either way there is
  // no safe repair — overwriting the saved cart with a guess would lose real
  // lines. Leave the stored copy as it was.
  if (!parsed.success) return;

  await connectDB();

  await Cart.updateOne(
    { userId },
    { $set: { items: toDocuments(parsed.data) } },
    { upsert: true },
  );
}
