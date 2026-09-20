export interface Page<T> {
  items: T[];
  /** 1-based, clamped into `[1, pageCount]`. */
  page: number;
  pageCount: number;
  total: number;
}

/** Client-side paging (spec D2): exact counts, page clamped, size floored to ≥ 1. */
export function paginate<T>(items: readonly T[], page: number, pageSize: number): Page<T> {
  const total = items.length;
  const size = Math.max(1, Math.floor(pageSize) || 1);
  const pageCount = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  const start = (current - 1) * size;
  return { items: items.slice(start, start + size), page: current, pageCount, total };
}
