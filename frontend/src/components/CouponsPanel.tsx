"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { ActionIconButtons } from "@/components/ActionIconButtons";
import {
  FilterSelect,
  SelectTd,
  SelectTh,
  SelectionBar,
  SortableTh,
  StaticTh,
  TablePagination,
  TableToolbar,
} from "@/components/DataTableControls";
import { StatusPill } from "@/components/StatusPill";
import { ConfirmDialog, Modal } from "@/components/Modal";
import { useRowSelection } from "@/hooks/useRowSelection";
import { useTableState } from "@/hooks/useTableState";
import { toastError, toastSuccess } from "@/lib/toast";
import type { Coupon, CouponInput } from "@/lib/types";
import {
  createCoupon,
  deleteCoupon,
  fetchCoupons,
  updateCoupon,
} from "@/store/couponsSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

type SortKey = "id" | "code" | "name" | "value" | "status";

function toLocalInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function CouponsPanel() {
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector((state) => state.coupons);
  const [formItem, setFormItem] = useState<Coupon | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    void dispatch(fetchCoupons());
  }, [dispatch]);

  useEffect(() => {
    if (error) toastError(dispatch, "Request failed", error);
  }, [error, dispatch]);

  const filtered = useMemo(() => {
    return items.filter((row) => {
      if (statusFilter === "active" && !row.is_active) return false;
      if (statusFilter === "inactive" && row.is_active) return false;
      return true;
    });
  }, [items, statusFilter]);

  const matchesSearch = useCallback((row: Coupon, query: string) => {
    return [row.code, row.name, row.discount_type]
      .join(" ")
      .toLowerCase()
      .includes(query);
  }, []);

  const getSortValue = useCallback((row: Coupon, key: SortKey) => {
    switch (key) {
      case "id":
        return row.id;
      case "code":
        return row.code;
      case "name":
        return row.name;
      case "value":
        return Number(row.discount_value);
      case "status":
        return row.is_active;
      default:
        return row.code;
    }
  }, []);

  const table = useTableState<Coupon, SortKey>({
    rows: filtered,
    initialSort: { key: "id", direction: "desc" },
    getSortValue,
    matchesSearch,
  });

  const getId = useCallback((row: Coupon) => row.id, []);
  const selection = useRowSelection(table.pageRows, getId);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await dispatch(deleteCoupon(deleteTarget.id));
    setDeleting(false);
    if (deleteCoupon.fulfilled.match(result)) {
      toastSuccess(dispatch, "Coupon deleted", `${deleteTarget.code} removed.`);
      setDeleteTarget(null);
      selection.clear();
    } else {
      toastError(dispatch, "Delete failed", "Could not delete coupon.");
    }
  }

  async function confirmBulkDelete() {
    if (selection.selectedIds.length === 0) return;
    setDeleting(true);
    let ok = 0;
    for (const id of selection.selectedIds) {
      const result = await dispatch(deleteCoupon(id));
      if (deleteCoupon.fulfilled.match(result)) ok += 1;
    }
    setDeleting(false);
    setBulkDeleteOpen(false);
    selection.clear();
    if (ok > 0) {
      toastSuccess(dispatch, "Coupons deleted", `${ok} coupon(s) removed.`);
    } else {
      toastError(dispatch, "Delete failed", "Could not delete coupons.");
    }
  }

  return (
    <>
      <section className="table-card">
        <div className="flex w-full items-center justify-between gap-3 border-b border-[var(--card-border)] px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Coupons</h2>
            <p className="text-xs text-[var(--muted)]">
              Create discount codes for promotions and campaigns.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFormItem("new")}
            className="primary-button"
          >
            <Plus size={16} /> Add coupon
          </button>
        </div>

        <TableToolbar
          search={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder="Search coupons..."
          filters={
            <>
              <FilterSelect
                value={statusFilter}
                onChange={setStatusFilter}
                aria-label="Filter by status"
              >
                <option value="all">All status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
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

        <SelectionBar
          count={selection.selectedCount}
          onClear={selection.clear}
          onDelete={() => setBulkDeleteOpen(true)}
          deleting={deleting}
        />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="table-head">
              <tr>
                <SelectTh
                  checked={selection.allSelected}
                  indeterminate={selection.someSelected}
                  onChange={selection.togglePage}
                />
                <SortableTh
                  label="ID"
                  sortKey="id"
                  activeKey={table.sort.key}
                  direction={table.sort.direction}
                  onSort={table.toggleSort}
                />
                <SortableTh
                  label="Code"
                  sortKey="code"
                  activeKey={table.sort.key}
                  direction={table.sort.direction}
                  onSort={table.toggleSort}
                />
                <SortableTh
                  label="Name"
                  sortKey="name"
                  activeKey={table.sort.key}
                  direction={table.sort.direction}
                  onSort={table.toggleSort}
                />
                <SortableTh
                  label="Discount"
                  sortKey="value"
                  activeKey={table.sort.key}
                  direction={table.sort.direction}
                  onSort={table.toggleSort}
                />
                <StaticTh label="Uses" />
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
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    Loading coupons…
                  </td>
                </tr>
              ) : table.pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    No coupons found.
                  </td>
                </tr>
              ) : (
                table.pageRows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <SelectTd
                      checked={selection.isSelected(row.id)}
                      onChange={() => selection.toggleOne(row.id)}
                      label={`Select ${row.code}`}
                    />
                    <td className="px-4 py-3.5">#{row.id}</td>
                    <td className="px-4 py-3.5 font-medium">{row.code}</td>
                    <td className="px-4 py-3.5">{row.name}</td>
                    <td className="px-4 py-3.5">
                      {row.discount_type === "percent"
                        ? `${Number(row.discount_value)}%`
                        : `₹${Number(row.discount_value)}`}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {row.used_count}
                      {row.max_uses != null ? ` / ${row.max_uses}` : ""}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusPill active={row.is_active} />
                    </td>
                    <td className="px-4 py-3.5">
                      <ActionIconButtons
                        editLabel={`Edit ${row.code}`}
                        deleteLabel={`Delete ${row.code}`}
                        onEdit={() => setFormItem(row)}
                        onDelete={() => setDeleteTarget(row)}
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

      <CouponFormModal item={formItem} onClose={() => setFormItem(null)} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete coupon"
        message={`Delete “${deleteTarget?.code ?? ""}”? This cannot be undone.`}
        confirmLabel="Delete"
        busy={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        title="Delete selected"
        message={`Delete ${selection.selectedCount} coupon(s)?`}
        confirmLabel="Delete selected"
        busy={deleting}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={() => void confirmBulkDelete()}
      />
    </>
  );
}

function CouponFormModal({
  item,
  onClose,
}: {
  item: Coupon | "new" | null;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const editing = item !== null && item !== "new";
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    discount_type: "percent" as "percent" | "fixed",
    discount_value: "10",
    min_order_amount: "",
    max_uses: "",
    starts_at: "",
    ends_at: "",
    is_active: true,
  });

  useEffect(() => {
    if (!item) return;
    if (item === "new") {
      setForm({
        code: "",
        name: "",
        discount_type: "percent",
        discount_value: "10",
        min_order_amount: "",
        max_uses: "",
        starts_at: "",
        ends_at: "",
        is_active: true,
      });
      return;
    }
    setForm({
      code: item.code,
      name: item.name,
      discount_type: item.discount_type,
      discount_value: String(item.discount_value),
      min_order_amount:
        item.min_order_amount != null ? String(item.min_order_amount) : "",
      max_uses: item.max_uses != null ? String(item.max_uses) : "",
      starts_at: toLocalInput(item.starts_at),
      ends_at: toLocalInput(item.ends_at),
      is_active: item.is_active,
    });
  }, [item]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const payload: CouponInput = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value) || 0,
      min_order_amount: form.min_order_amount
        ? Number(form.min_order_amount)
        : null,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      starts_at: form.starts_at
        ? new Date(form.starts_at).toISOString()
        : null,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      is_active: form.is_active,
    };

    const result =
      item === "new"
        ? await dispatch(createCoupon(payload))
        : item
          ? await dispatch(updateCoupon({ id: item.id, changes: payload }))
          : null;

    setBusy(false);
    if (
      result &&
      (createCoupon.fulfilled.match(result) ||
        updateCoupon.fulfilled.match(result))
    ) {
      toastSuccess(
        dispatch,
        editing ? "Coupon updated" : "Coupon created",
        `${payload.code} was saved.`,
      );
      onClose();
    } else {
      toastError(
        dispatch,
        editing ? "Could not update coupon" : "Could not create coupon",
        "Please check the form and try again.",
      );
    }
  }

  return (
    <Modal
      open={Boolean(item)}
      title={editing ? "Edit coupon" : "Create coupon"}
      description="Set discount type, limits, and schedule."
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="vz-label">Code</span>
            <input
              className="form-input"
              required
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
            />
          </label>
          <label className="block">
            <span className="vz-label">Name</span>
            <input
              className="form-input"
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </label>
          <label className="block">
            <span className="vz-label">Discount type</span>
            <select
              className="form-input"
              value={form.discount_type}
              onChange={(event) =>
                setForm({
                  ...form,
                  discount_type: event.target.value as "percent" | "fixed",
                })
              }
            >
              <option value="percent">Percent</option>
              <option value="fixed">Fixed amount</option>
            </select>
          </label>
          <label className="block">
            <span className="vz-label">Discount value</span>
            <input
              className="form-input"
              type="number"
              min={0}
              step="0.01"
              required
              value={form.discount_value}
              onChange={(event) =>
                setForm({ ...form, discount_value: event.target.value })
              }
            />
          </label>
          <label className="block">
            <span className="vz-label">Min order amount</span>
            <input
              className="form-input"
              type="number"
              min={0}
              step="0.01"
              value={form.min_order_amount}
              onChange={(event) =>
                setForm({ ...form, min_order_amount: event.target.value })
              }
            />
          </label>
          <label className="block">
            <span className="vz-label">Max uses</span>
            <input
              className="form-input"
              type="number"
              min={1}
              value={form.max_uses}
              onChange={(event) =>
                setForm({ ...form, max_uses: event.target.value })
              }
            />
          </label>
          <label className="block">
            <span className="vz-label">Starts at</span>
            <input
              className="form-input"
              type="datetime-local"
              value={form.starts_at}
              onChange={(event) =>
                setForm({ ...form, starts_at: event.target.value })
              }
            />
          </label>
          <label className="block">
            <span className="vz-label">Ends at</span>
            <input
              className="form-input"
              type="datetime-local"
              value={form.ends_at}
              onChange={(event) =>
                setForm({ ...form, ends_at: event.target.value })
              }
            />
          </label>
        </div>
        <label className="flex items-center justify-between border border-[var(--card-border)] px-3 py-3 text-sm font-medium">
          Active
          <input
            type="checkbox"
            role="switch"
            checked={form.is_active}
            onChange={(event) =>
              setForm({ ...form, is_active: event.target.checked })
            }
            className="form-switch"
          />
        </label>
        <div className="flex justify-end gap-2 border-t border-[var(--card-border)] pt-4">
          <button type="button" onClick={onClose} className="glass-secondary-button">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="primary-button">
            {busy ? "Saving..." : editing ? "Save changes" : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
