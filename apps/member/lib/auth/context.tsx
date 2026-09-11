import { createContext, useContext, useEffect, useReducer, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureApi } from '@iziwellpass/api/client';
import { parseClaims, type SessionClaims } from '@iziwellpass/auth/claims';
import { createMemoryBackedStorage, type AsyncKV } from './storage';
import { createMemberAuthClient, type SignInResult } from './cognito';
import { reduceSession, initialSession } from './session';
import { env } from '../env';

interface AuthContextValue {
  status: 'loading' | 'signed-in' | 'signed-out';
  claims: SessionClaims | null;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  onSignedIn: (idToken: string) => void;
  signOut: () => void;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const asyncKV: AsyncKV = {
  getAllKeys: () => AsyncStorage.getAllKeys(),
  multiGet: (keys) => AsyncStorage.multiGet(keys) as Promise<[string, string | null][]>,
  setItem: (k, v) => AsyncStorage.setItem(k, v),
  removeItem: (k) => AsyncStorage.removeItem(k),
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reduceSession, initialSession);

  // Build ONE storage adapter and ONE auth client for the app's lifetime, in a
  // useState initializer (runs once). The effect hydrates *this* storage before
  // the client's first token read — the ordering hazard is why they must be the
  // same instance.
  const [{ client, hydrate }] = useState(() => {
    const { storage, hydrate } = createMemoryBackedStorage(asyncKV);
    const client = createMemberAuthClient({
      userPoolId: env.cognitoUserPoolId,
      clientId: env.cognitoClientId,
      storage,
    });
    return { client, hydrate };
  });

  useEffect(() => {
    let active = true;
    // Configure the shared api client: real gateway, this session's token,
    // refresh-once-then-sign-out on 401. controlPlaneBaseUrl stays empty.
    configureApi({
      baseUrl: env.apiBaseUrl,
      getToken: () => client.getIdToken(),
      onUnauthorized: async () => {
        const fresh = await client.forceRefreshSession();
        if (!fresh) {
          client.signOut();
          if (active) dispatch({ type: 'signed-out' });
        }
        return fresh;
      },
    });
    void (async () => {
      try {
        await hydrate();
        const token = await client.getIdToken();
        if (active) dispatch({ type: 'resolved', claims: token ? parseClaims(token) : null });
      } catch (err) {
        // Corrupted storage or a malformed stored JWT must not strand the app
        // on the loading screen: fail open to signed-out (a fresh login heals it).
        console.error('[auth] session hydration failed — treating as signed out:', err);
        if (active) dispatch({ type: 'resolved', claims: null });
      }
    })();
    return () => {
      active = false;
    };
  }, [client, hydrate]);

  const value: AuthContextValue = {
    status: state.status,
    claims: state.claims,
    signIn: (email, password) => client.signIn(email, password),
    onSignedIn: (idToken) => dispatch({ type: 'signed-in', claims: parseClaims(idToken) }),
    signOut: () => {
      client.signOut();
      dispatch({ type: 'signed-out' });
    },
    getToken: () => client.getIdToken(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
