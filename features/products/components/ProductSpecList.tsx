import {
  PAYMENT_COPY,
  RETURNS_COPY,
} from "@/features/products/lib/product-copy";

interface ProductSpecListProps {
  material?: string;
  dimensions?: string;
  /**
   * The delivery sentence, already built from the shop's live fees and courier
   * window. Passed in rather than imported: both figures are settings now, so
   * a module-level constant would be whatever the server booted with.
   */
  shippingCopy: string;
}

/**
 * The hairline-ruled list: label on the left, value on the right, one rule per
 * row. Carries both the piece's own specification and the terms that apply to
 * every piece, so nothing is hidden behind a disclosure.
 *
 * Material and dimensions lead because they are the two rows that differ per
 * product and the two a buyer comparing makers actually needs; either is
 * dropped entirely when the product has no value for it, rather than printing
 * a row with a blank right-hand side.
 *
 * The colourway SKU used to sit at the top of this list as "Reference". It was
 * the only per-product row, and it was an internal stock code with no bearing
 * on the decision — a shopper quotes the order number on the confirmation
 * call, never the SKU. Removed rather than demoted.
 */
export default function ProductSpecList({
  material,
  dimensions,
  shippingCopy,
}: ProductSpecListProps) {
  const rows = [
    ...(material ? [{ label: "Material", value: material }] : []),
    ...(dimensions ? [{ label: "Dimensions", value: dimensions }] : []),
    { label: "Delivery", value: shippingCopy },
    { label: "Payment", value: PAYMENT_COPY },
    { label: "Exchanges", value: RETURNS_COPY },
  ];

  return (
    <dl className="border-outline-variant/40 mt-8 border-b">
      {rows.map((row) => (
        <div
          key={row.label}
          className="border-outline-variant/40 flex justify-between gap-8 border-t py-6"
        >
          <dt className="text-foreground label-caps shrink-0">{row.label}</dt>
          <dd className="text-on-surface-variant max-w-[60%] text-right text-[16px] leading-[1.6]">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
