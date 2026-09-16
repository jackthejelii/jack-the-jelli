import {
  getStockStatus,
  type StockStatus,
} from "@/features/products/lib/stock";

interface StockIndicatorProps {
  count: number;
  /**
   * "How low is low", from the shop's settings. Required rather than defaulted
   * so this badge and the `$expr` stock filter in features/admin/lib/products.ts
   * are always answering with the same number — a row selected by the Low stock
   * filter that then renders as In stock is the exact confusion a default here
   * would eventually cause.
   */
  threshold: number;
}

// "How low is low" lives in features/products/lib/stock.ts (D3b) — never inline here.
const STOCK_STYLES: Record<StockStatus, { dot: string; text: string }> = {
  "out-of-stock": {
    dot: "bg-muted-foreground/40",
    text: "text-muted-foreground",
  },
  "low-stock": { dot: "bg-red-600", text: "text-red-600" },
  "in-stock": { dot: "bg-foreground/40", text: "text-foreground" },
};

export default function StockIndicator({
  count,
  threshold,
}: StockIndicatorProps) {
  const status = getStockStatus(count, threshold);
  const style = STOCK_STYLES[status];
  const label =
    status === "out-of-stock"
      ? "OUT OF STOCK"
      : `${count} ${status === "low-stock" ? "LOW STOCK" : "IN STOCK"}`;

  return (
    <span className={`flex items-center gap-2 text-sm ${style.text}`}>
      <span className={`size-1.5 rounded-full ${style.dot}`} />
      {label}
    </span>
  );
}
