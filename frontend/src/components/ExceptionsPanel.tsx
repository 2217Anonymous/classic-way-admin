"use client";

import { FormEvent, useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { ActionIconButtons } from "@/components/ActionIconButtons";
import { StaticTh } from "@/components/DataTableControls";
import { Modal } from "@/components/Modal";
import { TimelineModal } from "@/components/ShipmentsPanel";
import { toastError, toastSuccess } from "@/lib/toast";
import type { Shipment, ShipmentStatus } from "@/lib/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchShipments, overrideShipmentException } from "@/store/shipmentsSlice";

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ExceptionsPanel() {
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector((state) => state.shipments);
  const [detailShipment, setDetailShipment] = useState<Shipment | null>(null);
  const [overrideTarget, setOverrideTarget] = useState<Shipment | null>(null);

  useEffect(() => {
    void dispatch(fetchShipments());
  }, [dispatch]);

  useEffect(() => {
    if (error) toastError(dispatch, "Request failed", error);
  }, [error, dispatch]);

  const exceptions = items.filter((item) => item.exception_flag);

  return (
    <>
      <section className="table-card">
        <div className="flex w-full items-center justify-between gap-3 border-b border-[var(--card-border)] px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Delivery exceptions</h2>
            <p className="text-xs text-[var(--muted)]">
              Shipments that need manual review before they can continue.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">
            <AlertTriangle size={13} /> {exceptions.length} open
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="table-head">
              <tr>
                <StaticTh label="Order #" />
                <StaticTh label="Carrier" />
                <StaticTh label="Tracking #" />
                <StaticTh label="Exception reason" />
                <StaticTh label="Since" />
                <StaticTh label="Actions" align="right" />
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    Loading exceptions…
                  </td>
                </tr>
              ) : exceptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    No open exceptions. All shipments are on track.
                  </td>
                </tr>
              ) : (
                exceptions.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3.5 font-semibold">{row.order_number}</td>
                    <td className="px-4 py-3.5">{row.carrier}</td>
                    <td className="px-4 py-3.5 text-slate-600">{row.tracking_number}</td>
                    <td className="px-4 py-3.5 text-rose-700">{row.exception_reason}</td>
                    <td className="px-4 py-3.5 text-slate-600">{formatDate(row.updated_at)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end gap-1">
                        <ActionIconButtons
                          viewLabel="View timeline"
                          onView={() => setDetailShipment(row)}
                        />
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() => setOverrideTarget(row)}
                        >
                          Override
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <TimelineModal shipment={detailShipment} onClose={() => setDetailShipment(null)} />
      <OverrideModal shipment={overrideTarget} onClose={() => setOverrideTarget(null)} />
    </>
  );
}

function OverrideModal({
  shipment,
  onClose,
}: {
  shipment: Shipment | null;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [resolutionStatus, setResolutionStatus] = useState<ShipmentStatus>("in_transit");

  useEffect(() => {
    if (!shipment) return;
    setReason("");
    setResolutionStatus("in_transit");
  }, [shipment]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!shipment) return;
    setBusy(true);
    const result = await dispatch(
      overrideShipmentException({ id: shipment.id, reason: reason.trim(), resolutionStatus }),
    );
    setBusy(false);
    if (overrideShipmentException.fulfilled.match(result)) {
      toastSuccess(dispatch, "Exception overridden", `${shipment.order_number} resumed.`);
      onClose();
    } else {
      toastError(
        dispatch,
        "Could not override exception",
        result.error?.message ?? "Please provide a reason and try again.",
      );
    }
  }

  return (
    <Modal
      open={Boolean(shipment)}
      title="Override exception"
      description={shipment ? `${shipment.order_number} · ${shipment.tracking_number}` : undefined}
      onClose={onClose}
      size="sm"
    >
      <form onSubmit={submit} className="space-y-4">
        {shipment && (
          <div className="border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
            {shipment.exception_reason}
          </div>
        )}
        <label className="block">
          <span className="vz-label">Resume with status</span>
          <select
            className="form-input"
            value={resolutionStatus}
            onChange={(event) => setResolutionStatus(event.target.value as ShipmentStatus)}
          >
            <option value="in_transit">In transit</option>
            <option value="out_for_delivery">Out for delivery</option>
            <option value="delivered">Delivered</option>
          </select>
        </label>
        <label className="block">
          <span className="vz-label">Override reason</span>
          <textarea
            className="form-input min-h-24 resize-y"
            required
            placeholder="e.g. Verified address with customer over phone"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        <div className="flex justify-end gap-2 border-t border-[var(--card-border)] pt-4">
          <button type="button" onClick={onClose} className="glass-secondary-button">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="primary-button">
            {busy ? "Saving..." : "Override & resume"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
