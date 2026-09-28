import { describe, expect, it } from 'vitest';

import { idempotencyKeyFor, normalizeEmail } from './idempotency';

describe('idempotencyKeyFor', () => {
  let n = 0;
  const gen = () => `k${++n}`;

  it('creates a key the first time', () => {
    expect(idempotencyKeyFor(null, 'a@x.sn', gen)).toEqual({ key: 'k1', email: 'a@x.sn' });
  });
  it('reuses the key for the same address, ignoring case and spaces', () => {
    const first = { key: 'k7', email: 'a@x.sn' };
    expect(idempotencyKeyFor(first, ' A@X.sn ', gen)).toBe(first);
  });
  it('makes a new key when the address changes', () => {
    const first = { key: 'k7', email: 'a@x.sn' };
    expect(idempotencyKeyFor(first, 'b@x.sn', gen).key).not.toBe('k7');
  });
});

describe('normalizeEmail', () => {
  it('trims and lower-cases', () => {
    expect(normalizeEmail('  Awa.Diop@Gmail.com ')).toBe('awa.diop@gmail.com');
  });
});
