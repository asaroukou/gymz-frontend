// Promise wrapper around amazon-cognito-identity-js for the native member app.
// Mirrors the shape of @iziwellpass/auth's AuthClient (minus signup), plus an
// injected synchronous Storage adapter (see ./storage.ts) since the SDK
// requires sync storage but React Native's AsyncStorage is async.

import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
  type CognitoUserSession,
  type ICognitoUserPoolData,
} from 'amazon-cognito-identity-js';
import type { ICognitoStorageLike } from './storage';

export type SignInResult =
  | { kind: 'success'; idToken: string }
  | {
      kind: 'new-password-required';
      complete: (newPassword: string) => Promise<{ idToken: string }>;
    };

export interface MemberAuthClient {
  signIn(email: string, password: string): Promise<SignInResult>;
  getIdToken(): Promise<string | null>;
  forceRefreshSession(): Promise<string | null>;
  signOut(): void;
}

export interface MemberAuthConfig {
  userPoolId: string;
  clientId: string;
  storage: ICognitoStorageLike;
}

export function createMemberAuthClient(config: MemberAuthConfig): MemberAuthClient {
  const poolData: ICognitoUserPoolData = {
    UserPoolId: config.userPoolId,
    ClientId: config.clientId,
    Storage: config.storage,
  };
  const pool = new CognitoUserPool(poolData);
  const user = (email: string) =>
    new CognitoUser({ Username: email, Pool: pool, Storage: config.storage });

  function signIn(email: string, password: string): Promise<SignInResult> {
    const cognitoUser = user(email);
    const details = new AuthenticationDetails({ Username: email, Password: password });
    return new Promise((resolve, reject) => {
      cognitoUser.authenticateUser(details, {
        onSuccess: (session) =>
          resolve({ kind: 'success', idToken: session.getIdToken().getJwtToken() }),
        onFailure: (err) => reject(err),
        newPasswordRequired: () => {
          resolve({
            kind: 'new-password-required',
            complete: (newPassword) =>
              new Promise((res, rej) => {
                cognitoUser.completeNewPasswordChallenge(
                  newPassword,
                  {},
                  {
                    onSuccess: (session) => res({ idToken: session.getIdToken().getJwtToken() }),
                    onFailure: (e) => rej(e),
                  },
                );
              }),
          });
        },
      });
    });
  }

  function currentSession(): Promise<CognitoUserSession | null> {
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
        resolve(err || !session || !session.isValid() ? null : session);
      }) as Parameters<CognitoUser['getSession']>[0]);
    });
  }

  return {
    signIn,
    getIdToken: async () => {
      const session = await currentSession();
      return session ? session.getIdToken().getJwtToken() : null;
    },
    forceRefreshSession: () =>
      new Promise((resolve) => {
        const current = pool.getCurrentUser();
        if (!current) {
          resolve(null);
          return;
        }
        current.getSession(((err: Error | null, session: CognitoUserSession | null) => {
          if (err || !session) {
            resolve(null);
            return;
          }
          // Same overloaded-callback shape as getSession above.
          current.refreshSession(session.getRefreshToken(), ((
            rErr: unknown,
            newSession: CognitoUserSession | null,
          ) => {
            resolve(rErr || !newSession ? null : newSession.getIdToken().getJwtToken());
          }) as Parameters<CognitoUser['refreshSession']>[1]);
        }) as Parameters<CognitoUser['getSession']>[0]);
      }),
    signOut: () => {
      pool.getCurrentUser()?.signOut();
    },
  };
}
