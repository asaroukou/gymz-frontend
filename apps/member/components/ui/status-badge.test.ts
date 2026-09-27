import { describe, expect, it } from 'vitest';
import { statusBadgeVariant } from './status-badge.logic';

describe('statusBadgeVariant (canvas colours, plan R2)', () => {
  it('active and checked-in read success', () => {
    expect(statusBadgeVariant('active')).toBe('success');
    expect(statusBadgeVariant('checked_in')).toBe('success');
    expect(statusBadgeVariant('paid')).toBe('success');
  });
  it('confirmed reads info', () => {
    expect(statusBadgeVariant('confirmed')).toBe('info');
  });
  it('expired, exhausted, no-show and pending read warning', () => {
    for (const s of ['expired', 'exhausted', 'no_show', 'pending', 'overdue']) {
      expect(statusBadgeVariant(s)).toBe('warning');
    }
  });
  it('suspended reads destructive; cancelled and unknown read neutral', () => {
    expect(statusBadgeVariant('suspended')).toBe('destructive');
    expect(statusBadgeVariant('cancelled')).toBe('neutral');
    expect(statusBadgeVariant('canceled')).toBe('neutral');
    expect(statusBadgeVariant('whatever')).toBe('neutral');
  });
  it('is case-insensitive', () => {
    expect(statusBadgeVariant('CONFIRMED')).toBe('info');
  });
});
