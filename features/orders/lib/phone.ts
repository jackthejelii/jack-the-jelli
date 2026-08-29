// Bangladeshi mobile numbers, normalised to one canonical form.
//
// Shared by checkout (which stores `phoneKey`) and /track (which looks up by
// it), because a customer who typed "+880 1712-345678" at checkout will
// absolutely type "01712345678" when tracking. Storing the normalised form and
// normalising the query is the only way both match.
//
// Client-safe: no server-only imports.

/** Canonical form: 01XXXXXXXXX — 11 digits, operator prefix 013–019. */
const CANONICAL_PATTERN = /^01[3-9]\d{8}$/;

/**
 * Returns the canonical `01XXXXXXXXX` form, or null if the input isn't a
 * plausible BD mobile number.
 *
 * Accepts the four ways people actually type it: `01712345678`,
 * `+8801712345678`, `8801712345678`, and `1712345678`, with any spacing,
 * dashes or parentheses.
 */
export function normalizeBdPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");

  let local: string;
  if (digits.startsWith("880") && digits.length === 13) {
    local = `0${digits.slice(3)}`;
  } else if (digits.startsWith("0")) {
    local = digits;
  } else if (digits.length === 10) {
    // Typed without the leading zero, e.g. straight off a business card.
    local = `0${digits}`;
  } else {
    local = digits;
  }

  return CANONICAL_PATTERN.test(local) ? local : null;
}

/** `01712-345678` — display only. Never stored, never queried. */
export function formatBdPhone(canonical: string): string {
  if (!CANONICAL_PATTERN.test(canonical)) return canonical;
  return `${canonical.slice(0, 5)}-${canonical.slice(5)}`;
}
