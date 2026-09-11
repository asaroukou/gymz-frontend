# Member Mobile App — Design

**Date:** 2026-09-11
**Status:** Approved in brainstorming (gym-member app, Main pool, `/gms/v1/me/*`;
reuse-types-native-runtime; NativeWind + ported tokens; booking deferred)

## Goal

A new Expo app `apps/member` (`@iziwellpass/member`): the gym member's
**digital membership card**. A staff-invited member of a venue logs in, sees
who they are and their plan, flashes their entry QR at the door, and reviews
their bookings. Calm, French-first, faithful to DESIGN.md and PRODUCT.md.

This is the first React Native surface in the monorepo (until now web-only:
`apps/owner`, `apps/admin`).

## Who this is for (and who it is NOT)

The backend segments two distinct consumer-facing people onto two pools
(`iziwellpass/docs/client-integration.md`):

| Person | Pool | Signup | Surface |
|---|---|---|---|
| **Membre** (adhérent of a venue) — **THIS APP** | **Main** | Staff-invited (`POST /gms/v1/members`), temp password, **no self-signup** | `/gms/v1/me/*` |
| Consommateur / pass-holder — future separate app | Consumer | Self-signup + `/platform/v1/pass/register` | `/platform/v1/{marketplace,pass}/*` |

This app targets **only the Membre**. The marketplace/pass product (consumer
pool, self-signup, credits, cross-venue discovery) is a separate future app and
entirely out of scope. The app is named `member`, not `consumer`, to keep that
honest.

## API surface (app plane, direct to gateway)

Native apps are not subject to browser CORS, so the app calls the app-plane
gateway directly. No dev proxy (unlike owner/admin).

- **Base URL:** `https://i6ekmmxyu5.execute-api.eu-west-1.amazonaws.com/v1`
  (staging, 2026-08-30 deploy, account 905609278405; rotates on stack rebuild —
  `iziwellpass/docs/client-integration.md` is truth).

| Operation | Method/path | Permission | v1 |
|---|---|---|---|
| Profile | `GET /gms/v1/me` | — (open) | ✅ |
| Subscription | `GET /gms/v1/me/subscription` | — | ✅ |
| Accessible venues | `GET /gms/v1/me/venues` | — | ✅ (context on card) |
| My bookings | `GET /gms/v1/me/bookings` | — | ✅ |
| Cancel booking | `POST /gms/v1/me/bookings/{bid}/cancel` | `member_self_service` | ✅ |
| Entry QR | `POST /gms/v1/me/qr` | `member_qr` | ✅ |
| Bookable slots | `GET /gms/v1/me/slots?venue_id=&from=&to=` | — | ❌ deferred |
| Book a slot | `POST /gms/v1/me/bookings` | `member_self_service` | ❌ deferred |

Response shapes are already in the generated client (`ApiResponseMyProfileResponse`,
`ApiResponseMemberSubscription`, `ApiResponseMeQrResponseSchema`, `ApiResponseBooking`,
etc.). No API generation work is needed.

## Auth (Main pool)

- Pool: `eu-west-1_JCAATFFzq`, client `57e746kskk9ccijelgsipmu424` (public, no secret).
- Members are invited by staff with a temporary password, so login **must**
  handle the `newPasswordRequired` challenge (same first-login flow as staff).
- **No signup screen.** Password reset (forgot-password) is out of scope for v1.

## Architecture — reuse types, native runtime

New workspace `apps/member`, Expo SDK 57 (managed), Expo Router (file-based),
React 19, TypeScript. Consumes shared packages where portable; supplies its own
RN runtime where the web packages assume a browser.

### Shared packages

- **`@iziwellpass/api`** — reused as-is. `client.ts` is auth-agnostic and
  env-injected via `configureApi({ baseUrl, getToken, onUnauthorized })`, is
  `fetch`-based, and its generated endpoints/schemas are pure TS + TanStack
  Query. The app calls `configureApi()` at startup with the real gateway
  `baseUrl`, a token getter backed by the native Cognito runtime, and a
  refresh-once `onUnauthorized`. `controlPlaneBaseUrl` is left empty (no
  control-plane routes in this app; an accidental call fails loudly via
  `resolveBaseUrl`).
- **`@iziwellpass/auth`** — reuse **`claims.ts`** only (`parseClaims` is
  `Buffer`/`atob`-safe). Its `cognito.ts` (localStorage), `provider.tsx`,
  `middleware.ts`, `session-cookie.ts` are web-bound and NOT reused.
- **`@iziwellpass/config`** — reuse base TS + ESLint config; the app adds
  Expo/React-Native specifics on top (no Next preset).
- **`@iziwellpass/ui`** — NOT reused (radix/Tailwind-web/lucide/next-themes are
  DOM-only). The member app has its own RN components.

### Native Cognito runtime (in-app, `lib/auth/`)

`amazon-cognito-identity-js` runs in RN with two additions:

1. `react-native-get-random-values` imported at app entry (SRP needs crypto).
2. A `Storage` adapter passed to `CognitoUserPool`/`CognitoUser`
   (`Storage:` option). RN has no `localStorage`; v1 uses an **AsyncStorage**
   -backed adapter implementing the sync `ICognitoStorage` interface via an
   in-memory cache hydrated at startup (the SDK's storage contract is
   synchronous). Token-at-rest hardening (SecureStore/biometric) is a documented
   fast-follow, acceptable to defer pre-production (no real users;
   `iziwellpass-preproduction`).

The app wraps this into an auth module exposing: `signIn(email, password)` →
`success | new-password-required`, `completeNewPassword`, `getIdToken()`
(auto-refreshed), `forceRefreshSession()`, `signOut()`. `parseClaims` decodes
the ID token for UI (name, role). Modeled on `packages/auth/src/cognito.ts`'s
`AuthClient` shape so the logic is familiar, but self-contained in the app.

### Session & navigation

- An auth context/provider hydrates session at launch (read stored tokens →
  validate/refresh) and exposes `status: 'loading' | 'signed-in' | 'signed-out'`
  plus claims.
- Expo Router route groups gate navigation: `(auth)/login` when signed-out,
  `(app)/*` tabs when signed-in. Redirect on `onUnauthorized` refresh failure.

### Styling — NativeWind + ported tokens

NativeWind v4. A `tailwind.config` preset ports DESIGN.md tokens to **hex/rgb**
(RN OKLCH support is unreliable): green-ink accent, warm-stone neutrals, the
type scale, radii. Numbers/mono use the same Geist Mono intent (bundled font).
Parity with web is by shared values, not a shared package.

## Screens (v1)

Expo Router file tree under `app/`:

- **`(auth)/login`** — email + password; on `new-password-required`, a
  set-password step. French copy, `ApiError`-driven inline errors. No signup,
  no forgot-password link (out of scope).
- **`(app)/index` — Card (home tab)** — profile (`me`) + active subscription
  (`me/subscription`): member name, plan name, status badge, home venue (from
  `me/venues`). The identity moment; calm, card-led.
- **`(app)/qr` — Entry QR** — `POST /me/qr` renders a large, high-contrast entry
  QR for the door. Shows expiry; a refresh action re-mints. This is the
  front-desk-first hero action.
- **`(app)/bookings` — My bookings** — `me/bookings` list, each with status and
  a cancel action (`member_self_service`, confirm dialog, cancellation window
  surfaced honestly on rejection).
- Every screen has designed loading (skeleton), empty, and error states
  (PRODUCT.md principle 4); errors carry a support reference, no raw enum
  (matching the owner app's de-jargoned toast convention).

Tab bar: Carte · QR · Réservations.

## i18n

French-first via `i18n-js` (lightweight, RN-standard) with `messages/fr.json` +
`messages/en.json`, French default. A vitest key-parity test enforces exact
fr/en parity, mirroring owner/admin. Sentence case, operator vocabulary, no
emoji, per PRODUCT.md voice.

## Error handling

- 401 → `onUnauthorized` refresh-once → on failure, sign out + route to login.
- `ApiError` mapped to French copy; support `ref:` suffix, never a raw code
  (owner-app convention).
- Booking cancel rejection (window closed) → clear inline message.
- No network → honest retry affordance, not a dead end.

## Testing

Unit tests on pure logic (vitest), per monorepo convention:

- claims parsing reuse (smoke that `parseClaims` works with a member token),
- QR expiry/countdown helper,
- any date/booking-status formatting helper,
- fr/en message key parity.

Plus the four monorepo gates wired into Turbo: `pnpm build && pnpm typecheck &&
pnpm lint && pnpm test` must stay green from repo root. `build` for this app
maps to a non-interactive target (typecheck + `expo export`-safe or a no-op that
keeps Turbo's graph valid) so it does not launch Metro; `dev` is
`persistent`/uncached (Metro / `expo start`).

## Configuration

`apps/member/.env.example` committed; `.env.local` gitignored. Expo public env
via `EXPO_PUBLIC_*` (Expo's inlining convention, analogous to `NEXT_PUBLIC_*`):

```
EXPO_PUBLIC_API_BASE_URL=https://i6ekmmxyu5.execute-api.eu-west-1.amazonaws.com/v1
EXPO_PUBLIC_COGNITO_USER_POOL_ID=eu-west-1_JCAATFFzq
EXPO_PUBLIC_COGNITO_CLIENT_ID=57e746kskk9ccijelgsipmu424
```

Turbo `globalEnv` currently allows `NEXT_PUBLIC_*`; add `EXPO_PUBLIC_*`.

## Out of scope (v1)

- Marketplace / pass / consumer pool (separate future app).
- Self-signup, forgot-password.
- Booking a **new** slot (`me/slots` + `POST me/bookings`) — fast-follow.
- Push notifications, offline mode, deep links.
- Native store submission / EAS build config.
- Token-at-rest hardening (SecureStore/biometric) — documented fast-follow.
- Sharing `@iziwellpass/ui` with RN.

## Global constraints (inherited from the monorepo)

- Never hand-edit `packages/api/src/generated/**`.
- French-first i18n, exact fr/en key parity.
- `verbatimModuleSyntax`, `noUncheckedIndexedAccess` where the RN/Expo
  toolchain allows.
- Prettier on touched files; quote paths containing `()`/`[]` in single quotes.
- Only `.env.example` is committed; `.env.local` stays gitignored.
- DESIGN.md / PRODUCT.md are the brand authority: calm, warm, precise; no emoji,
  no hype, no gamification; meaning-only color; WCAG AA.
