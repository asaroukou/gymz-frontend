import type { TodaySlot, TodaySnapshot } from '@iziwellpass/api/schemas';

import { formatTime } from './datetime';

export type AttentionReason = 'no_instructor' | 'over_capacity' | 'no_arrivals' | 'unknown';
export type TileTone = 'upcoming' | 'active' | 'completed' | 'cancelled';
export type TileBadge = 'attention' | 'active' | 'completed' | 'cancelled';

export interface TileState {
  tone: TileTone;
  badge: TileBadge | null;
  reason: AttentionReason | null;
}

export type DaySelection = { kind: 'today' } | { kind: 'tomorrow' } | { kind: 'date'; date: string };

/**
 * Why a flagged slot needs attention. The backend sends only the boolean
 * (`needs_attention`); the reason is re-derived with a fixed priority so the
 * most actionable fix is named first. `unknown` covers a backend rule the
 * console does not know yet. Cancelled slots are never flagged (spec T2).
 */
export function attentionReason(slot: TodaySlot): AttentionReason | null {
  if (!slot.needs_attention || slot.lifecycle === 'cancelled') return null;
  if (slot.booked_count > 0 && !slot.instructor_staff_id) return 'no_instructor';
  if (slot.booked_count > slot.capacity) return 'over_capacity';
  if (slot.lifecycle === 'active' && slot.checked_in_count === 0) return 'no_arrivals';
  return 'unknown';
}

const LIFECYCLE_BADGE: Record<TileTone, TileBadge | null> = {
  upcoming: null,
  active: 'active',
  completed: 'completed',
  cancelled: 'cancelled',
};

/** Tint follows the lifecycle; a flag swaps only the badge (spec §4.2). */
export function tileState(slot: TodaySlot): TileState {
  const tone = slot.lifecycle;
  const reason = attentionReason(slot);
  return { tone, badge: reason ? 'attention' : LIFECYCLE_BADGE[tone], reason };
}

function byStart(a: TodaySlot, b: TodaySlot): number {
  return a.start_utc.localeCompare(b.start_utc);
}

/**
 * The dashboard's tile window: when the day has more than `max` slots, start
 * one slot before the first slot still to come (so one past session stays
 * for context), clamped to the day; when every slot is past, the last `max`.
 * `total` counts every slot, cancelled included, for « Voir les N séances ».
 */
export function pickTiles(
  slots: readonly TodaySlot[],
  max = 4,
): { tiles: TodaySlot[]; total: number } {
  const sorted = [...slots].sort(byStart);
  const total = sorted.length;
  if (total <= max) return { tiles: sorted, total };
  const firstLive = sorted.findIndex(
    (s) => s.lifecycle !== 'completed' && s.lifecycle !== 'cancelled',
  );
  const start =
    firstLive === -1 ? total - max : Math.min(Math.max(firstLive - 1, 0), total - max);
  return { tiles: sorted.slice(start, start + max), total };
}

/** Flagged, non-cancelled slots of the snapshot, earliest first. */
export function attentionRows(snapshot: TodaySnapshot): TodaySlot[] {
  return snapshot.slots
    .filter((s) => s.needs_attention && s.lifecycle !== 'cancelled')
    .sort(byStart);
}

/**
 * « HH:MM » for a slot. `start_local` carries the venue's wall clock when the
 * venue timezone is on the backend allowlist; otherwise it is null and the
 * UTC instant is formatted in the venue timezone instead.
 */
export function slotTime(slot: TodaySlot, timeZone: string | undefined): string {
  const local = slot.start_local;
  if (local && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(local)) return local.slice(11, 16);
  return formatTime(slot.start_utc, timeZone);
}

function parts(dateKey: string): [number, number, number] {
  const [y, m, d] = dateKey.split('-').map(Number);
  return [y ?? NaN, m ?? NaN, d ?? NaN];
}

/** Calendar arithmetic on a `YYYY-MM-DD` key, timezone-free. */
export function addDays(dateKey: string, n: number): string {
  const [y, m, d] = parts(dateKey);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** The day key a selection points at, resolved against the current venue day. */
export function resolveDay(selection: DaySelection, todayKey: string): string {
  if (selection.kind === 'today') return todayKey;
  if (selection.kind === 'tomorrow') return addDays(todayKey, 1);
  return selection.date;
}

/**
 * A native date input's value, accepted only once it is a real calendar day
 * with a year from 2000 to 2100 — Chrome emits `0002-09-21` while the year is
 * being typed, which must not become a query.
 */
export function parseDayInput(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [y, m, d] = parts(value);
  if (y < 2000 || y > 2100) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return value;
}

/** « Lundi 21 septembre » for a day key, in the given locale. */
export function dayLabel(dateKey: string, locale: string): string {
  const [y, m, d] = parts(dateKey);
  const text = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
  return text.charAt(0).toUpperCase() + text.slice(1);
}
