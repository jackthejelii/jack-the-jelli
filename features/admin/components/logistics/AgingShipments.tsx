import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DispatchRow } from "@/features/admin/lib/logistics";
import { formatPrice } from "@/features/products/lib/format";
import { formatBdPhone } from "@/features/orders/lib/phone";

/**
 * Shipments that have been in transit longer than the shop promises.
 *
 * "Longer than promised" is read from the delivery window in Settings rather
 * than hardcoded, so this table and the courier window quoted at checkout can
 * never disagree about what late means.
 *
 * Deliberately read-only. Every row here needs a phone call, not a status
 * change — marking a late order Delivered from a list, without having spoken to
 * anyone, is how an order gets closed that never arrived.
 */
export default function AgingShipments({
  rows,
  total,
  deliveryDaysMax,
}: {
  rows: DispatchRow[];
  total: number;
  deliveryDaysMax: number;
}) {
  if (rows.length === 0) {
    return (
      <div className="border-border text-muted-foreground border p-12 text-center text-sm">
        Nothing has been in transit longer than {deliveryDaysMax} days.
      </div>
    );
  }

  return (
    <div className="border-destructive/40 border">
      <div className="border-destructive/40 bg-destructive/10 border-b px-5 py-4">
        <p className="text-destructive text-sm">
          {total} shipment{total === 1 ? "" : "s"} past the {deliveryDaysMax}
          -day window
          {total > rows.length && ` · showing the oldest ${rows.length}`}. Each
          of these needs a call to the courier or the customer.
        </p>
      </div>

      <div className="overflow-x-auto">
        <Table className="min-w-3xl">
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">In transit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.orderNumber}>
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
                  {formatPrice(row.totalAmount)}
                </TableCell>
                <TableCell className="text-destructive text-right tabular-nums">
                  {row.daysWaiting}d
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
