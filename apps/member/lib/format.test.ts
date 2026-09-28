import { describe, expect, it } from 'vitest';
import {
  formatCountdown,
  formatDate,
  formatDateTime,
  formatDayLine,
  formatDayNumber,
  formatMoney,
  formatMonthYear,
  formatShortDate,
  formatTime,
  formatWeekdayShort,
} from './format';

describe('formatDate', () => {
  it('formats an ISO date as a fr day-month-year', () => {
    expect(formatDate('2026-09-11')).toMatch(/2026/);
  });
  it('returns an em-dash-free placeholder for empty input', () => {
    expect(formatDate('')).toBe('—');
  });
});

describe('formatDateTime', () => {
  it('formats an ISO timestamp with the year and a time-of-day', () => {
    const out = formatDateTime('2026-09-11T14:30:00Z');
    expect(out).toMatch(/2026/);
    expect(out).toContain(':');
  });
  it('returns an em-dash placeholder for empty input', () => {
    expect(formatDateTime('')).toBe('—');
  });
});

describe('formatMoney', () => {
  it('renders minor units in the given currency', () => {
    // 25000 minor XOF = 25 000 (XOF has 0 fraction digits handled as minor==major here)
    expect(formatMoney(25000, 'XOF')).toContain('25');
  });
});

describe('screen formats (local time)', () => {
  const session = new Date(2026, 8, 21, 6, 30).toISOString(); // Mon 21 Sep 2026 06:30 local
  it('day line capitalises the weekday', () => {
    expect(formatDayLine(new Date(2026, 8, 20, 12))).toBe('Dimanche 20 septembre');
  });
  it('month and year', () => {
    expect(formatMonthYear(new Date(2026, 2, 3).toISOString())).toBe('mars 2026');
  });
  it('short weekday, day number, time, short date', () => {
    expect(formatWeekdayShort(session)).toBe('Lun');
    expect(formatDayNumber(session)).toBe('21');
    expect(formatTime(session)).toBe('06:30');
    expect(formatShortDate(session)).toBe('21 sept.');
  });
  it('invalid input gives an em dash', () => {
    for (const f of [formatMonthYear, formatWeekdayShort, formatDayNumber, formatTime, formatShortDate]) {
      expect(f('nope')).toBe('—');
    }
  });
  it('countdown is m:ss', () => {
    expect(formatCountdown(252)).toBe('4:12');
    expect(formatCountdown(42)).toBe('0:42');
    expect(formatCountdown(0)).toBe('0:00');
    expect(formatCountdown(-5)).toBe('0:00');
  });
});
