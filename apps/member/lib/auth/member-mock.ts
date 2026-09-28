// The shared offline mock can answer a sign-in with a TOTP code step (password
// 'totp', or an e-mail enrolled in the owner app). Members are never enrolled
// and the member app has no code step, so this wrapper refuses that branch
// like bad credentials and keeps the member SignInResult shape.
import { createMockAuthClient } from '@iziwellpass/auth/mock';

import type { MemberAuthClient } from './cognito';

export function createMemberMockClient(): MemberAuthClient {
  const mock = createMockAuthClient();
  return {
    signIn: async (email, password) => {
      const result = await mock.signIn(email, password);
      if (result.kind === 'totp-required') {
        const err = new Error('Incorrect username or password.');
        err.name = 'NotAuthorizedException';
        throw err;
      }
      return result;
    },
    getIdToken: () => mock.getIdToken(),
    forceRefreshSession: () => mock.forceRefreshSession(),
    signOut: () => mock.signOut(),
  };
}
