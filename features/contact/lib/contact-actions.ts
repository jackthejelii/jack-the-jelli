"use server";

import { connectDB } from "@/lib/db";
import { sendContactNotificationEmail } from "@/lib/email";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";
import { Contact } from "@/models";
import { collectValues, toFieldErrors } from "@/features/admin/lib/form-state";
import { normalizeBdPhone } from "@/features/orders/lib/phone";
import {
  CONTACT_VALUE_FIELDS,
  contactSchema,
  readContactFormData,
} from "@/features/contact/lib/contact-schema";
import type { ContactFormState } from "@/features/contact/lib/contact-state";

/**
 * Tighter than checkout's 8 and /track's 12. Nobody legitimately sends four
 * messages in a minute, and the ceiling that matters is Resend's free tier:
 * 100 sends a day shared with account verification, so contact-form abuse
 * would silently stop new customers being able to create an account.
 */
const contactLimiter = createRateLimiter({ windowMs: 60_000, max: 4 });

/**
 * How quickly a submit is treated as automated. Generous on purpose: a person
 * using autofill and pasting a prepared message is the fastest real case, and
 * a false positive here silently discards a customer's message. Bots that post
 * the form directly arrive in double-digit milliseconds.
 */
const MIN_FILL_MS = 1500;

const SUCCESS =
  "Thanks, your message is with us. We reply within 24 hours, usually sooner.";

/**
 * Public contact form. No session required, and no account needed to write to
 * a shop.
 *
 * The database write is the feature; the notification email is a convenience
 * that is never allowed to fail it.
 */
export async function submitContactMessage(
  _prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const values = collectValues(formData, CONTACT_VALUE_FIELDS);

  // After collectValues so a false positive still echoes the message back
  // instead of wiping it, but before the parse and every database call — a
  // throttled request must cost nothing beyond reading the FormData.
  if (contactLimiter(await clientKey())) {
    return {
      ok: false,
      values,
      message: "Too many attempts. Please wait a minute and try again.",
    };
  }

  // Two cheap bot checks instead of a captcha, which would cost money and ask
  // a paying customer to do a chore. `website` is a real input hidden from
  // people and left empty by them; `startedAt` is when the form mounted.
  //
  // Both return the success state without writing anything: a bot that learns
  // it was caught is a bot that adapts. A missing or unparseable `startedAt`
  // fails open, because a hidden field that didn't render must never be the
  // reason a real message is dropped.
  const honeypot = formData.get("website");
  const startedAt = Number(formData.get("startedAt"));
  const tooFast =
    Number.isFinite(startedAt) &&
    startedAt > 0 &&
    Date.now() - startedAt < MIN_FILL_MS;

  if ((typeof honeypot === "string" && honeypot.length > 0) || tooFast) {
    return { ok: true, message: SUCCESS };
  }

  const parsed = contactSchema.safeParse(readContactFormData(formData));
  if (!parsed.success) {
    return {
      ok: false,
      errors: toFieldErrors(parsed.error),
      values,
      message: "Please correct the highlighted fields.",
    };
  }

  const { name, email, phone, message } = parsed.data;

  try {
    await connectDB();
    await Contact.create({
      name,
      email,
      phone,
      // Only set when it really is a BD mobile, so the field stays a reliable
      // join back to an order rather than a copy of whatever was typed.
      phoneKey: phone ? (normalizeBdPhone(phone) ?? undefined) : undefined,
      message,
    });
  } catch (error) {
    console.error("submitContactMessage failed", error);
    return {
      ok: false,
      values,
      message:
        "Something went wrong sending that. Please try again, or call us instead.",
    };
  }

  // Awaited but never allowed to throw: the message is already stored, so a
  // Resend hiccup must not tell the customer it was lost. It does mean the
  // shop may not be notified, which is why this logs loudly.
  try {
    await sendContactNotificationEmail({ name, email, phone, message });
  } catch (error) {
    console.error("Contact notification email failed", error);
  }

  return { ok: true, message: SUCCESS };
}
