import type { Shipment } from "@/lib/types";

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ShipmentTimeline({ shipment }: { shipment: Shipment }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border border-[var(--card-border)] p-3">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">Carrier</p>
          <p className="font-semibold">{shipment.carrier}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">Tracking #</p>
          <p className="font-semibold">{shipment.tracking_number}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">Status</p>
          <p className="font-semibold capitalize">{shipment.status.replaceAll("_", " ")}</p>
        </div>
      </div>

      {shipment.exception_flag && (
        <div className="border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
          There&apos;s an issue with this delivery: {shipment.exception_reason}. Our team is
          working to resolve it.
        </div>
      )}

      <ol className="space-y-4 border-l border-[var(--card-border)] pl-4">
        {[...shipment.events]
          .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
          .map((event) => (
            <li key={event.id} className="relative">
              <span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-[var(--theme-green)]" />
              <p className="text-sm font-semibold capitalize">
                {event.status.replaceAll("_", " ")}
              </p>
              <p className="text-sm text-slate-600">{event.description}</p>
              <p className="text-xs text-slate-400">
                {formatDate(event.occurred_at)}
                {event.location ? ` · ${event.location}` : ""}
              </p>
            </li>
          ))}
      </ol>
    </div>
  );
}
