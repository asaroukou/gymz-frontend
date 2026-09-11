import { describe, expect, it } from 'vitest';
import { authErrorMessageKey } from './errors';

describe('authErrorMessageKey', () => {
  it('maps wrong credentials', () => {
    expect(authErrorMessageKey({ name: 'NotAuthorizedException' })).toBe(
      'auth.error.invalidCredentials',
    );
  });
  it('maps unknown user to the same generic credential error (no account enumeration)', () => {
    expect(authErrorMessageKey({ name: 'UserNotFoundException' })).toBe(
      'auth.error.invalidCredentials',
    );
  });
  it('maps network failures', () => {
    expect(authErrorMessageKey({ code: 'NetworkError' })).toBe('auth.error.network');
  });
  it('falls back to a generic key', () => {
    expect(authErrorMessageKey(new Error('boom'))).toBe('auth.error.generic');
  });
});
