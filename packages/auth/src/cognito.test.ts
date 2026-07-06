import { beforeEach, describe, expect, it, vi } from 'vitest';

const authenticateUser = vi.fn();
const signUpMock = vi.fn();
const confirmRegistration = vi.fn();
const resendConfirmationCode = vi.fn();
const refreshSession = vi.fn();
const getSession = vi.fn();
const getCurrentUser = vi.fn();

vi.mock('amazon-cognito-identity-js', () => {
  class CognitoUserPool {
    signUp = signUpMock;
    getCurrentUser = getCurrentUser;
  }
  class CognitoUser {
    authenticateUser = authenticateUser;
    confirmRegistration = confirmRegistration;
    completeNewPasswordChallenge = vi.fn();
    signOut = vi.fn();
    getSession = getSession;
    resendConfirmationCode = resendConfirmationCode;
    refreshSession = refreshSession;
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

describe('resendConfirmationCode', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves when the SDK reports success', async () => {
    resendConfirmationCode.mockImplementation((cb) => cb(undefined, {}));
    await expect(client.resendConfirmationCode('a@b.c')).resolves.toBeUndefined();
  });

  it('rejects when the SDK reports an error', async () => {
    resendConfirmationCode.mockImplementation((cb) => cb(new Error('LimitExceededException')));
    await expect(client.resendConfirmationCode('a@b.c')).rejects.toThrow('LimitExceededException');
  });
});

describe('forceRefreshSession', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves the new id token via refreshSession when a current user and session exist', async () => {
    getCurrentUser.mockReturnValue({
      getSession,
      refreshSession,
    });
    const fakeRefreshToken = { token: 'refresh-1' };
    const fakeOldSession = {
      isValid: () => true,
      getRefreshToken: () => fakeRefreshToken,
    };
    getSession.mockImplementation((cb: (err: Error | null, session: unknown) => void) =>
      cb(null, fakeOldSession),
    );
    const fakeNewSession = {
      getIdToken: () => ({ getJwtToken: () => 'new-id-token' }),
    };
    refreshSession.mockImplementation(
      (_refreshToken: unknown, cb: (err: unknown, session: unknown) => void) =>
        cb(null, fakeNewSession),
    );

    await expect(client.forceRefreshSession()).resolves.toBe('new-id-token');
    expect(refreshSession).toHaveBeenCalledWith(fakeRefreshToken, expect.any(Function));
  });

  it('resolves null when there is no current user', async () => {
    getCurrentUser.mockReturnValue(null);
    await expect(client.forceRefreshSession()).resolves.toBeNull();
  });

  it('resolves null when getSession errors', async () => {
    getCurrentUser.mockReturnValue({ getSession, refreshSession });
    getSession.mockImplementation((cb: (err: Error | null, session: unknown) => void) =>
      cb(new Error('no session'), null),
    );
    await expect(client.forceRefreshSession()).resolves.toBeNull();
  });

  it('resolves null when refreshSession errors', async () => {
    getCurrentUser.mockReturnValue({ getSession, refreshSession });
    const fakeOldSession = {
      isValid: () => true,
      getRefreshToken: () => ({ token: 'refresh-1' }),
    };
    getSession.mockImplementation((cb: (err: Error | null, session: unknown) => void) =>
      cb(null, fakeOldSession),
    );
    refreshSession.mockImplementation(
      (_refreshToken: unknown, cb: (err: unknown, session: unknown) => void) =>
        cb(new Error('NotAuthorizedException'), null),
    );
    await expect(client.forceRefreshSession()).resolves.toBeNull();
  });

  it('dedupes concurrent calls into a single SDK refresh', async () => {
    getCurrentUser.mockReturnValue({ getSession, refreshSession });
    const fakeOldSession = {
      isValid: () => true,
      getRefreshToken: () => ({ token: 'refresh-1' }),
    };
    getSession.mockImplementation((cb: (err: Error | null, session: unknown) => void) =>
      cb(null, fakeOldSession),
    );
    let capturedCallback: ((err: unknown, session: unknown) => void) | undefined;
    refreshSession.mockImplementation(
      (_refreshToken: unknown, cb: (err: unknown, session: unknown) => void) => {
        capturedCallback = cb;
      },
    );
    const fakeNewSession = {
      getIdToken: () => ({ getJwtToken: () => 'shared-token' }),
    };

    const first = client.forceRefreshSession();
    const second = client.forceRefreshSession();

    expect(refreshSession).toHaveBeenCalledTimes(1);

    capturedCallback?.(null, fakeNewSession);

    await expect(first).resolves.toBe('shared-token');
    await expect(second).resolves.toBe('shared-token');
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });

  it('triggers a fresh SDK refresh on a later sequential call', async () => {
    getCurrentUser.mockReturnValue({ getSession, refreshSession });
    const fakeOldSession = {
      isValid: () => true,
      getRefreshToken: () => ({ token: 'refresh-1' }),
    };
    getSession.mockImplementation((cb: (err: Error | null, session: unknown) => void) =>
      cb(null, fakeOldSession),
    );
    const fakeNewSession = {
      getIdToken: () => ({ getJwtToken: () => 'new-id-token' }),
    };
    refreshSession.mockImplementation(
      (_refreshToken: unknown, cb: (err: unknown, session: unknown) => void) =>
        cb(null, fakeNewSession),
    );

    await expect(client.forceRefreshSession()).resolves.toBe('new-id-token');
    await expect(client.forceRefreshSession()).resolves.toBe('new-id-token');

    expect(refreshSession).toHaveBeenCalledTimes(2);
  });
});
