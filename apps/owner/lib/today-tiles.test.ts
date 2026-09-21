import { describe, expect, it } from 'vitest';

import type { ScheduleSlot } from '@iziwellpass/api/schemas';

import { isSlotFull, pickTodayTiles, tileTone } from './today-tiles';

function slot(start: string, extra: Partial<ScheduleSlot> = {}): ScheduleSlot {
  return {
    id: start,
    start_time: start,
    end_time: start,
    date: start.slice(0, 10),
    status: 'available',
    booked_count: 3,
    capacity: 10,
    resource_id: 'r',
    schedule_id: 's',
    tenant_id: 't',
    venue_id: 'v',
    created_at: '',
    ...extra,
  } as ScheduleSlot;
}

const NOW = new Date('2026-09-20T10:00:00Z');
const TZ = 'Africa/Dakar';

describe('pickTodayTiles', () => {
  it('keeps only today (venue-local), sorted, capped at four, with the total', () => {
    const slots = [
      slot('2026-09-20T18:00:00Z'),
      slot('2026-09-21T06:30:00Z'),
      slot('2026-09-20T06:30:00Z'),
      slot('2026-09-20T12:15:00Z'),
      slot('2026-09-20T08:00:00Z'),
      slot('2026-09-20T16:00:00Z'),
    ];
    const { tiles, total } = pickTodayTiles(slots, TZ, 4, NOW);
    expect(total).toBe(5);
    expect(tiles.map((s) => s.start_time)).toEqual([
      '2026-09-20T06:30:00Z',
      '2026-09-20T08:00:00Z',
      '2026-09-20T12:15:00Z',
      '2026-09-20T16:00:00Z',
    ]);
  });
  it('handles undefined and empty input', () => {
    expect(pickTodayTiles(undefined, TZ, 4, NOW)).toEqual({ tiles: [], total: 0 });
  });
});

describe('tileTone', () => {
  it('cancelled → side, full → sable, else the rotation index', () => {
    expect(tileTone(slot('x', { status: 'cancelled' }), 0)).toBe('side');
    expect(tileTone(slot('x', { status: 'full' }), 0)).toBe('sable');
    expect(tileTone(slot('x', { booked_count: 10, capacity: 10 }), 1)).toBe('sable');
    expect(tileTone(slot('x'), 3)).toBe(3);
  });
  it('isSlotFull reads status or the counts', () => {
    expect(isSlotFull(slot('x', { status: 'full' }))).toBe(true);
    expect(isSlotFull(slot('x', { booked_count: 12, capacity: 12 }))).toBe(true);
    expect(isSlotFull(slot('x'))).toBe(false);
  });
});
