import { useState, useEffect, useMemo } from "react";

export function usePagination<T>(items: T[], pageSize = 25) {
  const [page, setPage] = useState(1);

  // Reset to page 1 whenever items change (filter/sort)
  useEffect(() => {
    setPage(1);
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paged = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  );

  return {
    paged,
    page: safePage,
    totalPages,
    totalItems: items.length,
    setPage,
    hasPrev: safePage > 1,
    hasNext: safePage < totalPages,
    prev: () => setPage((p) => Math.max(1, p - 1)),
    next: () => setPage((p) => Math.min(totalPages, p + 1)),
  };
}
