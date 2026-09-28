'use client';

import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import { finalizeMfa } from '@iziwellpass/api/generated';
import { useAuth } from '@iziwellpass/auth/provider';

import { onceAsync, singleFlight } from './async-guards';
import {
  enrolmentReducer,
  finalizeAndSignOut,
  INITIAL_ENROLMENT,
  verifyAndFinalize,
  type EnrolmentDeps,
  type EnrolmentOutcome,
} from './mfa-enrolment';
import { totpErrorOutcome } from './totp-code';

/** Wires the pure enrolment state machine to Cognito, the backend and the router. */
export function useMfaEnrolment({ next }: { next: string }) {
  const { client, signOut } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(enrolmentReducer, INITIAL_ENROLMENT);

  const toLogin = useCallback(
    () => router.replace(`/login?next=${encodeURIComponent(next)}`),
    [router, next],
  );

  // One AssociateSoftwareToken per page: StrictMode's double effect and a
  // re-render share the same call (each call replaces the secret).
  const loadSetup = useMemo(() => onceAsync(() => client.startTotpSetup()), [client]);

  const load = useCallback(() => {
    loadSetup().then(
      (setup) => dispatch({ type: 'setupLoaded', setup }),
      (err: unknown) => {
        if (totpErrorOutcome(err) === 'expired') toLogin();
        else dispatch({ type: 'setupFailed' });
      },
    );
  }, [loadSetup, toLogin]);

  useEffect(() => {
    load();
  }, [load]);

  const deps = useMemo<EnrolmentDeps>(
    () => ({
      confirmTotpSetup: (code) => client.confirmTotpSetup(code),
      finalize: () => finalizeMfa(),
      signOut: () => {
        signOut();
        queryClient.clear();
      },
    }),
    [client, signOut, queryClient],
  );

  const apply = useCallback(
    (outcome: EnrolmentOutcome) => {
      if (outcome.ok) dispatch({ type: 'done' });
      else if (outcome.stage === 'finalize') dispatch({ type: 'finalizeFailed' });
      else if (outcome.reason === 'expired') toLogin();
      else dispatch({ type: 'codeRejected', reason: outcome.reason });
    },
    [toLogin],
  );

  const verify = useMemo(
    () =>
      singleFlight(async (code: string) => {
        dispatch({ type: 'submit' });
        apply(await verifyAndFinalize(deps, code));
      }),
    [deps, apply],
  );

  const retryFinalize = useMemo(
    () =>
      singleFlight(async () => {
        dispatch({ type: 'retryFinalize' });
        apply(await finalizeAndSignOut(deps));
      }),
    [deps, apply],
  );

  return {
    state,
    retrySetup: () => {
      dispatch({ type: 'retrySetup' });
      load();
    },
    toVerify: () => dispatch({ type: 'continue' }),
    backToSetup: () => dispatch({ type: 'back' }),
    verify,
    retryFinalize,
    signInAgain: toLogin,
  };
}
