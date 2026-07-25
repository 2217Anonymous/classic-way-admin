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
import type { TaxRule, TaxRuleInput } from "@/lib/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  createTaxRule,
  deleteTaxRule,
  fetchTaxRules,
  updateTaxRule,
} from "@/store/taxSlice";

type SortKey = "id" | "name" | "code" | "rate" | "status";

export function TaxRulesPanel() {
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector((state) => state.tax);
  const [formItem, setFormItem] = useState<TaxRule | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TaxRule | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    void dispatch(fetchTaxRules());
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

  const matchesSearch = useCallback((row: TaxRule, query: string) => {
    return [row.name, row.code, row.country, row.state]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
  }, []);

  const getSortValue = useCallback((row: TaxRule, key: SortKey) => {
    switch (key) {
      case "id":
        return row.id;
      case "name":
        return row.name;
      case "code":
        return row.code;
      case "rate":
        return Number(row.rate_percent);
      case "status":
        return row.is_active;
      default:
        return row.name;
    }
  }, []);

  const table = useTableState<TaxRule, SortKey>({
    rows: filtered,
    initialSort: { key: "id", direction: "desc" },
    getSortValue,
    matchesSearch,
  });

  const getId = useCallback((row: TaxRule) => row.id, []);
  const selection = useRowSelection(table.pageRows, getId);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await dispatch(deleteTaxRule(deleteTarget.id));
    setDeleting(false);
    if (deleteTaxRule.fulfilled.match(result)) {
      toastSuccess(dispatch, "Tax rule deleted", `${deleteTarget.name} removed.`);
      setDeleteTarget(null);
      selection.clear();
    } else {
      toastError(dispatch, "Delete failed", "Could not delete tax rule.");
    }
  }

  async function confirmBulkDelete() {
    if (selection.selectedIds.length === 0) return;
    setDeleting(true);
    let ok = 0;
    for (const id of selection.selectedIds) {
      const result = await dispatch(deleteTaxRule(id));
      if (deleteTaxRule.fulfilled.match(result)) ok += 1;
    }
    setDeleting(false);
    setBulkDeleteOpen(false);
    selection.clear();
    if (ok > 0) {
      toastSuccess(dispatch, "Tax rules deleted", `${ok} rule(s) removed.`);
    } else {
      toastError(dispatch, "Delete failed", "Could not delete tax rules.");
    }
  }

  return (
    <>
      <section className="table-card">
        <div className="flex w-full items-center justify-between gap-3 border-b border-[var(--card-border)] px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Tax rules</h2>
            <p className="text-xs text-[var(--muted)]">
              Configure GST and regional tax rates for checkout.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFormItem("new")}
            className="primary-button"
          >
            <Plus size={16} /> Add tax rule
          </button>
        </div>

        <TableToolbar
          search={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder="Search tax rules..."
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
          <table className="w-full min-w-[720px] text-left text-sm">
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
                  label="Name"
                  sortKey="name"
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
                  label="Rate"
                  sortKey="rate"
                  activeKey={table.sort.key}
                  direction={table.sort.direction}
                  onSort={table.toggleSort}
                />
                <StaticTh label="Region" />
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
                    Loading tax rules…
                  </td>
                </tr>
              ) : table.pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    No tax rules found.
                  </td>
                </tr>
              ) : (
                table.pageRows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <SelectTd
                      checked={selection.isSelected(row.id)}
                      onChange={() => selection.toggleOne(row.id)}
                      label={`Select ${row.name}`}
                    />
                    <td className="px-4 py-3.5">#{row.id}</td>
                    <td className="px-4 py-3.5 font-medium">{row.name}</td>
                    <td className="px-4 py-3.5">{row.code}</td>
                    <td className="px-4 py-3.5">
                      {Number(row.rate_percent)}%
                      {row.is_inclusive ? " incl." : ""}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {[row.state, row.country].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusPill active={row.is_active} />
                    </td>
                    <td className="px-4 py-3.5">
                      <ActionIconButtons
                        editLabel={`Edit ${row.name}`}
                        deleteLabel={`Delete ${row.name}`}
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

      <TaxRuleFormModal item={formItem} onClose={() => setFormItem(null)} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete tax rule"
        message={`Delete “${deleteTarget?.name ?? ""}”? This cannot be undone.`}
        confirmLabel="Delete"
        busy={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        title="Delete selected"
        message={`Delete ${selection.selectedCount} tax rule(s)?`}
        confirmLabel="Delete selected"
        busy={deleting}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={() => void confirmBulkDelete()}
      />
    </>
  );
}

function TaxRuleFormModal({
  item,
  onClose,
}: {
  item: TaxRule | "new" | null;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const editing = item !== null && item !== "new";
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    rate_percent: "18",
    is_inclusive: false,
    country: "India",
    state: "",
    is_active: true,
    sort_order: "0",
  });

  useEffect(() => {
    if (!item) return;
    if (item === "new") {
      setForm({
        name: "",
        code: "",
        rate_percent: "18",
        is_inclusive: false,
        country: "India",
        state: "",
        is_active: true,
        sort_order: "0",
      });
      return;
    }
    setForm({
      name: item.name,
      code: item.code,
      rate_percent: String(item.rate_percent),
      is_inclusive: item.is_inclusive,
      country: item.country ?? "",
      state: item.state ?? "",
      is_active: item.is_active,
      sort_order: String(item.sort_order),
    });
  }, [item]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const payload: TaxRuleInput = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      rate_percent: Number(form.rate_percent) || 0,
      is_inclusive: form.is_inclusive,
      country: form.country.trim() || null,
      state: form.state.trim() || null,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };

    const result =
      item === "new"
        ? await dispatch(createTaxRule(payload))
        : item
          ? await dispatch(updateTaxRule({ id: item.id, changes: payload }))
          : null;

    setBusy(false);
    if (
      result &&
      (createTaxRule.fulfilled.match(result) ||
        updateTaxRule.fulfilled.match(result))
    ) {
      toastSuccess(
        dispatch,
        editing ? "Tax rule updated" : "Tax rule created",
        `${payload.name} was saved.`,
      );
      onClose();
    } else {
      toastError(
        dispatch,
        editing ? "Could not update tax rule" : "Could not create tax rule",
        "Please check the form and try again.",
      );
    }
  }

  return (
    <Modal
      open={Boolean(item)}
      title={editing ? "Edit tax rule" : "Create tax rule"}
      description="Define rate and region for checkout tax calculation."
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
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
          <span className="vz-label">Code</span>
          <input
            className="form-input"
            required
            value={form.code}
            onChange={(event) => setForm({ ...form, code: event.target.value })}
          />
        </label>
        <label className="block">
          <span className="vz-label">Rate %</span>
          <input
            className="form-input"
            type="number"
            min={0}
            max={100}
            step="0.01"
            required
            value={form.rate_percent}
            onChange={(event) =>
              setForm({ ...form, rate_percent: event.target.value })
            }
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="vz-label">Country</span>
            <input
              className="form-input"
              value={form.country}
              onChange={(event) =>
                setForm({ ...form, country: event.target.value })
              }
            />
          </label>
          <label className="block">
            <span className="vz-label">State</span>
            <input
              className="form-input"
              value={form.state}
              onChange={(event) => setForm({ ...form, state: event.target.value })}
            />
          </label>
        </div>
        <label className="flex items-center justify-between border border-[var(--card-border)] px-3 py-3 text-sm font-medium">
          Tax inclusive
          <input
            type="checkbox"
            role="switch"
            checked={form.is_inclusive}
            onChange={(event) =>
              setForm({ ...form, is_inclusive: event.target.checked })
            }
            className="form-switch"
          />
        </label>
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
