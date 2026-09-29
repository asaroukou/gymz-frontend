import type { SessionClaims } from '@iziwellpass/auth/claims';

export type SessionClaimsLike = SessionClaims;

export interface SessionState {
  status: 'loading' | 'signed-in' | 'signed-out';
  claims: SessionClaims | null;
  /** Set when the session ended on its own (refresh failed), not when the member signed out. */
  reason?: 'session-ended';
}

export type SessionAction =
  | { type: 'resolved'; claims: SessionClaims | null }
  | { type: 'signed-in'; claims: SessionClaims }
  | { type: 'signed-out'; reason?: 'session-ended' };

export const initialSession: SessionState = { status: 'loading', claims: null };

export function reduceSession(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'resolved':
      return action.claims
        ? { status: 'signed-in', claims: action.claims }
        : { status: 'signed-out', claims: null };
    case 'signed-in':
      return { status: 'signed-in', claims: action.claims };
    case 'signed-out':
      return action.reason
        ? { status: 'signed-out', claims: null, reason: action.reason }
        : { status: 'signed-out', claims: null };
    default:
      return state;
  }
}
