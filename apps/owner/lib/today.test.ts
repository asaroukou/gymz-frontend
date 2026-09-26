import { describe, expect, it } from 'vitest';

import type { TodaySlot, TodaySnapshot } from '@iziwellpass/api/schemas';

import {
  addDays,
  attentionReason,
  attentionRows,
  dayLabel,
  parseDayInput,
  pickTiles,
  resolveDay,
  slotTime,
  tileState,
} from './today';

function slot(id: string, extra: Partial<TodaySlot> = {}): TodaySlot {
  return {
    slot_id: id,
    schedule_id: `sch-${id}`,
    resource_id: 'res-1',
    start_utc: '2026-09-21T08:00:00Z',
    end_utc: '2026-09-21T09:00:00Z',
    start_local: '2026-09-21T08:00:00+00:00',
    capacity: 10,
    booked_count: 4,
    checked_in_count: 2,
    lifecycle: 'upcoming',
    needs_attention: false,
    instructor_staff_id: 'staff-1',
    instructor_name: 'Aïssatou Ba',
    resource_name: 'Salle A',
    title: 'Yoga',
    ...extra,
  } as TodaySlot;
}

describe('attentionReason', () => {
  it('is null when the slot is not flagged', () => {
    expect(attentionReason(slot('a'))).toBeNull();
  });

  it('is null for a cancelled slot even if flagged', () => {
    expect(attentionReason(slot('a', { lifecycle: 'cancelled', needs_attention: true }))).toBeNull();
  });

  it('prefers no_instructor over over_capacity and no_arrivals', () => {
    const s = slot('a', {
      needs_attention: true,
      lifecycle: 'active',
      checked_in_count: 0,
      booked_count: 20,
      capacity: 18,
      instructor_staff_id: null,
    });
    expect(attentionReason(s)).toBe('no_instructor');
  });

  it('prefers over_capacity over no_arrivals', () => {
    const s = slot('a', {
      needs_attention: true,
      lifecycle: 'active',
      checked_in_count: 0,
      booked_count: 20,
      capacity: 18,
    });
    expect(attentionReason(s)).toBe('over_capacity');
  });

  it('derives over_capacity for a capacity-0 slot with a booking', () => {
    const s = slot('a', { needs_attention: true, booked_count: 1, capacity: 0 });
    expect(attentionReason(s)).toBe('over_capacity');
  });

  it('derives no_arrivals for an active slot with nobody checked in', () => {
    const s = slot('a', { needs_attention: true, lifecycle: 'active', checked_in_count: 0 });
    expect(attentionReason(s)).toBe('no_arrivals');
  });

  it('is unknown when flagged but no rule matches', () => {
    expect(attentionReason(slot('a', { needs_attention: true }))).toBe('unknown');
  });

  it('does not call a slot with zero bookings instructor-less', () => {
    const s = slot('a', { needs_attention: true, booked_count: 0, instructor_staff_id: null });
    expect(attentionReason(s)).toBe('unknown');
  });
});

describe('tileState', () => {
  it('maps every lifecycle without a flag', () => {
    expect(tileState(slot('a'))).toEqual({ tone: 'upcoming', badge: null, reason: null });
    expect(tileState(slot('a', { lifecycle: 'active' }))).toEqual({
      tone: 'active',
      badge: 'active',
      reason: null,
    });
    expect(tileState(slot('a', { lifecycle: 'completed' }))).toEqual({
      tone: 'completed',
      badge: 'completed',
      reason: null,
    });
    expect(tileState(slot('a', { lifecycle: 'cancelled' }))).toEqual({
      tone: 'cancelled',
      badge: 'cancelled',
      reason: null,
    });
  });

  it('puts the attention badge over the lifecycle badge and keeps the lifecycle tone', () => {
    const s = slot('a', { lifecycle: 'active', needs_attention: true, checked_in_count: 0 });
    expect(tileState(s)).toEqual({ tone: 'active', badge: 'attention', reason: 'no_arrivals' });
  });

  it('never flags a cancelled tile', () => {
    const s = slot('a', { lifecycle: 'cancelled', needs_attention: true });
    expect(tileState(s)).toEqual({ tone: 'cancelled', badge: 'cancelled', reason: null });
  });
});

describe('pickTiles', () => {
  const at = (h: number, lifecycle: TodaySlot['lifecycle']) =>
    slot(`s${h}`, {
      start_utc: `2026-09-21T${String(h).padStart(2, '0')}:00:00Z`,
      lifecycle,
    });

  it('returns every slot, sorted, when there are at most max', () => {
    const { tiles, total } = pickTiles([at(12, 'upcoming'), at(8, 'completed')]);
    expect(tiles.map((s) => s.slot_id)).toEqual(['s8', 's12']);
    expect(total).toBe(2);
  });

  it('starts one slot before the first live slot', () => {
    const slots = [
      at(6, 'completed'),
      at(7, 'completed'),
      at(8, 'cancelled'),
      at(9, 'active'),
      at(12, 'upcoming'),
      at(18, 'upcoming'),
      at(20, 'upcoming'),
    ];
    const { tiles, total } = pickTiles(slots);
    expect(tiles.map((s) => s.slot_id)).toEqual(['s8', 's9', 's12', 's18']);
    expect(total).toBe(7);
  });

  it('clamps the window to the end of the day', () => {
    const slots = [
      at(6, 'completed'),
      at(7, 'completed'),
      at(8, 'completed'),
      at(9, 'completed'),
      at(20, 'upcoming'),
    ];
    expect(pickTiles(slots).tiles.map((s) => s.slot_id)).toEqual(['s7', 's8', 's9', 's20']);
  });

  it('shows the last max slots when the whole day is past', () => {
    const slots = [6, 7, 8, 9, 10].map((h) => at(h, 'completed'));
    expect(pickTiles(slots).tiles.map((s) => s.slot_id)).toEqual(['s7', 's8', 's9', 's10']);
  });

  it('starts at the first slot when the first slot is live', () => {
    const slots = [6, 7, 8, 9, 10].map((h) => at(h, 'upcoming'));
    expect(pickTiles(slots).tiles.map((s) => s.slot_id)).toEqual(['s6', 's7', 's8', 's9']);
  });
});

describe('attentionRows', () => {
  it('lists flagged, non-cancelled slots in start order', () => {
    const snapshot = {
      slots: [
        slot('late', { start_utc: '2026-09-21T18:00:00Z', needs_attention: true }),
        slot('ok', { start_utc: '2026-09-21T07:00:00Z' }),
        slot('early', { start_utc: '2026-09-21T08:00:00Z', needs_attention: true }),
        slot('gone', { lifecycle: 'cancelled', needs_attention: true }),
      ],
    } as TodaySnapshot;
    expect(attentionRows(snapshot).map((s) => s.slot_id)).toEqual(['early', 'late']);
  });
});

describe('slotTime', () => {
  it('reads the wall clock from start_local', () => {
    expect(slotTime(slot('a', { start_local: '2026-09-21T09:15:00+01:00' }), 'Africa/Lagos')).toBe(
      '09:15',
    );
  });

  it('falls back to the venue timezone when start_local is missing', () => {
    expect(
      slotTime(slot('a', { start_local: null, start_utc: '2026-09-21T08:30:00Z' }), 'Africa/Lagos'),
    ).toBe('09:30');
  });
});

describe('day helpers', () => {
  it('adds days across month and year ends', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('resolves a selection against the current day key', () => {
    expect(resolveDay({ kind: 'today' }, '2026-09-21')).toBe('2026-09-21');
    expect(resolveDay({ kind: 'tomorrow' }, '2026-09-21')).toBe('2026-09-22');
    expect(resolveDay({ kind: 'date', date: '2026-10-05' }, '2026-09-21')).toBe('2026-10-05');
  });

  it('follows the day key when it rolls over midnight', () => {
    expect(resolveDay({ kind: 'today' }, '2026-09-22')).toBe('2026-09-22');
  });

  it('accepts only complete dates with a year from 2000 to 2100', () => {
    expect(parseDayInput('2026-09-21')).toBe('2026-09-21');
    expect(parseDayInput('0002-09-21')).toBeNull();
    expect(parseDayInput('2-09-21')).toBeNull();
    expect(parseDayInput('')).toBeNull();
    expect(parseDayInput('2026-02-30')).toBeNull();
    expect(parseDayInput('2101-01-01')).toBeNull();
  });

  it('labels a day key with a capitalised weekday', () => {
    expect(dayLabel('2026-09-21', 'fr')).toBe('Lundi 21 septembre');
    expect(dayLabel('2026-09-21', 'en')).toBe('Monday, September 21');
  });
});
