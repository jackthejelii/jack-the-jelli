/**
 * Return shape for `submitContactMessage`. Lives outside the action file
 * because a `"use server"` module may only export async functions.
 */
export interface ContactFormState {
  /** True only after a message has actually been stored. */
  ok: boolean;
  /** Keyed by form field name. */
  errors?: Record<string, string>;
  /** Raw submitted strings, echoed back so nothing typed gets wiped. */
  values?: Record<string, string>;
  /** Form-level message: a throttle, a failure, or the success note. */
  message?: string;
}

export const emptyContactState: ContactFormState = { ok: false };
