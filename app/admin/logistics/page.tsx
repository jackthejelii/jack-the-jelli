import { connection } from "next/server";

import { getDispatchQueue } from "@/features/admin/lib/logistics";
import AgingShipments from "@/features/admin/components/logistics/AgingShipments";
import DispatchQueue from "@/features/admin/components/logistics/DispatchQueue";

/**
 * Logistics — the fulfilment worklist.
 *
 * Deliberately not the reporting page. `/admin` answers "how is the shop
 * doing"; this answers "what has to leave the building today", and the two
 * want opposite things from their data. Reporting is cached for a few minutes
 * because a figure that is slightly behind is still a true figure. A dispatch
 * queue that is a few minutes behind shows an order somebody has already
 * packed — so nothing here is cached, and `connection()` says so out loud.
 *
 * Without it, Cache Components would try to prerender this page and fail on
 * the clock read inside the "how late is this shipment" comparison. It is what
 * `export const dynamic = "force-dynamic"` used to say.
 */
export default async function AdminLogisticsPage() {
  await connection();

  const queue = await getDispatchQueue();

  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-heading text-3xl tracking-widest">Logistics</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Orders waiting to go out, and shipments that have taken too long.
          </p>
        </div>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-foreground text-xl tracking-wide">
          Ready to dispatch
        </h2>
        <DispatchQueue rows={queue.ready} total={queue.readyTotal} />
      </section>

      {/* Only worth the space once there is a handoff to batch. */}
      {queue.byDistrict.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-heading text-foreground text-xl tracking-wide">
            Courier handoff by district
          </h2>
          <p className="text-muted-foreground -mt-2 text-sm">
            The same ready-to-ship orders, grouped the way the courier prices
            them.
          </p>
          <ul className="flex flex-wrap gap-2">
            {queue.byDistrict.map((row) => (
              <li
                key={row.district}
                className="border-border flex items-center gap-3 border px-4 py-2 text-sm"
              >
                <span>{row.district}</span>
                <span className="text-muted-foreground tabular-nums">
                  {row.orders}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-foreground text-xl tracking-wide">
          Overdue shipments
        </h2>
        <AgingShipments
          rows={queue.aging}
          total={queue.agingTotal}
          deliveryDaysMax={queue.deliveryDaysMax}
        />
      </section>
    </div>
  );
}
