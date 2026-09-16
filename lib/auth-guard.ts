import { ObjectId } from "mongodb";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUsersCollection } from "@/lib/users";

/**
 * The single choke point for privileged operations (D6).
 *
 * Server Actions and route handlers are reachable by direct POST from anyone on
 * the internet — rendering a page under /admin protects nothing. Every admin
 * action and admin route handler calls requireAdmin() as its FIRST statement.
 */

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * `intendedPath` exists because proxy.ts only sees the session *cookie*. A
 * revoked or expired session still carries one, so the request sails past the
 * proxy and dies here instead — and without this the user is dropped on /login
 * having silently lost where they were going. Server Components have no way to
 * read their own pathname, so the caller supplies it.
 */
function loginPath(intendedPath?: string) {
  if (!intendedPath) return "/login";
  return `/login?redirect=${encodeURIComponent(intendedPath)}`;
}

export async function requireAuth(intendedPath?: string) {
  const session = await getSession();
  if (!session) redirect(loginPath(intendedPath));
  return session;
}

/**
 * "Is whoever is asking an admin?" — the same check as requireAdmin, answered
 * rather than enforced.
 *
 * It exists for exactly one caller: the maintenance gate on the storefront,
 * which has to let the shop's own people through to a site that is closed to
 * everyone else. A redirect would be wrong there — there is nowhere to send a
 * customer during maintenance, the notice *is* the page.
 *
 * This is not a second security boundary and must never be used as one. It
 * decides what to render, and rendering has never protected anything: every
 * privileged action still calls requireAdmin() as its own first statement.
 *
 * Reading a session makes the caller dynamic, which is why the gate only
 * reaches this once it already knows maintenance mode is on — see the comment
 * in app/(storefront)/layout.tsx.
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  if (!session || !ObjectId.isValid(session.user.id)) return false;

  try {
    const users = await getUsersCollection();
    // Re-read from the database, never trusted from the session token — the
    // same rule requireAdmin follows, for the same reason.
    const user = await users.findOne({ _id: new ObjectId(session.user.id) });
    return user?.role === "admin";
  } catch (error) {
    // A database problem must not accidentally hand someone the bypass.
    console.error("isAdmin check failed", error);
    return false;
  }
}

export async function requireAdmin(intendedPath?: string) {
  const session = await getSession();
  if (!session) redirect(loginPath(intendedPath));

  // new ObjectId() throws BSONError on anything that isn't 24 hex characters,
  // which would surface as a 500 from a guard whose whole job is to answer
  // yes/no. Treat an unparseable id the same as a non-admin.
  if (!ObjectId.isValid(session.user.id)) redirect("/");

  const users = await getUsersCollection();
  // §3.3: role is re-read from the database on every call, never trusted from
  // the session token, so revoking admin takes effect on the next request.
  //
  // Better Auth's MongoDB adapter stores `_id` as a native ObjectId even
  // though `session.user.id` is exposed as a string on the client — querying
  // with the raw string silently matches zero documents.
  const user = await users.findOne({ _id: new ObjectId(session.user.id) });
  if (user?.role !== "admin") redirect("/");
  return user;
}
