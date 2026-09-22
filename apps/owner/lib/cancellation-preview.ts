import { ApiError } from '@iziwellpass/api/client';
import type { CancellationPreview } from '@iziwellpass/api/schemas';

export type PreviewRowKey =
  'futureSlots' | 'bookings' | 'emails' | 'passCredits' | 'memberCredits' | 'unchanged';

export interface PreviewRow {
  key: PreviewRowKey;
  /** `null` renders « — » (the informational « Inchangé » row). */
  value: number | null;
  hint?: PreviewRowKey;
  hintValues?: { members: number; pass: number };
  muted?: boolean;
}

/** Rows in canvas order: `TeQNq` (slot) and `o9VUa3` (schedule) differ on purpose (spec E1). */
export function previewRows(preview: CancellationPreview, kind: 'slot' | 'schedule'): PreviewRow[] {
  const bookings: PreviewRow = {
    key: 'bookings',
    value: preview.active_bookings_affected,
    hint: 'bookings',
    hintValues: { members: preview.member_booking_count, pass: preview.pass_booking_count },
  };
  const passCredits: PreviewRow = {
    key: 'passCredits',
    value: preview.refund_consequences.pass_credits_refunded,
    hint: 'passCredits',
  };
  const memberCredits: PreviewRow = {
    key: 'memberCredits',
    value: preview.refund_consequences.member_credits_refunded,
    hint: 'memberCredits',
  };
  const emails = preview.notification_consequences.member_emails_to_send;
  if (kind === 'schedule') {
    return [
      { key: 'futureSlots', value: preview.future_slots_affected, hint: 'futureSlots' },
      bookings,
      { key: 'emails', value: emails },
      passCredits,
      memberCredits,
    ];
  }
  return [
    bookings,
    { key: 'emails', value: emails, hint: 'emails' },
    passCredits,
    memberCredits,
    { key: 'unchanged', value: null, hint: 'unchanged', muted: true },
  ];
}

export function isStalePreviewConflict(err: unknown): boolean {
  return err instanceof ApiError && err.status === 409;
}
