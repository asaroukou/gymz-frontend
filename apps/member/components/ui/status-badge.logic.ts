export type BadgeVariant = 'success' | 'warning' | 'destructive' | 'info' | 'neutral';

const SUCCESS = new Set(['active', 'paid', 'checked_in']);
const INFO = new Set(['confirmed']);
const WARN = new Set(['expired', 'exhausted', 'no_show', 'pending', 'trialing', 'grace', 'overdue']);
const DANGER = new Set(['suspended']);

/** Badge colour per status, matching the canvas (plan R2). */
export function statusBadgeVariant(status: string): BadgeVariant {
  const s = status.toLowerCase();
  if (SUCCESS.has(s)) return 'success';
  if (INFO.has(s)) return 'info';
  if (WARN.has(s)) return 'warning';
  if (DANGER.has(s)) return 'destructive';
  return 'neutral';
}
