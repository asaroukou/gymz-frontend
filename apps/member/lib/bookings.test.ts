import { describe, expect, it } from 'vitest';
import { bookingStatusLabelKey, isCancellable } from './bookings';

describe('bookingStatusLabelKey', () => {
  it('maps known statuses to i18n keys', () => {
    expect(bookingStatusLabelKey('confirmed')).toBe('bookings.status.confirmed');
    expect(bookingStatusLabelKey('cancelled')).toBe('bookings.status.cancelled');
  });
  it('falls back to pending for unknown', () => {
    expect(bookingStatusLabelKey('mystery')).toBe('bookings.status.pending');
  });
});

describe('isCancellable', () => {
  it('only confirmed/pending bookings can be cancelled', () => {
    expect(isCancellable('confirmed')).toBe(true);
    expect(isCancellable('pending')).toBe(true);
    expect(isCancellable('cancelled')).toBe(false);
    expect(isCancellable('checked_in')).toBe(false);
  });
});
