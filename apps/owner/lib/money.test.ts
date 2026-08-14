import { describe, expect, it } from 'vitest';

import { currencyExponent, formatMoney, fromMinorUnits, toMinorUnits } from './money';

describe('currencyExponent', () => {
  it('is 0 for the CFA francs', () => {
    expect(currencyExponent('XOF')).toBe(0);
    expect(currencyExponent('XAF')).toBe(0);
  });

  it('is 2 for the decimal currencies', () => {
    expect(currencyExponent('EUR')).toBe(2);
    expect(currencyExponent('USD')).toBe(2);
    expect(currencyExponent('GHS')).toBe(2);
    expect(currencyExponent('NGN')).toBe(2);
  });
});

describe('toMinorUnits', () => {
  it('leaves zero-decimal currencies unscaled', () => {
    expect(toMinorUnits(25000, 'XOF')).toBe(25000);
  });

  it('scales decimal currencies by 100', () => {
    expect(toMinorUnits(19.99, 'EUR')).toBe(1999);
  });

  it('rounds rather than truncating float drift', () => {
    // 19.99 * 100 === 1998.9999999999998 in IEEE 754, so truncation gives 1998.
    expect(toMinorUnits(19.99, 'EUR')).not.toBe(1998);
  });

  it('rounds a fractional amount on a zero-decimal currency', () => {
    // There are no centimes in FCFA, so a stray decimal must resolve to a whole unit.
    expect(toMinorUnits(25000.4, 'XOF')).toBe(25000);
    expect(toMinorUnits(25000.6, 'XOF')).toBe(25001);
  });
});

describe('fromMinorUnits', () => {
  it('inverts toMinorUnits', () => {
    expect(fromMinorUnits(1999, 'EUR')).toBe(19.99);
    expect(fromMinorUnits(25000, 'XOF')).toBe(25000);
  });
});

describe('formatMoney', () => {
  it('renders XOF with no decimal part', () => {
    const out = formatMoney(25000, 'XOF', 'fr-FR');
    expect(out).not.toMatch(/[.,]\d\d/);
    // Non-breaking / narrow-no-break spaces vary by ICU build, so compare digits only.
    expect(out.replace(/\D/g, '')).toBe('25000');
  });

  it('renders EUR with two decimals', () => {
    expect(formatMoney(1999, 'EUR', 'fr-FR').replace(/\D/g, '')).toBe('1999');
  });
});
