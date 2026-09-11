export function authErrorMessageKey(err: unknown): string {
  const name =
    typeof err === 'object' && err !== null ? String((err as { name?: unknown }).name ?? '') : '';
  const code =
    typeof err === 'object' && err !== null ? String((err as { code?: unknown }).code ?? '') : '';
  if (name === 'NotAuthorizedException' || name === 'UserNotFoundException') {
    // Deliberately identical message: never reveal whether an account exists.
    return 'auth.error.invalidCredentials';
  }
  if (name === 'UserNotConfirmedException') return 'auth.error.notConfirmed';
  if (name === 'TooManyRequestsException' || name === 'LimitExceededException') {
    return 'auth.error.tooMany';
  }
  if (code === 'NetworkError' || name === 'NetworkError') return 'auth.error.network';
  return 'auth.error.generic';
}
