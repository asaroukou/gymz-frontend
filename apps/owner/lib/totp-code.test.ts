import { describe, expect, it } from 'vitest';

import { CODE_LENGTH, normalizeCode, totpErrorOutcome } from './totp-code';

const named = (name: string, message = '') => Object.assign(new Error(message), { name });

describe('normalizeCode', () => {
  it.each([
    ['123456', '123456'],
    ['123 456', '123456'],
    ['123-456', '123456'],
    [' 12 34 56\n', '123456'],
    ['1234567', '123456'],
    ['abc', ''],
  ])('%j -> %j', (raw, expected) => {
    expect(normalizeCode(raw)).toBe(expected);
  });

  it('caps at six digits', () => {
    expect(CODE_LENGTH).toBe(6);
  });
});

describe('totpErrorOutcome', () => {
  it('treats a wrong or reused code as invalid', () => {
    expect(totpErrorOutcome(named('CodeMismatchException'))).toBe('invalid');
    expect(totpErrorOutcome(named('EnableSoftwareTokenMFAException'))).toBe('invalid');
    expect(totpErrorOutcome(named('ExpiredCodeException'))).toBe('invalid');
  });

  it('treats a dead challenge session or a signed-out user as expired', () => {
    expect(
      totpErrorOutcome(
        named('NotAuthorizedException', 'Invalid session for the user, session is expired.'),
      ),
    ).toBe('expired');
    expect(totpErrorOutcome(named('NotSignedInError'))).toBe('expired');
  });

  it('treats throttling, network and unknown errors as other', () => {
    expect(totpErrorOutcome(named('TooManyRequestsException'))).toBe('other');
    expect(totpErrorOutcome(new TypeError('Failed to fetch'))).toBe('other');
    expect(totpErrorOutcome('weird')).toBe('other');
  });
});
