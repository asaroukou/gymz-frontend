'use client';

import { useEffect, useState, type ReactNode } from 'react';

import { configureApi } from '@iziwellpass/api/client';
import { ApiProvider } from '@iziwellpass/api/provider';
import { createAuthClient, type AuthClient } from '@iziwellpass/auth/client';
import { AuthProvider, useAuth } from '@iziwellpass/auth/provider';
import { Toaster } from '@iziwellpass/ui/components/sonner';

/**
 * A no-op AuthClient used only when real Cognito config isn't available yet.
 * `CognitoUserPool`'s constructor throws synchronously on empty ids, and Next
 * still renders this client component during SSR/prerender (e.g. building
 * `/_not-found` with no env vars set) even though it never becomes interactive
 * there. This stub keeps that render path from crashing the build; real
 * requests always come from the browser, where env vars are present and
 * `createAuthClient` succeeds.
 */
function noopAuthClient(): AuthClient {
  return {
    signUp: () => Promise.reject(new Error('Auth client not configured')),
    confirmSignUp: () => Promise.reject(new Error('Auth client not configured')),
    signIn: () => Promise.reject(new Error('Auth client not configured')),
    signOut: () => undefined,
    getIdToken: () => Promise.resolve(null),
  };
}

/** Wires the auth token getter into the api client exactly once (client-side only). */
function ApiConfigurator({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();
  useEffect(() => {
    configureApi({
      baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? '',
      getToken,
    });
  }, [getToken]);
  return children;
}

export function Providers({ children }: { children: ReactNode }) {
  // Lazily created (not module scope): CognitoUserPool's constructor throws when
  // UserPoolId/ClientId are empty, and Next prerenders this component at build
  // time with no env vars set — module scope would break `next build`. useState's
  // initializer still runs only once per mount, matching the "one client for the
  // app lifetime" recipe.
  const [authClient] = useState<AuthClient>(() => {
    try {
      return createAuthClient({
        userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? '',
        clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? '',
      });
    } catch (err) {
      // Missing/empty Cognito config (e.g. build-time SSR prerender) — fails
      // loudly at first sign-in attempt (rejected calls) and via a console
      // error now, instead of failing silently or breaking the build.
      console.error(
        '[auth] Cognito client not configured — check NEXT_PUBLIC_COGNITO_* env vars:',
        err,
      );
      return noopAuthClient();
    }
  });

  return (
    <AuthProvider client={authClient}>
      <ApiConfigurator>
        <ApiProvider>
          {children}
          <Toaster />
        </ApiProvider>
      </ApiConfigurator>
    </AuthProvider>
  );
}
