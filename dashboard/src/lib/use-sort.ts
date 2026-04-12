// 테이블 컬럼 정렬 훅

import { useState, useMemo } from "react";

export type SortDirection = "asc" | "desc" | null;

export interface SortState<K extends string> {
  column: K | null;
  direction: SortDirection;
}

export function useSort<T, K extends string>(
  data: T[],
  defaultColumn: K | null = null,
  defaultDirection: SortDirection = "desc"
) {
  const [sort, setSort] = useState<SortState<K>>({ column: defaultColumn, direction: defaultDirection });

  const sortedData = useMemo(() => {
    if (!sort.column || !sort.direction) return data;
    const col = sort.column;
    const dir = sort.direction;
    return [...data].sort((a, b) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const va = (a as any)[col];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vb = (b as any)[col];
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") {
        return dir === "asc" ? va - vb : vb - va;
      }
      const sa = String(va);
      const sb = String(vb);
      return dir === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
  }, [data, sort]);

  const handleSort = (column: K) => {
    setSort((prev) => {
      if (prev.column !== column) return { column, direction: "desc" };
      if (prev.direction === "desc") return { column, direction: "asc" };
      return { column: null, direction: null };
    });
  };

  return { sortedData, sort, handleSort };
}

// SortIndicator는 sort-indicator.tsx에 분리
