import { beforeEach, describe, expect, it } from 'vitest';
import {
  createMockAuthClient,
  mintMockIdToken,
  MOCK_TOTP_CODE,
  MOCK_TOTP_EXPIRED_CODE,
  MOCK_TOTP_SECRET,
} from './mock';
import { parseClaims } from './claims';

beforeEach(() => {
  localStorage.clear();
});

describe('mintMockIdToken', () => {
  it('mints a token parseClaims can read, with a future expiry', () => {
    const now = Date.now();
    const claims = parseClaims(mintMockIdToken({ email: 'awa@example.com', role: 'owner' }, now));
    expect(claims.email).toBe('awa@example.com');
    expect(claims.role).toBe('owner');
    expect(claims.orgId).toBe('org-mock-01');
    expect(claims.name).toBe('Awa');
    expect(claims.expiresAt).toBe(Math.floor(now / 1000) + 3600);
  });
});

describe('createMockAuthClient', () => {
  it('signs any email in as owner by default', async () => {
    const client = createMockAuthClient();
    const result = await client.signIn('abdel@example.com', 'whatever');
    if (result.kind !== 'success') throw new Error('expected success');
    expect(parseClaims(result.idToken).role).toBe('owner');
  });

  it('uses a role-named password as the role', async () => {
    const client = createMockAuthClient();
    const result = await client.signIn('r@example.com', 'trainer');
    if (result.kind !== 'success') throw new Error('expected success');
    expect(parseClaims(result.idToken).role).toBe('trainer');
  });

  it("rejects the password 'wrong' like bad credentials", async () => {
    const client = createMockAuthClient();
    await expect(client.signIn('a@b.co', 'wrong')).rejects.toMatchObject({
      name: 'NotAuthorizedException',
    });
  });

  it("runs the newPasswordRequired flow for the password 'invite'", async () => {
    const client = createMockAuthClient();
    const result = await client.signIn('new@member.co', 'invite');
    if (result.kind !== 'new-password-required') throw new Error('expected challenge');
    const { idToken } = await result.complete('S3cure-enough');
    expect(parseClaims(idToken).email).toBe('new@member.co');
    expect(await client.getIdToken()).not.toBeNull();
  });

  it('persists across clients (storage) and signs out cleanly', async () => {
    const first = createMockAuthClient();
    await first.signIn('persist@example.com', 'whatever');
    const second = createMockAuthClient();
    expect(await second.getIdToken()).not.toBeNull();
    expect(await second.forceRefreshSession()).not.toBeNull();
    second.signOut();
    expect(await second.getIdToken()).toBeNull();
    expect(await first.getIdToken()).toBeNull();
  });
});

describe('mock TOTP', () => {
  const rawClaims = (token: string) =>
    JSON.parse(atob(token.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/'))) as Record<
      string,
      unknown
    >;

  it("challenges the password 'totp' and signs in as owner with the MFA claim", async () => {
    const client = createMockAuthClient();
    const result = await client.signIn('moussa@studio.sn', 'totp');
    if (result.kind !== 'totp-required') throw new Error('expected totp-required');
    const { idToken } = await result.submit(MOCK_TOTP_CODE);
    expect(parseClaims(idToken).role).toBe('owner');
    expect(rawClaims(idToken).mfa_enrolled_at).toBeTruthy();
  });

  it('rejects a wrong code as CodeMismatchException', async () => {
    const client = createMockAuthClient();
    const result = await client.signIn('moussa@studio.sn', 'totp');
    if (result.kind !== 'totp-required') throw new Error('expected totp-required');
    await expect(result.submit('111111')).rejects.toMatchObject({ name: 'CodeMismatchException' });
  });

  it('rejects the expired-session code like Cognito', async () => {
    const client = createMockAuthClient();
    const result = await client.signIn('moussa@studio.sn', 'totp');
    if (result.kind !== 'totp-required') throw new Error('expected totp-required');
    await expect(result.submit(MOCK_TOTP_EXPIRED_CODE)).rejects.toMatchObject({
      name: 'NotAuthorizedException',
      message: 'Invalid session for the user, session is expired.',
    });
  });

  it('mints no MFA claim for a plain sign-in', async () => {
    const client = createMockAuthClient();
    const result = await client.signIn('plain@studio.sn', 'owner');
    if (result.kind !== 'success') throw new Error('expected success');
    expect(rawClaims(result.idToken).mfa_enrolled_at).toBeUndefined();
  });

  it('enrols the signed-in user, then challenges their next role-password sign-in', async () => {
    const client = createMockAuthClient();
    await client.signIn('aida@studio.sn', 'admin');
    const setup = await client.startTotpSetup();
    expect(setup.secret).toBe(MOCK_TOTP_SECRET);
    expect(setup.otpauthUri).toContain('IziWellPass:aida%40studio.sn');
    await expect(client.confirmTotpSetup('999999')).rejects.toMatchObject({
      name: 'EnableSoftwareTokenMFAException',
    });
    await client.confirmTotpSetup(MOCK_TOTP_CODE);
    client.signOut();

    const again = await client.signIn('aida@studio.sn', 'admin');
    if (again.kind !== 'totp-required') throw new Error('expected totp-required');
    const { idToken } = await again.submit(MOCK_TOTP_CODE);
    expect(parseClaims(idToken).role).toBe('admin');
    expect(rawClaims(idToken).mfa_enrolled_at).toBeTruthy();
  });

  it('reports whether the signed-in e-mail has enrolled TOTP', async () => {
    const client = createMockAuthClient();
    await client.signIn('fatou@studio.sn', 'owner');
    await expect(client.isTotpEnabled()).resolves.toBe(false);
    await client.startTotpSetup();
    await expect(client.isTotpEnabled()).resolves.toBe(false);
    await client.confirmTotpSetup(MOCK_TOTP_CODE);
    await expect(client.isTotpEnabled()).resolves.toBe(true);

    client.signOut();
    await client.signIn('other@studio.sn', 'owner');
    await expect(client.isTotpEnabled()).resolves.toBe(false);
  });

  it('rejects isTotpEnabled with NotSignedInError when signed out', async () => {
    const client = createMockAuthClient();
    await expect(client.isTotpEnabled()).rejects.toMatchObject({ name: 'NotSignedInError' });
  });

  it('rejects enrolment with NotSignedInError when signed out', async () => {
    const client = createMockAuthClient();
    await expect(client.startTotpSetup()).rejects.toMatchObject({ name: 'NotSignedInError' });
    await expect(client.confirmTotpSetup(MOCK_TOTP_CODE)).rejects.toMatchObject({
      name: 'NotSignedInError',
    });
  });
});
