import { ApiError } from '@iziwellpass/api/client';

export type AddParticipantErrorKind = 'full' | 'duplicate' | 'ineligible';

/**
 * `POST /slots/{sid}/bookings` returns `CONFLICT` for both "slot full" and
 * "already booked"; the message is the only discriminator (backend
 * `booking/service.rs`: "A booking already exists for this actor on this
 * slot"). 403 means the member is not entitled to the venue.
 */
export function addParticipantError(err: unknown): AddParticipantErrorKind | null {
  if (!(err instanceof ApiError)) return null;
  if (err.status === 409) return /already exists/i.test(err.message) ? 'duplicate' : 'full';
  if (err.status === 403) return 'ineligible';
  return null;
}
