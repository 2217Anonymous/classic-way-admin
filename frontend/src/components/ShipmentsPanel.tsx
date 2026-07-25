"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, ListPlus, MapPin } from "lucide-react";

import {
  FilterSelect,
  SortableTh,
  StaticTh,
  TablePagination,
  TableToolbar,
} from "@/components/DataTableControls";
import { Modal } from "@/components/Modal";
import { StatusPill } from "@/components/StatusPill";
import { useTableState } from "@/hooks/useTableState";
import { toastError, toastSuccess } from "@/lib/toast";
import type { Shipment, ShipmentStatus } from "@/lib/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  addShipmentEvent,
  fetchShipments,
  schedulePickup,
} from "@/store/shipmentsSlice";

type SortKey = "order" | "carrier" | "status" | "updated";

const SHIPMENT_STATUS_TONE: Record<
  ShipmentStatus,
  "success" | "danger" | "warning" | "neutral" | "info"
> = {
  pending: "neutral",
  scheduled: "info",
  picked_up: "info",
  in_transit: "info",
  out_for_delivery: "info",
  delivered: "success",
  exception: "danger",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ShipmentsPanel() {
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector((state) => state.shipments);
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailShipment, setDetailShipment] = useState<Shipment | null>(null);
  const [scheduleTarget, setScheduleTarget] = useState<Shipment | null>(null);
  const [eventTarget, setEventTarget] = useState<Shipment | null>(null);

  useEffect(() => {
    void dispatch(fetchShipments());
  }, [dispatch]);

  useEffect(() => {
    if (error) toastError(dispatch, "Request failed", error);
  }, [error, dispatch]);

  useEffect(() => {
    if (!detailShipment) return;
    const fresh = items.find((item) => item.id === detailShipment.id);
    if (fresh) setDetailShipment(fresh);
  }, [items, detailShipment]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return items;
    return items.filter((row) => row.status === statusFilter);
  }, [items, statusFilter]);

  const matchesSearch = useCallback((row: Shipment, query: string) => {
    return [row.order_number, row.carrier, row.tracking_number]
      .join(" ")
      .toLowerCase()
      .includes(query);
  }, []);

  const getSortValue = useCallback((row: Shipment, key: SortKey) => {
    switch (key) {
      case "order":
        return row.order_number;
      case "carrier":
        return row.carrier;
      case "status":
        return row.status;
      case "updated":
        return row.updated_at;
      default:
        return row.order_number;
    }
  }, []);

  const table = useTableState<Shipment, SortKey>({
    rows: filtered,
    initialSort: { key: "updated", direction: "desc" },
    getSortValue,
    matchesSearch,
  });

  return (
    <>
      <section className="table-card">
        <div className="flex w-full items-center justify-between gap-3 border-b border-[var(--card-border)] px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Shipments</h2>
            <p className="text-xs text-[var(--muted)]">
              Track carrier pickups, transit events and deliveries.
            </p>
          </div>
        </div>

        <TableToolbar
          search={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder="Search order # or tracking..."
          filters={
            <>
              <FilterSelect value={statusFilter} onChange={setStatusFilter} aria-label="Filter by status">
                <option value="all">All status</option>
                <option value="pending">Pending</option>
                <option value="scheduled">Scheduled</option>
                <option value="picked_up">Picked up</option>
                <option value="in_transit">In transit</option>
                <option value="out_for_delivery">Out for delivery</option>
                <option value="delivered">Delivered</option>
                <option value="exception">Exception</option>
              </FilterSelect>
              <FilterSelect
                aria-label="Rows per page"
                value={String(table.pageSize)}
                onChange={(value) => table.setPageSize(Number(value))}
              >
                {table.pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </FilterSelect>
            </>
          }
        />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="table-head">
              <tr>
                <SortableTh label="Order #" sortKey="order" activeKey={table.sort.key} direction={table.sort.direction} onSort={table.toggleSort} />
                <SortableTh label="Carrier" sortKey="carrier" activeKey={table.sort.key} direction={table.sort.direction} onSort={table.toggleSort} />
                <StaticTh label="Tracking #" />
                <SortableTh label="Status" sortKey="status" activeKey={table.sort.key} direction={table.sort.direction} onSort={table.toggleSort} />
                <SortableTh label="Updated" sortKey="updated" activeKey={table.sort.key} direction={table.sort.direction} onSort={table.toggleSort} />
                <StaticTh label="Actions" align="right" />
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    Loading shipments…
                  </td>
                </tr>
              ) : table.pageRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    No shipments found.
                  </td>
                </tr>
              ) : (
                table.pageRows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3.5 font-semibold">{row.order_number}</td>
                    <td className="px-4 py-3.5">{row.carrier}</td>
                    <td className="px-4 py-3.5 text-slate-600">{row.tracking_number}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap items-center gap-1">
                        <StatusPill
                          tone={SHIPMENT_STATUS_TONE[row.status]}
                          label={row.status.replaceAll("_", " ")}
                          className="capitalize"
                        />
                        {row.exception_flag ? (
                          <StatusPill tone="danger" label="!" />
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{formatDate(row.updated_at)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="glass-secondary-button"
                          onClick={() => setDetailShipment(row)}
                        >
                          <MapPin size={14} /> Timeline
                        </button>
                        {row.status === "pending" && (
                          <button
                            type="button"
                            className="icon-button border border-[var(--card-border)]"
                            aria-label="Schedule pickup"
                            onClick={() => setScheduleTarget(row)}
                          >
                            <CalendarClock size={15} />
                          </button>
                        )}
                        <button
                          type="button"
                          className="icon-button border border-[var(--card-border)]"
                          aria-label="Add event"
                          onClick={() => setEventTarget(row)}
                        >
                          <ListPlus size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={table.page}
          pageCount={table.pageCount}
          onPageChange={table.setPage}
          filteredCount={table.filteredCount}
          pageSize={table.pageSize}
        />
      </section>

      <TimelineModal shipment={detailShipment} onClose={() => setDetailShipment(null)} />
      <SchedulePickupModal shipment={scheduleTarget} onClose={() => setScheduleTarget(null)} />
      <AddEventModal shipment={eventTarget} onClose={() => setEventTarget(null)} />
    </>
  );
}

export function TimelineModal({
  shipment,
  onClose,
}: {
  shipment: Shipment | null;
  onClose: () => void;
}) {
  return (
    <Modal
      open={Boolean(shipment)}
      title={shipment ? `Shipment for ${shipment.order_number}` : ""}
      description={shipment ? `${shipment.carrier} · ${shipment.tracking_number}` : undefined}
      onClose={onClose}
    >
      {shipment && (
        <div className="space-y-4">
          {shipment.exception_flag && (
            <div className="border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
              Exception: {shipment.exception_reason}
            </div>
          )}
          <ol className="space-y-4 border-l border-[var(--card-border)] pl-4">
            {[...shipment.events]
              .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
              .map((event) => (
                <li key={event.id} className="relative">
                  <span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-[var(--theme-green)]" />
                  <p className="text-sm font-semibold capitalize">{event.status.replaceAll("_", " ")}</p>
                  <p className="text-sm text-slate-600">{event.description}</p>
                  <p className="text-xs text-slate-400">
                    {formatDate(event.occurred_at)}
                    {event.location ? ` · ${event.location}` : ""}
                  </p>
                </li>
              ))}
          </ol>
        </div>
      )}
    </Modal>
  );
}

function SchedulePickupModal({
  shipment,
  onClose,
}: {
  shipment: Shipment | null;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const [busy, setBusy] = useState(false);
  const [pickupAt, setPickupAt] = useState("");

  useEffect(() => {
    if (!shipment) return;
    const soon = new Date(Date.now() + 4 * 60 * 60 * 1000);
    setPickupAt(soon.toISOString().slice(0, 16));
  }, [shipment]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!shipment) return;
    setBusy(true);
    const result = await dispatch(
      schedulePickup({ id: shipment.id, pickupAt: new Date(pickupAt).toISOString() }),
    );
    setBusy(false);
    if (schedulePickup.fulfilled.match(result)) {
      toastSuccess(dispatch, "Pickup scheduled", `Carrier will pick up ${shipment.order_number}.`);
      onClose();
    } else {
      toastError(dispatch, "Could not schedule pickup", "Please try again.");
    }
  }

  return (
    <Modal open={Boolean(shipment)} title="Schedule pickup" onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="vz-label">Pickup date &amp; time</span>
          <input
            className="form-input"
            type="datetime-local"
            required
            value={pickupAt}
            onChange={(event) => setPickupAt(event.target.value)}
          />
        </label>
        <div className="flex justify-end gap-2 border-t border-[var(--card-border)] pt-4">
          <button type="button" onClick={onClose} className="glass-secondary-button">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="primary-button">
            {busy ? "Scheduling..." : "Schedule pickup"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AddEventModal({
  shipment,
  onClose,
}: {
  shipment: Shipment | null;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<ShipmentStatus>("in_transit");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    if (!shipment) return;
    setStatus("in_transit");
    setDescription("");
    setLocation("");
  }, [shipment]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!shipment) return;
    setBusy(true);
    const result = await dispatch(
      addShipmentEvent({
        id: shipment.id,
        event: { status, description: description.trim(), location: location.trim() || null },
      }),
    );
    setBusy(false);
    if (addShipmentEvent.fulfilled.match(result)) {
      toastSuccess(dispatch, "Event added", `Timeline updated for ${shipment.order_number}.`);
      onClose();
    } else {
      toastError(dispatch, "Could not add event", "Please check the form and try again.");
    }
  }

  return (
    <Modal open={Boolean(shipment)} title="Add tracking event" onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="vz-label">Status</span>
          <select
            className="form-input"
            value={status}
            onChange={(event) => setStatus(event.target.value as ShipmentStatus)}
          >
            <option value="picked_up">Picked up</option>
            <option value="in_transit">In transit</option>
            <option value="out_for_delivery">Out for delivery</option>
            <option value="delivered">Delivered</option>
            <option value="exception">Exception</option>
          </select>
        </label>
        <label className="block">
          <span className="vz-label">Description</span>
          <input
            className="form-input"
            required
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="vz-label">Location (optional)</span>
          <input
            className="form-input"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />
        </label>
        <div className="flex justify-end gap-2 border-t border-[var(--card-border)] pt-4">
          <button type="button" onClick={onClose} className="glass-secondary-button">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="primary-button">
            {busy ? "Saving..." : "Add event"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
