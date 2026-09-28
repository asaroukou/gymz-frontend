// Offline AuthClient: no Cognito, no network. For dev when the pool is down or
// unreachable — pair it with a mock API server (which decodes bearer tokens but
// never verifies signatures).
//
// Any email signs in. The PASSWORD picks the scenario:
//   - a role name ('platform_admin' | 'owner' | 'admin' | 'trainer' |
//     'receptionist' | 'consumer') → signs in with that role
//   - 'wrong'  → rejects like bad credentials (NotAuthorizedException)
//   - 'invite' → the newPasswordRequired first-login challenge
//   - 'totp'   → the TOTP code step, then signs in as 'owner'; code 123456
//                passes, 000000 answers like an expired MFA session, any
//                other code is CodeMismatchException
//   - an e-mail that enrolled TOTP through startTotpSetup/confirmTotpSetup
//     (remembered in localStorage) gets the code step on every sign-in
//   - anything else → signs in as 'owner'
//
// Tokens are unsigned JWT-shaped strings carrying the claims the apps read
// (sub, email, given_name, org_id, role, permissions, exp) with a 1h expiry,
// re-minted on every read so a mock session never expires mid-flow.
import type { AuthClient, SignInResult } from './cognito';
import { notSignedInError } from './errors';
import { buildOtpauthUri } from './totp';

const ROLES = ['platform_admin', 'owner', 'admin', 'trainer', 'receptionist', 'consumer'];
const STORAGE_KEY = 'iziwellpass.mock-auth';
const MFA_STORAGE_KEY = 'iziwellpass.mock-auth.mfa';
export const MOCK_TOTP_SECRET = 'JBSWY3DPEHPK3PXPQMFRG3PZ2ZKQ';
export const MOCK_TOTP_CODE = '123456';
export const MOCK_TOTP_EXPIRED_CODE = '000000';
const MOCK_MFA_ENROLLED_AT = '2026-09-28T08:00:00Z';

interface MockSession {
  email: string;
  role: string;
  /** Signed in through the TOTP code step: the token carries mfa_enrolled_at. */
  mfa?: boolean;
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
      ...(session.mfa ? { mfa_enrolled_at: MOCK_MFA_ENROLLED_AT } : {}),
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

  let enrolledMemory: string[] = [];
  const enrolled = (): string[] => {
    try {
      const raw =
        typeof localStorage !== 'undefined' ? localStorage.getItem(MFA_STORAGE_KEY) : null;
      return raw ? (JSON.parse(raw) as string[]) : enrolledMemory;
    } catch {
      return enrolledMemory;
    }
  };
  const enrol = (email: string): void => {
    enrolledMemory = [...new Set([...enrolled(), email])];
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(MFA_STORAGE_KEY, JSON.stringify(enrolledMemory));
      }
    } catch {
      // storage unavailable: the memory list already holds it
    }
  };

  const codeError = (name: string, message: string): Error => {
    const err = new Error(message);
    err.name = name;
    return err;
  };

  const start = (email: string, role: string, mfa = false): string => {
    const session: MockSession = { email, role, mfa };
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
      if (password === 'totp' || enrolled().includes(email)) {
        return Promise.resolve({
          kind: 'totp-required',
          submit: (code: string) => {
            if (code === MOCK_TOTP_EXPIRED_CODE) {
              return Promise.reject(
                codeError(
                  'NotAuthorizedException',
                  'Invalid session for the user, session is expired.',
                ),
              );
            }
            if (code !== MOCK_TOTP_CODE) {
              return Promise.reject(
                codeError('CodeMismatchException', 'Invalid code received for user'),
              );
            }
            enrol(email);
            return Promise.resolve({ idToken: start(email, role, true) });
          },
        });
      }
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

    startTotpSetup: () => {
      const session = read();
      if (!session) return Promise.reject(notSignedInError());
      return Promise.resolve({
        secret: MOCK_TOTP_SECRET,
        otpauthUri: buildOtpauthUri(session.email, MOCK_TOTP_SECRET),
      });
    },

    confirmTotpSetup: (code: string) => {
      const session = read();
      if (!session) return Promise.reject(notSignedInError());
      if (code !== MOCK_TOTP_CODE) {
        return Promise.reject(
          codeError(
            'EnableSoftwareTokenMFAException',
            'Code mismatch and fail enable Software Token MFA',
          ),
        );
      }
      enrol(session.email);
      return Promise.resolve();
    },
  };
}
