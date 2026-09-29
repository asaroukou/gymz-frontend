import { describe, expect, it } from 'vitest';

import { classifyCodeError, codeErrorKey } from './email-change';

const named = (name: string) => Object.assign(new Error(name), { name });

describe('classifyCodeError', () => {
  it.each([
    ['CodeMismatchException', 'mismatch'],
    ['ExpiredCodeException', 'expired'],
    ['LimitExceededException', 'tooMany'],
    ['TooManyRequestsException', 'tooMany'],
    ['TooManyFailedAttemptsException', 'tooMany'],
    ['AliasExistsException', 'aliasExists'],
    ['NetworkError', 'network'],
  ])('%s → %s', (name, kind) => {
    expect(classifyCodeError(named(name))).toBe(kind);
  });
  it('reads a Cognito `code` field too', () => {
    expect(classifyCodeError({ code: 'CodeMismatchException', message: 'x' })).toBe('mismatch');
  });
  it('treats a fetch TypeError as network', () => {
    expect(classifyCodeError(new TypeError('Failed to fetch'))).toBe('network');
  });
  it('falls back to other', () => {
    expect(classifyCodeError('nope')).toBe('other');
  });
});

describe('codeErrorKey', () => {
  it('shows the network line for other', () => {
    expect(codeErrorKey('other')).toBe(codeErrorKey('network'));
  });
});
