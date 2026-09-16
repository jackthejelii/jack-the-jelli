"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatPrice } from "@/features/products/lib/format";
import type {
  DistrictRow,
  StatusRow,
  TimeseriesPoint,
  ZoneSplitRow,
} from "@/features/admin/lib/analytics";

/**
 * Every chart on `/admin`, in one client module.
 *
 * Grouped rather than split one-per-file because they share the Recharts
 * import: four separate client entrypoints on the same page would be four
 * references to the same chunk and no less JavaScript. Nothing on the
 * storefront imports this file, so Recharts stays out of every customer-facing
 * bundle.
 *
 * Deliberately stock shadcn styling. This is a working surface for one person,
 * and a distinguishable series is worth more here than a tonal one — the only
 * thing overridden is the corner radius, which the design system pins at 0.
 *
 * **Every series sets `isAnimationActive={false}`, and that is not a taste
 * decision.** Recharts 3 animates by driving state from a rAF loop, and under
 * React 19's concurrent rendering these charts mount inside a Suspense
 * boundary that resolves after the shell has painted — which was leaving the
 * entry animation stranded partway. Observed, not theorised: the zone donut
 * rendered as a ten-degree sliver of its correct geometry (right proportions,
 * right radii, wrong sweep) and stayed there through a resize and a two-second
 * wait. A dashboard that is occasionally, silently wrong about its own numbers
 * is worse than one that does not animate.
 */

/** Charts get their data already shaped; they never compute a total. */
function ChartFrame({
  title,
  subtitle,
  empty,
  children,
}: {
  title: string;
  subtitle: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="border-border flex flex-col border">
      <header className="border-border border-b px-5 py-4">
        <h2 className="font-heading text-foreground text-lg tracking-wide">
          {title}
        </h2>
        <p className="text-muted-foreground mt-0.5 text-xs">{subtitle}</p>
      </header>
      <div className="p-5">
        {empty ? (
          // An empty chart axis reads as a broken chart. Say so in words.
          <p className="text-muted-foreground py-12 text-center text-sm">
            No orders in this period.
          </p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

const trendConfig = {
  orders: { label: "Orders", color: "var(--chart-1)" },
  revenue: { label: "Revenue", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function OrdersTrendChart({ points }: { points: TimeseriesPoint[] }) {
  const empty = points.every((point) => point.orders === 0);

  // A 90-day range would print 90 axis labels on top of each other. Thinning
  // to roughly eight keeps them readable at every window length; `minTickGap`
  // below is the backstop that drops any that still collide on a narrow
  // screen, which `interval` alone does not do.
  const step = Math.max(1, Math.ceil(points.length / 8));

  return (
    <ChartFrame
      title="Orders over time"
      subtitle="Placed per day, Dhaka time. Cancelled and returned orders are excluded."
      empty={empty}
    >
      <ChartContainer config={trendConfig} className="h-64 w-full">
        {/* The right margin is wider than it looks like it needs to be: the
            final x-axis label sits flush against the plot edge and was being
            clipped to "09-1". */}
        <AreaChart data={points} margin={{ left: 4, right: 24, top: 8 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval={step - 1}
            minTickGap={24}
            tickFormatter={(value: string) => value.slice(5)}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={28}
            allowDecimals={false}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) =>
                  name === "revenue"
                    ? [formatPrice(Number(value)), " Revenue"]
                    : [String(value), " Orders"]
                }
              />
            }
          />
          <Area
            dataKey="orders"
            type="monotone"
            isAnimationActive={false}
            stroke="var(--color-orders)"
            fill="var(--color-orders)"
            fillOpacity={0.15}
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
    </ChartFrame>
  );
}

const zoneConfig = {
  "inside-dhaka": { label: "Inside Dhaka", color: "var(--chart-1)" },
  "outside-dhaka": { label: "Outside Dhaka", color: "var(--chart-3)" },
} satisfies ChartConfig;

export function ZoneSplitChart({ rows }: { rows: ZoneSplitRow[] }) {
  const total = rows.reduce((sum, row) => sum + row.orders, 0);

  return (
    <ChartFrame
      title="Where orders go"
      subtitle="Dhaka district against the rest of Bangladesh — the two courier rates."
      empty={total === 0}
    >
      <ChartContainer config={zoneConfig} className="h-56 w-full">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="zone" />} />
          <Pie
            data={rows}
            dataKey="orders"
            nameKey="zone"
            innerRadius={48}
            outerRadius={86}
            isAnimationActive={false}
          >
            {rows.map((row) => (
              <Cell key={row.zone} fill={`var(--color-${row.zone})`} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="mt-2 flex flex-col gap-1 text-sm">
        {rows.map((row) => (
          <li key={row.zone} className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-2.5"
                style={{ background: `var(--color-${row.zone})` }}
              />
              {zoneConfig[row.zone].label}
            </span>
            <span className="text-muted-foreground tabular-nums">
              {row.orders} · {formatPrice(row.revenue)}
            </span>
          </li>
        ))}
      </ul>
    </ChartFrame>
  );
}

const districtConfig = {
  orders: { label: "Orders", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function TopDistrictsChart({ rows }: { rows: DistrictRow[] }) {
  return (
    <ChartFrame
      title="Busiest districts"
      subtitle="Where the courier goes most often. Useful when negotiating a rate."
      empty={rows.length === 0}
    >
      <ChartContainer
        config={districtConfig}
        // Height follows the row count so ten districts don't squeeze into the
        // space three would have used.
        className="w-full"
        style={{ height: Math.max(160, rows.length * 32) }}
      >
        <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="district"
            tickLine={false}
            axisLine={false}
            width={110}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar
            dataKey="orders"
            fill="var(--color-orders)"
            radius={0}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartContainer>
    </ChartFrame>
  );
}

const statusConfig = {
  orders: { label: "Orders", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function StatusBreakdownChart({ rows }: { rows: StatusRow[] }) {
  const total = rows.reduce((sum, row) => sum + row.orders, 0);

  return (
    <ChartFrame
      title="Where orders are now"
      subtitle="Every order placed in this period, by the status it currently sits in."
      empty={total === 0}
    >
      <ChartContainer config={statusConfig} className="h-56 w-full">
        <BarChart data={rows} margin={{ left: 4, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="status"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={28}
            allowDecimals={false}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar
            dataKey="orders"
            fill="var(--color-orders)"
            radius={0}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartContainer>
    </ChartFrame>
  );
}
