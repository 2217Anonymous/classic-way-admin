"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Truck } from "lucide-react";

import { ActionIconButtons } from "@/components/ActionIconButtons";
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
import type { Order, OrderStatus } from "@/lib/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { cancelOrder, fetchOrders, markOrderPaid } from "@/store/ordersSlice";
import { createShipment, fetchShipments } from "@/store/shipmentsSlice";

type SortKey = "order" | "customer" | "status" | "payment" | "total" | "placed";

const ORDER_STATUS_TONE: Record<
  OrderStatus,
  "success" | "danger" | "warning" | "neutral" | "info"
> = {
  pending: "neutral",
  paid: "info",
  processing: "info",
  shipped: "info",
  delivered: "success",
  cancelled: "danger",
  refunded: "warning",
};

function formatCurrency(value: number) {
  return `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrdersPanel() {
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector((state) => state.orders);
  const shipments = useAppSelector((state) => state.shipments.items);
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [busyAction, setBusyAction] = useState(false);

  useEffect(() => {
    void dispatch(fetchOrders());
    void dispatch(fetchShipments());
  }, [dispatch]);

  useEffect(() => {
    if (error) toastError(dispatch, "Request failed", error);
  }, [error, dispatch]);

  useEffect(() => {
    if (!detailOrder) return;
    const fresh = items.find((item) => item.id === detailOrder.id);
    if (fresh) setDetailOrder(fresh);
  }, [items, detailOrder]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return items;
    return items.filter((row) => row.status === statusFilter);
  }, [items, statusFilter]);

  const matchesSearch = useCallback((row: Order, query: string) => {
    return [row.order_number, row.customer_name, row.customer_email]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
  }, []);

  const getSortValue = useCallback((row: Order, key: SortKey) => {
    switch (key) {
      case "order":
        return row.order_number;
      case "customer":
        return row.customer_name;
      case "status":
        return row.status;
      case "payment":
        return row.payment_status;
      case "total":
        return row.grand_total;
      case "placed":
        return row.placed_at;
      default:
        return row.order_number;
    }
  }, []);

  const table = useTableState<Order, SortKey>({
    rows: filtered,
    initialSort: { key: "placed", direction: "desc" },
    getSortValue,
    matchesSearch,
  });

  async function handleMarkPaid(order: Order) {
    setBusyAction(true);
    const result = await dispatch(markOrderPaid(order.id));
    setBusyAction(false);
    if (markOrderPaid.fulfilled.match(result)) {
      toastSuccess(dispatch, "Order marked paid", `${order.order_number} payment recorded.`);
    } else {
      toastError(dispatch, "Could not mark as paid", "Please try again.");
    }
  }

  async function handleCreateShipment(order: Order) {
    setBusyAction(true);
    const result = await dispatch(
      createShipment({ order_id: order.id, carrier: "Delhivery" }),
    );
    setBusyAction(false);
    if (createShipment.fulfilled.match(result)) {
      toastSuccess(dispatch, "Shipment created", `Tracking ${result.payload.tracking_number} generated.`);
    } else {
      toastError(dispatch, "Could not create shipment", "Please try again.");
    }
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    setBusyAction(true);
    const result = await dispatch(cancelOrder({ id: cancelTarget.id, reason: cancelReason.trim() || undefined }));
    setBusyAction(false);
    if (cancelOrder.fulfilled.match(result)) {
      toastSuccess(dispatch, "Order cancelled", `${cancelTarget.order_number} was cancelled.`);
      setCancelTarget(null);
      setCancelReason("");
    } else {
      toastError(dispatch, "Could not cancel order", "Please try again.");
    }
  }

  function shipmentForOrder(orderId: number) {
    return shipments.find((shipment) => shipment.order_id === orderId);
  }

  return (
    <>
      <section className="table-card">
        <div className="flex w-full items-center justify-between gap-3 border-b border-[var(--card-border)] px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Orders</h2>
            <p className="text-xs text-[var(--muted)]">
              Manage customer orders, payments and fulfillment.
            </p>
          </div>
        </div>

        <TableToolbar
          search={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder="Search order # or customer..."
          filters={
            <>
              <FilterSelect
                value={statusFilter}
                onChange={setStatusFilter}
                aria-label="Filter by status"
              >
                <option value="all">All status</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
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
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="table-head">
              <tr>
                <SortableTh label="Order #" sortKey="order" activeKey={table.sort.key} direction={table.sort.direction} onSort={table.toggleSort} />
                <SortableTh label="Customer" sortKey="customer" activeKey={table.sort.key} direction={table.sort.direction} onSort={table.toggleSort} />
                <SortableTh label="Status" sortKey="status" activeKey={table.sort.key} direction={table.sort.direction} onSort={table.toggleSort} />
                <SortableTh label="Payment" sortKey="payment" activeKey={table.sort.key} direction={table.sort.direction} onSort={table.toggleSort} />
                <SortableTh label="Total" sortKey="total" activeKey={table.sort.key} direction={table.sort.direction} onSort={table.toggleSort} />
                <SortableTh label="Placed" sortKey="placed" activeKey={table.sort.key} direction={table.sort.direction} onSort={table.toggleSort} />
                <StaticTh label="Actions" align="right" />
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    Loading orders…
                  </td>
                </tr>
              ) : table.pageRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    No orders found.
                  </td>
                </tr>
              ) : (
                table.pageRows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3.5 font-semibold">{row.order_number}</td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium">{row.customer_name}</p>
                      <p className="text-xs text-slate-500">{row.customer_email}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusPill
                        tone={ORDER_STATUS_TONE[row.status]}
                        label={row.status}
                        className="capitalize"
                      />
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      <span className="capitalize">{row.payment_status}</span>
                      <span className="text-xs text-slate-400"> · {row.payment_method === "cod" ? "COD" : "Razorpay"}</span>
                    </td>
                    <td className="px-4 py-3.5 font-semibold">{formatCurrency(row.grand_total)}</td>
                    <td className="px-4 py-3.5 text-slate-600">{formatDate(row.placed_at)}</td>
                    <td className="px-4 py-3.5">
                      <ActionIconButtons
                        viewLabel={`View ${row.order_number}`}
                        onView={() => setDetailOrder(row)}
                      />
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

      <Modal
        open={Boolean(detailOrder)}
        title={detailOrder ? `Order ${detailOrder.order_number}` : ""}
        description="Line items, addresses and fulfillment actions."
        onClose={() => setDetailOrder(null)}
        size="lg"
      >
        {detailOrder && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill
                tone={ORDER_STATUS_TONE[detailOrder.status]}
                label={detailOrder.status}
                className="capitalize"
              />
              <StatusPill
                tone="neutral"
                label={`Payment: ${detailOrder.payment_status}`}
                className="capitalize"
              />
              <StatusPill
                tone="neutral"
                label={
                  detailOrder.payment_method === "cod"
                    ? "Cash on delivery"
                    : "Razorpay"
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border border-[var(--card-border)] p-3">
                <p className="text-xs font-semibold uppercase text-slate-400">Customer</p>
                <p className="mt-1 font-medium">{detailOrder.customer_name}</p>
                <p className="text-sm text-slate-500">{detailOrder.customer_email}</p>
                <p className="text-sm text-slate-500">{detailOrder.customer_phone}</p>
              </div>
              <div className="border border-[var(--card-border)] p-3">
                <p className="text-xs font-semibold uppercase text-slate-400">Shipping address</p>
                <p className="mt-1 font-medium">{detailOrder.shipping_address.full_name}</p>
                <p className="text-sm text-slate-500">
                  {detailOrder.shipping_address.line1}
                  {detailOrder.shipping_address.line2 ? `, ${detailOrder.shipping_address.line2}` : ""}
                </p>
                <p className="text-sm text-slate-500">
                  {detailOrder.shipping_address.city}, {detailOrder.shipping_address.state} {detailOrder.shipping_address.postal_code}
                </p>
              </div>
            </div>

            <div className="border border-[var(--card-border)]">
              <table className="w-full text-left text-sm">
                <thead className="table-head">
                  <tr>
                    <StaticTh label="Item" />
                    <StaticTh label="Qty" />
                    <StaticTh label="Unit price" />
                    <StaticTh label="Total" align="right" />
                  </tr>
                </thead>
                <tbody>
                  {detailOrder.items.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <p className="font-medium">{item.product_name}</p>
                        {item.variant_label && (
                          <p className="text-xs text-slate-500">{item.variant_label}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">{item.quantity}</td>
                      <td className="px-4 py-3">{formatCurrency(item.unit_price)}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ml-auto max-w-xs space-y-1 text-sm">
              <SummaryRow label="Subtotal" value={detailOrder.subtotal} />
              {detailOrder.discount_total > 0 && (
                <SummaryRow label="Discount" value={-detailOrder.discount_total} />
              )}
              <SummaryRow label="Shipping" value={detailOrder.shipping_total} />
              <SummaryRow label="Tax" value={detailOrder.tax_total} />
              <div className="flex justify-between border-t border-[var(--card-border)] pt-2 font-bold">
                <span>Total</span>
                <span>{formatCurrency(detailOrder.grand_total)}</span>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--card-border)] pt-4">
              {detailOrder.payment_status === "pending" && (
                <button
                  type="button"
                  disabled={busyAction}
                  onClick={() => void handleMarkPaid(detailOrder)}
                  className="glass-secondary-button"
                >
                  Mark paid
                </button>
              )}
              {!shipmentForOrder(detailOrder.id) &&
                detailOrder.status !== "cancelled" &&
                detailOrder.status !== "refunded" && (
                  <button
                    type="button"
                    disabled={busyAction}
                    onClick={() => void handleCreateShipment(detailOrder)}
                    className="glass-secondary-button"
                  >
                    <Truck size={15} /> Create shipment
                  </button>
                )}
              {detailOrder.status !== "cancelled" &&
                detailOrder.status !== "delivered" &&
                detailOrder.status !== "refunded" && (
                  <button
                    type="button"
                    onClick={() => {
                      setCancelTarget(detailOrder);
                      setCancelReason("");
                    }}
                    className="bg-[#f06548] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e2553d]"
                  >
                    Cancel order
                  </button>
                )}
            </div>
          </div>
        )}
      </Modal>

      <CancelOrderModal
        order={cancelTarget}
        reason={cancelReason}
        setReason={setCancelReason}
        busy={busyAction}
        onCancel={() => setCancelTarget(null)}
        onConfirm={() => void confirmCancel()}
      />
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-slate-600">
      <span>{label}</span>
      <span>{formatCurrency(value)}</span>
    </div>
  );
}

function CancelOrderModal({
  order,
  reason,
  setReason,
  busy,
  onCancel,
  onConfirm,
}: {
  order: Order | null;
  reason: string;
  setReason: (value: string) => void;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  function submit(event: FormEvent) {
    event.preventDefault();
    onConfirm();
  }
  return (
    <Modal
      open={Boolean(order)}
      title="Cancel order"
      description={order ? `Cancel ${order.order_number}? This will refund the customer if already paid.` : undefined}
      onClose={onCancel}
      size="sm"
    >
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="vz-label">Reason (optional)</span>
          <textarea
            className="form-input min-h-20 resize-y"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. Customer requested cancellation"
          />
        </label>
        <div className="flex justify-end gap-2 border-t border-[var(--card-border)] pt-4">
          <button type="button" onClick={onCancel} className="glass-secondary-button">
            Keep order
          </button>
          <button
            type="submit"
            disabled={busy}
            className="bg-[#f06548] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e2553d] disabled:opacity-60"
          >
            {busy ? "Cancelling..." : "Cancel order"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
