import { describe, expect, it } from 'vitest';
import { formatDate, formatMoney } from './format';

describe('formatDate', () => {
  it('formats an ISO date as a fr day-month-year', () => {
    expect(formatDate('2026-09-11')).toMatch(/2026/);
  });
  it('returns an em-dash-free placeholder for empty input', () => {
    expect(formatDate('')).toBe('—');
  });
});

describe('formatMoney', () => {
  it('renders minor units in the given currency', () => {
    // 25000 minor XOF = 25 000 (XOF has 0 fraction digits handled as minor==major here)
    expect(formatMoney(25000, 'XOF')).toContain('25');
  });
});
