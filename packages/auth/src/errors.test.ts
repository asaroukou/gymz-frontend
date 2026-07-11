import { describe, expect, it } from 'vitest';

import { authErrorCode } from './errors';

function cognito(name: string, message = ''): Error {
  const err = new Error(message);
  err.name = name;
  return err;
}

describe('authErrorCode', () => {
  it('maps a wrong password to invalidCredentials', () => {
    expect(
      authErrorCode(cognito('NotAuthorizedException', 'Incorrect username or password.')),
    ).toBe('invalidCredentials');
  });

  it('maps a locked-out NotAuthorizedException to tooManyAttempts', () => {
    expect(authErrorCode(cognito('NotAuthorizedException', 'Password attempts exceeded'))).toBe(
      'tooManyAttempts',
    );
  });

  it('folds an unknown user into invalidCredentials (no account enumeration)', () => {
    expect(authErrorCode(cognito('UserNotFoundException'))).toBe('invalidCredentials');
  });

  it('flags an unconfirmed account', () => {
    expect(authErrorCode(cognito('UserNotConfirmedException'))).toBe('userNotConfirmed');
  });

  it('flags an admin-forced password reset', () => {
    expect(authErrorCode(cognito('PasswordResetRequiredException'))).toBe('passwordResetRequired');
  });

  it('maps rate-limit exceptions to tooManyAttempts', () => {
    expect(authErrorCode(cognito('LimitExceededException'))).toBe('tooManyAttempts');
    expect(authErrorCode(cognito('TooManyRequestsException'))).toBe('tooManyAttempts');
  });

  it('classifies confirmation-code errors', () => {
    expect(authErrorCode(cognito('CodeMismatchException'))).toBe('codeMismatch');
    expect(authErrorCode(cognito('ExpiredCodeException'))).toBe('codeExpired');
  });

  it('flags a duplicate signup', () => {
    expect(authErrorCode(cognito('UsernameExistsException'))).toBe('usernameExists');
  });

  it('reads the code field when present', () => {
    expect(authErrorCode({ code: 'InvalidPasswordException' })).toBe('invalidPassword');
  });

  it('detects offline errors from the message when the name is generic', () => {
    expect(authErrorCode(new TypeError('Failed to fetch'))).toBe('network');
    expect(authErrorCode(cognito('NetworkError'))).toBe('network');
  });

  it('falls back to unknown for anything unrecognized', () => {
    expect(authErrorCode(cognito('SomeNewException'))).toBe('unknown');
    expect(authErrorCode(null)).toBe('unknown');
    expect(authErrorCode('boom')).toBe('unknown');
  });
});
