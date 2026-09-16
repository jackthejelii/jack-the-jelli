import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  getAnalyticsKpis,
  getOrdersOverTime,
  getStatusBreakdown,
  getTopDistricts,
  getZoneSplit,
} from "@/features/admin/lib/analytics";
import {
  parseRangeKey,
  resolveRange,
  type DateRange,
} from "@/features/admin/lib/date-range";
import KpiTiles from "@/features/admin/components/analytics/KpiTiles";
import RangeFilter from "@/features/admin/components/analytics/RangeFilter";
import {
  OrdersTrendChart,
  StatusBreakdownChart,
  TopDistrictsChart,
  ZoneSplitChart,
} from "@/features/admin/components/analytics/AnalyticsCharts";

/**
 * Sales Overview.
 *
 * `/admin` used to *be* the order manager, which is why the sidebar's first
 * item has always said "Sales Overview" over a screen full of order rows. The
 * order manager now lives at its own `/admin/orders`, next to the
 * `/admin/orders/[id]` detail page it belongs with, and this route is the
 * reporting surface the label promised.
 *
 * **Each region has its own Suspense boundary and awaits its own query.** The
 * page shell and the range filter paint immediately; the tiles arrive without
 * waiting on the district aggregation, and the charts arrive without waiting
 * on each other. One boundary around everything would make the whole page as
 * slow as its slowest `$group`, which on a growing order collection is the
 * district scan.
 */
interface AdminOverviewProps {
  searchParams: Promise<{ range?: string }>;
}

function SectionSkeleton({ height }: { height: string }) {
  return <Skeleton className={`w-full rounded-none ${height}`} />;
}

async function KpiSection({ range }: { range: DateRange }) {
  return <KpiTiles kpis={await getAnalyticsKpis(range)} />;
}

async function TrendSection({ range }: { range: DateRange }) {
  return <OrdersTrendChart points={await getOrdersOverTime(range)} />;
}

async function StatusSection({ range }: { range: DateRange }) {
  return <StatusBreakdownChart rows={await getStatusBreakdown(range)} />;
}

async function ZoneSection({ range }: { range: DateRange }) {
  return <ZoneSplitChart rows={await getZoneSplit(range)} />;
}

async function DistrictSection({ range }: { range: DateRange }) {
  return <TopDistrictsChart rows={await getTopDistricts(range)} />;
}

export default async function AdminOverviewPage({
  searchParams,
}: AdminOverviewProps) {
  const params = await searchParams;
  // Anything unrecognised falls back to the default window rather than being
  // passed to Mongo — the same rule the order and product filters follow.
  const range = resolveRange(parseRangeKey(params.range));

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-3xl tracking-widest">
            Sales Overview
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{range.label}</p>
        </div>
        {/* Reads searchParams, so it is request-time state under Cache
            Components and needs a boundary of its own. */}
        <Suspense fallback={<Skeleton className="h-10 w-80 rounded-none" />}>
          <RangeFilter />
        </Suspense>
      </header>

      <Suspense fallback={<SectionSkeleton height="h-72" />}>
        <KpiSection range={range} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton height="h-96" />}>
        <TrendSection range={range} />
      </Suspense>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Suspense fallback={<SectionSkeleton height="h-96" />}>
          <StatusSection range={range} />
        </Suspense>
        <Suspense fallback={<SectionSkeleton height="h-96" />}>
          <ZoneSection range={range} />
        </Suspense>
      </div>

      <Suspense fallback={<SectionSkeleton height="h-96" />}>
        <DistrictSection range={range} />
      </Suspense>
    </div>
  );
}
