"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { emptyFormState } from "@/features/admin/lib/form-state";
import { bulkMarkShipped } from "@/features/admin/lib/logistics-actions";
import type { DispatchRow } from "@/features/admin/lib/logistics";
import { formatPrice } from "@/features/products/lib/format";
import { formatBdPhone } from "@/features/orders/lib/phone";

/**
 * The ready-to-ship queue, and the only place in this dashboard that changes
 * more than one order at once.
 *
 * Selection is local state keyed by order number rather than by row index, so
 * a revalidation that reorders or shortens the list can never leave a tick
 * pointing at a different order than the one it was put on.
 *
 * It is also **narrowed to the rows actually on screen during render**, not
 * cleared in an effect after a successful ship. Shipped orders leave the queue,
 * so intersecting the selection with the current rows empties it on its own —
 * and it self-heals for every other reason a row might disappear (someone else
 * shipped it, the order was cancelled) rather than only the one case an effect
 * would have handled.
 *
 * The submit posts one `orderNumber` field per ticked row. The action re-reads
 * which of those is genuinely still Confirmed before moving anything — a row
 * can be shipped by someone else between this page rendering and the button
 * being pressed, and the queue on screen is a snapshot either way.
 */
export default function DispatchQueue({
  rows,
  total,
}: {
  rows: DispatchRow[];
  total: number;
}) {
  const [state, formAction, pending] = useActionState(
    bulkMarkShipped,
    emptyFormState,
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  // Derived during render — see the note above.
  const onScreen = new Set(
    rows
      .filter((row) => selected.has(row.orderNumber))
      .map((r) => r.orderNumber),
  );

  const toggle = (orderNumber: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(orderNumber)) next.delete(orderNumber);
      else next.add(orderNumber);
      return next;
    });

  const allSelected = rows.length > 0 && onScreen.size === rows.length;

  if (rows.length === 0) {
    return (
      <div className="border-border text-muted-foreground border p-12 text-center text-sm">
        Nothing is waiting to be dispatched. Orders appear here once they are
        marked Confirmed.
      </div>
    );
  }

  return (
    <form action={formAction} className="border-border border">
      <div className="border-border flex flex-wrap items-center justify-between gap-4 border-b px-5 py-4">
        <p className="text-muted-foreground text-sm">
          {onScreen.size > 0
            ? `${onScreen.size} selected`
            : `${total} order${total === 1 ? "" : "s"} ready to ship`}
          {total > rows.length && ` · showing the oldest ${rows.length}`}
        </p>
        <Button
          type="submit"
          disabled={pending || onScreen.size === 0}
          className="rounded-none px-6 py-5 text-[11px] font-semibold tracking-[0.18em] uppercase"
        >
          {pending ? "Marking…" : "Mark selected shipped"}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table className="min-w-3xl">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  aria-label="Select every order shown"
                  checked={allSelected}
                  onCheckedChange={(next) =>
                    setSelected(
                      next
                        ? new Set(rows.map((row) => row.orderNumber))
                        : new Set(),
                    )
                  }
                />
              </TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Waiting</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.orderNumber}>
                <TableCell>
                  <Checkbox
                    aria-label={`Select ${row.orderNumber}`}
                    checked={onScreen.has(row.orderNumber)}
                    onCheckedChange={() => toggle(row.orderNumber)}
                  />
                  {/* Only ticked rows post a value, which is what makes the
                      form's payload exactly the selection. */}
                  {onScreen.has(row.orderNumber) && (
                    <input
                      type="hidden"
                      name="orderNumber"
                      value={row.orderNumber}
                    />
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin/orders/${encodeURIComponent(row.orderNumber)}`}
                    className="hover:text-primary font-medium underline-offset-4 hover:underline"
                  >
                    {row.orderNumber}
                  </Link>
                </TableCell>
                <TableCell>
                  <span className="block">{row.customerName}</span>
                  <span className="text-muted-foreground text-xs">
                    {formatBdPhone(row.customerPhone)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="block">{row.district}</span>
                  <span className="text-muted-foreground text-xs">
                    {row.thana}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.itemCount}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPrice(row.totalAmount)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.daysWaiting === 0 ? "Today" : `${row.daysWaiting}d`}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </form>
  );
}
