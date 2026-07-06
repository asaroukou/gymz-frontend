// UX marker cookie so Next middleware can redirect signed-out users
// server-side. Contains NO token material and is NOT a security boundary —
// the API authorizer is. Max-Age tracks the Cognito refresh-token validity
// (30 days default); middleware treats presence as "probably signed in".

export const SESSION_COOKIE = 'iwp_session';

const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

export function setSessionCookie(): void {
  document.cookie = `${SESSION_COOKIE}=1; path=/; max-age=${THIRTY_DAYS_SECONDS}; samesite=lax`;
}

export function clearSessionCookie(): void {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
}
