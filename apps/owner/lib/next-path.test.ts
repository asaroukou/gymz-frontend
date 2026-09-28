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

  // Browsers treat « \\ » like « / » and drop tabs/newlines while parsing, so
  // these read as protocol-relative URLs (searchParams.get has already
  // decoded %5C and %09 by the time sanitizeNext sees them).
  it.each([
    '/\\evil.test',
    '/\\/evil.test',
    '/\tevil.test',
    '/\t/evil.test',
    '/\n/evil.test',
    '/\r/evil.test',
    ' /x',
    '/x y',
    '/members?q=a\\b',
  ])('falls back to / for a backslash, whitespace or control character (%j)', (value) => {
    expect(sanitizeNext(value)).toBe('/');
  });

  it('keeps a still-encoded backslash, which resolves same-origin', () => {
    expect(new URL('/%5Cevil.test', 'https://x.invalid').origin).toBe('https://x.invalid');
    expect(sanitizeNext('/%5Cevil.test')).toBe('/%5Cevil.test');
  });

  it('keeps an encoded query and hash', () => {
    expect(sanitizeNext('/members?q=awa%20diop#list')).toBe('/members?q=awa%20diop#list');
  });

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
