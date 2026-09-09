import { Skeleton } from "@/components/ui/skeleton";

/**
 * The stand-in for the three admin table pages while their query runs. It is
 * one component rather than three copies because all three render the same
 * shell — bordered card, header row, then rows of cells — and only the column
 * count differs.
 *
 * Sizes match the real `<Table>`: header cells are shorter than body cells,
 * and the card carries the same border and background so only the contents
 * change on swap-in.
 */
export default function AdminTableSkeleton({
  columns,
  rows = 8,
  minWidth = "min-w-4xl",
}: {
  columns: number;
  /** Not a limit — just the number the page usually shows above the fold. */
  rows?: number;
  /** Mirrors the real table's min-width so the horizontal scroll matches. */
  minWidth?: string;
}) {
  return (
    <div className="border-border bg-card flex-1 overflow-x-auto border">
      <div className={minWidth}>
        <div
          className="border-border grid gap-4 border-b px-4 py-3"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={index} className="h-3 w-20 rounded-none" />
          ))}
        </div>

        {Array.from({ length: rows }).map((_, row) => (
          <div
            key={row}
            className="border-border grid gap-4 border-b px-4 py-4 last:border-b-0"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: columns }).map((_, col) => (
              <Skeleton key={col} className="h-5 w-full rounded-none" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
