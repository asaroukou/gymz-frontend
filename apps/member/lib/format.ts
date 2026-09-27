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

function valid(iso: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** « Samedi 20 septembre » — the Carte date line (device local day). */
export function formatDayLine(date: Date = new Date(), locale = 'fr-FR'): string {
  return cap(new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(date));
}

/** « mars 2026 » — « Membre depuis … ». */
export function formatMonthYear(iso: string, locale = 'fr-FR'): string {
  const d = valid(iso);
  return d ? new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(d) : '—';
}

/** « Lun » — the date block's weekday. */
export function formatWeekdayShort(iso: string, locale = 'fr-FR'): string {
  const d = valid(iso);
  return d ? cap(new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d).replace('.', '')) : '—';
}

/** « 22 » — the date block's day number. */
export function formatDayNumber(iso: string, locale = 'fr-FR'): string {
  const d = valid(iso);
  return d ? new Intl.DateTimeFormat(locale, { day: 'numeric' }).format(d) : '—';
}

/** « 06:30 ». */
export function formatTime(iso: string, locale = 'fr-FR'): string {
  const d = valid(iso);
  return d ? new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(d) : '—';
}

/** « 22 sept. » — the cancel sheet's date. */
export function formatShortDate(iso: string, locale = 'fr-FR'): string {
  const d = valid(iso);
  return d ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(d) : '—';
}

/** « 4:12 » — QR countdown (plan R1). */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
