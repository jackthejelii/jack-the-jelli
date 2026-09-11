import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { forwardInboundEmail } from "@/lib/email";

/**
 * Receives mail sent to the domain and hands it to a real inbox.
 *
 * The root `@` MX points at Resend's inbound endpoint, Resend POSTs each
 * received message here, and `forwardInboundEmail` passes it on to
 * `SUPPORT_FORWARD_TO`. That is what makes `support@jackthejelli.com` an
 * address that genuinely receives rather than one that bounces — see
 * docs/EMAIL-SENDER-PLAN.md §2a.
 *
 * ⚠️ The signature check below is not optional. This endpoint causes an email
 * to be sent, so an unauthenticated version is an open relay: anyone who
 * guessed the path could burn the Resend quota and, because the shop's own
 * verified domain is the sender, do it wearing our reputation. `POST` refuses
 * to do anything until the body is proven to have come from Resend.
 */

/** Resend signs webhooks with Svix's scheme: HMAC-SHA256 over `id.timestamp.body`. */
function isSignatureValid(
  rawBody: string,
  id: string,
  timestamp: string,
  headerSignature: string,
  secret: string,
): boolean {
  // `whsec_` prefixes the base64 key; Svix omits it from some dashboards, so
  // tolerate both rather than fail verification over a copy-paste detail.
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest("base64");

  // The header carries a space-separated list of `v1,<sig>` pairs, because a
  // secret being rotated means two valid signatures at once. Any match passes.
  return headerSignature.split(" ").some((entry) => {
    const candidate = entry.split(",")[1];
    if (!candidate) return false;
    const a = Buffer.from(candidate);
    const b = Buffer.from(expected);
    // Length must match before timingSafeEqual, which throws on a mismatch.
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_INBOUND_SIGNING_SECRET;
  if (!secret) {
    // Refuse rather than fall back to trusting the caller: an unconfigured
    // secret must never silently downgrade this into the open relay above.
    console.error("[email:inbound] RESEND_INBOUND_SIGNING_SECRET is not set");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  // Read the body as text, once: the signature covers the exact bytes sent, so
  // re-serialising a parsed object would change them and never verify.
  const rawBody = await request.text();

  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");

  if (!id || !timestamp || !signature) {
    return NextResponse.json({ error: "Unsigned" }, { status: 401 });
  }

  // Rejects replay of a body captured earlier, which would otherwise stay valid
  // forever — the signature alone never expires.
  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) {
    return NextResponse.json({ error: "Stale timestamp" }, { status: 401 });
  }

  if (!isSignatureValid(rawBody, id, timestamp, signature, secret)) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }

  // Metadata only. The webhook carries no body and no headers — the message
  // itself is fetched by `email_id` inside `forwardInboundEmail`.
  let event: {
    type?: string;
    data?: {
      email_id?: string;
      to?: string | string[];
      received_for?: string[];
    };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }

  // Resend sends other event types to the same endpoint if it is configured for
  // them. Anything that is not received mail is acknowledged and dropped —
  // a non-2xx would make Resend retry something we are never going to want.
  if (event.type && event.type !== "email.received") {
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  const data = event.data;
  if (!data?.email_id) {
    return NextResponse.json({ error: "No email_id" }, { status: 400 });
  }

  try {
    await forwardInboundEmail({
      emailId: data.email_id,
      // Which of our addresses it was actually sent to, for the label. Prefer
      // `received_for` over `to`: a message can reach us via Bcc, where `to`
      // names someone else entirely.
      to:
        data.received_for?.[0] ??
        (Array.isArray(data.to) ? data.to[0] : data.to),
    });
  } catch (error) {
    // Logged and 500'd rather than swallowed: Resend retries a failed webhook,
    // and a customer's message is worth retrying. Silently returning 200 here
    // would lose mail with no trace anywhere.
    console.error("[email:inbound] forwarding failed", error);
    return NextResponse.json({ error: "Forwarding failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
