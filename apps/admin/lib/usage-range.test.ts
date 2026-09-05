import { describe, expect, it } from 'vitest';

import { defaultUsageRange, toIsoDate } from './usage-range';

describe('toIsoDate', () => {
  it('formats local dates as YYYY-MM-DD with zero padding', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toIsoDate(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('defaultUsageRange', () => {
  it('returns a 30-day inclusive window ending today', () => {
    const range = defaultUsageRange(new Date(2026, 8, 5)); // 2026-09-05
    expect(range).toEqual({ from: '2026-08-07', to: '2026-09-05' });
  });

  it('crosses month and year boundaries correctly', () => {
    const range = defaultUsageRange(new Date(2026, 0, 15)); // 2026-01-15
    expect(range).toEqual({ from: '2025-12-17', to: '2026-01-15' });
  });
});
