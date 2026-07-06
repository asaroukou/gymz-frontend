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
  client: AuthClient;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ client, children }: { client: AuthClient; children: ReactNode }) {
  const [session, setSession] = useState<SessionState>({ status: 'loading' });

  const refresh = useCallback(async () => {
    const token = await client.getIdToken();
    if (!token) {
      clearSessionCookie();
      setSession({ status: 'signed-out' });
      return;
    }
    setSessionCookie();
    setSession({ status: 'signed-in', claims: parseClaims(token) });
  }, [client]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      client,
      getToken: () => client.getIdToken(),
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
