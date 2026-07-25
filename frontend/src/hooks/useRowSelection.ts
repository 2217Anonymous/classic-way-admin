"use client";

import { useCallback, useMemo, useState } from "react";

export function useRowSelection<T>(
  rows: T[],
  getId: (row: T) => string,
) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const pageIds = useMemo(() => rows.map(getId), [rows, getId]);
  const allSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someSelected =
    pageIds.some((id) => selected.has(id)) && !allSelected;

  const toggleOne = useCallback((id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const togglePage = useCallback(() => {
    setSelected((current) => {
      const next = new Set(current);
      const everySelected = pageIds.every((id) => next.has(id));
      if (everySelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [pageIds]);

  const clear = useCallback(() => setSelected(new Set()), []);

  return {
    selected,
    selectedCount: selected.size,
    selectedIds: Array.from(selected),
    isSelected: (id: string) => selected.has(id),
    allSelected,
    someSelected,
    toggleOne,
    togglePage,
    clear,
  };
}
