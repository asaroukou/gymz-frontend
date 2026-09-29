export type CodeErrorKind = 'mismatch' | 'expired' | 'tooMany' | 'aliasExists' | 'network' | 'other';

export const RESEND_COOLDOWN_S = 60;
export const CODE_LENGTH = 6;

const BY_NAME: Record<string, CodeErrorKind> = {
  CodeMismatchException: 'mismatch',
  ExpiredCodeException: 'expired',
  LimitExceededException: 'tooMany',
  TooManyRequestsException: 'tooMany',
  TooManyFailedAttemptsException: 'tooMany',
  AliasExistsException: 'aliasExists',
  NetworkError: 'network',
};

export function classifyCodeError(err: unknown): CodeErrorKind {
  if (typeof err !== 'object' || err === null) return 'other';
  const e = err as { name?: unknown; code?: unknown };
  const id = typeof e.code === 'string' ? e.code : typeof e.name === 'string' ? e.name : '';
  if (BY_NAME[id]) return BY_NAME[id];
  if (err instanceof TypeError) return 'network';
  return 'other';
}

export function codeErrorKey(kind: CodeErrorKind): string {
  switch (kind) {
    case 'mismatch':
      return 'emailChange.errors.mismatch';
    case 'expired':
      return 'emailChange.errors.expired';
    case 'tooMany':
      return 'emailChange.errors.tooMany';
    case 'aliasExists':
      return 'emailChange.errors.aliasExists';
    default:
      return 'emailChange.errors.network';
  }
}
