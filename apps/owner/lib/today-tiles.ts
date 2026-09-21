import type { ScheduleSlot } from '@iziwellpass/api/schemas';

import { venueDateKey } from './datetime';

/**
 * The dashboard's session tiles: today's slots (venue-local day), earliest
 * first, capped at `max`. `total` is the whole day's count for the
 * « Voir les N séances du jour » link.
 */
export function pickTodayTiles(
  slots: readonly ScheduleSlot[] | undefined,
  timeZone: string | undefined,
  max = 4,
  now: Date = new Date(),
): { tiles: ScheduleSlot[]; total: number } {
  const todayKey = venueDateKey(now.toISOString(), timeZone);
  const today = (slots ?? [])
    .filter((slot) => venueDateKey(slot.start_time, timeZone) === todayKey)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  return { tiles: today.slice(0, max), total: today.length };
}

export function isSlotFull(slot: ScheduleSlot): boolean {
  return slot.status === 'full' || slot.booked_count >= slot.capacity;
}

/**
 * The Tile Rule with its two exceptions: tints rotate by position (the
 * number is the rotation index the Tile primitive accepts), a full session
 * takes sable, a cancelled one takes the côté tone (`bg-side`).
 */
export function tileTone(slot: ScheduleSlot, index: number): 'side' | 'sable' | number {
  if (slot.status === 'cancelled') return 'side';
  if (isSlotFull(slot)) return 'sable';
  return index;
}
