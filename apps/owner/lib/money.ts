import type { Currency } from '@iziwellpass/api/schemas';

/**
 * Number of decimal digits a currency uses. XOF and XAF (the CFA francs) have
 * none — 25 000 FCFA is 25000 minor units, not 2 500 000 — while EUR, USD, GHS
 * and NGN have two. Derived from ICU via `Intl` rather than a hardcoded table,
 * so a currency added to the API enum later is handled without a code change.
 */
export function currencyExponent(currency: Currency): number {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
  }).resolvedOptions().maximumFractionDigits!;
}

/**
 * Major units (what an owner types: `25000`) → minor units (what the API
 * stores in `price_amount_minor`). Rounds, because `19.99 * 100` is
 * `1998.9999999999998` in IEEE 754 and truncation would lose a centime.
 */
export function toMinorUnits(major: number, currency: Currency): number {
  return Math.round(major * 10 ** currencyExponent(currency));
}

/** Minor units → major units, for pre-filling an edit form. */
export function fromMinorUnits(minor: number, currency: Currency): number {
  return minor / 10 ** currencyExponent(currency);
}

/** Localized display string, e.g. `25 000 F CFA` for XOF in `fr`. */
export function formatMoney(minor: number, currency: Currency, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(
    fromMinorUnits(minor, currency),
  );
}
