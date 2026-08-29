import { Loader2 } from "lucide-react";

interface DiscoverMoreButtonProps {
  onClick: () => void;
  isPending: boolean;
  hasMore: boolean;
  addedCount: number;
}

export default function DiscoverMoreButton({
  onClick,
  isPending,
  hasMore,
  addedCount,
}: DiscoverMoreButtonProps) {
  if (!hasMore) return null;

  return (
    <div className="mt-16 flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        aria-label={isPending ? "Loading more pieces" : "Discover more pieces"}
        className="border-foreground text-foreground hover:bg-foreground hover:text-background ease-editorial inline-flex items-center justify-center gap-2 rounded-none border bg-transparent px-10 py-4 text-[12px] font-semibold tracking-widest uppercase transition-[color,background-color,border-color,transform] duration-(--motion-quick) active:translate-y-px disabled:pointer-events-none disabled:opacity-60"
      >
        {isPending && (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        )}
        {isPending ? "Loading" : "Discover More"}
      </button>
      <p role="status" aria-live="polite" className="sr-only">
        {isPending
          ? "Loading more pieces…"
          : addedCount > 0
            ? `${addedCount} more piece${addedCount === 1 ? "" : "s"} added.`
            : ""}
      </p>
    </div>
  );
}
