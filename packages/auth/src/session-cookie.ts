// UX marker cookie so Next middleware can redirect signed-out users
// server-side. Contains NO token material and is NOT a security boundary —
// the API authorizer is. Max-Age tracks the Cognito refresh-token validity
// (30 days default); middleware treats presence as "probably signed in".

export const SESSION_COOKIE = 'iwp_session';

const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

// secure: https-only in production; conditional on protocol because jsdom
// (and some dev setups) run on http://localhost and silently refuse to store
// cookies marked `secure` from a non-https origin.
function secureAttr(): string {
  return typeof location !== 'undefined' && location.protocol === 'https:' ? '; secure' : '';
}

export function setSessionCookie(): void {
  document.cookie = `${SESSION_COOKIE}=1; path=/; max-age=${THIRTY_DAYS_SECONDS}; samesite=lax${secureAttr()}`;
}

export function clearSessionCookie(): void {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; samesite=lax${secureAttr()}`;
}
