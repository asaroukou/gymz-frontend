import { describe, expect, it } from 'vitest';
import { joinBookings, slotWindow, splitBookingViews } from './booking-slots';

describe('slotWindow', () => {
  it('spans today−30 … today+30 in local days, under the 62-day cap', () => {
    const w = slotWindow(new Date(2026, 8, 20, 23, 30)); // late evening local (Review Focus 3)
    expect(w).toEqual({ from: '2026-08-21', to: '2026-10-20' });
    const days = (Date.parse(w.to) - Date.parse(w.from)) / 86_400_000;
    expect(days).toBeLessThan(62);
  });
});

describe('joinBookings (Review Focus 2)', () => {
  const bookings = [
    { id: 'b1', status: 'confirmed', slot_id: 's1', booked_at: '2026-01-01T00:00:00Z' },
    { id: 'b2', status: 'checked_in', slot_id: 's2', booked_at: '2026-01-01T00:00:00Z' },
    { id: 'b3', status: 'confirmed', slot_id: 'missing', booked_at: '2026-01-01T00:00:00Z' },
  ];
  const slots = [
    { id: 's1', start_time: '2026-09-22T06:30:00Z' },
    { id: 's2', start_time: '2026-09-19T06:30:00Z' },
  ];
  it('takes the session start from the slot, never booked_at', () => {
    expect(joinBookings(bookings, slots)).toEqual([
      { id: 'b1', status: 'confirmed', startsAt: '2026-09-22T06:30:00Z' },
      { id: 'b2', status: 'checked_in', startsAt: '2026-09-19T06:30:00Z' },
      { id: 'b3', status: 'confirmed', startsAt: null },
    ]);
  });
  it('without slots every date is unknown', () => {
    expect(joinBookings(bookings, undefined).every((v) => v.startsAt === null)).toBe(true);
  });
});

describe('splitBookingViews', () => {
  const now = Date.parse('2026-09-20T12:00:00Z');
  const v = (id: string, status: string, startsAt: string | null) => ({ id, status, startsAt });
  it('upcoming = confirmed and future or unknown; past = the rest', () => {
    const { upcoming, past } = splitBookingViews(
      [
        v('late', 'confirmed', '2026-09-26T18:00:00Z'),
        v('soon', 'confirmed', '2026-09-22T06:30:00Z'),
        v('unknown', 'confirmed', null),
        v('done', 'checked_in', '2026-09-19T06:30:00Z'),
        v('older', 'no_show', '2026-09-17T18:00:00Z'),
        v('missed', 'confirmed', '2026-09-18T06:30:00Z'),
        v('lost', 'cancelled', null),
      ],
      now,
    );
    expect(upcoming.map((x) => x.id)).toEqual(['soon', 'late', 'unknown']);
    expect(past.map((x) => x.id)).toEqual(['done', 'missed', 'older', 'lost']);
  });
});
