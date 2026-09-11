export type BadgeVariant = 'success' | 'warning' | 'destructive' | 'neutral';

const SUCCESS = new Set(['active', 'confirmed', 'paid', 'checked_in']);
const DANGER = new Set(['cancelled', 'canceled', 'expired', 'suspended', 'overdue']);
const WARN = new Set(['pending', 'trialing', 'grace', 'exhausted', 'no_show']);

export function statusBadgeVariant(status: string): BadgeVariant {
  const s = status.toLowerCase();
  if (SUCCESS.has(s)) return 'success';
  if (DANGER.has(s)) return 'destructive';
  if (WARN.has(s)) return 'warning';
  return 'neutral';
}
