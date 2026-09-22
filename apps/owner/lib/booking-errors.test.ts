import { describe, expect, it } from 'vitest';
import { ApiError } from '@iziwellpass/api/client';
import { addParticipantError } from './booking-errors';

const conflict = (message: string) => new ApiError(409, { code: 'CONFLICT', message });

describe('addParticipantError', () => {
  it('classifies the backend duplicate message', () => {
    expect(
      addParticipantError(conflict('A booking already exists for this actor on this slot')),
    ).toBe('duplicate');
  });
  it('treats every other 409 as full', () => {
    expect(addParticipantError(conflict('Slot is full — no available capacity'))).toBe('full');
    expect(addParticipantError(conflict('Slot abc is not available for booking'))).toBe('full');
  });
  it('maps 403 to ineligible', () => {
    expect(
      addParticipantError(new ApiError(403, { code: 'FORBIDDEN', message: 'not entitled' })),
    ).toBe('ineligible');
  });
  it('returns null for anything else', () => {
    expect(addParticipantError(new ApiError(500, { code: 'INTERNAL', message: 'x' }))).toBeNull();
    expect(addParticipantError(new Error('network'))).toBeNull();
  });
});
