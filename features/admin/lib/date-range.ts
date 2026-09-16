/**
 * The reporting window behind `/admin` and `/admin/logistics`, parsed out of
 * the URL the same way every other admin filter is (see OrderFilters,
 * ProductFilters): the page stays a Server Component and Mongo does the work.
 *
 * No server-only import here — the range picker is a Client Component and
 * needs the same option list the server validates against, or the two drift.
 */

/**
 * Every window the picker offers. Anything else in `?range=` is dropped rather
 * than passed to Mongo, exactly as `/admin` already drops an unrecognised
 * `?status=`.
 */
export const RANGE_KEYS = ["7d", "30d", "90d", "ytd"] as const;

export type RangeKey = (typeof RANGE_KEYS)[number];

export const DEFAULT_RANGE: RangeKey = "30d";

export const RANGE_LABELS: Record<RangeKey, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  ytd: "Year to date",
};

/**
 * The shop runs on Dhaka time and so must every bucket boundary.
 *
 * A day is not a fixed offset from UTC midnight anywhere the aggregations care
 * about: `$dateTrunc` is given this zone so a 6am Dhaka order lands on the day
 * it was actually placed rather than the previous one, and the range edges
 * below are computed the same way so the first and last buckets aren't
 * half-days. Bangladesh has no DST, but naming the zone rather than hardcoding
 * +06:00 keeps that an observation about Bangladesh rather than an assumption
 * baked into the arithmetic.
 */
export const REPORTING_TIMEZONE = "Asia/Dhaka";

export interface DateRange {
  /** Inclusive lower bound — Dhaka midnight at the start of the window. */
  from: Date;
  /** Exclusive upper bound — Dhaka midnight at the end of today. */
  to: Date;
  key: RangeKey;
  label: string;
  /** Whole days spanned, for "vs previous period" comparisons. */
  days: number;
}

/**
 * Today's date *in Dhaka*, as the [year, month, day] the calendar there shows.
 *
 * `Date` has no notion of a zone, so the only honest way to ask "what day is
 * it in Dhaka" is to format an instant in that zone and read the parts back.
 * Intl is the one API in the platform that knows the answer.
 */
function dhakaToday(now: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORTING_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return { year: read("year"), month: read("month"), day: read("day") };
}

/**
 * The instant of Dhaka midnight at the start of a given Dhaka calendar day.
 *
 * Bangladesh Standard Time is UTC+06:00 year-round — no DST, and none has been
 * observed since the 2009 experiment was abandoned — so the offset can be
 * applied directly. If that ever changes this is the one function to fix.
 */
const DHAKA_UTC_OFFSET_MINUTES = 6 * 60;

function dhakaMidnightUtc(year: number, month: number, day: number): Date {
  return new Date(
    Date.UTC(year, month - 1, day, 0, -DHAKA_UTC_OFFSET_MINUTES, 0, 0),
  );
}

/** Narrow an arbitrary `?range=` value, or fall back to the default. */
export function parseRangeKey(value: string | undefined): RangeKey {
  return RANGE_KEYS.find((key) => key === value) ?? DEFAULT_RANGE;
}

/**
 * Resolve a range key into the half-open interval `[from, to)` the
 * aggregations filter on.
 *
 * Half-open on purpose: an inclusive upper bound has to be "the last
 * millisecond of today", which is the kind of boundary that silently drops an
 * order placed at 23:59:59.500. `$gte from, $lt to` has no such edge.
 *
 * `now` is a parameter rather than a `new Date()` inside, so a cached
 * aggregation is a pure function of its arguments — see the `"use cache"`
 * helpers that consume this.
 */
export function resolveRange(key: RangeKey, now: Date = new Date()): DateRange {
  const { year, month, day } = dhakaToday(now);

  // Exclusive: midnight at the *end* of today in Dhaka, so today's orders count.
  const to = dhakaMidnightUtc(year, month, day + 1);

  const from =
    key === "ytd"
      ? dhakaMidnightUtc(year, 1, 1)
      : dhakaMidnightUtc(year, month, day - (Number.parseInt(key, 10) - 1));

  const MS_PER_DAY = 86_400_000;

  return {
    from,
    to,
    key,
    label: RANGE_LABELS[key],
    days: Math.round((to.getTime() - from.getTime()) / MS_PER_DAY),
  };
}

/**
 * The window immediately before `range`, of the same length — what a "vs
 * previous period" figure is measured against. Ends exactly where `range`
 * begins, so no order is counted in both.
 */
export function previousRange(range: DateRange): { from: Date; to: Date } {
  const span = range.to.getTime() - range.from.getTime();
  return {
    from: new Date(range.from.getTime() - span),
    to: range.from,
  };
}
