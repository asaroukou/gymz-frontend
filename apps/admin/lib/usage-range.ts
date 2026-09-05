/** Local-calendar YYYY-MM-DD (not toISOString(), which shifts by timezone). */
export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 30-day inclusive window ending today: from = today − 29 days. */
export function defaultUsageRange(today: Date = new Date()): { from: string; to: string } {
  const from = new Date(today);
  from.setDate(from.getDate() - 29);
  return { from: toIsoDate(from), to: toIsoDate(today) };
}
