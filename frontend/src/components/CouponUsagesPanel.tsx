"use client";

import { useCallback, useEffect, useState } from "react";

import {
  FilterSelect,
  SortableTh,
  StaticTh,
  TablePagination,
  TableToolbar,
} from "@/components/DataTableControls";
import { useTableState } from "@/hooks/useTableState";
import { apiRequest } from "@/lib/api";
import { toastError } from "@/lib/toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

type CouponUsage = {
  id: string;
  coupon_id: string;
  customer_id: string;
  order_id: string | null;
  used_at: string;
  discount_amount: string | number | null;
};

type SortKey = "coupon_id" | "customer_id" | "used_at";

export function CouponUsagesPanel() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.auth.token);
  const [items, setItems] = useState<CouponUsage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiRequest<CouponUsage[]>(
          "/admin/coupon-usages",
          {},
          token,
        );
        if (!cancelled) setItems(data);
      } catch (err) {
        if (!cancelled) {
          toastError(
            dispatch,
            "Failed to load coupon usages",
            err instanceof Error ? err.message : "Request failed",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token, dispatch]);

  const matchesSearch = useCallback((row: CouponUsage, query: string) => {
    return [row.coupon_id, row.customer_id, row.order_id]
      .join(" ")
      .toLowerCase()
      .includes(query);
  }, []);

  const getSortValue = useCallback((row: CouponUsage, key: SortKey) => {
    if (key === "used_at") return row.used_at;
    return row[key];
  }, []);

  const table = useTableState<CouponUsage, SortKey>({
    rows: items,
    initialSort: { key: "used_at", direction: "desc" },
    getSortValue,
    matchesSearch,
  });

  return (
    <section className="table-card">
      <div className="flex w-full items-center justify-between gap-3 border-b border-[var(--card-border)] px-5 py-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Coupon usages</h2>
          <p className="text-xs text-[var(--muted)]">
            Audit of coupons applied by shoppers at checkout (VS-022).
          </p>
        </div>
      </div>

      <TableToolbar
        search={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder="Search usages..."
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

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="table-head">
            <tr>
              <SortableTh
                label="Coupon"
                sortKey="coupon_id"
                activeKey={table.sort.key}
                direction={table.sort.direction}
                onSort={table.toggleSort}
              />
              <SortableTh
                label="Customer"
                sortKey="customer_id"
                activeKey={table.sort.key}
                direction={table.sort.direction}
                onSort={table.toggleSort}
              />
              <StaticTh label="Order" />
              <StaticTh label="Discount" />
              <SortableTh
                label="Used at"
                sortKey="used_at"
                activeKey={table.sort.key}
                direction={table.sort.direction}
                onSort={table.toggleSort}
              />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : table.pageRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                  No coupon usages yet. They appear when shoppers apply coupons at
                  checkout.
                </td>
              </tr>
            ) : (
              table.pageRows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="px-5 py-3">#{row.coupon_id}</td>
                  <td className="px-5 py-3">#{row.customer_id}</td>
                  <td className="px-5 py-3">
                    {row.order_id != null ? `#${row.order_id}` : "—"}
                  </td>
                  <td className="px-5 py-3">{row.discount_amount ?? "—"}</td>
                  <td className="px-5 py-3">
                    {new Date(row.used_at).toLocaleString()}
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
        pageSize={table.pageSize}
        filteredCount={table.filteredCount}
        onPageChange={table.setPage}
      />
    </section>
  );
}
