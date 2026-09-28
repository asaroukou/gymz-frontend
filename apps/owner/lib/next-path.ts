/** True for the TOTP enrolment page and anything under it. */
export function isMfaPath(pathname: string): boolean {
  return pathname === '/mfa' || pathname.startsWith('/mfa/');
}

const PROBE_ORIGIN = 'https://x.invalid';

// Backslashes (browsers read « \ » as « / »), whitespace and control
// characters (dropped by the URL parser: « /<tab>/evil.test » becomes
// « //evil.test »).
const UNSAFE_CHARS = /[\\\s\u0000-\u001f\u007f]/;

function isSameOrigin(path: string): boolean {
  try {
    return new URL(path, PROBE_ORIGIN).origin === PROBE_ORIGIN;
  } catch {
    return false;
  }
}

/**
 * Only allow same-origin, non-protocol-relative paths as a post-login (or
 * post-enrolment) redirect target. The enrolment page is never a target: a
 * user who still needs it is sent back by the backend's 403 (see
 * mfa-redirect.ts), and landing there after enrolling would start a second
 * AssociateSoftwareToken on an already-enrolled account.
 */
export function sanitizeNext(next: string | null): string {
  if (
    !next ||
    !next.startsWith('/') ||
    next.startsWith('//') ||
    UNSAFE_CHARS.test(next) ||
    !isSameOrigin(next)
  ) {
    return '/';
  }
  const pathname = next.split(/[?#]/)[0] ?? next;
  return isMfaPath(pathname) ? '/' : next;
}
