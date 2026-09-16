// Single source of truth for "what counts as low stock" (D3b). No product field,
// no inline `<= 5` in JSX.
//
// It has now become the store-wide admin setting this module always said it
// would: `lowStockThreshold` in models/Settings.ts. The threshold is therefore
// a parameter rather than a constant, and deliberately a *required* one — a
// default argument would let a call site quietly keep using 5 after the shop
// had changed it, and the compiler would never say so. There are only a
// handful of callers; making each one name where its threshold came from is
// worth more than the brevity.
//
// Client-safe: no server-only imports. Server Components read the setting and
// hand the number down.

/** What the shop shipped with, and the fallback whenever settings are absent. */
export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export type StockStatus = "out-of-stock" | "low-stock" | "in-stock";

export function getStockStatus(stock: number, threshold: number): StockStatus {
  if (stock <= 0) return "out-of-stock";
  if (stock <= threshold) return "low-stock";
  return "in-stock";
}
