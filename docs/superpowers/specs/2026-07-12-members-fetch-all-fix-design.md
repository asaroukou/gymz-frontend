# Members (WS6, phase 1) — fetch-all cursor-loop fix

Design spec for the minimal, build-unblocking slice of the members workstream
(WS6) in the owner app. Second of the API-sync specs
(`docs/api-sync-plan.md`); the venue domain (Spec 1) is done.

## Goal

Fix the one pre-existing compile error that breaks `owner` typecheck/build, and
replace the `limit=1000` hack in `lib/all-members.ts` with a **correct cursor
loop** that materializes the full member list. No UI changes; no server-side
search or pagination yet.

## Background

The WS0 Orval regen changed the members list response:

- `GET /gms/v1/members` gained `limit` (1–100, default 20), `cursor`, `name`,
  `phone`, `email` query params (`ListMembersParams`).
- The response is now `PaginatedApiResponseVecMember`
  (`{ data: PaginatedApiResponseVecMemberDataItem[]; meta: PaginationMeta; request_id }`)
  where `meta.next_cursor: string | null`. The old `ApiResponseVecMember`
  export is gone.

Two consequences:

1. `apps/owner/lib/all-members.ts:7` still imports `ApiResponseVecMember` →
   **TS2724**, which fails `pnpm --filter owner typecheck` and `build`.
2. The old hack fetched `?limit=1000`. The endpoint now caps `limit` at 100, so
   the hack silently returns **≤100 members** — wrong for the dashboard
   active-count and the two check-in name maps once a tenant exceeds ~100
   members.

`PaginatedApiResponseVecMemberDataItem` is **structurally identical** to
`Member` (same fields; the nullable string aliases both resolve to
`string | null`), so consumers stay typed as `Member[]` with no cast.

## Scope decision (locked)

**Build fix only, minimal.** Server-side search, cursor-pagination UI,
status-tab removal, and picker async-search are explicitly **deferred** to a
later WS6 phase. Current browse UX (client-side filter + status tabs over the
full list) is unchanged.

## Design

### `apps/owner/lib/all-members.ts` (rewrite)

**`fetchAllMembers(): Promise<Member[]>`** — a plain async helper:

- Cursor loop: repeatedly
  `customFetch<PaginatedApiResponseVecMember>(getListMembersUrl({ limit: PAGE_SIZE, cursor }), { method: 'GET' })`,
  push `response.data` into an accumulator, set `cursor = response.meta.next_cursor`,
  and stop when `next_cursor` is `null`/absent.
- `PAGE_SIZE = 100` (the endpoint maximum → fewest round-trips).
- Accumulator typed `Member[]`; `response.data` items are structurally `Member`,
  assigned directly (no cast).
- **Safety cap** `MAX_PAGES = 50` (→ up to 5000 members; ample for the target
  gyms). If reached while a `next_cursor` is still present, stop and
  `console.warn` so a malformed/looping cursor can't spin forever.

**`useAllMembers()`** — `useQuery({ queryKey, queryFn: fetchAllMembers })`:

- Query key keeps `getListMembersQueryKey()` as its prefix (e.g.
  `[...getListMembersQueryKey(), { scope: 'all' }]`) so existing
  `invalidateQueries({ queryKey: getListMembersQueryKey() })` calls (register,
  suspend, member edit) still match by prefix.
- No `select` transform needed (the queryFn already returns `Member[]`).

**Header comment** reframed: it is no longer a "backend pagination gap"
workaround (pagination is now modeled). New framing: a cursor-loop that
materializes the full member list for aggregate/name-map consumers; a candidate
to replace with server-side search in a later WS6 phase.

### Consumers — no changes

`useAllMembers()` keeps its `UseQueryResult<Member[]>`-shaped surface, so all
consumers compile and behave unchanged, now with a **complete** list:

- `app/(app)/members/page.tsx` — browse (client filter + tabs + subtitle count).
- `app/(app)/dashboard/use-dashboard-data.ts` → `kpi-row` active count,
  `dashboard/recent-checkins` name map.
- `app/(app)/checkins/use-frontdesk-data.ts` → `checkins/recent-checkins` name
  map, `register-panel` manual check-in picker.
- `app/(app)/schedules/slots-tab.tsx` → `bookings-sheet` `AddParticipant` picker.

## Data flow

`useAllMembers()` → `fetchAllMembers()` → N× `GET /gms/v1/members?limit=100[&cursor=…]`
→ concatenated `Member[]` → React Query cache under the `listMembers` key prefix
→ consumers read `.data`.

## Error handling

- A failed page rejects the whole `fetchAllMembers` promise → the query enters
  `isError`; consumers already render their error/retry states
  (`members/page.tsx` retry button, picker error rows). No partial-list surfaced.
- `MAX_PAGES` guard: stop + `console.warn('[all-members] page cap reached')`;
  returns the pages gathered so far (bounded, not an error) so the UI degrades
  gracefully rather than hanging.

## Testing / verification

`owner` has no unit-test runner (dev/build/lint/typecheck only); do not add one
(consistent with Spec 1).

- **Primary success criterion:** `pnpm --filter owner typecheck`,
  `pnpm --filter owner lint`, and `pnpm --filter owner build` all green — the
  WS6 blocker cleared.
- **Preview smoke:** members list loads; dashboard "Membres actifs" count
  reflects all active members; check-in recent list resolves member names.
- The loop's termination/accumulation/cap are covered by typecheck + preview,
  matching the repo's actual tooling.

## Out of scope (deferred to later WS6 phases)

- Server-side search (`name`/`phone`/`email`) on the browse page.
- Cursor-pagination UI ("Charger plus").
- Removing the status tabs / requesting a backend status-filter param.
- Migrating `AddParticipant` and manual check-in pickers to async search.
- Deleting `lib/all-members.ts` (kept — it's the cursor-loop home now).

## Backend asks (carried, unchanged)

- Members **status filter** query param (enables server-side status filtering).
- **total** in `PaginationMeta` (restores exact counts, enables numbered pages).
