import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AuthClient } from './cognito';
import { AuthProvider, useAuth, useRole, useSession } from './provider';

function fakeJwt(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'none' })}.${b64(payload)}.s`;
}

function stubClient(idToken: string | null): AuthClient {
  return {
    signUp: vi.fn(),
    confirmSignUp: vi.fn(),
    resendConfirmationCode: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    getIdToken: vi.fn().mockResolvedValue(idToken),
    forceRefreshSession: vi.fn().mockResolvedValue(null),
  };
}

function Probe() {
  const session = useSession();
  const role = useRole();
  if (session.status === 'loading') return <p>loading</p>;
  if (session.status === 'signed-out') return <p>signed-out</p>;
  return (
    <p>
      {session.claims.email} / {role}
    </p>
  );
}

function RefreshProbe() {
  const { session, refresh } = useAuth();
  if (session.status === 'loading') return <p>loading</p>;
  return (
    <div>
      <p>{session.status === 'signed-in' ? `${session.claims.email} / signed-in` : 'signed-out'}</p>
      <button onClick={() => void refresh()}>refresh</button>
    </div>
  );
}

function ForceRefreshProbe() {
  const { session, refresh } = useAuth();
  if (session.status === 'loading') return <p>loading</p>;
  return (
    <div>
      <p>
        {session.status === 'signed-in'
          ? `${session.claims.email} / ${session.claims.role}`
          : 'signed-out'}
      </p>
      <button onClick={() => void refresh({ force: true })}>force-refresh</button>
    </div>
  );
}

describe('AuthProvider', () => {
  it('exposes signed-in claims from a valid session', async () => {
    const token = fakeJwt({
      sub: 'u1',
      email: 'o@x.com',
      org_id: 'org1',
      role: 'owner',
      permissions: '[]',
      exp: 9999999999,
    });
    render(
      <AuthProvider client={stubClient(token)}>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText('o@x.com / owner')).toBeTruthy());
  });

  it('exposes signed-out when there is no session', async () => {
    render(
      <AuthProvider client={stubClient(null)}>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText('signed-out')).toBeTruthy());
  });

  it('re-syncs the session when refresh() is called after a challenge completes', async () => {
    const client = stubClient(null);
    render(
      <AuthProvider client={client}>
        <RefreshProbe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText('signed-out')).toBeTruthy());

    const token = fakeJwt({
      sub: 'u2',
      email: 'staff@x.com',
      org_id: 'org1',
      role: 'trainer',
      permissions: '[]',
      exp: 9999999999,
    });
    vi.mocked(client.getIdToken).mockResolvedValue(token);

    screen.getByRole('button', { name: 'refresh' }).click();

    await waitFor(() => expect(screen.getByText('staff@x.com / signed-in')).toBeTruthy());
  });

  it('carries the new role after refresh({ force: true }) mints an owner-claims token', async () => {
    const staffToken = fakeJwt({
      sub: 'u3',
      email: 'new-owner@x.com',
      org_id: null,
      role: null,
      permissions: '[]',
      exp: 9999999999,
    });
    const client = stubClient(staffToken);
    render(
      <AuthProvider client={client}>
        <ForceRefreshProbe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByText('new-owner@x.com / null')).toBeTruthy());

    const ownerToken = fakeJwt({
      sub: 'u3',
      email: 'new-owner@x.com',
      org_id: 'org2',
      role: 'owner',
      permissions: '[]',
      exp: 9999999999,
    });
    vi.mocked(client.forceRefreshSession).mockResolvedValue(ownerToken);

    screen.getByRole('button', { name: 'force-refresh' }).click();

    await waitFor(() => expect(screen.getByText('new-owner@x.com / owner')).toBeTruthy());
    expect(client.forceRefreshSession).toHaveBeenCalledTimes(1);
  });
});
