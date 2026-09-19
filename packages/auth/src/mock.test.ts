import { beforeEach, describe, expect, it } from 'vitest';
import { createMockAuthClient, mintMockIdToken } from './mock';
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
