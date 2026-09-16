import { formatPrice } from "@/features/products/lib/format";
import type { AnalyticsKpis } from "@/features/admin/lib/analytics";

/**
 * A change against the previous window of equal length.
 *
 * Returns null rather than a percentage when the previous window was empty.
 * "+100%" against a base of zero is arithmetic, not information, and on a shop
 * in its first month every tile would shout it.
 */
function delta(current: number, previous: number): string | null {
  if (previous <= 0) return null;
  const change = Math.round(((current - previous) / previous) * 100);
  if (change === 0) return "No change";
  return `${change > 0 ? "+" : ""}${change}% vs previous`;
}

function Tile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string | null;
  tone?: "default" | "warning";
}) {
  return (
    <div className="border-border flex flex-col gap-2 border p-5">
      <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase">
        {label}
      </p>
      <p
        className={
          tone === "warning"
            ? "text-destructive font-serif text-3xl tabular-nums"
            : "text-foreground font-serif text-3xl tabular-nums"
        }
      >
        {value}
      </p>
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
}

export default function KpiTiles({ kpis }: { kpis: AnalyticsKpis }) {
  const lost = kpis.cancelled + kpis.returned;
  const decided = kpis.orders + lost;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <Tile
        label="Orders"
        value={kpis.orders.toLocaleString()}
        hint={delta(kpis.orders, kpis.previousOrders)}
      />
      <Tile
        label="Revenue"
        value={formatPrice(kpis.revenue)}
        hint={delta(kpis.revenue, kpis.previousRevenue)}
      />
      <Tile
        label="Average order"
        value={formatPrice(kpis.averageOrderValue)}
        hint="Across orders still in play"
      />
      <Tile
        label="Delivery collected"
        value={formatPrice(kpis.deliveryFees)}
        hint="Courier charges inside the revenue above"
      />
      {/* The one tile that is a to-do list rather than a measurement: goods
          delivered, cash not yet marked collected. */}
      <Tile
        label="Cash to collect"
        value={formatPrice(kpis.codOutstanding)}
        tone={kpis.codOutstanding > 0 ? "warning" : "default"}
        hint={
          kpis.codOutstandingOrders > 0
            ? `${kpis.codOutstandingOrders} delivered order${
                kpis.codOutstandingOrders === 1 ? "" : "s"
              } not settled`
            : "Everything delivered is settled"
        }
      />
      <Tile
        label="Cancelled + returned"
        value={lost.toLocaleString()}
        hint={
          decided > 0
            ? `${Math.round((lost / decided) * 100)}% of orders placed`
            : "Nothing placed in this period"
        }
      />
    </div>
  );
}
