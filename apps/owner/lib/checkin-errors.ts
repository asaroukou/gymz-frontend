import type { useTranslations } from 'next-intl';

import { ApiError } from '@iziwellpass/api/client';

import { apiErrorMessage } from './api-error';
import type { DecodedQrToken } from './qr-token';

export type Translate = ReturnType<typeof useTranslations<'frontdesk'>>;

/**
 * Explains a rejection the SERVER already made; never pre-empts the call.
 * A counter tablet with a skewed clock must not be able to refuse a valid
 * scan, so expiry is only ever used to phrase an error, not to skip a request.
 *
 * Only enriches when the server actually rejected the TOKEN (400/401) — a
 * duplicate 409, a 404, or a transport failure (offline TypeError, not even
 * an ApiError) has nothing to do with the token's expiry or venue, and must
 * fall straight through to the generic message instead of being mislabelled
 * "expired" just because the local clock is skewed. A plan-gate 403 on a
 * venue route never reaches here at all: `useRegisterCheckin`'s `onError`
 * intercepts `FEATURE_NOT_AVAILABLE` first and shows the upgrade toast.
 *
 * The venue-mismatch branch is skipped for `pass_booking` tokens: those carry
 * no venue_id of ours (the server resolves the venue from the token), so
 * `decoded.venueId` there is never "this counter's venue".
 */
export function qrErrorMessage(
  t: Translate,
  err: unknown,
  decoded: DecodedQrToken | null,
  venueId: string,
): string {
  const isTokenRejection = err instanceof ApiError && (err.status === 400 || err.status === 401);
  if (isTokenRejection && decoded) {
    if (decoded.expiresAt !== null && decoded.expiresAt * 1000 < Date.now()) {
      return apiErrorMessage(err, t('qr.errorExpired'));
    }
    if (
      decoded.kind !== 'pass_booking' &&
      decoded.venueId !== null &&
      decoded.venueId !== venueId
    ) {
      return apiErrorMessage(err, t('qr.errorWrongVenue'));
    }
  }
  return apiErrorMessage(err, t('error'));
}

/**
 * 409 on a walk-in means the member already walked in at this venue inside
 * the venue's dedupe window (walkin_dedupe_minutes, default 24h). It is the
 * error staff will hit most, so it gets its own copy.
 */
export function walkinErrorFallback(t: Translate, err: unknown): string {
  return err instanceof ApiError && err.status === 409 ? t('walkin.errorDuplicate') : t('error');
}
