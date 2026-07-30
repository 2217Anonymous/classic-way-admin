"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Download, Printer, Truck } from "lucide-react";

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
import {
  cancelOrder,
  fetchOrders,
  markOrderPaid,
  updateOrderStatus,
} from "@/store/ordersSlice";
import { createShipment, fetchShipments } from "@/store/shipmentsSlice";

type SortKey = "order" | "customer" | "status" | "payment" | "total" | "placed";

const ORDER_STATUS_TONE: Record<
  OrderStatus,
  "success" | "danger" | "warning" | "neutral" | "info"
> = {
  draft: "neutral",
  pending: "neutral",
  paid: "info",
  processing: "info",
  shipped: "info",
  delivered: "success",
  cancelled: "danger",
  refunded: "warning",
  returned: "warning",
};

const STATUS_TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
  { value: "returned", label: "Returned" },
];

const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  draft: ["pending", "paid", "cancelled"],
  pending: ["paid", "processing", "cancelled"],
  paid: ["processing", "cancelled", "refunded"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["returned", "refunded"],
  returned: ["refunded"],
  cancelled: [],
  refunded: [],
};

const INVOICE_STORAGE_KEY = "cw_invoice_settings";

type InvoiceSettings = {
  company_name: string;
  gstin: string;
  invoice_prefix: string;
  next_number: string;
  footer_note: string;
  show_tax_breakdown: boolean;
};

const DEFAULT_INVOICE: InvoiceSettings = {
  company_name: "Classic Way Retail Pvt Ltd",
  gstin: "33AAAAA0000A1Z5",
  invoice_prefix: "CW-INV-",
  next_number: "1001",
  footer_note: "Thank you for shopping with Classic Way.",
  show_tax_breakdown: true,
};

function loadInvoiceSettings(): InvoiceSettings {
  if (typeof window === "undefined") return DEFAULT_INVOICE;
  try {
    const raw = localStorage.getItem(INVOICE_STORAGE_KEY);
    if (!raw) return DEFAULT_INVOICE;
    return { ...DEFAULT_INVOICE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_INVOICE;
  }
}

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

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function buildInvoiceHtml(order: Order, settings: InvoiceSettings) {
  const invoiceNo = `${settings.invoice_prefix}${settings.next_number}`;
  const address = order.shipping_address;
  const taxRows = settings.show_tax_breakdown
    ? `<tr><td>Tax</td><td style="text-align:right">${formatCurrency(order.tax_total)}</td></tr>`
    : "";
  const itemRows = order.items
    .map(
      (item) => `
      <tr>
        <td>
          <strong>${escapeHtml(item.product_name)}</strong>
          ${item.variant_label ? `<div style="color:#64748b;font-size:12px">${escapeHtml(item.variant_label)}</div>` : ""}
          ${item.sku ? `<div style="color:#94a3b8;font-size:11px">SKU: ${escapeHtml(item.sku)}</div>` : ""}
        </td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:right">${formatCurrency(item.unit_price)}</td>
        <td style="text-align:right">${formatCurrency(item.line_total)}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${escapeHtml(order.order_number)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Georgia, "Times New Roman", serif; color: #0f172a; margin: 0; padding: 32px; background: #fff; }
    h1 { font-size: 28px; margin: 0 0 4px; letter-spacing: 0.02em; }
    h2 { font-size: 16px; margin: 0; font-weight: 600; color: #334155; }
    .muted { color: #64748b; font-size: 13px; }
    .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
    .meta { text-align: right; font-size: 13px; line-height: 1.6; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
    .box h3 { margin: 0 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; border-bottom: 1px solid #cbd5e1; padding: 8px 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; }
    td { padding: 10px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    .totals { margin-left: auto; width: 260px; margin-top: 20px; font-size: 13px; }
    .totals td { border: none; padding: 4px 0; }
    .totals .grand td { border-top: 1px solid #0f172a; padding-top: 10px; font-weight: 700; font-size: 15px; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; }
    @media print {
      body { padding: 12px; }
      @page { margin: 16mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${escapeHtml(settings.company_name)}</h1>
      ${settings.gstin ? `<p class="muted">GSTIN: ${escapeHtml(settings.gstin)}</p>` : ""}
    </div>
    <div class="meta">
      <h2>Tax Invoice</h2>
      <div>Invoice #: <strong>${escapeHtml(invoiceNo)}</strong></div>
      <div>Order #: <strong>${escapeHtml(order.order_number)}</strong></div>
      <div>Date: ${escapeHtml(formatDate(order.placed_at))}</div>
      <div>Status: ${escapeHtml(statusLabel(order.status))}</div>
      <div>Payment: ${escapeHtml(order.payment_method === "cod" ? "Cash on delivery" : "Razorpay")} (${escapeHtml(order.payment_status)})</div>
    </div>
  </div>

  <div class="grid">
    <div class="box">
      <h3>Bill / Ship to</h3>
      <div><strong>${escapeHtml(address.full_name || order.customer_name)}</strong></div>
      <div class="muted">${escapeHtml(order.customer_email || "")}</div>
      <div class="muted">${escapeHtml(address.phone || order.customer_phone || "")}</div>
      <div>${escapeHtml(address.line1)}${address.line2 ? `, ${escapeHtml(address.line2)}` : ""}</div>
      <div>${escapeHtml(address.city)}, ${escapeHtml(address.state)} ${escapeHtml(address.postal_code)}</div>
      <div>${escapeHtml(address.country || "India")}</div>
    </div>
    <div class="box">
      <h3>Order notes</h3>
      <div class="muted">${escapeHtml(order.notes || "—")}</div>
      ${order.coupon_code ? `<div style="margin-top:8px">Coupon: <strong>${escapeHtml(order.coupon_code)}</strong></div>` : ""}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th style="text-align:center">Qty</th>
        <th style="text-align:right">Unit</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <table class="totals">
    <tbody>
      <tr><td>Subtotal</td><td style="text-align:right">${formatCurrency(order.subtotal)}</td></tr>
      ${order.discount_total > 0 ? `<tr><td>Discount</td><td style="text-align:right">-${formatCurrency(order.discount_total)}</td></tr>` : ""}
      <tr><td>Shipping</td><td style="text-align:right">${formatCurrency(order.shipping_total)}</td></tr>
      ${taxRows}
      <tr class="grand"><td>Total</td><td style="text-align:right">${formatCurrency(order.grand_total)}</td></tr>
    </tbody>
  </table>

  <div class="footer">${escapeHtml(settings.footer_note)}</div>
  <script>
    window.onload = function () {
      setTimeout(function () { window.focus(); window.print(); }, 250);
    };
  </script>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function openInvoicePrint(order: Order) {
  const html = buildInvoiceHtml(order, loadInvoiceSettings());
  const popup = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!popup) {
    throw new Error("Pop-up blocked. Allow pop-ups to print or download the invoice.");
  }
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}

export function OrdersPanel() {
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector((state) => state.orders);
  const shipments = useAppSelector((state) => state.shipments.items);
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [nextStatus, setNextStatus] = useState<OrderStatus | "">("");
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

  useEffect(() => {
    if (!detailOrder) {
      setNextStatus("");
      setStatusNote("");
      return;
    }
    const options = NEXT_STATUSES[detailOrder.status] ?? [];
    setNextStatus(options[0] ?? "");
    setStatusNote("");
  }, [detailOrder?.id, detailOrder?.status]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: items.length };
    for (const tab of STATUS_TABS) {
      if (tab.value === "all") continue;
      counts[tab.value] = items.filter((row) => row.status === tab.value).length;
    }
    return counts;
  }, [items]);

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
      toastError(dispatch, "Could not mark as paid", result.error?.message ?? "Please try again.");
    }
  }

  async function handleStatusUpdate() {
    if (!detailOrder || !nextStatus) return;
    setBusyAction(true);
    const result = await dispatch(
      updateOrderStatus({
        id: detailOrder.id,
        status: nextStatus,
        note: statusNote.trim() || undefined,
      }),
    );
    setBusyAction(false);
    if (updateOrderStatus.fulfilled.match(result)) {
      toastSuccess(
        dispatch,
        "Status updated",
        `${detailOrder.order_number} is now ${statusLabel(nextStatus)}.`,
      );
    } else {
      toastError(
        dispatch,
        "Could not update status",
        result.error?.message ?? "Please try again.",
      );
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
      toastError(dispatch, "Could not cancel order", result.error?.message ?? "Please try again.");
    }
  }

  function handleInvoice(order: Order) {
    try {
      openInvoicePrint(order);
    } catch (err) {
      toastError(
        dispatch,
        "Invoice unavailable",
        err instanceof Error ? err.message : "Could not open print dialog.",
      );
    }
  }

  function shipmentForOrder(orderId: string) {
    return shipments.find((shipment) => shipment.order_id === orderId);
  }

  const nextOptions = detailOrder ? NEXT_STATUSES[detailOrder.status] ?? [] : [];
  const history = useMemo(() => {
    if (!detailOrder?.status_history?.length) return [];
    return [...detailOrder.status_history].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [detailOrder]);

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

        <div className="flex gap-1 overflow-x-auto border-b border-[var(--card-border)] px-3 pt-3">
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.value;
            const count = statusCounts[tab.value] ?? 0;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.value);
                  table.setPage(1);
                }}
                className={`shrink-0 border-b-2 px-3 py-2 text-sm font-semibold transition ${
                  active
                    ? "border-[var(--brand,#405189)] text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
                <span
                  className={`ml-2 inline-flex min-w-5 items-center justify-center px-1.5 text-xs font-semibold ${
                    active
                      ? "bg-[var(--brand,#405189)] text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <TableToolbar
          search={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder="Search order # or customer..."
          filters={
            <>
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
        description="Line items, address, status history, and invoice actions."
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
                {detailOrder.coupon_code && (
                  <p className="mt-2 text-xs text-slate-500">
                    Coupon: <span className="font-semibold text-slate-700">{detailOrder.coupon_code}</span>
                  </p>
                )}
                {detailOrder.notes && (
                  <p className="mt-1 text-xs text-slate-500">Notes: {detailOrder.notes}</p>
                )}
              </div>
              <div className="border border-[var(--card-border)] p-3">
                <p className="text-xs font-semibold uppercase text-slate-400">Shipping address</p>
                <p className="mt-1 font-medium">
                  {detailOrder.shipping_address?.full_name || detailOrder.customer_name}
                </p>
                <p className="text-sm text-slate-500">
                  {detailOrder.shipping_address?.line1}
                  {detailOrder.shipping_address?.line2
                    ? `, ${detailOrder.shipping_address.line2}`
                    : ""}
                </p>
                <p className="text-sm text-slate-500">
                  {detailOrder.shipping_address?.city}, {detailOrder.shipping_address?.state}{" "}
                  {detailOrder.shipping_address?.postal_code}
                </p>
                <p className="text-sm text-slate-500">
                  {detailOrder.shipping_address?.phone || detailOrder.customer_phone}
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
                        {item.sku && (
                          <p className="text-xs text-slate-400">SKU: {item.sku}</p>
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

            <div className="border border-[var(--card-border)] p-3">
              <p className="text-xs font-semibold uppercase text-slate-400">Status history</p>
              {history.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No status history yet.</p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {history.map((entry) => (
                    <li key={entry.id} className="flex gap-3 text-sm">
                      <span className="mt-1 size-2 shrink-0 rounded-full bg-[var(--brand,#405189)]" />
                      <div>
                        <p className="font-medium capitalize text-slate-800">
                          {entry.from_status
                            ? `${statusLabel(entry.from_status)} → ${statusLabel(entry.to_status)}`
                            : statusLabel(entry.to_status)}
                        </p>
                        {entry.note && (
                          <p className="text-xs text-slate-500">{entry.note}</p>
                        )}
                        <p className="text-xs text-slate-400">{formatDate(entry.created_at)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {nextOptions.length > 0 && (
              <div className="space-y-3 border border-[var(--card-border)] p-3">
                <p className="text-xs font-semibold uppercase text-slate-400">Update status</p>
                <div className="grid gap-3 sm:grid-cols-[1fr_1.2fr_auto]">
                  <label className="block">
                    <span className="vz-label">Next status</span>
                    <select
                      className="form-input"
                      value={nextStatus}
                      onChange={(event) => setNextStatus(event.target.value as OrderStatus)}
                    >
                      {nextOptions.map((status) => (
                        <option key={status} value={status}>
                          {statusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="vz-label">Note (optional)</span>
                    <input
                      className="form-input"
                      value={statusNote}
                      onChange={(event) => setStatusNote(event.target.value)}
                      placeholder="e.g. Packed and handed to courier"
                    />
                  </label>
                  <div className="flex items-end">
                    <button
                      type="button"
                      disabled={busyAction || !nextStatus}
                      onClick={() => void handleStatusUpdate()}
                      className="primary-button w-full sm:w-auto"
                    >
                      {busyAction ? "Updating..." : "Update"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--card-border)] pt-4">
              <button
                type="button"
                onClick={() => handleInvoice(detailOrder)}
                className="glass-secondary-button"
              >
                <Printer size={15} /> Print invoice
              </button>
              <button
                type="button"
                onClick={() => handleInvoice(detailOrder)}
                className="glass-secondary-button"
              >
                <Download size={15} /> Download invoice
              </button>
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
                detailOrder.status !== "refunded" &&
                detailOrder.status !== "returned" &&
                detailOrder.status !== "shipped" && (
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
