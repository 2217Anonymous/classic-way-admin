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
import { ConfirmDialog } from "@/components/Modal";
import { useTableState } from "@/hooks/useTableState";
import { toastError, toastSuccess } from "@/lib/toast";
import type { AdminReview } from "@/lib/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  deleteReview,
  fetchReviews,
  moderateReview,
} from "@/store/reviewsSlice";

type SortKey = "product" | "customer" | "rating" | "title" | "approved";

export function ReviewsPanel() {
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector((state) => state.reviews);
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<AdminReview | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void dispatch(fetchReviews());
  }, [dispatch]);

  useEffect(() => {
    if (error) toastError(dispatch, "Request failed", error);
  }, [error, dispatch]);

  const filtered = useMemo(() => {
    return items.filter((row) => {
      if (statusFilter === "approved" && !row.is_approved) return false;
      if (statusFilter === "pending" && row.is_approved) return false;
      return true;
    });
  }, [items, statusFilter]);

  const matchesSearch = useCallback((row: AdminReview, query: string) => {
    return [
      String(row.product_id),
      row.customer_name ?? "",
      row.title ?? "",
      row.body ?? "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);
  }, []);

  const getSortValue = useCallback((row: AdminReview, key: SortKey) => {
    switch (key) {
      case "product":
        return row.product_id;
      case "customer":
        return row.customer_name ?? "";
      case "rating":
        return row.rating;
      case "title":
        return row.title ?? "";
      case "approved":
        return row.is_approved;
      default:
        return row.product_id;
    }
  }, []);

  const table = useTableState<AdminReview, SortKey>({
    rows: filtered,
    initialSort: { key: "rating", direction: "desc" },
    getSortValue,
    matchesSearch,
  });

  async function setApproval(row: AdminReview, is_approved: boolean) {
    setBusyId(row.id);
    const result = await dispatch(moderateReview({ id: row.id, is_approved }));
    setBusyId(null);
    if (moderateReview.fulfilled.match(result)) {
      toastSuccess(
        dispatch,
        is_approved ? "Review approved" : "Review rejected",
        `Review #${row.id} was ${is_approved ? "approved" : "rejected"}.`,
      );
    } else {
      toastError(dispatch, "Moderation failed", "Could not update review.");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await dispatch(deleteReview(deleteTarget.id));
    setDeleting(false);
    if (deleteReview.fulfilled.match(result)) {
      toastSuccess(dispatch, "Review deleted", `Review #${deleteTarget.id} removed.`);
      setDeleteTarget(null);
    } else {
      toastError(dispatch, "Delete failed", "Could not delete review.");
    }
  }

  return (
    <>
      <section className="table-card">
        <div className="flex w-full items-center justify-between gap-3 border-b border-[var(--card-border)] px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Reviews</h2>
            <p className="text-xs text-[var(--muted)]">
              Moderate product reviews before they appear on the storefront.
            </p>
          </div>
        </div>

        <TableToolbar
          search={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder="Search reviews..."
          filters={
            <>
              <FilterSelect
                value={statusFilter}
                onChange={setStatusFilter}
                aria-label="Filter by approval"
              >
                <option value="all">All reviews</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
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
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="table-head">
              <tr>
                <SortableTh
                  label="Product"
                  sortKey="product"
                  activeKey={table.sort.key}
                  direction={table.sort.direction}
                  onSort={table.toggleSort}
                />
                <SortableTh
                  label="Customer"
                  sortKey="customer"
                  activeKey={table.sort.key}
                  direction={table.sort.direction}
                  onSort={table.toggleSort}
                />
                <SortableTh
                  label="Rating"
                  sortKey="rating"
                  activeKey={table.sort.key}
                  direction={table.sort.direction}
                  onSort={table.toggleSort}
                />
                <SortableTh
                  label="Title"
                  sortKey="title"
                  activeKey={table.sort.key}
                  direction={table.sort.direction}
                  onSort={table.toggleSort}
                />
                <SortableTh
                  label="Approved"
                  sortKey="approved"
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
                    Loading reviews…
                  </td>
                </tr>
              ) : table.pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    No reviews found.
                  </td>
                </tr>
              ) : (
                table.pageRows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3.5">#{row.product_id}</td>
                    <td className="px-4 py-3.5 font-medium">
                      {row.customer_name || `Customer #${row.customer_id}`}
                    </td>
                    <td className="px-4 py-3.5">{row.rating}/5</td>
                    <td className="max-w-[220px] truncate px-4 py-3.5">
                      {row.title || "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      {row.is_approved ? (
                        <StatusPill active label="Approved" />
                      ) : (
                        <StatusPill tone="warning" label="Pending" />
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end gap-2">
                        {!row.is_approved ? (
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => void setApproval(row, true)}
                            className="primary-button !px-3 !py-1.5 text-xs"
                          >
                            Approve
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => void setApproval(row, false)}
                            className="glass-secondary-button !px-3 !py-1.5 text-xs"
                          >
                            Reject
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => setDeleteTarget(row)}
                          className="glass-secondary-button !px-3 !py-1.5 text-xs text-[#f06548]"
                        >
                          Delete
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

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete review"
        message={`Delete review #${deleteTarget?.id ?? ""}? This cannot be undone.`}
        confirmLabel="Delete"
        busy={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
