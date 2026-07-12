# Global venue switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three per-page venue dropdowns with one always-visible current-venue switcher in the app shell, backed by a single shared `VenueProvider` context that is the app-wide source of truth (unified with the `/venues/[id]` route).

**Architecture:** A `VenueProvider` mounted in the `(app)` layout calls the existing `useVenueSelection()` hook once and exposes it via `useVenueContext()`. A new `AppShell` `leading` topbar slot renders a `VenueSwitcher` that reads/writes that context, navigating on `/venues/[id]`. The dashboard/schedules/checkins pages drop their local selection + `venue-select.tsx` files and read context instead; `/venues/[id]` syncs its route id into context.

**Tech Stack:** Next.js 15 (App Router) + React 19, TanStack Query + Orval hooks, next-intl (fr/en), shadcn/Radix (`@iziwellpass/ui`), Tailwind v4. `packages/ui` uses vitest + @testing-library/react.

---

## Conventions for this plan

- **Commits are ON HOLD** (user instruction). Each task ends with a **Verify** step, not a commit. Suggested commit messages are given for when the hold lifts; do **not** run `git commit`.
- **owner has no unit-test runner** (dev/build/lint/typecheck only) → verify with `pnpm --filter owner typecheck`, `lint`, `build`, and browser preview. **`packages/ui` has vitest** → the `AppShell` slot gets a real test there (`pnpm --filter @iziwellpass/ui test`).
- Run all commands from repo root `/Users/abdel/dev/gymz-v1/web`.

## Facts verified against the codebase

- `AppShell` (`packages/ui/src/app-shell.tsx`) topbar `<header>` currently holds the mobile `Sheet` menu trigger then `<div className="ml-auto flex items-center gap-3">{actions}</div>`. Props: `title, nav, actions?, currentPath?, linkComponent?, onNavigate?, openMenuLabel?, children`.
- `packages/ui` tests use bare @testing-library (`screen.getByText`, `.getAttribute`, `.toHaveProperty`) — **no jest-dom matchers** (`toBeInTheDocument` is unavailable; assert via `getByText` throwing or `.toHaveProperty`).
- `useVenueSelection()` (`apps/owner/lib/use-venue-selection.ts`) returns `UseVenueSelectionResult = { venues, isLoading, isError, error, selectedVenueId, selectedVenue, setSelectedVenueId }`, persists to localStorage `iwp:venue`, and today auto-selects **only** when exactly one venue exists.
- The three pages (`app/(app)/page.tsx`, `schedules/page.tsx`, `checkins/page.tsx`) each do `const selection = useVenueSelection();`, destructure the same fields, render `<VenueSelect selection={selection} />`, and gate the body on `!selectedVenueId`.
- `useRole()` from `@iziwellpass/auth/provider`; owner/admin gate pattern: `role === 'owner' || role === 'admin'`.
- `venues/[id]/page.tsx` reads its id via `useParams()`.

## File map

- **Modify** `packages/ui/src/app-shell.tsx` — add `leading?` topbar slot.
- **Modify** `packages/ui/src/app-shell.test.tsx` — test the slot.
- **Modify** `apps/owner/lib/use-venue-selection.ts` — always-a-current-venue default select.
- **Create** `apps/owner/lib/venue-context.tsx` — `VenueProvider` + `useVenueContext()`.
- **Create** `apps/owner/components/venue-switcher.tsx` — the shell switcher.
- **Modify** `apps/owner/app/(app)/layout.tsx` — mount provider + pass switcher as `leading`.
- **Modify** `apps/owner/app/(app)/page.tsx`, `schedules/page.tsx`, `checkins/page.tsx` — read context; drop `<VenueSelect>`.
- **Delete** `apps/owner/app/(app)/dashboard/venue-select.tsx`, `schedules/venue-select.tsx`, `checkins/venue-select.tsx`.
- **Modify** `apps/owner/app/(app)/venues/[id]/page.tsx` — sync route id → context.
- **Modify** `apps/owner/messages/{fr,en}.json` — switcher copy.

---

## Task 1: AppShell `leading` topbar slot

**Files:**
- Modify: `packages/ui/src/app-shell.tsx`
- Test: `packages/ui/src/app-shell.test.tsx`

- [ ] **Step 1: Write the failing test**

Add this case inside the existing `describe('AppShell', ...)` block in `packages/ui/src/app-shell.test.tsx`:

```tsx
  it('renders the leading slot in the topbar', () => {
    render(
      <AppShell nav={nav} title="IziWellPass" leading={<span>venue-switcher</span>}>
        <p>content</p>
      </AppShell>,
    );
    // getByText throws if the slot content is missing — that is the assertion.
    expect(screen.getByText('venue-switcher')).toHaveProperty('tagName', 'SPAN');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @iziwellpass/ui test -- app-shell 2>&1 | tail -20`
Expected: FAIL — TypeScript/prop error on `leading` (unknown prop) or the text not found.

- [ ] **Step 3: Add the prop and render it**

In `packages/ui/src/app-shell.tsx`, add to `AppShellProps` (after `actions?`):

```ts
  /** Left-hand topbar slot, before the actions group (e.g. a venue switcher). */
  leading?: ReactNode;
```

Add `leading` to the destructured params of `AppShell({ ... })` (next to `actions`), and render it in the topbar `<header>` between the mobile `Sheet` block and the actions `div`:

```tsx
            </Sheet>
            {leading}
            <div className="ml-auto flex items-center gap-3">{actions}</div>
```

(`leading` sits left after the menu trigger; `ml-auto` still pushes `actions` to the right.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @iziwellpass/ui test -- app-shell 2>&1 | tail -20`
Expected: PASS (all AppShell cases green).

- [ ] **Step 5: Verify types**

Run: `pnpm --filter @iziwellpass/ui typecheck 2>&1 | tail -3`
Expected: clean.

- [ ] **Step 6: Commit (DEFERRED — hold)** — `feat(ui): AppShell leading topbar slot`

---

## Task 2: Always-a-current-venue default select

**Files:**
- Modify: `apps/owner/lib/use-venue-selection.ts`

- [ ] **Step 1: Change the auto-select effect**

Replace the entire `useEffect(() => { ... }, [venues, selectedVenueId, setSelectedVenueId]);` block (the auto-select effect) with:

```ts
  // Always resolve a current venue when any exist: keep a still-valid stored
  // selection, otherwise fall back to the first venue. Clears only when there
  // are no venues at all.
  useEffect(() => {
    if (venues.length === 0) {
      if (selectedVenueId !== null) {
        setSelectedVenueIdState(null);
        writeStoredVenueId(null);
      }
      return;
    }
    const stillValid = selectedVenueId !== null && venues.some((v) => v.id === selectedVenueId);
    if (stillValid) {
      return;
    }
    const first = venues[0];
    if (first) {
      setSelectedVenueId(first.id);
    }
  }, [venues, selectedVenueId, setSelectedVenueId]);
```

This differs from the old behavior only in that it now auto-selects the first venue when more than one exists and there is no valid stored selection (previously it left the selection `null` in that case).

- [ ] **Step 2: Verify**

Run: `pnpm --filter owner typecheck 2>&1 | grep use-venue-selection || echo "use-venue-selection OK"`
Expected: `use-venue-selection OK`.

- [ ] **Step 3: Commit (DEFERRED — hold)** — `feat(owner): venue selection always resolves a current venue`

---

## Task 3: `VenueProvider` + `useVenueContext`

**Files:**
- Create: `apps/owner/lib/venue-context.tsx`

- [ ] **Step 1: Create the context module**

```tsx
'use client';

import { createContext, useContext, type ReactNode } from 'react';

import { useVenueSelection, type UseVenueSelectionResult } from '@/lib/use-venue-selection';

const VenueContext = createContext<UseVenueSelectionResult | null>(null);

/**
 * App-wide venue context. Mounted once in the (app) layout so every page and
 * the shell switcher share a single selection (in-memory synced, persisted to
 * localStorage by the underlying hook).
 */
export function VenueProvider({ children }: { children: ReactNode }) {
  const selection = useVenueSelection();
  return <VenueContext.Provider value={selection}>{children}</VenueContext.Provider>;
}

/** Read the shared venue selection. Throws if used outside `VenueProvider`. */
export function useVenueContext(): UseVenueSelectionResult {
  const ctx = useContext(VenueContext);
  if (ctx === null) {
    throw new Error('useVenueContext must be used within a VenueProvider');
  }
  return ctx;
}
```

- [ ] **Step 2: Verify**

Run: `pnpm --filter owner typecheck 2>&1 | grep venue-context || echo "venue-context OK"`
Expected: `venue-context OK`.

- [ ] **Step 3: Commit (DEFERRED — hold)** — `feat(owner): shared VenueProvider context`

---

## Task 4: `VenueSwitcher` component

**Files:**
- Create: `apps/owner/components/venue-switcher.tsx`
- Modify: `apps/owner/messages/fr.json`, `apps/owner/messages/en.json`

- [ ] **Step 1: Add i18n copy**

Add a top-level `venueSwitcher` namespace to **both** message files (parity).

`fr.json`:
```json
"venueSwitcher": {
  "label": "Établissement actuel",
  "placeholder": "Choisir un établissement",
  "addVenue": "Ajouter un lieu",
  "loadError": "Établissements indisponibles",
  "empty": "Aucun établissement"
}
```
`en.json`:
```json
"venueSwitcher": {
  "label": "Current venue",
  "placeholder": "Choose a venue",
  "addVenue": "Add a venue",
  "loadError": "Venues unavailable",
  "empty": "No venue"
}
```

- [ ] **Step 2: Create the component**

```tsx
'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Building2Icon, ChevronsUpDownIcon, PlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useRole } from '@iziwellpass/auth/provider';
import { Button } from '@iziwellpass/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@iziwellpass/ui/components/dropdown-menu';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';

import { useVenueContext } from '@/lib/venue-context';

/** Matches `/venues/<id>` but not `/venues`, `/venues/new`. Captures the id. */
const VENUE_DETAIL = /^\/venues\/([^/]+)$/;

function venueDetailId(pathname: string): string | null {
  const m = VENUE_DETAIL.exec(pathname);
  if (!m || m[1] === 'new') {
    return null;
  }
  return m[1];
}

export function VenueSwitcher() {
  const t = useTranslations('venueSwitcher');
  const router = useRouter();
  const pathname = usePathname();
  const role = useRole();
  const canAddVenue = role === 'owner' || role === 'admin';
  const { venues, isLoading, isError, selectedVenueId, selectedVenue, setSelectedVenueId } =
    useVenueContext();

  if (isLoading) {
    return <Skeleton className="h-9 w-44 rounded-full" />;
  }

  // No venues yet: offer creation to owner/admin, otherwise show nothing.
  if (!isError && venues.length === 0) {
    return canAddVenue ? (
      <Button variant="outline" size="sm" onClick={() => router.push('/venues/new')}>
        <PlusIcon aria-hidden />
        {t('addVenue')}
      </Button>
    ) : null;
  }

  const onSelect = (id: string) => {
    // Unified model: on a venue-detail route the switcher drives navigation;
    // everywhere else it just updates the shared context.
    setSelectedVenueId(id);
    if (venueDetailId(pathname) !== null) {
      router.push(`/venues/${id}`);
    }
  };

  const triggerLabel = isError
    ? t('loadError')
    : (selectedVenue?.name ?? t('placeholder'));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isError}
          aria-label={t('label')}
          className="max-w-[220px] gap-2"
        >
          <Building2Icon aria-hidden className="shrink-0" />
          <span className="truncate">{triggerLabel}</span>
          <ChevronsUpDownIcon aria-hidden className="ml-auto shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[220px]">
        <DropdownMenuRadioGroup value={selectedVenueId ?? undefined} onValueChange={onSelect}>
          {venues.map((venue) => (
            <DropdownMenuRadioItem key={venue.id} value={venue.id}>
              {venue.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        {canAddVenue ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push('/venues/new')}>
              <PlusIcon aria-hidden />
              {t('addVenue')}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

Notes:
- The `isError` branch renders a disabled trigger labelled with `loadError` (no menu interaction needed since `disabled`).
- Confirm `DropdownMenuRadioGroup`/`DropdownMenuRadioItem` are exported from `@iziwellpass/ui/components/dropdown-menu` (they are — used in `app/(app)/layout.tsx`'s theme menu). If not, use plain `DropdownMenuItem`s with a check icon on the selected one.

- [ ] **Step 3: Verify**

Run:
```bash
pnpm --filter owner typecheck 2>&1 | grep venue-switcher || echo "venue-switcher OK"
cd apps/owner && node -e 'const fr=require("./messages/fr.json"),en=require("./messages/en.json");function k(o,p=""){return Object.entries(o).flatMap(([a,v])=>v&&typeof v==="object"&&!Array.isArray(v)?k(v,p+a+"."):[p+a]);}const f=new Set(k(fr)),e=new Set(k(en));const of=[...f].filter(x=>!e.has(x)),oe=[...e].filter(x=>!f.has(x));console.log(of.length||oe.length?["GAPS",of,oe]:"parity OK");'
```
Expected: `venue-switcher OK`; `parity OK`.

- [ ] **Step 4: Commit (DEFERRED — hold)** — `feat(owner): VenueSwitcher shell component`

---

## Task 5: Mount the provider + switcher in the app shell

**Files:**
- Modify: `apps/owner/app/(app)/layout.tsx`

- [ ] **Step 1: Import the provider and switcher**

Add near the other `@/` imports:
```ts
import { VenueProvider } from '@/lib/venue-context';
import { VenueSwitcher } from '@/components/venue-switcher';
```

- [ ] **Step 2: Wrap the shell in the provider and pass the switcher**

The provider must sit **inside** the signed-in guards (it calls `useListVenues`, which needs the authed session) but **wrap** the `AppShell`. Change the final `return (<AppShell ... >{children}</AppShell>)` to:

```tsx
  return (
    <VenueProvider>
      <AppShell
        title="IziWellPass"
        nav={nav}
        linkComponent={NavLink}
        currentPath={pathname}
        openMenuLabel={tShell('openMenu')}
        leading={<VenueSwitcher />}
        actions={<UserMenu />}
      >
        {children}
      </AppShell>
    </VenueProvider>
  );
```

Leave the earlier `loading` / `signed-out` / `nav.length === 0` early returns unchanged (they render before any venue context is needed).

- [ ] **Step 3: Verify**

Run: `pnpm --filter owner typecheck 2>&1 | grep 'app)/layout' || echo "layout OK"` and `pnpm --filter owner lint 2>&1 | tail -3`
Expected: `layout OK`; lint clean.

- [ ] **Step 4: Commit (DEFERRED — hold)** — `feat(owner): mount venue provider + switcher in shell`

---

## Task 6: Migrate the three pages off local selection

**Files:**
- Modify: `apps/owner/app/(app)/page.tsx`
- Modify: `apps/owner/app/(app)/schedules/page.tsx`
- Modify: `apps/owner/app/(app)/checkins/page.tsx`
- Delete: `apps/owner/app/(app)/dashboard/venue-select.tsx`
- Delete: `apps/owner/app/(app)/schedules/venue-select.tsx`
- Delete: `apps/owner/app/(app)/checkins/venue-select.tsx`

For **each** of the three pages, apply the same three edits:

- [ ] **Step 1: Swap the hook**

Replace `import { useVenueSelection } from '@/lib/use-venue-selection';` with
`import { useVenueContext } from '@/lib/venue-context';`, and replace
`const selection = useVenueSelection();` with `const selection = useVenueContext();`.

Keep the existing destructure line (`const { venues, isLoading, isError, error, selectedVenueId, selectedVenue } = selection;`) unchanged — the context value has the same shape.

- [ ] **Step 2: Remove the in-page selector**

Delete the `<VenueSelect selection={selection} />` element from the page's header row, and remove its import (`import { VenueSelect } from './venue-select';` or `'./dashboard/venue-select';`). Leave the surrounding header/title markup; if the selector was the only child of a flex row, the row can stay (it just holds the title now). Do not remove the `!selectedVenueId` guard branch — with 0 venues `selectedVenueId` is still `null`, so that branch is the no-venue empty state.

- [ ] **Step 3: Delete the three `venue-select.tsx` files**

```bash
cd /Users/abdel/dev/gymz-v1/web
rm "apps/owner/app/(app)/dashboard/venue-select.tsx" \
   "apps/owner/app/(app)/schedules/venue-select.tsx" \
   "apps/owner/app/(app)/checkins/venue-select.tsx"
```

- [ ] **Step 4: Verify no dangling references**

Run:
```bash
cd /Users/abdel/dev/gymz-v1/web
grep -rn "venue-select\|useVenueSelection" apps/owner/app | grep -v '\.next' || echo "no dangling refs"
pnpm --filter owner typecheck 2>&1 | tail -6
pnpm --filter owner lint 2>&1 | tail -3
```
Expected: `no dangling refs` (the only remaining `useVenueSelection` reference is inside `lib/venue-context.tsx`, which is under `apps/owner/lib`, not `apps/owner/app` — so the grep scoped to `app` is clean); typecheck + lint clean. (`use-venue-selection.ts` itself stays — it's the provider's internals.)

- [ ] **Step 5: Commit (DEFERRED — hold)** — `refactor(owner): pages read venue from shared context`

---

## Task 7: Sync `/venues/[id]` route → context

**Files:**
- Modify: `apps/owner/app/(app)/venues/[id]/page.tsx`

- [ ] **Step 1: Sync the route id into context on mount/change**

In `VenueDetailContent` (the component that already has the venue id from `useParams()`), add the context hook and an effect. Add imports if missing (`useEffect` from `react`; `useVenueContext` from `@/lib/venue-context`). Using the existing route id variable (it is derived from `useParams()` — reuse that exact variable name in the effect):

```tsx
  const { setSelectedVenueId } = useVenueContext();

  // Unified venue context: opening a venue's detail page makes it the current
  // venue, so the shell switcher reflects the route (route -> context).
  useEffect(() => {
    if (venueId) {
      setSelectedVenueId(venueId);
    }
  }, [venueId, setSelectedVenueId]);
```

Replace `venueId` above with the file's actual route-id variable name (e.g. `id` from `useParams()`). Place the effect near the top of the component with the other hooks (before any early return, so hook order is stable).

- [ ] **Step 2: Verify**

Run: `pnpm --filter owner typecheck 2>&1 | grep 'venues/\[id\]' || echo "venue detail OK"` and `pnpm --filter owner lint 2>&1 | tail -3`
Expected: `venue detail OK`; lint clean. Confirm the new `useEffect` sits with the other hooks (no conditional-hook lint error).

- [ ] **Step 3: Commit (DEFERRED — hold)** — `feat(owner): venue detail syncs current venue`

---

## Task 8: Final verification

- [ ] **Step 1: ui test + full typecheck/lint/build**

Run:
```bash
cd /Users/abdel/dev/gymz-v1/web
pnpm --filter @iziwellpass/ui test 2>&1 | tail -8
pnpm --filter @iziwellpass/ui typecheck && \
pnpm --filter owner typecheck && \
pnpm --filter owner lint && \
pnpm --filter owner build 2>&1 | tail -15
```
Expected: ui tests green; all typecheck/lint pass; build completes.

- [ ] **Step 2: i18n parity**

Run:
```bash
cd /Users/abdel/dev/gymz-v1/web/apps/owner && node -e '
const fr=require("./messages/fr.json"),en=require("./messages/en.json");
function keys(o,p=""){return Object.entries(o).flatMap(([k,v])=>v&&typeof v==="object"&&!Array.isArray(v)?keys(v,p+k+"."):[p+k]);}
const fk=new Set(keys(fr)),ek=new Set(keys(en));
const onlyFr=[...fk].filter(k=>!ek.has(k)),onlyEn=[...ek].filter(k=>!fk.has(k));
if(onlyFr.length||onlyEn.length){console.log("PARITY GAPS",{onlyFr,onlyEn});process.exit(1);}
console.log("i18n parity OK");
'
```
Expected: `i18n parity OK`.

- [ ] **Step 3: Preview smoke test**

With the dev server running (`preview_start`; another chat may hold port 3011 — start this session's server if needed), verify with `preview_*` tools, no console errors:
- The switcher shows in the top-left of every page, on desktop and mobile widths.
- Switching venue re-scopes dashboard, schedules, and checkins (their data changes).
- Open a venue via `/venues/[id]` → the switcher reflects that venue; change the switcher there → it navigates to the other venue's detail page.
- A single-venue account auto-selects and shows the one venue.
- `/members`, `/staff`, `/venues` still render with the switcher visible (inert).
Capture a screenshot of an operational page showing the switcher.

- [ ] **Step 4: Commit (DEFERRED — hold)**

When the hold lifts, ship as the tasks above (or squash): `feat: global venue switcher`.

---

## Self-review notes (author)

- **Spec coverage:** provider/context → Task 3; default-select change → Task 2; AppShell slot + test → Task 1; switcher (role-gated add, error/loading/empty, route sync) → Task 4; shell mount → Task 5; consumer migration + file deletes → Task 6; `/venues/[id]` route→context sync → Task 7; verification → Task 8. All spec sections mapped.
- **Type consistency:** `useVenueContext()` returns `UseVenueSelectionResult`, the same shape the pages already destructure; `VenueSwitcher` and the pages consume identical field names; `setSelectedVenueId` used consistently in Tasks 4 and 7.
- **Ordering:** Task 1 (ui) and Task 2 (default-select) are independent; Tasks 3→4→5 build the context/switcher/mount chain; Task 6 depends on Task 3 (context exists); Task 7 depends on Task 3. Build goes green incrementally; the switcher is only *rendered* after Task 5.
- **No test file for owner logic:** owner has no runner (per prior specs); provider default-select + route sync are covered by typecheck + preview. The AppShell slot — the one piece in a test-capable package — gets a vitest case.
