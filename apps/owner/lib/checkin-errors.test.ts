import { describe, expect, it } from 'vitest';

import { ApiError } from '@iziwellpass/api/client';

import { qrErrorMessage, walkinErrorFallback, type Translate } from './checkin-errors';
import type { DecodedQrToken } from './qr-token';

// The fake t echoes the key so assertions read the copy path, not the copy.
const t = ((key: string) => key) as unknown as Translate;
const api = (status: number) => new ApiError(status, { code: 'x', message: 'server said' });
const decoded = (extra: Partial<DecodedQrToken>): DecodedQrToken =>
  ({ kind: 'booking', venueId: 'v1', expiresAt: null, ...extra }) as DecodedQrToken;

describe('qrErrorMessage', () => {
  it('phrases an expired token only when the server rejected it', () => {
    const past = Math.floor(Date.now() / 1000) - 60;
    expect(qrErrorMessage(t, api(401), decoded({ expiresAt: past }), 'v1')).toContain(
      'qr.errorExpired',
    );
    expect(qrErrorMessage(t, api(403), decoded({ expiresAt: past }), 'v1')).toContain('error');
    expect(qrErrorMessage(t, api(403), decoded({ expiresAt: past }), 'v1')).not.toContain(
      'qr.errorExpired',
    );
  });
  it('phrases a wrong venue for booking/walkin tokens, never for pass tokens', () => {
    expect(qrErrorMessage(t, api(400), decoded({ venueId: 'other' }), 'v1')).toContain(
      'qr.errorWrongVenue',
    );
    expect(
      qrErrorMessage(t, api(400), decoded({ kind: 'pass_booking', venueId: 'other' }), 'v1'),
    ).not.toContain('qr.errorWrongVenue');
  });
  it('falls back to the generic message for transport errors and undecodable tokens', () => {
    expect(qrErrorMessage(t, new TypeError('offline'), null, 'v1')).toBe('error');
    expect(qrErrorMessage(t, api(409), null, 'v1')).toContain('error');
  });
});

describe('walkinErrorFallback', () => {
  it('names the duplicate on 409 and is generic otherwise', () => {
    expect(walkinErrorFallback(t, api(409))).toBe('walkin.errorDuplicate');
    expect(walkinErrorFallback(t, api(500))).toBe('error');
    expect(walkinErrorFallback(t, new Error('x'))).toBe('error');
  });
});
