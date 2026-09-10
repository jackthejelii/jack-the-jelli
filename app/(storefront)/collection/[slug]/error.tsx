"use client";

import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";

import MessageScreen, {
  messageScreenActionClass,
} from "@/components/layout/MessageScreen";

/**
 * The failure state this route was missing.
 *
 * `loading.tsx` and `not-found.tsx` both existed and were both written in the
 * storefront's voice; a product query that actually threw — an unreachable
 * cluster, a malformed document — fell through to whatever boundary sat above,
 * which is the one moment the shopper is least owed a generic page.
 *
 * "Try again" first, because the overwhelmingly likely cause is transient and
 * `reset()` re-renders the segment without a full navigation. The route back
 * to the collection sits beside it so the page is never a dead end, which is
 * the same reason the sold-out state now names a colour that is in stock.
 */
export default function ProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <MessageScreen
      eyebrow="Something went wrong"
      title="This piece would not load"
      description="The catalogue did not answer just now. It is very likely temporary."
      actions={
        <>
          <button
            type="button"
            onClick={reset}
            className={messageScreenActionClass}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Try Again
          </button>
          <Link href="/collection" className={messageScreenActionClass}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Browse The Collections
          </Link>
          {/* The digest is what a server log can be searched by, and it is the
              only part of `error` that is safe to surface in production —
              Next replaces the message itself with a generic string there. */}
          {error.digest && (
            <span className="text-on-surface-variant label-caps mt-2 block w-full">
              Reference {error.digest}
            </span>
          )}
        </>
      }
    />
  );
}
