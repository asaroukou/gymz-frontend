import { describe, expect, it } from 'vitest';
import { ApiError } from '@iziwellpass/api/client';
import type { CancellationPreview } from '@iziwellpass/api/schemas';
import { isStalePreviewConflict, previewRows } from './cancellation-preview';

const base: CancellationPreview = {
  target_kind: 'slot',
  target_id: 'slot-1',
  active_bookings_affected: 14,
  member_booking_count: 11,
  pass_booking_count: 3,
  future_slots_affected: 0,
  notification_consequences: { member_emails_to_send: 12 },
  refund_consequences: { pass_credits_refunded: 3, member_credits_refunded: 0 },
  unchanged: { bookings_unchanged: 2, past_slots_preserved: 0 },
  blocking_condition: null,
  version: 'v1',
};

describe('previewRows', () => {
  it('orders the session rows as drawn on TeQNq and ends with a muted unchanged row', () => {
    const rows = previewRows(base, 'slot');
    expect(rows.map((r) => r.key)).toEqual([
      'bookings',
      'emails',
      'passCredits',
      'memberCredits',
      'unchanged',
    ]);
    expect(rows[0]).toEqual({
      key: 'bookings',
      value: 14,
      hint: 'bookings',
      hintValues: { members: 11, pass: 3 },
    });
    expect(rows[1]).toEqual({ key: 'emails', value: 12, hint: 'emails' });
    expect(rows[4]).toEqual({ key: 'unchanged', value: null, hint: 'unchanged', muted: true });
  });
  it('orders the course rows as drawn on o9VUa3: future slots first, no e-mail hint, no unchanged row', () => {
    const rows = previewRows(
      { ...base, target_kind: 'schedule', future_slots_affected: 23 },
      'schedule',
    );
    expect(rows.map((r) => r.key)).toEqual([
      'futureSlots',
      'bookings',
      'emails',
      'passCredits',
      'memberCredits',
    ]);
    expect(rows[0]).toEqual({ key: 'futureSlots', value: 23, hint: 'futureSlots' });
    expect(rows[2]).toEqual({ key: 'emails', value: 12 });
  });
});

describe('isStalePreviewConflict', () => {
  it('is true only for a 409 ApiError', () => {
    expect(
      isStalePreviewConflict(
        new ApiError(409, { code: 'CONFLICT', message: 'slot changed since preview' }),
      ),
    ).toBe(true);
    expect(isStalePreviewConflict(new ApiError(404, { code: 'NOT_FOUND', message: 'x' }))).toBe(
      false,
    );
    expect(isStalePreviewConflict(new Error('x'))).toBe(false);
  });
});
