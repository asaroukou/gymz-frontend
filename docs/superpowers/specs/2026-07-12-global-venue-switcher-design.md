# Global venue switcher — design

Design spec for a single, always-visible current-venue switcher in the owner
app, replacing today's fragmented per-page venue selection.

## Problem

Venue selection is fragmented:

- No app-shell switcher. Three near-identical per-page dropdowns
  (`dashboard/venue-select.tsx`, `schedules/venue-select.tsx`,
  `checkins/venue-select.tsx`), each calling `useVenueSelection()`
  independently and synced only through the `iwp:venue` localStorage key **on
  mount** (no live in-memory sync).
- `/members`, `/staff`, and `/venues` have no venue concept; `/venues/[id]`
  scopes by the **route** while operational pages scope by the **stored
  selection** — two mechanisms.

Result: "which venue am I working on?" is never globally visible or consistent.

## Goal

Lift venue context into the app shell as **one always-visible current-venue
switcher** that is the single source of truth for the whole app. Frontend only;
members/staff stay org-wide (no backend change).

**Scope decision (locked): unified.** The switcher is the single venue context
everywhere, including the venue-management area. Opening `/venues/[id]` syncs the
switcher to that venue and vice versa — exactly one "current venue" app-wide.

## Architecture — one context, one instance

`VenueProvider` mounted in `app/(app)/layout.tsx`, wrapping the existing
`useVenueSelection()` logic **once** and exposing it through a
`useVenueContext()` hook. A single provider instance gives true in-memory sync
across pages (fixing the read-on-mount-only quirk) while still persisting the
selection to the `iwp:venue` localStorage key.

- **Files:**
  - New `apps/owner/lib/venue-context.tsx` — `VenueProvider` +
    `useVenueContext()`. Reuses `use-venue-selection.ts` as its internals
    (keep the hook; the provider calls it once).
  - `use-venue-selection.ts` stays as the underlying logic; its
    read/write/auto-select helpers are unchanged except for the default-select
    rule (below).
- **Context value** = `UseVenueSelectionResult` (already defined):
  `{ venues, isLoading, isError, error, selectedVenueId, selectedVenue,
  setSelectedVenueId }`.

## Default selection — always a current venue

With **≥1 venue**, always resolve a current venue: the stored id if it still
matches an existing venue, else the **first** venue. This removes the
"no venue selected" state on operational pages entirely.

- Change `useVenueSelection`'s auto-select effect: today it auto-selects only
  when exactly one venue exists. New rule: if there is no valid current
  selection and `venues.length >= 1`, select `venues[0]` (and persist it).
- **0 venues:** no current venue; the switcher renders a "Create venue" CTA
  (owner/admin → `/venues/new`). Owners with no venue are already redirected to
  `/onboarding` by the `(app)` layout, so this is an edge affordance, not a
  primary flow.

## Placement — topbar, leading slot

The mobile sidebar collapses into a drawer, so the **topbar is the only
always-visible chrome**. Add a `leading` slot to `AppShell` and render the
switcher there (top-left), idiomatic for a workspace switcher and visible on
desktop and mobile.

- **`packages/ui/src/app-shell.tsx`:** add an optional `leading?: ReactNode`
  prop; render it in the topbar `<header>` before the `ml-auto` actions group
  (after the mobile menu trigger). Existing `actions` (user menu) is unchanged.
- Covered by a `packages/ui` vitest case (ui has a test runner;
  `app-shell.test.tsx` exists).

## The switcher component

`apps/owner/components/venue-switcher.tsx` — a `DropdownMenu` trigger button
showing the current venue (building icon + name):

- Menu lists all venues as radio items (current one checked) → `onSelect`
  drives the selection (see route sync).
- Role-gated **"+ Add venue"** footer item (owner/admin via `useRole()`) →
  navigates to `/venues/new`.
- **Loading:** skeleton in place of the button.
- **Error:** disabled button labelled "Venues unavailable" (operational pages
  keep their own venue-scoped error/retry states).
- **0 venues:** the "Create venue" CTA (owner/admin) or nothing (other roles).
- Consumes `useVenueContext()`; no props.

## Unified route sync (`/venues/[id]`)

- **On a `/venues/[id]` route:** the switcher reflects the route venue
  (route → context). `/venues/[id]/page.tsx` sets the context selection to its
  route id on mount / when the id changes.
- **Choosing a venue in the switcher while on `/venues/[id]`:** navigate to
  `/venues/[newId]` (context → route) instead of only mutating context.
- **Everywhere else:** choosing a venue updates context only; operational pages
  re-query for the new venue.
- **Implementation:** the switcher reads `usePathname()`; if it matches
  `/venues/<id>` it calls `router.push('/venues/' + id)` on select, otherwise
  `setSelectedVenueId(id)`. The venue-detail page calls
  `setSelectedVenueId(routeId)` in an effect so the switcher label tracks the
  route even on direct navigation. Both paths converge on the same
  localStorage-backed context.

## Consumer migration

- **dashboard** (`app/(app)/page.tsx` + `dashboard/*`), **schedules**
  (`schedules/page.tsx` + tabs), **checkins** (`checkins/page.tsx` + panels):
  remove the local `useVenueSelection()` call and **delete** the three
  `venue-select.tsx` files; read `selectedVenueId` / `selectedVenue` from
  `useVenueContext()`. Data hooks (`useDashboardData`, `useFrontdeskData`,
  slots/attendance) keep their `venueId` argument — it now comes from context.
- **/venues/[id]:** add the mount effect syncing route id → context; resources
  and activities keep using the route id (now always equal to the current
  venue).
- **members, staff, /venues list:** org-wide; switcher stays visible but does
  not affect their data. No change to their queries.

## Data flow

`VenueProvider` (calls `useVenueSelection` once) → context value → `VenueSwitcher`
in the shell (reads current, writes selection with route-aware behavior) → every
page reads `selectedVenueId` from `useVenueContext()` → venue-scoped queries key
off it. `/venues/[id]` additionally pushes its route id into context on mount.

## Error handling

- Venues list fails to load → switcher shows the disabled "Venues unavailable"
  state; operational pages already surface their own venue-query errors.
- Stored `iwp:venue` points at a deleted venue → the default-select rule falls
  back to the first venue (or clears when 0 venues).
- localStorage unavailable (private mode) → selection simply doesn't persist;
  the in-memory context still works for the session (existing try/catch).

## Testing / verification

- **`packages/ui`:** vitest case that `AppShell` renders its `leading` slot in
  the topbar.
- **owner** has no unit runner (per prior specs); the provider default-select
  and route-sync logic are verified by `pnpm --filter owner typecheck`, `lint`,
  `build`, and browser preview:
  - Switch venue in the shell → dashboard/schedules/checkins all re-scope.
  - Open `/venues/[id]` → switcher reflects it; change switcher there →
    navigates to the other venue's detail.
  - Single-venue owner → switcher shows the one venue (auto-selected), no empty
    state.

## Out of scope

- Linking members/staff to venues (backend `venue_id` change).
- Any new venue-scoped data or endpoints.
- Reworking `/venues/[id]` resource/activity scoping beyond the context sync.
- Cross-tab live sync via the `storage` event (single provider handles
  in-app sync; cross-tab is not a requirement).
