# SP-G Today Snapshot and Plan Capabilities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the owner dashboard onto the backend's one-call day snapshot (lifecycle tiles, date control, « À régler » tab with in-place fixes) and make the console aware of the tenant plan (lock glyphs, locked pages and buttons, upgrade vs « Accès refusé » toasts, sidebar plan row, `/plan` comparison).

**Architecture:** Pure helpers (`lib/today.ts`, `lib/capabilities.ts`, `lib/plan-errors.ts`) carry every rule and are unit-tested. A `useTodaySnapshot` hook wraps the generated `useVenueToday`; the dashboard, the Accueil stats and the check-in engine share its cache. A `CapabilitiesProvider` in the `(app)` layout loads `/capabilities` once and fails open; small presentational components (`LockedPage`, `LockedButton`, `PlanRow`, `NavLock`) read it. The mock server gains `/today`, `/capabilities` and a `MOCK_PLAN` feature gate.

**Tech Stack:** Next 15 (app router, client components), React 19, TanStack Query 5 via orval-generated hooks (`@iziwellpass/api/generated`), next-intl 4, Radix via `@iziwellpass/ui`, sonner, lucide-react, vitest 3.

**Spec:** `docs/superpowers/specs/2026-09-26-today-capabilities-design.md` (T1–T13). Read it before any task.

## Global Constraints

- The canvas `screens.pen` is the source of truth for look and copy (T1); frames `s8LRy3`, `D2YWBH`, `r5BGk`, `zCLZV`, `p6hCM` are exported to `docs/design-refs/comptoir-clair/wave-2/<id>.png` with verbatim copy in `INVENTORY.md`.
- Which feature locks follows the backend matrix: free = none; starter = `activity_pricing`, `qr_checkin`, `staff_accounts`, `member_self_service`; pro and enterprise = all seven (T1, spec §5).
- Locking reads the server's `capabilities` array only; the local matrix is for labels (T8). While loading or on any capabilities error nothing locks and the plan row is hidden (T7).
- Upgrade surfaces (plan row, « Passer au plan … », « Comparer les plans », « Voir les plans », `/plan`) are owner/admin only (T10).
- Locked controls use `aria-disabled="true"`, never `disabled`; activating one shows the upgrade toast and makes no API call (T11).
- No new dependencies. No `@testing-library/jest-dom`.
- Design guard (`pnpm check:design`) bans the literal `eyebrow`, `font-bold` and shadows. Lucide icons at stroke 1.5, never filled. Sentence case. Mono numerals via existing `font-numeric`/tile primitives.
- Touch targets ≥ 44px below `md`; desktop small buttons stay 36px (D11/D12 rulings).
- Dialogs/sheets opened from a row pass `restoreFocusTo` (D12) using `useFocusRegistry` from `@/components/focus-registry`.
- Message files `apps/owner/messages/{fr,en}.json`: edit by inserting text with the Edit tool only. **Never** `JSON.parse` + `JSON.stringify` them. Keep fr/en key parity.
- Parity check (run from `web/`): `node -e "const k=(o,p='')=>Object.entries(o).flatMap(([a,v])=>v&&typeof v==='object'?k(v,p+a+'.'):[p+a]);const f=k(require('./apps/owner/messages/fr.json')).sort(),e=k(require('./apps/owner/messages/en.json')).sort();console.log(JSON.stringify(f)===JSON.stringify(e)?'parity ok':'MISMATCH '+f.filter(x=>!e.includes(x)).concat(e.filter(x=>!f.includes(x))).join(','))"`
- Gates (run from `web/`): `pnpm check:design && pnpm typecheck && pnpm lint && pnpm test`. `pnpm test` prints a harmless « Swagger schema validation failed » warning.
- **Dev servers:** the user's own mock runs on port 8090 from another worktree — never kill or restart it. Run this branch's mock with `PORT=8091` (plus `MOCK_PLAN=…` when needed) and its Next dev with `API_PROXY_TARGET=http://localhost:8091 NODE_PATH=/tmp/t3-nodepath pnpm --filter @iziwellpass/owner exec next dev --port 3021`. `/tmp/t3-nodepath/tailwindcss` must be a symlink to `<worktree>/node_modules/.pnpm/tailwindcss@4.3.2/node_modules/tailwindcss` (create it if missing; fresh worktrees hoist Tailwind v3). Never run `next build` while that dev server is up.
- Browser checks drive Chrome for Testing over CDP from a `/tmp` script; sign in with the owner account the controller gives you. Never write credentials into any file in the repo.
- Commits: conventional style (`feat(owner): …`, `test(owner): …`), each ending with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.

**Plan rulings (recorded here so implementers and reviewers share them):**

- **R1 — QR check-in is not pre-emptively locked.** Spec §6.1 asked for a locked QR mode pill and scanner pill on free. The same mode and scanner also carry marketplace pass tokens (`POST /platform/v1/checkins/pass`), which are not plan-gated, so locking the mode would block pass holders at a free venue. Instead, the two member-QR routes surface the upgrade toast when the server answers `FEATURE_NOT_AVAILABLE` (Task 8). Cost if wrong: a free venue's staff learn about the gate on first scan instead of from a lock glyph.
- **R2 — `dashboard.errors.forbidden`** carries « Accès refusé. » for the snapshot's 403 (Task 4), so the dashboard does not depend on the `capabilities` namespace that lands in Task 7.
- **R3 — `/plan` is gated through `lib/nav.ts`'s new `HIDDEN_ROUTES`** so `RequirePageAccess href="/plan"` works without a nav entry.
- **R4 — The date input keeps its popover open while typing** and applies only complete years 2000–2100 (`parseDayInput`); Enter or an outside click closes it. Closing on every change would shut it mid-typing of the year.

## Review Focus

1. **Venue timezone outside the backend allowlist** → `start_local` is null; the tile and row times must fall back to `formatTime(start_utc, timeZone)`, never show « — » or a raw ISO string. Pinned in Task 1 (`slotTime`).
2. **Dashboard left open across midnight** → « Aujourd'hui » must mean the new day on the next render; the selection stores `{ kind: 'today' }`, not a date key. Pinned in Task 1 (`resolveDay`).
3. **Typing a year in the date input** (`0002-09-21`, `2-09-21`, empty) → ignored until a full 2000–2100 date exists. Pinned in Task 1 (`parseDayInput`).
4. **A capacity-0 or unknown-plan response** → `over_capacity` still derives (1 > 0), and a plan string the console does not know (`'business'`) renders its raw name and grants only what the server lists. Pinned in Tasks 1 and 2.
5. **Owner/admin 403 `MFA_ENROLLMENT_REQUIRED` on a gated mutation** → neither the upgrade toast nor « Accès refusé »; it falls through to the call site's generic copy (SP-F will route it). Pinned in Task 2 (`isForbidden`).

---

## File Structure

| Path | Task | Responsibility |
| --- | --- | --- |
| `apps/owner/lib/today.ts` (+ `.test.ts`) | 1 | Snapshot rules: reason, tile state, tile window, attention rows, day selection, date labels |
| `apps/owner/lib/capabilities.ts` (+ `.test.ts`) | 2 | Display matrix, `minPlanFor`, value builder for the provider, upgrade href, role rule |
| `apps/owner/lib/plan-errors.ts` (+ `.test.ts`) | 2 | `isFeatureNotAvailable`, `isForbidden` |
| `apps/owner/lib/nav.ts` (+ test) | 2 | `capability` on nav items, `HIDDEN_ROUTES` |
| `apps/owner/scripts/mock-server.mjs` | 3 | `/today`, `/capabilities`, `MOCK_PLAN` gates, attention seeds |
| `apps/owner/lib/use-today-snapshot.ts` | 4 | `useTodaySnapshot`, `attendanceOf` |
| `apps/owner/app/(app)/dashboard/{use-dashboard-data,kpi-row}.ts(x)`, `app/(app)/checkins/{use-frontdesk-data,day-stats,page}.ts(x)`, `components/checkin/use-register-checkin.ts` | 4 | Stats strip on the snapshot, check-in invalidation |
| `apps/owner/app/(app)/dashboard/today-tiles.tsx`, `day-control.tsx`; delete `lib/today-tiles.ts(+test)` | 5 | Lifecycle tiles and date control |
| `apps/owner/app/(app)/dashboard/attention-list.tsx`, `app/(app)/page.tsx`, `app/(app)/schedules/bookings-sheet.tsx` | 6 | « À régler » tab and quick actions |
| `packages/ui/src/app-shell.tsx` (+ test) | 7 | `NavItem.trailing` slot |
| `apps/owner/components/capabilities/{capabilities-provider,nav-lock,plan-row}.tsx`, `app/(app)/layout.tsx`, `app/(app)/plan/page.tsx` | 7 | Provider, nav locks, plan row, `/plan` |
| `apps/owner/components/capabilities/{locked-page,locked-button,require-capability,use-upgrade-toast}.tsx` and call sites | 8 | Locks on pages/actions, toasts |

Worktree: `web/.worktrees/feat-today-capabilities`, branch `feat/today-capabilities` off local `main` (which holds the spec and this plan). SP-D (`feat/venue-gallery`) is unmerged and also edits `mock-server.mjs` and `venues/page.tsx`; do not pull it in.

---

### Task 1: Snapshot rules (`lib/today.ts`)

**Files:**
- Create: `apps/owner/lib/today.ts`
- Test: `apps/owner/lib/today.test.ts`

**Interfaces:**
- Consumes: `TodaySlot`, `TodaySnapshot` from `@iziwellpass/api/schemas`; `formatTime` from `@/lib/datetime`.
- Produces:
  - `type AttentionReason = 'no_instructor' | 'over_capacity' | 'no_arrivals' | 'unknown'`
  - `type TileTone = 'upcoming' | 'active' | 'completed' | 'cancelled'`
  - `type TileBadge = 'attention' | 'active' | 'completed' | 'cancelled'`
  - `interface TileState { tone: TileTone; badge: TileBadge | null; reason: AttentionReason | null }`
  - `type DaySelection = { kind: 'today' } | { kind: 'tomorrow' } | { kind: 'date'; date: string }`
  - `attentionReason(slot: TodaySlot): AttentionReason | null`
  - `tileState(slot: TodaySlot): TileState`
  - `pickTiles(slots: readonly TodaySlot[], max?: number): { tiles: TodaySlot[]; total: number }`
  - `attentionRows(snapshot: TodaySnapshot): TodaySlot[]`
  - `slotTime(slot: TodaySlot, timeZone: string | undefined): string`
  - `addDays(dateKey: string, n: number): string`
  - `resolveDay(selection: DaySelection, todayKey: string): string`
  - `parseDayInput(value: string): string | null`
  - `dayLabel(dateKey: string, locale: string): string`

- [ ] **Step 1: Write the failing tests**

Create `apps/owner/lib/today.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import type { TodaySlot, TodaySnapshot } from '@iziwellpass/api/schemas';

import {
  addDays,
  attentionReason,
  attentionRows,
  dayLabel,
  parseDayInput,
  pickTiles,
  resolveDay,
  slotTime,
  tileState,
} from './today';

function slot(id: string, extra: Partial<TodaySlot> = {}): TodaySlot {
  return {
    slot_id: id,
    schedule_id: `sch-${id}`,
    resource_id: 'res-1',
    start_utc: '2026-09-21T08:00:00Z',
    end_utc: '2026-09-21T09:00:00Z',
    start_local: '2026-09-21T08:00:00+00:00',
    capacity: 10,
    booked_count: 4,
    checked_in_count: 2,
    lifecycle: 'upcoming',
    needs_attention: false,
    instructor_staff_id: 'staff-1',
    instructor_name: 'Aïssatou Ba',
    resource_name: 'Salle A',
    title: 'Yoga',
    ...extra,
  } as TodaySlot;
}

describe('attentionReason', () => {
  it('is null when the slot is not flagged', () => {
    expect(attentionReason(slot('a'))).toBeNull();
  });

  it('is null for a cancelled slot even if flagged', () => {
    expect(attentionReason(slot('a', { lifecycle: 'cancelled', needs_attention: true }))).toBeNull();
  });

  it('prefers no_instructor over over_capacity and no_arrivals', () => {
    const s = slot('a', {
      needs_attention: true,
      lifecycle: 'active',
      checked_in_count: 0,
      booked_count: 20,
      capacity: 18,
      instructor_staff_id: null,
    });
    expect(attentionReason(s)).toBe('no_instructor');
  });

  it('prefers over_capacity over no_arrivals', () => {
    const s = slot('a', {
      needs_attention: true,
      lifecycle: 'active',
      checked_in_count: 0,
      booked_count: 20,
      capacity: 18,
    });
    expect(attentionReason(s)).toBe('over_capacity');
  });

  it('derives over_capacity for a capacity-0 slot with a booking', () => {
    const s = slot('a', { needs_attention: true, booked_count: 1, capacity: 0 });
    expect(attentionReason(s)).toBe('over_capacity');
  });

  it('derives no_arrivals for an active slot with nobody checked in', () => {
    const s = slot('a', { needs_attention: true, lifecycle: 'active', checked_in_count: 0 });
    expect(attentionReason(s)).toBe('no_arrivals');
  });

  it('is unknown when flagged but no rule matches', () => {
    expect(attentionReason(slot('a', { needs_attention: true }))).toBe('unknown');
  });

  it('does not call a slot with zero bookings instructor-less', () => {
    const s = slot('a', { needs_attention: true, booked_count: 0, instructor_staff_id: null });
    expect(attentionReason(s)).toBe('unknown');
  });
});

describe('tileState', () => {
  it('maps every lifecycle without a flag', () => {
    expect(tileState(slot('a'))).toEqual({ tone: 'upcoming', badge: null, reason: null });
    expect(tileState(slot('a', { lifecycle: 'active' }))).toEqual({
      tone: 'active',
      badge: 'active',
      reason: null,
    });
    expect(tileState(slot('a', { lifecycle: 'completed' }))).toEqual({
      tone: 'completed',
      badge: 'completed',
      reason: null,
    });
    expect(tileState(slot('a', { lifecycle: 'cancelled' }))).toEqual({
      tone: 'cancelled',
      badge: 'cancelled',
      reason: null,
    });
  });

  it('puts the attention badge over the lifecycle badge and keeps the lifecycle tone', () => {
    const s = slot('a', { lifecycle: 'active', needs_attention: true, checked_in_count: 0 });
    expect(tileState(s)).toEqual({ tone: 'active', badge: 'attention', reason: 'no_arrivals' });
  });

  it('never flags a cancelled tile', () => {
    const s = slot('a', { lifecycle: 'cancelled', needs_attention: true });
    expect(tileState(s)).toEqual({ tone: 'cancelled', badge: 'cancelled', reason: null });
  });
});

describe('pickTiles', () => {
  const at = (h: number, lifecycle: TodaySlot['lifecycle']) =>
    slot(`s${h}`, {
      start_utc: `2026-09-21T${String(h).padStart(2, '0')}:00:00Z`,
      lifecycle,
    });

  it('returns every slot, sorted, when there are at most max', () => {
    const { tiles, total } = pickTiles([at(12, 'upcoming'), at(8, 'completed')]);
    expect(tiles.map((s) => s.slot_id)).toEqual(['s8', 's12']);
    expect(total).toBe(2);
  });

  it('starts one slot before the first live slot', () => {
    const slots = [
      at(6, 'completed'),
      at(7, 'completed'),
      at(8, 'cancelled'),
      at(9, 'active'),
      at(12, 'upcoming'),
      at(18, 'upcoming'),
      at(20, 'upcoming'),
    ];
    const { tiles, total } = pickTiles(slots);
    expect(tiles.map((s) => s.slot_id)).toEqual(['s8', 's9', 's12', 's18']);
    expect(total).toBe(7);
  });

  it('clamps the window to the end of the day', () => {
    const slots = [
      at(6, 'completed'),
      at(7, 'completed'),
      at(8, 'completed'),
      at(9, 'completed'),
      at(20, 'upcoming'),
    ];
    expect(pickTiles(slots).tiles.map((s) => s.slot_id)).toEqual(['s7', 's8', 's9', 's20']);
  });

  it('shows the last max slots when the whole day is past', () => {
    const slots = [6, 7, 8, 9, 10].map((h) => at(h, 'completed'));
    expect(pickTiles(slots).tiles.map((s) => s.slot_id)).toEqual(['s7', 's8', 's9', 's10']);
  });

  it('starts at the first slot when the first slot is live', () => {
    const slots = [6, 7, 8, 9, 10].map((h) => at(h, 'upcoming'));
    expect(pickTiles(slots).tiles.map((s) => s.slot_id)).toEqual(['s6', 's7', 's8', 's9']);
  });
});

describe('attentionRows', () => {
  it('lists flagged, non-cancelled slots in start order', () => {
    const snapshot = {
      slots: [
        slot('late', { start_utc: '2026-09-21T18:00:00Z', needs_attention: true }),
        slot('ok', { start_utc: '2026-09-21T07:00:00Z' }),
        slot('early', { start_utc: '2026-09-21T08:00:00Z', needs_attention: true }),
        slot('gone', { lifecycle: 'cancelled', needs_attention: true }),
      ],
    } as TodaySnapshot;
    expect(attentionRows(snapshot).map((s) => s.slot_id)).toEqual(['early', 'late']);
  });
});

describe('slotTime', () => {
  it('reads the wall clock from start_local', () => {
    expect(slotTime(slot('a', { start_local: '2026-09-21T09:15:00+01:00' }), 'Africa/Lagos')).toBe(
      '09:15',
    );
  });

  it('falls back to the venue timezone when start_local is missing', () => {
    expect(
      slotTime(slot('a', { start_local: null, start_utc: '2026-09-21T08:30:00Z' }), 'Africa/Lagos'),
    ).toBe('09:30');
  });
});

describe('day helpers', () => {
  it('adds days across month and year ends', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('resolves a selection against the current day key', () => {
    expect(resolveDay({ kind: 'today' }, '2026-09-21')).toBe('2026-09-21');
    expect(resolveDay({ kind: 'tomorrow' }, '2026-09-21')).toBe('2026-09-22');
    expect(resolveDay({ kind: 'date', date: '2026-10-05' }, '2026-09-21')).toBe('2026-10-05');
  });

  it('follows the day key when it rolls over midnight', () => {
    expect(resolveDay({ kind: 'today' }, '2026-09-22')).toBe('2026-09-22');
  });

  it('accepts only complete dates with a year from 2000 to 2100', () => {
    expect(parseDayInput('2026-09-21')).toBe('2026-09-21');
    expect(parseDayInput('0002-09-21')).toBeNull();
    expect(parseDayInput('2-09-21')).toBeNull();
    expect(parseDayInput('')).toBeNull();
    expect(parseDayInput('2026-02-30')).toBeNull();
    expect(parseDayInput('2101-01-01')).toBeNull();
  });

  it('labels a day key with a capitalised weekday', () => {
    expect(dayLabel('2026-09-21', 'fr')).toBe('Lundi 21 septembre');
    expect(dayLabel('2026-09-21', 'en')).toBe('Monday 21 September');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @iziwellpass/owner exec vitest run lib/today.test.ts`
Expected: FAIL (`Cannot find module './today'` or missing exports).

- [ ] **Step 3: Implement `lib/today.ts`**

```ts
import type { TodaySlot, TodaySnapshot } from '@iziwellpass/api/schemas';

import { formatTime } from './datetime';

export type AttentionReason = 'no_instructor' | 'over_capacity' | 'no_arrivals' | 'unknown';
export type TileTone = 'upcoming' | 'active' | 'completed' | 'cancelled';
export type TileBadge = 'attention' | 'active' | 'completed' | 'cancelled';

export interface TileState {
  tone: TileTone;
  badge: TileBadge | null;
  reason: AttentionReason | null;
}

export type DaySelection = { kind: 'today' } | { kind: 'tomorrow' } | { kind: 'date'; date: string };

/**
 * Why a flagged slot needs attention. The backend sends only the boolean
 * (`needs_attention`); the reason is re-derived with a fixed priority so the
 * most actionable fix is named first. `unknown` covers a backend rule the
 * console does not know yet. Cancelled slots are never flagged (spec T2).
 */
export function attentionReason(slot: TodaySlot): AttentionReason | null {
  if (!slot.needs_attention || slot.lifecycle === 'cancelled') return null;
  if (slot.booked_count > 0 && !slot.instructor_staff_id) return 'no_instructor';
  if (slot.booked_count > slot.capacity) return 'over_capacity';
  if (slot.lifecycle === 'active' && slot.checked_in_count === 0) return 'no_arrivals';
  return 'unknown';
}

const LIFECYCLE_BADGE: Record<TileTone, TileBadge | null> = {
  upcoming: null,
  active: 'active',
  completed: 'completed',
  cancelled: 'cancelled',
};

/** Tint follows the lifecycle; a flag swaps only the badge (spec §4.2). */
export function tileState(slot: TodaySlot): TileState {
  const tone = slot.lifecycle;
  const reason = attentionReason(slot);
  return { tone, badge: reason ? 'attention' : LIFECYCLE_BADGE[tone], reason };
}

function byStart(a: TodaySlot, b: TodaySlot): number {
  return a.start_utc.localeCompare(b.start_utc);
}

/**
 * The dashboard's tile window: when the day has more than `max` slots, start
 * one slot before the first slot still to come (so one past session stays
 * for context), clamped to the day; when every slot is past, the last `max`.
 * `total` counts every slot, cancelled included, for « Voir les N séances ».
 */
export function pickTiles(
  slots: readonly TodaySlot[],
  max = 4,
): { tiles: TodaySlot[]; total: number } {
  const sorted = [...slots].sort(byStart);
  const total = sorted.length;
  if (total <= max) return { tiles: sorted, total };
  const firstLive = sorted.findIndex(
    (s) => s.lifecycle !== 'completed' && s.lifecycle !== 'cancelled',
  );
  const start =
    firstLive === -1 ? total - max : Math.min(Math.max(firstLive - 1, 0), total - max);
  return { tiles: sorted.slice(start, start + max), total };
}

/** Flagged, non-cancelled slots of the snapshot, earliest first. */
export function attentionRows(snapshot: TodaySnapshot): TodaySlot[] {
  return snapshot.slots
    .filter((s) => s.needs_attention && s.lifecycle !== 'cancelled')
    .sort(byStart);
}

/**
 * « HH:MM » for a slot. `start_local` carries the venue's wall clock when the
 * venue timezone is on the backend allowlist; otherwise it is null and the
 * UTC instant is formatted in the venue timezone instead.
 */
export function slotTime(slot: TodaySlot, timeZone: string | undefined): string {
  const local = slot.start_local;
  if (local && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(local)) return local.slice(11, 16);
  return formatTime(slot.start_utc, timeZone);
}

function parts(dateKey: string): [number, number, number] {
  const [y, m, d] = dateKey.split('-').map(Number);
  return [y ?? NaN, m ?? NaN, d ?? NaN];
}

/** Calendar arithmetic on a `YYYY-MM-DD` key, timezone-free. */
export function addDays(dateKey: string, n: number): string {
  const [y, m, d] = parts(dateKey);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** The day key a selection points at, resolved against the current venue day. */
export function resolveDay(selection: DaySelection, todayKey: string): string {
  if (selection.kind === 'today') return todayKey;
  if (selection.kind === 'tomorrow') return addDays(todayKey, 1);
  return selection.date;
}

/**
 * A native date input's value, accepted only once it is a real calendar day
 * with a year from 2000 to 2100 — Chrome emits `0002-09-21` while the year is
 * being typed, which must not become a query.
 */
export function parseDayInput(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [y, m, d] = parts(value);
  if (y < 2000 || y > 2100) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return value;
}

/** « Lundi 21 septembre » for a day key, in the given locale. */
export function dayLabel(dateKey: string, locale: string): string {
  const [y, m, d] = parts(dateKey);
  const text = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
  return text.charAt(0).toUpperCase() + text.slice(1);
}
```

If the `en` label comes out as `Monday, 21 September` or `Monday 21 September` depends on the ICU data; if the test fails only on that comma, change the `en` expectation to what `Intl` returns for `en` on this Node (run `node -e "console.log(new Intl.DateTimeFormat('en',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2026,8,21,12))))"`) — the fr expectation must stay exactly `Lundi 21 septembre`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @iziwellpass/owner exec vitest run lib/today.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck and commit**

```bash
pnpm --filter @iziwellpass/owner typecheck
git add apps/owner/lib/today.ts apps/owner/lib/today.test.ts
git commit -m "feat(owner): today snapshot rules (reason, tile state, window, day helpers)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Capability rules, plan errors, nav metadata

**Files:**
- Create: `apps/owner/lib/capabilities.ts`, `apps/owner/lib/capabilities.test.ts`
- Create: `apps/owner/lib/plan-errors.ts`, `apps/owner/lib/plan-errors.test.ts`
- Modify: `apps/owner/lib/nav.ts`, `apps/owner/lib/nav.test.ts`

**Interfaces:**
- Consumes: `Capability`, `Plan`, `TenantCapabilitiesResponse` from `@iziwellpass/api/schemas`; `ApiError` from `@iziwellpass/api/client`; `Role` from `@iziwellpass/auth/claims`.
- Produces:
  - `PLAN_ORDER: readonly Plan[]` = `['free', 'starter', 'pro', 'enterprise']`
  - `PLAN_CAPABILITIES: Record<Plan, readonly Capability[]>`
  - `ALL_CAPABILITIES: readonly Capability[]` (backend order)
  - `CONSOLE_CAPABILITIES: readonly Capability[]` = `['staff_accounts', 'multi_venue', 'analytics', 'activity_pricing', 'qr_checkin', 'member_self_service']`
  - `BENEFIT_CAPABILITIES: readonly Capability[]` = `['staff_accounts', 'multi_venue', 'activity_pricing', 'qr_checkin']`
  - `minPlanFor(cap: Capability): Plan`
  - `isKnownPlan(plan: string): plan is Plan`
  - `type CapabilitiesStatus = 'loading' | 'ready' | 'unknown'`
  - `interface CapabilitiesValue { status: CapabilitiesStatus; plan: string | undefined; has(cap: Capability): boolean; isLocked(cap: Capability): boolean }`
  - `capabilitiesValue(data: TenantCapabilitiesResponse | undefined, isLoading: boolean): CapabilitiesValue`
  - `canManagePlan(role: Role | null): boolean`
  - `upgradeHref(salesEmail: string | undefined, subject: string): string`
  - `isFeatureNotAvailable(err: unknown): boolean`, `isForbidden(err: unknown): boolean`
  - `OwnerNavItem.capability?: Capability`; `navGroupsForRole` items carry `capability`; `canAccessPath(role, '/plan')` true only for owner/admin/platform_admin.

- [ ] **Step 1: Write the failing tests**

`apps/owner/lib/capabilities.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
  ALL_CAPABILITIES,
  capabilitiesValue,
  canManagePlan,
  CONSOLE_CAPABILITIES,
  isKnownPlan,
  minPlanFor,
  PLAN_CAPABILITIES,
  upgradeHref,
} from './capabilities';

describe('PLAN_CAPABILITIES', () => {
  // Pinned to iziwellpass origin/main crates/iziwellpass-common/src/types/capability.rs
  // `capabilities_for`. Update both together.
  it('matches the backend matrix', () => {
    expect(PLAN_CAPABILITIES.free).toEqual([]);
    expect(PLAN_CAPABILITIES.starter).toEqual([
      'activity_pricing',
      'qr_checkin',
      'staff_accounts',
      'member_self_service',
    ]);
    const all = [
      'activity_pricing',
      'qr_checkin',
      'staff_accounts',
      'multi_venue',
      'analytics',
      'member_self_service',
      'member_qr',
    ];
    expect(PLAN_CAPABILITIES.pro).toEqual(all);
    expect(PLAN_CAPABILITIES.enterprise).toEqual(all);
    expect(ALL_CAPABILITIES).toEqual(all);
  });
});

describe('minPlanFor', () => {
  it('names the cheapest plan that grants each capability', () => {
    expect(minPlanFor('activity_pricing')).toBe('starter');
    expect(minPlanFor('qr_checkin')).toBe('starter');
    expect(minPlanFor('staff_accounts')).toBe('starter');
    expect(minPlanFor('member_self_service')).toBe('starter');
    expect(minPlanFor('multi_venue')).toBe('pro');
    expect(minPlanFor('analytics')).toBe('pro');
    expect(minPlanFor('member_qr')).toBe('pro');
  });
});

describe('CONSOLE_CAPABILITIES', () => {
  it('lists the six rows of the locked page in canvas order', () => {
    expect(CONSOLE_CAPABILITIES).toEqual([
      'staff_accounts',
      'multi_venue',
      'analytics',
      'activity_pricing',
      'qr_checkin',
      'member_self_service',
    ]);
  });
});

describe('capabilitiesValue', () => {
  it('locks nothing while loading', () => {
    const value = capabilitiesValue(undefined, true);
    expect(value.status).toBe('loading');
    expect(value.isLocked('staff_accounts')).toBe(false);
    expect(value.has('multi_venue')).toBe(true);
  });

  it('locks nothing when the call failed', () => {
    const value = capabilitiesValue(undefined, false);
    expect(value.status).toBe('unknown');
    expect(value.plan).toBeUndefined();
    expect(value.isLocked('multi_venue')).toBe(false);
  });

  it('locks what the server did not grant', () => {
    const value = capabilitiesValue(
      { plan: 'starter', capabilities: ['activity_pricing', 'qr_checkin', 'staff_accounts'] },
      false,
    );
    expect(value.status).toBe('ready');
    expect(value.plan).toBe('starter');
    expect(value.isLocked('multi_venue')).toBe(true);
    expect(value.isLocked('staff_accounts')).toBe(false);
  });

  it('trusts the server list for a plan the console does not know', () => {
    const value = capabilitiesValue(
      { plan: 'business' as never, capabilities: ['multi_venue'] },
      false,
    );
    expect(value.plan).toBe('business');
    expect(value.isLocked('multi_venue')).toBe(false);
    expect(value.isLocked('staff_accounts')).toBe(true);
    expect(isKnownPlan('business')).toBe(false);
    expect(isKnownPlan('pro')).toBe(true);
  });
});

describe('canManagePlan', () => {
  it('is owner and admin only', () => {
    expect(canManagePlan('owner')).toBe(true);
    expect(canManagePlan('admin')).toBe(true);
    expect(canManagePlan('trainer')).toBe(false);
    expect(canManagePlan('receptionist')).toBe(false);
    expect(canManagePlan(null)).toBe(false);
  });
});

describe('upgradeHref', () => {
  it('opens a mail to sales with the subject when an address is configured', () => {
    expect(upgradeHref('ventes@iziwellpass.com', 'Passer au plan Pro')).toBe(
      'mailto:ventes@iziwellpass.com?subject=Passer%20au%20plan%20Pro',
    );
  });

  it('falls back to the plans page', () => {
    expect(upgradeHref(undefined, 'x')).toBe('/plan');
    expect(upgradeHref('  ', 'x')).toBe('/plan');
  });
});
```

`apps/owner/lib/plan-errors.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { ApiError } from '@iziwellpass/api/client';

import { isFeatureNotAvailable, isForbidden } from './plan-errors';

const err = (status: number, code: string) => new ApiError(status, { code, message: code });

describe('plan errors', () => {
  it('recognises the plan gate', () => {
    expect(isFeatureNotAvailable(err(403, 'FEATURE_NOT_AVAILABLE'))).toBe(true);
    expect(isForbidden(err(403, 'FEATURE_NOT_AVAILABLE'))).toBe(false);
  });

  it('treats any other 403 as access denied', () => {
    expect(isForbidden(err(403, 'FORBIDDEN'))).toBe(true);
    expect(isFeatureNotAvailable(err(403, 'FORBIDDEN'))).toBe(false);
  });

  it('leaves the MFA gate to its own flow', () => {
    expect(isForbidden(err(403, 'MFA_ENROLLMENT_REQUIRED'))).toBe(false);
    expect(isFeatureNotAvailable(err(403, 'MFA_ENROLLMENT_REQUIRED'))).toBe(false);
  });

  it('ignores non-403 and non-ApiError values', () => {
    expect(isForbidden(err(401, 'UNAUTHORIZED'))).toBe(false);
    expect(isForbidden(new Error('x'))).toBe(false);
    expect(isFeatureNotAvailable(undefined)).toBe(false);
  });
});
```

Append to `apps/owner/lib/nav.test.ts`:

```ts
describe('nav capabilities', () => {
  it('tags plan-gated entries with their capability', () => {
    const items = navGroupsForRole('owner').flatMap((g) => g.items);
    expect(items.find((i) => i.href === '/staff')?.capability).toBe('staff_accounts');
    expect(items.find((i) => i.href === '/plans')?.capability).toBe('activity_pricing');
    expect(items.find((i) => i.href === '/')?.capability).toBeUndefined();
  });
});

describe('hidden routes', () => {
  it('gates /plan to owner and admin without a nav entry', () => {
    expect(navForRole('owner').some((i) => i.href === '/plan')).toBe(false);
    expect(canAccessPath('owner', '/plan')).toBe(true);
    expect(canAccessPath('admin', '/plan')).toBe(true);
    expect(canAccessPath('platform_admin', '/plan')).toBe(true);
    expect(canAccessPath('receptionist', '/plan')).toBe(false);
    expect(canAccessPath('trainer', '/plan')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @iziwellpass/owner exec vitest run lib/capabilities.test.ts lib/plan-errors.test.ts lib/nav.test.ts`
Expected: FAIL (missing modules; nav tests fail on `capability`/`/plan`).

- [ ] **Step 3: Implement**

`apps/owner/lib/capabilities.ts`:

```ts
import type { Capability, Plan, TenantCapabilitiesResponse } from '@iziwellpass/api/schemas';
import type { Role } from '@iziwellpass/auth/claims';

export const PLAN_ORDER: readonly Plan[] = ['free', 'starter', 'pro', 'enterprise'];

export const ALL_CAPABILITIES: readonly Capability[] = [
  'activity_pricing',
  'qr_checkin',
  'staff_accounts',
  'multi_venue',
  'analytics',
  'member_self_service',
  'member_qr',
];

/**
 * Display copy of the backend `capabilities_for` matrix — used ONLY to label
 * locks (« Pro », « Passer au plan Starter ») and draw `/plan`. What is
 * locked always comes from the server's `capabilities` list (spec T8).
 */
export const PLAN_CAPABILITIES: Record<Plan, readonly Capability[]> = {
  free: [],
  starter: ['activity_pricing', 'qr_checkin', 'staff_accounts', 'member_self_service'],
  pro: ALL_CAPABILITIES,
  enterprise: ALL_CAPABILITIES,
};

/** The six rows of the locked page's list, in canvas order (`zCLZV`). */
export const CONSOLE_CAPABILITIES: readonly Capability[] = [
  'staff_accounts',
  'multi_venue',
  'analytics',
  'activity_pricing',
  'qr_checkin',
  'member_self_service',
];

/** Capabilities that own a benefit sentence (`capabilities.benefit.*`). */
export const BENEFIT_CAPABILITIES: readonly Capability[] = [
  'staff_accounts',
  'multi_venue',
  'activity_pricing',
  'qr_checkin',
];

export function minPlanFor(cap: Capability): Plan {
  return PLAN_ORDER.find((plan) => PLAN_CAPABILITIES[plan].includes(cap)) ?? 'pro';
}

export function isKnownPlan(plan: string): plan is Plan {
  return (PLAN_ORDER as readonly string[]).includes(plan);
}

export type CapabilitiesStatus = 'loading' | 'ready' | 'unknown';

export interface CapabilitiesValue {
  status: CapabilitiesStatus;
  plan: string | undefined;
  has(cap: Capability): boolean;
  isLocked(cap: Capability): boolean;
}

/**
 * Fail open (spec T7): until the server has answered — or when it could not —
 * every capability reads as granted. The backend still refuses gated calls
 * and the toast explains it.
 */
export function capabilitiesValue(
  data: TenantCapabilitiesResponse | undefined,
  isLoading: boolean,
): CapabilitiesValue {
  if (!data) {
    return {
      status: isLoading ? 'loading' : 'unknown',
      plan: undefined,
      has: () => true,
      isLocked: () => false,
    };
  }
  const granted = new Set<string>(data.capabilities);
  return {
    status: 'ready',
    plan: data.plan,
    has: (cap) => granted.has(cap),
    isLocked: (cap) => !granted.has(cap),
  };
}

/** Who sees upgrade actions, the plan row and `/plan` (spec T10). */
export function canManagePlan(role: Role | null): boolean {
  return role === 'owner' || role === 'admin';
}

/** « Passer au plan … » target (spec T12). */
export function upgradeHref(salesEmail: string | undefined, subject: string): string {
  const email = salesEmail?.trim();
  if (!email) return '/plan';
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}
```

`apps/owner/lib/plan-errors.ts`:

```ts
import { ApiError } from '@iziwellpass/api/client';

/** 403 because the tenant's plan lacks the feature — offer an upgrade. */
export function isFeatureNotAvailable(err: unknown): boolean {
  return err instanceof ApiError && err.status === 403 && err.code === 'FEATURE_NOT_AVAILABLE';
}

/**
 * A plain permission 403 (« Accès refusé »). The plan gate and the MFA gate
 * are excluded: each has its own flow.
 */
export function isForbidden(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    err.status === 403 &&
    err.code !== 'FEATURE_NOT_AVAILABLE' &&
    err.code !== 'MFA_ENROLLMENT_REQUIRED'
  );
}
```

`apps/owner/lib/nav.ts` changes:
1. Add `import type { Capability } from '@iziwellpass/api/schemas';` after the `Role` import.
2. Add `capability?: Capability;` to `OwnerNavItem` with the doc comment `/** Plan capability the page needs; the shell shows a lock when the tenant lacks it. */`.
3. In `NAV_ITEMS`, add `capability: 'activity_pricing'` to the `plans` entry and `capability: 'staff_accounts'` to the `staff` entry.
4. Change `OwnerNavGroup.items` to `{ labelKey: NavLabelKey; href: string; capability?: Capability }[]` and the mapper inside `navGroupsForRole` to `.map(({ labelKey, href, capability }) => ({ labelKey, href, capability }))`.
5. Add, above `canAccessPath`:

```ts
/**
 * Pages reachable only by URL or in-page links (no nav entry), with the
 * roles allowed in. `canAccessPath` consults them after `NAV_ITEMS`.
 */
const HIDDEN_ROUTES: readonly { href: string; roles: readonly Role[] }[] = [
  { href: '/plan', roles: ['owner', 'admin'] },
];
```

6. In `canAccessPath`, replace `const item = NAV_ITEMS.find((i) => i.href === href);` with `const item = NAV_ITEMS.find((i) => i.href === href) ?? HIDDEN_ROUTES.find((i) => i.href === href);`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @iziwellpass/owner exec vitest run lib/capabilities.test.ts lib/plan-errors.test.ts lib/nav.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck and commit**

```bash
pnpm --filter @iziwellpass/owner typecheck
git add apps/owner/lib/capabilities.ts apps/owner/lib/capabilities.test.ts apps/owner/lib/plan-errors.ts apps/owner/lib/plan-errors.test.ts apps/owner/lib/nav.ts apps/owner/lib/nav.test.ts
git commit -m "feat(owner): plan capability rules, plan errors, nav capability tags

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Mock server — `/today`, `/capabilities`, `MOCK_PLAN` gates

**Files:**
- Modify: `apps/owner/scripts/mock-server.mjs`

**Interfaces:**
- Produces (HTTP, mirrors the backend contract):
  - `GET /gms/v1/venues/:id/today[?date=YYYY-MM-DD]` → `{ data: TodaySnapshot }`; 400 `VALIDATION_ERROR` on a malformed date; 404 on an unknown venue.
  - `GET /gms/v1/capabilities` → `{ data: { plan, capabilities } }`.
  - With `MOCK_PLAN` lacking the capability: `POST /gms/v1/staff/invite`, `POST /gms/v1/venues` (only when a venue already exists), `POST /gms/v1/venues/:id/plans`, `POST /gms/v1/members/:mid/subscriptions`, `POST /gms/v1/checkins/qr`, `POST /gms/v1/checkins/walkin/qr` → `403 { error: { code: 'FEATURE_NOT_AVAILABLE', message: 'Feature not available: <cap>' } }`.
- Seeds for venue 1 today: one active slot with bookings and zero arrivals, one slot on a schedule without instructor, one overbooked slot (4 booked / capacity 3).

- [ ] **Step 1: Add the demo-hook lines to the header comment**

At the end of the « Fixed demo hooks » list (after the `staff-trainer-02` lines, before `import http`), add:

```js
//   - `GET /gms/v1/venues/venue-dakar-01/today` shows all three « À régler »
//     reasons: `slot-06` is running with nobody arrived, `slot-07`
//     (« Stretching midi ») has bookings but no instructor, `slot-08` is
//     overbooked (4 / 3).
//   - `MOCK_PLAN=free|starter|pro|enterprise` (default `pro`) sets the plan
//     `GET /gms/v1/capabilities` returns; gated routes answer
//     403 FEATURE_NOT_AVAILABLE when the plan lacks the capability.
```

- [ ] **Step 2: Add the schedule without instructor**

Append to the `schedules` array (after `sch-danse-01`):

```js
  {
    id: 'sch-stretch-01',
    tenant_id: TENANT_ID,
    venue_id: VENUE_1,
    resource_id: 'res-plateau-01',
    instructor_staff_id: undefined,
    title: 'Stretching midi',
    start_time: '12:15:00',
    end_time: '13:00:00',
    recurrence_rule: 'FREQ=DAILY',
    effective_from: dateOnly(daysFromNow(-30)),
    effective_until: undefined,
    description: undefined,
    is_active: true,
    created_at: iso(daysFromNow(-30)),
    updated_at: iso(daysFromNow(-30)),
    version: iso(daysFromNow(-1)),
  },
```

- [ ] **Step 3: Add the three attention slots and their bookings**

Append to `slots`:

```js
  // « À régler » demo hooks (see header).
  mkSlot('slot-06', 'sch-yoga-01', 'res-yoga-01', VENUE_1, -0.25, 1, 12),
  mkSlot('slot-07', 'sch-stretch-01', 'res-plateau-01', VENUE_1, 2, 0.75, 16),
  mkSlot('slot-08', 'sch-crossfit-01', 'res-plateau-01', VENUE_1, 4.5, 1, 3),
```

Append to `bookings` (before the closing `];`):

```js
  // slot-06: running, nobody checked in yet.
  mkBooking('bkg-11', 'slot-06', 'mbr-04', 'confirmed'),
  mkBooking('bkg-12', 'slot-06', 'mbr-06', 'confirmed'),
  // slot-07: booked on a course with no instructor.
  mkBooking('bkg-13', 'slot-07', 'mbr-08', 'confirmed'),
  // slot-08: overbooked, 4 on 3 places.
  mkBooking('bkg-14', 'slot-08', 'mbr-02', 'confirmed'),
  mkBooking('bkg-15', 'slot-08', 'mbr-03', 'confirmed'),
  mkBooking('bkg-16', 'slot-08', 'mbr-10', 'confirmed'),
  mkBooking('bkg-17', 'slot-08', 'mbr-12', 'confirmed'),
```

- [ ] **Step 4: Add the plan matrix and gates**

After the error helpers (`const unauthorized = …`), add:

```js
// ---- plan capabilities (mirrors capabilities_for) ------------------------------
const ALL_CAPABILITIES = [
  'activity_pricing',
  'qr_checkin',
  'staff_accounts',
  'multi_venue',
  'analytics',
  'member_self_service',
  'member_qr',
];
const PLAN_CAPABILITIES = {
  free: [],
  starter: ['activity_pricing', 'qr_checkin', 'staff_accounts', 'member_self_service'],
  pro: ALL_CAPABILITIES,
  enterprise: ALL_CAPABILITIES,
};
const MOCK_PLAN = (() => {
  const plan = process.env.MOCK_PLAN ?? 'pro';
  if (!(plan in PLAN_CAPABILITIES)) {
    console.warn(`[mock] unknown MOCK_PLAN "${plan}", using "pro"`);
    return 'pro';
  }
  return plan;
})();
const planHas = (cap) => PLAN_CAPABILITIES[MOCK_PLAN].includes(cap);

// Routes the backend guards with `require_feature`. `when` narrows a gate
// (the first venue is created through onboarding, never refused).
const FEATURE_GATES = [
  { method: 'POST', pattern: /^\/gms\/v1\/staff\/invite$/, capability: 'staff_accounts' },
  {
    method: 'POST',
    pattern: /^\/gms\/v1\/venues$/,
    capability: 'multi_venue',
    when: () => venues.length > 0,
  },
  { method: 'POST', pattern: /^\/gms\/v1\/venues\/[^/]+\/plans$/, capability: 'activity_pricing' },
  {
    method: 'POST',
    pattern: /^\/gms\/v1\/members\/[^/]+\/subscriptions$/,
    capability: 'activity_pricing',
  },
  { method: 'POST', pattern: /^\/gms\/v1\/checkins\/qr$/, capability: 'qr_checkin' },
  { method: 'POST', pattern: /^\/gms\/v1\/checkins\/walkin\/qr$/, capability: 'qr_checkin' },
];

function featureGate(method, pathname) {
  const gate = FEATURE_GATES.find(
    (g) => g.method === method && g.pattern.test(pathname) && (!g.when || g.when()),
  );
  if (!gate || planHas(gate.capability)) return null;
  return [403, errorBody('FEATURE_NOT_AVAILABLE', `Feature not available: ${gate.capability}`)];
}

function capabilitiesHandler() {
  return [200, envelope({ plan: MOCK_PLAN, capabilities: PLAN_CAPABILITIES[MOCK_PLAN] })];
}
```

- [ ] **Step 5: Add the Today handler**

After `listCheckInsHandler`, add:

```js
// ---- today snapshot -------------------------------------------------------------
function localDateKey(date, timeZone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function localRfc3339(date, timeZone) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
      timeZoneName: 'longOffset',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  const offset = p.timeZoneName === 'GMT' ? '+00:00' : p.timeZoneName.replace('GMT', '');
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${offset}`;
}

function lifecycleOf(slot, at) {
  if (slot.status === 'cancelled') return 'cancelled';
  if (Date.parse(slot.end_time) <= at) return 'completed';
  if (Date.parse(slot.start_time) <= at) return 'active';
  return 'upcoming';
}

function todayHandler(venueId, query) {
  const venue = venues.find((v) => v.id === venueId);
  if (!venue) return notFound(`Venue ${venueId} not found`);
  const timeZone = venue.timezone ?? 'Africa/Dakar';
  const at = Date.now();
  const date = query.get('date') ?? localDateKey(new Date(at), timeZone);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    return badRequest('date must be YYYY-MM-DD');
  }

  const todaySlots = slots
    .filter(
      (s) => s.venue_id === venueId && localDateKey(new Date(s.start_time), timeZone) === date,
    )
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
    .map((s) => {
      const schedule = schedules.find((x) => x.id === s.schedule_id);
      const resource = resources.find((r) => r.id === s.resource_id);
      const instructorId = schedule?.instructor_staff_id ?? null;
      const instructor = instructorId ? staff.find((m) => m.id === instructorId) : undefined;
      const lifecycle = lifecycleOf(s, at);
      const checkedIn = bookings.filter(
        (b) => b.slot_id === s.id && b.status === 'checked_in',
      ).length;
      const needsAttention =
        lifecycle !== 'cancelled' &&
        ((lifecycle === 'active' && checkedIn === 0) ||
          s.booked_count > s.capacity ||
          (s.booked_count > 0 && !instructorId));
      return {
        slot_id: s.id,
        schedule_id: s.schedule_id,
        resource_id: s.resource_id,
        title: schedule?.title ?? null,
        description: schedule?.description ?? null,
        activity_type: null,
        resource_name: resource?.name ?? null,
        instructor_staff_id: instructorId,
        instructor_name: instructor ? `${instructor.first_name} ${instructor.last_name}` : null,
        start_utc: s.start_time,
        end_utc: s.end_time,
        start_local: localRfc3339(new Date(s.start_time), timeZone),
        end_local: localRfc3339(new Date(s.end_time), timeZone),
        capacity: s.capacity,
        booked_count: s.booked_count,
        checked_in_count: checkedIn,
        lifecycle,
        needs_attention: needsAttention,
      };
    });

  const dayCheckIns = checkIns.filter(
    (c) => c.venue_id === venueId && localDateKey(new Date(c.checked_in_at), timeZone) === date,
  );
  const attendees = new Set(
    dayCheckIns.map((c) => (c.member_id ? `m:${c.member_id}` : `p:${c.pass_holder_id}`)),
  );
  const openCapacity = todaySlots
    .filter((s) => s.lifecycle !== 'cancelled')
    .reduce((sum, s) => sum + s.capacity, 0);
  const idsWhere = (lifecycle) =>
    todaySlots.filter((s) => s.lifecycle === lifecycle).map((s) => s.slot_id);

  return [
    200,
    envelope({
      venue_id: venueId,
      timezone: timeZone,
      local_date: date,
      generated_at: iso(new Date(at)),
      attendance: {
        total_check_ins: dayCheckIns.length,
        unique_attendees: attendees.size,
        occupancy_pct:
          openCapacity > 0 ? Math.round((dayCheckIns.length / openCapacity) * 1000) / 10 : 0,
      },
      slots: todaySlots,
      buckets: {
        upcoming: idsWhere('upcoming'),
        active: idsWhere('active'),
        completed: idsWhere('completed'),
        cancelled: idsWhere('cancelled'),
      },
      needs_attention: todaySlots.filter((s) => s.needs_attention).map((s) => s.slot_id),
    }),
  ];
}
```

- [ ] **Step 6: Register the routes and the gate**

In `routes`, after the `GET /gms/v1/venues/([^/]+)$` entry, add:

```js
  {
    method: 'GET',
    pattern: /^\/gms\/v1\/venues\/([^/]+)\/today$/,
    handler: (m, _body, query) => todayHandler(m[1], query),
  },
  { method: 'GET', pattern: /^\/gms\/v1\/capabilities$/, handler: () => capabilitiesHandler() },
```

In `dispatch`, right after the `/health` branch, add:

```js
  const gated = featureGate(method, pathname);
  if (gated) return gated;
```

Update the start-up log line to include the plan: `` console.log(`[mock] owner API mock on http://localhost:${PORT} (plan ${MOCK_PLAN}, state resets on restart)`); ``

- [ ] **Step 7: Verify with curl on port 8091**

```bash
cd apps/owner
PORT=8091 node scripts/mock-server.mjs & MOCK=$!
sleep 1
H='authorization: Bearer x'
curl -s -H "$H" localhost:8091/gms/v1/venues/venue-dakar-01/today | node -e "const d=JSON.parse(require('fs').readFileSync(0)).data;console.log(d.local_date,d.attendance,d.needs_attention,d.slots.map(s=>[s.slot_id,s.lifecycle,s.needs_attention,s.start_local.slice(11,16)]))"
curl -s -o /dev/null -w '%{http_code}\n' -H "$H" 'localhost:8091/gms/v1/venues/venue-dakar-01/today?date=21-09-2026'
curl -s -H "$H" localhost:8091/gms/v1/capabilities
kill $MOCK
PORT=8091 MOCK_PLAN=starter node scripts/mock-server.mjs & MOCK=$!
sleep 1
curl -s -H "$H" -H 'content-type: application/json' -d '{}' localhost:8091/gms/v1/venues
curl -s -o /dev/null -w '%{http_code}\n' -H "$H" -H 'content-type: application/json' -d '{"first_name":"A","last_name":"B","email":"a@b.sn","role":"receptionist"}' localhost:8091/gms/v1/staff/invite
kill $MOCK
```

Expected: the first call lists `slot-06`, `slot-07`, `slot-08` in `needs_attention` (plus any other slot the rules flag at the current hour), `slot-06` is `active`; malformed date → `400`; capabilities → `{"data":{"plan":"pro","capabilities":[…7…]}…}`; on starter `POST /venues` → `403` body with `FEATURE_NOT_AVAILABLE` and `multi_venue`; staff invite → `201` (starter has `staff_accounts`).

- [ ] **Step 8: Commit**

```bash
git add apps/owner/scripts/mock-server.mjs
git commit -m "feat(owner): mock today snapshot, capabilities and MOCK_PLAN feature gates

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Snapshot hook and stats strip

**Files:**
- Create: `apps/owner/lib/use-today-snapshot.ts`
- Modify: `apps/owner/app/(app)/dashboard/use-dashboard-data.ts`, `apps/owner/app/(app)/dashboard/kpi-row.tsx`, `apps/owner/app/(app)/page.tsx`
- Modify: `apps/owner/app/(app)/checkins/use-frontdesk-data.ts`, `apps/owner/app/(app)/checkins/day-stats.tsx`, `apps/owner/app/(app)/checkins/page.tsx`
- Modify: `apps/owner/components/checkin/use-register-checkin.ts`
- Modify: `apps/owner/messages/fr.json`, `apps/owner/messages/en.json`

**Interfaces:**
- Consumes: `useVenueToday`, `getVenueTodayQueryKey` from `@iziwellpass/api/generated`; `unwrap` from `@iziwellpass/api/client`; `QueryLike` from `@/components/checkin/query-like`.
- Produces:
  - `useTodaySnapshot(venueId: string, date: string | null)` — the react-query result with `data: TodaySnapshot | undefined`; disabled when `date` is null.
  - `attendanceOf(query: QueryLike<TodaySnapshot>): QueryLike<TodayAttendance>`
  - `useDashboardData(venueId, timeZone)` now returns `{ today, todayKey, members, schedules, resources, checkIns, staff }` (no `slots`, no `attendance`); `todayKey` = `venueToday(timeZone)`.
  - `KpiRow({ attendance: QueryLike<TodayAttendance>, members })`; `DayStats({ attendance: QueryLike<TodayAttendance> })`.
  - Messages: `dashboard.errors.today`, `dashboard.errors.forbidden`.

- [ ] **Step 1: Create the hook**

`apps/owner/lib/use-today-snapshot.ts`:

```ts
'use client';

import { unwrap } from '@iziwellpass/api/client';
import { useVenueToday } from '@iziwellpass/api/generated';
import type { TodayAttendance, TodaySnapshot } from '@iziwellpass/api/schemas';

import type { QueryLike } from '@/components/checkin/query-like';

/**
 * The venue-day snapshot (`GET /venues/{id}/today`). `date` is always sent as
 * the venue-local `YYYY-MM-DD` so the dashboard, the Accueil strip and the
 * check-in invalidation share one cache entry per day (spec T3). A null date
 * disables the query (the tiles' second day when it equals today).
 */
export function useTodaySnapshot(venueId: string, date: string | null) {
  return useVenueToday(
    venueId,
    { date: date ?? '' },
    { query: { select: unwrap, enabled: Boolean(venueId && date) } },
  );
}

/** The day's attendance rollup as its own query-like, for the stat strips. */
export function attendanceOf(query: QueryLike<TodaySnapshot>): QueryLike<TodayAttendance> {
  return {
    data: query.data?.attendance,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
```

If `tsc` rejects the options object against the generated overloads, mirror exactly how `useListSchedules(venueId, { query: { select: unwrap } })` is typed in `use-dashboard-data.ts` and keep `enabled` inside `query`.

- [ ] **Step 2: Dashboard data**

Replace the body of `useDashboardData` in `app/(app)/dashboard/use-dashboard-data.ts`:

```ts
'use client';

import { unwrap } from '@iziwellpass/api/client';
import { useListResources, useListSchedules, useListStaff } from '@iziwellpass/api/generated';

import { useAllMembers } from '@/lib/all-members';
import { useCheckInsByDate } from '@/lib/dated-api';
import { venueToday } from '@/lib/datetime';
import { useTodaySnapshot } from '@/lib/use-today-snapshot';

export type { QueryLike } from '@/components/checkin/query-like';

/**
 * Initiates every venue-scoped dashboard query in one place so they fan out
 * in parallel on the first render of `DashboardBody`. `today` is the venue-day
 * snapshot (tiles, « À régler », stats); schedules, resources and staff feed
 * the in-place « Modifier le cours » dialog and the feed; the member list is
 * shared by the KPI row, the command bar, the feed and the participants sheet.
 */
export function useDashboardData(venueId: string, timeZone: string | undefined) {
  const todayKey = venueToday(timeZone);

  const today = useTodaySnapshot(venueId, todayKey);
  const members = useAllMembers();
  const schedules = useListSchedules(venueId, { query: { select: unwrap } });
  const resources = useListResources(venueId, { query: { select: unwrap } });
  const checkIns = useCheckInsByDate(venueId, todayKey);
  const staff = useListStaff({ query: { select: unwrap } });

  return { today, todayKey, members, schedules, resources, checkIns, staff };
}
```

- [ ] **Step 3: KPI row on the snapshot**

In `kpi-row.tsx`: change the type import to `import type { Member, TodayAttendance } from '@iziwellpass/api/schemas';`, the prop type to `attendance: QueryLike<TodayAttendance>`, the unique stat's value to `stats ? String(stats.unique_attendees) : null`, and the doc comment's first sentences to: « KPI strip, scoped to the selected venue. Three metrics come from the day snapshot (`GET /venues/{id}/today` — check-ins, unique attendees counting members and pass holders, occupancy %); "active members" is derived from the org member list. » Keep the rest of the comment and the markup.

- [ ] **Step 4: Dashboard page wiring (stats only for now)**

In `app/(app)/page.tsx` `DashboardBody`:
- Destructure `const { today, todayKey, members, schedules, resources, checkIns, staff } = data;`
- Add `import { attendanceOf } from '@/lib/use-today-snapshot';` and pass `<KpiRow attendance={attendanceOf(today)} members={members} />`.
- Leave `TodayTiles` and its props untouched in this task. To keep it compiling, `useDashboardData` temporarily keeps the slots query: add `const slots = useSlotsByDate(venueId, todayKey);` (import `useSlotsByDate` from `@/lib/dated-api`) and return `slots` too. Task 5 removes that line.

- [ ] **Step 5: Accueil on the snapshot**

`app/(app)/checkins/use-frontdesk-data.ts`: replace `useAttendanceByDate(venueId, date)` with `useTodaySnapshot(venueId, date)` and return `{ today, checkIns, members, staff }`; update imports and the doc comment (« … fans out the day snapshot, check-ins, members and staff … »).

`app/(app)/checkins/day-stats.tsx`: prop `attendance: QueryLike<TodayAttendance>`; unique value `String(stats.unique_attendees)`; type import `TodayAttendance`.

`app/(app)/checkins/page.tsx`: destructure `today` instead of `attendance`, render `<DayStats attendance={attendanceOf(today)} />`, and update the doc comment near line 64 that mentions attendance keys (« … invalidates the check-in and today-snapshot keys … »).

- [ ] **Step 6: Check-ins refresh the snapshot**

In `components/checkin/use-register-checkin.ts`: import `getVenueTodayQueryKey` from `@iziwellpass/api/generated` and, inside `settle`, after the attendance invalidation, add:

```ts
      void queryClient.invalidateQueries({ queryKey: getVenueTodayQueryKey(checkedInVenueId) });
```

Keep the attendance invalidation (other screens may still read it). Update the doc comment: « … invalidates the check-in, attendance and today-snapshot keys … ».

- [ ] **Step 7: Messages**

In `apps/owner/messages/fr.json`, inside `"dashboard" → "errors"`, add two keys after the last existing key (mind the comma on the previous line):

```json
      "today": "Impossible de charger la journée.",
      "forbidden": "Accès refusé."
```

In `en.json`, same place:

```json
      "today": "Couldn't load the day.",
      "forbidden": "Access denied."
```

- [ ] **Step 8: Gates and a quick browser check**

Run the Global Constraints gates and the parity check. Then start this branch's mock on 8091 and Next dev on 3021 (see Global Constraints), sign in, open `/` and `/checkins`, and confirm the strip shows numbers (mock: 5 check-ins; « Membres uniques » ≥ 3) with no console errors. Stop both servers.

- [ ] **Step 9: Commit**

```bash
git add apps/owner/lib/use-today-snapshot.ts 'apps/owner/app/(app)/dashboard' 'apps/owner/app/(app)/page.tsx' 'apps/owner/app/(app)/checkins' apps/owner/components/checkin/use-register-checkin.ts apps/owner/messages
git commit -m "feat(owner): dashboard and Accueil stats on the today snapshot

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Lifecycle tiles and the date control

**Files:**
- Rewrite: `apps/owner/app/(app)/dashboard/today-tiles.tsx`
- Create: `apps/owner/app/(app)/dashboard/day-control.tsx`
- Modify: `apps/owner/app/(app)/dashboard/use-dashboard-data.ts` (drop `slots`), `apps/owner/app/(app)/page.tsx`
- Delete: `apps/owner/lib/today-tiles.ts`, `apps/owner/lib/today-tiles.test.ts`
- Modify: `apps/owner/messages/fr.json`, `apps/owner/messages/en.json`

**Interfaces:**
- Consumes: Task 1 (`pickTiles`, `tileState`, `slotTime`, `resolveDay`, `parseDayInput`, `dayLabel`, `DaySelection`), Task 4 (`useTodaySnapshot`, `todayKey`), Task 2 (`isForbidden`).
- Produces:
  - `TodayTiles({ venueId, timeZone, todayKey, today }: { venueId: string; timeZone: string | undefined; todayKey: string; today: QueryLike<TodaySnapshot> })`
  - `DayControl({ selection, onChange, todayKey }: { selection: DaySelection; onChange: (s: DaySelection) => void; todayKey: string })`
  - Messages `dashboard.day.*`, `dashboard.tile.*`.

- [ ] **Step 1: Messages**

In `fr.json` inside `"dashboard"` (after `"tabs": {…},`), add:

```json
    "day": {
      "label": "Jour affiché",
      "today": "Aujourd'hui",
      "tomorrow": "Demain",
      "pick": "Choisir une date",
      "input": "Date",
      "emptyOther": "Aucune séance ce jour-là."
    },
    "tile": {
      "completed": "Terminée",
      "active": "En cours",
      "attention": "À régler",
      "cancelled": "Annulée",
      "noInstructor": "Aucun intervenant",
      "stats": "{arrived, plural, =1 {# arrivé} other {# arrivés}} · {booked, plural, =1 {# inscrit} other {# inscrits}} · {capacity, plural, =1 {# place} other {# places}}",
      "capacityLabel": "{booked} inscrits sur {capacity} places"
    },
```

In `en.json`, same place:

```json
    "day": {
      "label": "Day shown",
      "today": "Today",
      "tomorrow": "Tomorrow",
      "pick": "Pick a date",
      "input": "Date",
      "emptyOther": "No sessions that day."
    },
    "tile": {
      "completed": "Finished",
      "active": "In progress",
      "attention": "Needs attention",
      "cancelled": "Cancelled",
      "noInstructor": "No instructor",
      "stats": "{arrived} arrived · {booked} booked · {capacity, plural, =1 {# spot} other {# spots}}",
      "capacityLabel": "{booked} booked out of {capacity} spots"
    },
```

- [ ] **Step 2: Date control**

`apps/owner/app/(app)/dashboard/day-control.tsx`:

```tsx
'use client';

import { useId, useState } from 'react';
import { CalendarDaysIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { Input } from '@iziwellpass/ui/components/input';
import { Label } from '@iziwellpass/ui/components/label';
import { Popover, PopoverContent, PopoverTrigger } from '@iziwellpass/ui/components/popover';
import { cn } from '@iziwellpass/ui/lib/utils';

import { dayLabel, parseDayInput, resolveDay, type DaySelection } from '@/lib/today';

const pill = (active: boolean) =>
  cn(
    'inline-flex h-11 items-center gap-2 rounded-full px-4 text-base transition-colors md:h-10',
    active ? 'bg-secondary font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
  );

/**
 * « Aujourd'hui / Demain / Choisir une date » above the tiles (`s8LRy3`).
 * Scopes the tiles only (spec T4). The picked day keeps the popover open while
 * the year is typed (plan R4); Enter or an outside click closes it.
 */
export function DayControl({
  selection,
  onChange,
  todayKey,
}: {
  selection: DaySelection;
  onChange: (selection: DaySelection) => void;
  todayKey: string;
}) {
  const t = useTranslations('dashboard.day');
  const locale = useLocale();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const picked = selection.kind === 'date';

  return (
    <div role="group" aria-label={t('label')} className="flex flex-wrap items-center justify-center gap-1">
      <button
        type="button"
        aria-pressed={selection.kind === 'today'}
        className={pill(selection.kind === 'today')}
        onClick={() => onChange({ kind: 'today' })}
      >
        {t('today')}
      </button>
      <button
        type="button"
        aria-pressed={selection.kind === 'tomorrow'}
        className={pill(selection.kind === 'tomorrow')}
        onClick={() => onChange({ kind: 'tomorrow' })}
      >
        {t('tomorrow')}
      </button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" aria-pressed={picked} className={pill(picked)}>
            <CalendarDaysIcon aria-hidden="true" className="size-4" />
            {picked ? dayLabel(selection.date, locale) : t('pick')}
          </button>
        </PopoverTrigger>
        <PopoverContent align="center" className="flex w-64 flex-col gap-2">
          <Label htmlFor={inputId}>{t('input')}</Label>
          <Input
            id={inputId}
            type="date"
            defaultValue={resolveDay(selection, todayKey)}
            onChange={(event) => {
              const day = parseDayInput(event.target.value);
              if (day) onChange({ kind: 'date', date: day });
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
```

- [ ] **Step 3: Rewrite the tiles**

`apps/owner/app/(app)/dashboard/today-tiles.tsx`:

```tsx
'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRightIcon, CircleAlertIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { TodaySlot, TodaySnapshot } from '@iziwellpass/api/schemas';
import { useRole } from '@iziwellpass/auth/provider';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Button } from '@iziwellpass/ui/components/button';
import { Capacity } from '@iziwellpass/ui/components/capacity';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { Tile, TileMeta, TileTime, TileTitle, TileTop } from '@iziwellpass/ui/components/tile';

import { canAccessPath } from '@/lib/nav';
import { isForbidden } from '@/lib/plan-errors';
import {
  pickTiles,
  resolveDay,
  slotTime,
  tileState,
  type DaySelection,
  type TileBadge,
  type TileTone,
} from '@/lib/today';
import { useTodaySnapshot } from '@/lib/use-today-snapshot';

import { DayControl } from './day-control';
import { SectionError } from './section-error';
import type { QueryLike } from './use-dashboard-data';

// Lifecycle tints on this surface only (spec §4.2, `s8LRy3`); other tile
// surfaces keep the positional Tile Rule.
const TONE_TINT: Record<TileTone, 'bleu' | 'vert'> = {
  upcoming: 'bleu',
  active: 'vert',
  completed: 'bleu',
  cancelled: 'bleu',
};
const TONE_CLASS: Partial<Record<TileTone, string>> = {
  completed: 'bg-side',
  cancelled: 'bg-side',
};
const BADGE_VARIANT: Record<TileBadge, 'warning' | 'success' | 'default'> = {
  attention: 'warning',
  active: 'success',
  completed: 'default',
  cancelled: 'default',
};

function SessionTile({ slot, timeZone }: { slot: TodaySlot; timeZone: string | undefined }) {
  const t = useTranslations('dashboard');
  const state = tileState(slot);
  const isCancelled = state.tone === 'cancelled';
  const meta = `${slot.resource_name ?? '—'} · ${slot.instructor_name ?? t('tile.noInstructor')}`;
  return (
    <Tile tint={TONE_TINT[state.tone]} className={TONE_CLASS[state.tone]}>
      <TileTop>
        <TileTime>{slotTime(slot, timeZone)}</TileTime>
        {state.badge ? (
          <Badge variant={BADGE_VARIANT[state.badge]}>{t(`tile.${state.badge}`)}</Badge>
        ) : null}
      </TileTop>
      <div className="flex flex-col gap-2">
        <div>
          <TileTitle>{slot.title ?? '—'}</TileTitle>
          <TileMeta>{meta}</TileMeta>
        </div>
        {isCancelled ? null : (
          <>
            <Capacity
              booked={slot.booked_count}
              capacity={slot.capacity}
              hideCount
              label={t('tile.capacityLabel', {
                booked: slot.booked_count,
                capacity: slot.capacity,
              })}
            />
            <p className="font-numeric text-sm text-muted-strong">
              {t('tile.stats', {
                arrived: slot.checked_in_count,
                booked: slot.booked_count,
                capacity: slot.capacity,
              })}
            </p>
          </>
        )}
        {state.reason && state.reason !== 'unknown' ? (
          <p className="flex items-center gap-1.5 text-sm font-medium text-warning-foreground">
            <CircleAlertIcon aria-hidden="true" className="size-3.5" />
            {t(`attention.reason.${state.reason}`, {
              booked: slot.booked_count,
              capacity: slot.capacity,
            })}
          </p>
        ) : null}
      </div>
    </Tile>
  );
}

/**
 * « Planning du jour »: the date control, « Voir les N séances du jour → »,
 * then up to four lifecycle tiles (`s8LRy3`). Today's tiles read the shared
 * snapshot; another day runs its own snapshot query (spec T4).
 */
export function TodayTiles({
  venueId,
  timeZone,
  todayKey,
  today,
}: {
  venueId: string;
  timeZone: string | undefined;
  todayKey: string;
  today: QueryLike<TodaySnapshot>;
}) {
  const t = useTranslations('dashboard');
  const role = useRole();
  const canCreateSchedule =
    (role === 'owner' || role === 'admin') && canAccessPath(role, '/schedules');

  const [selection, setSelection] = useState<DaySelection>({ kind: 'today' });
  const day = resolveDay(selection, todayKey);
  const isToday = day === todayKey;
  const other = useTodaySnapshot(venueId, isToday ? null : day);
  const query: QueryLike<TodaySnapshot> = isToday ? today : other;

  const { tiles, total } = useMemo(() => pickTiles(query.data?.slots ?? []), [query.data]);

  let body: ReactNode;
  if (query.isLoading) {
    body = (
      <div className="grid w-full grid-cols-2 gap-4 lg:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full rounded-xl" />
        ))}
      </div>
    );
  } else if (query.isError) {
    body = (
      <SectionError
        error={query.error}
        fallback={isForbidden(query.error) ? t('errors.forbidden') : t('errors.today')}
      />
    );
  } else if (tiles.length === 0) {
    body = isToday ? (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="flex flex-col gap-1">
          <p className="text-base">{t('schedule.emptyTitle')}</p>
          <p className="text-base text-muted-foreground">{t('schedule.emptyBody')}</p>
        </div>
        {canCreateSchedule ? (
          <Button asChild variant="secondary">
            <Link href="/schedules">{t('schedule.emptyCta')}</Link>
          </Button>
        ) : null}
      </div>
    ) : (
      <p className="py-6 text-center text-base text-muted-foreground">{t('day.emptyOther')}</p>
    );
  } else {
    body = (
      <>
        <Link
          href="/schedules"
          className="inline-flex items-center gap-2 text-md font-medium text-muted-foreground hover:text-foreground"
        >
          {t('schedule.seeAll', { count: total })}
          <ArrowRightIcon aria-hidden="true" className="size-4" />
        </Link>
        <ul className="grid w-full grid-cols-2 gap-4 lg:grid-cols-4">
          {tiles.map((slot) => (
            <li key={slot.slot_id} className="contents">
              <SessionTile slot={slot} timeZone={timeZone} />
            </li>
          ))}
        </ul>
      </>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-10">
      <DayControl selection={selection} onChange={setSelection} todayKey={todayKey} />
      {body}
    </div>
  );
}
```

Notes for the implementer:
- `t(`attention.reason.${state.reason}`)` uses keys added in Task 6. **Add these four keys now** in this task under `"dashboard"` so the tiles render, and Task 6 adds the rest of `attention`: fr `"attention": { "reason": { "no_instructor": "Aucun intervenant", "over_capacity": "Au-delà de la capacité · {booked}/{capacity}", "no_arrivals": "Personne n'est arrivé", "unknown": "À régler" } },` and en `"attention": { "reason": { "no_instructor": "No instructor", "over_capacity": "Over capacity · {booked}/{capacity}", "no_arrivals": "Nobody has arrived", "unknown": "Needs attention" } },`.
- The canvas places « Voir les N séances du jour → » between the date control and the tiles; keep that order.
- If `Badge` inside `TileTop` misaligns against `TileCount`'s old baseline, align with `items-start` on `TileTop` via `className`; do not change the primitive.
- Check that `text-muted-strong` and `text-warning-foreground` exist as utilities (they are used by `Badge`); they do.

- [ ] **Step 4: Wire it and drop the old helpers**

- In `use-dashboard-data.ts`, remove the temporary `slots` line and import added in Task 4.
- In `page.tsx`, render `<TodayTiles venueId={venueId} timeZone={timeZone} todayKey={todayKey} today={today} />` in the `schedule` tab.
- Delete `apps/owner/lib/today-tiles.ts` and `apps/owner/lib/today-tiles.test.ts` (`grep -rn "today-tiles'" apps/owner --include='*.ts*'` must then return only the dashboard component import of `./dashboard/today-tiles`).
- Remove the now-unused `dashboard.schedule.full` and `dashboard.schedule.cancelled` keys from both message files only if `grep -rn "schedule.full\|schedule.cancelled" apps/owner/app apps/owner/components` finds no other user.

- [ ] **Step 5: Gates**

Run the Global Constraints gates and the parity check. Expected: all green.

- [ ] **Step 6: Browser check**

Mock on 8091, Next on 3021, sign in as owner. On `/`: the tiles show « Terminée » on a grey side tile, « En cours » or « À régler » on a green tile (`slot-06`), « À régler » + « Aucun intervenant » line on `slot-07`'s tile when it is in the window, plain blue upcoming tiles; each tile shows the bar and « N arrivés · N inscrits · N places ». Click « Demain » → « Aucune séance ce jour-là. » (the mock seeds only today), the strip is unchanged. « Choisir une date » → type a date → the pill shows « Lundi 21 septembre »-style label. Screenshot at 1440×960 and 390×844 to `/tmp/spg-task5-*.png` and look at them. Stop both servers.

- [ ] **Step 7: Commit**

```bash
git add -A 'apps/owner/app/(app)/dashboard' 'apps/owner/app/(app)/page.tsx' apps/owner/lib/today-tiles.ts apps/owner/lib/today-tiles.test.ts apps/owner/messages
git commit -m "feat(owner): lifecycle session tiles and day control on the dashboard

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: « À régler » tab with in-place quick actions

**Files:**
- Create: `apps/owner/app/(app)/dashboard/attention-list.tsx`
- Modify: `apps/owner/app/(app)/page.tsx`
- Modify: `apps/owner/app/(app)/schedules/bookings-sheet.tsx` (narrow the `slot` prop)
- Modify: `apps/owner/messages/fr.json`, `apps/owner/messages/en.json`

**Interfaces:**
- Consumes: Task 1 (`attentionRows`, `attentionReason`, `slotTime`), Task 4 (`today`), `BookingsSheet`, `EditScheduleDialog`, `useFocusRegistry`, `getVenueTodayQueryKey`.
- Produces:
  - `export type SheetSlot = Pick<ScheduleSlot, 'id' | 'booked_count' | 'capacity' | 'start_time' | 'end_time'>` exported from `bookings-sheet.tsx`; `BookingsSheet`'s `slot` prop typed `SheetSlot`.
  - `AttentionList({ venueId, timeZone, today, schedules, resources, staff, members })`.
  - Messages `dashboard.tabs.attention`, `dashboard.tabs.attentionCount`, `dashboard.attention.{seeRoster,editCourse,emptyTitle,emptyBody}`.

- [ ] **Step 1: Messages**

fr, inside `"dashboard" → "tabs"` add `"attention": "À régler",` and `"attentionCount": "À régler ({count})",`. Inside `"dashboard" → "attention"` (created in Task 5), add a comma after the closing brace of `"reason": {…}` and then these keys:

```json
      "seeRoster": "Voir les participants",
      "editCourse": "Modifier le cours",
      "emptyTitle": "Rien à régler pour l'instant.",
      "emptyBody": "Les séances sans arrivée, au-delà de la capacité ou sans intervenant apparaîtront ici."
```
 en: tabs `"attention": "Needs attention",`, `"attentionCount": "Needs attention ({count})",`; attention `"seeRoster": "See participants"`, `"editCourse": "Edit course"`, `"emptyTitle": "Nothing needs attention right now."`, `"emptyBody": "Sessions with no arrivals, over capacity or without an instructor will show up here."`.

- [ ] **Step 2: Narrow the sheet's slot prop**

In `app/(app)/schedules/bookings-sheet.tsx`, add above `BookingsSheet`:

```ts
/** The slot fields the sheet reads; the dashboard adapts a `TodaySlot` to it. */
export type SheetSlot = Pick<ScheduleSlot, 'id' | 'booked_count' | 'capacity' | 'start_time' | 'end_time'>;
```

and change the prop type `slot: ScheduleSlot;` to `slot: SheetSlot;`. Run `pnpm --filter @iziwellpass/owner typecheck` — `slots-tab.tsx` passes a full `ScheduleSlot`, which still type-checks. If any other `slot.<field>` use in the file fails, add that field to the `Pick` rather than casting.

- [ ] **Step 3: The list**

`apps/owner/app/(app)/dashboard/attention-list.tsx`:

```tsx
'use client';

import { useMemo, useState } from 'react';
import { CircleCheckIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';

import { getVenueTodayQueryKey } from '@iziwellpass/api/generated';
import type {
  Member,
  Resource,
  Schedule,
  Staff,
  TodaySlot,
  TodaySnapshot,
} from '@iziwellpass/api/schemas';
import { useRole } from '@iziwellpass/auth/provider';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Button } from '@iziwellpass/ui/components/button';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';

import { useFocusRegistry } from '@/components/focus-registry';
import { isForbidden } from '@/lib/plan-errors';
import { attentionReason, attentionRows, slotTime } from '@/lib/today';

import { BookingsSheet, type SheetSlot } from '../schedules/bookings-sheet';
import { EditScheduleDialog } from '../schedules/schedule-dialogs';
import { SectionError } from './section-error';
import type { QueryLike } from './use-dashboard-data';

function toSheetSlot(slot: TodaySlot): SheetSlot {
  return {
    id: slot.slot_id,
    booked_count: slot.booked_count,
    capacity: slot.capacity,
    start_time: slot.start_utc,
    end_time: slot.end_utc,
  };
}

/**
 * « À régler » (`D2YWBH`, `r5BGk`): today's flagged sessions with one quick
 * fix each, opened in place (spec T5). Closing the sheet or the dialog
 * refetches the snapshot so a fixed row leaves the list.
 */
export function AttentionList({
  venueId,
  timeZone,
  today,
  schedules,
  resources,
  staff,
  members,
}: {
  venueId: string;
  timeZone: string | undefined;
  today: QueryLike<TodaySnapshot>;
  schedules: Schedule[];
  resources: Resource[];
  staff: Staff[];
  members: Member[];
}) {
  const t = useTranslations('dashboard');
  const role = useRole();
  const canEditCourses = role === 'owner' || role === 'admin';
  const canManageBookings = canEditCourses || role === 'receptionist';
  const queryClient = useQueryClient();
  const focus = useFocusRegistry();

  const [sheetSlot, setSheetSlot] = useState<TodaySlot | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<{ schedule: Schedule; slotId: string } | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const scheduleById = useMemo(() => new Map(schedules.map((s) => [s.id, s])), [schedules]);
  const rows = useMemo(() => (today.data ? attentionRows(today.data) : []), [today.data]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: getVenueTodayQueryKey(venueId) });
  };

  if (today.isLoading) {
    return (
      <div className="flex w-full max-w-[720px] flex-col gap-3" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }
  if (today.isError) {
    return (
      <SectionError
        error={today.error}
        fallback={isForbidden(today.error) ? t('errors.forbidden') : t('errors.today')}
      />
    );
  }
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="grid size-12 place-items-center rounded-full bg-success text-success-foreground">
          <CircleCheckIcon aria-hidden="true" className="size-5" />
        </div>
        <div className="flex max-w-sm flex-col gap-1">
          <p className="text-base font-medium">{t('attention.emptyTitle')}</p>
          <p className="text-base text-muted-foreground">{t('attention.emptyBody')}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ul className="flex w-full max-w-[720px] flex-col divide-y divide-border">
        {rows.map((slot) => {
          const reason = attentionReason(slot) ?? 'unknown';
          const schedule = scheduleById.get(slot.schedule_id);
          // The schedule to edit, or null when the row opens the participants sheet.
          const editable = reason === 'no_instructor' && canEditCourses ? schedule : undefined;
          return (
            <li
              key={slot.slot_id}
              className="flex min-h-16 flex-wrap items-center gap-x-6 gap-y-2 py-3"
            >
              <span className="w-14 font-numeric text-md">{slotTime(slot, timeZone)}</span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-2 text-base font-medium">
                  <span className="truncate">{slot.title ?? '—'}</span>
                  {slot.lifecycle === 'active' ? (
                    <Badge variant="success">{t('tile.active')}</Badge>
                  ) : null}
                </span>
                <span className="text-sm text-muted-foreground">{slot.resource_name ?? '—'}</span>
              </div>
              <div className="flex w-full items-center justify-end gap-3 md:w-auto">
                <Badge variant="warning">
                  {t(`attention.reason.${reason}`, {
                    booked: slot.booked_count,
                    capacity: slot.capacity,
                  })}
                </Badge>
                <Button
                  ref={focus.register(slot.slot_id)}
                  variant="outline"
                  size="sm"
                  className="max-md:h-11"
                  onClick={() => {
                    if (editable) {
                      setEditing({ schedule: editable, slotId: slot.slot_id });
                      setEditOpen(true);
                    } else {
                      setSheetSlot(slot);
                      setSheetOpen(true);
                    }
                  }}
                >
                  {editable ? t('attention.editCourse') : t('attention.seeRoster')}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {sheetSlot ? (
        <BookingsSheet
          slot={toSheetSlot(sheetSlot)}
          venueId={venueId}
          timeZone={timeZone}
          title={sheetSlot.title ?? '—'}
          dayLabel={t('day.today')}
          resourceName={sheetSlot.resource_name ?? '—'}
          members={members}
          canManageBookings={canManageBookings}
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) refresh();
          }}
          restoreFocusTo={() => focus.get(sheetSlot?.slot_id)}
        />
      ) : null}
      {editing ? (
        <EditScheduleDialog
          key={editing.schedule.id}
          venueId={venueId}
          schedule={editing.schedule}
          resources={resources}
          staff={staff}
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) refresh();
          }}
          restoreFocusTo={() => focus.get(editing?.slotId)}
        />
      ) : null}
    </>
  );
}
```

If `Button` does not forward `ref` (check `packages/ui/src/components/button.tsx`; React 19 function components accept `ref` as a prop), wrap the ref on a surrounding element instead — the registry needs the focusable button. If `size="sm"` is already 44px below `md`, drop `max-md:h-11`.

- [ ] **Step 4: The third tab**

In `app/(app)/page.tsx`:
- `type Tab = 'schedule' | 'checkins' | 'attention';`
- `const attentionCount = today.data ? attentionRows(today.data).length : 0;` (import `attentionRows` from `@/lib/today`), computed before the early returns is fine since it is not a hook.
- Add the trigger after « Derniers passages »: `<TabsTrigger value="attention">{attentionCount > 0 ? t('tabs.attentionCount', { count: attentionCount }) : t('tabs.attention')}</TabsTrigger>`
- Add the panel:

```tsx
          <TabsContent value="attention" className="flex w-full justify-center">
            <AttentionList
              venueId={venueId}
              timeZone={timeZone}
              today={today}
              schedules={schedules.data ?? []}
              resources={resources.data ?? []}
              staff={staff.data ?? []}
              members={list}
            />
          </TabsContent>
```

- [ ] **Step 5: Gates**

Run the Global Constraints gates and the parity check.

- [ ] **Step 6: Browser check**

Mock 8091, Next 3021, owner. On `/`, the third pill reads « À régler (3) » (or more, if the current hour flags another seeded slot). Rows show time, title, « En cours » on `slot-06`, room, the amber reason, one outline action. « Voir les participants » opens the participants sheet over the dashboard; Escape closes it and focus returns to the row button. « Modifier le cours » on « Stretching midi » opens the course dialog; pick an instructor, save; the row leaves the list and the count drops. Validate every confirmed participant of `slot-06` in the sheet, close → the row leaves the list. Screenshot desktop and 390px (rows wrap, 44px buttons) to `/tmp/spg-task6-*.png`. Also check the empty state by restarting the mock and resolving all three rows. As a receptionist is not available locally, confirm by reading that a receptionist sees « Voir les participants » on every row. Stop both servers.

- [ ] **Step 7: Commit**

```bash
git add 'apps/owner/app/(app)/dashboard/attention-list.tsx' 'apps/owner/app/(app)/page.tsx' 'apps/owner/app/(app)/schedules/bookings-sheet.tsx' apps/owner/messages
git commit -m "feat(owner): « À régler » tab with in-place participants and course fixes

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Capabilities provider, nav locks, plan row, `/plan`

**Files:**
- Modify: `packages/ui/src/app-shell.tsx`, `packages/ui/src/app-shell.test.tsx`
- Create: `apps/owner/components/capabilities/capabilities-provider.tsx`, `nav-lock.tsx`, `plan-row.tsx`
- Modify: `apps/owner/app/(app)/layout.tsx`
- Create: `apps/owner/app/(app)/plan/page.tsx`
- Modify: `apps/owner/messages/fr.json`, `apps/owner/messages/en.json`

**Interfaces:**
- Consumes: Task 2 (`capabilitiesValue`, `CapabilitiesValue`, `canManagePlan`, `isKnownPlan`, `minPlanFor`, `PLAN_CAPABILITIES`, `ALL_CAPABILITIES`, `upgradeHref`, `OwnerNavGroup.items[].capability`), `useGetCapabilities` from `@iziwellpass/api/generated`.
- Produces:
  - `NavItem.trailing?: ReactNode` in `@iziwellpass/ui/app-shell` (rendered after the title in the expanded column and the drawer, omitted on the rail).
  - `CapabilitiesProvider({ children })`, `useCapabilities(): CapabilitiesValue`.
  - `usePlanLabel(): (plan: string) => string` (exported from `capabilities-provider.tsx`) — known plans via `capabilities.plan.*`, unknown plans as the raw string.
  - `NavLock({ capability })`, `PlanRow({ collapsed?: boolean })`.
  - The whole `capabilities` message namespace (Task 8 uses the rest of it).

- [ ] **Step 1: AppShell trailing slot (test first)**

Add to `packages/ui/src/app-shell.test.tsx` (follow the file's existing render helpers and imports):

```tsx
  it('renders a nav item trailing slot in the expanded column only', () => {
    render(
      <AppShell
        title="IziWellPass"
        nav={[{ title: 'Équipe', href: '/staff', trailing: <span data-testid="lock">L</span> }]}
      >
        <p>content</p>
      </AppShell>,
    );
    expect(screen.getAllByTestId('lock').length).toBeGreaterThan(0);
  });
```

Run `pnpm --filter @iziwellpass/ui exec vitest run src/app-shell.test.tsx` → FAIL (type error on `trailing` or missing element). Then in `app-shell.tsx`: add `/** Rendered after the title (e.g. a plan lock); hidden on the collapsed rail. */ trailing?: ReactNode;` to `NavItem`, and inside the link, after the title span:

```tsx
                {!collapsed && item.trailing ? (
                  <span className="ml-auto flex items-center text-muted-foreground">
                    {item.trailing}
                  </span>
                ) : null}
```

Re-run → PASS.

- [ ] **Step 2: Messages — the `capabilities` namespace**

Add a new top-level `"capabilities"` object to `fr.json` (after `"shell"`):

```json
  "capabilities": {
    "plan": {
      "free": "Gratuit",
      "starter": "Starter",
      "pro": "Pro",
      "enterprise": "Entreprise"
    },
    "cap": {
      "activity_pricing": "Tarification par activité",
      "qr_checkin": "Entrée par QR",
      "staff_accounts": "Comptes équipe",
      "multi_venue": "Plusieurs établissements",
      "analytics": "Statistiques",
      "member_self_service": "Espace membre",
      "member_qr": "QR membre"
    },
    "benefit": {
      "staff_accounts": "Invitez des administrateurs, des coachs et des réceptionnistes, chacun avec son propre accès.",
      "multi_venue": "Gérez plusieurs établissements depuis la même console.",
      "activity_pricing": "Créez des offres par activité et attribuez-les à vos membres.",
      "qr_checkin": "Enregistrez les arrivées en scannant le QR du membre."
    },
    "locked": {
      "availableWith": "Disponible avec le plan {plan}",
      "description": "Disponible avec le plan {plan}. {benefit}",
      "upgrade": "Passer au plan {plan}",
      "compare": "Comparer les plans",
      "relogin": "Un changement de plan est visible après reconnexion."
    },
    "row": {
      "plan": "Plan {plan}",
      "change": "Changer"
    },
    "toast": {
      "upgrade": "Passez au plan {plan} pour {action}.",
      "seePlans": "Voir les plans",
      "forbidden": "Accès refusé."
    },
    "action": {
      "staffInvite": "inviter un membre de l'équipe",
      "venueCreate": "ajouter un établissement",
      "planCreate": "créer une offre",
      "subscriptionAssign": "attribuer une formule",
      "qrCheckin": "enregistrer une arrivée par QR"
    },
    "page": {
      "title": "Plan",
      "current": "Vous êtes sur le plan {plan}.",
      "feature": "Fonctionnalité",
      "yours": "Votre plan",
      "included": "Inclus",
      "notIncluded": "Non inclus",
      "contact": "Nous contacter",
      "unknown": "Plan indisponible pour le moment.",
      "mailSubject": "Passer au plan {plan}"
    }
  },
```

`en.json`, same position:

```json
  "capabilities": {
    "plan": {
      "free": "Free",
      "starter": "Starter",
      "pro": "Pro",
      "enterprise": "Enterprise"
    },
    "cap": {
      "activity_pricing": "Pricing per activity",
      "qr_checkin": "QR check-in",
      "staff_accounts": "Team accounts",
      "multi_venue": "Multiple venues",
      "analytics": "Statistics",
      "member_self_service": "Member space",
      "member_qr": "Member QR"
    },
    "benefit": {
      "staff_accounts": "Invite admins, coaches and receptionists, each with their own access.",
      "multi_venue": "Manage several venues from the same console.",
      "activity_pricing": "Create offers per activity and assign them to your members.",
      "qr_checkin": "Record arrivals by scanning the member's QR code."
    },
    "locked": {
      "availableWith": "Available on the {plan} plan",
      "description": "Available on the {plan} plan. {benefit}",
      "upgrade": "Upgrade to {plan}",
      "compare": "Compare plans",
      "relogin": "A plan change shows after you sign in again."
    },
    "row": {
      "plan": "{plan} plan",
      "change": "Change"
    },
    "toast": {
      "upgrade": "Upgrade to {plan} to {action}.",
      "seePlans": "See plans",
      "forbidden": "Access denied."
    },
    "action": {
      "staffInvite": "invite a team member",
      "venueCreate": "add a venue",
      "planCreate": "create an offer",
      "subscriptionAssign": "assign a membership",
      "qrCheckin": "record a QR check-in"
    },
    "page": {
      "title": "Plan",
      "current": "You're on the {plan} plan.",
      "feature": "Feature",
      "yours": "Your plan",
      "included": "Included",
      "notIncluded": "Not included",
      "contact": "Contact us",
      "unknown": "Plan unavailable right now.",
      "mailSubject": "Upgrade to {plan}"
    }
  },
```

- [ ] **Step 3: Provider**

`apps/owner/components/capabilities/capabilities-provider.tsx`:

```tsx
'use client';

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { unwrap } from '@iziwellpass/api/client';
import { useGetCapabilities } from '@iziwellpass/api/generated';

import { capabilitiesValue, isKnownPlan, type CapabilitiesValue } from '@/lib/capabilities';

const CapabilitiesContext = createContext<CapabilitiesValue>(capabilitiesValue(undefined, true));

/**
 * Loads `GET /capabilities` once per session (the plan only changes after
 * re-login, which remounts the tree — spec T6) and fails open (T7).
 */
export function CapabilitiesProvider({ children }: { children: ReactNode }) {
  const query = useGetCapabilities({
    query: { select: unwrap, staleTime: Infinity, gcTime: Infinity, retry: 1 },
  });
  const value = useMemo(
    () => capabilitiesValue(query.data, query.isLoading),
    [query.data, query.isLoading],
  );
  return <CapabilitiesContext.Provider value={value}>{children}</CapabilitiesContext.Provider>;
}

export function useCapabilities(): CapabilitiesValue {
  return useContext(CapabilitiesContext);
}

/** « Starter », « Entreprise »… — a plan the console does not know shows as sent. */
export function usePlanLabel(): (plan: string) => string {
  const t = useTranslations('capabilities.plan');
  return useCallback((plan: string) => (isKnownPlan(plan) ? t(plan) : plan), [t]);
}
```

- [ ] **Step 4: Nav lock and plan row**

`apps/owner/components/capabilities/nav-lock.tsx`:

```tsx
'use client';

import { LockIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { Capability } from '@iziwellpass/api/schemas';
import { Tooltip, TooltipContent, TooltipTrigger } from '@iziwellpass/ui/components/tooltip';

import { minPlanFor } from '@/lib/capabilities';

import { usePlanLabel } from './capabilities-provider';

/** Trailing lock on a nav item (`p6hCM` compact tooltip, title only). */
export function NavLock({ capability }: { capability: Capability }) {
  const t = useTranslations('capabilities.locked');
  const planLabel = usePlanLabel();
  const label = t('availableWith', { plan: planLabel(minPlanFor(capability)) });
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex items-center">
          <LockIcon aria-hidden="true" className="size-3.5!" />
          <span className="sr-only">{label}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
```

(`size-3.5!` beats the shell's `[&_svg]:size-[18px]`.)

`apps/owner/components/capabilities/plan-row.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { SparklesIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useRole } from '@iziwellpass/auth/provider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@iziwellpass/ui/components/tooltip';

import { canManagePlan } from '@/lib/capabilities';

import { useCapabilities, usePlanLabel } from './capabilities-provider';

/** « Plan Starter · Changer » above the venue switcher (`zCLZV`, spec §6.4). */
export function PlanRow({ collapsed = false }: { collapsed?: boolean }) {
  const t = useTranslations('capabilities.row');
  const role = useRole();
  const { status, plan } = useCapabilities();
  const planLabel = usePlanLabel();
  if (status !== 'ready' || !plan || !canManagePlan(role)) return null;
  const label = t('plan', { plan: planLabel(plan) });

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href="/plan"
            aria-label={label}
            className="grid size-11 place-items-center rounded-full text-muted-foreground hover:bg-accent/60"
          >
            <SparklesIcon aria-hidden="true" className="size-4" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex h-9 w-full items-center gap-2 px-3.5 text-sm">
      <SparklesIcon aria-hidden="true" className="size-4 text-muted-foreground" />
      <span className="text-muted-foreground">{label}</span>
      <Link
        href="/plan"
        className="ml-auto inline-flex min-h-9 items-center font-medium text-foreground hover:underline max-md:min-h-11"
      >
        {t('change')}
      </Link>
    </div>
  );
}
```

- [ ] **Step 5: Layout**

In `app/(app)/layout.tsx`:
1. Import `CapabilitiesProvider`, `useCapabilities` from `@/components/capabilities/capabilities-provider`, `NavLock` and `PlanRow`.
2. Move the `AppShell` render into a new component in the same file:

```tsx
/**
 * The shell, rendered inside the venue and capabilities providers so nav
 * items can carry a plan lock (spec §6.1).
 */
function Shell({ groups, children }: { groups: OwnerNavGroup[]; children: ReactNode }) {
  const pathname = usePathname();
  const tNav = useTranslations('nav');
  const tShell = useTranslations('shell');
  const { isLocked } = useCapabilities();
  const navGroups: NavGroup[] = groups.map((group) => ({
    label: group.scope === 'org' ? tNav('organizationGroup') : undefined,
    items: group.items.map((item) => {
      const Icon = NAV_ICONS[item.labelKey];
      return {
        title: tNav(item.labelKey),
        href: item.href,
        icon: <Icon aria-hidden />,
        trailing:
          item.capability && isLocked(item.capability) ? (
            <NavLock capability={item.capability} />
          ) : undefined,
      };
    }),
  }));

  return (
    <AppShell
      title="IziWellPass"
      navGroups={navGroups}
      navFooter={
        <>
          <PlanRow />
          <VenueSwitcher className="w-full" />
          <UserMenu variant="row" />
        </>
      }
      navFooterCollapsed={
        <>
          <PlanRow collapsed />
          <VenueSwitcher iconOnly />
          <UserMenu />
        </>
      }
      collapseLabel={tShell('collapseMenu')}
      expandLabel={tShell('expandMenu')}
      linkComponent={NavLink}
      currentPath={pathname}
      openMenuLabel={tShell('openMenu')}
      leading={<VenueSwitcher compact className="max-w-[200px]" />}
      actions={<UserMenu />}
    >
      {children}
    </AppShell>
  );
}
```

3. In `AppLayout`, keep the session/redirect logic, compute `groups` as today, drop the `navGroups` mapping (it moved), import `type OwnerNavGroup` from `@/lib/nav`, and return:

```tsx
  return (
    <VenueProvider>
      <CapabilitiesProvider>
        <Shell groups={groups}>{children}</Shell>
      </CapabilitiesProvider>
    </VenueProvider>
  );
```

Remove now-unused imports/variables (`tNav`, `tShell` in `AppLayout` if unused) so lint passes.

- [ ] **Step 6: `/plan` page**

`apps/owner/app/(app)/plan/page.tsx`:

```tsx
'use client';

import { CheckIcon, MinusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { Plan } from '@iziwellpass/api/schemas';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Button } from '@iziwellpass/ui/components/button';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { WorkingHeader, WorkingPage } from '@iziwellpass/ui/components/working-page';

import { useCapabilities, usePlanLabel } from '@/components/capabilities/capabilities-provider';
import { RequirePageAccess } from '@/components/page-access';
import { ALL_CAPABILITIES, PLAN_CAPABILITIES, upgradeHref } from '@/lib/capabilities';

const COLUMNS: readonly Plan[] = ['free', 'starter', 'pro'];

/** Enterprise grants what Pro grants; it sits in the Pro column (spec §7). */
function columnOf(plan: string | undefined): Plan | null {
  if (plan === 'enterprise') return 'pro';
  return COLUMNS.find((c) => c === plan) ?? null;
}

function PlanContent() {
  const t = useTranslations('capabilities');
  const planLabel = usePlanLabel();
  const { status, plan } = useCapabilities();
  const current = columnOf(plan);
  const salesEmail = process.env.NEXT_PUBLIC_SALES_EMAIL;
  // The next tier up: free (or unknown) → Starter, anything else → Pro.
  const contactPlan: Plan = current === 'free' || current === null ? 'starter' : 'pro';

  const description =
    status === 'loading' ? (
      <Skeleton className="h-4 w-48" />
    ) : status === 'ready' && plan ? (
      t('page.current', { plan: planLabel(plan) })
    ) : (
      t('page.unknown')
    );

  const mark = (included: boolean) =>
    included ? (
      <CheckIcon aria-label={t('page.included')} className="size-4 text-success-foreground" />
    ) : (
      <MinusIcon aria-label={t('page.notIncluded')} className="size-4 text-muted-foreground" />
    );

  return (
    <WorkingPage>
      <WorkingHeader title={t('page.title')} subtitle={description} />
      <div className="flex max-w-[720px] flex-col gap-10">
        {/* Desktop: comparison grid. */}
        <div className="hidden md:block" role="table" aria-label={t('page.title')}>
          <div role="row" className="grid grid-cols-[1fr_repeat(3,7rem)] items-end gap-2 pb-3">
            <span role="columnheader" className="text-sm text-muted-foreground">
              {t('page.feature')}
            </span>
            {COLUMNS.map((column) => (
              <span
                key={column}
                role="columnheader"
                className="flex flex-col items-center gap-1.5 text-base font-medium"
              >
                {current === column ? (
                  <Badge>{plan === 'enterprise' ? planLabel('enterprise') : t('page.yours')}</Badge>
                ) : null}
                {planLabel(column)}
              </span>
            ))}
          </div>
          <div className="divide-y divide-border border-t border-border">
            {ALL_CAPABILITIES.map((cap) => (
              <div
                key={cap}
                role="row"
                className="grid min-h-12 grid-cols-[1fr_repeat(3,7rem)] items-center gap-2"
              >
                <span role="rowheader" className="text-base">
                  {t(`cap.${cap}`)}
                </span>
                {COLUMNS.map((column) => (
                  <span key={column} role="cell" className="flex justify-center">
                    {mark(PLAN_CAPABILITIES[column].includes(cap))}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Phone: one block per plan. */}
        <div className="flex flex-col gap-8 md:hidden">
          {COLUMNS.map((column) => (
            <section key={column} className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2 text-lg font-medium">
                {planLabel(column)}
                {current === column ? (
                  <Badge>{plan === 'enterprise' ? planLabel('enterprise') : t('page.yours')}</Badge>
                ) : null}
              </h2>
              <ul className="divide-y divide-border">
                {ALL_CAPABILITIES.map((cap) => (
                  <li key={cap} className="flex min-h-11 items-center justify-between gap-4">
                    <span className="text-base">{t(`cap.${cap}`)}</span>
                    {mark(PLAN_CAPABILITIES[column].includes(cap))}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="flex flex-col items-start gap-3">
          {salesEmail?.trim() ? (
            <Button asChild>
              <a
                href={upgradeHref(
                  salesEmail,
                  t('page.mailSubject', { plan: planLabel(contactPlan) }),
                )}
              >
                {t('page.contact')}
              </a>
            </Button>
          ) : null}
          <p className="text-sm text-muted-foreground">{t('locked.relogin')}</p>
        </div>
      </div>
    </WorkingPage>
  );
}

export default function PlanPage() {
  return (
    <RequirePageAccess href="/plan">
      <PlanContent />
    </RequirePageAccess>
  );
}
```

Check `WorkingHeader`'s prop names in `packages/ui/src/components/working-page.tsx` (`title`, `subtitle`, `action` are used by `staff/page.tsx`); adapt if they differ. If `role="table"` markup trips an a11y lint rule, switch to a real `<table>` using `@iziwellpass/ui/components/table` with the same classes.

Add `NEXT_PUBLIC_SALES_EMAIL=` (empty) with a one-line comment to `apps/owner/.env.example` if that file exists; otherwise mention the variable in the `/plan` page's top comment only. Never edit `.env.local`.

- [ ] **Step 7: Gates**

Run the Global Constraints gates (the `ui` test is part of `pnpm test`) and the parity check.

- [ ] **Step 8: Browser check**

1. `PORT=8091 MOCK_PLAN=free`: owner sees a lock after « Offres » and « Équipe » in the sidebar (hover → « Disponible avec le plan Starter »), no lock when collapsed, footer « Plan Gratuit · Changer ». « Changer » opens `/plan` with the pill on « Gratuit ».
2. `MOCK_PLAN=starter`: no nav locks, footer « Plan Starter ».
3. Default `pro`: no locks, footer « Plan Pro ».
4. Stop the mock while the app is open and reload: no plan row, no locks, pages still work.
Screenshots to `/tmp/spg-task7-*.png`. Stop both servers.

- [ ] **Step 9: Commit**

```bash
git add packages/ui/src/app-shell.tsx packages/ui/src/app-shell.test.tsx apps/owner/components/capabilities 'apps/owner/app/(app)/layout.tsx' 'apps/owner/app/(app)/plan' apps/owner/messages
git add apps/owner/.env.example 2>/dev/null || true
git commit -m "feat(owner): plan capabilities provider, nav locks, plan row and /plan page

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Locked pages, locked buttons, upgrade and « Accès refusé » toasts

**Files:**
- Create: `apps/owner/components/capabilities/use-upgrade-toast.tsx`, `locked-button.tsx`, `locked-page.tsx`, `require-capability.tsx`
- Modify: `apps/owner/app/(app)/staff/page.tsx`, `apps/owner/app/(app)/staff/staff-dialogs.tsx`
- Modify: `apps/owner/app/(app)/plans/page.tsx`, `apps/owner/app/(app)/plans/plan-dialog.tsx`
- Modify: `apps/owner/app/(app)/venues/page.tsx`, `apps/owner/app/(app)/venues/new/page.tsx`, `apps/owner/components/venue-switcher.tsx`
- Modify: `apps/owner/app/(app)/members/[id]/subscriptions-section.tsx`, `apps/owner/app/(app)/members/[id]/assign-subscription-dialog.tsx`
- Modify: `apps/owner/components/checkin/use-register-checkin.ts`

**Interfaces:**
- Consumes: Task 2 (`minPlanFor`, `canManagePlan`, `CONSOLE_CAPABILITIES`, `BENEFIT_CAPABILITIES`, `upgradeHref`, `isFeatureNotAvailable`, `isForbidden`), Task 7 (`useCapabilities`, `usePlanLabel`, `capabilities.*` messages).
- Produces:
  - `useUpgradeToast(): (capability: Capability, action: string) => void`
  - `useToastApiError(): (err: unknown, opts: { fallback: string; capability: Capability; action: string }) => void`
  - `LockedButton({ capability, action, children, variant?, size?, className? })`
  - `LockedPage({ capability, title })`
  - `RequireCapability({ capability, title, when?, children })`

- [ ] **Step 1: Toast hooks**

`apps/owner/components/capabilities/use-upgrade-toast.tsx`:

```tsx
'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LockIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import type { Capability } from '@iziwellpass/api/schemas';
import { useRole } from '@iziwellpass/auth/provider';

import { apiErrorMessage } from '@/lib/api-error';
import { canManagePlan, minPlanFor } from '@/lib/capabilities';
import { isFeatureNotAvailable, isForbidden } from '@/lib/plan-errors';

import { usePlanLabel } from './capabilities-provider';

/**
 * « Passez au plan Pro pour ajouter un établissement. » (`p6hCM`). One toast
 * per capability at a time (sonner `id`), so repeated taps on a locked
 * control do not stack. « Voir les plans » only for owner/admin (spec T10).
 */
export function useUpgradeToast() {
  const t = useTranslations('capabilities.toast');
  const router = useRouter();
  const role = useRole();
  const planLabel = usePlanLabel();
  return useCallback(
    (capability: Capability, action: string) => {
      toast(t('upgrade', { plan: planLabel(minPlanFor(capability)), action }), {
        id: `upgrade-${capability}`,
        icon: <LockIcon className="size-4" aria-hidden="true" />,
        action: canManagePlan(role)
          ? { label: t('seePlans'), onClick: () => router.push('/plan') }
          : undefined,
      });
    },
    [planLabel, role, router, t],
  );
}

/**
 * Error toast for the plan-gated call sites (spec T9): upgrade copy for
 * `FEATURE_NOT_AVAILABLE`, « Accès refusé. » for any other permission 403,
 * the call site's own copy otherwise.
 */
export function useToastApiError() {
  const t = useTranslations('capabilities.toast');
  const showUpgrade = useUpgradeToast();
  return useCallback(
    (err: unknown, opts: { fallback: string; capability: Capability; action: string }) => {
      if (isFeatureNotAvailable(err)) {
        showUpgrade(opts.capability, opts.action);
        return;
      }
      toast.error(apiErrorMessage(err, isForbidden(err) ? t('forbidden') : opts.fallback));
    },
    [showUpgrade, t],
  );
}
```

- [ ] **Step 2: Locked button**

`apps/owner/components/capabilities/locked-button.tsx`:

```tsx
'use client';

import type { ComponentProps, ReactNode } from 'react';
import { LockIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { Capability } from '@iziwellpass/api/schemas';
import { Button } from '@iziwellpass/ui/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@iziwellpass/ui/components/tooltip';
import { cn } from '@iziwellpass/ui/lib/utils';

import { BENEFIT_CAPABILITIES, minPlanFor } from '@/lib/capabilities';

import { usePlanLabel } from './capabilities-provider';
import { useUpgradeToast } from './use-upgrade-toast';

/**
 * A plan-locked action (`p6hCM`): focusable (`aria-disabled`, never
 * `disabled` — spec T11), tooltip on hover/focus, upgrade toast on activation
 * (touch has no hover). Never calls the API.
 */
export function LockedButton({
  capability,
  action,
  children,
  variant = 'outline',
  size,
  className,
}: {
  capability: Capability;
  /** Toast phrase, e.g. « ajouter un établissement ». */
  action: string;
  children: ReactNode;
  variant?: ComponentProps<typeof Button>['variant'];
  size?: ComponentProps<typeof Button>['size'];
  className?: string;
}) {
  const t = useTranslations('capabilities');
  const planLabel = usePlanLabel();
  const showUpgrade = useUpgradeToast();
  const plan = planLabel(minPlanFor(capability));
  const hasBenefit = BENEFIT_CAPABILITIES.includes(capability);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={size}
          aria-disabled="true"
          className={cn('text-muted-foreground', className)}
          onClick={() => showUpgrade(capability, action)}
        >
          <LockIcon aria-hidden="true" />
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="flex max-w-[280px] flex-col gap-0.5 rounded-2xl px-3.5 py-2.5 text-left">
        <span className="text-md font-medium">{t('locked.availableWith', { plan })}</span>
        {hasBenefit ? (
          <span className="text-md font-normal text-primary-foreground/70">
            {t(`benefit.${capability as 'staff_accounts'}`)}
          </span>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}
```

(The `as 'staff_accounts'` narrows the dynamic key for next-intl's typed messages; drop it if the app's messages are not strictly typed and `tsc` accepts the plain template.)

- [ ] **Step 3: Locked page and guard**

`apps/owner/components/capabilities/locked-page.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { CheckIcon, LockIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { Capability } from '@iziwellpass/api/schemas';
import { useRole } from '@iziwellpass/auth/provider';
import { Button } from '@iziwellpass/ui/components/button';
import { cn } from '@iziwellpass/ui/lib/utils';

import {
  BENEFIT_CAPABILITIES,
  canManagePlan,
  CONSOLE_CAPABILITIES,
  minPlanFor,
  upgradeHref,
} from '@/lib/capabilities';

import { useCapabilities, usePlanLabel } from './capabilities-provider';

/** Full-page locked state (`zCLZV`, spec §6.2). */
export function LockedPage({ capability, title }: { capability: Capability; title: string }) {
  const t = useTranslations('capabilities');
  const role = useRole();
  const { has } = useCapabilities();
  const planLabel = usePlanLabel();
  const plan = planLabel(minPlanFor(capability));
  const benefit = BENEFIT_CAPABILITIES.includes(capability)
    ? t(`benefit.${capability as 'staff_accounts'}`)
    : '';
  const locked = CONSOLE_CAPABILITIES.filter((cap) => !has(cap));
  const granted = CONSOLE_CAPABILITIES.filter((cap) => has(cap));
  const salesEmail = process.env.NEXT_PUBLIC_SALES_EMAIL;

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-[440px] flex-col items-center gap-6 text-center">
        <div className="grid size-16 place-items-center rounded-full bg-secondary">
          <LockIcon aria-hidden="true" className="size-6" />
        </div>
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-normal">{title}</h1>
          <p className="text-md text-muted-foreground">
            {t('locked.description', { plan, benefit }).trim()}
          </p>
        </div>
        <ul className="w-full divide-y divide-border text-left">
          {[...locked, ...granted].map((cap) => {
            const isLocked = locked.includes(cap);
            return (
              <li key={cap} className="flex h-[38px] items-center gap-2.5 text-md">
                {isLocked ? (
                  <LockIcon aria-hidden="true" className="size-4 text-muted-foreground" />
                ) : (
                  <CheckIcon aria-hidden="true" className="size-4 text-success-foreground" />
                )}
                <span className={cn('flex-1', isLocked && 'text-muted-foreground')}>
                  {t(`cap.${cap}`)}
                </span>
                <span className="text-sm text-muted-strong">{planLabel(minPlanFor(cap))}</span>
              </li>
            );
          })}
        </ul>
        {canManagePlan(role) ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button asChild>
              <a href={upgradeHref(salesEmail, t('page.mailSubject', { plan }))}>
                {t('locked.upgrade', { plan })}
              </a>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/plan">{t('locked.compare')}</Link>
            </Button>
          </div>
        ) : null}
        <p className="text-sm text-muted-foreground">{t('locked.relogin')}</p>
      </div>
    </div>
  );
}
```

When `upgradeHref` returns `/plan`, a plain `<a>` still works; that is acceptable (no client-side navigation needed for a rare path).

`apps/owner/components/capabilities/require-capability.tsx`:

```tsx
'use client';

import type { ReactNode } from 'react';

import type { Capability } from '@iziwellpass/api/schemas';

import { useCapabilities } from './capabilities-provider';
import { LockedPage } from './locked-page';

/** Swaps a page body for the locked page when the plan lacks `capability`. */
export function RequireCapability({
  capability,
  title,
  when = true,
  children,
}: {
  capability: Capability;
  title: string;
  /** Extra condition, e.g. « a venue already exists » for `multi_venue`. */
  when?: boolean;
  children: ReactNode;
}) {
  const { isLocked } = useCapabilities();
  if (when && isLocked(capability)) return <LockedPage capability={capability} title={title} />;
  return <>{children}</>;
}
```

- [ ] **Step 4: Wire the locked pages**

- `staff/page.tsx` default export:

```tsx
export default function StaffPage() {
  const t = useTranslations('staff');
  return (
    <RequirePageAccess href="/staff">
      <RequireCapability capability="staff_accounts" title={t('title')}>
        <StaffContent />
      </RequireCapability>
    </RequirePageAccess>
  );
}
```

- `plans/page.tsx` default export: same shape with `useTranslations('plans')`, `capability="activity_pricing"`, `title={t('title')}` (confirm `plans.title` is the key `PlansHeader` uses; use that key).
- `venues/new/page.tsx` default export:

```tsx
export default function CreateVenuePage() {
  const t = useTranslations('venues');
  const { venues } = useVenueContext();
  return (
    <RequirePageAccess href="/venues">
      <RequireCapability capability="multi_venue" title={t('create.title')} when={venues.length > 0}>
        <CreateVenueContent />
      </RequireCapability>
    </RequirePageAccess>
  );
}
```

(import `useVenueContext` from `@/lib/venue-context` if not already imported).

- [ ] **Step 5: Wire the locked buttons**

- `venues/page.tsx` in `VenuesContent`: read `const { isLocked } = useCapabilities();` and `const tCap = useTranslations('capabilities');`, then

```tsx
  const createAction = canManage ? (
    venues.length > 0 && isLocked('multi_venue') ? (
      <LockedButton capability="multi_venue" action={tCap('action.venueCreate')}>
        {t('create.cta')}
      </LockedButton>
    ) : (
      <Button asChild>
        <Link href="/venues/new">
          <PlusIcon aria-hidden="true" />
          {t('create.cta')}
        </Link>
      </Button>
    )
  ) : null;
```

- `components/venue-switcher.tsx`: in the dropdown branch (venues exist), when `isLocked('multi_venue')` render the item as

```tsx
            <DropdownMenuItem
              aria-disabled="true"
              className="text-muted-foreground"
              onSelect={() => showUpgrade('multi_venue', tCap('action.venueCreate'))}
            >
              <LockIcon aria-hidden />
              {t('addVenue')}
            </DropdownMenuItem>
```

with `const showUpgrade = useUpgradeToast();`, `const { isLocked } = useCapabilities();`, `const tCap = useTranslations('capabilities');` added at the top of the component (before the early returns — hooks). The no-venue branch (first venue) is unchanged.

- `members/[id]/subscriptions-section.tsx` line ~160: replace `action={canManage ? <AssignSubscriptionDialog memberId={memberId} /> : undefined}` with

```tsx
        action={
          canManage ? (
            isLocked('activity_pricing') ? (
              <LockedButton
                capability="activity_pricing"
                action={tCap('action.subscriptionAssign')}
                size="sm"
              >
                {t('detail.subscriptions.assign')}
              </LockedButton>
            ) : (
              <AssignSubscriptionDialog memberId={memberId} />
            )
          ) : undefined
        }
```

using the same label key the dialog's trigger button renders (open `assign-subscription-dialog.tsx` around line 113 and copy its key and namespace exactly).

- [ ] **Step 6: Toasts at the gated call sites**

In each file add `const toastApiError = useToastApiError();` and `const tCap = useTranslations('capabilities');` next to the existing hooks, then replace the generic toast:

| File | Replace | With |
| --- | --- | --- |
| `staff/staff-dialogs.tsx` (invite `onError`) | `toast.error(apiErrorMessage(err, t('inviteDialog.error')));` | `toastApiError(err, { fallback: t('inviteDialog.error'), capability: 'staff_accounts', action: tCap('action.staffInvite') });` |
| `venues/new/page.tsx` (`onError`) | `toast.error(apiErrorMessage(err, t('create.error')));` | `toastApiError(err, { fallback: t('create.error'), capability: 'multi_venue', action: tCap('action.venueCreate') });` |
| `plans/plan-dialog.tsx` | the create call's `onError: (err) => onError(err, t('dialog.createError'))` | `onError: (err) => { if (!applyFieldErrors(form, err)) toastApiError(err, { fallback: t('dialog.createError'), capability: 'activity_pricing', action: tCap('action.planCreate') }); }` (the update path keeps `onError`) |
| `members/[id]/assign-subscription-dialog.tsx` | `toast.error(apiErrorMessage(err, t('detail.subscriptions.assignDialog.error')))` | `toastApiError(err, { fallback: t('detail.subscriptions.assignDialog.error'), capability: 'activity_pricing', action: tCap('action.subscriptionAssign') })` |

Remove imports that become unused (`apiErrorMessage`, `toast`) only where nothing else in the file uses them.

In `components/checkin/use-register-checkin.ts` (plan ruling R1): add `const showUpgrade = useUpgradeToast();` and `const tCap = useTranslations('capabilities');`, and at the top of the QR `onError` handler:

```ts
          if (route !== 'pass' && isFeatureNotAvailable(err)) {
            showUpgrade('qr_checkin', tCap('action.qrCheckin'));
            return;
          }
```

Add `showUpgrade` and `tCap` to that `useCallback`'s dependency list. Import `isFeatureNotAvailable` from `@/lib/plan-errors` and `useUpgradeToast` from `@/components/capabilities/use-upgrade-toast`. Update the `qrErrorMessage` doc comment's « a plan-gate 403 … must fall straight through » sentence only if it now reads wrong (the plan gate is intercepted before `qrErrorMessage` runs; say so in one line).

- [ ] **Step 7: Gates**

Run the Global Constraints gates and the parity check.

- [ ] **Step 8: Browser check (all plans)**

Mock on 8091, Next on 3021, owner.

1. `MOCK_PLAN=free`: `/staff` shows the locked page (« Équipe », « Disponible avec le plan Starter. Invitez … », six rows with every row locked and tags Starter/Pro, the two buttons, the re-login line); `/plans` locked; member detail « Attribuer une formule » is a locked button (hover tooltip; click → upgrade toast « Passez au plan Starter pour attribuer une formule. » with « Voir les plans », which opens `/plan`); dashboard: type a member QR token `iwp1.x` in the command bar → upgrade toast for QR; `/venues` « Ajouter un lieu » is a locked button (free lacks `multi_venue` too) and `/venues/new` shows the locked page.
2. `MOCK_PLAN=starter`: `/staff` and `/plans` normal; `/venues` « Ajouter un lieu » locked (280px tooltip with the title and « Gérez plusieurs établissements depuis la même console. »), the switcher item locked with a toast, `/venues/new` shows the locked page with « Plusieurs établissements » and « Statistiques » locked (Pro), then « Comptes équipe », « Tarification par activité », « Entrée par QR », « Espace membre » granted (Starter).
3. `pro`: nothing locked anywhere. The mock has no plain-403 route, so « Accès refusé. » is covered by `plan-errors.test.ts` and by reading `useToastApiError`; say so in the report.
4. Keyboard: Tab to a locked button → tooltip opens; Enter → toast; no request in the Network log (CDP `Network.requestWillBeSent` shows none for the gated route).
5. Phone width 390px: locked page readable, buttons ≥ 44px.

Screenshots to `/tmp/spg-task8-*.png`. Stop both servers.

- [ ] **Step 9: Commit**

```bash
git add apps/owner/components/capabilities 'apps/owner/app/(app)' apps/owner/components/venue-switcher.tsx apps/owner/components/checkin/use-register-checkin.ts
git commit -m "feat(owner): plan-locked pages and actions with upgrade and access-denied toasts

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Self-review (done while writing)

- **Spec coverage:** T2/§4.2 reasons and tiles → Tasks 1, 5; T3/§4.1 snapshot and stats → Task 4; T4/§4.3 date control → Tasks 1, 5; T5/§4.4 « À régler » → Task 6; T6/T7/T8 provider and matrix → Tasks 2, 7; T9/§6.5 toasts → Task 8; T10 roles → Tasks 2, 7, 8; T11 locked controls → Task 8; T12 upgrade target → Tasks 2, 7, 8; T13/§8 mock → Task 3; §6.1 nav locks → Tasks 2, 7; §6.2 locked page → Task 8; §6.3 locked button → Task 8; §6.4 plan row → Task 7; §7 `/plan` → Task 7; §9 errors → Tasks 5, 6, 8; §10 messages → Tasks 4–7; §11 tests → every task. §6.1 QR locks replaced by ruling R1.
- **Types:** `TodaySlot`/`TodaySnapshot`/`TodayAttendance`/`Capability`/`Plan`/`TenantCapabilitiesResponse` come from `@iziwellpass/api/schemas`; `DaySelection`, `SheetSlot`, `CapabilitiesValue` defined once and reused under the same names.
