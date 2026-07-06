import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AuthClient } from './cognito';
import { AuthProvider, useRole, useSession } from './provider';

function fakeJwt(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'none' })}.${b64(payload)}.s`;
}

function stubClient(idToken: string | null): AuthClient {
  return {
    signUp: vi.fn(),
    confirmSignUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    getIdToken: vi.fn().mockResolvedValue(idToken),
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
});
