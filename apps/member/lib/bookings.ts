const LABELS: Record<string, string> = {
  confirmed: 'bookings.status.confirmed',
  cancelled: 'bookings.status.cancelled',
  canceled: 'bookings.status.cancelled',
  checked_in: 'bookings.status.checked_in',
  no_show: 'bookings.status.no_show',
};

export function bookingStatusLabelKey(status: string): string {
  return LABELS[status.toLowerCase()] ?? 'bookings.status.unknown';
}

export function isCancellable(status: string): boolean {
  return status.toLowerCase() === 'confirmed';
}

/**
 * Split bookings into upcoming (soonest first) and past (most recent first) by
 * `booked_at`. Unparseable dates fall to the bottom of `past` rather than being
 * dropped, so nothing silently disappears from the member's list.
 */
export function splitBookings<T extends { booked_at: string }>(
  items: readonly T[],
  nowMs: number = Date.now(),
): { upcoming: T[]; past: T[] } {
  const ts = (b: T) => new Date(b.booked_at).getTime();
  const upcoming: T[] = [];
  const past: T[] = [];
  for (const b of items) {
    const t = ts(b);
    if (!Number.isNaN(t) && t >= nowMs) upcoming.push(b);
    else past.push(b);
  }
  upcoming.sort((a, b) => ts(a) - ts(b));
  past.sort((a, b) => {
    const ta = ts(a);
    const tb = ts(b);
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;
    return tb - ta;
  });
  return { upcoming, past };
}
