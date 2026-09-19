// Offline AuthClient: no Cognito, no network. For dev when the pool is down or
// unreachable — pair it with a mock API server (which decodes bearer tokens but
// never verifies signatures).
//
// Any email signs in. The PASSWORD picks the scenario:
//   - a role name ('platform_admin' | 'owner' | 'admin' | 'trainer' |
//     'receptionist' | 'consumer') → signs in with that role
//   - 'wrong'  → rejects like bad credentials (NotAuthorizedException)
//   - 'invite' → the newPasswordRequired first-login challenge
//   - anything else → signs in as 'owner'
//
// Tokens are unsigned JWT-shaped strings carrying the claims the apps read
// (sub, email, given_name, org_id, role, permissions, exp) with a 1h expiry,
// re-minted on every read so a mock session never expires mid-flow.
import type { AuthClient, SignInResult } from './cognito';

const ROLES = ['platform_admin', 'owner', 'admin', 'trainer', 'receptionist', 'consumer'];
const STORAGE_KEY = 'iziwellpass.mock-auth';

interface MockSession {
  email: string;
  role: string;
}

function toBase64Url(json: string): string {
  const b64 =
    typeof btoa === 'function'
      ? btoa(unescape(encodeURIComponent(json)))
      : Buffer.from(json, 'utf8').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function displayName(email: string): string {
  const local = email.split('@')[0] ?? 'membre';
  const first = local.split(/[+._-]/)[0] ?? local;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

/** Mint an unsigned, JWT-shaped ID token for a mock session. Exported for tests. */
export function mintMockIdToken(session: MockSession, nowMs: number = Date.now()): string {
  const header = toBase64Url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = toBase64Url(
    JSON.stringify({
      sub: `mock-${session.email}`,
      email: session.email,
      given_name: displayName(session.email),
      org_id: 'org-mock-01',
      role: session.role,
      permissions: [],
      iat: Math.floor(nowMs / 1000),
      exp: Math.floor(nowMs / 1000) + 3600,
    }),
  );
  return `${header}.${payload}.mock-signature`;
}

export function createMockAuthClient(): AuthClient {
  // localStorage when available (browser reloads stay signed in); an in-memory
  // fallback keeps SSR/prerender and tests from crashing.
  let memory: string | null = null;
  const read = (): MockSession | null => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : memory;
      return raw ? (JSON.parse(raw) as MockSession) : null;
    } catch {
      return null;
    }
  };
  const write = (session: MockSession | null): void => {
    const raw = session ? JSON.stringify(session) : null;
    memory = raw;
    try {
      if (typeof localStorage !== 'undefined') {
        if (raw) localStorage.setItem(STORAGE_KEY, raw);
        else localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // storage unavailable — memory fallback already holds the session
    }
  };

  const start = (email: string, role: string): string => {
    const session: MockSession = { email, role };
    write(session);
    return mintMockIdToken(session);
  };

  return {
    signUp: () => Promise.resolve(),
    confirmSignUp: () => Promise.resolve(),
    resendConfirmationCode: () => Promise.resolve(),

    signIn: (email: string, password: string): Promise<SignInResult> => {
      if (password === 'wrong') {
        const err = new Error('Incorrect username or password.');
        err.name = 'NotAuthorizedException';
        return Promise.reject(err);
      }
      if (password === 'invite') {
        return Promise.resolve({
          kind: 'new-password-required',
          complete: (newPassword: string) =>
            Promise.resolve({
              idToken: start(email, ROLES.includes(newPassword) ? newPassword : 'owner'),
            }),
        });
      }
      const role = ROLES.includes(password) ? password : 'owner';
      return Promise.resolve({ kind: 'success', idToken: start(email, role) });
    },

    signOut: () => {
      write(null);
    },

    getIdToken: () => {
      const session = read();
      return Promise.resolve(session ? mintMockIdToken(session) : null);
    },

    forceRefreshSession: () => {
      const session = read();
      return Promise.resolve(session ? mintMockIdToken(session) : null);
    },
  };
}
