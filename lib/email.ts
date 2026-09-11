import { Resend } from "resend";
import { formatPrice } from "@/features/products/lib/format";

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailAction {
  label: string;
  url: string;
}

/**
 * These templates are the one place in the app that builds HTML by hand — React
 * escapes everything else — so interpolated text has to be escaped here or not
 * at all. Customer names come straight off the checkout form and product names
 * are typed in the admin, so an ordinary `Rahman & Sons` or `Belt & Wallet`
 * would otherwise emit invalid markup.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;") // first, or it double-escapes the entities below
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * `escapeHtml` guards the body; this guards the *headers*, which is a different
 * problem with a worse failure. A display name or subject is interpolated into
 * an RFC-5322 header, where a bare CR or LF ends the header and lets anything
 * after it be read as a new one — a Bcc, a second Reply-To. The contact form
 * puts a stranger's typed name into a `From` display name, so that input has to
 * be flattened before it ever reaches Resend.
 *
 * Quotes and angle brackets go too: they are the address-vs-display-name
 * delimiters, and a name containing them would produce a header that parses as
 * something other than what was meant. Length is capped because an
 * absurdly long name is either a mistake or an attempt.
 */
function sanitizeHeaderText(value: string, maxLength = 78): string {
  return value
    .replace(/[\r\n]+/g, " ")
    .replace(/["<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/**
 * The one email template. Originally single-CTA shaped for the auth links;
 * `summaryHtml` was added so an order confirmation can carry an itemised block
 * without a second template drifting away from this one's styling.
 *
 * Every parameter is escaped except `summaryHtml`, which is the sole trusted
 * HTML slot — it may only ever be fed markup this module built itself.
 */
function renderEmailHtml(
  heading: string,
  bodyText: string,
  action?: EmailAction,
  summaryHtml?: string,
) {
  const url = action ? escapeHtml(action.url) : "";

  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; color: #1a1a1a;">
      <h1 style="font-size: 20px; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 24px;">Jack The Jelli</h1>
      <h2 style="font-size: 18px; font-weight: normal; margin-bottom: 16px;">${escapeHtml(heading)}</h2>
      <p style="font-size: 15px; line-height: 1.6; color: #444; margin-bottom: 24px;">${escapeHtml(bodyText)}</p>
      ${summaryHtml ?? ""}
      ${
        action
          ? `<a href="${url}" style="display: inline-block; background: #1a1a1a; color: #f9f8f6; text-decoration: none; padding: 14px 28px; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase;">${escapeHtml(action.label)}</a>
      <p style="font-size: 12px; color: #8a7968; margin-top: 32px;">If the button doesn't work, copy this link: ${url}</p>`
          : ""
      }
    </div>
  `;
}

interface SendEmailParams {
  to: string;
  subject: string;
  heading: string;
  bodyText: string;
  action?: EmailAction;
  summaryHtml?: string;
  /** What the dev-mode log line should show in place of a link. */
  devDetail?: string;
  /**
   * Overrides `EMAIL_FROM` for this one send. Every address on the verified
   * domain can send, so `orders@` costs nothing beyond passing it here — but
   * an address that looks monitored should be one that receives, so only use
   * this for addresses the shop's mailbox actually collects.
   */
  from?: string;
  /**
   * Where a Reply lands. Defaults to `SUPPORT_EMAIL`, which is what stops
   * `noreply@` being a dead end on every transactional email. The contact form
   * overrides it with the customer's own address so the shop can answer them
   * from the inbox.
   */
  replyTo?: string;
}

/**
 * Transport switch: onboarding@resend.dev can only deliver to the Resend
 * account holder's own address (DEV_INBOX) — a 403 otherwise. Outside
 * production, anything sent to another address is logged instead of network
 * calls, so the rest of the app's test accounts can still "register" without
 * an error. See AUTH_IMPLEMENTATION_PLAN.md §6 Phase B.
 */
async function sendEmail({
  to,
  subject,
  heading,
  bodyText,
  action,
  summaryHtml,
  devDetail,
  from,
  replyTo,
}: SendEmailParams) {
  const isProduction = process.env.NODE_ENV === "production";
  const isDevInbox = to === process.env.DEV_INBOX;

  if (!isProduction && !isDevInbox) {
    console.log(
      `[email:dev] ${heading.toLowerCase()} for ${to} → ${devDetail ?? action?.url ?? "(no link)"}`,
    );
    return;
  }

  const sender = from ?? process.env.EMAIL_FROM;
  if (!process.env.RESEND_API_KEY || !sender) {
    throw new Error(
      "Email is not configured — set RESEND_API_KEY and EMAIL_FROM.",
    );
  }

  // The Resend SDK resolves with { data, error } rather than rejecting, so an
  // unchecked `await` reports success for a 403 (sending domain not verified,
  // or onboarding@resend.dev aimed at anyone but the account holder), a bad
  // API key, or a quota trip. Better Auth then tells the user to check an
  // inbox nothing was ever sent to, with nothing logged anywhere.
  //
  // `replyTo` defaults from env rather than per-call so the three existing
  // senders inherit a working Reply without being touched. `SUPPORT_EMAIL` is
  // now a mailbox that genuinely receives — the root `@` MX points at Resend's
  // inbound endpoint and `app/api/email/inbound` forwards from there — so a
  // customer replying to their own receipt reaches a person. Before that
  // existed the domain was send-only and every Reply vanished.
  const { error } = await resend.emails.send({
    from: sender,
    to,
    replyTo: replyTo ?? process.env.SUPPORT_EMAIL,
    subject,
    html: renderEmailHtml(heading, bodyText, action, summaryHtml),
  });

  if (error) {
    console.error(
      `[email] Resend rejected "${subject}" to ${to}: ${error.name} — ${error.message}`,
    );
    // Thrown, not swallowed: on the resend endpoints Better Auth awaits this
    // directly and turns it into a client-visible error. On sign-up it runs as
    // a background task, so this only reaches the server log — which is still
    // the difference between a diagnosable failure and a silent one.
    throw new Error(`Could not send email: ${error.message}`);
  }
}

export async function sendVerificationEmail(to: string, url: string) {
  return sendEmail({
    to,
    subject: "Verify your email — Jack The Jelli",
    heading: "Verify your email",
    bodyText:
      "Confirm your email address to finish creating your Jack The Jelli account.",
    action: { label: "Verify Email", url },
  });
}

export async function sendPasswordResetEmail(to: string, url: string) {
  return sendEmail({
    to,
    subject: "Reset your password — Jack The Jelli",
    heading: "Reset your password",
    bodyText:
      "We received a request to reset your Jack The Jelli password. If this wasn't you, ignore this email.",
    action: { label: "Reset Password", url },
  });
}

export interface OrderConfirmationParams {
  to: string;
  orderNumber: string;
  customerName: string;
  items: { name: string; color: string; qty: number; lineTotal: number }[];
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
}

/**
 * Builds the `summaryHtml` slot. Because that slot is interpolated raw, this is
 * the one function that has to escape its own inputs — prices are numbers, but
 * the order number and every product name are text.
 */
function renderOrderSummary({
  orderNumber,
  items,
  subtotal,
  deliveryFee,
  totalAmount,
}: Omit<OrderConfirmationParams, "to" | "customerName">) {
  const rows = items
    .map(
      (line) => `
      <tr>
        <td style="padding: 8px 0; font-size: 14px; color: #1a1a1a;">${escapeHtml(line.name)}${line.color ? ` <span style="color: #8a7968;">(${escapeHtml(line.color)})</span>` : ""} <span style="color: #8a7968;">× ${line.qty}</span></td>
        <td style="padding: 8px 0; font-size: 14px; text-align: right; color: #1a1a1a;">${formatPrice(line.lineTotal)}</td>
      </tr>`,
    )
    .join("");

  return `
    <div style="border-top: 1px solid #e8e5df; border-bottom: 1px solid #e8e5df; padding: 20px 0; margin-bottom: 28px;">
      <p style="font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: #8a7968; margin: 0 0 12px;">Order ${escapeHtml(orderNumber)}</p>
      <table style="width: 100%; border-collapse: collapse;">
        ${rows}
        <tr><td colspan="2" style="border-top: 1px solid #e8e5df; padding-top: 12px;"></td></tr>
        <tr>
          <td style="padding: 4px 0; font-size: 14px; color: #444;">Subtotal</td>
          <td style="padding: 4px 0; font-size: 14px; text-align: right; color: #444;">${formatPrice(subtotal)}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; font-size: 14px; color: #444;">Delivery</td>
          <td style="padding: 4px 0; font-size: 14px; text-align: right; color: #444;">${deliveryFee === 0 ? "Free" : formatPrice(deliveryFee)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0 0; font-size: 15px; color: #1a1a1a;">Total due on delivery</td>
          <td style="padding: 8px 0 0; font-size: 15px; text-align: right; color: #1a1a1a;">${formatPrice(totalAmount)}</td>
        </tr>
      </table>
    </div>
  `;
}

/**
 * Sent only when the customer gave an email — it's optional at checkout, and
 * an order is perfectly valid without one. Never allowed to fail a placed
 * order; the caller swallows anything thrown here.
 */
export async function sendOrderConfirmationEmail({
  to,
  orderNumber,
  customerName,
  items,
  subtotal,
  deliveryFee,
  totalAmount,
}: OrderConfirmationParams) {
  const baseUrl = process.env.BETTER_AUTH_URL ?? "";

  return sendEmail({
    to,
    // The one email a customer is likely to reply to, so it is the one that
    // gets its own address. Falls back to EMAIL_FROM when unset, which keeps
    // this working on an environment that has not added the variable yet.
    from: process.env.EMAIL_FROM_ORDERS,
    subject: `Order ${orderNumber} received — Jack The Jelli`,
    heading: "We have your order",
    bodyText: `Thank you, ${customerName}. We'll call you shortly on the number you gave to confirm this order before it's prepared. Payment is cash on delivery.`,
    summaryHtml: renderOrderSummary({
      orderNumber,
      items,
      subtotal,
      deliveryFee,
      totalAmount,
    }),
    action: baseUrl
      ? {
          label: "Track this order",
          url: `${baseUrl}/track?order=${encodeURIComponent(orderNumber)}`,
        }
      : undefined,
    devDetail: `order ${orderNumber}, ${formatPrice(totalAmount)} COD`,
  });
}

/**
 * The bare address out of `EMAIL_FROM`, which may be either a plain address or
 * RFC-5322 `Display Name <address>`. Needed because the contact notification
 * rebuilds the `From` with the customer's name in front of the same mailbox.
 */
function senderAddress(): string | undefined {
  const raw = process.env.EMAIL_FROM?.trim();
  if (!raw) return undefined;
  return raw.match(/<([^>]+)>/)?.[1]?.trim() ?? raw;
}

export interface ContactNotificationParams {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

/**
 * Builds the `summaryHtml` slot for a contact notification.
 *
 * The message goes here rather than in `bodyText` for one reason: `bodyText`
 * renders as a single paragraph, so a customer who wrote three paragraphs would
 * arrive as one run-on block. Every value is escaped here, exactly as
 * `renderOrderSummary` has to, because this slot is interpolated raw.
 */
function renderContactSummary({
  name,
  email,
  phone,
  message,
}: ContactNotificationParams) {
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding: 4px 16px 4px 0; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: #8a7968; white-space: nowrap; vertical-align: top;">${escapeHtml(label)}</td>
      <td style="padding: 4px 0; font-size: 14px; color: #1a1a1a;">${escapeHtml(value)}</td>
    </tr>`;

  // Escape first, then turn the surviving newlines into breaks. The other order
  // would escape the tags this just wrote.
  const body = escapeHtml(message).replace(/\r?\n/g, "<br />");

  return `
    <div style="border-top: 1px solid #e8e5df; border-bottom: 1px solid #e8e5df; padding: 20px 0; margin-bottom: 28px;">
      <table style="width: 100%; border-collapse: collapse;">
        ${row("Name", name)}
        ${row("Email", email)}
        ${phone ? row("Phone", phone) : ""}
      </table>
      <p style="margin: 20px 0 0; font-size: 15px; line-height: 1.6; color: #1a1a1a;">${body}</p>
    </div>
  `;
}

/**
 * Sent to the shop when someone writes from `/contact`.
 *
 * The addressing is the whole point. `From` stays on the verified domain (never
 * the customer's address, which would fail SPF and DKIM and land in spam) but
 * carries their name so the inbox is scannable; `Reply-To` is their real
 * address, so hitting Reply in the mailbox starts an ordinary thread with them
 * and the website is out of it from there.
 *
 * The customer's name reaches a header here, so it goes through
 * `sanitizeHeaderText` rather than `escapeHtml`.
 */
export async function sendContactNotificationEmail({
  name,
  email,
  phone,
  message,
}: ContactNotificationParams) {
  const inbox = process.env.SUPPORT_EMAIL;
  if (!inbox) {
    throw new Error("Contact email is not configured — set SUPPORT_EMAIL.");
  }

  const displayName = sanitizeHeaderText(name) || "Someone";
  const address = senderAddress();

  return sendEmail({
    to: inbox,
    from: address
      ? `${displayName} via Jack The Jelli <${address}>`
      : undefined,
    replyTo: email,
    subject: `New message from ${sanitizeHeaderText(name, 60)} — Jack The Jelli`,
    heading: "New message from the contact form",
    bodyText: `Reply to this email to answer ${displayName} directly.`,
    summaryHtml: renderContactSummary({ name, email, phone, message }),
    devDetail: `contact message from ${email}`,
  });
}

/**
 * The domain's own MX now points at Resend's inbound endpoint, so mail to
 * `support@jackthejelli.com` lands in Resend rather than bouncing. Resend has
 * no mailbox UI worth living in, so this hands each message on to a real inbox
 * the owner already reads — `SUPPORT_FORWARD_TO`.
 *
 * `from` is our own verified sender, never the stranger who wrote in:
 * re-sending as them would fail SPF and DKIM for their domain and teach every
 * receiver that we forge addresses. Their address goes in `Reply-To` instead,
 * so hitting Reply in the forwarded copy answers the customer directly — the
 * same arrangement `sendContactNotificationEmail` already uses.
 */
export async function forwardInboundEmail({
  from,
  to,
  subject,
  text,
  html,
}: {
  from: string;
  to?: string;
  subject?: string;
  text?: string;
  html?: string;
}) {
  const destination = process.env.SUPPORT_FORWARD_TO;
  if (!destination) {
    throw new Error(
      "Inbound forwarding is not configured — set SUPPORT_FORWARD_TO.",
    );
  }

  // A destination on our own domain would arrive back at Resend's inbound
  // endpoint and be forwarded again, forever, at one Resend quota unit per lap.
  // Cheap to check, unbounded to get wrong.
  const ownDomain = senderAddress()?.split("@")[1]?.toLowerCase();
  if (ownDomain && destination.toLowerCase().endsWith(`@${ownDomain}`)) {
    throw new Error(
      `SUPPORT_FORWARD_TO must be an address off ${ownDomain} — forwarding to the same domain loops.`,
    );
  }

  const sender = senderAddress();
  const replyAddress = from.match(/<([^>]+)>/)?.[1]?.trim() ?? from.trim();

  return sendEmail({
    to: destination,
    from: sender
      ? `${sanitizeHeaderText(replyAddress, 60)} via Jack The Jelli <${sender}>`
      : undefined,
    replyTo: replyAddress,
    subject: subject
      ? sanitizeHeaderText(subject, 120)
      : "(no subject) — forwarded from the shop inbox",
    heading: `Mail to ${sanitizeHeaderText(to ?? "the shop", 60)}`,
    bodyText: `From ${replyAddress}. Reply to this email to answer them directly.`,
    // The only caller-supplied HTML this module ever renders. An inbound
    // message is a stranger's markup, so it is NOT passed through to
    // `summaryHtml`, which is the trusted slot — the plain-text part is escaped
    // and wrapped instead. A forwarded copy that loses styling is a fair price
    // for not rendering an attacker's HTML in the owner's mail client.
    summaryHtml: renderForwardedBody(text, html),
    devDetail: `inbound mail from ${replyAddress}`,
  });
}

/**
 * Renders the forwarded message body, preferring the plain-text part.
 *
 * When a sender provides only HTML, the tags are stripped rather than trusted:
 * see the note in `forwardInboundEmail` about whose markup this is.
 */
function renderForwardedBody(text?: string, html?: string): string {
  const source =
    text?.trim() ||
    html
      ?.replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim() ||
    "(this message had no readable body)";

  return `<div style="white-space:pre-wrap;font-size:14px;line-height:1.6;color:#111;">${escapeHtml(
    source,
  )}</div>`;
}
