import { describe, expect, it } from 'vitest';
import { bookingBadgeVariant, slotBadgeVariant } from './slot-status';

describe('slotBadgeVariant', () => {
  it('maps available → success, full → warning, cancelled → outline', () => {
    expect(slotBadgeVariant('available')).toBe('success');
    expect(slotBadgeVariant('full')).toBe('warning');
    expect(slotBadgeVariant('cancelled')).toBe('outline');
  });
});

describe('bookingBadgeVariant', () => {
  it('maps checked_in → success, confirmed → info, no_show → warning, cancelled → outline', () => {
    expect(bookingBadgeVariant('checked_in')).toBe('success');
    expect(bookingBadgeVariant('confirmed')).toBe('info');
    expect(bookingBadgeVariant('no_show')).toBe('warning');
    expect(bookingBadgeVariant('cancelled')).toBe('outline');
  });
});
