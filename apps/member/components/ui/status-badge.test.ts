import { describe, expect, it } from 'vitest';
import { statusBadgeVariant } from './status-badge.logic';

describe('statusBadgeVariant', () => {
  it('maps active/confirmed states to success', () => {
    expect(statusBadgeVariant('active')).toBe('success');
    expect(statusBadgeVariant('confirmed')).toBe('success');
  });
  it('maps expired/cancelled to destructive and pending to warning', () => {
    expect(statusBadgeVariant('cancelled')).toBe('destructive');
    expect(statusBadgeVariant('expired')).toBe('destructive');
    expect(statusBadgeVariant('pending')).toBe('warning');
  });
  it('maps exhausted and no_show to warning', () => {
    expect(statusBadgeVariant('exhausted')).toBe('warning');
    expect(statusBadgeVariant('no_show')).toBe('warning');
  });
  it('falls back to neutral for unknown states', () => {
    expect(statusBadgeVariant('whatever')).toBe('neutral');
  });
});
