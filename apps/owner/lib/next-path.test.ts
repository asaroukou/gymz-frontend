import { describe, expect, it } from 'vitest';

import { isMfaPath, sanitizeNext } from './next-path';

describe('sanitizeNext', () => {
  it('keeps same-origin paths with their query', () => {
    expect(sanitizeNext('/members?q=awa')).toBe('/members?q=awa');
  });

  it.each([null, '', 'https://evil.test', '//evil.test/x', 'members'])(
    'falls back to / for %s',
    (value) => {
      expect(sanitizeNext(value)).toBe('/');
    },
  );

  it.each(['/mfa', '/mfa?next=%2Fmembers', '/mfa/x', '/mfa#top'])(
    'never sends a login back to the enrolment page (%s)',
    (value) => {
      expect(sanitizeNext(value)).toBe('/');
    },
  );

  it('keeps a path that only starts with the letters mfa', () => {
    expect(sanitizeNext('/mfaq')).toBe('/mfaq');
  });
});

describe('isMfaPath', () => {
  it('matches /mfa and its sub-paths only', () => {
    expect(isMfaPath('/mfa')).toBe(true);
    expect(isMfaPath('/mfa/')).toBe(true);
    expect(isMfaPath('/mfaq')).toBe(false);
    expect(isMfaPath('/members')).toBe(false);
  });
});
