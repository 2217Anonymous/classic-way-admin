"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Download,
  Eye,
  FileText,
  Filter,
  MapPin,
  PackageCheck,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
  Truck,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";

import { Modal } from "@/components/Modal";
import { StatusPill } from "@/components/StatusPill";
import { mediaUrl } from "@/lib/api";
import { toastError, toastSuccess } from "@/lib/toast";
import type {
  AdminCustomer,
  CreateOrderInput,
  Order,
  OrderStatus,
  Product,
  Shipment,
} from "@/lib/types";
import { fetchCustomers } from "@/store/customersSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  cancelOrder,
  createOrder,
  fetchOrders,
  markOrderPaid,
  updateOrderStatus,
} from "@/store/ordersSlice";
import { fetchProducts } from "@/store/productsSlice";
import { createShipment, fetchShipments } from "@/store/shipmentsSlice";

type ViewMode = "list" | "detail" | "invoice";
type HistoryTab = "all" | "delivered" | "pickups" | "returns" | "cancelled";

const STATUS_TONE: Record<
  OrderStatus,
  "success" | "danger" | "warning" | "neutral" | "info"
> = {
  draft: "neutral",
  pending: "warning",
  paid: "info",
  processing: "info",
  shipped: "info",
  delivered: "success",
  cancelled: "danger",
  refunded: "warning",
  returned: "warning",
};

const NEXT_STATUSES: Partial<Record<OrderStatus, OrderStatus[]>> = {
  draft: ["pending", "paid", "cancelled"],
  pending: ["paid", "processing", "cancelled"],
  paid: ["processing", "cancelled", "refunded"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["returned", "refunded"],
  returned: ["refunded"],
};

function money(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function dateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function label(value: string) {
  return value.replaceAll("_", " ");
}

function productImage(product?: Product) {
  return mediaUrl(product?.primary_image_url) ?? undefined;
}

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function OrderWorkspace() {
  const dispatch = useAppDispatch();
  const { items: orders, loading, error } = useAppSelector((state) => state.orders);
  const products = useAppSelector((state) => state.products.items);
  const customers = useAppSelector((state) => state.customers.items);
  const shipments = useAppSelector((state) => state.shipments.items);
  const [view, setView] = useState<ViewMode>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<HistoryTab>("all");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    void dispatch(fetchOrders());
    void dispatch(fetchShipments());
    void dispatch(fetchProducts());
    void dispatch(fetchCustomers());
  }, [dispatch]);

  useEffect(() => {
    if (error) toastError(dispatch, "Order request failed", error);
  }, [dispatch, error]);

  const selected = orders.find((order) => order.id === selectedId) ?? null;
  const shipment =
    shipments.find((entry) => entry.order_id === selected?.id) ?? null;

  const tabCounts = useMemo(
    () => ({
      all: orders.length,
      delivered: orders.filter((order) => order.status === "delivered").length,
      pickups: orders.filter((order) =>
        ["paid", "processing", "shipped"].includes(order.status),
      ).length,
      returns: orders.filter((order) =>
        ["returned", "refunded"].includes(order.status),
      ).length,
      cancelled: orders.filter((order) => order.status === "cancelled").length,
    }),
    [orders],
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return orders.filter((order) => {
      if (tab === "delivered" && order.status !== "delivered") return false;
      if (
        tab === "pickups" &&
        !["paid", "processing", "shipped"].includes(order.status)
      )
        return false;
      if (
        tab === "returns" &&
        !["returned", "refunded"].includes(order.status)
      )
        return false;
      if (tab === "cancelled" && order.status !== "cancelled") return false;
      if (statusFilter !== "all" && order.status !== statusFilter) return false;
      if (
        paymentFilter !== "all" &&
        order.payment_method !== paymentFilter &&
        order.payment_status !== paymentFilter
      )
        return false;
      if (
        dateFilter &&
        new Date(order.placed_at).toISOString().slice(0, 10) !== dateFilter
      )
        return false;
      if (
        needle &&
        ![
          order.order_number,
          order.customer_name,
          order.customer_email,
          order.items.map((item) => item.product_name).join(" "),
          order.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(needle)
      )
        return false;
      return true;
    });
  }, [orders, tab, search, dateFilter, paymentFilter, statusFilter]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageOrders = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const resultStart =
    filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const resultEnd = Math.min(currentPage * pageSize, filtered.length);

  function openOrder(order: Order) {
    setSelectedId(order.id);
    setView("detail");
  }

  function exportOrders() {
    const rows = [
      [
        "Order ID",
        "Customer",
        "Products",
        "Order Date",
        "Amount",
        "Payment",
        "Delivery Status",
      ],
      ...filtered.map((order) => [
        order.order_number,
        order.customer_name,
        order.items.map((item) => item.product_name).join(" | "),
        order.placed_at,
        order.grand_total,
        order.payment_method,
        order.status,
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    downloadText("classic-way-orders.csv", csv, "text/csv;charset=utf-8");
  }

  if (view === "invoice" && selected) {
    return (
      <InvoiceView
        order={selected}
        productById={(id) => products.find((product) => product.id === id)}
        onBack={() => setView("detail")}
      />
    );
  }

  if (view === "detail" && selected) {
    return (
      <OrderDetails
        order={selected}
        shipment={shipment}
        products={products}
        busy={busy}
        setBusy={setBusy}
        onBack={() => setView("list")}
        onInvoice={() => setView("invoice")}
      />
    );
  }

  return (
    <>
      <section className="order-module table-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--card-border)] px-4 py-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Order History</h2>
            <p className="mt-0.5 text-[10px] text-slate-500">
              Create, track and manage every customer order.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 bg-[#299cdb] px-3 py-2 text-xs font-semibold text-white hover:bg-[#238bc4]"
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={14} /> Create Order
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 bg-[#405189] px-3 py-2 text-xs font-semibold text-white hover:bg-[#364574]"
              onClick={exportOrders}
            >
              <FileText size={14} /> Export
            </button>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto border-b border-[var(--card-border)] px-4 pt-2">
          {(
            [
              ["all", "All Orders"],
              ["delivered", "Delivered"],
              ["pickups", "Pickups"],
              ["returns", "Returns"],
              ["cancelled", "Cancelled"],
            ] as [HistoryTab, string][]
          ).map(([value, text]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setTab(value);
                setPage(1);
              }}
              className={`relative inline-flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-[11px] font-bold ${
                tab === value
                  ? "text-[#0ab39c] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[#0ab39c]"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <HistoryTabIcon tab={value} />
              {text}
              {value === "pickups" && tabCounts[value] > 0 && (
                <span className="ml-0.5 rounded-sm bg-[#f06548] px-1.5 py-0.5 text-[9px] font-bold text-white">
                  {tabCounts[value]}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="border-b border-[var(--card-border)] p-4">
          <div className="grid gap-3 lg:grid-cols-[1.4fr_.55fr_.55fr_.55fr_auto]">
            <label className="relative block">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search order ID, customer, product or status..."
                className="form-input h-10 pl-9 text-xs"
              />
            </label>
            <label className="relative block">
              <CalendarDays
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="date"
                value={dateFilter}
                onChange={(event) => {
                  setDateFilter(event.target.value);
                  setPage(1);
                }}
                className="form-input h-10 pl-9 text-xs"
              />
            </label>
            <select
              className="form-input h-10 text-xs"
              value={paymentFilter}
              onChange={(event) => {
                setPaymentFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All payments</option>
              <option value="cod">Cash on delivery</option>
              <option value="razorpay">Razorpay</option>
              <option value="paid">Paid</option>
              <option value="pending">Payment pending</option>
            </select>
            <select
              className="form-input h-10 text-xs"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All statuses</option>
              {Object.keys(STATUS_TONE).map((status) => (
                <option key={status} value={status}>
                  {label(status)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setFiltersOpen((value) => !value)}
              className="inline-flex h-10 items-center justify-center gap-1.5 bg-[#299cdb] px-4 text-xs font-semibold text-white"
            >
              <Filter size={14} /> Filters
            </button>
          </div>
          {filtersOpen && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                className="text-xs font-semibold text-[#f06548]"
                onClick={() => {
                  setSearch("");
                  setDateFilter("");
                  setPaymentFilter("all");
                  setStatusFilter("all");
                  setPage(1);
                }}
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-[11px]">
            <thead className="bg-[#f3f6f9] text-[10px] font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" aria-label="Select all orders" />
                </th>
                <th className="px-3 py-3">Order ID</th>
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Product</th>
                <th className="px-3 py-3">Order Date</th>
                <th className="px-3 py-3 text-right">Amount</th>
                <th className="px-3 py-3">Payment Method</th>
                <th className="px-3 py-3">Delivery Status</th>
                <th className="px-3 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    Loading orders…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    No orders match these filters.
                  </td>
                </tr>
              ) : (
                pageOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-t border-slate-100 hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-3">
                      <input type="checkbox" aria-label={`Select ${order.order_number}`} />
                    </td>
                    <td className="px-3 py-3 font-semibold text-[#299cdb]">
                      <button type="button" onClick={() => openOrder(order)}>
                        #{order.order_number}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-slate-800">{order.customer_name}</p>
                      <p className="text-[10px] text-slate-400">
                        {order.customer_email || order.customer_phone || "Guest customer"}
                      </p>
                    </td>
                    <td className="max-w-[240px] px-3 py-3">
                      <p className="truncate font-medium text-slate-700">
                        {order.items[0]?.product_name || "No product"}
                      </p>
                      {order.items.length > 1 && (
                        <p className="text-[10px] text-slate-400">
                          +{order.items.length - 1} more item
                          {order.items.length > 2 ? "s" : ""}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{dateTime(order.placed_at)}</td>
                    <td className="px-3 py-3 text-right font-semibold">
                      {money(order.grand_total)}
                    </td>
                    <td className="px-3 py-3 capitalize text-slate-600">
                      {order.payment_method === "cod" ? "Cash on delivery" : "Razorpay"}
                    </td>
                    <td className="px-3 py-3">
                      <StatusPill
                        tone={STATUS_TONE[order.status]}
                        label={label(order.status)}
                        className="capitalize"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="p-1.5 text-[#299cdb] hover:bg-sky-50"
                          onClick={() => openOrder(order)}
                          aria-label={`View ${order.order_number}`}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          className="p-1.5 text-[#0ab39c] hover:bg-emerald-50"
                          onClick={() => openOrder(order)}
                          aria-label={`Edit ${order.order_number}`}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          disabled
                          className="p-1.5 text-[#f06548] opacity-40"
                          aria-label="Order deletion disabled"
                          title="Orders are retained for audit history"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--card-border)] px-4 py-3 text-[10px] text-slate-500">
          <span>
            Showing {resultStart} to {resultEnd} of {filtered.length} Results
          </span>
          <div className="flex items-center">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              className="border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Previous
            </button>
            {Array.from({ length: pageCount }, (_, index) => index + 1)
              .filter(
                (value) =>
                  value === 1 ||
                  value === pageCount ||
                  Math.abs(value - currentPage) <= 1,
              )
              .map((value, index, visible) => (
                <span key={value} className="flex">
                  {index > 0 && value - visible[index - 1] > 1 && (
                    <span className="grid min-w-8 place-items-center border-y border-slate-200">
                      …
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setPage(value)}
                    className={`min-w-8 border-y border-r border-slate-200 px-2 py-2 font-bold ${
                      value === currentPage
                        ? "bg-[#299cdb] text-white"
                        : "bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {value}
                  </button>
                </span>
              ))}
            <button
              type="button"
              disabled={currentPage === pageCount}
              onClick={() => setPage(Math.min(pageCount, currentPage + 1))}
              className="border-y border-r border-slate-200 bg-white px-3 py-2 font-semibold text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <CreateOrderModal
        open={createOpen}
        products={products}
        customers={customers}
        onClose={() => setCreateOpen(false)}
        onCreated={(order) => {
          setCreateOpen(false);
          openOrder(order);
        }}
      />
    </>
  );
}

function HistoryTabIcon({ tab }: { tab: HistoryTab }) {
  if (tab === "delivered") return <PackageCheck size={12} />;
  if (tab === "pickups") return <Truck size={12} />;
  if (tab === "returns") return <ArrowLeft size={12} />;
  if (tab === "cancelled") return <X size={12} />;
  return <FileText size={12} />;
}

function OrderDetails({
  order,
  shipment,
  products,
  busy,
  setBusy,
  onBack,
  onInvoice,
}: {
  order: Order;
  shipment: Shipment | null;
  products: Product[];
  busy: boolean;
  setBusy: (value: boolean) => void;
  onBack: () => void;
  onInvoice: () => void;
}) {
  const dispatch = useAppDispatch();
  const [nextStatus, setNextStatus] = useState<OrderStatus | "">(
    NEXT_STATUSES[order.status]?.[0] ?? "",
  );
  const history = [...order.status_history].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const nextStatuses = NEXT_STATUSES[order.status] ?? [];
  const effectiveNextStatus = nextStatuses.includes(nextStatus as OrderStatus)
    ? nextStatus
    : (nextStatuses[0] ?? "");

  async function changeStatus() {
    if (!effectiveNextStatus) return;
    setBusy(true);
    const result = await dispatch(
      updateOrderStatus({
        id: order.id,
        status: effectiveNextStatus,
        note: "Updated from order details",
      }),
    );
    setBusy(false);
    if (updateOrderStatus.fulfilled.match(result)) {
      toastSuccess(
        dispatch,
        "Order updated",
        `Status changed to ${label(effectiveNextStatus)}.`,
      );
    } else {
      toastError(dispatch, "Update failed", result.error.message || "Please try again.");
    }
  }

  async function markPaid() {
    setBusy(true);
    const result = await dispatch(markOrderPaid(order.id));
    setBusy(false);
    if (markOrderPaid.fulfilled.match(result)) {
      toastSuccess(dispatch, "Payment recorded", `${order.order_number} is paid.`);
    } else {
      toastError(dispatch, "Payment update failed", result.error.message || "Please try again.");
    }
  }

  async function makeShipment() {
    setBusy(true);
    const result = await dispatch(
      createShipment({ order_id: order.id, carrier: "Delhivery" }),
    );
    setBusy(false);
    if (createShipment.fulfilled.match(result)) {
      toastSuccess(dispatch, "Shipment created", result.payload.tracking_number);
    } else {
      toastError(dispatch, "Shipment failed", result.error.message || "Please try again.");
    }
  }

  async function cancel() {
    if (!window.confirm(`Cancel ${order.order_number}?`)) return;
    setBusy(true);
    const result = await dispatch(
      cancelOrder({ id: order.id, reason: "Cancelled by admin" }),
    );
    setBusy(false);
    if (cancelOrder.fulfilled.match(result)) {
      toastSuccess(dispatch, "Order cancelled", order.order_number);
    } else {
      toastError(dispatch, "Cancellation failed", result.error.message || "Please try again.");
    }
  }

  return (
    <div className="order-module space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="grid size-9 place-items-center border border-[var(--card-border)] bg-white text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-sm font-bold text-slate-800">
              Order #{order.order_number}
            </h2>
            <p className="text-xs text-slate-500">Placed {dateTime(order.placed_at)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onInvoice}
          className="inline-flex items-center gap-1.5 bg-[#405189] px-3 py-2 text-xs font-semibold text-white"
        >
          <Download size={14} /> Download Invoice
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(290px,1fr)]">
        <div className="space-y-4">
          <section className="table-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--card-border)] px-4 py-3">
              <h3 className="text-xs font-bold">Product Details</h3>
              <StatusPill
                tone={STATUS_TONE[order.status]}
                label={label(order.status)}
                className="capitalize"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[660px] text-[11px]">
                <thead className="bg-[#f3f6f9] text-[10px] font-bold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Product Details</th>
                    <th className="px-4 py-3 text-right">Item Price</th>
                    <th className="px-4 py-3 text-center">Quantity</th>
                    <th className="px-4 py-3 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => {
                    const product = products.find((entry) => entry.id === item.product_id);
                    const image = productImage(product);
                    return (
                      <tr key={item.id} className="border-t border-slate-100">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="size-11 shrink-0 border border-slate-200 bg-slate-50 bg-cover bg-center"
                              style={image ? { backgroundImage: `url("${image}")` } : undefined}
                            />
                            <div>
                              <p className="font-semibold text-slate-800">
                                {item.product_name}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {item.variant_label || item.sku || "Standard product"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">{money(item.unit_price)}</td>
                        <td className="px-4 py-3 text-center">{item.quantity}</td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {money(item.line_total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="ml-auto w-full max-w-sm space-y-2 border-t border-[var(--card-border)] p-4 text-xs">
              <DetailTotal label="Sub Total" value={order.subtotal} />
              <DetailTotal label="Discount" value={-order.discount_total} />
              <DetailTotal label="Shipping Charge" value={order.shipping_total} />
              <DetailTotal label="Estimated Tax" value={order.tax_total} />
              <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold">
                <span>Total (INR)</span>
                <span>{money(order.grand_total)}</span>
              </div>
            </div>
          </section>

          <section className="table-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--card-border)] px-4 py-3">
              <h3 className="text-xs font-bold">Order Status</h3>
              <div className="flex gap-2">
                {nextStatuses.length > 0 && (
                  <>
                    <select
                      value={effectiveNextStatus}
                      onChange={(event) =>
                        setNextStatus(event.target.value as OrderStatus)
                      }
                      className="form-input h-8 min-w-32 py-1 text-xs capitalize"
                    >
                      {nextStatuses.map((status) => (
                        <option key={status} value={status}>
                          {label(status)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={busy || !effectiveNextStatus}
                      onClick={() => void changeStatus()}
                      className="bg-[#299cdb] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Update Status
                    </button>
                  </>
                )}
                {order.payment_status === "pending" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void markPaid()}
                    className="bg-[#0ab39c] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    Mark Paid
                  </button>
                )}
              </div>
            </div>
            <div className="p-4">
              <div className="relative space-y-5 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-slate-200">
                {history.length === 0 ? (
                  <p className="text-xs text-slate-500">No status history recorded.</p>
                ) : (
                  history.map((entry, index) => (
                    <div key={entry.id} className="relative flex gap-3">
                      <span
                        className={`z-10 mt-0.5 size-[15px] rounded-full border-4 border-white ${
                          index === history.length - 1
                            ? "bg-[#0ab39c]"
                            : "bg-slate-300"
                        }`}
                      />
                      <div>
                        <p className="text-xs font-semibold capitalize text-slate-700">
                          {label(entry.to_status)}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {entry.note || "Order status updated"}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {dateTime(entry.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                {shipment?.events.map((event) => (
                  <div key={event.id} className="relative flex gap-3">
                    <span className="z-10 mt-0.5 size-[15px] rounded-full border-4 border-white bg-[#299cdb]" />
                    <div>
                      <p className="text-xs font-semibold capitalize text-slate-700">
                        {label(event.status)}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {event.description || "Shipment updated"}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {dateTime(event.occurred_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <InfoCard icon={<Truck size={16} />} title="Logistics Details">
            {shipment ? (
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-slate-700">{shipment.carrier}</p>
                <p className="text-slate-500">AWB: {shipment.tracking_number}</p>
                <StatusPill
                  tone={shipment.exception_flag ? "danger" : "info"}
                  label={label(shipment.status)}
                  className="mt-2 capitalize"
                />
              </div>
            ) : (
              <button
                type="button"
                disabled={busy || ["cancelled", "refunded"].includes(order.status)}
                onClick={() => void makeShipment()}
                className="bg-[#299cdb] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                Create Shipment
              </button>
            )}
          </InfoCard>
          <InfoCard icon={<UserRound size={16} />} title="Customer Details">
            <p className="text-xs font-semibold text-slate-700">{order.customer_name}</p>
            <p className="mt-1 text-[11px] text-slate-500">
              {order.customer_email || "Email not provided"}
            </p>
            <p className="text-[11px] text-slate-500">
              {order.customer_phone || "Phone not provided"}
            </p>
          </InfoCard>
          <InfoCard icon={<MapPin size={16} />} title="Shipping Address">
            <AddressBlock order={order} />
          </InfoCard>
          <InfoCard icon={<PackageCheck size={16} />} title="Billing Address">
            <AddressBlock order={order} billing />
          </InfoCard>
          <InfoCard icon={<WalletCards size={16} />} title="Payment Details">
            <div className="space-y-1 text-[11px] text-slate-500">
              <p>
                Method:{" "}
                <span className="font-semibold capitalize text-slate-700">
                  {order.payment_method === "cod" ? "Cash on delivery" : "Razorpay"}
                </span>
              </p>
              <p>
                Status:{" "}
                <span className="font-semibold capitalize text-slate-700">
                  {order.payment_status}
                </span>
              </p>
              <p>
                Total:{" "}
                <span className="font-semibold text-slate-700">
                  {money(order.grand_total)}
                </span>
              </p>
            </div>
          </InfoCard>
          {!["cancelled", "delivered", "refunded", "returned", "shipped"].includes(
            order.status,
          ) && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void cancel()}
              className="w-full bg-[#f06548] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              Cancel Order
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="table-card">
      <div className="flex items-center justify-between border-b border-[var(--card-border)] px-4 py-3">
        <h3 className="text-xs font-bold text-slate-700">{title}</h3>
        <span className="text-[#299cdb]">{icon}</span>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function AddressBlock({ order, billing = false }: { order: Order; billing?: boolean }) {
  const address = billing && order.billing_address
    ? order.billing_address
    : order.shipping_address;
  return (
    <div className="space-y-0.5 text-[11px] text-slate-500">
      <p className="font-semibold text-slate-700">
        {address?.full_name || order.customer_name}
      </p>
      <p>{address?.line1 || "Address not provided"}</p>
      {address?.line2 && <p>{address.line2}</p>}
      <p>
        {[address?.city, address?.state, address?.postal_code]
          .filter(Boolean)
          .join(", ")}
      </p>
      <p>{address?.country || "India"}</p>
    </div>
  );
}

function DetailTotal({ label: text, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-slate-600">
      <span>{text}</span>
      <span>{money(value)}</span>
    </div>
  );
}

type DraftLine = {
  key: string;
  productId: string;
  variantId: string;
  quantity: number;
};

function CreateOrderModal({
  open,
  products,
  customers,
  onClose,
  onCreated,
}: {
  open: boolean;
  products: Product[];
  customers: AdminCustomer[];
  onClose: () => void;
  onCreated: (order: Order) => void;
}) {
  const dispatch = useAppDispatch();
  const [customerId, setCustomerId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [payment, setPayment] = useState<"cod" | "razorpay">("cod");
  const [status, setStatus] = useState<"draft" | "pending" | "paid">("pending");
  const [shipping, setShipping] = useState("59");
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([
    { key: "initial-line", productId: "", variantId: "", quantity: 1 },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const subtotal = lines.reduce((sum, line) => {
    const product = products.find((entry) => entry.id === line.productId);
    const variant = product?.variants.find((entry) => entry.id === line.variantId);
    return sum + Number(variant?.price ?? product?.price ?? 0) * line.quantity;
  }, 0);
  const total =
    subtotal + Number(shipping || 0) + Number(tax || 0) - Number(discount || 0);

  function updateLine(key: string, changes: Partial<DraftLine>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...changes } : line)),
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const validLines = lines.filter((line) => line.productId);
    if (!name.trim() || validLines.length === 0) {
      toastError(dispatch, "Missing order details", "Choose a customer and product.");
      return;
    }
    const payload: CreateOrderInput = {
      customer_id: customerId || null,
      customer_name: name.trim(),
      customer_email: email.trim() || null,
      customer_phone: phone.trim() || null,
      items: validLines.map((line) => {
        const product = products.find((entry) => entry.id === line.productId)!;
        const variant = product.variants.find((entry) => entry.id === line.variantId);
        return {
          product_id: product.id,
          product_name: product.name,
          product_slug: product.slug,
          variant_id: variant?.id ?? null,
          variant_label: variant
            ? Object.values(variant.options).filter(Boolean).join(" / ")
            : null,
          sku: variant?.sku ?? product.sku,
          image_url: product.primary_image_url,
          unit_price: Number(variant?.price ?? product.price),
          quantity: Math.max(1, line.quantity),
        };
      }),
      shipping_address: {
        full_name: name.trim(),
        phone: phone.trim() || "Not provided",
        line1: line1.trim(),
        line2: line2.trim() || null,
        city: city.trim(),
        state: state.trim(),
        postal_code: postalCode.trim(),
        country: "India",
      },
      payment_method: payment,
      status,
      discount_total: Number(discount || 0),
      shipping_total: Number(shipping || 0),
      tax_total: Number(tax || 0),
      notes: notes.trim() || null,
    };
    setSubmitting(true);
    const result = await dispatch(createOrder(payload));
    setSubmitting(false);
    if (createOrder.fulfilled.match(result)) {
      toastSuccess(dispatch, "Order created", result.payload.order_number);
      onCreated(result.payload);
    } else {
      toastError(dispatch, "Could not create order", result.error.message || "Please try again.");
    }
  }

  return (
    <Modal
      open={open}
      title="Add Order"
      description="Create a manual order for an existing or guest customer."
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={submit} className="order-module space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Existing customer">
            <select
              className="form-input"
              value={customerId}
              onChange={(event) => {
                const id = event.target.value;
                setCustomerId(id);
                const customer = customers.find((entry) => entry.id === id);
                if (customer) {
                  setName(customer.full_name);
                  setEmail(customer.email);
                  setPhone(customer.phone || "");
                }
              }}
            >
              <option value="">Guest / manual customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.full_name} · {customer.email}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Customer name" required>
            <input
              className="form-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter name"
              required
            />
          </Field>
          <Field label="Email">
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="customer@example.com"
            />
          </Field>
          <Field label="Phone">
            <input
              className="form-input"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+91 98765 43210"
            />
          </Field>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="vz-label">Products</p>
            <button
              type="button"
              className="text-xs font-semibold text-[#299cdb]"
              onClick={() =>
                setLines((current) => [
                  ...current,
                  {
                    key: crypto.randomUUID(),
                    productId: "",
                    variantId: "",
                    quantity: 1,
                  },
                ])
              }
            >
              + Add item
            </button>
          </div>
          <div className="space-y-2">
            {lines.map((line) => {
              const product = products.find((entry) => entry.id === line.productId);
              return (
                <div
                  key={line.key}
                  className="grid gap-2 border border-[var(--card-border)] p-3 sm:grid-cols-[1fr_.7fr_90px_32px]"
                >
                  <select
                    className="form-input"
                    value={line.productId}
                    onChange={(event) =>
                      updateLine(line.key, {
                        productId: event.target.value,
                        variantId: "",
                      })
                    }
                    required
                  >
                    <option value="">Select product</option>
                    {products
                      .filter((entry) => entry.is_active)
                      .map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.name} · {money(Number(entry.price))}
                        </option>
                      ))}
                  </select>
                  <select
                    className="form-input"
                    value={line.variantId}
                    onChange={(event) =>
                      updateLine(line.key, { variantId: event.target.value })
                    }
                    disabled={!product?.variants.length}
                  >
                    <option value="">Standard</option>
                    {product?.variants
                      .filter((variant) => variant.is_active)
                      .map((variant) => (
                        <option key={variant.id} value={variant.id}>
                          {Object.values(variant.options).join(" / ")} · stock{" "}
                          {variant.stock}
                        </option>
                      ))}
                  </select>
                  <input
                    className="form-input"
                    type="number"
                    min={1}
                    max={1000}
                    value={line.quantity}
                    onChange={(event) =>
                      updateLine(line.key, {
                        quantity: Math.max(1, Number(event.target.value)),
                      })
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setLines((current) =>
                        current.length === 1
                          ? current
                          : current.filter((entry) => entry.key !== line.key),
                      )
                    }
                    className="grid size-8 place-items-center text-[#f06548]"
                    aria-label="Remove item"
                  >
                    <X size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Address line 1" required>
            <input
              className="form-input"
              value={line1}
              onChange={(event) => setLine1(event.target.value)}
              required
            />
          </Field>
          <Field label="Address line 2">
            <input
              className="form-input"
              value={line2}
              onChange={(event) => setLine2(event.target.value)}
            />
          </Field>
          <Field label="City" required>
            <input
              className="form-input"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              required
            />
          </Field>
          <Field label="State" required>
            <input
              className="form-input"
              value={state}
              onChange={(event) => setState(event.target.value)}
              required
            />
          </Field>
          <Field label="Postal code" required>
            <input
              className="form-input"
              value={postalCode}
              onChange={(event) => setPostalCode(event.target.value)}
              required
            />
          </Field>
          <Field label="Payment method">
            <select
              className="form-input"
              value={payment}
              onChange={(event) =>
                setPayment(event.target.value as "cod" | "razorpay")
              }
            >
              <option value="cod">Cash on delivery</option>
              <option value="razorpay">Razorpay</option>
            </select>
          </Field>
          <Field label="Delivery status">
            <select
              className="form-input"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as "draft" | "pending" | "paid")
              }
            >
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>
          </Field>
          <Field label="Shipping charge">
            <input
              className="form-input"
              type="number"
              min={0}
              value={shipping}
              onChange={(event) => setShipping(event.target.value)}
            />
          </Field>
          <Field label="Discount">
            <input
              className="form-input"
              type="number"
              min={0}
              value={discount}
              onChange={(event) => setDiscount(event.target.value)}
            />
          </Field>
          <Field label="Tax">
            <input
              className="form-input"
              type="number"
              min={0}
              value={tax}
              onChange={(event) => setTax(event.target.value)}
            />
          </Field>
        </div>
        <Field label="Notes">
          <textarea
            className="form-input min-h-20 resize-y"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--card-border)] pt-4">
          <div className="text-sm">
            <span className="text-slate-500">Order total: </span>
            <strong>{money(Math.max(0, total))}</strong>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="glass-secondary-button">
              Close
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-[#0ab39c] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Add Order"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function Field({
  label: text,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="vz-label">
        {text}
        {required && <span className="ml-0.5 text-[#f06548]">*</span>}
      </span>
      {children}
    </label>
  );
}

function InvoiceView({
  order,
  productById,
  onBack,
}: {
  order: Order;
  productById: (id: string) => Product | undefined;
  onBack: () => void;
}) {
  const invoiceNumber = `CW-INV-${order.order_number.replace("ORD-", "")}`;
  const invoiceHtml = useCallback(
    () => document.getElementById("invoice-document")?.outerHTML ?? "",
    [],
  );

  function standaloneInvoiceHtml(autoPrint = false) {
    return `<!doctype html><html><head><meta charset="utf-8"><title>${invoiceNumber}</title><script src="https://cdn.tailwindcss.com"></script><style>body{margin:0;background:#fff;font-family:Arial,sans-serif}@page{margin:12mm}</style></head><body>${invoiceHtml()}${autoPrint ? '<script>setTimeout(function(){window.focus();window.print()},900)</script>' : ""}</body></html>`;
  }

  function printInvoice() {
    const popup = window.open(
      "",
      "_blank",
      "noopener,noreferrer,width=1100,height=800",
    );
    if (!popup) return;
    popup.document.open();
    popup.document.write(standaloneInvoiceHtml(true));
    popup.document.close();
  }

  function downloadInvoice() {
    downloadText(
      `${invoiceNumber}.html`,
      standaloneInvoiceHtml(),
      "text/html;charset=utf-8",
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600"
        >
          <ArrowLeft size={16} /> Back to order
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={printInvoice}
            className="inline-flex items-center gap-1.5 bg-[#0ab39c] px-4 py-2 text-xs font-semibold text-white"
          >
            <Printer size={14} /> Print
          </button>
          <button
            type="button"
            onClick={downloadInvoice}
            className="inline-flex items-center gap-1.5 bg-[#299cdb] px-4 py-2 text-xs font-semibold text-white"
          >
            <Download size={14} /> Download
          </button>
        </div>
      </div>
      <article
        id="invoice-document"
        className="order-module mx-auto max-w-5xl bg-white p-6 text-slate-600 shadow-sm print:max-w-none print:p-0 print:shadow-none sm:p-10"
      >
        <header className="flex flex-wrap justify-between gap-8 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-2xl font-black tracking-wide text-slate-800">
              CLASSIC WAY
            </h1>
            <p className="mt-5 text-[10px] font-semibold uppercase text-slate-400">
              Address
            </p>
            <p className="mt-1">Chennai, Tamil Nadu, India</p>
            <p>PIN: 600001</p>
          </div>
          <div className="text-right leading-5">
            <p>GSTIN: 33AAAAA0000A1Z5</p>
            <p>Email: support@classicway.in</p>
            <p>Website: www.classicway.in</p>
            <p>Contact: +91 98765 43210</p>
          </div>
        </header>

        <div className="grid gap-5 border-b border-slate-200 py-5 sm:grid-cols-4">
          <InvoiceMeta label="Invoice No" value={invoiceNumber} />
          <InvoiceMeta label="Date" value={dateTime(order.placed_at)} />
          <div>
            <p className="text-[10px] font-semibold uppercase text-slate-400">
              Payment Status
            </p>
            <StatusPill
              tone={order.payment_status === "paid" ? "success" : "warning"}
              label={order.payment_status}
              className="mt-2 capitalize"
            />
          </div>
          <InvoiceMeta label="Total Amount" value={money(order.grand_total)} />
        </div>

        <div className="grid gap-8 py-6 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase text-slate-400">
              Billing Address
            </p>
            <div className="mt-2">
              <AddressBlock order={order} billing />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase text-slate-400">
              Shipping Address
            </p>
            <div className="mt-2">
              <AddressBlock order={order} />
            </div>
          </div>
        </div>

        <table className="w-full text-left">
          <thead className="bg-[#f3f6f9] text-[10px] uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3">#</th>
              <th className="px-3 py-3">Product Details</th>
              <th className="px-3 py-3 text-right">Rate</th>
              <th className="px-3 py-3 text-center">Quantity</th>
              <th className="px-3 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => {
              const product = productById(item.product_id);
              return (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="px-3 py-4 font-semibold">{String(index + 1).padStart(2, "0")}</td>
                  <td className="px-3 py-4">
                    <p className="font-semibold text-slate-800">{item.product_name}</p>
                    <p className="text-[10px] text-slate-400">
                      {item.variant_label || product?.short_description || item.sku}
                    </p>
                  </td>
                  <td className="px-3 py-4 text-right">{money(item.unit_price)}</td>
                  <td className="px-3 py-4 text-center">
                    {String(item.quantity).padStart(2, "0")}
                  </td>
                  <td className="px-3 py-4 text-right font-semibold">
                    {money(item.line_total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="ml-auto mt-5 max-w-sm space-y-2">
          <DetailTotal label="Sub Total" value={order.subtotal} />
          <DetailTotal label="Estimated Tax" value={order.tax_total} />
          <DetailTotal label="Discount" value={-order.discount_total} />
          <DetailTotal label="Shipping Charge" value={order.shipping_total} />
          <div className="flex justify-between border-t border-slate-200 pt-3 text-sm font-bold text-slate-800">
            <span>Total Amount</span>
            <span>{money(order.grand_total)}</span>
          </div>
        </div>

        <div className="mt-8">
          <p className="text-[10px] font-semibold uppercase text-slate-400">
            Payment Details
          </p>
          <p className="mt-2">
            Payment Method:{" "}
            <strong>
              {order.payment_method === "cod" ? "Cash on delivery" : "Razorpay"}
            </strong>
          </p>
          <p>
            Total Amount: <strong>{money(order.grand_total)}</strong>
          </p>
        </div>

        <footer className="mt-8 border border-sky-100 bg-sky-50 p-4 text-[10px] leading-5 text-sky-700">
          <strong>NOTES:</strong> Thank you for shopping with Classic Way. Please
          retain this invoice for returns, exchanges and warranty claims.
        </footer>
      </article>
    </div>
  );
}

function InvoiceMeta({ label: text, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase text-slate-400">{text}</p>
      <p className="mt-1 font-semibold text-slate-700">{value}</p>
    </div>
  );
}
