import { beforeEach, describe, expect, it, vi } from 'vitest';

const authenticateUser = vi.fn();
const signUpMock = vi.fn();
const confirmRegistration = vi.fn();

vi.mock('amazon-cognito-identity-js', () => {
  class CognitoUserPool {
    signUp = signUpMock;
  }
  class CognitoUser {
    authenticateUser = authenticateUser;
    confirmRegistration = confirmRegistration;
    completeNewPasswordChallenge = vi.fn();
    signOut = vi.fn();
    getSession = vi.fn();
  }
  class AuthenticationDetails {}
  return { CognitoUserPool, CognitoUser, AuthenticationDetails };
});

import { createAuthClient } from './cognito';

const client = createAuthClient({
  userPoolId: 'eu-west-1_TEST',
  clientId: 'testclient',
});

describe('signIn', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves with kind success and the id token on onSuccess', async () => {
    const fakeSession = {
      getIdToken: () => ({ getJwtToken: () => 'id-token-1' }),
    };
    authenticateUser.mockImplementation((_details, callbacks) => {
      callbacks.onSuccess(fakeSession);
    });
    const result = await client.signIn('a@b.c', 'pw');
    expect(result.kind).toBe('success');
    if (result.kind === 'success') {
      expect(result.idToken).toBe('id-token-1');
    }
  });

  it('resolves with kind new-password-required for invited users', async () => {
    authenticateUser.mockImplementation((_details, callbacks) => {
      callbacks.newPasswordRequired({ email: 'a@b.c' }, {});
    });
    const result = await client.signIn('a@b.c', 'temp-pw');
    expect(result.kind).toBe('new-password-required');
    if (result.kind === 'new-password-required') {
      expect(typeof result.complete).toBe('function');
    }
  });

  it('rejects on onFailure', async () => {
    authenticateUser.mockImplementation((_details, callbacks) => {
      callbacks.onFailure(new Error('Incorrect username or password.'));
    });
    await expect(client.signIn('a@b.c', 'bad')).rejects.toThrow(/Incorrect/);
  });
});

describe('signUp / confirmSignUp', () => {
  it('resolves when the SDK reports success', async () => {
    signUpMock.mockImplementation((_e, _p, _a, _v, cb) => cb(null, {}));
    await expect(client.signUp('a@b.c', 'pw')).resolves.toBeUndefined();
    confirmRegistration.mockImplementation((_c, _f, cb) => cb(null, 'SUCCESS'));
    await expect(client.confirmSignUp('a@b.c', '123456')).resolves.toBeUndefined();
  });

  it('rejects when the SDK reports an error', async () => {
    signUpMock.mockImplementation((_e, _p, _a, _v, cb) => cb(new Error('exists')));
    await expect(client.signUp('a@b.c', 'pw')).rejects.toThrow('exists');
  });
});
