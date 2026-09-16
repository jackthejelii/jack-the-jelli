"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { cn } from "@/lib/utils";
import {
  RANGE_KEYS,
  RANGE_LABELS,
  parseRangeKey,
} from "@/features/admin/lib/date-range";

/**
 * The reporting window, kept in the URL like every other admin filter.
 *
 * `router.replace` rather than `push`: flicking between windows to read the
 * same page is not four steps back through history. Wrapped in a transition so
 * the figures already on screen stay legible while the next set streams in,
 * rather than the whole page dropping to its skeleton.
 */
export default function RangeFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const current = parseRangeKey(searchParams.get("range") ?? undefined);

  return (
    <div
      role="group"
      aria-label="Reporting period"
      data-pending={isPending || undefined}
      className="border-border flex flex-wrap border data-pending:opacity-60"
    >
      {RANGE_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          aria-pressed={key === current}
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            if (key === "30d") params.delete("range");
            else params.set("range", key);
            startTransition(() =>
              router.replace(params.size ? `?${params}` : "/admin"),
            );
          }}
          className={cn(
            "border-border cursor-pointer border-r px-4 py-2 text-[11px] tracking-[0.18em] uppercase transition-colors last:border-r-0",
            key === current
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          {RANGE_LABELS[key]}
        </button>
      ))}
    </div>
  );
}
