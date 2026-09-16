"use server";

import { ObjectId, type ClientSession } from "mongodb";
import { Types } from "mongoose";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guard";
import { connectDB } from "@/lib/db";
import { getAuthDb, getUsersCollection } from "@/lib/users";
import { Cart, Order } from "@/models";
import type { OrderStatus } from "@/features/orders/lib/order-status";
import type { AdminFormState } from "@/features/admin/lib/form-state";
import { ROLE_COPY, USER_ROLES } from "@/features/admin/lib/roles";

// new ObjectId() throws BSONError on anything that isn't 24 hex characters,
// which would surface as a 500 from what is really a validation failure.
const objectIdSchema = z
  .string()
  .trim()
  .refine((value) => ObjectId.isValid(value), "Unknown account");

const roleInputSchema = z.object({
  userId: objectIdSchema,
  role: z.enum(USER_ROLES),
});

const deleteInputSchema = z.object({ userId: objectIdSchema });

/**
 * Grant or revoke admin.
 *
 * The one place `role` is ever written. Better Auth's `additionalFields` entry
 * marks it `input: false` (lib/auth.ts), so sign-up and update-user can't touch
 * it — which makes this action, behind requireAdmin(), the whole surface.
 *
 * No session revocation is needed on a demotion: requireAdmin() re-reads the
 * role from the database on every call (§3.3) rather than trusting the session
 * token, so the change lands on the demoted user's very next request.
 */
export async function updateUserRole(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();

  const parsed = roleInputSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { ok: false, message: "That role change isn't valid." };
  }

  const { userId, role } = parsed.data;

  // Self-demotion is the one change nobody can undo from this screen — it
  // takes effect on the next request, which is the one that redirects them off
  // /admin. It also means the last remaining admin can never be demoted, since
  // they're the only person who can reach this page at all.
  if (userId === String(admin._id)) {
    return {
      ok: false,
      message: "You can't change your own role — ask another admin.",
    };
  }

  let name: string;

  try {
    const users = await getUsersCollection();

    // mongodb v7 returns the document itself, not a { value } wrapper.
    const updated = await users.findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: { role, updatedAt: new Date() } },
      { returnDocument: "after", projection: { name: 1, email: 1 } },
    );

    if (!updated) {
      return { ok: false, message: "That account no longer exists." };
    }

    name = updated.name?.trim() || updated.email;
  } catch (error) {
    console.error("updateUserRole failed", error);
    return {
      ok: false,
      message: "Something went wrong updating this account.",
    };
  }

  revalidatePath("/admin/customers");
  return {
    ok: true,
    message: `${name} is now ${role === "admin" ? "an" : "a"} ${ROLE_COPY[role].toLowerCase()}.`,
  };
}

/**
 * Statuses that block a delete.
 *
 * Deleting the account never touches the order itself — the snapshot survives
 * either way — so this isn't about stock or about losing the record. It's about
 * whether the customer is still *needed*: a Confirmed order is being prepared
 * and a Shipped one is with the courier, and both can still generate a callback
 * that the account has to be reachable for. Once an order is Pending (placed but
 * never confirmed), Delivered, Cancelled or Returned, nothing is in motion and
 * the registered customer is surplus.
 *
 * Draft is the in-flight stock claim — someone checking out right now. Stale
 * ones are swept to Cancelled by the release-drafts sweep, after which the
 * customer becomes deletable.
 *
 * A policy set, not a state-machine fact, so it lives here rather than in
 * features/orders/lib/order-status.ts — same as REVENUE_STATUSES in customers.ts.
 */
const DELETE_BLOCKING_STATUSES = [
  "Draft",
  "Confirmed",
  "Shipped",
] as const satisfies readonly OrderStatus[];

/**
 * Erase a customer, keeping every order they ever placed.
 *
 * Deliberately not exported: a `"use server"` module publishes every exported
 * async function as an HTTP endpoint, and this one takes a bare id and does no
 * authorisation of its own. deleteCustomer below is the only way in.
 *
 * Wrapped in a transaction because it spans six collections across two layers —
 * Mongoose's and the one Better Auth owns — with no single-document guard to
 * fall back on. That's the opposite of placeOrder's reasoning (see the docblock
 * in features/checkout/lib/order-actions.ts): this is a rare admin action, not a
 * hot path, so pinning a connection costs nothing and a half-applied cascade —
 * an account gone but its sessions still valid — would be far worse. Both layers
 * share one MongoClient (lib/users.ts), so one session covers all of it.
 */
async function hardDeleteCustomer(userId: string, email: string) {
  const oid = new ObjectId(userId);
  // Both packages resolve to the same BSON class at runtime — mongoose just
  // pins its own nested copy of the driver, so the two ObjectId types are
  // nominally distinct to TS. Same workaround as features/admin/lib/customers.ts.
  const mongooseOid = new Types.ObjectId(userId);

  const mongooseInstance = await connectDB();
  const db = await getAuthDb();
  const dbSession = await mongooseInstance.startSession();

  try {
    await dbSession.withTransaction(async () => {
      // Same nominal-type split as the ObjectIds above.
      const raw = { session: dbSession as unknown as ClientSession };

      // 1. Orders survive, detached and stamped. customerDeletedAt is the only
      //    thing that distinguishes these from an ordinary guest checkout.
      await Order.updateMany(
        { userId: mongooseOid },
        { $set: { userId: null, customerDeletedAt: new Date() } },
        { session: dbSession },
      );

      // 2. The cart is a draft, not a record — it goes.
      await Cart.deleteOne({ userId: mongooseOid }, { session: dbSession });

      // 3. The account itself.
      await db.collection("user").deleteOne({ _id: oid }, raw);

      // 4-5. Better Auth stores every reference to `user.id` as an ObjectId,
      //      not a string — its adapter runs `new ObjectId()` over any field
      //      whose `references.field === "id"`. Deleting the sessions is what
      //      signs the person out on their very next request.
      await db.collection("session").deleteMany({ userId: oid }, raw);
      await db.collection("account").deleteMany({ userId: oid }, raw);

      // 6. Pending email-verification and password-reset tokens. Reset rows key
      //    the token into `identifier` and park the user id in `value`, so both
      //    halves have to be matched.
      await db
        .collection("verification")
        .deleteMany({ $or: [{ identifier: email }, { value: userId }] }, raw);
    });
  } finally {
    await dbSession.endSession();
  }
}

/**
 * Permanently delete a customer account.
 *
 * There is no soft delete and no restore path — this is the one destructive
 * action in the admin panel. What makes it safe is that an order snapshots its
 * customer's name, phone and full address as literal values at checkout
 * (models/Order.ts), so it stays a complete record for returns and courier
 * disputes long after the account behind it is gone.
 *
 * Rendering the button is not the access control: a Server Action is reachable
 * by direct POST whether or not anything rendered it (D6), which is why
 * requireAdmin() is the first statement here.
 */
export async function deleteCustomer(
  _prevState: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();

  const parsed = deleteInputSchema.safeParse({
    userId: formData.get("userId"),
  });

  if (!parsed.success) {
    return { ok: false, message: "That account isn't valid." };
  }

  const { userId } = parsed.data;

  // Mirrors updateUserRole's self-guard, for a change that's even less
  // recoverable: an admin deleting themselves would take their own access with
  // them, and nobody could put it back from this screen.
  if (userId === String(admin._id)) {
    return {
      ok: false,
      message: "You can't delete your own account — ask another admin.",
    };
  }

  let name: string;

  try {
    const users = await getUsersCollection();
    const user = await users.findOne(
      { _id: new ObjectId(userId) },
      { projection: { name: 1, email: 1 } },
    );

    if (!user) {
      return { ok: false, message: "That account no longer exists." };
    }

    name = user.name?.trim() || user.email;

    // Runs before the transaction opens, and aborts without touching anything.
    const blocking = await Order.countDocuments({
      userId: new Types.ObjectId(userId),
      status: { $in: DELETE_BLOCKING_STATUSES },
    });

    if (blocking > 0) {
      return {
        ok: false,
        message: `${name} has ${blocking} order${blocking === 1 ? "" : "s"} still being fulfilled. Settle ${blocking === 1 ? "it" : "them"} first.`,
      };
    }

    await hardDeleteCustomer(userId, user.email);
  } catch (error) {
    console.error("deleteCustomer failed", error);
    return {
      ok: false,
      message: "Something went wrong deleting this account.",
    };
  }

  revalidatePath("/admin/customers");
  // The orders list and every order detail page now carry the deleted badge.
  revalidatePath("/admin/orders");
  return {
    ok: true,
    message: `${name} has been deleted. Their orders remain on the books.`,
  };
}
