'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';

import { authErrorCode, type AuthErrorCode } from '@iziwellpass/auth/errors';

export type { AuthErrorCode };

export interface ResolvedAuthError {
  code: AuthErrorCode;
  message: string;
}

/**
 * Turns a raw auth error into a localized message. Every classified code has a
 * string under the `auth.errors` namespace; only `unknown` falls back to the
 * flow-specific generic (`fallback`) so a novel Cognito exception never leaks
 * English prose to the operator.
 *
 * Shared by login and the new-password challenge (this app has no signup or
 * confirm flow) so error copy can't drift between them.
 */
export function useAuthError(): (err: unknown, fallback: string) => ResolvedAuthError {
  const t = useTranslations('auth.errors');
  return useCallback(
    (err, fallback) => {
      const code = authErrorCode(err);
      return { code, message: code === 'unknown' ? fallback : t(code) };
    },
    [t],
  );
}
