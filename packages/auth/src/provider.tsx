'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { AuthClient, SignInResult } from './cognito';
import { parseClaims, type Role, type SessionClaims } from './claims';
import { clearSessionCookie, setSessionCookie } from './session-cookie';

export type SessionState =
  { status: 'loading' } | { status: 'signed-out' } | { status: 'signed-in'; claims: SessionClaims };

export interface AuthContextValue {
  session: SessionState;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => void;
  /** For packages/api configureApi({ getToken }) wiring (SP4). */
  getToken: () => Promise<string | null>;
  /**
   * Re-fetches the ID token and re-syncs session state (e.g. after a
   * new-password challenge). Pass `{ force: true }` to mint a brand-new token
   * via the refresh token — bypassing the SDK's cached, still-valid ID token —
   * so freshly-changed claims (e.g. right after onboarding creates an org)
   * show up immediately instead of waiting for natural token expiry.
   */
  refresh: (opts?: { force?: boolean }) => Promise<void>;
  client: AuthClient;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ client, children }: { client: AuthClient; children: ReactNode }) {
  const [session, setSession] = useState<SessionState>({ status: 'loading' });

  const refresh = useCallback(
    async (opts?: { force?: boolean }) => {
      const token = opts?.force
        ? ((await client.forceRefreshSession()) ?? (await client.getIdToken()))
        : await client.getIdToken();
      if (!token) {
        clearSessionCookie();
        setSession({ status: 'signed-out' });
        return;
      }
      setSessionCookie();
      setSession({ status: 'signed-in', claims: parseClaims(token) });
    },
    [client],
  );

  useEffect(() => {
    // Mount-time refresh must never force: forceRefreshSession() always
    // triggers a refresh-token network round trip, which we don't want on
    // every page load — only when a caller explicitly asks for one (e.g.
    // right after onboarding mints new claims).
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      client,
      getToken: () => client.getIdToken(),
      refresh,
      signIn: async (email, password) => {
        const result = await client.signIn(email, password);
        if (result.kind === 'success') {
          await refresh();
        }
        return result;
      },
      signOut: () => {
        client.signOut();
        clearSessionCookie();
        setSession({ status: 'signed-out' });
      },
    }),
    [session, client, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}

export function useSession(): SessionState {
  return useAuth().session;
}

export function useRole(): Role | null {
  const session = useSession();
  return session.status === 'signed-in' ? session.claims.role : null;
}

export function usePermissions(): string[] {
  const session = useSession();
  return session.status === 'signed-in' ? session.claims.permissions : [];
}
