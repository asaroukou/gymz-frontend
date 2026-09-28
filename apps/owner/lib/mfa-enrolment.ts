import type { TotpSetup } from '@iziwellpass/auth/totp';

import { totpErrorOutcome } from './totp-code';

export type EnrolmentStep =
  | 'loading'
  | 'setupError'
  | 'setup'
  | 'verify'
  | 'finalizing'
  | 'finalizeError'
  | 'done';

export interface EnrolmentState {
  step: EnrolmentStep;
  setup: TotpSetup | null;
  /** Why the last code was refused; cleared on the next submit. */
  codeError: 'invalid' | 'other' | null;
  /** Bumped on every refused code so the code field remounts empty. */
  attempt: number;
}

export const INITIAL_ENROLMENT: EnrolmentState = {
  step: 'loading',
  setup: null,
  codeError: null,
  attempt: 0,
};

export type EnrolmentEvent =
  | { type: 'setupLoaded'; setup: TotpSetup }
  | { type: 'setupFailed' }
  | { type: 'retrySetup' }
  | { type: 'continue' }
  | { type: 'back' }
  | { type: 'submit' }
  | { type: 'codeRejected'; reason: 'invalid' | 'other' }
  | { type: 'finalizeFailed' }
  | { type: 'retryFinalize' }
  | { type: 'done' };

/** Each event applies only from the step it belongs to; anything else is ignored. */
export function enrolmentReducer(state: EnrolmentState, event: EnrolmentEvent): EnrolmentState {
  switch (event.type) {
    case 'setupLoaded':
      return state.step === 'loading' ? { ...state, step: 'setup', setup: event.setup } : state;
    case 'setupFailed':
      return state.step === 'loading' ? { ...state, step: 'setupError' } : state;
    case 'retrySetup':
      return state.step === 'setupError' ? { ...state, step: 'loading' } : state;
    case 'continue':
      return state.step === 'setup' ? { ...state, step: 'verify', codeError: null } : state;
    case 'back':
      return state.step === 'verify' ? { ...state, step: 'setup', codeError: null } : state;
    case 'submit':
      return state.step === 'verify' ? { ...state, step: 'finalizing', codeError: null } : state;
    case 'codeRejected':
      return state.step === 'finalizing'
        ? { ...state, step: 'verify', codeError: event.reason, attempt: state.attempt + 1 }
        : state;
    case 'finalizeFailed':
      return state.step === 'finalizing' ? { ...state, step: 'finalizeError' } : state;
    case 'retryFinalize':
      return state.step === 'finalizeError' ? { ...state, step: 'finalizing' } : state;
    case 'done':
      return state.step === 'finalizing' ? { ...state, step: 'done' } : state;
  }
}

export interface EnrolmentDeps {
  /** Cognito VerifySoftwareToken + SetUserMFAPreference (AuthClient.confirmTotpSetup). */
  confirmTotpSetup(code: string): Promise<void>;
  /** POST /platform/v1/mfa/finalize (revokes every session server-side). */
  finalize(): Promise<unknown>;
  /** Local sign-out: SDK storage, session cookie, query cache. */
  signOut(): void;
}

export type EnrolmentOutcome =
  | { ok: true }
  | { ok: false; stage: 'code'; reason: 'invalid' | 'expired' | 'other' }
  | { ok: false; stage: 'finalize' };

/** Finalize, then sign out locally (the server already ended every session). */
export async function finalizeAndSignOut(deps: EnrolmentDeps): Promise<EnrolmentOutcome> {
  try {
    await deps.finalize();
  } catch {
    return { ok: false, stage: 'finalize' };
  }
  deps.signOut();
  return { ok: true };
}

/**
 * The order is load-bearing: Cognito must hold an enabled, preferred TOTP
 * factor before finalize, whose AdminGetUser check refuses otherwise.
 */
export async function verifyAndFinalize(
  deps: EnrolmentDeps,
  code: string,
): Promise<EnrolmentOutcome> {
  try {
    await deps.confirmTotpSetup(code);
  } catch (err) {
    return { ok: false, stage: 'code', reason: totpErrorOutcome(err) };
  }
  return finalizeAndSignOut(deps);
}
