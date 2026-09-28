import { beforeEach, describe, expect, it, vi } from 'vitest';

const authenticateUser = vi.fn();
const signUpMock = vi.fn();
const confirmRegistration = vi.fn();
const resendConfirmationCode = vi.fn();
const refreshSession = vi.fn();
const getSession = vi.fn();
const getCurrentUser = vi.fn();
const sendMFACode = vi.fn();

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
    sendMFACode = sendMFACode;
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

describe('signIn TOTP challenge', () => {
  beforeEach(() => vi.clearAllMocks());

  it('resolves totp-required and submits the code as SOFTWARE_TOKEN_MFA', async () => {
    authenticateUser.mockImplementation((_details, callbacks) => {
      callbacks.totpRequired('SOFTWARE_TOKEN_MFA', {});
    });
    sendMFACode.mockImplementation((_code, callbacks) => {
      callbacks.onSuccess({ getIdToken: () => ({ getJwtToken: () => 'id-mfa' }) });
    });
    const result = await client.signIn('a@b.c', 'pw');
    if (result.kind !== 'totp-required') throw new Error('expected totp-required');
    await expect(result.submit('123456')).resolves.toEqual({ idToken: 'id-mfa' });
    expect(sendMFACode).toHaveBeenCalledWith('123456', expect.any(Object), 'SOFTWARE_TOKEN_MFA');
  });

  it('rejects submit with the Cognito error on a wrong code', async () => {
    authenticateUser.mockImplementation((_details, callbacks) => {
      callbacks.totpRequired('SOFTWARE_TOKEN_MFA', {});
    });
    const mismatch = Object.assign(new Error('Invalid code received for user'), {
      name: 'CodeMismatchException',
    });
    sendMFACode.mockImplementation((_code, callbacks) => callbacks.onFailure(mismatch));
    const result = await client.signIn('a@b.c', 'pw');
    if (result.kind !== 'totp-required') throw new Error('expected totp-required');
    await expect(result.submit('111111')).rejects.toMatchObject({ name: 'CodeMismatchException' });
  });
});

describe('TOTP enrolment', () => {
  beforeEach(() => vi.clearAllMocks());

  const session = {
    isValid: () => true,
    getIdToken: () => ({ payload: { email: 'awa+gym@studio.sn' }, getJwtToken: () => 'id' }),
  };

  function signedIn(overrides: Record<string, unknown> = {}) {
    const user = {
      getSession: vi.fn((cb: (err: Error | null, s: unknown) => void) => cb(null, session)),
      getUsername: () => 'sub-123',
      associateSoftwareToken: vi.fn(),
      verifySoftwareToken: vi.fn(),
      setUserMfaPreference: vi.fn(),
      ...overrides,
    };
    getCurrentUser.mockReturnValue(user);
    return user;
  }

  it('startTotpSetup returns the secret and an otpauth URI for the signed-in email', async () => {
    const user = signedIn();
    user.associateSoftwareToken.mockImplementation(
      (callbacks: { associateSecretCode: (s: string) => void }) =>
        callbacks.associateSecretCode('SECRET234'),
    );
    await expect(client.startTotpSetup()).resolves.toEqual({
      secret: 'SECRET234',
      otpauthUri:
        'otpauth://totp/IziWellPass:awa%2Bgym%40studio.sn?secret=SECRET234&issuer=IziWellPass',
    });
  });

  it('startTotpSetup falls back to the username when the token has no email', async () => {
    const user = signedIn({
      getSession: vi.fn((cb: (err: Error | null, s: unknown) => void) =>
        cb(null, { isValid: () => true, getIdToken: () => ({ payload: {} }) }),
      ),
    });
    user.associateSoftwareToken.mockImplementation(
      (callbacks: { associateSecretCode: (s: string) => void }) => callbacks.associateSecretCode('S'),
    );
    const setup = await client.startTotpSetup();
    expect(setup.otpauthUri).toContain('IziWellPass:sub-123?');
  });

  it('startTotpSetup rejects NotSignedInError when nobody is signed in', async () => {
    getCurrentUser.mockReturnValue(null);
    await expect(client.startTotpSetup()).rejects.toMatchObject({ name: 'NotSignedInError' });
  });

  it('startTotpSetup rejects NotSignedInError when the session is invalid', async () => {
    signedIn({
      getSession: vi.fn((cb: (err: Error | null, s: unknown) => void) =>
        cb(null, { isValid: () => false }),
      ),
    });
    await expect(client.startTotpSetup()).rejects.toMatchObject({ name: 'NotSignedInError' });
  });

  it('confirmTotpSetup verifies the code, then makes TOTP enabled and preferred', async () => {
    const user = signedIn();
    user.verifySoftwareToken.mockImplementation(
      (_code: string, _name: string, callbacks: { onSuccess: (s: unknown) => void }) =>
        callbacks.onSuccess({}),
    );
    user.setUserMfaPreference.mockImplementation(
      (_sms: unknown, _totp: unknown, cb: (err: Error | null, r?: string) => void) =>
        cb(null, 'SUCCESS'),
    );
    await expect(client.confirmTotpSetup('123456')).resolves.toBeUndefined();
    expect(user.verifySoftwareToken).toHaveBeenCalledWith(
      '123456',
      'IziWellPass',
      expect.any(Object),
    );
    expect(user.setUserMfaPreference).toHaveBeenCalledWith(
      null,
      { PreferredMfa: true, Enabled: true },
      expect.any(Function),
    );
    expect(user.verifySoftwareToken.mock.invocationCallOrder[0]).toBeLessThan(
      user.setUserMfaPreference.mock.invocationCallOrder[0]!,
    );
  });

  it('confirmTotpSetup rejects without touching the preference on a wrong code', async () => {
    const user = signedIn();
    const wrong = Object.assign(new Error('Code mismatch'), {
      name: 'EnableSoftwareTokenMFAException',
    });
    user.verifySoftwareToken.mockImplementation(
      (_code: string, _name: string, callbacks: { onFailure: (e: Error) => void }) =>
        callbacks.onFailure(wrong),
    );
    await expect(client.confirmTotpSetup('999999')).rejects.toMatchObject({
      name: 'EnableSoftwareTokenMFAException',
    });
    expect(user.setUserMfaPreference).not.toHaveBeenCalled();
  });

  it('confirmTotpSetup rejects when setting the preference fails', async () => {
    const user = signedIn();
    user.verifySoftwareToken.mockImplementation(
      (_code: string, _name: string, callbacks: { onSuccess: (s: unknown) => void }) =>
        callbacks.onSuccess({}),
    );
    user.setUserMfaPreference.mockImplementation(
      (_sms: unknown, _totp: unknown, cb: (err: Error | null) => void) =>
        cb(new Error('boom')),
    );
    await expect(client.confirmTotpSetup('123456')).rejects.toThrow('boom');
  });
});

describe('revoked access token during enrolment', () => {
  beforeEach(() => vi.clearAllMocks());

  const revoked = () =>
    Object.assign(new Error('Access Token has been revoked'), {
      name: 'NotAuthorizedException',
      code: 'NotAuthorizedException',
    });

  function signedInWith(overrides: Record<string, unknown>) {
    const user = {
      getSession: vi.fn((cb: (err: Error | null, s: unknown) => void) =>
        cb(null, { isValid: () => true, getIdToken: () => ({ payload: { email: 'a@b.c' } }) }),
      ),
      getUsername: () => 'sub-1',
      ...overrides,
    };
    getCurrentUser.mockReturnValue(user);
    return user;
  }

  it('startTotpSetup rejects NotSignedInError when AssociateSoftwareToken says the token is revoked', async () => {
    signedInWith({
      associateSoftwareToken: vi.fn((callbacks: { onFailure: (e: unknown) => void }) =>
        callbacks.onFailure(revoked()),
      ),
    });
    await expect(client.startTotpSetup()).rejects.toMatchObject({ name: 'NotSignedInError' });
  });

  it('confirmTotpSetup rejects NotSignedInError when VerifySoftwareToken says the token is revoked', async () => {
    signedInWith({
      verifySoftwareToken: vi.fn(
        (_code: string, _name: string, callbacks: { onFailure: (e: unknown) => void }) =>
          callbacks.onFailure(revoked()),
      ),
      setUserMfaPreference: vi.fn(),
    });
    await expect(client.confirmTotpSetup('123456')).rejects.toMatchObject({
      name: 'NotSignedInError',
    });
  });

  it('confirmTotpSetup rejects NotSignedInError when SetUserMFAPreference says the token is revoked', async () => {
    signedInWith({
      verifySoftwareToken: vi.fn(
        (_code: string, _name: string, callbacks: { onSuccess: (s: unknown) => void }) =>
          callbacks.onSuccess({}),
      ),
      setUserMfaPreference: vi.fn((_sms: unknown, _totp: unknown, cb: (e: unknown) => void) =>
        cb(revoked()),
      ),
    });
    await expect(client.confirmTotpSetup('123456')).rejects.toMatchObject({
      name: 'NotSignedInError',
    });
  });
});

describe('isTotpEnabled', () => {
  beforeEach(() => vi.clearAllMocks());

  function withUserData(result: { err?: unknown; data?: unknown }) {
    const user = {
      getSession: vi.fn((cb: (err: Error | null, s: unknown) => void) =>
        cb(null, { isValid: () => true }),
      ),
      getUserData: vi.fn((cb: (err: unknown, data?: unknown) => void) =>
        cb(result.err ?? null, result.data),
      ),
    };
    getCurrentUser.mockReturnValue(user);
    return user;
  }

  it('is true when TOTP is the preferred factor, reading past the SDK cache', async () => {
    const user = withUserData({
      data: { PreferredMfaSetting: 'SOFTWARE_TOKEN_MFA', UserMFASettingList: ['SOFTWARE_TOKEN_MFA'] },
    });
    await expect(client.isTotpEnabled()).resolves.toBe(true);
    expect(user.getUserData).toHaveBeenCalledWith(expect.any(Function), { bypassCache: true });
  });

  it('is true when TOTP is enabled but not (yet) preferred', async () => {
    withUserData({ data: { UserMFASettingList: ['SOFTWARE_TOKEN_MFA'] } });
    await expect(client.isTotpEnabled()).resolves.toBe(true);
  });

  it('is false when no MFA factor is set', async () => {
    withUserData({ data: { Username: 'sub-1', UserAttributes: [] } });
    await expect(client.isTotpEnabled()).resolves.toBe(false);
  });

  it('rejects with the SDK error when GetUser fails', async () => {
    withUserData({ err: Object.assign(new Error('boom'), { name: 'InternalErrorException' }) });
    await expect(client.isTotpEnabled()).rejects.toMatchObject({ name: 'InternalErrorException' });
  });

  it('rejects NotSignedInError when the access token is revoked', async () => {
    withUserData({
      err: Object.assign(new Error('Access Token has been revoked'), {
        name: 'NotAuthorizedException',
        code: 'NotAuthorizedException',
      }),
    });
    await expect(client.isTotpEnabled()).rejects.toMatchObject({ name: 'NotSignedInError' });
  });

  it('rejects NotSignedInError when nobody is signed in', async () => {
    getCurrentUser.mockReturnValue(null);
    await expect(client.isTotpEnabled()).rejects.toMatchObject({ name: 'NotSignedInError' });
  });
});

describe('signIn unsupported challenges', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(['mfaRequired', 'selectMFAType', 'mfaSetup', 'customChallenge'])(
    'rejects UnsupportedChallengeError on %s so the sign-in always settles',
    async (callback) => {
      authenticateUser.mockImplementation((_details, callbacks) => {
        callbacks[callback]('CHALLENGE', {});
      });
      await expect(client.signIn('a@b.c', 'pw')).rejects.toMatchObject({
        name: 'UnsupportedChallengeError',
      });
    },
  );
});
