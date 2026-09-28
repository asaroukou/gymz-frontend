import { authErrorCode } from '@iziwellpass/auth/errors';

/** Authenticator apps show six digits. */
export const CODE_LENGTH = 6;

/** Digits only, at most six: « 123 456 » or « 123-456 » from a paste become « 123456 ». */
export function normalizeCode(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, CODE_LENGTH);
}

export type TotpErrorOutcome = 'invalid' | 'expired' | 'other';

/**
 * What a failed code means for the screen: `invalid` (wrong or already-used
 * code: clear the boxes and say so), `expired` (the challenge or the session
 * is gone: sign in again), `other` (network, throttling: generic message).
 */
export function totpErrorOutcome(err: unknown): TotpErrorOutcome {
  switch (authErrorCode(err)) {
    case 'codeMismatch':
    case 'codeExpired':
      return 'invalid';
    case 'sessionExpired':
      return 'expired';
    default:
      return 'other';
  }
}
