import { describe, expect, it } from 'vitest';

import type { CheckIn, Staff } from '@iziwellpass/api/schemas';

import { feedRows, recordedByLabel } from './checkin-feed';

function checkIn(at: string, extra: Partial<CheckIn> = {}): CheckIn {
  return {
    id: at,
    checked_in_at: at,
    method: 'qr',
    tenant_id: 't',
    venue_id: 'v',
    ...extra,
  } as CheckIn;
}

const LABELS = {
  self: 'Auto (QR)',
  unknownStaff: "l'équipe",
  by: (name: string) => `par ${name}`,
};

describe('feedRows', () => {
  it('sorts newest first and applies the limit', () => {
    const rows = feedRows(
      [
        checkIn('2026-09-20T06:24:00Z'),
        checkIn('2026-09-20T06:32:00Z'),
        checkIn('2026-09-20T06:29:00Z'),
      ],
      2,
    );
    expect(rows.map((r) => r.checked_in_at)).toEqual([
      '2026-09-20T06:32:00Z',
      '2026-09-20T06:29:00Z',
    ]);
  });
  it('returns everything without a limit and [] for undefined', () => {
    expect(feedRows(undefined)).toEqual([]);
    expect(feedRows([checkIn('a'), checkIn('b')])).toHaveLength(2);
  });
});

describe('recordedByLabel', () => {
  const staff = new Map<string, Staff>([
    ['u1', { user_id: 'u1', first_name: 'Aïssatou', last_name: 'Ba' } as Staff],
  ]);
  it('self for QR without a recorder', () => {
    expect(recordedByLabel(checkIn('a'), staff, LABELS)).toBe('Auto (QR)');
  });
  it('by <staff name> when resolvable', () => {
    expect(
      recordedByLabel(checkIn('a', { method: 'manual', checked_in_by: 'u1' }), staff, LABELS),
    ).toBe('par Aïssatou Ba');
  });
  it('by <unknown staff> otherwise, never the raw id', () => {
    expect(
      recordedByLabel(checkIn('a', { method: 'manual', checked_in_by: 'u9' }), staff, LABELS),
    ).toBe("par l'équipe");
  });
});
