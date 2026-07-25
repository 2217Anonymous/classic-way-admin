"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Download,
  IndianRupee,
  PackageSearch,
  ReceiptText,
  ShoppingBag,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";

import { toastError, toastSuccess } from "@/lib/toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchOrders } from "@/store/ordersSlice";
import { fetchReports } from "@/store/reportsSlice";

function formatCurrency(value: number) {
  return `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? "");
          return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
        })
        .join(","),
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ReportsPanel() {
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector((state) => state.reports);
  const orders = useAppSelector((state) => state.orders.items);
  const [periodIndex, setPeriodIndex] = useState(0);

  useEffect(() => {
    void dispatch(fetchReports());
    void dispatch(fetchOrders());
  }, [dispatch]);

  useEffect(() => {
    if (error) toastError(dispatch, "Request failed", error);
  }, [error, dispatch]);

  const report = items[periodIndex] ?? items[0];

  function handleDownload() {
    if (!report) return;
    const orderRows: (string | number)[][] = [
      ["Order #", "Customer", "Status", "Payment status", "Payment method", "Total", "Placed at"],
      ...orders.map((order) => [
        order.order_number,
        order.customer_name,
        order.status,
        order.payment_status,
        order.payment_method,
        order.grand_total,
        order.placed_at,
      ]),
    ];
    downloadCsv(`classic-way-orders-${report.period.replaceAll(" ", "-").toLowerCase()}.csv`, orderRows);
    toastSuccess(dispatch, "Report downloaded", "CSV export saved to your downloads folder.");
  }

  return (
    <>
      <section className="table-card mb-5 flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex flex-wrap gap-2">
          {items.map((summary, index) => (
            <button
              key={summary.id}
              type="button"
              onClick={() => setPeriodIndex(index)}
              className={`border px-3.5 py-2 text-sm font-semibold ${
                index === periodIndex
                  ? "border-[var(--theme-green)] bg-[var(--theme-green-soft)] text-[var(--theme-green)]"
                  : "border-[var(--card-border)] text-slate-600"
              }`}
            >
              {summary.period}
            </button>
          ))}
        </div>
        <button type="button" onClick={handleDownload} disabled={!report} className="primary-button">
          <Download size={16} /> Download CSV
        </button>
      </section>

      {loading && items.length === 0 ? (
        <p className="p-10 text-center text-sm text-slate-500">Loading reports…</p>
      ) : report ? (
        <section className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total orders" value={report.total_orders.toLocaleString("en-IN")} icon={<ShoppingBag />} tone="cyan" />
          <KpiCard label="Total revenue" value={formatCurrency(report.total_revenue)} icon={<IndianRupee />} tone="emerald" />
          <KpiCard label="Avg. order value" value={formatCurrency(report.avg_order_value)} icon={<TrendingUp />} tone="violet" />
          <KpiCard label="Refunds" value={formatCurrency(report.total_refunds)} icon={<ReceiptText />} tone="rose" />
          <KpiCard label="New customers" value={report.new_customers.toLocaleString("en-IN")} icon={<Users />} tone="amber" />
          <KpiCard label="Low stock items" value={report.low_stock_items.toLocaleString("en-IN")} icon={<AlertTriangle />} tone="orange" />
          <KpiCard label="Pending shipments" value={report.pending_shipments.toLocaleString("en-IN")} icon={<Truck />} tone="blue" />
          <KpiCard label="Report generated" value={new Date(report.generated_at).toLocaleDateString("en-IN")} icon={<PackageSearch />} tone="slate" />
        </section>
      ) : (
        <p className="p-10 text-center text-sm text-slate-500">No report data available.</p>
      )}
    </>
  );
}

function KpiCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "cyan" | "emerald" | "violet" | "rose" | "amber" | "orange" | "blue" | "slate";
}) {
  const tones: Record<string, string> = {
    cyan: "bg-cyan-100 text-cyan-700",
    emerald: "bg-emerald-100 text-emerald-700",
    violet: "bg-violet-100 text-violet-700",
    rose: "bg-rose-100 text-rose-700",
    amber: "bg-amber-100 text-amber-700",
    orange: "bg-orange-100 text-orange-700",
    blue: "bg-blue-100 text-blue-700",
    slate: "bg-slate-100 text-slate-700",
  };
  return (
    <article className="table-card flex items-center gap-4 p-5">
      <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${tones[tone]}`}>{icon}</span>
      <div className="min-w-0">
        <p className="truncate text-xl font-bold">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </article>
  );
}
