import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * The receipt cookie: proof that whoever is holding this browser is the one
 * who just placed these orders.
 *
 * It exists so /checkout/success can show a full order — including the phone
 * number and address — without either putting those in a URL or making a guest
 * re-enter their phone number thirty seconds after typing it. Signed with
 * BETTER_AUTH_SECRET so it can't be forged into a read of someone else's
 * order, and httpOnly so a script on the page can't lift it.
 */

const COOKIE_NAME = "jtj_receipt";
/** Long enough to survive a refresh and a "show my partner", short enough
 *  that a shared machine doesn't leak an address a day later. */
const MAX_AGE_SECONDS = 60 * 60 * 24;
/** Only the last few placements are worth remembering. */
const MAX_ENTRIES = 5;

export interface ReceiptEntry {
  orderNumber: string;
  /** Bound in so the cookie authorises exactly the orders it was issued for. */
  phoneKey: string;
}

function secret(): string {
  const value = process.env.BETTER_AUTH_SECRET;
  if (!value) {
    throw new Error(
      "BETTER_AUTH_SECRET is required to sign the checkout receipt cookie.",
    );
  }
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function verify(payload: string, signature: string): boolean {
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  // Length must match before timingSafeEqual, which throws on a mismatch.
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

async function readReceipt(): Promise<ReceiptEntry[]> {
  const raw = (await cookies()).get(COOKIE_NAME)?.value;
  if (!raw) return [];

  const separator = raw.lastIndexOf(".");
  if (separator <= 0) return [];

  const payload = raw.slice(0, separator);
  const signature = raw.slice(separator + 1);
  if (!verify(payload, signature)) return [];

  try {
    const decoded: unknown = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );
    if (!Array.isArray(decoded)) return [];

    return decoded.filter(
      (entry): entry is ReceiptEntry =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as ReceiptEntry).orderNumber === "string" &&
        typeof (entry as ReceiptEntry).phoneKey === "string",
    );
  } catch {
    // A signature can only be valid on a payload we wrote, so this means the
    // cookie was truncated in transit rather than tampered with.
    return [];
  }
}

/** Prepends an entry, keeping the most recent placements at the front. */
export async function appendReceipt(entry: ReceiptEntry): Promise<void> {
  const existing = (await readReceipt()).filter(
    (item) => item.orderNumber !== entry.orderNumber,
  );
  const next = [entry, ...existing].slice(0, MAX_ENTRIES);

  const payload = Buffer.from(JSON.stringify(next), "utf8").toString(
    "base64url",
  );

  (await cookies()).set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/**
 * Whether this browser is entitled to read the given order in full.
 *
 * Compared case-insensitively because the caller's order number comes off a
 * URL a customer may have retyped, while the lookups it gates
 * (getOrderByNumber) uppercase before querying. Without this a lowercase
 * ?order= would find the order but fail the entitlement check, and a guest —
 * who has no account to fall back to — would be told their own confirmation
 * doesn't exist.
 */
export async function hasReceiptFor(orderNumber: string): Promise<boolean> {
  const normalised = orderNumber.trim().toUpperCase();
  const entries = await readReceipt();
  return entries.some(
    (entry) => entry.orderNumber.trim().toUpperCase() === normalised,
  );
}
