/**
 * Cache tags for order data.
 *
 * Its own module, with no imports, so the mutation paths that invalidate it —
 * including `placeOrder`, which runs on the storefront — can reach the constant
 * without pulling the reporting aggregations (and with them Mongoose and the
 * Order model) into their module graph.
 */

/** Every cached reporting read on /admin carries this. */
export const ORDERS_TAG = "orders-reporting";
