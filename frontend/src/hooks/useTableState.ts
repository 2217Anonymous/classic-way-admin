"use client";

import { useMemo, useState } from "react";

export type SortDirection = "asc" | "desc";

export type SortState<TKey extends string> = {
  key: TKey;
  direction: SortDirection;
};

type UseTableStateOptions<T, TKey extends string> = {
  rows: T[];
  initialSort: SortState<TKey>;
  getSortValue: (row: T, key: TKey) => string | number | boolean | null | undefined;
  matchesSearch: (row: T, query: string) => boolean;
  pageSizeOptions?: number[];
  initialPageSize?: number;
};

export function useTableState<T, TKey extends string>({
  rows,
  initialSort,
  getSortValue,
  matchesSearch,
  pageSizeOptions = [5, 10, 20, 50],
  initialPageSize = 10,
}: UseTableStateOptions<T, TKey>) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState<TKey>>(initialSort);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => matchesSearch(row, query));
  }, [rows, search, matchesSearch]);

  const sorted = useMemo(() => {
    const next = [...filtered];
    next.sort((a, b) => {
      const left = getSortValue(a, sort.key);
      const right = getSortValue(b, sort.key);
      const result = compareValues(left, right);
      return sort.direction === "asc" ? result : -result;
    });
    return next;
  }, [filtered, getSortValue, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount);

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage, pageSize]);

  function toggleSort(key: TKey) {
    setPage(1);
    setSort((current) =>
      current.key === key
        ? {
            key,
            direction: current.direction === "asc" ? "desc" : "asc",
          }
        : { key, direction: "asc" },
    );
  }

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function updatePageSize(value: number) {
    setPageSize(value);
    setPage(1);
  }

  return {
    search,
    setSearch: updateSearch,
    sort,
    toggleSort,
    page: currentPage,
    setPage,
    pageSize,
    setPageSize: updatePageSize,
    pageSizeOptions,
    filteredCount: filtered.length,
    totalCount: rows.length,
    pageCount,
    pageRows,
    sortedRows: sorted,
  };
}

function compareValues(
  left: string | number | boolean | null | undefined,
  right: string | number | boolean | null | undefined,
) {
  if (left == null && right == null) return 0;
  if (left == null) return -1;
  if (right == null) return 1;
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  if (typeof left === "boolean" && typeof right === "boolean") {
    return Number(left) - Number(right);
  }
  return String(left).localeCompare(String(right), undefined, {
    sensitivity: "base",
    numeric: true,
  });
}
