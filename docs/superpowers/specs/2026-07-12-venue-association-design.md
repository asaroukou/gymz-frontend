# Venue association — design (members & staff)

Design spec for wiring the venue-association surface added in the latest
OpenAPI update: member access scope + venue entitlements, and staff invite-time
venue assignment. Frontend only.

## Background

A spec update (picked up by an Orval regen) added a member **access scope**
system and confirmed the staff venue-assignment write path:

- **`AccessScope`** enum: `chain_wide` (every venue in the tenant, current and
  future) vs `venue_scoped` (only the venues in the member's entitlement list).
- **`Member.access_scope`** is now on the entity — **readable** (list + detail).
- **`CreateMemberRequest`** gained `access_scope?` and `venue_ids?`.
  Contract note: *access_scope defaults to `venue_scoped`, which requires
  `venue_ids`.* The current enroll dialog sends neither, so under the new
  contract enrollment is broken until it sends `access_scope` (and `venue_ids`
  when venue-scoped). **Wiring this fixes a break, not just adds a feature.**
- **`PUT /members/{mid}/access`** (`useSetMemberAccess`, body
  `SetMemberAccessRequest { scope }`) — flip scope.
- **`PUT /members/{mid}/venues`** (`useSetMemberVenues`, body
  `SetMemberVenuesRequest { venue_ids }`) — replace entitlements, implies
  `venue_scoped`. Returns the resulting `venue_ids`.
- **Staff:** `InviteStaffRequest.venue_ids?` (invite-time; ignored for
  owner/admin, empty = no access for trainer/receptionist) and
  `useSetStaffVenues` (full replace, existing staff).

**Read-side limits (drive scope):** a member's *specific* `venue_ids` are NOT
readable (no field, no GET) — only `access_scope` is. Staff have **no** read side
at all (no `access_scope`, no `venue_ids`, no GET). So a venue list can be set
but never pre-filled.

## Scope decisions (locked)

- One combined "venue association" cycle covering members and staff.
- **Enroll default: `venue_scoped`** (forces a venue pick at enroll).
- **Existing members: full editing** — flip scope + set venues, accepting the
  venue list is a blind full-replace (starts empty, with a replace warning).
- **Existing staff: deferred** (no read side; invite-time only).

## Shared building blocks

### `apps/owner/components/venue-checklist.tsx`
- `VenueChecklist({ value, onChange, disabled? })` where `value: string[]` is the
  selected venue ids. Renders a `Checkbox` + venue name per venue from
  `useVenueContext()`. Toggling adds/removes the id.
- States: venues loading → skeleton rows; error → inline message; **empty (0
  venues)** → a note ("Créez d'abord un établissement") and nothing to check.
- Convenience: when exactly one venue exists and `value` is empty, the parent may
  pre-select it (the checklist renders the single checked row); the checklist
  itself stays controlled (no hidden state).
- Reused by member enroll, member edit-access, and staff invite.

### `apps/owner/lib/access-scope.ts`
- Re-exports `AccessScope` values as a tuple for `z.enum`.
- `useAccessScopeLabel(): (scope: string) => string` — reads a shared
  `accessScope.*` namespace, fallback-safe (humanized raw value for an unknown
  value), mirroring `activity-type.ts`.
- `accessScopeBadgeVariant(scope): 'secondary' | 'outline'` — quiet variants
  (this is descriptive metadata, not a status), mirroring `member-status.ts`.

## Members

### Enroll dialog (`app/(app)/members/page.tsx`, `AddMemberDialog`)
- Add `access_scope: z.enum(ACCESS_SCOPE_VALUES)` (default `venue_scoped`) and
  `venue_ids: z.array(z.string())` (default `[]`) to the schema. Object-level
  `superRefine`: when `access_scope === 'venue_scoped'`, require
  `venue_ids.length >= 1` (error on the venue field).
- UI: a segmented/radio control "Tous les établissements" / "Établissements
  spécifiques". When venue-scoped, render `<VenueChecklist>`; hide it for
  chain-wide. Pre-check the sole venue when only one exists.
- Payload: always send `access_scope`; send `venue_ids` only when venue-scoped
  (omit for chain-wide). Keep the existing add-another flow (reset to defaults).

### Scope badge (list + detail)
- Member list rows/cards (`members/page.tsx`) and member detail header
  (`members/[id]/page.tsx`): render an access-scope badge via
  `useAccessScopeLabel` + `accessScopeBadgeVariant`, alongside the existing
  status/type badges. Reads `member.access_scope`.

### Edit existing (`app/(app)/members/[id]/page.tsx`)
- A "Gérer l'accès" affordance (a dialog opened from the member detail, matching
  the page's existing dialog pattern) that shows the current scope badge and lets
  an owner/admin:
  - **Flip to chain-wide:** `useSetMemberAccess.mutate({ mid, data: { scope: 'chain_wide' } })`.
  - **Set venue-scoped + venues:** `useSetMemberVenues.mutate({ mid, data: { venue_ids } })`
    (implies venue_scoped). `<VenueChecklist>` starts **empty** (current venues
    unreadable) with a prominent **"Ceci remplace l'accès actuel"** warning;
    require ≥1.
- On success: toast + invalidate `getGetMemberQueryKey(mid)` and
  `getListMembersQueryKey()`.
- Gated on the existing owner/admin/receptionist manage check used on the page.

## Staff

### Invite dialog (`app/(app)/staff/page.tsx`, `InviteStaffDialog`)
- Add `venue_ids: z.array(z.string())` (default `[]`). Watch the `role` field;
  render `<VenueChecklist>` only for `trainer`/`receptionist` (venue-scoped
  roles); hidden for `admin`. `superRefine`: require ≥1 when the role is
  venue-scoped.
- Payload: `venue_ids: isVenueScopedRole(role) ? venue_ids : undefined`.
- Existing staff venue editing: **out of scope** (deferred to a backend read).

## i18n (fr + en, parity)

- `accessScope.chain_wide` / `accessScope.venue_scoped` labels.
- `members.addDialog.*`: scope field label, the two option labels, venue field
  label, "select ≥1 venue" validation.
- `members.detail.access.*`: section/dialog title, current-scope label, the
  replace warning, submit/confirming, error.
- `staff.inviteDialog.*`: venue field label, "select ≥1 venue" validation.

## Error handling & edge cases

- **0 venues:** checklist shows the "create a venue first" note; venue-scoped
  enroll/invite disabled (can't scope). Chain-wide enroll still works.
- **Enroll contract:** always send `access_scope` so the venue_scoped default
  never fires unintentionally.
- **Blind replace (member venues):** the empty-start + warning make the
  full-replace explicit; require ≥1 so you can't accidentally strip all access to
  an empty set.
- Field errors via `applyFieldErrors`; other errors via `apiErrorMessage` toast,
  consistent with existing dialogs.

## Testing / verification

owner has no unit runner (per prior specs). Verify with
`pnpm --filter owner typecheck` / `lint` / `build` and browser preview:

- Enroll venue-scoped (checklist required) and chain-wide (no checklist); confirm
  payload carries `access_scope` (+ `venue_ids` when scoped).
- Scope badge shows on member list + detail.
- Edit-access: flip to chain-wide; set venue-scoped with venues (replace warning
  shown); member refreshes.
- Staff invite: checklist appears for trainer/receptionist, required; hidden for
  admin; `venue_ids` sent.
- i18n parity across fr/en.

## Out of scope

- Editing an existing staff member's venue assignments (no read side).
- Reading/displaying a member's or staff's *specific* venue entitlement list
  (no endpoint; only the member's scope is readable).
- Marketplace/pass/platform surface (not owner scope).

## Backend asks (carried)

- A read for a member's `venue_ids` (or embed them on `Member`) so venue-scoped
  editing can pre-fill instead of blind-replace.
- A staff venue read (`venue_ids` on `Staff` or `GET /staff/{sid}/venues`) to
  enable existing-staff venue editing with pre-fill.
