# Owner signup, onboarding & control-plane routing — design

Restore the owner signup → onboarding flow to working parity against the
Aug 22 API contract, and absorb the contract-sync fallout that reaches the
owner app. Approved in chat 2026-08-22.

The app is pre-production — no real users, no production data — so decisions
here carry no back-compat burden.

## Why the flow broke

The staging estate was rebuilt (AWS account `872792314599`, stacks verified
2026-08-19) with three structural changes:

1. **The main Cognito pool no longer allows self-signup.** Verified
   empirically: `SignUp` against the main pool's client returns
   `NotAuthorizedException: SignUp is not permitted for this user pool`,
   while the consumer pool accepts it. Every main-pool identity — staff,
   member, and now owner — is created server-side via `AdminCreateUser`.
2. **A second API gateway.** The control plane
   (`ControlPlaneStack` → `ControlPlaneApiUrl`) hosts
   `/platform/v1/auth/register-owner`, `/platform/v1/onboarding/*`,
   `/platform/v1/admin/*`, `/platform/v1/billing/webhook`. Everything else
   stays on the app plane (`ApiUrl`). The owner app has a single base URL,
   so `POST /platform/v1/onboarding/venue` currently goes to the wrong host.
3. **Onboarding requires an `Idempotency-Key` header** (400 without it;
   the same key replays the stored response, so each attempt needs a fresh
   UUID v4).

Owner account creation is **still fully self-serve** — no human approval.
What moved is where the Cognito call happens: the browser posted `SignUp`;
now the server does `AdminCreateUser` behind the public, enumeration-safe
`POST /platform/v1/auth/register-owner` (202 always; temp password emailed;
first login triggers the `newPasswordRequired` challenge the auth package
already implements for invited staff).

## Scope

In: contract sync + regen, plane routing in `packages/api`, signup rework,
confirm-page removal, onboarding Idempotency-Key, the two sync fallouts
below, env/proxy updates, doc asks.

Out: the 16 new endpoints nothing consumes yet (`/gms/v1/me/*`, marketplace,
pass, `/platform/v1/admin/*` UI, tenant settings, venue marketplace toggle,
`checkin_scan_mode` UI), pass-holder identity resolution, and any tenant
login-mode UI.

## Decision 1 — plane routing lives in `customFetch` (prefix rule)

`configureApi` gains `controlPlaneBaseUrl`; a pure exported
`resolveBaseUrl(url, config)` picks the base by path prefix:

```ts
export const CONTROL_PLANE_PREFIXES = [
  '/platform/v1/auth/',
  '/platform/v1/onboarding/',
  '/platform/v1/admin/',
  '/platform/v1/billing/',
] as const;
```

Rationale: the generated client stays untouched and unaware; every call
site is unchanged; auth injection, 401-refresh-retry and error mapping
apply uniformly to both planes; the future admin app inherits it. The
prefix list must track the backend's split — it is stable, mirrors the
doc's route table, and a mismatch fails loudly (403), never silently.

Rejected: a second generated client (duplicates the mutator's load-bearing
auth/retry plumbing); per-call-site overrides (the retired `dated-api.ts`
shape, and each site would have to re-implement or lose the 401 retry).

`resolveBaseUrl` missing a `controlPlaneBaseUrl` while matching a prefix
throws a descriptive error — misconfiguration surfaces at the first
onboarding attempt, not as a cryptic wrong-host 403.

## Decision 2 — signup posts to register-owner; no password at signup

`/signup` fields become **email, first name, last name** (matching
`RegisterOwnerRequest`; note the integration doc's prose example says
`full_name` — the OpenAPI schema is authoritative and has
`first_name`/`last_name`; doc bug reported). Submit calls the generated
`useRegisterOwner` mutation, which prefix-routes to the control plane.

Success switches the page to an inline "check your email" state (no
redirect, no new route). **The success copy must be identical whether the
email was new or already registered** — the API returns 202 either way
precisely for enumeration safety, and the UI must not undo that. The code
carries a comment saying so.

Password rules (`lib/password.ts`, `PasswordChecklist`) are untouched:
they already serve the login page's new-password challenge, which is where
owners now set their real password.

## Decision 3 — the confirm page is deleted

`app/(auth)/confirm/page.tsx` goes; `/confirm` leaves `middleware.ts`
publicPaths; the login page's `UserNotConfirmedException` → `/confirm`
redirect goes. `AdminCreateUser` yields `FORCE_CHANGE_PASSWORD`, never
`UNCONFIRMED`, so the state is unreachable for main-pool users. The
`auth.errors.userNotConfirmed` message stays as a defensive toast; confirm-
only i18n keys are removed from both message files (parity preserved).

`signUp` / `confirmSignUp` / `resendConfirmationCode` **stay in
`packages/auth`** — correct generic Cognito wrappers the future consumer
app needs against the consumer pool. Only the owner app's screens go.

## Decision 4 — onboarding sends a fresh Idempotency-Key per attempt

`useOnboardVenue({ request: { headers: { 'Idempotency-Key':
crypto.randomUUID() } } })` — no regeneration needed: the Orval mutator's
second parameter is `RequestInit` and `customFetch` merges `options.headers`.
The key is generated per submit attempt (not per mount): a same-key retry
replays the stored response, and a new attempt must be a new key.

## Sync fallout A — pass-holder check-ins render safely

`CheckIn.member_id` is now nullable; `pass_holder_id` is new. The three
reading call sites (`dashboard/recent-checkins.tsx:41,106`,
`checkins/recent-checkins.tsx:150`) guard null `member_id` and render a
neutral label (fr « Visiteur pass », en "Pass visitor"), one new key pair
in the `common` namespace. No name lookup, no new fetching — the real
pass-holder UX lands with marketplace work. Chosen over hiding the rows
(counts and list would disagree) and over full identity resolution
(front-runs unscoped marketplace work).

## Sync fallout B — member email reverts to optional

`CreateMemberRequest.email` is optional again (roster-mode members have no
login; the tenant's `member_login_mode` is write-only so the client cannot
know the mode). The add-member form drops the required rule — back to
sending `null` when blank — and the server enforces per mode; its
`VALIDATION_ERROR` maps onto the email field via the existing
`applyFieldErrors`. The now-unused `members.validation.emailRequired` key
is removed from both files. This effectively reverts the form half of
`b505faa` — correct then, superseded now.

## Environment & proxy

`.env.example` (committed) and `.env.local` get the live values:

```
API_PROXY_TARGET=https://fvj231z5k1.execute-api.eu-west-1.amazonaws.com/v1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=eu-west-1_wFqcvwlfq
NEXT_PUBLIC_COGNITO_CLIENT_ID=1ig7qvoa48ko3h9jddpitqe90o
NEXT_PUBLIC_CONTROL_PLANE_BASE_URL=/api/control
CONTROL_PLANE_PROXY_TARGET=https://56mp264jf6.execute-api.eu-west-1.amazonaws.com/v1
```

`next.config.ts` gains a `/api/control/:path*` rewrite mirroring the
existing `/api/backend/:path*` one. `providers.tsx` passes
`controlPlaneBaseUrl` into `configureApi`.

## Contract sync mechanics

`pnpm sync:openapi` + regen picks up the Aug 22 spec (87 operations). The
sync also regenerates hooks for endpoints nothing consumes; that is fine
and expected. `check-freshness` keeps guarding drift.

## Verification

- TDD unit tests for `resolveBaseUrl` in `packages/api` (prefix match →
  control plane; non-match → app plane; prefix match with no
  `controlPlaneBaseUrl` → descriptive throw).
- The four gates green; fr/en key parity script clean.
- **Live end-to-end (requires a real inbox, run by the user):**
  register → receive temp password → sign in → `newPasswordRequired` →
  set password → onboard venue (Idempotency-Key accepted) → dashboard as
  `role: owner`. Repeat register with the same email and confirm the UI
  reads identically (enumeration safety).

## Backend/doc asks

- Doc bug: register-owner prose example uses `full_name`; schema requires
  `first_name`/`last_name`.
- Standing ask (repeat): a read side for `member_login_mode` so the member
  form can adapt instead of always deferring to the server.

## Risks

- Prefix-list drift from the backend's plane split — fails loudly (403).
- Enumeration safety is one careless copy change away from undone — guarded
  by an in-code comment and the spec.
- Roster-mode email behaviour is unverifiable client-side; only a
  login-mode tenant can be tested until the read side exists.
