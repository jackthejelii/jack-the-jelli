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
}: SendEmailParams) {
  const isProduction = process.env.NODE_ENV === "production";
  const isDevInbox = to === process.env.DEV_INBOX;

  if (!isProduction && !isDevInbox) {
    console.log(
      `[email:dev] ${heading.toLowerCase()} for ${to} → ${devDetail ?? action?.url ?? "(no link)"}`,
    );
    return;
  }

  const from = process.env.EMAIL_FROM;
  if (!process.env.RESEND_API_KEY || !from) {
    throw new Error(
      "Email is not configured — set RESEND_API_KEY and EMAIL_FROM.",
    );
  }

  // The Resend SDK resolves with { data, error } rather than rejecting, so an
  // unchecked `await` reports success for a 403 (sending domain not verified,
  // or onboarding@resend.dev aimed at anyone but the account holder), a bad
  // API key, or a quota trip. Better Auth then tells the user to check an
  // inbox nothing was ever sent to, with nothing logged anywhere.
  const { error } = await resend.emails.send({
    from,
    to,
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
