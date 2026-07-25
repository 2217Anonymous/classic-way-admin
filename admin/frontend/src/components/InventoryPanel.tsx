"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Minus, Plus, Settings2 } from "lucide-react";

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
import type { InventoryItem } from "@/lib/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  adjustStock,
  fetchInventory,
  updateInventorySettings,
  updateLowStockThreshold,
} from "@/store/inventorySlice";

type SortKey = "product" | "stock" | "reserved" | "available" | "status";

export function InventoryPanel() {
  const dispatch = useAppDispatch();
  const { items, settings, loading, error } = useAppSelector(
    (state) => state.inventory,
  );
  const [statusFilter, setStatusFilter] = useState("all");
  const [adjustTarget, setAdjustTarget] = useState<InventoryItem | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    void dispatch(fetchInventory());
  }, [dispatch]);

  useEffect(() => {
    if (error) toastError(dispatch, "Request failed", error);
  }, [error, dispatch]);

  const filtered = useMemo(() => {
    return items.filter((row) => {
      if (statusFilter === "low") return row.is_low_stock;
      if (statusFilter === "out") return row.is_out_of_stock;
      if (statusFilter === "ok") return !row.is_low_stock && !row.is_out_of_stock;
      return true;
    });
  }, [items, statusFilter]);

  const matchesSearch = useCallback((row: InventoryItem, query: string) => {
    return [row.product_name, row.sku, row.variant_label]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
  }, []);

  const getSortValue = useCallback((row: InventoryItem, key: SortKey) => {
    switch (key) {
      case "product":
        return row.product_name;
      case "stock":
        return row.stock;
      case "reserved":
        return row.reserved;
      case "available":
        return row.available;
      case "status":
        return row.is_out_of_stock ? 0 : row.is_low_stock ? 1 : 2;
      default:
        return row.product_name;
    }
  }, []);

  const table = useTableState<InventoryItem, SortKey>({
    rows: filtered,
    initialSort: { key: "status", direction: "asc" },
    getSortValue,
    matchesSearch,
  });

  const lowCount = items.filter((row) => row.is_low_stock).length;
  const outCount = items.filter((row) => row.is_out_of_stock).length;

  return (
    <>
      <section className="mb-5 grid w-full gap-4 sm:grid-cols-3">
        <StatCard label="Tracked items" value={items.length} tone="slate" />
        <StatCard label="Low stock" value={lowCount} tone="amber" />
        <StatCard label="Out of stock" value={outCount} tone="rose" />
      </section>

      <section className="table-card">
        <div className="flex w-full items-center justify-between gap-3 border-b border-[var(--card-border)] px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Inventory</h2>
            <p className="text-xs text-[var(--muted)]">
              Track stock levels and get alerted before you run out.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="glass-secondary-button"
          >
            <Settings2 size={16} /> Threshold settings
          </button>
        </div>

        <TableToolbar
          search={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder="Search by product or SKU..."
          filters={
            <>
              <FilterSelect
                value={statusFilter}
                onChange={setStatusFilter}
                aria-label="Filter by stock status"
              >
                <option value="all">All stock</option>
                <option value="ok">In stock</option>
                <option value="low">Low stock</option>
                <option value="out">Out of stock</option>
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
                <SortableTh
                  label="Product"
                  sortKey="product"
                  activeKey={table.sort.key}
                  direction={table.sort.direction}
                  onSort={table.toggleSort}
                />
                <StaticTh label="SKU / Variant" />
                <SortableTh
                  label="Stock"
                  sortKey="stock"
                  activeKey={table.sort.key}
                  direction={table.sort.direction}
                  onSort={table.toggleSort}
                />
                <SortableTh
                  label="Reserved"
                  sortKey="reserved"
                  activeKey={table.sort.key}
                  direction={table.sort.direction}
                  onSort={table.toggleSort}
                />
                <SortableTh
                  label="Available"
                  sortKey="available"
                  activeKey={table.sort.key}
                  direction={table.sort.direction}
                  onSort={table.toggleSort}
                />
                <SortableTh
                  label="Status"
                  sortKey="status"
                  activeKey={table.sort.key}
                  direction={table.sort.direction}
                  onSort={table.toggleSort}
                />
                <StaticTh label="Actions" align="right" />
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    Loading inventory…
                  </td>
                </tr>
              ) : table.pageRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    No inventory items found.
                  </td>
                </tr>
              ) : (
                table.pageRows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        {row.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.image_url}
                            alt={row.product_name}
                            className="size-10 shrink-0 border border-[var(--card-border)] object-cover"
                          />
                        ) : (
                          <span className="grid size-10 shrink-0 place-items-center border border-[var(--card-border)] bg-slate-50 text-xs text-slate-400">
                            No img
                          </span>
                        )}
                        <p className="min-w-0 truncate font-medium">{row.product_name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {row.sku ?? "—"}
                      {row.variant_label ? ` · ${row.variant_label}` : ""}
                    </td>
                    <td className="px-4 py-3.5">{row.stock}</td>
                    <td className="px-4 py-3.5 text-slate-600">{row.reserved}</td>
                    <td className="px-4 py-3.5 font-semibold">{row.available}</td>
                    <td className="px-4 py-3.5">
                      <StatusPill
                        tone={
                          row.is_out_of_stock
                            ? "danger"
                            : row.is_low_stock
                              ? "warning"
                              : "success"
                        }
                        label={
                          row.is_out_of_stock
                            ? "Out of stock"
                            : row.is_low_stock
                              ? "Low stock"
                              : "In stock"
                        }
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setAdjustTarget(row)}
                          className="glass-secondary-button"
                        >
                          Adjust stock
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

      <AdjustStockModal item={adjustTarget} onClose={() => setAdjustTarget(null)} />
      <InventorySettingsModal
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}

function AdjustStockModal({
  item,
  onClose,
}: {
  item: InventoryItem | null;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [amount, setAmount] = useState("1");
  const [reason, setReason] = useState("");
  const [threshold, setThreshold] = useState("15");

  useEffect(() => {
    if (!item) return;
    setMode("add");
    setAmount("1");
    setReason("");
    setThreshold(String(item.low_stock_threshold));
  }, [item]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!item) return;
    setBusy(true);
    const delta = (Number(amount) || 0) * (mode === "add" ? 1 : -1);
    const result = await dispatch(adjustStock({ id: item.id, delta, reason: reason.trim() }));
    if (adjustStock.fulfilled.match(result)) {
      const newThreshold = Number(threshold);
      if (!Number.isNaN(newThreshold) && newThreshold !== item.low_stock_threshold) {
        await dispatch(updateLowStockThreshold({ id: item.id, threshold: newThreshold }));
      }
      toastSuccess(dispatch, "Stock updated", `${item.product_name} inventory adjusted.`);
      onClose();
    } else {
      toastError(
        dispatch,
        "Could not adjust stock",
        result.error?.message ?? "Please check the form and try again.",
      );
    }
    setBusy(false);
  }

  return (
    <Modal
      open={Boolean(item)}
      title="Adjust stock"
      description={item ? `${item.product_name}${item.variant_label ? ` · ${item.variant_label}` : ""}` : undefined}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("add")}
            className={`flex-1 border px-3 py-2.5 text-sm font-semibold ${
              mode === "add"
                ? "border-[var(--theme-green)] bg-[var(--theme-green-soft)] text-[var(--theme-green)]"
                : "border-[var(--card-border)] text-slate-600"
            }`}
          >
            <Plus size={14} className="mr-1 inline" /> Add stock
          </button>
          <button
            type="button"
            onClick={() => setMode("remove")}
            className={`flex-1 border px-3 py-2.5 text-sm font-semibold ${
              mode === "remove"
                ? "border-[#f06548] bg-[#fef4f2] text-[#f06548]"
                : "border-[var(--card-border)] text-slate-600"
            }`}
          >
            <Minus size={14} className="mr-1 inline" /> Remove stock
          </button>
        </div>
        <label className="block">
          <span className="vz-label">Quantity</span>
          <input
            className="form-input"
            type="number"
            min={1}
            required
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="vz-label">Reason</span>
          <input
            className="form-input"
            required
            placeholder="e.g. New stock received, damaged goods, recount"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="vz-label">Low stock threshold</span>
          <input
            className="form-input"
            type="number"
            min={0}
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
          />
        </label>
        <div className="flex justify-end gap-2 border-t border-[var(--card-border)] pt-4">
          <button type="button" onClick={onClose} className="glass-secondary-button">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="primary-button">
            {busy ? "Saving..." : "Save adjustment"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function InventorySettingsModal({
  open,
  settings,
  onClose,
}: {
  open: boolean;
  settings: { default_low_stock_threshold: number; backorders_allowed: boolean };
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const [busy, setBusy] = useState(false);
  const [threshold, setThreshold] = useState(String(settings.default_low_stock_threshold));
  const [backorders, setBackorders] = useState(settings.backorders_allowed);

  useEffect(() => {
    if (!open) return;
    setThreshold(String(settings.default_low_stock_threshold));
    setBackorders(settings.backorders_allowed);
  }, [open, settings]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await dispatch(
      updateInventorySettings({
        default_low_stock_threshold: Number(threshold) || 0,
        backorders_allowed: backorders,
      }),
    );
    setBusy(false);
    if (updateInventorySettings.fulfilled.match(result)) {
      toastSuccess(dispatch, "Settings saved", "Inventory settings updated.");
      onClose();
    } else {
      toastError(dispatch, "Could not save settings", "Please try again.");
    }
  }

  return (
    <Modal
      open={open}
      title="Inventory settings"
      description="Defaults applied to new inventory items."
      onClose={onClose}
      size="sm"
    >
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="vz-label">Default low stock threshold</span>
          <input
            className="form-input"
            type="number"
            min={0}
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
          />
        </label>
        <label className="flex items-center justify-between border border-[var(--card-border)] px-3 py-3 text-sm font-medium">
          Allow backorders
          <input
            type="checkbox"
            role="switch"
            checked={backorders}
            onChange={(event) => setBackorders(event.target.checked)}
            className="form-switch"
          />
        </label>
        <div className="flex justify-end gap-2 border-t border-[var(--card-border)] pt-4">
          <button type="button" onClick={onClose} className="glass-secondary-button">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="primary-button">
            {busy ? "Saving..." : "Save settings"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "amber" | "rose";
}) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
  };
  return (
    <article className="table-card flex items-center gap-4 p-5">
      <span className={`grid size-12 place-items-center rounded-2xl ${tones[tone]}`}>
        {value}
      </span>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </article>
  );
}
