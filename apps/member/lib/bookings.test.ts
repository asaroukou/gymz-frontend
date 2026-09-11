import { describe, expect, it } from 'vitest';
import { bookingStatusLabelKey, isCancellable, splitBookings } from './bookings';

describe('bookingStatusLabelKey', () => {
  it('maps known statuses to i18n keys', () => {
    expect(bookingStatusLabelKey('confirmed')).toBe('bookings.status.confirmed');
    expect(bookingStatusLabelKey('cancelled')).toBe('bookings.status.cancelled');
    expect(bookingStatusLabelKey('canceled')).toBe('bookings.status.cancelled');
    expect(bookingStatusLabelKey('checked_in')).toBe('bookings.status.checked_in');
    expect(bookingStatusLabelKey('no_show')).toBe('bookings.status.no_show');
  });
  it('falls back to unknown for unrecognized statuses', () => {
    expect(bookingStatusLabelKey('mystery')).toBe('bookings.status.unknown');
  });
});

describe('isCancellable', () => {
  it('is true only for confirmed bookings', () => {
    expect(isCancellable('confirmed')).toBe(true);
    expect(isCancellable('no_show')).toBe(false);
    expect(isCancellable('checked_in')).toBe(false);
    expect(isCancellable('cancelled')).toBe(false);
    expect(isCancellable('mystery')).toBe(false);
  });
});

describe('splitBookings', () => {
  const now = Date.parse('2026-06-15T12:00:00Z');
  const mk = (id: string, iso: string) => ({ id, booked_at: iso });

  it('separates upcoming from past around now', () => {
    const { upcoming, past } = splitBookings(
      [mk('a', '2026-06-20T10:00:00Z'), mk('b', '2026-06-01T10:00:00Z')],
      now,
    );
    expect(upcoming.map((b) => b.id)).toEqual(['a']);
    expect(past.map((b) => b.id)).toEqual(['b']);
  });

  it('sorts upcoming soonest-first and past most-recent-first', () => {
    const { upcoming, past } = splitBookings(
      [
        mk('later', '2026-06-25T10:00:00Z'),
        mk('soon', '2026-06-16T10:00:00Z'),
        mk('old', '2026-05-01T10:00:00Z'),
        mk('recent', '2026-06-10T10:00:00Z'),
      ],
      now,
    );
    expect(upcoming.map((b) => b.id)).toEqual(['soon', 'later']);
    expect(past.map((b) => b.id)).toEqual(['recent', 'old']);
  });

  it('drops unparseable dates to the bottom of past, never losing them', () => {
    const { upcoming, past } = splitBookings(
      [mk('bad', 'not-a-date'), mk('recent', '2026-06-10T10:00:00Z')],
      now,
    );
    expect(upcoming).toEqual([]);
    expect(past.map((b) => b.id)).toEqual(['recent', 'bad']);
  });
});
