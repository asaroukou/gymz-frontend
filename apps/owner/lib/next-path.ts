/** True for the TOTP enrolment page and anything under it. */
export function isMfaPath(pathname: string): boolean {
  return pathname === '/mfa' || pathname.startsWith('/mfa/');
}

/**
 * Only allow same-origin, non-protocol-relative paths as a post-login (or
 * post-enrolment) redirect target. The enrolment page is never a target: a
 * user who still needs it is sent back by the backend's 403 (see
 * mfa-redirect.ts), and landing there after enrolling would start a second
 * AssociateSoftwareToken on an already-enrolled account.
 */
export function sanitizeNext(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/';
  }
  const pathname = next.split(/[?#]/)[0] ?? next;
  return isMfaPath(pathname) ? '/' : next;
}
