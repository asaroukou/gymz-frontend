# SP-F — TOTP MFA at login, and enrolment on demand

**Date:** 2026-09-28
**Status:** approved design, ready for one plan
**Builds on:** local `main` at 88da7fb (SP-A/B/C, SP-D0, SP-E, SP-D, SP-G, SP-M merged).
**Backend contract:** iziwellpass `main` (b572a8b):
- `crates/iziwellpass-auth/src/guards.rs` `require_staff`: an `owner`/`admin` token without the `mfa_enrolled_at` claim → **403 `MFA_ENROLLMENT_REQUIRED`** (`crates/iziwellpass-common/src/error.rs`). Trainers, receptionists and members are exempt.
- `POST /platform/v1/mfa/finalize` (control plane, `lambdas/onboarding/src/main.rs` `mfa_finalize_route`): accepts any main-pool audience; checks TOTP enabled+preferred via `AdminGetUser`, runs `AdminUserGlobalSignOut`, then writes the marker. Idempotent. Generated client: `finalizeMfa()` in `@iziwellpass/api/generated`.
- `lambdas/pretoken/src/main.rs`: emits `mfa_enrolled_at` only when the marker is present and TOTP is still enabled+preferred.
- HLD `docs/superpowers/specs/2026-09-12-venue-console-owner-onboarding-design.md` D-2, D-10, D-11, D-12: enrolment is `AssociateSoftwareToken` → `VerifySoftwareToken` → `SetUserMFAPreference`, called with the user's own access token; the main pool is `mfa: OPTIONAL` + software-token TOTP.

**Canvas frames (source of truth, `screens.pen`, flow `vseHn` « 3 · Double authentification (TOTP) »):** `PmD8D` Auth · Connexion · Code de vérification, `e2wZj` MFA · Activer la double authentification, `OKurh` MFA · Vérifier le code, `PCsCv` MFA · Code invalide, `S2ZUQo` MFA · Activée · Reconnexion. PNGs in `docs/design-refs/comptoir-clair/mfa/<id>.png`.

## 1. Purpose

Owners and admins whose Cognito user has TOTP enabled cannot sign in today: the SDK raises a `totpRequired` challenge the login page does not handle. And any owner or admin who has not enrolled is refused by every staff route with `403 MFA_ENROLLMENT_REQUIRED`, with no way to enrol from the console.

SP-F adds the six-digit code step to login, and an enrolment page (`/mfa`) the console sends the user to when the backend asks for it.

**Planned backend change, after SP-F lands:** the backend will drop mandatory MFA (at signup and on the staff guard) and make it an owner opt-in in settings. SP-F is shaped so that change needs no web work: the login code step is permanent, the gate is triggered only by the backend's 403 (so it goes silent on its own), and `/mfa` is a standalone page a future Settings › Sécurité entry can link to.

## 2. Decisions

- **F1 — The canvas wins on look and copy**, with one exception: the enrolment intro drops « Obligatoire pour les propriétaires et administrateurs. » (e2wZj) because MFA becomes opt-in; the page must read correctly when reached from settings later.
- **F2 — The gate is reactive, keyed on the backend's 403.** `customFetch` calls a new `onMfaRequired` hook on `403` with code `MFA_ENROLLMENT_REQUIRED`, then still throws the `ApiError`. The owner app never reads `mfa_enrolled_at` from the token and never pre-checks roles. When the backend stops enforcing, the gate stops firing.
- **F3 — The login code step is permanent.** Any sign-in that raises the TOTP challenge (enforced or opt-in) shows the PmD8D step.
- **F4 — Enrolment runs in the browser with the public SRP client.** The user-pool API calls use the signed-in user's own session (tokens from SRP sign-in carry the `aws.cognito.signin.user.admin` scope). No confidential client, no BFF, no hosted UI.
- **F5 — Finalize ends the session.** `finalizeMfa()` revokes every refresh token server-side. The page then signs out locally (`signOut()`: SDK storage and the session cookie) and shows S2ZUQo; « Se reconnecter » goes to `/login?next=<next>`. The following login is TOTP-challenged and its token carries the claim.
- **F6 — Finalize is retried alone.** If Cognito enrolment succeeded but `finalizeMfa()` fails, the page offers « Réessayer », which calls `finalizeMfa()` again and never restarts setup (a new `AssociateSoftwareToken` would invalidate the app the user just configured).
- **F7 — `/platform/v1/mfa/` is a control-plane prefix.** Added to `CONTROL_PLANE_PREFIXES`; without it `finalizeMfa()` goes to the app-plane gateway.
- **F8 — Out of scope:** the « désormais obligatoire » login banner (`yuFyw`, temporary by nature); onboarding and member conversion (Flux 4: `onboard_venue` also requires a console-client eligibility grant the browser app cannot obtain; to be raised with the backend alongside the opt-in change); a settings page; disabling or resetting MFA (support only, as the canvas says); recovery codes (Cognito has none); the admin app and the member app (members are never enrolled).
- **F9 — Codes submit themselves.** The sixth digit submits; the « Vérifier » button stays as the fallback. The input is disabled while a request is in flight, so one code is never sent twice. On a wrong code the boxes clear and focus returns to the first box.
- **F10 — One redirect per burst.** `onMfaRequired` in the owner app does nothing when the current path is `/mfa`, and ignores calls after the first until the page unloads (a dashboard fires several queries at once).
- **F11 — The mock mirrors the backend** (§7); the app never depends on a mock-only string.
- **F12 — No automated run against real Cognito.** Enrolling signs out every session of that user and makes every later login ask for a code. Real verification is a manual script (§8) run by the user, or by the agent only after explicit approval naming the account.

## 3. Units

| File | Responsibility |
| --- | --- |
| `packages/auth/src/cognito.ts` | `SignInResult` gains `{ kind: 'totp-required'; submit(code: string): Promise<{ idToken: string }> }` from the SDK's `totpRequired` callback (`sendMFACode(code, callbacks, 'SOFTWARE_TOKEN_MFA')`). `AuthClient` gains `startTotpSetup(): Promise<TotpSetup>` and `confirmTotpSetup(code: string): Promise<void>` |
| `packages/auth/src/totp.ts` | Pure helpers: `TotpSetup = { secret: string; otpauthUri: string }`, `buildOtpauthUri(email, secret, issuer = 'IziWellPass')`, `formatSecret(secret) → string` (groups of 4, space-separated) |
| `packages/auth/src/errors.ts` | `EnableSoftwareTokenMFAException` → `codeMismatch`; new code `sessionExpired` for `NotAuthorizedException` whose message matches `/session is expired\|invalid session/i` (the attempts check stays first) |
| `packages/auth/src/provider.tsx` | `signIn` returns `totp-required` untouched; the caller calls `refresh()` after `submit` resolves (same as `new-password-required`) |
| `packages/auth/src/mock.ts` | Scenarios in §7 |
| `packages/api/src/client.ts` | `'/platform/v1/mfa/'` in `CONTROL_PLANE_PREFIXES`; `onMfaRequired?: () => void` in `ApiConfig`, called before throwing a 403 `MFA_ENROLLMENT_REQUIRED` |
| `apps/owner/app/(auth)/login/page.tsx` | Third view `TotpCard` (PmD8D) alongside `CredentialsCard` and `NewPasswordCard` |
| `apps/owner/components/auth/code-input.tsx` | Six-box code field on the ui `InputOTP`, numeric only, `autoComplete="one-time-code"`, `inputMode="numeric"`, invalid state, `onComplete(code)` |
| `apps/owner/app/(auth)/mfa/page.tsx` | Enrolment page: `useMfaEnrolment()` state machine + the four views (§5) |
| `apps/owner/lib/use-mfa-enrolment.ts` | State machine: `loading → setup → verify → finalizing → done`, with `setupError`, `verifyError`, `finalizeError`; exposes `start()`, `toVerify()`, `backToSetup()`, `verify(code)`, `retryFinalize()` |
| `apps/owner/components/auth/totp-qr.tsx` | Renders `otpauthUri` as an inline SVG QR (`qrcode` package, `toString(uri, { type: 'svg', margin: 0 })`), in the 240px rounded hairline frame of e2wZj (200px code) |
| `apps/owner/app/providers.tsx` | `configureApi({ onMfaRequired })` → `window.location.assign('/mfa?next=' + encodeURIComponent(path))`, with the F10 guard |
| `apps/owner/lib/next-path.ts` | `sanitizeNext(next)`, moved out of `login/page.tsx` so `/mfa` and login share it |
| `apps/owner/lib/auth-errors.ts` | Maps `sessionExpired` to its copy |
| `apps/owner/scripts/mock-server.mjs` | `MOCK_MFA=required` and `POST /platform/v1/mfa/finalize` (§7) |
| `apps/owner/messages/{fr,en}.json` | Copy in §6 under `auth.totp.*` and `mfa.*` |

## 4. Login code step (PmD8D)

`CredentialsCard.onSubmit`: on `totp-required`, the login view stores `{ email, submit }` and shows `TotpCard`.

`TotpCard`:
- Title « Code de vérification », subtitle « Entrez le code à 6 chiffres de votre application d'authentification. »
- Email chip: grey pill with an initials avatar (initials from the email local part, up to two letters, split on `.`, `_`, `-`, `+`) and the email.
- Code input (autofocused), then the full-width primary button « Vérifier ».
- Ghost link « Je n'ai plus accès à mon application »: toggles the support note below it (« Sans accès à votre application, contactez le support : la réinitialisation n'est pas en libre-service. »). The note is hidden until the link is used, and the link has `aria-expanded`.
- Success: `await submit(code)`, `await refresh()`, `router.replace(next)`; the pending state holds across the navigation (same as `CredentialsCard`).
- Errors:
  - `codeMismatch` → the PCsCv line under the boxes, boxes cleared.
  - `sessionExpired` → back to `CredentialsCard`, email kept, with the notice « Votre session a expiré. Reconnectez-vous. ».
  - Anything else → the existing localized auth message, shown in the same place as the invalid-code line.
- No « Retour » link on the canvas; the browser back button and a reload both land on the credentials form (the challenge lives in memory only).

## 5. Enrolment page `/mfa`

Layout: the `(auth)` layout (wash, wordmark, 400px column, help line). Not a public path: the middleware sends signed-out users to `/login?next=/mfa`. `next` is read from the query and passed through `sanitizeNext` (moved from `login/page.tsx` to `apps/owner/lib/next-path.ts`, unchanged, with its tests); default `/`.

| State | Frame | Content |
| --- | --- | --- |
| `loading` | — | `AuthCardSkeleton`, while `startTotpSetup()` runs on mount |
| `setup` | e2wZj | Title « Activer la double authentification »; intro (F1); QR (200px) in a 240px hairline rounded frame; label « Ou saisissez la clé manuellement »; the secret in groups of four in a grey field, mono, `select-all`, with a copy icon button (toast « Clé copiée »); primary « Continuer » → `verify`; footnote « Vous devrez saisir un code à 6 chiffres à chaque connexion. » |
| `setupError` | — | Inline error « Impossible de préparer l'activation. » + secondary « Réessayer » (re-runs `startTotpSetup`) |
| `verify` | OKurh / PCsCv | Title « Vérifier le code »; subtitle « Entrez le code à 6 chiffres affiché par votre application. »; code input; primary « Vérifier »; ghost « ← Revenir au code QR » → `setup` (same secret, no new call). Wrong code: PCsCv line, boxes cleared |
| `finalizing` | — | Same as `verify`, the button reading « Activation… », all inputs disabled |
| `finalizeError` | — | Title « Vérifier le code » kept; inline error « L'activation n'a pas pu être finalisée. » + primary « Réessayer » (F6) and the support line |
| `done` | S2ZUQo | Shield-check icon in a pale green tint circle; title « Double authentification activée »; body « Pour votre sécurité, toutes vos sessions ont été fermées. Reconnectez-vous avec votre mot de passe et un code de votre application. »; primary « Se reconnecter » → `/login?next=<next>` |

Order in `verify(code)`: `confirmTotpSetup(code)` (verify, then set preference) → `finalizeMfa()` → `signOut()` → `done`. A `codeMismatch` from `confirmTotpSetup` stays in `verify`; any error from `finalizeMfa()` goes to `finalizeError`. A missing session at any step (`startTotpSetup` rejects with no current user) sends the user to `/login?next=/mfa`.

## 6. Copy

| Key | fr | en |
| --- | --- | --- |
| `auth.totp.title` | Code de vérification | Verification code |
| `auth.totp.subtitle` | Entrez le code à 6 chiffres de votre application d'authentification. | Enter the 6-digit code from your authenticator app. |
| `auth.totp.submit` / `submitting` | Vérifier / Vérification… | Verify / Verifying… |
| `auth.totp.lostAccess` | Je n'ai plus accès à mon application | I no longer have access to my app |
| `auth.totp.lostAccessHelp` | Sans accès à votre application, contactez le support : la réinitialisation n'est pas en libre-service. | Without your app, contact support: reset isn't self-service. |
| `auth.totp.codeLabel` | Code à 6 chiffres | 6-digit code |
| `auth.errors.codeMismatchTotp` | Code invalide. Vérifiez l'heure de votre téléphone et réessayez. | Invalid code. Check your phone's clock and try again. |
| `auth.errors.sessionExpired` | Votre session a expiré. Reconnectez-vous. | Your session expired. Sign in again. |
| `mfa.setup.title` | Activer la double authentification | Turn on two-factor authentication |
| `mfa.setup.intro` | Scannez ce code avec une application d'authentification (Google Authenticator, 1Password, Authy…). | Scan this code with an authenticator app (Google Authenticator, 1Password, Authy…). |
| `mfa.setup.manualLabel` | Ou saisissez la clé manuellement | Or enter the key manually |
| `mfa.setup.copy` / `copied` | Copier la clé / Clé copiée | Copy key / Key copied |
| `mfa.setup.qrAlt` | Code QR à scanner avec votre application d'authentification | QR code to scan with your authenticator app |
| `mfa.setup.continue` | Continuer | Continue |
| `mfa.setup.footnote` | Vous devrez saisir un code à 6 chiffres à chaque connexion. | You'll enter a 6-digit code each time you sign in. |
| `mfa.setup.error` | Impossible de préparer l'activation. | Couldn't prepare setup. |
| `mfa.verify.title` | Vérifier le code | Check the code |
| `mfa.verify.subtitle` | Entrez le code à 6 chiffres affiché par votre application. | Enter the 6-digit code shown in your app. |
| `mfa.verify.submit` / `finalizing` | Vérifier / Activation… | Verify / Turning on… |
| `mfa.verify.back` | Revenir au code QR | Back to the QR code |
| `mfa.finalize.error` | L'activation n'a pas pu être finalisée. | Setup couldn't be completed. |
| `mfa.retry` | Réessayer | Try again |
| `mfa.done.title` | Double authentification activée | Two-factor authentication is on |
| `mfa.done.body` | Pour votre sécurité, toutes vos sessions ont été fermées. Reconnectez-vous avec votre mot de passe et un code de votre application. | For your security, all your sessions were closed. Sign in again with your password and a code from your app. |
| `mfa.done.cta` | Se reconnecter | Sign in again |

The support line reuses `auth.totp.lostAccessHelp`.

## 7. Mock

**Auth mock (`@iziwellpass/auth/mock`, `NEXT_PUBLIC_AUTH_MOCK=1`):**
- Password `totp` → `totp-required`; `submit('123456')` signs in as `owner` with `mfa_enrolled_at` in the token; any other code rejects with `CodeMismatchException`; code `000000` rejects with `NotAuthorizedException` « Invalid session for the user, session is expired. ».
- The session stores `mfaEnrolled: boolean`; `mintMockIdToken` adds `mfa_enrolled_at` when it is true.
- `startTotpSetup()` → fixed secret `JBSWY3DPEHPK3PXPQMFRG3PZ2ZKQ` and its `otpauth://` URI; `confirmTotpSetup('123456')` sets `mfaEnrolled: true`, any other code rejects with `EnableSoftwareTokenMFAException`.
- Enrolment is remembered per email in `localStorage` (`iziwellpass.mock-auth.mfa`) so a later role-password login keeps the claim.

**API mock (`scripts/mock-server.mjs`):**
- `MOCK_MFA=required`: every `/gms/v1/*` request whose bearer token decodes to `role` `owner` or `admin` without `mfa_enrolled_at` → `403 { error: { code: 'MFA_ENROLLMENT_REQUIRED', message: 'MFA enrollment required' } }`.
- `POST /platform/v1/mfa/finalize` → `200 { data: { mfa_enrolled_at: <now ISO> } }`; `MOCK_MFA_FINALIZE=fail` → `500`. The dev proxy for `/api/control` must reach the mock for this route when `CONTROL_PLANE_PROXY_TARGET` points at it; the header comment documents that.

## 8. Testing and verification

**Unit (vitest):**
- `packages/auth`: `totp.ts` (URI encoding of `@` and `+` in the email, issuer, grouping); the cognito wrapper with the SDK mocked (challenge mapping, `submit` resolves/rejects, `confirmTotpSetup` calls verify before preference with TOTP `{ PreferredMfa: true, Enabled: true }`, missing current user rejects); `errors.ts` new cases; mock scenarios.
- `packages/api`: `resolveBaseUrl('/platform/v1/mfa/finalize')` picks the control plane; `onMfaRequired` fires once for 403 `MFA_ENROLLMENT_REQUIRED`, not for 403 `FEATURE_NOT_AVAILABLE`, a plain 403 or a 401, and the `ApiError` is still thrown.
- Owner: `TotpCard` (submit on sixth digit, invalid code clears, session expired returns to credentials with the email, lost-access toggle); `useMfaEnrolment` (happy path order, wrong code stays, finalize failure then retry calls finalize only, `backToSetup` keeps the secret); the providers guard (F10).

**Browser (Chrome for Testing over CDP, `NEXT_PUBLIC_AUTH_MOCK=1`, `dev:mock` with `MOCK_MFA=required`), 390px and 1440px, fr and en:**
1. Password `totp` → code step → `111111` shows the invalid line → `123456` → dashboard.
2. Password `owner` → dashboard → 403 → `/mfa` → QR and key → « Continuer » → wrong code → right code → done → « Se reconnecter » → login.
3. `MOCK_MFA_FINALIZE=fail` → `finalizeError` → « Réessayer ».
Screenshots compared with PmD8D, e2wZj, OKurh, PCsCv, S2ZUQo.

**Real Cognito (manual, after merge, F12):** on a staging owner the user is willing to enrol: sign in → `/mfa` (via the 403) → scan with an authenticator → verify → « Se reconnecter » → password → code → dashboard loads with no 403. Prerequisite on the backend side: the main pool has `mfa: OPTIONAL` with software-token TOTP (iziwellpass `bc75e62`).

## 9. Risks

- **Pool config.** If staging lacks software-token MFA, `associateSoftwareToken` fails and `/mfa` shows its setup error: no silent lock-out beyond today's.
- **Clock drift.** TOTP rejects codes from a phone with a wrong clock; the invalid-code copy says to check the time (canvas copy).
- **Existing gates.** SP-G capabilities fail open on the 403 (T7); the redirect now takes the user to `/mfa` before the dashboard can show broken tiles for long.
