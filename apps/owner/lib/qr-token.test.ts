import { describe, expect, it } from 'vitest';

import { decodeQrToken } from './qr-token';

/** Builds a token the way the backend does: iwp1.<b64url(json)>.<b64url(mac)>. */
function makeToken(payload: unknown, { prefix = 'iwp1', mac = 'c2ln' } = {}): string {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json, 'utf8').toString('base64url');
  return `${prefix}.${b64}.${mac}`;
}

const BASE = {
  tenant_id: '11111111-1111-1111-1111-111111111111',
  venue_id: '22222222-2222-2222-2222-222222222222',
  jti: 'abc',
  iat: 1_757_000_000,
  exp: 1_757_000_300,
};

describe('decodeQrToken — the three kinds', () => {
  it('decodes a booking token', () => {
    const got = decodeQrToken(makeToken({ ...BASE, kind: 'booking', booking_id: 'b1' }));
    expect(got).toEqual({
      kind: 'booking',
      venueId: '22222222-2222-2222-2222-222222222222',
      expiresAt: 1_757_000_300,
    });
  });

  it('decodes a walkin token (which also carries member_id)', () => {
    const got = decodeQrToken(makeToken({ ...BASE, kind: 'walkin', member_id: 'm1' }));
    expect(got?.kind).toBe('walkin');
  });

  it('decodes a pass_booking token', () => {
    const got = decodeQrToken(makeToken({ ...BASE, kind: 'pass_booking', pass_booking_id: 'p1' }));
    expect(got?.kind).toBe('pass_booking');
  });
});

describe('decodeQrToken — returns null rather than guessing', () => {
  it('rejects a wrong version prefix', () => {
    expect(decodeQrToken(makeToken({ ...BASE, kind: 'booking' }, { prefix: 'iwp2' }))).toBeNull();
  });

  it('rejects a wrong segment count', () => {
    const b64 = Buffer.from(JSON.stringify({ ...BASE, kind: 'booking' })).toString('base64url');
    expect(decodeQrToken(`iwp1.${b64}`)).toBeNull();
    expect(decodeQrToken(`iwp1.${b64}.sig.extra`)).toBeNull();
  });

  it('rejects an unknown kind', () => {
    expect(decodeQrToken(makeToken({ ...BASE, kind: 'teleport' }))).toBeNull();
  });

  it('rejects a payload that is not JSON', () => {
    expect(decodeQrToken(`iwp1.${Buffer.from('not json').toString('base64url')}.sig`)).toBeNull();
  });

  it('rejects JSON that is not an object', () => {
    expect(decodeQrToken(makeToken('a string'))).toBeNull();
    expect(decodeQrToken(makeToken(42))).toBeNull();
    expect(decodeQrToken(makeToken(null))).toBeNull();
  });

  it('rejects a payload with no kind', () => {
    expect(decodeQrToken(makeToken({ ...BASE }))).toBeNull();
  });

  it('never throws on arbitrary input', () => {
    for (const bad of ['', '.', '..', 'iwp1..', 'iwp1.!!!!.sig', 'plain-text', 'iwp1.%%%.x']) {
      expect(() => decodeQrToken(bad), bad).not.toThrow();
      expect(decodeQrToken(bad), bad).toBeNull();
    }
  });
});

describe('decodeQrToken — optional fields', () => {
  it('yields null venueId/expiresAt when absent rather than undefined', () => {
    const got = decodeQrToken(makeToken({ kind: 'booking' }));
    expect(got).toEqual({ kind: 'booking', venueId: null, expiresAt: null });
  });

  it('ignores non-string venue_id and non-number exp', () => {
    const got = decodeQrToken(makeToken({ kind: 'booking', venue_id: 7, exp: 'soon' }));
    expect(got).toEqual({ kind: 'booking', venueId: null, expiresAt: null });
  });
});
