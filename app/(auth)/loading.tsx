import { Skeleton } from "@/components/ui/skeleton";

/**
 * Every page in this group resolves the session before it can decide what to
 * render — several redirect a signed-in visitor straight back out — so all of
 * them have a real gap to cover. One file at the group level serves the lot.
 *
 * It renders inside app/(auth)/layout.tsx, so the branded left-hand panel and
 * the mark are already painted; only the form column is stood in for. Under
 * Cache Components that shell is prerendered, which is why this boundary
 * exists at all: it is what lets the static half ship before the session
 * round trip has finished.
 */
const FIELDS = 2;

export default function AuthLoading() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-48 rounded-none" />
        <Skeleton className="h-4 w-full rounded-none" />
      </div>

      {Array.from({ length: FIELDS }).map((_, index) => (
        <div key={index}>
          <Skeleton className="h-4 w-24 rounded-none" />
          <Skeleton className="mt-3 h-11 w-full rounded-none" />
        </div>
      ))}

      <Skeleton className="h-12 w-full rounded-none" />
      <Skeleton className="mx-auto h-4 w-40 rounded-none" />
    </div>
  );
}
