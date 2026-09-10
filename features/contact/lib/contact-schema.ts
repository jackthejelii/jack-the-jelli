import { z } from "zod";

/**
 * Shared by the Server Action and, through the action's echoed `values`, the
 * client. A Server Action is a public HTTP endpoint, so every field here is
 * treated as hostile: the form in the browser is a convenience, never the
 * validation.
 */

/** The text fields echoed back so a rejected submit doesn't wipe the form. */
export const CONTACT_VALUE_FIELDS = [
  "name",
  "email",
  "phone",
  "message",
] as const;

export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Your name is required")
    .max(120, "Name cannot exceed 120 characters"),
  // Required here, unlike checkout where it is optional. Checkout can fall back
  // to the phone call; a written question has no answer without an address to
  // send it to.
  email: z
    .string()
    .trim()
    .min(1, "An email address is required so we can reply")
    .max(200, "Email cannot exceed 200 characters")
    .refine(
      (value) => z.email().safeParse(value).success,
      "That doesn't look like an email address",
    ),
  // Deliberately not run through normalizeBdPhone as a hard rule. It is
  // optional extra contact detail, not a lookup key, and rejecting a landline
  // or an overseas number would block a real message for no benefit. The
  // action derives `phoneKey` only when it does normalise.
  phone: z
    .string()
    .trim()
    .max(32, "Phone number cannot exceed 32 characters")
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  message: z
    .string()
    .trim()
    .min(1, "Your message is required")
    .min(10, "Add a little more detail so we can help")
    .max(2000, "Message cannot exceed 2000 characters"),
});

export type ContactInput = z.infer<typeof contactSchema>;

/** Shape the action feeds to zod — every value straight off the FormData. */
export function readContactFormData(formData: FormData) {
  const get = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : undefined;
  };

  return {
    name: get("name") ?? "",
    email: get("email") ?? "",
    phone: get("phone"),
    message: get("message") ?? "",
  };
}
