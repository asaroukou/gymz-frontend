'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { configureApi } from '@iziwellpass/api/client';
import { ApiProvider } from '@iziwellpass/api/provider';
import { createAuthClient, type AuthClient } from '@iziwellpass/auth/client';
import { createMockAuthClient } from '@iziwellpass/auth/mock';
import { AuthProvider, useAuth } from '@iziwellpass/auth/provider';
import { clearSessionCookie } from '@iziwellpass/auth/session-cookie';
import { Toaster } from '@iziwellpass/ui/components/sonner';

import { createMfaRedirect } from '@/lib/mfa-redirect';

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
    resendConfirmationCode: () => Promise.reject(new Error('Auth client not configured')),
    signIn: () => Promise.reject(new Error('Auth client not configured')),
    signOut: () => undefined,
    getIdToken: () => Promise.resolve(null),
    forceRefreshSession: () => Promise.resolve(null),
    startTotpSetup: () => Promise.reject(new Error('Auth client not configured')),
    confirmTotpSetup: () => Promise.reject(new Error('Auth client not configured')),
  };
}

/** Wires the auth token getter into the api client exactly once (client-side only). */
function ApiConfigurator({ children }: { children: ReactNode }) {
  const { getToken, client } = useAuth();

  // Backend 403 MFA_ENROLLMENT_REQUIRED → the enrolment page, once per burst.
  // Goes silent on its own when the backend stops enforcing MFA.
  const onMfaRequired = useMemo(
    () =>
      createMfaRedirect({
        getLocation: () => ({ pathname: window.location.pathname, search: window.location.search }),
        assign: (url) => window.location.assign(url),
      }),
    [],
  );

  useEffect(() => {
    configureApi({
      baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? '',
      controlPlaneBaseUrl: process.env.NEXT_PUBLIC_CONTROL_PLANE_BASE_URL ?? '',
      getToken,
      onMfaRequired,
      onUnauthorized: async () => {
        // In unconfigured envs `client` is the noopAuthClient, whose
        // forceRefreshSession() always resolves null — that's fine here:
        // those envs have no real Cognito session to refresh anyway, so
        // falling through to the sign-in redirect below is the correct
        // (and only reachable) outcome.
        const token = await client.forceRefreshSession();
        if (!token) {
          clearSessionCookie();
          if (typeof window !== 'undefined') {
            window.location.assign('/login?next=' + encodeURIComponent(window.location.pathname));
          }
        }
        return token;
      },
    });
  }, [getToken, client, onMfaRequired]);
  return children;
}

export function Providers({ children }: { children: ReactNode }) {
  // Lazily created (not module scope): CognitoUserPool's constructor throws when
  // UserPoolId/ClientId are empty, and Next prerenders this component at build
  // time with no env vars set — module scope would break `next build`. useState's
  // initializer still runs only once per mount, matching the "one client for the
  // app lifetime" recipe.
  const [authClient] = useState<AuthClient>(() => {
    // Offline dev: NEXT_PUBLIC_AUTH_MOCK=1 swaps Cognito for the mock client
    // (any email; the password picks the role/scenario — see @iziwellpass/auth/mock).
    // Pair with the mock API server (`pnpm dev:mock` + API_PROXY_TARGET).
    if (process.env.NEXT_PUBLIC_AUTH_MOCK === '1') {
      console.warn('[auth] NEXT_PUBLIC_AUTH_MOCK=1 — Cognito is mocked, dev only');
      return createMockAuthClient();
    }
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
