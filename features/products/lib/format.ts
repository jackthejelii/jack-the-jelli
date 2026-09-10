/** Prices are stored as whole taka (BDT), never paisa — see models/Product.ts. */
export function formatPrice(price: number) {
  return `৳ ${price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * The same taka, without the paisa.
 *
 * `formatPrice` pads to two decimals, which is right where a figure sits in a
 * column of other figures (the cart, a receipt, the admin table) and wrong in a
 * sentence — "৳ 60.00 in Dhaka" reads as a currency this shop does not
 * transact in. Kept as a second function rather than a flag on the first so
 * neither call site has to pass an option to get its normal behaviour.
 */
export function formatTaka(amount: number) {
  return `৳${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}
