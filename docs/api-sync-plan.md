# API sync plan — owner app

Consuming the updated backend OpenAPI spec (`openapi.json`). Baseline agreed with
the product owner; decisions locked per workstream below. Commits on hold until
told otherwise. A concurrent session shares this working tree (QR-scanner work),
so check `git status` before/after any large generated change.

## Spec changes (new vs previous `.back`)

- **Members list** `GET /gms/v1/members`: gained `limit, cursor, name, phone, email`
  query params, returns `PaginatedApiResponse_Vec_Member` with `meta.next_cursor`
  (no total count).
- **Venue type** `VenueType` (9 values) removed → `Venue.venue_type` now refs
  `ActivityType` (23 values). Removed values: `yoga_studio, tennis_club, cross_fit,
  swimming_pool, other`.
- **Create venue** `POST /gms/v1/venues` (`CreateVenueRequest`).
- **Venue activities** `GET/POST /venues/{id}/activities`,
  `DELETE …/activities/{activity}` (`VenueActivity`, `AddActivityRequest`).
- **Staff ↔ venues** `PUT /gms/v1/staff/{sid}/venues` (`SetStaffVenuesRequest`,
  full replace) — **write-only**, no read side.
- **Pass bookings** paginated — `GET /platform/v1/pass/bookings` (platform scope,
  no owner consumer → out of scope here).

## Workstreams

### WS0 · Regenerate client (mechanical) — DONE
Ran Orval; regen picked up the updated spec, API layer typechecks. Remaining
owner compile errors map cleanly to WS1 (venue type) and WS6 (members).

### WS0b · Retire the `dated-api` workaround — DONE
The regen surfaced a bonus change: `/venues/{vid}/slots`, `/attendance`, and
`/checkins` all now document a `date` query param (attendance/checkins require
it, slots optional). Rewrote `lib/dated-api.ts` to pass `date` through the
generated URL builders and dropped the manual `withDate` hack; kept the thin
`useSlotsByDate` / `useAttendanceByDate` / `useCheckInsByDate` wrappers so call
sites and query-key invalidations are unchanged. `dated-api` compile errors
cleared. (The header comment no longer calls it a backend gap.)

### WS1 · Venue-type enum migration (breaking; first real work) — DONE
- `venue_type` = primary discipline; `activities` = also-offered. Both meaningful.
- Type picker = searchable **Combobox** in create/edit/onboarding.
- Rewrite 23 labels in fr+en (`venues.type.*`, `onboarding.types.*`).
- Safe fallback so a stray/legacy stored value never renders blank.
- Backend ask: confirm old stored `venue_type` values were data-migrated.

### WS2 · Create venue — DONE
- Dedicated **`/venues/new`** page reusing onboarding fields + WS1 Combobox.
- "Ajouter un lieu" CTA in venues header + empty state.
- On success → navigate to `/venues/{id}`.

### WS3 · Venue activities — DONE
- "Activités" section on venue detail: current activities as chips +
  "Ajouter une activité" Combobox (catalog minus already-added; independent of
  `venue_type`).
- Removal via **confirm dialog**.

### WS4 · Staff ↔ venues — PARKED (pending backend read)
API is write-only; can't read/pre-fill current assignments, and PUT is a full
replace. Backend to add `venue_ids` on `Staff` or `GET /staff/{sid}/venues`.
When available: staff rows show assigned venues as badges; per-row
"Gérer les établissements" dialog with a venue checklist pre-filled from current,
submitting the full set.

### WS5 · Pass bookings — DROPPED
Platform/marketplace scope, no owner consumer.

### WS6 · Member list (last, largest)
- **Browse page**: server search (`name/phone/email`, debounced) replacing the
  client-side filter; cursor pagination via **"Charger plus"**; **remove status
  tabs** (no server param) and request one from backend; adjust the count display
  (no total). Keep the card/table reflow.
- **Consumers** of `useAllMembers` (dashboard active count, schedule + front-desk
  name maps): replace the `limit=1000` hack with a correct `fetchAllMembers`
  **cursor-loop** helper. Migrate the **AddParticipant** and **manual check-in**
  pickers to server-side search.
- Then delete `useAllMembers` / `lib/all-members.ts`; update `docs/backend-issues.md`.

## Order
WS0 → WS1 → (WS2, WS3 parallel) → WS6. WS4 slots in when the backend read lands.

## Backend asks (owner coordinating)
1. Confirm old `venue_type` values were data-migrated (WS1).
2. Staff venue **read** — `venue_ids` on `Staff` or `GET /staff/{sid}/venues` (WS4).
3. Members **status filter** query param (WS6).
4. Nice-to-have: **total** in `PaginationMeta` — restores exact member count and
   enables numbered pages (WS6).
