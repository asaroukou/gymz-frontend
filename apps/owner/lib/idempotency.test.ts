import { describe, expect, it } from 'vitest';

import { idempotencyKeyFor, sameAddress } from './idempotency';

describe('idempotencyKeyFor', () => {
  let n = 0;
  const gen = () => `k${++n}`;

  it('creates a key the first time', () => {
    expect(idempotencyKeyFor(null, 'a@x.sn', gen)).toEqual({ key: 'k1', email: 'a@x.sn' });
  });
  it('reuses the key for the same trimmed address', () => {
    const first = { key: 'k7', email: 'a@x.sn' };
    expect(idempotencyKeyFor(first, '  a@x.sn ', gen)).toBe(first);
  });
  it('makes a new key when only the case changes, since the body is sent as typed', () => {
    const first = { key: 'k7', email: 'a@x.sn' };
    const next = idempotencyKeyFor(first, 'A@X.sn', gen);
    expect(next.key).not.toBe('k7');
    expect(next.email).toBe('A@X.sn');
  });
  it('makes a new key when the address changes', () => {
    const first = { key: 'k7', email: 'a@x.sn' };
    expect(idempotencyKeyFor(first, 'b@x.sn', gen).key).not.toBe('k7');
  });
});

describe('sameAddress', () => {
  it('ignores case and surrounding spaces', () => {
    expect(sameAddress('  Awa.Diop@Gmail.com ', 'awa.diop@gmail.com')).toBe(true);
  });
  it('tells different addresses apart', () => {
    expect(sameAddress('awa@x.sn', 'awa2@x.sn')).toBe(false);
  });
});
