// Promise wrapper around amazon-cognito-identity-js (SRP flow, public client).
// Reference: gymz/docs/client-integration.md. The SDK persists tokens in
// localStorage and refreshes via getSession() when the ID token expires.

import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
  type CognitoUserSession,
} from 'amazon-cognito-identity-js';

import { notSignedInError } from './errors';
import { buildOtpauthUri, TOTP_ISSUER, type TotpSetup } from './totp';

export interface AuthClientConfig {
  userPoolId: string;
  clientId: string;
}

export type SignInResult =
  | { kind: 'success'; idToken: string }
  | {
      kind: 'new-password-required';
      /** Complete the invited-staff first-login flow with a new password. */
      complete: (newPassword: string) => Promise<{ idToken: string }>;
    }
  | {
      kind: 'totp-required';
      /** Answers the sign-in's TOTP challenge with the 6-digit code from the user's authenticator app. */
      submit: (code: string) => Promise<{ idToken: string }>;
    };

export interface AuthClient {
  signUp(email: string, password: string): Promise<void>;
  confirmSignUp(email: string, code: string): Promise<void>;
  /** Re-sends the sign-up confirmation code (e.g. after the first email is lost/expired). */
  resendConfirmationCode(email: string): Promise<void>;
  signIn(email: string, password: string): Promise<SignInResult>;
  signOut(): void;
  /** Current user's valid ID token, auto-refreshed by the SDK; null if signed out. */
  getIdToken(): Promise<string | null>;
  /**
   * Forces a new token mint via the refresh token (bypassing the SDK's cached,
   * still-valid ID token) so freshly-changed claims (e.g. right after
   * onboarding creates an org) show up immediately. Resolves the new ID token,
   * or null when there is no signed-in user or the refresh fails — never
   * throws for the signed-out case.
   */
  forceRefreshSession(): Promise<string | null>;
  /**
   * Starts TOTP enrolment for the signed-in user (AssociateSoftwareToken, with
   * the user's own access token). Rejects `NotSignedInError` without a valid
   * session. Each call issues a NEW secret that replaces the previous one.
   */
  startTotpSetup(): Promise<TotpSetup>;
  /**
   * Verifies the first code from the authenticator app (VerifySoftwareToken),
   * then makes TOTP enabled and preferred (SetUserMFAPreference). The backend
   * finalize call comes after this.
   */
  confirmTotpSetup(code: string): Promise<void>;
}

export function createAuthClient(config: AuthClientConfig): AuthClient {
  const pool = new CognitoUserPool({
    UserPoolId: config.userPoolId,
    ClientId: config.clientId,
  });

  const user = (email: string) => new CognitoUser({ Username: email, Pool: pool });

  // The enrolment calls need the SDK's in-memory session (signInUserSession),
  // which getSession() restores from storage and refreshes if needed.
  const signedInUser = () =>
    new Promise<{ user: CognitoUser; session: CognitoUserSession }>((resolve, reject) => {
      const current = pool.getCurrentUser();
      if (!current) {
        reject(notSignedInError());
        return;
      }
      // Same overloaded-callback shape as getIdToken below.
      current.getSession(((err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session || !session.isValid()) {
          reject(notSignedInError());
          return;
        }
        resolve({ user: current, session });
      }) as Parameters<CognitoUser['getSession']>[0]);
    });

  // Dedupes concurrent forceRefreshSession() calls: when several queries on a
  // page hit 401 at once, each would otherwise trigger its own Cognito
  // refresh. Under refresh-token rotation, a second concurrent refresh with
  // the now-stale token can fail (invalid-refresh-token), causing a spurious
  // clearSessionCookie()/sign-out race. Sharing one in-flight promise across
  // concurrent callers avoids that; the slot clears once settled so a later,
  // non-concurrent call still refreshes anew.
  let inflightRefresh: Promise<string | null> | null = null;

  return {
    signUp(email, password) {
      return new Promise((resolve, reject) => {
        pool.signUp(email, password, [], [], (err) => (err ? reject(err) : resolve()));
      });
    },

    confirmSignUp(email, code) {
      return new Promise((resolve, reject) => {
        user(email).confirmRegistration(code, true, (err) => (err ? reject(err) : resolve()));
      });
    },

    resendConfirmationCode(email) {
      return new Promise((resolve, reject) => {
        user(email).resendConfirmationCode((err) => (err ? reject(err) : resolve()));
      });
    },

    signIn(email, password) {
      const cognitoUser = user(email);
      const details = new AuthenticationDetails({ Username: email, Password: password });
      return new Promise<SignInResult>((resolve, reject) => {
        cognitoUser.authenticateUser(details, {
          onSuccess: (session: CognitoUserSession) =>
            resolve({ kind: 'success', idToken: session.getIdToken().getJwtToken() }),
          onFailure: (err: unknown) => reject(err),
          newPasswordRequired: () =>
            resolve({
              kind: 'new-password-required',
              complete: (newPassword: string) =>
                new Promise((res, rej) => {
                  cognitoUser.completeNewPasswordChallenge(
                    newPassword,
                    {},
                    {
                      onSuccess: (session: CognitoUserSession) =>
                        res({ idToken: session.getIdToken().getJwtToken() }),
                      onFailure: (err: unknown) => rej(err),
                    },
                  );
                }),
            }),
          totpRequired: () =>
            resolve({
              kind: 'totp-required',
              submit: (code: string) =>
                new Promise((res, rej) => {
                  cognitoUser.sendMFACode(
                    code,
                    {
                      onSuccess: (session: CognitoUserSession) =>
                        res({ idToken: session.getIdToken().getJwtToken() }),
                      onFailure: (err: unknown) => rej(err),
                    },
                    'SOFTWARE_TOKEN_MFA',
                  );
                }),
            }),
        });
      });
    },

    signOut() {
      pool.getCurrentUser()?.signOut();
    },

    getIdToken() {
      return new Promise((resolve) => {
        const current = pool.getCurrentUser();
        if (!current) {
          resolve(null);
          return;
        }
        // The SDK types getSession's callback as an overload union
        // ((err: Error, session: null) => void) | ((err: null, session: CognitoUserSession) => void)
        // rather than a single (err, session) => void signature; a single
        // handler satisfies both call shapes at runtime, so we widen the
        // parameter types locally instead of writing two callbacks.
        current.getSession(((err: Error | null, session: CognitoUserSession | null) => {
          if (err || !session || !session.isValid()) {
            resolve(null);
            return;
          }
          resolve(session.getIdToken().getJwtToken());
        }) as Parameters<CognitoUser['getSession']>[0]);
      });
    },

    forceRefreshSession() {
      if (inflightRefresh) {
        return inflightRefresh;
      }
      const refresh = new Promise<string | null>((resolve) => {
        const current = pool.getCurrentUser();
        if (!current) {
          resolve(null);
          return;
        }
        // Same overloaded-callback shape as getIdToken above.
        current.getSession(((err: Error | null, session: CognitoUserSession | null) => {
          if (err || !session) {
            resolve(null);
            return;
          }
          // The SDK types refreshSession's callback as NodeCallback<any, any>
          // ((err, result) => void)) rather than the CognitoUserSession-specific
          // shape used elsewhere; we widen locally instead of using `any` at
          // the call site.
          current.refreshSession(session.getRefreshToken(), ((
            refreshErr: unknown,
            newSession: CognitoUserSession | null,
          ) => {
            if (refreshErr || !newSession) {
              resolve(null);
              return;
            }
            resolve(newSession.getIdToken().getJwtToken());
          }) as Parameters<CognitoUser['refreshSession']>[1]);
        }) as Parameters<CognitoUser['getSession']>[0]);
      });
      inflightRefresh = refresh.finally(() => {
        inflightRefresh = null;
      });
      return inflightRefresh;
    },

    async startTotpSetup() {
      const { user: current, session } = await signedInUser();
      const payload = session.getIdToken().payload as { email?: unknown };
      const account = typeof payload.email === 'string' ? payload.email : current.getUsername();
      return new Promise<TotpSetup>((resolve, reject) => {
        current.associateSoftwareToken({
          associateSecretCode: (secret: string) =>
            resolve({ secret, otpauthUri: buildOtpauthUri(account, secret) }),
          onFailure: (err: unknown) => reject(err),
        });
      });
    },

    async confirmTotpSetup(code) {
      const { user: current } = await signedInUser();
      await new Promise<void>((resolve, reject) => {
        current.verifySoftwareToken(code, TOTP_ISSUER, {
          onSuccess: () => resolve(),
          onFailure: (err: Error) => reject(err),
        });
      });
      await new Promise<void>((resolve, reject) => {
        current.setUserMfaPreference(null, { PreferredMfa: true, Enabled: true }, (err) =>
          err ? reject(err) : resolve(),
        );
      });
    },
  };
}
