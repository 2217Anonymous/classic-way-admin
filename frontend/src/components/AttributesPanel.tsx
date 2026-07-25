"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
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
import { useRowSelection } from "@/hooks/useRowSelection";
import { useTableState } from "@/hooks/useTableState";
import { toastError, toastSuccess } from "@/lib/toast";
import type { AttributeDefinition, AttributeDefinitionInput } from "@/lib/types";
import {
  createAttribute,
  deleteAttribute,
  fetchAttributes,
  updateAttribute,
} from "@/store/attributesSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

import { ConfirmDialog, Modal } from "./Modal";

type SortKey = "id" | "name" | "values" | "status";

export function AttributesPanel() {
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector((state) => state.attributes);
  const [formItem, setFormItem] = useState<AttributeDefinition | "new" | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<AttributeDefinition | null>(
    null,
  );
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void dispatch(fetchAttributes());
  }, [dispatch]);

  useEffect(() => {
    if (error) toastError(dispatch, "Request failed", error);
  }, [error, dispatch]);

  const matchesSearch = useCallback((row: AttributeDefinition, query: string) => {
    return [row.name, row.values.join(" ")].join(" ").toLowerCase().includes(query);
  }, []);

  const getSortValue = useCallback((row: AttributeDefinition, key: SortKey) => {
    switch (key) {
      case "id":
        return row.id;
      case "name":
        return row.name;
      case "values":
        return row.values.length;
      case "status":
        return row.is_active;
      default:
        return row.name;
    }
  }, []);

  const table = useTableState<AttributeDefinition, SortKey>({
    rows: items,
    initialSort: { key: "id", direction: "desc" },
    getSortValue,
    matchesSearch,
  });

  const getId = useCallback((row: AttributeDefinition) => row.id, []);
  const selection = useRowSelection(table.pageRows, getId);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await dispatch(deleteAttribute(deleteTarget.id));
    setDeleting(false);
    if (deleteAttribute.fulfilled.match(result)) {
      toastSuccess(dispatch, "Attribute deleted", `${deleteTarget.name} removed.`);
      setDeleteTarget(null);
      selection.clear();
    } else {
      toastError(
        dispatch,
        "Could not delete attribute",
        result.error?.message ?? "Please try again.",
      );
    }
  }

  async function confirmBulkDelete() {
    if (selection.selectedIds.length === 0) return;
    setDeleting(true);
    let ok = 0;
    for (const id of selection.selectedIds) {
      const result = await dispatch(deleteAttribute(id));
      if (deleteAttribute.fulfilled.match(result)) ok += 1;
    }
    setDeleting(false);
    setBulkDeleteOpen(false);
    selection.clear();
    if (ok > 0) {
      toastSuccess(dispatch, "Attributes deleted", `${ok} attribute(s) removed.`);
    } else {
      toastError(dispatch, "Could not delete attributes", "Please try again.");
    }
  }

  return (
    <>
      <section className="table-card">
        <div className="flex w-full items-center justify-between gap-3 border-b border-[var(--card-border)] px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Attributes</h2>
            <p className="text-xs text-[var(--muted)]">
              VL-012 · Reusable Size / Color options for products
            </p>
          </div>
          <button onClick={() => setFormItem("new")} className="primary-button">
            <Plus size={16} /> Create Attribute
          </button>
        </div>

        <TableToolbar
          search={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder="Search attributes..."
          filters={
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
                  label="Values"
                  sortKey="values"
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
                <StaticTh label="Action" align="right" />
              </tr>
            </thead>
            <tbody>
              {table.pageRows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[var(--card-border)] transition hover:bg-[#f8f9fa]"
                >
                  <SelectTd
                    checked={selection.isSelected(row.id)}
                    onChange={() => selection.toggleOne(row.id)}
                    label={`Select ${row.name}`}
                  />
                  <td className="px-4 py-3.5 text-slate-500">#{row.id}</td>
                  <td className="px-4 py-3.5 font-semibold text-slate-900">
                    {row.name}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">
                    {row.values.join(", ")}
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
              ))}
            </tbody>
          </table>
          {!loading && table.filteredCount === 0 && (
            <p className="p-10 text-center text-sm text-slate-500">
              {items.length === 0
                ? "No attributes yet. Create Size, Color, or Material."
                : "No attributes match your search."}
            </p>
          )}
        </div>

        <TablePagination
          page={table.page}
          pageCount={table.pageCount}
          onPageChange={table.setPage}
          filteredCount={table.filteredCount}
          pageSize={table.pageSize}
        />
      </section>

      <AttributeFormModal
        item={formItem}
        onClose={() => setFormItem(null)}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete attribute?"
        message={`This will permanently delete ${deleteTarget?.name ?? "this attribute"}.`}
        busy={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        title="Delete selected attributes?"
        message={`This will permanently delete ${selection.selectedCount} selected attribute(s).`}
        busy={deleting}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={() => void confirmBulkDelete()}
      />
    </>
  );
}

function AttributeFormModal({
  item,
  onClose,
}: {
  item: AttributeDefinition | "new" | null;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const editing = item !== null && item !== "new";
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    values: "",
    sort_order: "0",
    is_active: true,
  });

  useEffect(() => {
    if (!item) return;
    setBusy(false);
    setForm(
      item === "new"
        ? { name: "", values: "", sort_order: "0", is_active: true }
        : {
            name: item.name,
            values: item.values.join(", "),
            sort_order: String(item.sort_order),
            is_active: item.is_active,
          },
    );
  }, [item]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    const payload: AttributeDefinitionInput = {
      name: form.name.trim(),
      values: form.values
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active,
    };

    const result =
      item === "new"
        ? await dispatch(createAttribute(payload))
        : item
          ? await dispatch(updateAttribute({ id: item.id, changes: payload }))
          : null;

    setBusy(false);
    if (
      result &&
      (createAttribute.fulfilled.match(result) ||
        updateAttribute.fulfilled.match(result))
    ) {
      toastSuccess(
        dispatch,
        editing ? "Attribute updated" : "Attribute created",
        `${payload.name} was saved.`,
      );
      onClose();
    } else {
      toastError(
        dispatch,
        editing ? "Could not update attribute" : "Could not create attribute",
        "Please check the form and try again.",
      );
    }
  }

  return (
    <Modal
      open={Boolean(item)}
      title={editing ? "Edit attribute" : "Create attribute"}
      description="Reusable options for product variants (VL-012)."
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="vz-label">Name</span>
          <input
            className="form-input"
            required
            placeholder="Size"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </label>
        <label className="block">
          <span className="vz-label">Values (comma-separated)</span>
          <input
            className="form-input"
            required
            placeholder="S, M, L, XL"
            value={form.values}
            onChange={(event) => setForm({ ...form, values: event.target.value })}
          />
        </label>
        <label className="block">
          <span className="vz-label">Sort order</span>
          <input
            className="form-input"
            type="number"
            min={0}
            value={form.sort_order}
            onChange={(event) =>
              setForm({ ...form, sort_order: event.target.value })
            }
          />
        </label>
        <label className="flex items-center justify-between border border-[var(--card-border)] px-3 py-3 text-sm font-medium">
          Active
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(event) =>
              setForm({ ...form, is_active: event.target.checked })
            }
            className="size-4 form-checkbox"
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
