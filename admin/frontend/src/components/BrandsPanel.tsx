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
import type { Brand, BrandInput } from "@/lib/types";
import {
  createBrand,
  deleteBrand,
  fetchBrands,
  updateBrand,
} from "@/store/brandsSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

type SortKey = "id" | "name" | "slug" | "status";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function BrandsPanel() {
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector((state) => state.brands);
  const [formItem, setFormItem] = useState<Brand | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    void dispatch(fetchBrands());
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

  const matchesSearch = useCallback((row: Brand, query: string) => {
    return [row.name, row.slug].join(" ").toLowerCase().includes(query);
  }, []);

  const getSortValue = useCallback((row: Brand, key: SortKey) => {
    switch (key) {
      case "id":
        return row.id;
      case "name":
        return row.name;
      case "slug":
        return row.slug;
      case "status":
        return row.is_active;
      default:
        return row.name;
    }
  }, []);

  const table = useTableState<Brand, SortKey>({
    rows: filtered,
    initialSort: { key: "id", direction: "desc" },
    getSortValue,
    matchesSearch,
  });

  const getId = useCallback((row: Brand) => row.id, []);
  const selection = useRowSelection(table.pageRows, getId);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await dispatch(deleteBrand(deleteTarget.id));
    setDeleting(false);
    if (deleteBrand.fulfilled.match(result)) {
      toastSuccess(dispatch, "Brand deleted", `${deleteTarget.name} removed.`);
      setDeleteTarget(null);
      selection.clear();
    } else {
      toastError(dispatch, "Delete failed", "Could not delete brand.");
    }
  }

  async function confirmBulkDelete() {
    if (selection.selectedIds.length === 0) return;
    setDeleting(true);
    let ok = 0;
    for (const id of selection.selectedIds) {
      const result = await dispatch(deleteBrand(id));
      if (deleteBrand.fulfilled.match(result)) ok += 1;
    }
    setDeleting(false);
    setBulkDeleteOpen(false);
    selection.clear();
    if (ok > 0) {
      toastSuccess(dispatch, "Brands deleted", `${ok} brand(s) removed.`);
    } else {
      toastError(dispatch, "Delete failed", "Could not delete brands.");
    }
  }

  return (
    <>
      <section className="table-card">
        <div className="flex w-full items-center justify-between gap-3 border-b border-[var(--card-border)] px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Brands</h2>
            <p className="text-xs text-[var(--muted)]">
              Manage product brands for merchandising and storefront filters.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFormItem("new")}
            className="primary-button"
          >
            <Plus size={16} /> Add brand
          </button>
        </div>

        <TableToolbar
          search={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder="Search brands..."
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
          <table className="w-full min-w-[680px] text-left text-sm">
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
                  label="Slug"
                  sortKey="slug"
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
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    Loading brands…
                  </td>
                </tr>
              ) : table.pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    No brands found.
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
                    <td className="px-4 py-3.5 text-slate-600">{row.slug}</td>
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

      <BrandFormModal item={formItem} onClose={() => setFormItem(null)} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete brand"
        message={`Delete “${deleteTarget?.name ?? ""}”? This cannot be undone.`}
        confirmLabel="Delete"
        busy={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        title="Delete selected"
        message={`Delete ${selection.selectedCount} brand(s)?`}
        confirmLabel="Delete selected"
        busy={deleting}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={() => void confirmBulkDelete()}
      />
    </>
  );
}

function BrandFormModal({
  item,
  onClose,
}: {
  item: Brand | "new" | null;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const editing = item !== null && item !== "new";
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    is_active: true,
  });
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!item) return;
    if (item === "new") {
      setForm({ name: "", slug: "", is_active: true });
      setSlugTouched(false);
      return;
    }
    setForm({
      name: item.name,
      slug: item.slug,
      is_active: item.is_active,
    });
    setSlugTouched(true);
  }, [item]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const payload: BrandInput = {
      name: form.name.trim(),
      slug: form.slug.trim() || slugify(form.name),
      is_active: form.is_active,
    };

    const result =
      item === "new"
        ? await dispatch(createBrand(payload))
        : item
          ? await dispatch(updateBrand({ id: item.id, changes: payload }))
          : null;

    setBusy(false);
    if (
      result &&
      (createBrand.fulfilled.match(result) ||
        updateBrand.fulfilled.match(result))
    ) {
      toastSuccess(
        dispatch,
        editing ? "Brand updated" : "Brand created",
        `${payload.name} was saved.`,
      );
      onClose();
    } else {
      toastError(
        dispatch,
        editing ? "Could not update brand" : "Could not create brand",
        "Please check the form and try again.",
      );
    }
  }

  return (
    <Modal
      open={Boolean(item)}
      title={editing ? "Edit brand" : "Create brand"}
      description="Set brand name, slug, and active status."
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="vz-label">Name</span>
          <input
            className="form-input"
            required
            value={form.name}
            onChange={(event) => {
              const name = event.target.value;
              setForm((current) => ({
                ...current,
                name,
                slug: slugTouched ? current.slug : slugify(name),
              }));
            }}
          />
        </label>
        <label className="block">
          <span className="vz-label">Slug</span>
          <input
            className="form-input"
            value={form.slug}
            onChange={(event) => {
              setSlugTouched(true);
              setForm({ ...form, slug: event.target.value });
            }}
            placeholder="auto-from-name"
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
