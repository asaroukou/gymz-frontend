'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import { finalizeMfa } from '@iziwellpass/api/generated';
import { useAuth } from '@iziwellpass/auth/provider';

import { onceAsync, singleFlight } from './async-guards';
import {
  enrolmentReducer,
  finalizeAndSignOut,
  INITIAL_ENROLMENT,
  startEnrolment,
  verifyAndFinalize,
  type EnrolmentDeps,
  type EnrolmentOutcome,
  type EnrolmentStart,
} from './mfa-enrolment';
import { totpErrorOutcome } from './totp-code';

/** Wires the pure enrolment state machine to Cognito, the backend and the router. */
export function useMfaEnrolment({ next }: { next: string }) {
  const { client, signOut } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(enrolmentReducer, INITIAL_ENROLMENT);

  // SDK storage, session cookie and query cache.
  const signOutLocally = useCallback(() => {
    signOut();
    queryClient.clear();
  }, [signOut, queryClient]);

  // The session may already be dead server-side (another device's finalize
  // ran a global sign-out): drop the local tokens too, or /login would see a
  // cached session and never ask for the password.
  const toLogin = useCallback(() => {
    signOutLocally();
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [signOutLocally, router, next]);

  const deps = useMemo<EnrolmentDeps>(
    () => ({
      confirmTotpSetup: (code) => client.confirmTotpSetup(code),
      finalize: () => finalizeMfa(),
      signOut: signOutLocally,
    }),
    [client, signOutLocally],
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

  const finalize = useMemo(
    () => singleFlight(async () => apply(await finalizeAndSignOut(deps))),
    [deps, apply],
  );

  // Mount work, held in state (React may drop memos): one status check and at
  // most one AssociateSoftwareToken per page, however often the effect runs
  // (StrictMode runs it twice; each association replaces the secret). A
  // rejection is forgotten, so « Réessayer » re-runs the whole check.
  const [start] = useState(() => onceAsync(() => startEnrolment(client)));
  // Finalize for an already-enabled factor starts once per page.
  const finalizeStarted = useRef(false);

  const onStart = (result: EnrolmentStart) => {
    if (result.kind === 'setup') {
      dispatch({ type: 'setupLoaded', setup: result.setup });
      return;
    }
    dispatch({ type: 'alreadyEnabled' });
    if (!finalizeStarted.current) {
      finalizeStarted.current = true;
      void finalize();
    }
  };
  const onStartFailed = (err: unknown) => {
    if (totpErrorOutcome(err) === 'expired') toLogin();
    else dispatch({ type: 'setupFailed' });
  };
  // Latest handlers for the promise callbacks, so the mount effect itself
  // never re-runs when the session (and with it signOut) changes.
  const handlers = useRef({ onStart, onStartFailed });
  useLayoutEffect(() => {
    handlers.current = { onStart, onStartFailed };
  });

  const load = useCallback(
    (isActive: () => boolean = () => true) => {
      start().then(
        (result) => {
          if (isActive()) handlers.current.onStart(result);
        },
        (err: unknown) => {
          if (isActive()) handlers.current.onStartFailed(err);
        },
      );
    },
    [start],
  );

  useEffect(() => {
    let active = true;
    load(() => active);
    return () => {
      active = false;
    };
  }, [load]);

  return {
    state,
    retrySetup: () => {
      dispatch({ type: 'retrySetup' });
      load();
    },
    toVerify: () => dispatch({ type: 'continue' }),
    backToSetup: () => dispatch({ type: 'back' }),
    verify,
    retryFinalize: () => {
      dispatch({ type: 'retryFinalize' });
      return finalize();
    },
    signInAgain: toLogin,
  };
}
