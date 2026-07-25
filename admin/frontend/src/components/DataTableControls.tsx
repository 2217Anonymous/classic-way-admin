"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";

import type { SortDirection } from "@/hooks/useTableState";

export function TableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="w-full sm:max-w-xs">
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="table-search"
          aria-label={searchPlaceholder}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {filters}
      </div>
    </div>
  );
}

export function FilterSelect({
  value,
  onChange,
  children,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  "aria-label"?: string;
}) {
  return (
    <select
      className="table-filter"
      value={value}
      aria-label={ariaLabel}
      onChange={(event) => onChange(event.target.value)}
    >
      {children}
    </select>
  );
}

export function SortableTh<TKey extends string>({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  align = "left",
  className = "",
}: {
  label: string;
  sortKey: TKey;
  activeKey: TKey;
  direction: SortDirection;
  onSort: (key: TKey) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const active = activeKey === sortKey;
  return (
    <th className={`table-th ${className}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1.5 text-sm font-medium transition hover:text-black ${
          align === "right" ? "ml-auto" : ""
        } ${active ? "text-slate-900" : "text-slate-700"}`}
      >
        {label}
        {active ? (
          direction === "asc" ? (
            <ArrowUp size={14} />
          ) : (
            <ArrowDown size={14} />
          )
        ) : (
          <ArrowUpDown size={14} className="opacity-40" />
        )}
      </button>
    </th>
  );
}

export function StaticTh({
  label,
  align = "left",
}: {
  label: string;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`table-th text-sm font-medium text-slate-700 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {label}
    </th>
  );
}

export function SelectTh({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
}) {
  return (
    <th className="table-th w-12">
      <input
        ref={(el) => {
          if (el) el.indeterminate = Boolean(indeterminate);
        }}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="table-checkbox"
        aria-label="Select all rows on this page"
      />
    </th>
  );
}

export function SelectTd({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <td className="px-4 py-3.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="table-checkbox"
        aria-label={label}
      />
    </td>
  );
}

export function SelectionBar({
  count,
  onClear,
  onDelete,
  deleting,
}: {
  count: number;
  onClear: () => void;
  onDelete: () => void;
  deleting?: boolean;
}) {
  if (count === 0) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-neutral-100/70 px-5 py-2.5">
      <p className="text-sm font-medium text-teal-800">
        {count} selected
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClear}
          className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-white"
        >
          Clear
        </button>
        <button
          type="button"
          disabled={deleting}
          onClick={onDelete}
          className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
        >
          <Trash2 size={14} />
          {deleting ? "Deleting..." : "Delete selected"}
        </button>
      </div>
    </div>
  );
}

function pageNumbers(page: number, pageCount: number): (number | "…")[] {
  if (pageCount <= 5) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  if (page <= 3) return [1, 2, 3, "…", pageCount];
  if (page >= pageCount - 2) {
    return [1, "…", pageCount - 2, pageCount - 1, pageCount];
  }
  return [1, "…", page - 1, page, page + 1, "…", pageCount];
}

export function TablePagination({
  page,
  pageCount,
  onPageChange,
  filteredCount,
  pageSize,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  filteredCount: number;
  pageSize: number;
}) {
  if (filteredCount === 0) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, filteredCount);
  const numbers = pageNumbers(page, pageCount);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        Showing {start}–{end} of {filteredCount}
      </p>
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="page-nav-btn"
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        {numbers.map((item, index) =>
          item === "…" ? (
            <span
              key={`ellipsis-${index}`}
              className="px-1 text-sm text-slate-400"
            >
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              className={`page-number-btn ${
                item === page ? "page-number-btn-active" : ""
              }`}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          className="page-nav-btn"
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
