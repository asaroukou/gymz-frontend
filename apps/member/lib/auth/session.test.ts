import { describe, expect, it } from 'vitest';
import { reduceSession, initialSession, type SessionClaimsLike } from './session';

const claims: SessionClaimsLike = { sub: 's', name: 'Awa', role: 'consumer' } as SessionClaimsLike;

describe('reduceSession', () => {
  it('starts loading', () => {
    expect(initialSession.status).toBe('loading');
  });
  it('resolves to signed-in with claims', () => {
    const s = reduceSession(initialSession, { type: 'resolved', claims });
    expect(s.status).toBe('signed-in');
    expect(s.claims).toBe(claims);
  });
  it('resolves to signed-out when no claims', () => {
    const s = reduceSession(initialSession, { type: 'resolved', claims: null });
    expect(s.status).toBe('signed-out');
  });
  it('signOut clears claims', () => {
    const inA = reduceSession(initialSession, { type: 'resolved', claims });
    const out = reduceSession(inA, { type: 'signed-out' });
    expect(out).toEqual({ status: 'signed-out', claims: null });
  });
});
