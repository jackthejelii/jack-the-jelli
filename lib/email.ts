import { Resend } from "resend";
import { formatPrice } from "@/features/products/lib/format";
import { LEGAL_INFO } from "@/features/legal/lib/legal-info";
import { getSettings } from "@/lib/settings";

/**
 * The address block in every email footer.
 *
 * Read from the shop's settings so a change on /admin/settings reaches
 * transactional mail too, but wrapped: this runs inside Better Auth's send
 * hooks as well as inside Server Actions, and a cached read that throws in
 * some future context must never be the reason a verification email fails to
 * go out. The fallback is the constant this footer used to print.
 *
 * `brand` deliberately stays on LEGAL_INFO — the name at the bottom of an
 * email is the legal entity, not an editable contact detail.
 */
async function footerContact(): Promise<{
  address: string;
  contactEmail: string;
  contactPhone: string;
}> {
  try {
    const { address, contactEmail, contactPhone } = await getSettings();
    return { address, contactEmail, contactPhone };
  } catch (error) {
    console.error("email footer settings lookup failed", error);
    return {
      address: LEGAL_INFO.address,
      contactEmail: LEGAL_INFO.contactEmail,
      contactPhone: LEGAL_INFO.contactPhone,
    };
  }
}

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
 * A one-line excerpt for the inbox preview. Newlines collapse because the
 * preview renders as a single run anyway, and an ellipsis marks the cut so a
 * truncated sentence does not read as the whole message.
 */
function snippet(value: string, maxLength = 140): string {
  const flat = value.replace(/\s+/g, " ").trim();
  return flat.length > maxLength ? `${flat.slice(0, maxLength - 1)}…` : flat;
}

/**
 * The palette from `app/globals.css`, restated as literals.
 *
 * Email has no custom properties and no stylesheet — every rule is inline — so
 * these cannot reference the real tokens and have to be kept in step by hand.
 * Named rather than scattered so a palette change is one edit here instead of
 * forty hex strings through the templates.
 */
const INK = "#1a1a1a"; // --foreground
const PAPER = "#faf9f6"; // --background, the card
const GROUND = "#f3f1ed"; // --muted, the ground behind the card
const RULE = "#e8e5df"; // --border
const BROWN = "#8a7968"; // --secondary, muted text and labels
const BODY_INK = "#444444"; // body copy, a step down from INK

/**
 * Stand-ins for the site's two faces. Neither EB Garamond nor Inter is a
 * web-safe email font and `@font-face` is unreliable across clients, so the
 * headings fall back to the same Georgia stack `--font-serif` declares and the
 * body to the system sans stack Inter would otherwise head.
 */
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/**
 * The one email template. Originally single-CTA shaped for the auth links;
 * `summaryHtml` was added so an order confirmation can carry an itemised block
 * without a second template drifting away from this one's styling.
 *
 * Every parameter is escaped except `summaryHtml`, which is the sole trusted
 * HTML slot — it may only ever be fed markup this module built itself.
 *
 * Built out of `<table>` rather than `<div>`: Outlook's Word rendering engine
 * ignores `max-width` on a div, so a div-centred layout runs the full width of
 * the window there. The nested-table pattern is ugly and is what every email
 * client has agreed on.
 */
function renderEmailHtml(
  heading: string,
  bodyText: string,
  contact: { address: string; contactEmail: string; contactPhone: string },
  action?: EmailAction,
  summaryHtml?: string,
  preheader?: string,
) {
  const url = action ? escapeHtml(action.url) : "";
  const site = process.env.BETTER_AUTH_URL?.replace(/\/$/, "");

  return `
    <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(
      preheader ?? bodyText,
    )}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${GROUND};margin:0;padding:0;">
      <tr>
        <td align="center" style="padding:32px 12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background:${PAPER};border:1px solid ${RULE};">
            <tr>
              <td style="padding:32px 36px 20px;border-bottom:1px solid ${RULE};">
                <div style="font-family:${SERIF};font-size:15px;letter-spacing:0.18em;text-transform:uppercase;color:${INK};">Jack The Jelli</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 36px 36px;font-family:${SANS};">
                <h1 style="margin:0 0 14px;font-family:${SERIF};font-size:22px;font-weight:normal;line-height:1.3;color:${INK};">${escapeHtml(heading)}</h1>
                <p style="margin:0 0 26px;font-family:${SANS};font-size:15px;line-height:1.65;color:${BODY_INK};">${escapeHtml(bodyText)}</p>
                ${summaryHtml ?? ""}
                ${
                  action
                    ? `<a href="${url}" style="display:inline-block;background:${INK};color:${PAPER};text-decoration:none;padding:14px 28px;font-family:${SANS};font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;">${escapeHtml(action.label)}</a>
                <p style="margin:28px 0 0;font-family:${SANS};font-size:12px;line-height:1.6;color:${BROWN};word-break:break-all;">If the button doesn't work, copy this link: ${url}</p>`
                    : ""
                }
              </td>
            </tr>
            <tr>
              <td style="padding:22px 36px 28px;border-top:1px solid ${RULE};font-family:${SANS};font-size:12px;line-height:1.7;color:${BROWN};">
                <div style="color:${INK};">${escapeHtml(LEGAL_INFO.brand)}</div>
                <div>${escapeHtml(contact.address)}</div>
                <div>${escapeHtml(contact.contactEmail)} &middot; ${escapeHtml(contact.contactPhone)}</div>
                ${
                  site
                    ? `<div style="padding-top:10px;"><a href="${escapeHtml(site)}" style="color:${BROWN};">${escapeHtml(site.replace(/^https?:\/\//, ""))}</a></div>`
                    : ""
                }
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

interface SendEmailParams {
  to: string;
  subject: string;
  heading: string;
  bodyText: string;
  action?: EmailAction;
  summaryHtml?: string;
  /**
   * The grey line an inbox shows after the subject. Left unset it falls back to
   * `bodyText`, which for a contact notification is boilerplate — so the one
   * line of the message visible without opening it says "Reply to this email"
   * rather than what the customer actually wrote. Pass the interesting part.
   */
  preheader?: string;
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
  preheader,
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
    html: renderEmailHtml(
      heading,
      bodyText,
      await footerContact(),
      action,
      summaryHtml,
      preheader,
    ),
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
  const cell = `padding:8px 0;font-family:${SANS};font-size:14px;`;
  const rows = items
    .map(
      (line) => `
      <tr>
        <td style="${cell}color:${INK};">${escapeHtml(line.name)}${line.color ? ` <span style="color:${BROWN};">(${escapeHtml(line.color)})</span>` : ""} <span style="color:${BROWN};">× ${line.qty}</span></td>
        <td style="${cell}text-align:right;color:${INK};white-space:nowrap;">${formatPrice(line.lineTotal)}</td>
      </tr>`,
    )
    .join("");

  const totalRow = (label: string, value: string, strong = false) => `
        <tr>
          <td style="padding:4px 0;font-family:${SANS};font-size:${strong ? 15 : 14}px;color:${strong ? INK : BODY_INK};">${label}</td>
          <td style="padding:4px 0;font-family:${SANS};font-size:${strong ? 15 : 14}px;text-align:right;color:${strong ? INK : BODY_INK};white-space:nowrap;">${value}</td>
        </tr>`;

  return `
    <div style="border-top:1px solid ${RULE};border-bottom:1px solid ${RULE};padding:20px 0;margin-bottom:28px;">
      <p style="margin:0 0 12px;font-family:${SANS};font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${BROWN};">Order ${escapeHtml(orderNumber)}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
        ${rows}
        <tr><td colspan="2" style="border-top:1px solid ${RULE};padding-top:12px;font-size:0;line-height:0;">&nbsp;</td></tr>
        ${totalRow("Subtotal", formatPrice(subtotal))}
        ${totalRow("Delivery", deliveryFee === 0 ? "Free" : formatPrice(deliveryFee))}
        ${totalRow("Total due on delivery", formatPrice(totalAmount), true)}
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
    preheader: `${items.length} item${items.length === 1 ? "" : "s"} · ${formatPrice(totalAmount)} due on delivery`,
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
  // Escape first, then turn the surviving newlines into breaks. The other order
  // would escape the tags this just wrote.
  const body = escapeHtml(message).replace(/\r?\n/g, "<br />");

  return `
    <div style="border-top:1px solid ${RULE};border-bottom:1px solid ${RULE};padding:20px 0;margin-bottom:28px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
        ${metaRow("Name", name)}
        ${metaRow("Email", email)}
        ${phone ? metaRow("Phone", phone) : ""}
      </table>
      <p style="margin:20px 0 0;font-family:${SANS};font-size:15px;line-height:1.65;color:${INK};">${body}</p>
    </div>
  `;
}

/**
 * A label/value line in the bordered blocks. Shared so the contact notification
 * and the forwarded message render identically — the two kinds of mail the shop
 * receives should look like one shop, not two systems.
 */
function metaRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:4px 16px 4px 0;font-family:${SANS};font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${BROWN};white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:4px 0;font-family:${SANS};font-size:14px;color:${INK};">${escapeHtml(value)}</td>
    </tr>`;
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
 *
 * It is delivered straight to the owner's inbox rather than to `SUPPORT_EMAIL`.
 * Aiming it at `support@` worked, but the message then took the long way round —
 * out to Resend's inbound endpoint, back through `forwardInboundEmail`, and into
 * the owner's inbox wrapped in a *second* copy of this template. The brand name,
 * the sender's address and "reply to answer them directly" each appeared twice.
 * Two sends against a 100/day tier, for a message we composed ourselves and
 * already know how to address. `SUPPORT_EMAIL` stays the fallback so an
 * environment without `SUPPORT_FORWARD_TO` still delivers somewhere real.
 */
export async function sendContactNotificationEmail({
  name,
  email,
  phone,
  message,
}: ContactNotificationParams) {
  const inbox = process.env.SUPPORT_FORWARD_TO || process.env.SUPPORT_EMAIL;
  if (!inbox) {
    throw new Error(
      "Contact email is not configured — set SUPPORT_FORWARD_TO or SUPPORT_EMAIL.",
    );
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
    preheader: snippet(message),
    devDetail: `contact message from ${email}`,
  });
}

/**
 * Fetches a received message's actual content.
 *
 * The `email.received` webhook carries **metadata only** — `from`, `to`,
 * `subject`, `email_id` and nothing else. It has no body and no headers, so a
 * forwarder built on the webhook payload alone produces an empty message with
 * the envelope sender in Reply-To. The content lives behind this endpoint,
 * keyed by the payload's `email_id`.
 *
 * `reply_to` matters as much as the body: when the shop's own contact form
 * mails `support@`, the envelope `from` is our `noreply@` and the customer's
 * real address is in `Reply-To`. Reading only `from` makes every forwarded
 * message unanswerable.
 */
async function fetchReceivedEmail(emailId: string): Promise<{
  from?: string;
  reply_to?: string[];
  subject?: string;
  text?: string;
  html?: string;
}> {
  // Reading a message needs a **Full access** key. Resend's permissions are
  // only "Sending access" or "Full access", so the send key cannot be reused
  // here — it returns 401 on this route, which is exactly how this first
  // failed in production. `RESEND_INBOUND_API_KEY` keeps that broader key off
  // the sending path, where it would otherwise widen the blast radius of a
  // leak from "can send mail" to "can read every message we ever received".
  // Falls back to the send key so a single full-access key also works.
  const apiKey =
    process.env.RESEND_INBOUND_API_KEY || process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Inbound retrieval is not configured — set RESEND_INBOUND_API_KEY.",
    );
  }

  const response = await fetch(
    `https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`,
    { headers: { Authorization: `Bearer ${apiKey}` } },
  );

  if (!response.ok) {
    // Thrown so the route 500s and Resend retries: a transient fetch failure
    // must not silently forward an empty message, which is indistinguishable
    // from a customer who wrote nothing.
    //
    // 401 is called out by name because it is not transient and retrying will
    // never fix it — it means the key lacks Full access, and the message will
    // sit unretrieved until someone reads this line.
    const hint =
      response.status === 401
        ? " — the API key lacks Full access; a Sending-access key cannot read received mail"
        : "";
    throw new Error(
      `Could not retrieve received email ${emailId}: ${response.status}${hint}`,
    );
  }

  return response.json();
}

/**
 * The domain's own MX now points at Resend's inbound endpoint, so mail to
 * `support@jackthejelli.com` lands in Resend rather than bouncing. Resend has
 * no mailbox UI worth living in, so this hands each message on to a real inbox
 * the owner already reads — `SUPPORT_FORWARD_TO`.
 *
 * `from` on the forwarded copy is our own verified sender, never the stranger
 * who wrote in: re-sending as them would fail SPF and DKIM for their domain and
 * teach every receiver that we forge addresses. Their address goes in
 * `Reply-To` instead, so hitting Reply answers the customer directly — the same
 * arrangement `sendContactNotificationEmail` already uses.
 */
export async function forwardInboundEmail({
  emailId,
  to,
}: {
  emailId: string;
  to?: string;
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

  const received = await fetchReceivedEmail(emailId);
  const { subject, text, html } = received;

  const sender = senderAddress();
  // `reply_to` first: see the note on `fetchReceivedEmail`. Falls back to the
  // envelope sender for ordinary mail, which carries no Reply-To at all.
  const rawReply = received.reply_to?.[0] ?? received.from ?? "";
  const replyAddress =
    rawReply.match(/<([^>]+)>/)?.[1]?.trim() ?? rawReply.trim();

  // An inbound message with no usable sender is rare but possible (a malformed
  // bounce, say). Reply-To is left unset rather than pointed somewhere wrong,
  // and the label says so instead of rendering an empty "From ".
  const hasReply = replyAddress.includes("@");
  const senderLabel = hasReply ? replyAddress : "an unknown sender";

  return sendEmail({
    to: destination,
    from: sender
      ? `${sanitizeHeaderText(senderLabel, 60)} via Jack The Jelli <${sender}>`
      : undefined,
    replyTo: hasReply ? replyAddress : undefined,
    subject: subject
      ? sanitizeHeaderText(subject, 120)
      : "(no subject) — forwarded from the shop inbox",
    heading: `Mail to ${sanitizeHeaderText(to ?? "the shop", 60)}`,
    // Deliberately does not repeat the sender's address: it is already in the
    // From header the mail client shows, and again in the block below. Saying
    // it a third time is how this template started reading like a form.
    bodyText: hasReply
      ? "Reply to this email to answer them directly."
      : "This message carried no usable reply address.",
    // The only caller-supplied HTML this module ever renders. An inbound
    // message is a stranger's markup, so it is NOT passed through to
    // `summaryHtml`, which is the trusted slot — the plain-text part is escaped
    // and wrapped instead. A forwarded copy that loses styling is a fair price
    // for not rendering an attacker's HTML in the owner's mail client.
    summaryHtml: renderForwardedBody(senderLabel, text, html),
    preheader: text ? snippet(text) : undefined,
    devDetail: `inbound mail from ${senderLabel}`,
  });
}

/**
 * Renders the forwarded message: who wrote it, then what they wrote.
 *
 * Shaped to match `renderContactSummary` — the same bordered block and the same
 * label-caps meta row — so the two kinds of mail the owner receives look like
 * they came from one shop rather than two systems.
 *
 * The body prefers the plain-text part. When a sender provides only HTML the
 * tags are stripped rather than trusted: see the note in `forwardInboundEmail`
 * about whose markup this is.
 */
function renderForwardedBody(
  from: string,
  text?: string,
  html?: string,
): string {
  const source =
    text?.trim() ||
    html
      ?.replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim() ||
    "(this message had no readable body)";

  return `
    <div style="border-top:1px solid ${RULE};border-bottom:1px solid ${RULE};padding:20px 0;margin-bottom:28px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
        ${metaRow("From", from)}
      </table>
      <p style="margin:20px 0 0;white-space:pre-wrap;font-family:${SANS};font-size:15px;line-height:1.65;color:${INK};">${escapeHtml(source)}</p>
    </div>
  `;
}
