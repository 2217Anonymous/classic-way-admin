"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  FilterSelect,
  SortableTh,
  StaticTh,
  TablePagination,
  TableToolbar,
} from "@/components/DataTableControls";
import { StatusPill } from "@/components/StatusPill";
import { useTableState } from "@/hooks/useTableState";
import { toastError, toastSuccess } from "@/lib/toast";
import type { AdminCustomer } from "@/lib/types";
import {
  fetchCustomers,
  updateCustomerStatus,
} from "@/store/customersSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

type SortKey = "id" | "email" | "name" | "phone" | "status" | "created";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function CustomersPanel() {
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector((state) => state.customers);
  const [statusFilter, setStatusFilter] = useState("all");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    void dispatch(fetchCustomers());
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

  const matchesSearch = useCallback((row: AdminCustomer, query: string) => {
    return [row.email, row.full_name, row.phone ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(query);
  }, []);

  const getSortValue = useCallback((row: AdminCustomer, key: SortKey) => {
    switch (key) {
      case "id":
        return row.id;
      case "email":
        return row.email;
      case "name":
        return row.full_name;
      case "phone":
        return row.phone ?? "";
      case "status":
        return row.is_active;
      case "created":
        return row.created_at;
      default:
        return row.email;
    }
  }, []);

  const table = useTableState<AdminCustomer, SortKey>({
    rows: filtered,
    initialSort: { key: "created", direction: "desc" },
    getSortValue,
    matchesSearch,
  });

  async function toggleActive(row: AdminCustomer) {
    setTogglingId(row.id);
    const result = await dispatch(
      updateCustomerStatus({ id: row.id, is_active: !row.is_active }),
    );
    setTogglingId(null);
    if (updateCustomerStatus.fulfilled.match(result)) {
      toastSuccess(
        dispatch,
        row.is_active ? "Customer deactivated" : "Customer activated",
        `${row.full_name} is now ${row.is_active ? "inactive" : "active"}.`,
      );
    } else {
      toastError(dispatch, "Update failed", "Could not update customer status.");
    }
  }

  return (
    <section className="table-card">
      <div className="flex w-full items-center justify-between gap-3 border-b border-[var(--card-border)] px-5 py-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Customers</h2>
          <p className="text-xs text-[var(--muted)]">
            Storefront shoppers — activate or deactivate accounts.
          </p>
        </div>
      </div>

      <TableToolbar
        search={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder="Search by email, name, phone..."
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

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="table-head">
            <tr>
              <SortableTh
                label="ID"
                sortKey="id"
                activeKey={table.sort.key}
                direction={table.sort.direction}
                onSort={table.toggleSort}
              />
              <SortableTh
                label="Email"
                sortKey="email"
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
                label="Phone"
                sortKey="phone"
                activeKey={table.sort.key}
                direction={table.sort.direction}
                onSort={table.toggleSort}
              />
              <SortableTh
                label="Active"
                sortKey="status"
                activeKey={table.sort.key}
                direction={table.sort.direction}
                onSort={table.toggleSort}
              />
              <SortableTh
                label="Created"
                sortKey="created"
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
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-slate-500"
                >
                  Loading customers…
                </td>
              </tr>
            ) : table.pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-slate-500"
                >
                  No customers found.
                </td>
              </tr>
            ) : (
              table.pageRows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3.5 text-slate-500">#{row.id}</td>
                  <td className="px-4 py-3.5 font-medium">{row.email}</td>
                  <td className="px-4 py-3.5">{row.full_name}</td>
                  <td className="px-4 py-3.5 text-slate-600">
                    {row.phone || "—"}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusPill active={row.is_active} />
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">
                    {formatDate(row.created_at)}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      type="button"
                      disabled={togglingId === row.id}
                      onClick={() => void toggleActive(row)}
                      className="glass-secondary-button !px-3 !py-1.5 text-xs"
                    >
                      {togglingId === row.id
                        ? "Updating…"
                        : row.is_active
                          ? "Deactivate"
                          : "Activate"}
                    </button>
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
  );
}
