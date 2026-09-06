# Front Desk Completion — Walk-in and Pass Check-in — Design

**Date:** 2026-09-06
**Status:** Approved in brainstorming (sub-project C of the owner-app gap closure)

## Goal

Close the three unconsumed check-in endpoints so the front desk can admit
everyone who shows up, not just members with a booking:

| Endpoint | Who it admits |
|---|---|
| `POST /gms/v1/checkins/walkin` | An existing member with **no booking** (by member id) |
| `POST /gms/v1/checkins/walkin/qr` | The same, via the member's walk-in QR |
| `POST /platform/v1/checkins/pass` | A **marketplace pass-holder** with a pass booking |

The last one is the sharpest gap today: the check-in feed already *displays*
pass visitors («Visiteur pass»), but staff have no way to actually admit one.

## Context

### The three QR token kinds are non-confusable

QR tokens are `iwp1.<base64url(json)>.<base64url(hmac)>`. The signing key is
derived with HKDF from **both the tenant id and the token kind**, so a walk-in
token fails MAC verification at the booking endpoint and vice versa — the
server will not accept a token at the wrong endpoint
(`crates/iziwellpass-domain/src/checkin/qr.rs`).

Three kinds exist, each minted by a different endpoint and consumed by exactly
one check-in endpoint:

| `kind` in payload | Minted by | Consumed by |
|---|---|---|
| `booking` | `POST /gms/v1/me/bookings/{bid}/qr` | `check_in_via_qr` |
| `walkin` | `POST /gms/v1/me/qr` | `check_in_walkin_qr` |
| `pass_booking` | `POST /platform/v1/pass/bookings/{bid}/qr` | `pass_checkin` |

Tokens are valid for 300 seconds.

### The payload is client-readable

The middle segment is base64url-encoded JSON carrying `kind`, `tenant_id`,
`venue_id`, `jti`, `iat`, `exp`, and (for `walkin` only) `member_id`. No secret
is required to read it — only to *verify* it. This is what makes a single
self-routing scan field possible.

### Capability gates (verified in `lambdas/checkin/src/main.rs`)

| Route | Gate |
|---|---|
| `check_in_walkin` | none — works on **free** tier |
| `check_in_walkin_qr` | `Capability::QrCheckin` (starter+), same as today's QR tab |
| `pass_checkin` | none — works on **free** tier |

No new tier surface: the QR tab already requires `QrCheckin` today.

### Request shapes

- `WalkinCheckinRequest { member_id, venue_id }` — both required
- `QrCheckinRequest { qr_token, venue_id }` — both required
- `PassCheckinRequest { qr_token }` — **no `venue_id`**; the token is keyed to
  the destination venue's tenant and resolves the venue server-side
- All three return `201` with `ApiResponse_CheckIn`

## Design

### 1. Token-kind routing (`apps/owner/lib/qr-token.ts`)

A new pure module, no React and no network:

```ts
export type QrTokenKind = 'booking' | 'walkin' | 'pass_booking';
export interface DecodedQrToken {
  kind: QrTokenKind;
  venueId: string | null;
  expiresAt: number | null;   // Unix seconds
}
/** Returns null for anything not confidently decodable. */
export function decodeQrToken(raw: string): DecodedQrToken | null;
```

It splits on `.`, requires the `iwp1` prefix and three segments, base64url-decodes
the payload, JSON-parses it, and accepts only a known `kind`. Anything else
returns `null`.

**This performs no security check and must not be mistaken for one.** The client
holds no signing key; the server verifies the MAC under the kind-and-tenant
derived key on every call. Decoding only chooses which endpoint to call.

**Routing rule in the QR tab:**

| `decodeQrToken` result | Call |
|---|---|
| `kind: 'booking'` | `check_in_via_qr({ qr_token, venue_id })` |
| `kind: 'walkin'` | `check_in_walkin_qr({ qr_token, venue_id })` |
| `kind: 'pass_booking'` | `pass_checkin({ qr_token })` |
| `null` (unknown prefix, kind, or malformed) | **fall back to `check_in_via_qr`** |

The fallback is deliberate: a future `iwp2` format, or any token this decoder
does not understand, degrades to exactly today's behaviour rather than
refusing to scan. The server then produces the authoritative error.

### 2. Error enrichment, never pre-emption

The decoded `expiresAt` and `venueId` are used **only to explain a rejection
the server already made**, never to skip the call:

- Server rejects **and** `expiresAt` is in the past → «Ce code a expiré.
  Demandez au membre d'en générer un nouveau.»
- Server rejects **and** `venueId` is set and differs from the selected venue →
  «Ce code a été généré pour une autre salle.»
- Otherwise → the server's message via `apiErrorMessage`.

Rationale: a counter tablet with a skewed clock must never be able to refuse a
valid scan. The server decides; the client only phrases the answer better than
"invalid or wrong-venue token".

### 3. Screens

**QR tab (existing, `register-panel.tsx`)** keeps everything that makes it work
at a 6:30 rush — single autofocused field, submit-guard against wedge-scanner
double-fire, clear-and-refocus on success. It gains only the routing above.
A pass-holder scan now succeeds where it previously errored.

**New third tab «Sans réservation»** for walk-in by member: a member combobox
(the members list is already loaded on this screen for name resolution) and a
submit button → `check_in_walkin({ member_id, venue_id })`. This is the only
flow requiring no QR and the only one available on a free tenant.

Tab order: «QR» · «Réservation» (today's manual) · «Sans réservation».

### 4. Results and invalidation

On success all three flows behave like today's: success toast, then invalidate
`getListCheckInsQueryKey(venueId)` and `getGetAttendanceQueryKey(venueId)`.

The toast reuses the existing three-way naming already wired for
`pass_holder_id`: resolved member name → «Membre» (member id unknown to the
loaded page) → «Visiteur pass» (`member_id` null, i.e. a pass check-in).

### 5. Error copy

| Case | Copy |
|---|---|
| Walk-in `409` | Member already walked in at this venue inside the dedupe window (`walkin_dedupe_minutes`, default 1440 = 24h) |
| Pass `409` | Pass booking not settleable — not found for this venue, already used, or cancelled |
| Walk-in QR `403` | Feature unavailable on this plan (QR check-in is starter+) |
| Any `404` | Venue or member not found |

## Testing

Unit tests (vitest, following the owner app's pure-logic convention) on
`decodeQrToken`:

- decodes each of the three kinds from a realistic token
- returns `null` for: wrong prefix, wrong segment count, non-base64 payload,
  valid base64 that is not JSON, JSON without a `kind`, and an unknown `kind`
- extracts `venueId`/`expiresAt` when present and yields `null` for them when absent
- never throws on arbitrary input (including empty string)

Plus a routing test over the pure decision (`kind` → endpoint), and fr/en key
parity for all new copy.

Then the four gates: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`.

## Out of scope

- **Manual (non-QR) pass check-in.** `pass_checkin` accepts only a `qr_token`,
  so a pass visitor with a dead phone cannot be admitted. This is the API's
  shape, not a decision here; worth a backend ask if it bites in practice.
- Venue metrics (sub-project D) and venue/tenant settings (sub-project E).
- The marketplace toggle and tenant login mode, both blocked on missing read
  sides (filed in `docs/backend-issues.md`).

## Global constraints (inherited)

- Never hand-edit `packages/api/src/generated/**`.
- French-first i18n, exact fr/en key parity.
- `verbatimModuleSyntax`, `noUncheckedIndexedAccess`.
- `@iziwellpass/ui` subpath imports only.
- Prettier on touched files; quote paths containing `()`/`[]` in single quotes.
- Only `.env.example` is committed; `.env.local` stays gitignored.
