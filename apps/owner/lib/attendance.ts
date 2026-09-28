export type AttendancePeriod = 7 | 30 | 90;
export const ATTENDANCE_PERIODS: readonly AttendancePeriod[] = [7, 30, 90];
export const ATTENDANCE_PAGE_SIZE = 20;

const DAY_MS = 86_400_000;

/**
 * `[from, to]` for a period picker: `to` is now truncated to the minute (so
 * the query key/cursor round-trips cleanly), `from` is exactly `days` back.
 */
export function attendanceRange(days: AttendancePeriod, now: Date): { from: string; to: string } {
  const to = new Date(now);
  to.setSeconds(0, 0);
  return { from: new Date(to.getTime() - days * DAY_MS).toISOString(), to: to.toISOString() };
}

function time(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export type LastVisit =
  | { kind: 'none' }
  | { kind: 'today' | 'yesterday'; time: string }
  | { kind: 'date'; date: string };

/** Header summary's last-visit clause: today/yesterday get a time, else a full date. */
export function lastVisit(lastVisitAt: string | null | undefined, locale: string, now: Date): LastVisit {
  if (!lastVisitAt) return { kind: 'none' };
  const d = new Date(lastVisitAt);
  if (dayKey(d) === dayKey(now)) return { kind: 'today', time: time(d, locale) };
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dayKey(d) === dayKey(yesterday)) return { kind: 'yesterday', time: time(d, locale) };
  return {
    kind: 'date',
    date: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(d),
  };
}

/** A visit row's left column: weekday/day/short month over the time. */
export function visitMoment(iso: string, locale: string): { day: string; time: string } {
  const d = new Date(iso);
  return {
    day: new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(d),
    time: time(d, locale),
  };
}

export function methodBadge(method: string): {
  labelKey: 'attendance.method.qr' | 'attendance.method.manual' | 'attendance.method.wallet';
  variant: 'info' | 'default' | 'outline';
} {
  if (method === 'wallet') return { labelKey: 'attendance.method.wallet', variant: 'outline' };
  if (method === 'manual') return { labelKey: 'attendance.method.manual', variant: 'default' };
  return { labelKey: 'attendance.method.qr', variant: 'info' };
}

export function kindLabelKey(kind: string): 'attendance.kind.booked' | 'attendance.kind.walkIn' {
  return kind === 'booked' ? 'attendance.kind.booked' : 'attendance.kind.walkIn';
}
