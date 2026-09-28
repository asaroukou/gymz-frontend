# SP-F TOTP MFA at Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Owners and admins with TOTP enabled can sign in to the owner app with a 6-digit code, and any owner/admin the backend refuses with `403 MFA_ENROLLMENT_REQUIRED` is sent to a `/mfa` page that enrols TOTP and finalizes it.

**Architecture:** `packages/auth` learns the Cognito `totpRequired` challenge and two enrolment calls (`startTotpSetup`, `confirmTotpSetup`) on the signed-in user's own session; its mock mirrors them. `packages/api` routes `/platform/v1/mfa/*` to the control plane and calls an `onMfaRequired` hook on the backend's 403. The owner app keeps every rule in pure, node-tested `lib/*` helpers (redirect guard, enrolment reducer and orchestration, code normalisation, QR modules), adds a code step to the login page, and a new `/mfa` page in the `(auth)` layout; the mock API server can enforce MFA and serves `finalize`.

**Tech Stack:** Next 15 (app router), React 19, next-intl, amazon-cognito-identity-js 6, `input-otp` (via `@iziwellpass/ui/components/input-otp`), `qrcode` (new, owner app), TanStack Query 5, orval-generated client (`finalizeMfa` in `@iziwellpass/api/generated`), vitest 3.

**Spec:** `docs/superpowers/specs/2026-09-28-totp-mfa-login-design.md` (F1–F12). Read it first.

## Global Constraints

- Canvas frames are the source of truth for look and copy: `PmD8D` (login code step), `e2wZj` (setup), `OKurh` (verify), `PCsCv` (invalid code), `S2ZUQo` (done). PNGs in `docs/design-refs/comptoir-clair/mfa/<id>.png`. Exception F1: the setup intro drops « Obligatoire pour les propriétaires et administrateurs. ».
- F2: the owner app never reads `mfa_enrolled_at` and never pre-checks roles; the gate is only the backend's `403` with code `MFA_ENROLLMENT_REQUIRED`.
- F4: enrolment uses the public SRP client in the browser: `AssociateSoftwareToken` → `VerifySoftwareToken` → `SetUserMFAPreference(null, { PreferredMfa: true, Enabled: true })`, then `POST /platform/v1/mfa/finalize` (`finalizeMfa()`), then local `signOut()`.
- F6: a failed finalize is retried alone; setup is never restarted after Cognito accepted the code.
- F9: the sixth digit submits; one code is never sent twice; a wrong code clears the boxes and refocuses the first.
- F12: never run enrolment against real Cognito. All checks use the offline mock (`NEXT_PUBLIC_AUTH_MOCK=1`).
- Design system « Le comptoir clair » (`DESIGN.md`): Inter, sentence case, one ink button per screen, Lucide icons at stroke 1.5, hairline `#dcdcdc` (`border-border`), muted `#5f6368` (`text-muted-foreground`), side `#fafafa` (`bg-side`), destructive text `text-destructive-foreground`, success tint `bg-success`/`text-success-foreground`. No em dashes in copy.
- Message files `apps/owner/messages/{fr,en}.json` and `apps/admin/messages/{fr,en}.json`: edit by inserting text with the Edit tool only, never parse and re-serialize; keep fr/en key parity.
- Only new dependency: `qrcode` + `@types/qrcode` in `apps/owner` (Task 3). After the install, run `pnpm exec tsc --noEmit` in `apps/owner`, `apps/admin` and `packages/ui` (pnpm peer-instance drift has broken siblings before).
- Owner app unit tests run in vitest's node environment and only pick up `apps/owner/lib/**/*.test.ts`: put logic in `lib/`, keep components thin.
- Gates (from `web/`): `pnpm --filter @iziwellpass/<pkg> typecheck`, `… lint`, `… test` for every package a task touches; before committing a task also `pnpm typecheck && pnpm lint && pnpm test` (add `--force` if turbo output looks replayed from another checkout).
- Commits: `feat(auth): …`, `feat(api): …`, `feat(owner): …`, `test(…): …`, each ending with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- Worktree: `web/.worktrees/feat-totp-mfa`, branch `feat/totp-mfa` off local `main`.
- **Running the app for visual checks** (Tasks 5 and 6): owner mock API on port 8091, Next on 3021, Chrome debugging port 9335. Never touch 8090, 3011, 8082 (the user's own processes). Start the mock with `PORT=8091 MOCK_MFA=required node apps/owner/scripts/mock-server.mjs` (add `MOCK_MFA_FINALIZE=fail` for the retry check), and Next with `NEXT_PUBLIC_AUTH_MOCK=1 API_PROXY_TARGET=http://localhost:8091 NEXT_PUBLIC_API_BASE_URL=/api/backend CONTROL_PLANE_PROXY_TARGET=http://localhost:8091 NEXT_PUBLIC_CONTROL_PLANE_BASE_URL=/api/control pnpm --filter @iziwellpass/owner exec next dev --port 3021`. Drive Chrome for Testing over CDP from a `/tmp/spf-*.mjs` script (`/Users/abdel/.cache/puppeteer/chrome/mac_arm-151.0.7922.47/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing --headless=new --disable-gpu --disable-software-rasterizer --disable-dev-shm-usage --remote-debugging-port=9335 --user-data-dir=/tmp/spf-chrome --lang=fr-FR`, plus `Emulation.setUserAgentOverride({ userAgent, acceptLanguage: 'fr-FR,fr' })`; for English use `en-US`). Viewports 390×844 (deviceScaleFactor 2) and 1440×900. Screenshots to `/tmp/spf-task<N>-*.png`, compared with the frame PNGs. Poll readiness with short loops, never long fixed sleeps. Stop everything you start.

**Plan rulings (spec details decided while planning):**

- **P1 — Component behaviour is pinned through `lib/` units plus browser checks.** The owner app has no component-test setup (node environment, `lib/**/*.test.ts` only). The spec §8 behaviours for `TotpCard` and the enrolment flow are pinned by pure helpers (`singleFlight`, `onceAsync`, `normalizeCode`, `totpErrorOutcome`, `enrolmentReducer`, `verifyAndFinalize`, `finalizeAndSignOut`, `createMfaRedirect`) and by the browser checks in Tasks 5 and 6. Cost if wrong: a regression in glue code is caught later, by the browser checks.
- **P2 — The login never lands on `/mfa`.** `sanitizeNext` maps any `/mfa` path to `/`. A user who signs in again after enrolling (or whose session ran out on `/mfa`) goes to `/`; if the backend still refuses them, the gate brings them back. This prevents a second `AssociateSoftwareToken` on an already-enrolled account.
- **P3 — QR geometry follows the canvas** (spec §3 and §5 corrected to match). e2wZj draws a 240px box (radius 24, hairline, 20px padding) around a 200px code. The `(auth)` column stays 400px (e2wZj draws 440px); the key field wraps to two lines on narrow screens (real Cognito secrets are 52 characters).
- **P4 — The QR is drawn from module data, never injected HTML.** `qrModules(text)` (from `qrcode`'s `create`) returns a size and one SVG path; the component renders it as JSX. No `dangerouslySetInnerHTML`.
- **P5 — The done medallion reuses `AuthCard`'s 56px medallion** with a new `mediaTone="vert"` (S2ZUQo draws 64px). Buttons keep the owner app's 44px height (existing login uses the same `Button`).
- **P6 — « Support line » on finalize failure is the layout's help line** (« Besoin d'aide ? Contactez la personne qui vous a donné accès. »), which the `(auth)` layout already renders under every screen. No extra paragraph.
- **P7 — A non-code error while verifying on `/mfa`** (network, throttling) shows « Vérification impossible. Réessayez. » (`mfa.verify.error`), a key the spec's copy table lacks.
- **P8 — Admin and member apps compile against the new `SignInResult`.** The admin login shows « La double authentification n'est pas encore prise en charge ici. » for a TOTP challenge; the member app wraps the shared mock so it never returns `totp-required` (members are never enrolled). Neither app gains a code step.

## Review Focus

1. **React StrictMode runs the `/mfa` setup effect twice** → two `AssociateSoftwareToken` calls, and the screen could show a secret Cognito already replaced. Expected: one call per mount. Pinned in Task 3 (`onceAsync` returns the same promise to concurrent callers) and used by Task 6.
2. **A code pasted or autofilled with spaces or dashes** (« 123 456 », « 123-456 », from a password manager) → the six digits land in the boxes and submit. Pinned in Task 3 (`normalizeCode`) and wired in Task 5 (`pasteTransformer`).
3. **Auto-submit on the sixth digit plus Enter or a click on « Vérifier »** → one `sendMFACode`, not two (the second would fail with « Invalid session »). Pinned in Task 3 (`singleFlight`) and used by Tasks 5 and 6.
4. **After enrolling, « Se reconnecter » or an expired session sends the user to `/login?next=/mfa…`** → login lands on `/`, never back on `/mfa`. Pinned in Task 3 (`sanitizeNext` tests for `/mfa`, `/mfa?next=…`, `/mfa/x`).
5. **A dashboard firing six queries that all return the MFA 403** → one redirect, `next` keeps the original path and query, and nothing fires while on `/mfa`. Pinned in Task 3 (`createMfaRedirect` tests).

---

## File Structure

| File | Task | Responsibility |
| --- | --- | --- |
| `packages/auth/src/totp.ts` (+test) | 1 | `TotpSetup`, `TOTP_ISSUER`, `buildOtpauthUri`, `formatSecret` |
| `packages/auth/src/errors.ts` (+test) | 1 | `sessionExpired` code, `EnableSoftwareTokenMFAException`, `NotSignedInError` + `notSignedInError()` |
| `packages/auth/src/cognito.ts` (+test) | 1 | `totp-required` sign-in result, `startTotpSetup`, `confirmTotpSetup` |
| `packages/auth/src/mock.ts` (+test) | 1 | Mock TOTP challenge, mock enrolment, `mfa_enrolled_at` in mock tokens |
| `packages/auth/package.json` | 1 | Export `./totp` |
| `apps/owner/app/providers.tsx`, `apps/admin/app/providers.tsx` | 1 | `noopAuthClient` gains the two methods |
| `apps/owner/app/(auth)/login/page.tsx` | 1, 5 | Task 1: compile-only branch; Task 5: `TotpCard` |
| `apps/admin/app/(auth)/login/page.tsx`, `apps/admin/messages/{fr,en}.json` | 1 | Unsupported-TOTP message (P8), `sessionExpired` copy |
| `apps/member/lib/auth/member-mock.ts` (+test), `apps/member/lib/auth/context.tsx` | 1 | Member-safe mock wrapper (P8) |
| `apps/owner/messages/{fr,en}.json` | 1, 5, 6 | `auth.errors.sessionExpired` (1), `auth.totp.*` + `auth.errors.codeMismatchTotp` (5), `mfa.*` (6) |
| `packages/api/src/client.ts` (+test) | 2 | `/platform/v1/mfa/` prefix, `onMfaRequired` hook |
| `apps/owner/lib/next-path.ts` (+test) | 3 | `sanitizeNext`, `isMfaPath` |
| `apps/owner/lib/initials.ts` (+test) | 3 | `initials(nameOrEmail)`, moved from `app/(app)/layout.tsx` |
| `apps/owner/lib/async-guards.ts` (+test) | 3 | `singleFlight`, `onceAsync` |
| `apps/owner/lib/totp-code.ts` (+test) | 3 | `CODE_LENGTH`, `normalizeCode`, `totpErrorOutcome` |
| `apps/owner/lib/mfa-redirect.ts` (+test) | 3 | `createMfaRedirect` |
| `apps/owner/lib/mfa-enrolment.ts` (+test) | 3 | `enrolmentReducer`, `verifyAndFinalize`, `finalizeAndSignOut` |
| `apps/owner/lib/qr-modules.ts` (+test) | 3 | `qrModules(text)` |
| `apps/owner/scripts/mock-server.mjs` | 4 | `MOCK_MFA=required`, `POST /platform/v1/mfa/finalize`, `MOCK_MFA_FINALIZE=fail` |
| `apps/owner/components/auth/code-input.tsx` | 5 | Six-box code field |
| `apps/owner/components/auth-card.tsx` | 6 | `mediaTone` prop |
| `apps/owner/components/auth/totp-qr.tsx` | 6 | QR in the e2wZj frame |
| `apps/owner/lib/use-mfa-enrolment.ts` | 6 | Hook wiring reducer + client + router |
| `apps/owner/app/(auth)/mfa/page.tsx` | 6 | The `/mfa` page and its views |

---

### Task 1: `packages/auth` TOTP challenge, enrolment calls, mock, and compiling consumers

**Files:**
- Create: `packages/auth/src/totp.ts`, `packages/auth/src/totp.test.ts`
- Modify: `packages/auth/src/errors.ts`, `packages/auth/src/errors.test.ts`, `packages/auth/src/cognito.ts`, `packages/auth/src/cognito.test.ts`, `packages/auth/src/mock.ts`, `packages/auth/src/mock.test.ts`, `packages/auth/package.json`
- Modify (consumers): `apps/owner/app/providers.tsx`, `apps/owner/app/(auth)/login/page.tsx`, `apps/owner/messages/fr.json`, `apps/owner/messages/en.json`, `apps/admin/app/providers.tsx`, `apps/admin/app/(auth)/login/page.tsx`, `apps/admin/messages/fr.json`, `apps/admin/messages/en.json`, `apps/member/lib/auth/context.tsx`
- Create: `apps/member/lib/auth/member-mock.ts`, `apps/member/lib/auth/member-mock.test.ts`

**Interfaces:**
- Produces (`@iziwellpass/auth/totp`): `interface TotpSetup { secret: string; otpauthUri: string }`, `const TOTP_ISSUER = 'IziWellPass'`, `buildOtpauthUri(account: string, secret: string, issuer?: string): string`, `formatSecret(secret: string): string`.
- Produces (`@iziwellpass/auth/errors`): `AuthErrorCode` gains `'sessionExpired'`; `NOT_SIGNED_IN = 'NotSignedInError'`; `notSignedInError(): Error`.
- Produces (`@iziwellpass/auth/client`): `SignInResult` gains `{ kind: 'totp-required'; submit: (code: string) => Promise<{ idToken: string }> }`; `AuthClient` gains `startTotpSetup(): Promise<TotpSetup>` and `confirmTotpSetup(code: string): Promise<void>`.
- Produces (`@iziwellpass/auth/mock`): `MOCK_TOTP_SECRET = 'JBSWY3DPEHPK3PXPQMFRG3PZ2ZKQ'`, `MOCK_TOTP_CODE = '123456'`, `MOCK_TOTP_EXPIRED_CODE = '000000'`.

- [ ] **Step 1: Write the failing `totp.ts` test**

`packages/auth/src/totp.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { TOTP_ISSUER, buildOtpauthUri, formatSecret } from './totp';

describe('buildOtpauthUri', () => {
  it('builds a totp URI labelled issuer:account with the issuer parameter', () => {
    expect(buildOtpauthUri('moussa@studioplateau.sn', 'JBSWY3DP')).toBe(
      'otpauth://totp/IziWellPass:moussa%40studioplateau.sn?secret=JBSWY3DP&issuer=IziWellPass',
    );
  });

  it('encodes + and spaces in the account', () => {
    expect(buildOtpauthUri('awa+gym@x.sn', 'ABC', 'Izi Well')).toBe(
      'otpauth://totp/Izi%20Well:awa%2Bgym%40x.sn?secret=ABC&issuer=Izi%20Well',
    );
  });

  it('defaults the issuer to IziWellPass', () => {
    expect(TOTP_ISSUER).toBe('IziWellPass');
  });
});

describe('formatSecret', () => {
  it('groups the secret by four', () => {
    expect(formatSecret('JBSWY3DPEHPK3PXPQMFRG3PZ2ZKQ')).toBe('JBSW Y3DP EHPK 3PXP QMFR G3PZ 2ZKQ');
  });

  it('drops existing whitespace and keeps a short last group', () => {
    expect(formatSecret(' ab cd ef ')).toBe('abcd ef');
  });

  it('returns an empty string for an empty secret', () => {
    expect(formatSecret('')).toBe('');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @iziwellpass/auth exec vitest run src/totp.test.ts`
Expected: FAIL, cannot resolve `./totp`.

- [ ] **Step 3: Implement `totp.ts` and export it**

`packages/auth/src/totp.ts`:

```ts
// Pure helpers for TOTP enrolment: the otpauth:// URI authenticator apps scan,
// and the grouped secret shown for manual entry.

/** What `AuthClient.startTotpSetup()` hands the enrolment screen. */
export interface TotpSetup {
  /** Base32 secret from Cognito's AssociateSoftwareToken. */
  secret: string;
  /** `otpauth://totp/...` URI rendered as the QR code. */
  otpauthUri: string;
}

/** Issuer shown in the user's authenticator app. */
export const TOTP_ISSUER = 'IziWellPass';

/** Key URI format: https://github.com/google/google-authenticator/wiki/Key-Uri-Format */
export function buildOtpauthUri(account: string, secret: string, issuer = TOTP_ISSUER): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
}

/** « JBSW Y3DP EHPK … »: groups of four for reading aloud or typing by hand. */
export function formatSecret(secret: string): string {
  return (secret.replace(/\s+/g, '').match(/.{1,4}/g) ?? []).join(' ');
}
```

In `packages/auth/package.json` `exports`, add after `"./errors": "./src/errors.ts",`:

```json
    "./totp": "./src/totp.ts",
```

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm --filter @iziwellpass/auth exec vitest run src/totp.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Write the failing error-code tests**

Append inside the `describe('authErrorCode', …)` block of `packages/auth/src/errors.test.ts` (the file already has the `cognito(name, message)` helper), and extend the import line to `import { authErrorCode, notSignedInError, NOT_SIGNED_IN } from './errors';`:

```ts
  it('maps an expired MFA session to sessionExpired', () => {
    expect(
      authErrorCode(
        cognito('NotAuthorizedException', 'Invalid session for the user, session is expired.'),
      ),
    ).toBe('sessionExpired');
    expect(authErrorCode(cognito('NotAuthorizedException', 'Invalid session for the user.'))).toBe(
      'sessionExpired',
    );
  });

  it('keeps the lockout check ahead of the session check', () => {
    expect(
      authErrorCode(cognito('NotAuthorizedException', 'Password attempts exceeded')),
    ).toBe('tooManyAttempts');
  });

  it('maps a missing signed-in user to sessionExpired', () => {
    expect(notSignedInError().name).toBe(NOT_SIGNED_IN);
    expect(authErrorCode(notSignedInError())).toBe('sessionExpired');
  });

  it('maps a wrong first code at enrolment to codeMismatch', () => {
    expect(
      authErrorCode(cognito('EnableSoftwareTokenMFAException', 'Code mismatch and fail enable')),
    ).toBe('codeMismatch');
  });
```

- [ ] **Step 6: Run it to verify it fails**

Run: `pnpm --filter @iziwellpass/auth exec vitest run src/errors.test.ts`
Expected: FAIL, `notSignedInError` is not exported.

- [ ] **Step 7: Implement the error codes**

In `packages/auth/src/errors.ts`:

Add `| 'sessionExpired'` to the `AuthErrorCode` union right after `| 'codeExpired'`.

Add below the `AuthErrorCode` type:

```ts
/** `.name` of the error the client rejects with when no user is signed in. */
export const NOT_SIGNED_IN = 'NotSignedInError';

/** Rejection for enrolment calls made without a valid session. */
export function notSignedInError(): Error {
  const err = new Error('No signed-in user');
  err.name = NOT_SIGNED_IN;
  return err;
}
```

Replace the `NotAuthorizedException` case and the `CodeMismatchException` case with:

```ts
    case 'NotAuthorizedException':
      // Cognito reuses this for wrong password, lockout, and an expired
      // MFA/challenge session; the English message is the only discriminator.
      if (/attempts exceeded/i.test(message)) return 'tooManyAttempts';
      if (/session is expired|invalid session/i.test(message)) return 'sessionExpired';
      return 'invalidCredentials';
    case NOT_SIGNED_IN:
      return 'sessionExpired';
```

```ts
    case 'CodeMismatchException':
    // Wrong first code during TOTP enrolment (VerifySoftwareToken).
    case 'EnableSoftwareTokenMFAException':
      return 'codeMismatch';
```

- [ ] **Step 8: Run it to verify it passes**

Run: `pnpm --filter @iziwellpass/auth exec vitest run src/errors.test.ts`
Expected: PASS.

- [ ] **Step 9: Write the failing Cognito wrapper tests**

In `packages/auth/src/cognito.test.ts`, add `const sendMFACode = vi.fn();` next to the other module-level mocks, and add `sendMFACode = sendMFACode;` inside the mocked `class CognitoUser`. Then append:

```ts
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
```

- [ ] **Step 10: Run it to verify it fails**

Run: `pnpm --filter @iziwellpass/auth exec vitest run src/cognito.test.ts`
Expected: FAIL (`totp-required` never returned, `startTotpSetup` is not a function).

- [ ] **Step 11: Implement the Cognito wrapper changes**

In `packages/auth/src/cognito.ts`:

Add imports after the SDK import:

```ts
import { notSignedInError } from './errors';
import { buildOtpauthUri, TOTP_ISSUER, type TotpSetup } from './totp';
```

Extend `SignInResult` with a third member:

```ts
  | {
      kind: 'totp-required';
      /** Answers the sign-in's TOTP challenge with the 6-digit code from the user's authenticator app. */
      submit: (code: string) => Promise<{ idToken: string }>;
    };
```

Add to `interface AuthClient`, after `forceRefreshSession()`:

```ts
  /**
   * Starts TOTP enrolment for the signed-in user (AssociateSoftwareToken, with
   * the user's own access token). Rejects `NotSignedInError` without a valid
   * session. Each call issues a NEW secret that replaces the previous one.
   */
  startTotpSetup(): Promise<TotpSetup>;
  /**
   * Verifies the first code from the authenticator app (VerifySoftwareToken),
   * then makes TOTP enabled and preferred (SetUserMFAPreference). The backend
   * finalize call comes after this.
   */
  confirmTotpSetup(code: string): Promise<void>;
```

Inside `createAuthClient`, after `const user = …`, add:

```ts
  // The enrolment calls need the SDK's in-memory session (signInUserSession),
  // which getSession() restores from storage and refreshes if needed.
  const signedInUser = () =>
    new Promise<{ user: CognitoUser; session: CognitoUserSession }>((resolve, reject) => {
      const current = pool.getCurrentUser();
      if (!current) {
        reject(notSignedInError());
        return;
      }
      // Same overloaded-callback shape as getIdToken below.
      current.getSession(((err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session || !session.isValid()) {
          reject(notSignedInError());
          return;
        }
        resolve({ user: current, session });
      }) as Parameters<CognitoUser['getSession']>[0]);
    });
```

In `signIn`'s `authenticateUser` callbacks, add after `newPasswordRequired`:

```ts
          totpRequired: () =>
            resolve({
              kind: 'totp-required',
              submit: (code: string) =>
                new Promise((res, rej) => {
                  cognitoUser.sendMFACode(
                    code,
                    {
                      onSuccess: (session: CognitoUserSession) =>
                        res({ idToken: session.getIdToken().getJwtToken() }),
                      onFailure: (err: unknown) => rej(err),
                    },
                    'SOFTWARE_TOKEN_MFA',
                  );
                }),
            }),
```

Add two methods to the returned object, after `forceRefreshSession()`:

```ts
    async startTotpSetup() {
      const { user: current, session } = await signedInUser();
      const payload = session.getIdToken().payload as { email?: unknown };
      const account = typeof payload.email === 'string' ? payload.email : current.getUsername();
      return new Promise<TotpSetup>((resolve, reject) => {
        current.associateSoftwareToken({
          associateSecretCode: (secret: string) =>
            resolve({ secret, otpauthUri: buildOtpauthUri(account, secret) }),
          onFailure: (err: unknown) => reject(err),
        });
      });
    },

    async confirmTotpSetup(code) {
      const { user: current } = await signedInUser();
      await new Promise<void>((resolve, reject) => {
        current.verifySoftwareToken(code, TOTP_ISSUER, {
          onSuccess: () => resolve(),
          onFailure: (err: Error) => reject(err),
        });
      });
      await new Promise<void>((resolve, reject) => {
        current.setUserMfaPreference(null, { PreferredMfa: true, Enabled: true }, (err) =>
          err ? reject(err) : resolve(),
        );
      });
    },
```

- [ ] **Step 12: Run it to verify it passes**

Run: `pnpm --filter @iziwellpass/auth exec vitest run src/cognito.test.ts`
Expected: PASS (existing and new tests).

- [ ] **Step 13: Write the failing mock tests**

Append to `packages/auth/src/mock.test.ts` (extend the import to `import { createMockAuthClient, mintMockIdToken, MOCK_TOTP_CODE, MOCK_TOTP_EXPIRED_CODE, MOCK_TOTP_SECRET } from './mock';`):

```ts
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

  it('rejects enrolment with NotSignedInError when signed out', async () => {
    const client = createMockAuthClient();
    await expect(client.startTotpSetup()).rejects.toMatchObject({ name: 'NotSignedInError' });
    await expect(client.confirmTotpSetup(MOCK_TOTP_CODE)).rejects.toMatchObject({
      name: 'NotSignedInError',
    });
  });
});
```

- [ ] **Step 14: Run it to verify it fails**

Run: `pnpm --filter @iziwellpass/auth exec vitest run src/mock.test.ts`
Expected: FAIL (`MOCK_TOTP_CODE` not exported).

- [ ] **Step 15: Implement the mock**

In `packages/auth/src/mock.ts`:

Update the header comment's scenario list to add, after the `'invite'` line:

```ts
//   - 'totp'   → the TOTP code step, then signs in as 'owner'; code 123456
//                passes, 000000 answers like an expired MFA session, any
//                other code is CodeMismatchException
//   - an e-mail that enrolled TOTP through startTotpSetup/confirmTotpSetup
//     (remembered in localStorage) gets the code step on every sign-in
```

Replace the import line with:

```ts
import type { AuthClient, SignInResult } from './cognito';
import { notSignedInError } from './errors';
import { buildOtpauthUri } from './totp';
```

Add constants after `STORAGE_KEY`:

```ts
const MFA_STORAGE_KEY = 'iziwellpass.mock-auth.mfa';
export const MOCK_TOTP_SECRET = 'JBSWY3DPEHPK3PXPQMFRG3PZ2ZKQ';
export const MOCK_TOTP_CODE = '123456';
export const MOCK_TOTP_EXPIRED_CODE = '000000';
const MOCK_MFA_ENROLLED_AT = '2026-09-28T08:00:00Z';
```

Change `MockSession` to:

```ts
interface MockSession {
  email: string;
  role: string;
  /** Signed in through the TOTP code step: the token carries mfa_enrolled_at. */
  mfa?: boolean;
}
```

In `mintMockIdToken`, add to the payload object after `exp`:

```ts
      ...(session.mfa ? { mfa_enrolled_at: MOCK_MFA_ENROLLED_AT } : {}),
```

Inside `createMockAuthClient`, after `write`, add:

```ts
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
```

Change `start` to carry the flag:

```ts
  const start = (email: string, role: string, mfa = false): string => {
    const session: MockSession = { email, role, mfa };
    write(session);
    return mintMockIdToken(session);
  };
```

Replace the tail of `signIn` (from `const role = …` to the final `return`) with:

```ts
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
```

Add after `forceRefreshSession`:

```ts
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
          codeError('EnableSoftwareTokenMFAException', 'Code mismatch and fail enable Software Token MFA'),
        );
      }
      enrol(session.email);
      return Promise.resolve();
    },
```

- [ ] **Step 16: Run the auth package tests**

Run: `pnpm --filter @iziwellpass/auth test && pnpm --filter @iziwellpass/auth typecheck && pnpm --filter @iziwellpass/auth lint`
Expected: PASS.

- [ ] **Step 17: Make the owner app compile (temporary branch, replaced in Task 5)**

In `apps/owner/app/providers.tsx` `noopAuthClient()`, add after `forceRefreshSession`:

```ts
    startTotpSetup: () => Promise.reject(new Error('Auth client not configured')),
    confirmTotpSetup: () => Promise.reject(new Error('Auth client not configured')),
```

In `apps/owner/app/(auth)/login/page.tsx` `CredentialsCard.onSubmit`, replace `onChallenge({ complete: result.complete });` with:

```ts
      if (result.kind === 'new-password-required') {
        onChallenge({ complete: result.complete });
        return;
      }
      // The TOTP code step arrives in the next task; until then say so.
      form.setError('root', { message: t('login.error') });
```

In `apps/owner/messages/fr.json`, inside `auth.errors`, after the `"codeExpired"` line insert:

```json
      "sessionExpired": "Votre session a expiré. Reconnectez-vous.",
```

In `apps/owner/messages/en.json`, same place:

```json
      "sessionExpired": "Your session expired. Sign in again.",
```

(Match each file's existing indentation.)

- [ ] **Step 18: Make the admin app compile (P8)**

In `apps/admin/app/providers.tsx` `noopAuthClient()`, add the same two lines as Step 17.

In `apps/admin/app/(auth)/login/page.tsx` `CredentialsCard.onSubmit`, replace `onChallenge({ complete: result.complete });` with:

```ts
      if (result.kind === 'new-password-required') {
        onChallenge({ complete: result.complete });
        return;
      }
      form.setError('root', { message: t('login.totpUnsupported') });
```

In `apps/admin/messages/fr.json`, inside `auth.login` after `"error"` (add a comma to the preceding line):

```json
      "totpUnsupported": "La double authentification n'est pas encore prise en charge ici."
```

In `apps/admin/messages/en.json`, same place:

```json
      "totpUnsupported": "Two-factor sign-in isn't supported here yet."
```

If `apps/admin/messages/*.json` has an `auth.errors` block, add `sessionExpired` there with the Step 17 strings (admin's `useAuthError` translates every code under `auth.errors`).

- [ ] **Step 19: Make the member app compile (P8)**

Create `apps/member/lib/auth/member-mock.ts`:

```ts
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
```

Create `apps/member/lib/auth/member-mock.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { createMemberMockClient } from './member-mock';

describe('createMemberMockClient', () => {
  it('signs a member in', async () => {
    const result = await createMemberMockClient().signIn('awa@x.sn', 'anything');
    expect(result.kind).toBe('success');
  });

  it('refuses a TOTP challenge like bad credentials', async () => {
    await expect(createMemberMockClient().signIn('awa@x.sn', 'totp')).rejects.toMatchObject({
      name: 'NotAuthorizedException',
    });
  });
});
```

In `apps/member/lib/auth/context.tsx`, replace `import { createMockAuthClient } from '@iziwellpass/auth/mock';` with `import { createMemberMockClient } from './member-mock';` and `createMockAuthClient()` with `createMemberMockClient()`.

- [ ] **Step 20: Run every affected gate**

Run (from `web/`): `pnpm --filter @iziwellpass/owner typecheck && pnpm --filter @iziwellpass/admin typecheck && pnpm --filter @iziwellpass/member typecheck && pnpm --filter @iziwellpass/member test && pnpm typecheck && pnpm lint && pnpm test`
Expected: PASS.

- [ ] **Step 21: Commit**

```bash
git add packages/auth apps/owner/app/providers.tsx "apps/owner/app/(auth)/login/page.tsx" apps/owner/messages apps/admin apps/member/lib/auth
git commit -m "feat(auth): TOTP sign-in challenge, enrolment calls and mock scenarios

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `packages/api` control-plane MFA prefix and `onMfaRequired`

**Files:**
- Modify: `packages/api/src/client.ts`, `packages/api/src/client.test.ts`

**Interfaces:**
- Produces: `CONTROL_PLANE_PREFIXES` includes `'/platform/v1/mfa/'`; `configureApi({ onMfaRequired?: MfaRequiredHandler })` where `type MfaRequiredHandler = () => void`; `const MFA_ENROLLMENT_REQUIRED = 'MFA_ENROLLMENT_REQUIRED'` exported.

- [ ] **Step 1: Write the failing tests**

Append to `packages/api/src/client.test.ts`:

```ts
describe('MFA routing and gate', () => {
  beforeEach(() => {
    configureApi({
      baseUrl: 'https://api.test/v1',
      controlPlaneBaseUrl: 'https://control.test',
      getToken: () => Promise.resolve('tok'),
      onUnauthorized: undefined,
      onMfaRequired: undefined,
    });
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const error403 = (code: string) =>
    jsonResponse(403, { error: { code, message: 'nope' }, request_id: 'r' });

  it('routes /platform/v1/mfa/finalize to the control plane', () => {
    expect(CONTROL_PLANE_PREFIXES).toContain('/platform/v1/mfa/');
    expect(
      resolveBaseUrl('/platform/v1/mfa/finalize', {
        baseUrl: 'https://api.test',
        controlPlaneBaseUrl: 'https://control.test',
      }),
    ).toBe('https://control.test');
  });

  it('calls onMfaRequired once on 403 MFA_ENROLLMENT_REQUIRED and still throws', async () => {
    const onMfaRequired = vi.fn();
    configureApi({ onMfaRequired });
    vi.mocked(fetch).mockResolvedValue(error403('MFA_ENROLLMENT_REQUIRED'));
    await expect(customFetch('/gms/v1/venues', { method: 'GET' })).rejects.toMatchObject({
      status: 403,
      code: 'MFA_ENROLLMENT_REQUIRED',
    });
    expect(onMfaRequired).toHaveBeenCalledTimes(1);
  });

  it.each(['FEATURE_NOT_AVAILABLE', 'FORBIDDEN'])('ignores a 403 %s', async (code) => {
    const onMfaRequired = vi.fn();
    configureApi({ onMfaRequired });
    vi.mocked(fetch).mockResolvedValue(error403(code));
    await expect(customFetch('/gms/v1/venues', { method: 'GET' })).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(onMfaRequired).not.toHaveBeenCalled();
  });

  it('ignores a 401 carrying the MFA code', async () => {
    const onMfaRequired = vi.fn();
    configureApi({ onMfaRequired });
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(401, { error: { code: 'MFA_ENROLLMENT_REQUIRED', message: 'x' } }),
    );
    await expect(customFetch('/gms/v1/venues', { method: 'GET' })).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(onMfaRequired).not.toHaveBeenCalled();
  });

  it('throws normally when no onMfaRequired is configured', async () => {
    vi.mocked(fetch).mockResolvedValue(error403('MFA_ENROLLMENT_REQUIRED'));
    await expect(customFetch('/gms/v1/venues', { method: 'GET' })).rejects.toMatchObject({
      code: 'MFA_ENROLLMENT_REQUIRED',
    });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @iziwellpass/api exec vitest run src/client.test.ts`
Expected: FAIL (prefix missing, `onMfaRequired` not called).

- [ ] **Step 3: Implement**

In `packages/api/src/client.ts`:

After the `UnauthorizedHandler` type, add:

```ts
/**
 * Called when the backend refuses an owner/admin whose token lacks the MFA
 * enrolment claim (403 `MFA_ENROLLMENT_REQUIRED`). Apps route the user to
 * their enrolment screen; the ApiError is still thrown to the caller.
 */
export type MfaRequiredHandler = () => void;

/** Error code of the backend's owner/admin MFA gate (`require_staff`). */
export const MFA_ENROLLMENT_REQUIRED = 'MFA_ENROLLMENT_REQUIRED';
```

Add to `interface ApiConfig`, after `onUnauthorized?`:

```ts
  onMfaRequired?: MfaRequiredHandler;
```

In `CONTROL_PLANE_PREFIXES`, add `'/platform/v1/mfa/',` after `'/platform/v1/onboarding/',`.

In `customFetch`, replace:

```ts
  if (!response.ok) {
    throw await parseErrorResponse(response);
  }
```

with:

```ts
  if (!response.ok) {
    const error = await parseErrorResponse(response);
    if (error.status === 403 && error.code === MFA_ENROLLMENT_REQUIRED) {
      config.onMfaRequired?.();
    }
    throw error;
  }
```

- [ ] **Step 4: Run it to verify it passes**

Run: `pnpm --filter @iziwellpass/api test && pnpm --filter @iziwellpass/api typecheck && pnpm --filter @iziwellpass/api lint`
Expected: PASS (the freshness check included in `test` still passes; no generated file changed).

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/client.ts packages/api/src/client.test.ts
git commit -m "feat(api): route /platform/v1/mfa to the control plane, onMfaRequired hook

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Owner pure helpers (next path, initials, guards, code, redirect, enrolment, QR)

**Files:**
- Create: `apps/owner/lib/next-path.ts`, `apps/owner/lib/next-path.test.ts`, `apps/owner/lib/initials.ts`, `apps/owner/lib/initials.test.ts`, `apps/owner/lib/async-guards.ts`, `apps/owner/lib/async-guards.test.ts`, `apps/owner/lib/totp-code.ts`, `apps/owner/lib/totp-code.test.ts`, `apps/owner/lib/mfa-redirect.ts`, `apps/owner/lib/mfa-redirect.test.ts`, `apps/owner/lib/mfa-enrolment.ts`, `apps/owner/lib/mfa-enrolment.test.ts`, `apps/owner/lib/qr-modules.ts`, `apps/owner/lib/qr-modules.test.ts`
- Modify: `apps/owner/app/(auth)/login/page.tsx` (import `sanitizeNext`), `apps/owner/app/(app)/layout.tsx` (import `initials`), `apps/owner/package.json`, `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `TotpSetup` from `@iziwellpass/auth/totp`; `authErrorCode` from `@iziwellpass/auth/errors` (Task 1).
- Produces:
  - `sanitizeNext(next: string | null): string`, `isMfaPath(pathname: string): boolean`
  - `initials(nameOrEmail: string): string`
  - `singleFlight<A extends unknown[], R>(fn: (...args: A) => Promise<R>): (...args: A) => Promise<R>`, `onceAsync<R>(fn: () => Promise<R>): () => Promise<R>`
  - `CODE_LENGTH = 6`, `normalizeCode(raw: string): string`, `type TotpErrorOutcome = 'invalid' | 'expired' | 'other'`, `totpErrorOutcome(err: unknown): TotpErrorOutcome`
  - `createMfaRedirect(deps: { getLocation: () => { pathname: string; search: string }; assign: (url: string) => void }): () => void`
  - `type EnrolmentStep`, `interface EnrolmentState { step; setup: TotpSetup | null; codeError: 'invalid' | 'other' | null; attempt: number }`, `INITIAL_ENROLMENT`, `type EnrolmentEvent`, `enrolmentReducer(state, event)`, `interface EnrolmentDeps { confirmTotpSetup(code: string): Promise<void>; finalize(): Promise<unknown>; signOut(): void }`, `type EnrolmentOutcome`, `verifyAndFinalize(deps, code): Promise<EnrolmentOutcome>`, `finalizeAndSignOut(deps): Promise<EnrolmentOutcome>`
  - `qrModules(text: string): { size: number; path: string }`

- [ ] **Step 1: Add the QR dependency**

Run (from `web/`): `pnpm --filter @iziwellpass/owner add qrcode@^1.5.4 && pnpm --filter @iziwellpass/owner add -D @types/qrcode@^1.5.5`
Then: `(cd apps/owner && pnpm exec tsc --noEmit) && (cd apps/admin && pnpm exec tsc --noEmit) && (cd packages/ui && pnpm exec tsc --noEmit)`
Expected: all three pass.

- [ ] **Step 2: Write the failing tests**

`apps/owner/lib/next-path.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { isMfaPath, sanitizeNext } from './next-path';

describe('sanitizeNext', () => {
  it('keeps same-origin paths with their query', () => {
    expect(sanitizeNext('/members?q=awa')).toBe('/members?q=awa');
  });

  it.each([null, '', 'https://evil.test', '//evil.test/x', 'members'])(
    'falls back to / for %s',
    (value) => {
      expect(sanitizeNext(value)).toBe('/');
    },
  );

  it.each(['/mfa', '/mfa?next=%2Fmembers', '/mfa/x', '/mfa#top'])(
    'never sends a login back to the enrolment page (%s)',
    (value) => {
      expect(sanitizeNext(value)).toBe('/');
    },
  );

  it('keeps a path that only starts with the letters mfa', () => {
    expect(sanitizeNext('/mfaq')).toBe('/mfaq');
  });
});

describe('isMfaPath', () => {
  it('matches /mfa and its sub-paths only', () => {
    expect(isMfaPath('/mfa')).toBe(true);
    expect(isMfaPath('/mfa/')).toBe(true);
    expect(isMfaPath('/mfaq')).toBe(false);
    expect(isMfaPath('/members')).toBe(false);
  });
});
```

`apps/owner/lib/initials.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { initials } from './initials';

describe('initials', () => {
  it('takes two letters from a dotted e-mail local part', () => {
    expect(initials('moussa.diop@studioplateau.sn')).toBe('MD');
  });

  it('takes one letter from a single-word local part', () => {
    expect(initials('moussa@studioplateau.sn')).toBe('M');
  });

  it('splits names on spaces', () => {
    expect(initials('Awa Ndiaye')).toBe('AN');
  });

  it('returns ? for an empty value', () => {
    expect(initials('')).toBe('?');
  });
});
```

`apps/owner/lib/async-guards.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

import { onceAsync, singleFlight } from './async-guards';

const deferred = <T>() => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('singleFlight', () => {
  it('shares one call while it is in flight', async () => {
    const d = deferred<string>();
    const fn = vi.fn(() => d.promise);
    const run = singleFlight(fn);
    const a = run('123456');
    const b = run('123456');
    d.resolve('ok');
    await expect(a).resolves.toBe('ok');
    await expect(b).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('allows a new call once the previous one settled, even after a failure', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce('ok');
    const run = singleFlight(fn);
    await expect(run()).rejects.toThrow('x');
    await expect(run()).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('onceAsync', () => {
  it('returns the same promise to every caller after success', async () => {
    const fn = vi.fn().mockResolvedValue({ secret: 'S' });
    const load = onceAsync(fn);
    const a = load();
    const b = load();
    expect(a).toBe(b);
    await a;
    await load();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('forgets a rejection so the next call retries', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce('ok');
    const load = onceAsync(fn);
    await expect(load()).rejects.toThrow('down');
    await expect(load()).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
```

`apps/owner/lib/totp-code.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { CODE_LENGTH, normalizeCode, totpErrorOutcome } from './totp-code';

const named = (name: string, message = '') => Object.assign(new Error(message), { name });

describe('normalizeCode', () => {
  it.each([
    ['123456', '123456'],
    ['123 456', '123456'],
    ['123-456', '123456'],
    [' 12 34 56\n', '123456'],
    ['1234567', '123456'],
    ['abc', ''],
  ])('%j -> %j', (raw, expected) => {
    expect(normalizeCode(raw)).toBe(expected);
  });

  it('caps at six digits', () => {
    expect(CODE_LENGTH).toBe(6);
  });
});

describe('totpErrorOutcome', () => {
  it('treats a wrong or reused code as invalid', () => {
    expect(totpErrorOutcome(named('CodeMismatchException'))).toBe('invalid');
    expect(totpErrorOutcome(named('EnableSoftwareTokenMFAException'))).toBe('invalid');
    expect(totpErrorOutcome(named('ExpiredCodeException'))).toBe('invalid');
  });

  it('treats a dead challenge session or a signed-out user as expired', () => {
    expect(
      totpErrorOutcome(
        named('NotAuthorizedException', 'Invalid session for the user, session is expired.'),
      ),
    ).toBe('expired');
    expect(totpErrorOutcome(named('NotSignedInError'))).toBe('expired');
  });

  it('treats throttling, network and unknown errors as other', () => {
    expect(totpErrorOutcome(named('TooManyRequestsException'))).toBe('other');
    expect(totpErrorOutcome(new TypeError('Failed to fetch'))).toBe('other');
    expect(totpErrorOutcome('weird')).toBe('other');
  });
});
```

`apps/owner/lib/mfa-redirect.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

import { createMfaRedirect } from './mfa-redirect';

const at = (pathname: string, search = '') => () => ({ pathname, search });

describe('createMfaRedirect', () => {
  it('sends the user to /mfa with the current path and query as next', () => {
    const assign = vi.fn();
    createMfaRedirect({ getLocation: at('/members', '?q=awa'), assign })();
    expect(assign).toHaveBeenCalledWith('/mfa?next=%2Fmembers%3Fq%3Dawa');
  });

  it('redirects once for a burst of refusals', () => {
    const assign = vi.fn();
    const redirect = createMfaRedirect({ getLocation: at('/'), assign });
    for (let i = 0; i < 6; i += 1) redirect();
    expect(assign).toHaveBeenCalledTimes(1);
  });

  it('does nothing while already on the enrolment page', () => {
    const assign = vi.fn();
    const redirect = createMfaRedirect({ getLocation: at('/mfa', '?next=%2F'), assign });
    redirect();
    expect(assign).not.toHaveBeenCalled();
  });
});
```

`apps/owner/lib/mfa-enrolment.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

import {
  enrolmentReducer,
  finalizeAndSignOut,
  INITIAL_ENROLMENT,
  verifyAndFinalize,
  type EnrolmentDeps,
  type EnrolmentEvent,
  type EnrolmentState,
} from './mfa-enrolment';

const setup = { secret: 'S', otpauthUri: 'otpauth://totp/x' };
const run = (events: EnrolmentEvent[], from: EnrolmentState = INITIAL_ENROLMENT) =>
  events.reduce(enrolmentReducer, from);
const named = (name: string, message = '') => Object.assign(new Error(message), { name });

describe('enrolmentReducer', () => {
  it('walks the happy path', () => {
    const s = run([
      { type: 'setupLoaded', setup },
      { type: 'continue' },
      { type: 'submit' },
      { type: 'done' },
    ]);
    expect(s.step).toBe('done');
    expect(s.setup).toBe(setup);
  });

  it('goes back to the QR with the same secret', () => {
    const s = run([{ type: 'setupLoaded', setup }, { type: 'continue' }, { type: 'back' }]);
    expect(s.step).toBe('setup');
    expect(s.setup).toBe(setup);
  });

  it('returns to verify with the reason and a fresh attempt on a rejected code', () => {
    const s = run([
      { type: 'setupLoaded', setup },
      { type: 'continue' },
      { type: 'submit' },
      { type: 'codeRejected', reason: 'invalid' },
    ]);
    expect(s).toMatchObject({ step: 'verify', codeError: 'invalid', attempt: 1 });
  });

  it('clears the code error on the next submit', () => {
    const s = run([
      { type: 'setupLoaded', setup },
      { type: 'continue' },
      { type: 'submit' },
      { type: 'codeRejected', reason: 'invalid' },
      { type: 'submit' },
    ]);
    expect(s).toMatchObject({ step: 'finalizing', codeError: null });
  });

  it('retries finalize from its own error state', () => {
    const s = run([
      { type: 'setupLoaded', setup },
      { type: 'continue' },
      { type: 'submit' },
      { type: 'finalizeFailed' },
    ]);
    expect(s.step).toBe('finalizeError');
    expect(enrolmentReducer(s, { type: 'retryFinalize' }).step).toBe('finalizing');
  });

  it('retries a failed setup', () => {
    const s = run([{ type: 'setupFailed' }]);
    expect(s.step).toBe('setupError');
    expect(run([{ type: 'retrySetup' }], s).step).toBe('loading');
  });

  it('ignores events that do not apply to the current step', () => {
    const s = run([{ type: 'setupLoaded', setup }]);
    expect(run([{ type: 'done' }, { type: 'retryFinalize' }, { type: 'back' }], s)).toEqual(s);
  });
});

const deps = (overrides: Partial<EnrolmentDeps> = {}): EnrolmentDeps => ({
  confirmTotpSetup: vi.fn().mockResolvedValue(undefined),
  finalize: vi.fn().mockResolvedValue(undefined),
  signOut: vi.fn(),
  ...overrides,
});

describe('verifyAndFinalize', () => {
  it('confirms, finalizes, then signs out', async () => {
    const d = deps();
    await expect(verifyAndFinalize(d, '123456')).resolves.toEqual({ ok: true });
    expect(d.confirmTotpSetup).toHaveBeenCalledWith('123456');
    const order = [
      vi.mocked(d.confirmTotpSetup).mock.invocationCallOrder[0]!,
      vi.mocked(d.finalize).mock.invocationCallOrder[0]!,
      vi.mocked(d.signOut).mock.invocationCallOrder[0]!,
    ];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('stops at the code on a mismatch, without finalizing', async () => {
    const d = deps({
      confirmTotpSetup: vi.fn().mockRejectedValue(named('EnableSoftwareTokenMFAException')),
    });
    await expect(verifyAndFinalize(d, '999999')).resolves.toEqual({
      ok: false,
      stage: 'code',
      reason: 'invalid',
    });
    expect(d.finalize).not.toHaveBeenCalled();
    expect(d.signOut).not.toHaveBeenCalled();
  });

  it('reports an expired session at the code stage', async () => {
    const d = deps({ confirmTotpSetup: vi.fn().mockRejectedValue(named('NotSignedInError')) });
    await expect(verifyAndFinalize(d, '123456')).resolves.toEqual({
      ok: false,
      stage: 'code',
      reason: 'expired',
    });
  });

  it('reports a finalize failure without signing out', async () => {
    const d = deps({ finalize: vi.fn().mockRejectedValue(new Error('500')) });
    await expect(verifyAndFinalize(d, '123456')).resolves.toEqual({
      ok: false,
      stage: 'finalize',
    });
    expect(d.signOut).not.toHaveBeenCalled();
  });
});

describe('finalizeAndSignOut', () => {
  it('retries finalize alone', async () => {
    const d = deps();
    await expect(finalizeAndSignOut(d)).resolves.toEqual({ ok: true });
    expect(d.confirmTotpSetup).not.toHaveBeenCalled();
    expect(d.finalize).toHaveBeenCalledTimes(1);
    expect(d.signOut).toHaveBeenCalledTimes(1);
  });
});
```

`apps/owner/lib/qr-modules.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { qrModules } from './qr-modules';

const uri =
  'otpauth://totp/IziWellPass:moussa%40studioplateau.sn?secret=JBSWY3DPEHPK3PXPQMFRG3PZ2ZKQ&issuer=IziWellPass';

describe('qrModules', () => {
  it('returns a square module grid as one SVG path of unit squares', () => {
    const { size, path } = qrModules(uri);
    expect(size).toBeGreaterThanOrEqual(21);
    expect((size - 17) % 4).toBe(0);
    expect(path).toMatch(/^(M\d+ \d+h1v1h-1z)+$/);
  });

  it('starts with the top-left finder pattern corner', () => {
    expect(qrModules(uri).path.startsWith('M0 0h1v1h-1z')).toBe(true);
  });

  it('is deterministic', () => {
    expect(qrModules(uri)).toEqual(qrModules(uri));
  });

  it('fits a 52-character Cognito secret', () => {
    const long = uri.replace('JBSWY3DPEHPK3PXPQMFRG3PZ2ZKQ', 'A'.repeat(52));
    expect(qrModules(long).size).toBeLessThanOrEqual(49);
  });
});
```

- [ ] **Step 3: Run them to verify they fail**

Run: `pnpm --filter @iziwellpass/owner test`
Expected: FAIL (the seven modules do not exist).

- [ ] **Step 4: Implement the helpers**

`apps/owner/lib/next-path.ts`:

```ts
/** True for the TOTP enrolment page and anything under it. */
export function isMfaPath(pathname: string): boolean {
  return pathname === '/mfa' || pathname.startsWith('/mfa/');
}

/**
 * Only allow same-origin, non-protocol-relative paths as a post-login (or
 * post-enrolment) redirect target. The enrolment page is never a target: a
 * user who still needs it is sent back by the backend's 403 (see
 * mfa-redirect.ts), and landing there after enrolling would start a second
 * AssociateSoftwareToken on an already-enrolled account.
 */
export function sanitizeNext(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/';
  }
  const pathname = next.split(/[?#]/)[0] ?? next;
  return isMfaPath(pathname) ? '/' : next;
}
```

`apps/owner/lib/initials.ts` (moved verbatim from `app/(app)/layout.tsx`):

```ts
/** Up to two initials from a name or an e-mail local part (« MD », « A »). */
export function initials(nameOrEmail: string): string {
  const local = nameOrEmail.split('@')[0] ?? '';
  const parts = local.split(/[\s._+-]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const second = parts[1]?.[0] ?? '';
  return (first + second).toUpperCase() || '?';
}
```

`apps/owner/lib/async-guards.ts`:

```ts
/**
 * While a call is in flight, every further call gets that same promise
 * instead of starting another one. A code auto-submitted on its sixth digit
 * and then submitted again by Enter must reach Cognito once: a second
 * sendMFACode on the same challenge fails with « Invalid session ».
 */
export function singleFlight<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  let inflight: Promise<R> | null = null;
  return (...args: A) => {
    if (!inflight) {
      inflight = fn(...args).finally(() => {
        inflight = null;
      });
    }
    return inflight;
  };
}

/**
 * Runs `fn` once and hands every caller the same promise. A rejection is
 * forgotten so the next call retries. Used for AssociateSoftwareToken: each
 * call issues a new secret, so React StrictMode's double effect must not
 * call it twice.
 */
export function onceAsync<R>(fn: () => Promise<R>): () => Promise<R> {
  let memo: Promise<R> | null = null;
  return () => {
    if (!memo) {
      memo = fn();
      memo.catch(() => {
        memo = null;
      });
    }
    return memo;
  };
}
```

`apps/owner/lib/totp-code.ts`:

```ts
import { authErrorCode } from '@iziwellpass/auth/errors';

/** Authenticator apps show six digits. */
export const CODE_LENGTH = 6;

/** Digits only, at most six: « 123 456 » or « 123-456 » from a paste become « 123456 ». */
export function normalizeCode(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, CODE_LENGTH);
}

export type TotpErrorOutcome = 'invalid' | 'expired' | 'other';

/**
 * What a failed code means for the screen: `invalid` (wrong or already-used
 * code: clear the boxes and say so), `expired` (the challenge or the session
 * is gone: sign in again), `other` (network, throttling: generic message).
 */
export function totpErrorOutcome(err: unknown): TotpErrorOutcome {
  switch (authErrorCode(err)) {
    case 'codeMismatch':
    case 'codeExpired':
      return 'invalid';
    case 'sessionExpired':
      return 'expired';
    default:
      return 'other';
  }
}
```

`apps/owner/lib/mfa-redirect.ts`:

```ts
import { isMfaPath } from './next-path';

/**
 * The owner app's `onMfaRequired` hook: the backend refused an owner/admin
 * whose token lacks the MFA claim, so send them to the enrolment page. A
 * dashboard fires several queries at once and every one gets the 403, so only
 * the first call redirects; nothing happens on the enrolment page itself.
 */
export function createMfaRedirect(deps: {
  getLocation: () => { pathname: string; search: string };
  assign: (url: string) => void;
}): () => void {
  let fired = false;
  return () => {
    const { pathname, search } = deps.getLocation();
    if (fired || isMfaPath(pathname)) return;
    fired = true;
    deps.assign(`/mfa?next=${encodeURIComponent(pathname + search)}`);
  };
}
```

`apps/owner/lib/mfa-enrolment.ts`:

```ts
import type { TotpSetup } from '@iziwellpass/auth/totp';

import { totpErrorOutcome } from './totp-code';

export type EnrolmentStep =
  | 'loading'
  | 'setupError'
  | 'setup'
  | 'verify'
  | 'finalizing'
  | 'finalizeError'
  | 'done';

export interface EnrolmentState {
  step: EnrolmentStep;
  setup: TotpSetup | null;
  /** Why the last code was refused; cleared on the next submit. */
  codeError: 'invalid' | 'other' | null;
  /** Bumped on every refused code so the code field remounts empty. */
  attempt: number;
}

export const INITIAL_ENROLMENT: EnrolmentState = {
  step: 'loading',
  setup: null,
  codeError: null,
  attempt: 0,
};

export type EnrolmentEvent =
  | { type: 'setupLoaded'; setup: TotpSetup }
  | { type: 'setupFailed' }
  | { type: 'retrySetup' }
  | { type: 'continue' }
  | { type: 'back' }
  | { type: 'submit' }
  | { type: 'codeRejected'; reason: 'invalid' | 'other' }
  | { type: 'finalizeFailed' }
  | { type: 'retryFinalize' }
  | { type: 'done' };

/** Each event applies only from the step it belongs to; anything else is ignored. */
export function enrolmentReducer(state: EnrolmentState, event: EnrolmentEvent): EnrolmentState {
  switch (event.type) {
    case 'setupLoaded':
      return state.step === 'loading' ? { ...state, step: 'setup', setup: event.setup } : state;
    case 'setupFailed':
      return state.step === 'loading' ? { ...state, step: 'setupError' } : state;
    case 'retrySetup':
      return state.step === 'setupError' ? { ...state, step: 'loading' } : state;
    case 'continue':
      return state.step === 'setup' ? { ...state, step: 'verify', codeError: null } : state;
    case 'back':
      return state.step === 'verify' ? { ...state, step: 'setup', codeError: null } : state;
    case 'submit':
      return state.step === 'verify' ? { ...state, step: 'finalizing', codeError: null } : state;
    case 'codeRejected':
      return state.step === 'finalizing'
        ? { ...state, step: 'verify', codeError: event.reason, attempt: state.attempt + 1 }
        : state;
    case 'finalizeFailed':
      return state.step === 'finalizing' ? { ...state, step: 'finalizeError' } : state;
    case 'retryFinalize':
      return state.step === 'finalizeError' ? { ...state, step: 'finalizing' } : state;
    case 'done':
      return state.step === 'finalizing' ? { ...state, step: 'done' } : state;
  }
}

export interface EnrolmentDeps {
  /** Cognito VerifySoftwareToken + SetUserMFAPreference (AuthClient.confirmTotpSetup). */
  confirmTotpSetup(code: string): Promise<void>;
  /** POST /platform/v1/mfa/finalize (revokes every session server-side). */
  finalize(): Promise<unknown>;
  /** Local sign-out: SDK storage, session cookie, query cache. */
  signOut(): void;
}

export type EnrolmentOutcome =
  | { ok: true }
  | { ok: false; stage: 'code'; reason: 'invalid' | 'expired' | 'other' }
  | { ok: false; stage: 'finalize' };

/** Finalize, then sign out locally (the server already ended every session). */
export async function finalizeAndSignOut(deps: EnrolmentDeps): Promise<EnrolmentOutcome> {
  try {
    await deps.finalize();
  } catch {
    return { ok: false, stage: 'finalize' };
  }
  deps.signOut();
  return { ok: true };
}

/**
 * The order is load-bearing: Cognito must hold an enabled, preferred TOTP
 * factor before finalize, whose AdminGetUser check refuses otherwise.
 */
export async function verifyAndFinalize(
  deps: EnrolmentDeps,
  code: string,
): Promise<EnrolmentOutcome> {
  try {
    await deps.confirmTotpSetup(code);
  } catch (err) {
    return { ok: false, stage: 'code', reason: totpErrorOutcome(err) };
  }
  return finalizeAndSignOut(deps);
}
```

`apps/owner/lib/qr-modules.ts`:

```ts
import QRCode from 'qrcode';

/**
 * The QR code for `text` as module data: its side length in modules, and one
 * SVG path of 1×1 squares for the dark modules (render in a
 * `viewBox="0 0 size size"`). No quiet zone: the surrounding frame provides it.
 */
export function qrModules(text: string): { size: number; path: string } {
  const { size, data } = QRCode.create(text, { errorCorrectionLevel: 'M' }).modules;
  let path = '';
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (data[y * size + x]) path += `M${x} ${y}h1v1h-1z`;
    }
  }
  return { size, path };
}
```

- [ ] **Step 5: Swap the two existing call sites onto the shared helpers**

In `apps/owner/app/(auth)/login/page.tsx`, delete the local `sanitizeNext` function (and its doc comment) and add `import { sanitizeNext } from '@/lib/next-path';` with the other `@/lib` imports.

In `apps/owner/app/(app)/layout.tsx`, delete the local `initials` function and add `import { initials } from '@/lib/initials';` with the other `@/lib` imports.

- [ ] **Step 6: Run the gates**

Run: `pnpm --filter @iziwellpass/owner test && pnpm --filter @iziwellpass/owner typecheck && pnpm --filter @iziwellpass/owner lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/owner/lib apps/owner/package.json pnpm-lock.yaml "apps/owner/app/(auth)/login/page.tsx" "apps/owner/app/(app)/layout.tsx"
git commit -m "feat(owner): MFA helpers (redirect guard, enrolment reducer, code, QR modules)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Mock API server enforces MFA and serves finalize

**Files:**
- Modify: `apps/owner/scripts/mock-server.mjs`

**Interfaces:**
- Consumes: mock ID tokens carry `role` and, after a mock TOTP sign-in, `mfa_enrolled_at` (Task 1). Real Cognito tokens carry the same claims.
- Produces: `MOCK_MFA=required` (403 `MFA_ENROLLMENT_REQUIRED` on `/gms/v1/*` for owner/admin tokens without `mfa_enrolled_at`); `POST /platform/v1/mfa/finalize` → `200 { data: { mfa_enrolled_at } }`; `MOCK_MFA_FINALIZE=fail` → `500`.

- [ ] **Step 1: Document the switches in the header**

In the header comment, replace the two lines

```
// Control-plane routes (/platform/v1/auth|onboarding|admin|billing) are
// out of scope — the app never calls them through this proxy target.
```

with

```
// Control-plane routes (/platform/v1/auth|onboarding|admin|billing) are out of
// scope, except `POST /platform/v1/mfa/finalize`: point
// CONTROL_PLANE_PROXY_TARGET (and NEXT_PUBLIC_CONTROL_PLANE_BASE_URL=/api/control)
// at this server to use it.
```

and append to the « Fixed demo hooks » list, after the `MOCK_PLAN` entry:

```
//   - `MOCK_MFA=required` mirrors the backend's owner/admin MFA gate: every
//     `/gms/v1/*` call whose bearer token decodes to role owner/admin without
//     an `mfa_enrolled_at` claim answers 403 MFA_ENROLLMENT_REQUIRED. With the
//     offline auth mock, the password `totp` (or any e-mail enrolled on /mfa)
//     signs in with the claim.
//   - `MOCK_MFA_FINALIZE=fail` makes `POST /platform/v1/mfa/finalize` answer
//     500 (the enrolment page's retry path).
```

- [ ] **Step 2: Add the gate, the route and the handler**

After the `capabilitiesHandler` function, add:

```js
// --- MFA (owner/admin enrolment gate, finalize) ------------------------------
const MOCK_MFA = process.env.MOCK_MFA === 'required';
const MOCK_MFA_FINALIZE_FAIL = process.env.MOCK_MFA_FINALIZE === 'fail';

/** The bearer token's claims, or null. Reads the payload only, never verifies. */
function bearerClaims(header) {
  const token = String(header ?? '').replace(/^Bearer\s+/i, '');
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function mfaGate(pathname, authorization) {
  if (!MOCK_MFA || !pathname.startsWith('/gms/v1/')) return null;
  const claims = bearerClaims(authorization);
  if (!claims || !['owner', 'admin'].includes(claims.role) || claims.mfa_enrolled_at) return null;
  return [403, errorBody('MFA_ENROLLMENT_REQUIRED', 'MFA enrollment required')];
}

function finalizeMfaHandler() {
  if (MOCK_MFA_FINALIZE_FAIL) {
    return [500, errorBody('INTERNAL', 'Mock finalize failure')];
  }
  return [200, envelope({ mfa_enrolled_at: iso(now()) })];
}
```

In the `routes` array, add as the first entry:

```js
  {
    method: 'POST',
    pattern: /^\/platform\/v1\/mfa\/finalize$/,
    handler: () => finalizeMfaHandler(),
  },
```

In the HTTP server, replace

```js
    const [status, out] = dispatch(req.method ?? 'GET', url.pathname, body, url.searchParams);
```

with

```js
    const [status, out] =
      mfaGate(url.pathname, req.headers.authorization) ??
      dispatch(req.method ?? 'GET', url.pathname, body, url.searchParams);
```

Change the `.listen` log line to:

```js
    console.log(
      `[mock] owner API mock on http://localhost:${PORT} (plan ${MOCK_PLAN}${MOCK_MFA ? ', MFA required' : ''}, state resets on restart)`,
    );
```

- [ ] **Step 3: Smoke-test the server**

Run (from `web/`, port 8091 only):

```bash
node --check apps/owner/scripts/mock-server.mjs
PORT=8091 MOCK_MFA=required node apps/owner/scripts/mock-server.mjs & MOCK_PID=$!
for i in $(seq 1 20); do curl -sf http://localhost:8091/health >/dev/null && break; sleep 0.25; done
b64() { printf '%s' "$1" | base64 | tr '+/' '-_' | tr -d '='; }
OWNER="h.$(b64 '{"role":"owner"}').s"
ENROLLED="h.$(b64 '{"role":"owner","mfa_enrolled_at":"2026-09-28T08:00:00Z"}').s"
TRAINER="h.$(b64 '{"role":"trainer"}').s"
curl -s -o /dev/null -w '%{http_code}\n' -H "authorization: Bearer $OWNER" http://localhost:8091/gms/v1/venues      # 403
curl -s -H "authorization: Bearer $OWNER" http://localhost:8091/gms/v1/venues | grep -c MFA_ENROLLMENT_REQUIRED    # 1
curl -s -o /dev/null -w '%{http_code}\n' -H "authorization: Bearer $ENROLLED" http://localhost:8091/gms/v1/venues   # 200
curl -s -o /dev/null -w '%{http_code}\n' -H "authorization: Bearer $TRAINER" http://localhost:8091/gms/v1/venues    # 200
curl -s -X POST -H "authorization: Bearer $OWNER" http://localhost:8091/platform/v1/mfa/finalize                    # {"data":{"mfa_enrolled_at":...
kill $MOCK_PID
PORT=8091 node apps/owner/scripts/mock-server.mjs & MOCK_PID=$!
for i in $(seq 1 20); do curl -sf http://localhost:8091/health >/dev/null && break; sleep 0.25; done
curl -s -o /dev/null -w '%{http_code}\n' -H "authorization: Bearer $OWNER" http://localhost:8091/gms/v1/venues      # 200 (gate off)
kill $MOCK_PID
PORT=8091 MOCK_MFA_FINALIZE=fail node apps/owner/scripts/mock-server.mjs & MOCK_PID=$!
for i in $(seq 1 20); do curl -sf http://localhost:8091/health >/dev/null && break; sleep 0.25; done
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H "authorization: Bearer $OWNER" http://localhost:8091/platform/v1/mfa/finalize  # 500
kill $MOCK_PID
```

Expected: the codes in the comments. If `/health` is not served by the mock, poll `GET /gms/v1/venues` with the trainer token instead.

- [ ] **Step 4: Commit**

```bash
git add apps/owner/scripts/mock-server.mjs
git commit -m "feat(owner): mock API MFA gate and finalize route

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Login code step (PmD8D)

**Files:**
- Create: `apps/owner/components/auth/code-input.tsx`
- Modify: `apps/owner/app/(auth)/login/page.tsx`, `apps/owner/messages/fr.json`, `apps/owner/messages/en.json`

**Interfaces:**
- Consumes: `SignInResult` `totp-required` (Task 1); `singleFlight` (Task 3); `CODE_LENGTH`, `normalizeCode`, `totpErrorOutcome` (Task 3); `initials` (Task 3); `sanitizeNext` (Task 3).
- Produces: `CodeInput` props `{ value: string; onChange(value: string): void; onComplete?(code: string): void; invalid?: boolean; disabled?: boolean; label: string; describedBy?: string; autoFocus?: boolean; inputRef?: Ref<HTMLInputElement> }` (reused by Task 6).

- [ ] **Step 1: Add the copy**

`apps/owner/messages/fr.json`: inside `auth`, after the `newPassword` block, insert:

```json
    "totp": {
      "title": "Code de vérification",
      "subtitle": "Entrez le code à 6 chiffres de votre application d'authentification.",
      "codeLabel": "Code à 6 chiffres",
      "submit": "Vérifier",
      "submitting": "Vérification…",
      "lostAccess": "Je n'ai plus accès à mon application",
      "lostAccessHelp": "Sans accès à votre application, contactez le support : la réinitialisation n'est pas en libre-service."
    },
```

and inside `auth.errors`, after `sessionExpired`:

```json
      "codeMismatchTotp": "Code invalide. Vérifiez l'heure de votre téléphone et réessayez.",
```

`apps/owner/messages/en.json`, same places:

```json
    "totp": {
      "title": "Verification code",
      "subtitle": "Enter the 6-digit code from your authenticator app.",
      "codeLabel": "6-digit code",
      "submit": "Verify",
      "submitting": "Verifying…",
      "lostAccess": "I no longer have access to my app",
      "lostAccessHelp": "Without your app, contact support: reset isn't self-service."
    },
```

```json
      "codeMismatchTotp": "Invalid code. Check your phone's clock and try again.",
```

- [ ] **Step 2: Create the code input**

`apps/owner/components/auth/code-input.tsx`:

```tsx
'use client';

import type { Ref } from 'react';

import { InputOTP, InputOTPGroup, InputOTPSlot } from '@iziwellpass/ui/components/input-otp';
import { cn } from '@iziwellpass/ui/lib/utils';

import { CODE_LENGTH, normalizeCode } from '@/lib/totp-code';

/**
 * Six code boxes (PmD8D / OKurh / PCsCv): 52×56, radius 16, hairline, ink on
 * the active box, the destructive tone when the code was refused. One real
 * input underneath, so paste, SMS/password-manager autofill and screen readers
 * see a single 6-digit field.
 */
export function CodeInput({
  value,
  onChange,
  onComplete,
  invalid = false,
  disabled = false,
  label,
  describedBy,
  autoFocus = false,
  inputRef,
}: {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (code: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  label: string;
  describedBy?: string;
  autoFocus?: boolean;
  inputRef?: Ref<HTMLInputElement>;
}) {
  return (
    <InputOTP
      ref={inputRef}
      maxLength={CODE_LENGTH}
      value={value}
      onChange={(next: string) => onChange(normalizeCode(next))}
      onComplete={onComplete}
      pasteTransformer={normalizeCode}
      inputMode="numeric"
      autoComplete="one-time-code"
      autoFocus={autoFocus}
      disabled={disabled}
      aria-label={label}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      containerClassName="justify-center"
    >
      <InputOTPGroup>
        {Array.from({ length: CODE_LENGTH }, (_, index) => (
          <InputOTPSlot
            key={index}
            index={index}
            className={cn(
              'h-14 w-[52px] rounded-2xl text-[22px] font-medium',
              invalid &&
                'border-destructive-foreground data-[active=true]:border-destructive-foreground',
            )}
          />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}
```

If `pasteTransformer` is not in the installed `input-otp` types, drop that prop: `onChange` already normalises. Record the fallback in the report.

- [ ] **Step 3: Add the TOTP card and wire the login view**

In `apps/owner/app/(auth)/login/page.tsx`:

Add imports:

```tsx
import { Avatar, AvatarFallback } from '@iziwellpass/ui/components/avatar';

import { CodeInput } from '@/components/auth/code-input';
import { singleFlight } from '@/lib/async-guards';
import { initials } from '@/lib/initials';
import { CODE_LENGTH, totpErrorOutcome } from '@/lib/totp-code';
```

Replace the `Challenge` type with:

```tsx
type Challenge =
  | { kind: 'new-password'; complete: (newPassword: string) => Promise<{ idToken: string }> }
  | { kind: 'totp'; email: string; submit: (code: string) => Promise<{ idToken: string }> };
```

Add this component after `NewPasswordCard`:

```tsx
function TotpCard({
  email,
  submit,
  onSignedIn,
  onExpired,
}: {
  email: string;
  submit: (code: string) => Promise<{ idToken: string }>;
  onSignedIn: () => Promise<void>;
  onExpired: () => void;
}) {
  const t = useTranslations('auth');
  const resolveError = useAuthError();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const verify = useMemo(
    () =>
      singleFlight(async (value: string) => {
        setPending(true);
        setError(null);
        try {
          await submit(value);
          // Stays pending through the post-login navigation.
          await onSignedIn();
        } catch (err) {
          const outcome = totpErrorOutcome(err);
          if (outcome === 'expired') {
            onExpired();
            return;
          }
          setError(
            outcome === 'invalid'
              ? t('errors.codeMismatchTotp')
              : resolveError(err, t('login.error')).message,
          );
          setCode('');
          setPending(false);
          requestAnimationFrame(() => inputRef.current?.focus());
        }
      }),
    [submit, onSignedIn, onExpired, t, resolveError],
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (code.length === CODE_LENGTH) void verify(code);
  };

  return (
    <AuthCard title={t('totp.title')} subtitle={t('totp.subtitle')}>
      <form onSubmit={onSubmit} className="grid gap-7">
        <div className="mx-auto flex max-w-full items-center gap-2.5 rounded-full bg-side py-2 pr-3.5 pl-2">
          <Avatar size="sm">
            <AvatarFallback tint="bleu">{initials(email)}</AvatarFallback>
          </Avatar>
          <span className="truncate text-md font-medium">{email}</span>
        </div>
        <div className="grid gap-2.5">
          <CodeInput
            inputRef={inputRef}
            value={code}
            onChange={(value) => {
              setCode(value);
              if (error) setError(null);
            }}
            onComplete={(value) => void verify(value)}
            invalid={Boolean(error)}
            disabled={pending}
            label={t('totp.codeLabel')}
            describedBy={error ? 'totp-error' : undefined}
            autoFocus
          />
          {error ? (
            <p id="totp-error" role="alert" className="text-center text-sm text-destructive-foreground">
              {error}
            </p>
          ) : null}
        </div>
        <Button type="submit" disabled={pending || code.length < CODE_LENGTH} className="w-full">
          {pending ? t('totp.submitting') : t('totp.submit')}
        </Button>
        <div className="grid justify-items-center gap-3 text-center">
          <button
            type="button"
            aria-expanded={showHelp}
            aria-controls="totp-help"
            onClick={() => setShowHelp((v) => !v)}
            className="text-md font-medium text-muted-foreground underline-offset-4 hover:underline"
          >
            {t('totp.lostAccess')}
          </button>
          {showHelp ? (
            <p id="totp-help" className="text-sm text-muted-foreground">
              {t('totp.lostAccessHelp')}
            </p>
          ) : null}
        </div>
      </form>
    </AuthCard>
  );
}
```

Add `type FormEvent` to the `react` import (`import { Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';`).

Change `CredentialsCard`'s props to `{ next, onboarded, initialEmail, notice, onChallenge }` with `initialEmail?: string` and `notice?: 'sessionExpired'`; use `defaultValues: { email: initialEmail ?? '', password: '' }`; render, right before the `onboarded` alert:

```tsx
          {notice === 'sessionExpired' ? (
            <Alert>
              <AlertDescription>{t('errors.sessionExpired')}</AlertDescription>
            </Alert>
          ) : null}
```

and replace the Task 1 temporary branch in `onSubmit` with:

```tsx
      if (result.kind === 'new-password-required') {
        onChallenge({ kind: 'new-password', complete: result.complete });
        return;
      }
      onChallenge({ kind: 'totp', email: values.email, submit: result.submit });
```

Replace `LoginView` with (add `useCallback` to the `react` import). The two TOTP callbacks are memoised so `TotpCard`'s `singleFlight` guard keeps one identity while the card is mounted:

```tsx
function LoginView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refresh } = useAuth();
  const next = sanitizeNext(searchParams.get('next'));
  const onboarded = searchParams.get('onboarded') === '1';
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [expired, setExpired] = useState<{ email: string } | null>(null);

  const totpEmail = challenge?.kind === 'totp' ? challenge.email : null;
  const onTotpSignedIn = useCallback(async () => {
    await refresh();
    router.replace(next);
  }, [refresh, router, next]);
  const onTotpExpired = useCallback(() => {
    if (totpEmail) setExpired({ email: totpEmail });
    setChallenge(null);
  }, [totpEmail]);

  if (challenge?.kind === 'new-password') {
    return (
      <NewPasswordCard
        onBack={() => setChallenge(null)}
        onComplete={async (newPassword) => {
          await challenge.complete(newPassword);
          await refresh();
          router.replace(next);
        }}
      />
    );
  }

  if (challenge?.kind === 'totp') {
    return (
      <TotpCard
        email={challenge.email}
        submit={challenge.submit}
        onSignedIn={onTotpSignedIn}
        onExpired={onTotpExpired}
      />
    );
  }

  return (
    <CredentialsCard
      next={next}
      onboarded={onboarded}
      initialEmail={expired?.email}
      notice={expired ? 'sessionExpired' : undefined}
      onChallenge={(c) => {
        setExpired(null);
        setChallenge(c);
      }}
    />
  );
}
```

- [ ] **Step 4: Run the gates**

Run: `pnpm --filter @iziwellpass/owner typecheck && pnpm --filter @iziwellpass/owner lint && pnpm --filter @iziwellpass/owner test`
Expected: PASS.

- [ ] **Step 5: Browser check (flow 1)**

Start the mock (`PORT=8091 MOCK_MFA=required …`) and Next on 3021 as in Global Constraints. Over CDP at 390×844 and 1440×900, French:
1. `/login`, e-mail `moussa@studioplateau.sn`, password `totp` → the code step: title, e-mail chip with « M », six boxes, « Vérifier » disabled, the link. Screenshot `/tmp/spf-task5-code.png`; compare with `docs/design-refs/comptoir-clair/mfa/PmD8D.png`.
2. Click « Je n'ai plus accès à mon application » → the support sentence appears.
3. Type `111111` → the red boxes, « Code invalide. Vérifiez l'heure de votre téléphone et réessayez. », boxes empty, focus in the field. Screenshot `/tmp/spf-task5-invalid.png`.
4. Paste `123 456` (dispatch a paste event with that text, or `Input.insertText`) → the dashboard loads with no 403 in the mock log.
5. Sign out, sign in again with password `totp`, type `000000` → back on the credentials form, e-mail kept, notice « Votre session a expiré. Reconnectez-vous. ».
6. Repeat step 1 in English (`--lang=en-US`, `acceptLanguage: 'en-US,en'`) for one screenshot.
Stop Next, the mock and Chrome.

- [ ] **Step 6: Commit**

```bash
git add apps/owner/components/auth/code-input.tsx "apps/owner/app/(auth)/login/page.tsx" apps/owner/messages
git commit -m "feat(owner): TOTP code step at sign-in

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: `/mfa` enrolment page and the 403 gate

**Files:**
- Create: `apps/owner/components/auth/totp-qr.tsx`, `apps/owner/lib/use-mfa-enrolment.ts`, `apps/owner/app/(auth)/mfa/page.tsx`
- Modify: `apps/owner/components/auth-card.tsx`, `apps/owner/app/providers.tsx`, `apps/owner/messages/fr.json`, `apps/owner/messages/en.json`

**Interfaces:**
- Consumes: `AuthClient.startTotpSetup/confirmTotpSetup` (Task 1); `formatSecret` from `@iziwellpass/auth/totp` (Task 1); `finalizeMfa` from `@iziwellpass/api/generated`; `configureApi({ onMfaRequired })` (Task 2); `enrolmentReducer`, `INITIAL_ENROLMENT`, `verifyAndFinalize`, `finalizeAndSignOut`, `onceAsync`, `singleFlight`, `totpErrorOutcome`, `createMfaRedirect`, `sanitizeNext`, `qrModules` (Task 3); `CodeInput` (Task 5).
- Produces: route `/mfa?next=<path>`; `AuthCard` prop `mediaTone?: 'bleu' | 'vert'`.

- [ ] **Step 1: Add the copy**

`apps/owner/messages/fr.json`: add a top-level `mfa` block after `auth` (mind the commas):

```json
  "mfa": {
    "setup": {
      "title": "Activer la double authentification",
      "intro": "Scannez ce code avec une application d'authentification (Google Authenticator, 1Password, Authy…).",
      "qrAlt": "Code QR à scanner avec votre application d'authentification",
      "manualLabel": "Ou saisissez la clé manuellement",
      "copy": "Copier la clé",
      "copied": "Clé copiée",
      "continue": "Continuer",
      "footnote": "Vous devrez saisir un code à 6 chiffres à chaque connexion.",
      "error": "Impossible de préparer l'activation."
    },
    "verify": {
      "title": "Vérifier le code",
      "subtitle": "Entrez le code à 6 chiffres affiché par votre application.",
      "submit": "Vérifier",
      "finalizing": "Activation…",
      "back": "Revenir au code QR",
      "error": "Vérification impossible. Réessayez."
    },
    "finalize": {
      "error": "L'activation n'a pas pu être finalisée."
    },
    "retry": "Réessayer",
    "done": {
      "title": "Double authentification activée",
      "body": "Pour votre sécurité, toutes vos sessions ont été fermées. Reconnectez-vous avec votre mot de passe et un code de votre application.",
      "cta": "Se reconnecter"
    }
  },
```

`apps/owner/messages/en.json`, same place:

```json
  "mfa": {
    "setup": {
      "title": "Turn on two-factor authentication",
      "intro": "Scan this code with an authenticator app (Google Authenticator, 1Password, Authy…).",
      "qrAlt": "QR code to scan with your authenticator app",
      "manualLabel": "Or enter the key manually",
      "copy": "Copy key",
      "copied": "Key copied",
      "continue": "Continue",
      "footnote": "You'll enter a 6-digit code each time you sign in.",
      "error": "Couldn't prepare setup."
    },
    "verify": {
      "title": "Check the code",
      "subtitle": "Enter the 6-digit code shown in your app.",
      "submit": "Verify",
      "finalizing": "Turning on…",
      "back": "Back to the QR code",
      "error": "Couldn't verify the code. Try again."
    },
    "finalize": {
      "error": "Setup couldn't be completed."
    },
    "retry": "Try again",
    "done": {
      "title": "Two-factor authentication is on",
      "body": "For your security, all your sessions were closed. Sign in again with your password and a code from your app.",
      "cta": "Sign in again"
    }
  },
```

- [ ] **Step 2: `AuthCard` medallion tone (P5)**

In `apps/owner/components/auth-card.tsx`, add the prop `mediaTone = 'bleu'` typed `mediaTone?: 'bleu' | 'vert'`, and replace the medallion's `bg-tint-bleu text-foreground` with:

```tsx
            className={cn(
              'flex size-14 items-center justify-center rounded-full [&_svg]:size-[22px]',
              mediaTone === 'vert' ? 'bg-success text-success-foreground' : 'bg-tint-bleu text-foreground',
            )}
```

with `import { cn } from '@iziwellpass/ui/lib/utils';`.

- [ ] **Step 3: The QR component (P3, P4)**

`apps/owner/components/auth/totp-qr.tsx`:

```tsx
'use client';

import { useMemo } from 'react';

import { qrModules } from '@/lib/qr-modules';

/** e2wZj: a 240px hairline box (radius 24, 20px padding) around a 200px code. */
export function TotpQr({ uri, label }: { uri: string; label: string }) {
  const { size, path } = useMemo(() => qrModules(uri), [uri]);
  return (
    <div className="mx-auto flex size-60 items-center justify-center rounded-3xl border border-border bg-card p-5">
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${size} ${size}`}
        shapeRendering="crispEdges"
        className="size-[200px] text-foreground"
      >
        <path d={path} fill="currentColor" />
      </svg>
    </div>
  );
}
```

- [ ] **Step 4: The enrolment hook**

`apps/owner/lib/use-mfa-enrolment.ts`:

```ts
'use client';

import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import { finalizeMfa } from '@iziwellpass/api/generated';
import { useAuth } from '@iziwellpass/auth/provider';

import { onceAsync, singleFlight } from './async-guards';
import {
  enrolmentReducer,
  finalizeAndSignOut,
  INITIAL_ENROLMENT,
  verifyAndFinalize,
  type EnrolmentDeps,
  type EnrolmentOutcome,
} from './mfa-enrolment';
import { totpErrorOutcome } from './totp-code';

/** Wires the pure enrolment state machine to Cognito, the backend and the router. */
export function useMfaEnrolment({ next }: { next: string }) {
  const { client, signOut } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(enrolmentReducer, INITIAL_ENROLMENT);

  const toLogin = useCallback(
    () => router.replace(`/login?next=${encodeURIComponent(next)}`),
    [router, next],
  );

  // One AssociateSoftwareToken per page: StrictMode's double effect and a
  // re-render share the same call (each call replaces the secret).
  const loadSetup = useMemo(() => onceAsync(() => client.startTotpSetup()), [client]);

  const load = useCallback(() => {
    loadSetup().then(
      (setup) => dispatch({ type: 'setupLoaded', setup }),
      (err: unknown) => {
        if (totpErrorOutcome(err) === 'expired') toLogin();
        else dispatch({ type: 'setupFailed' });
      },
    );
  }, [loadSetup, toLogin]);

  useEffect(() => {
    load();
  }, [load]);

  const deps = useMemo<EnrolmentDeps>(
    () => ({
      confirmTotpSetup: (code) => client.confirmTotpSetup(code),
      finalize: () => finalizeMfa(),
      signOut: () => {
        signOut();
        queryClient.clear();
      },
    }),
    [client, signOut, queryClient],
  );

  const apply = useCallback(
    (outcome: EnrolmentOutcome) => {
      if (outcome.ok) dispatch({ type: 'done' });
      else if (outcome.stage === 'finalize') dispatch({ type: 'finalizeFailed' });
      else if (outcome.reason === 'expired') toLogin();
      else dispatch({ type: 'codeRejected', reason: outcome.reason });
    },
    [toLogin],
  );

  const verify = useMemo(
    () =>
      singleFlight(async (code: string) => {
        dispatch({ type: 'submit' });
        apply(await verifyAndFinalize(deps, code));
      }),
    [deps, apply],
  );

  const retryFinalize = useMemo(
    () =>
      singleFlight(async () => {
        dispatch({ type: 'retryFinalize' });
        apply(await finalizeAndSignOut(deps));
      }),
    [deps, apply],
  );

  return {
    state,
    retrySetup: () => {
      dispatch({ type: 'retrySetup' });
      load();
    },
    toVerify: () => dispatch({ type: 'continue' }),
    backToSetup: () => dispatch({ type: 'back' }),
    verify,
    retryFinalize,
    signInAgain: toLogin,
  };
}
```

`signOut` from `useAuth()` is recreated whenever the session changes; finalize runs `signOut` last, so `deps` changing afterwards does not matter, but verify its identity is stable while the user types (the session does not change before finalize).

- [ ] **Step 5: The page**

`apps/owner/app/(auth)/mfa/page.tsx`:

```tsx
'use client';

import { Suspense, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeftIcon, CopyIcon, ShieldCheckIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { formatSecret } from '@iziwellpass/auth/totp';
import { Button } from '@iziwellpass/ui/components/button';

import { AuthCard } from '@/components/auth-card';
import { AuthCardSkeleton } from '@/components/auth-card-skeleton';
import { CodeInput } from '@/components/auth/code-input';
import { TotpQr } from '@/components/auth/totp-qr';
import { sanitizeNext } from '@/lib/next-path';
import { CODE_LENGTH } from '@/lib/totp-code';
import { useMfaEnrolment } from '@/lib/use-mfa-enrolment';

function SetupView({ secret, uri, onContinue }: { secret: string; uri: string; onContinue: () => void }) {
  const t = useTranslations('mfa');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      toast.success(t('setup.copied'));
    } catch {
      // Clipboard blocked: the key stays selectable by hand.
    }
  };
  return (
    <AuthCard
      title={t('setup.title')}
      subtitle={t('setup.intro')}
      footer={<p className="text-sm">{t('setup.footnote')}</p>}
    >
      <div className="grid gap-7">
        <TotpQr uri={uri} label={t('setup.qrAlt')} />
        <div className="grid gap-2">
          <p id="mfa-key-label" className="text-sm font-medium text-muted-foreground">
            {t('setup.manualLabel')}
          </p>
          <div className="flex items-start gap-2">
            <p
              aria-labelledby="mfa-key-label"
              className="flex min-h-12 min-w-0 flex-1 items-center rounded-3xl bg-side px-[18px] py-3 text-[15px] leading-6 font-medium tracking-wide break-all select-all"
            >
              {formatSecret(secret)}
            </p>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-12 shrink-0"
              aria-label={t('setup.copy')}
              onClick={() => void copy()}
            >
              <CopyIcon aria-hidden="true" />
            </Button>
          </div>
        </div>
        <Button type="button" className="w-full" onClick={onContinue}>
          {t('setup.continue')}
        </Button>
      </div>
    </AuthCard>
  );
}

function VerifyView({
  busy,
  codeError,
  onVerify,
  onBack,
}: {
  busy: boolean;
  codeError: 'invalid' | 'other' | null;
  onVerify: (code: string) => void;
  onBack: () => void;
}) {
  const t = useTranslations('mfa');
  const tAuth = useTranslations('auth');
  const [code, setCode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const message =
    codeError === 'invalid'
      ? tAuth('errors.codeMismatchTotp')
      : codeError === 'other'
        ? t('verify.error')
        : null;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (code.length === CODE_LENGTH) onVerify(code);
  };

  return (
    <AuthCard title={t('verify.title')} subtitle={t('verify.subtitle')}>
      <form onSubmit={onSubmit} className="grid gap-7">
        <div className="grid gap-2.5">
          <CodeInput
            inputRef={inputRef}
            value={code}
            onChange={setCode}
            onComplete={onVerify}
            invalid={Boolean(message) && code.length === 0}
            disabled={busy}
            label={tAuth('totp.codeLabel')}
            describedBy={message ? 'mfa-code-error' : undefined}
            autoFocus
          />
          {message ? (
            <p id="mfa-code-error" role="alert" className="text-center text-sm text-destructive-foreground">
              {message}
            </p>
          ) : null}
        </div>
        <Button type="submit" className="w-full" disabled={busy || code.length < CODE_LENGTH}>
          {busy ? t('verify.finalizing') : t('verify.submit')}
        </Button>
        {busy ? null : (
          <Button type="button" variant="ghost" className="mx-auto text-muted-foreground" onClick={onBack}>
            <ArrowLeftIcon aria-hidden="true" />
            {t('verify.back')}
          </Button>
        )}
      </form>
    </AuthCard>
  );
}

function MfaView() {
  const searchParams = useSearchParams();
  const next = sanitizeNext(searchParams.get('next'));
  const t = useTranslations('mfa');
  const { state, retrySetup, toVerify, backToSetup, verify, retryFinalize, signInAgain } =
    useMfaEnrolment({ next });

  switch (state.step) {
    case 'loading':
      return <AuthCardSkeleton />;
    case 'setupError':
      return (
        <AuthCard title={t('setup.title')}>
          <div className="grid gap-4">
            <p role="alert" className="text-center text-sm text-destructive-foreground">
              {t('setup.error')}
            </p>
            <Button type="button" variant="secondary" className="w-full" onClick={retrySetup}>
              {t('retry')}
            </Button>
          </div>
        </AuthCard>
      );
    case 'setup':
      return (
        <SetupView
          secret={state.setup!.secret}
          uri={state.setup!.otpauthUri}
          onContinue={toVerify}
        />
      );
    case 'verify':
    case 'finalizing':
      return (
        <VerifyView
          key={state.attempt}
          busy={state.step === 'finalizing'}
          codeError={state.codeError}
          onVerify={(code) => void verify(code)}
          onBack={backToSetup}
        />
      );
    case 'finalizeError':
      return (
        <AuthCard title={t('verify.title')}>
          <div className="grid gap-4">
            <p role="alert" className="text-center text-sm text-destructive-foreground">
              {t('finalize.error')}
            </p>
            <Button type="button" className="w-full" onClick={() => void retryFinalize()}>
              {t('retry')}
            </Button>
          </div>
        </AuthCard>
      );
    case 'done':
      return (
        <AuthCard
          media={<ShieldCheckIcon />}
          mediaTone="vert"
          title={t('done.title')}
          subtitle={t('done.body')}
        >
          <Button type="button" className="w-full" onClick={signInAgain}>
            {t('done.cta')}
          </Button>
        </AuthCard>
      );
  }
}

export default function MfaPage() {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <MfaView />
    </Suspense>
  );
}
```

`state.setup!` is safe: the reducer only reaches `setup` through `setupLoaded`. If lint forbids non-null assertions, read it once (`const setup = state.setup;`) and render `<AuthCardSkeleton />` when it is null.

- [ ] **Step 6: Wire the gate in the providers**

In `apps/owner/app/providers.tsx`:

Add `import { useMemo } from 'react';` to the existing React import and `import { createMfaRedirect } from '@/lib/mfa-redirect';`.

In `ApiConfigurator`, before the `useEffect`:

```tsx
  // Backend 403 MFA_ENROLLMENT_REQUIRED → the enrolment page, once per burst.
  // Goes silent on its own when the backend stops enforcing MFA.
  const onMfaRequired = useMemo(
    () =>
      createMfaRedirect({
        getLocation: () => ({ pathname: window.location.pathname, search: window.location.search }),
        assign: (url) => window.location.assign(url),
      }),
    [],
  );
```

and add `onMfaRequired,` to the `configureApi({ … })` call, and `onMfaRequired` to the effect's dependency list.

- [ ] **Step 7: Run the gates**

Run: `pnpm --filter @iziwellpass/owner typecheck && pnpm --filter @iziwellpass/owner lint && pnpm --filter @iziwellpass/owner test && pnpm typecheck && pnpm lint && pnpm test`
Then build once with no dev server running in this worktree: `pnpm --filter @iziwellpass/owner build`
Expected: PASS; the build lists `/mfa`.

- [ ] **Step 8: Browser check (flows 2 and 3)**

Mock with `MOCK_MFA=required`, Next on 3021 (Global Constraints). Clear localStorage first (the mock remembers enrolled e-mails). At 390×844 and 1440×900, French:
1. `/login`, e-mail `awa.ndiaye@studioteranga.sn`, password `owner` → the dashboard starts loading, then the browser lands on `/mfa?next=%2F…` (one navigation; the mock log shows the 403s). Screenshot the setup `/tmp/spf-task6-setup.png`; compare with `e2wZj.png` (QR 240/200 box, key in groups of four wrapping at 390px, copy button, « Continuer », footnote; no « Obligatoire… » sentence).
2. Click the copy button → toast « Clé copiée » (grant `clipboard-write` via `Browser.grantPermissions` first; if denied, note it and move on).
3. « Continuer » → verify step; screenshot vs `OKurh.png`. « Revenir au code QR » → the same key as before; « Continuer » again.
4. Type `111111` → PCsCv state (red boxes emptied, message); screenshot vs `PCsCv.png`.
5. Type `123456` → « Activation… » then the done screen; screenshot vs `S2ZUQo.png`. The mock log shows one `POST /platform/v1/mfa/finalize`.
6. « Se reconnecter » → `/login`; password `owner` for the same e-mail → the code step (the e-mail is now enrolled) → `123456` → dashboard with no 403 in the mock log.
7. Restart the mock with `MOCK_MFA=required MOCK_MFA_FINALIZE=fail`, clear localStorage, repeat 1, 3 and `123456` → « L'activation n'a pas pu être finalisée. » with « Réessayer »; restart the mock without the fail switch, click « Réessayer » → done screen, and the mock log shows a finalize call but no new setup.
8. Visit `/mfa` directly while signed out → middleware sends you to `/login?next=%2Fmfa`; sign in with password `trainer` → you land on `/` (P2), not `/mfa`.
9. One English screenshot of the setup step.
Stop Next, the mock and Chrome.

- [ ] **Step 9: Commit**

```bash
git add apps/owner/components apps/owner/lib/use-mfa-enrolment.ts "apps/owner/app/(auth)/mfa" apps/owner/app/providers.tsx apps/owner/messages
git commit -m "feat(owner): /mfa TOTP enrolment page and the MFA_ENROLLMENT_REQUIRED gate

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Spec coverage

| Spec item | Task |
| --- | --- |
| F1 canvas copy, intro without « Obligatoire » | 5, 6 |
| F2 reactive gate on the 403 | 2 (hook), 3 (`createMfaRedirect`), 6 (wiring) |
| F3 permanent code step | 1 (client), 5 (UI) |
| F4 browser SRP enrolment | 1 |
| F5 finalize then local sign-out, « Se reconnecter » | 3 (`finalizeAndSignOut`), 6 |
| F6 finalize retried alone | 3, 6 |
| F7 control-plane prefix | 2 |
| F8 out of scope (admin/member only compile) | 1 (P8) |
| F9 auto-submit, single send, clear and refocus | 3 (`singleFlight`, `normalizeCode`), 5, 6 |
| F10 one redirect per burst, none on `/mfa` | 3, 6 |
| F11 mock mirrors backend | 1 (auth mock), 4 (API mock) |
| F12 no real Cognito run | Global Constraints; manual script stays in spec §8 |
| §6 copy | 1, 5, 6 (+P7 key) |
| §8 unit tests | 1, 2, 3 (P1) |
| §8 browser checks | 5, 6 |
