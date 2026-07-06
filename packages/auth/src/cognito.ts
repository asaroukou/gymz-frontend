// Promise wrapper around amazon-cognito-identity-js (SRP flow, public client).
// Reference: gymz/docs/client-integration.md. The SDK persists tokens in
// localStorage and refreshes via getSession() when the ID token expires.

import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
  type CognitoUserSession,
} from 'amazon-cognito-identity-js';

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
    };

export interface AuthClient {
  signUp(email: string, password: string): Promise<void>;
  confirmSignUp(email: string, code: string): Promise<void>;
  signIn(email: string, password: string): Promise<SignInResult>;
  signOut(): void;
  /** Current user's valid ID token, auto-refreshed by the SDK; null if signed out. */
  getIdToken(): Promise<string | null>;
}

export function createAuthClient(config: AuthClientConfig): AuthClient {
  const pool = new CognitoUserPool({
    UserPoolId: config.userPoolId,
    ClientId: config.clientId,
  });

  const user = (email: string) => new CognitoUser({ Username: email, Pool: pool });

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
  };
}
