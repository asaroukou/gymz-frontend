// Classifies raw Cognito / network errors into a small, stable set of codes the
// UI can translate. amazon-cognito-identity-js rejects with plain `Error`
// instances whose `.name` (and sometimes `.code`) is the Cognito exception
// (e.g. "NotAuthorizedException") and whose `.message` is English prose. The UI
// must never show that English to francophone users, so callers map the code
// returned here to a localized string instead of surfacing `err.message`.

export type AuthErrorCode =
  | 'invalidCredentials'
  | 'userNotConfirmed'
  | 'tooManyAttempts'
  | 'passwordResetRequired'
  | 'invalidPassword'
  | 'codeMismatch'
  | 'codeExpired'
  | 'sessionExpired'
  | 'usernameExists'
  | 'network'
  | 'unknown';

/** `.name` of the error the client rejects with when no user is signed in. */
export const NOT_SIGNED_IN = 'NotSignedInError';

/** Rejection for enrolment calls made without a valid session. */
export function notSignedInError(): Error {
  const err = new Error('No signed-in user');
  err.name = NOT_SIGNED_IN;
  return err;
}

function exceptionName(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { code?: unknown; name?: unknown };
    if (typeof e.code === 'string' && e.code) return e.code;
    if (typeof e.name === 'string' && e.name) return e.name;
  }
  return '';
}

function messageOf(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { message?: unknown };
    if (typeof e.message === 'string') return e.message;
  }
  return '';
}

/**
 * Maps a raw auth error to a stable, UI-translatable code. Unknown user
 * (`UserNotFoundException`) folds into `invalidCredentials` on purpose, so the
 * screen never confirms whether an email is registered (account enumeration).
 */
export function authErrorCode(err: unknown): AuthErrorCode {
  const name = exceptionName(err);
  const message = messageOf(err);

  switch (name) {
    case 'NotAuthorizedException':
      // Cognito reuses this for wrong password, lockout, and an expired
      // MFA/challenge session; the English message is the only discriminator.
      if (/attempts exceeded/i.test(message)) return 'tooManyAttempts';
      if (/session is expired|invalid session/i.test(message)) return 'sessionExpired';
      return 'invalidCredentials';
    case NOT_SIGNED_IN:
      return 'sessionExpired';
    case 'UserNotFoundException':
      return 'invalidCredentials';
    case 'UserNotConfirmedException':
      return 'userNotConfirmed';
    case 'PasswordResetRequiredException':
      return 'passwordResetRequired';
    case 'InvalidPasswordException':
      return 'invalidPassword';
    case 'LimitExceededException':
    case 'TooManyRequestsException':
    case 'TooManyFailedAttemptsException':
      return 'tooManyAttempts';
    case 'CodeMismatchException':
    // Wrong first code during TOTP enrolment (VerifySoftwareToken).
    case 'EnableSoftwareTokenMFAException':
      return 'codeMismatch';
    case 'ExpiredCodeException':
      return 'codeExpired';
    case 'UsernameExistsException':
      return 'usernameExists';
    case 'NetworkError':
      return 'network';
    default:
      // Cognito's SRP flow surfaces offline/DNS failures as a generic error
      // whose message mentions the network rather than a typed name.
      if (/network|failed to fetch/i.test(message)) return 'network';
      return 'unknown';
  }
}
