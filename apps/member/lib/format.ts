export function formatDate(iso: string, locale = 'fr-FR'): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(iso: string, locale = 'fr-FR'): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatMoney(minor: number, currency: string, locale = 'fr-FR'): string {
  // FCFA (XOF) has no minor unit in practice; show integer major units.
  const zeroDecimal = new Set(['XOF', 'XAF', 'JPY']);
  const amount = zeroDecimal.has(currency) ? minor : minor / 100;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: zeroDecimal.has(currency) ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}
