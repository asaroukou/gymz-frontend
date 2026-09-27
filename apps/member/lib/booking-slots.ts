export interface BookingView {
  id: string;
  status: string;
  startsAt: string | null;
}

const DAY = 86_400_000;
function localKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** `/me/slots` window: today−30 … today+30 in local days (backend cap < 62, spec M8). */
export function slotWindow(today: Date = new Date()): { from: string; to: string } {
  const noon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  return {
    from: localKey(new Date(noon.getTime() - 30 * DAY)),
    to: localKey(new Date(noon.getTime() + 30 * DAY)),
  };
}

/** Session start per booking from its slot; unknown when the slot is not in the list. */
export function joinBookings(
  bookings: readonly { id: string; status: string; slot_id: string }[],
  slots: readonly { id: string; start_time: string }[] | undefined,
): BookingView[] {
  const start = new Map((slots ?? []).map((s) => [s.id, s.start_time]));
  return bookings.map((b) => ({ id: b.id, status: b.status, startsAt: start.get(b.slot_id) ?? null }));
}

/** Upcoming = confirmed and in the future or of unknown date; past = everything else. */
export function splitBookingViews(
  views: readonly BookingView[],
  nowMs: number = Date.now(),
): { upcoming: BookingView[]; past: BookingView[] } {
  const ts = (v: BookingView) => (v.startsAt ? Date.parse(v.startsAt) : Number.NaN);
  const upcoming: BookingView[] = [];
  const past: BookingView[] = [];
  for (const v of views) {
    const t = ts(v);
    const future = Number.isNaN(t) || t >= nowMs;
    if (v.status.toLowerCase() === 'confirmed' && future) upcoming.push(v);
    else past.push(v);
  }
  const nullsLast = (a: number, b: number, dir: 1 | -1) =>
    Number.isNaN(a) ? 1 : Number.isNaN(b) ? -1 : dir * (a - b);
  upcoming.sort((a, b) => nullsLast(ts(a), ts(b), 1));
  past.sort((a, b) => nullsLast(ts(a), ts(b), -1));
  return { upcoming, past };
}
