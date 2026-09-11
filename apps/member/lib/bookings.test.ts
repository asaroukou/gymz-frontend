import { describe, expect, it } from 'vitest';
import { bookingStatusLabelKey, isCancellable } from './bookings';

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
