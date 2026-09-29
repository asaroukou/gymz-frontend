import { parseClaims, type SessionClaims } from './claims';

// helper: build an unsigned JWT with the given payload
function fakeJwt(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'none' })}.${b64(payload)}.sig`;
}

describe('parseClaims', () => {
  it('parses org claims from an owner token', () => {
    const token = fakeJwt({
      sub: 'user-1',
      email: 'owner@example.com',
      org_id: 'org-1',
      role: 'owner',
      permissions: '["venue:write","staff:invite"]',
      exp: 1900000000,
    });
    const claims: SessionClaims = parseClaims(token);
    expect(claims.sub).toBe('user-1');
    expect(claims.email).toBe('owner@example.com');
    expect(claims.orgId).toBe('org-1');
    expect(claims.role).toBe('owner');
    expect(claims.permissions).toEqual(['venue:write', 'staff:invite']);
    expect(claims.expiresAt).toBe(1900000000);
  });

  it('handles permissions already provided as an array', () => {
    const token = fakeJwt({ sub: 'u', permissions: ['a', 'b'], exp: 1 });
    expect(parseClaims(token).permissions).toEqual(['a', 'b']);
  });

  it('handles comma-separated permissions string', () => {
    const token = fakeJwt({ sub: 'u', permissions: 'a,b', exp: 1 });
    expect(parseClaims(token).permissions).toEqual(['a', 'b']);
  });

  it('returns consumer-shaped claims when org claims are absent', () => {
    const token = fakeJwt({ sub: 'u', email: 'c@example.com', exp: 1 });
    const claims = parseClaims(token);
    expect(claims.orgId).toBeNull();
    expect(claims.role).toBeNull();
    expect(claims.permissions).toEqual([]);
  });

  it('throws on a malformed token', () => {
    expect(() => parseClaims('not-a-jwt')).toThrow();
  });

  it('parses an unknown role string to null', () => {
    const token = fakeJwt({ sub: 'u', role: 'superadmin', exp: 1 });
    expect(parseClaims(token).role).toBeNull();
  });

  it('prefers the given_name claim for the display name', () => {
    const token = fakeJwt({ sub: 'u', given_name: 'Awa', name: 'Awa Diallo', exp: 1 });
    expect(parseClaims(token).name).toBe('Awa');
  });

  it('falls back to the first word of the name claim', () => {
    const token = fakeJwt({ sub: 'u', name: 'Kofi Mensah', exp: 1 });
    expect(parseClaims(token).name).toBe('Kofi');
  });

  it('leaves the display name null when the token carries no name', () => {
    const token = fakeJwt({ sub: 'u', email: 'owner@example.com', exp: 1 });
    expect(parseClaims(token).name).toBeNull();
  });
});

describe('parseClaims: mfaEnrolled', () => {
  it('is true when mfa_enrolled_at is a non-empty string', () => {
    const token = fakeJwt({ mfa_enrolled_at: '2026-09-28T10:00:00Z' });
    expect(parseClaims(token).mfaEnrolled).toBe(true);
  });
  it('is true when mfa_enrolled_at is a number', () => {
    const token = fakeJwt({ mfa_enrolled_at: 1790000000 });
    expect(parseClaims(token).mfaEnrolled).toBe(true);
  });
  it('is false when absent or empty', () => {
    expect(parseClaims(fakeJwt({})).mfaEnrolled).toBe(false);
    expect(parseClaims(fakeJwt({ mfa_enrolled_at: '' })).mfaEnrolled).toBe(false);
  });
});
