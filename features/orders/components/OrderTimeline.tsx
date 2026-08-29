import {
  ORDER_STATUS_COPY,
  TRACKING_STEPS,
  type OrderStatus,
} from "@/features/orders/lib/order-status";
import type { OrderDTO } from "@/features/orders/lib/order-types";

/** Which timestamp on the order records each step being reached. */
const STEP_TIMESTAMP: Record<
  (typeof TRACKING_STEPS)[number],
  keyof Pick<OrderDTO, "placedAt" | "confirmedAt" | "shippedAt" | "deliveredAt">
> = {
  Pending: "placedAt",
  Confirmed: "confirmedAt",
  Shipped: "shippedAt",
  Delivered: "deliveredAt",
};

function formatStamp(iso: string | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * The vertical progress rail on /track, newest step at the top.
 *
 * Cancelled and Returned both stop the timeline rather than advancing through
 * it, so each gets its own notice instead of a rail frozen at whatever stage
 * the order left the sequence at.
 */
export default function OrderTimeline({ order }: { order: OrderDTO }) {
  if (order.status === "Cancelled" || order.status === "Returned") {
    const cancelled = order.status === "Cancelled";
    const stamp = formatStamp(cancelled ? order.cancelledAt : order.returnedAt);

    return (
      <div
        className={
          cancelled
            ? "border-destructive/40 bg-destructive/5 border p-6"
            : "border-outline-variant/40 bg-surface-container-low/40 border p-6"
        }
      >
        <p
          className={`text-[12px] font-semibold tracking-[0.1em] uppercase ${
            cancelled ? "text-destructive" : "text-on-surface-variant"
          }`}
        >
          {ORDER_STATUS_COPY[order.status].label}
        </p>
        <p className="text-on-surface-variant mt-2 text-[15px] leading-relaxed">
          {ORDER_STATUS_COPY[order.status].description}{" "}
          {cancelled
            ? "If this is a surprise, please call us. Nothing has been charged."
            : "If you're expecting a refund and haven't had it, please call us."}
        </p>
        {stamp && (
          <p className="text-on-surface-variant mt-3 text-[12px] font-semibold tracking-[0.1em] uppercase">
            {stamp}
          </p>
        )}
      </div>
    );
  }

  const reachedIndex = TRACKING_STEPS.indexOf(
    order.status as (typeof TRACKING_STEPS)[number],
  );
  // Newest first, matching the design.
  const steps = [...TRACKING_STEPS].reverse();

  return (
    <ol className="ml-1">
      {steps.map((step, position) => {
        const stepIndex = TRACKING_STEPS.indexOf(step);
        const reached = reachedIndex >= stepIndex;
        const isCurrent = reachedIndex === stepIndex;
        const stamp = formatStamp(order[STEP_TIMESTAMP[step]]);
        const isLast = position === steps.length - 1;

        return (
          <li
            key={step}
            className={`relative flex gap-6 ${isLast ? "" : "pb-10"} ${
              reached ? "" : "opacity-40"
            }`}
          >
            {/* The rail runs from this dot down to the next one. */}
            {!isLast && (
              <span
                aria-hidden="true"
                className="bg-outline-variant/40 absolute top-6 bottom-0 left-[3.5px] w-px"
              />
            )}
            <span
              aria-hidden="true"
              className={`border-foreground relative z-[1] mt-2 size-2 shrink-0 rounded-full border ${
                reached ? "bg-foreground" : "bg-background"
              }`}
            />
            <div className="flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3
                  className={`font-serif text-[18px] ${
                    isCurrent ? "text-foreground" : "text-on-surface-variant"
                  }`}
                >
                  {ORDER_STATUS_COPY[step as OrderStatus].label}
                </h3>
                {stamp && (
                  <span className="text-on-surface-variant text-[12px] font-semibold tracking-[0.1em] uppercase">
                    {stamp}
                  </span>
                )}
              </div>
              <p className="text-on-surface-variant mt-1 text-[15px] leading-relaxed">
                {reached
                  ? ORDER_STATUS_COPY[step as OrderStatus].description
                  : "Not yet reached."}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
