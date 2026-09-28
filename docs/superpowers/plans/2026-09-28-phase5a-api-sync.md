# SP-H Phase 5A API Sync and Repairs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the web client to the iziwellpass b572a8b contract and repair the owner app's member screens: no lifecycle through the edit form, login e-mail locked, optimistic concurrency on member edits, suspend 204/409, a working « Réactiver », blocked venue narrowing explained, subscription names from the backend, wallet check-ins labelled.

**Architecture:** `web/openapi.json` is replaced by the backend's generated file and the orval client regenerated; owner code moves to the renamed types. Error handling for the new member conflicts goes through one pure classifier (`lib/member-errors.ts`) and the update payload through one pure builder (`lib/member-update.ts`), both node-tested; screens only render. The mock API server mirrors the new contract, with demo members for a version conflict and a blocked down-scope.

**Tech Stack:** Next 15, React 19, next-intl, TanStack Query 5, orval-generated client (`@iziwellpass/api/generated`, `@iziwellpass/api/schemas`), react-hook-form + zod 4, vitest 3 (owner: node environment, `lib/**/*.test.ts` only).

**Spec:** `docs/superpowers/specs/2026-09-28-phase5a-api-sync-design.md` (H1–H12). Read it first.

## Global Constraints

- H1: `web/openapi.json` = the backend's `docs/openapi.json` at iziwellpass b572a8b, byte for byte (copy of `/Users/abdel/dev/gymz-v1/iziwellpass/docs/openapi.json`; the backend checkout is at b572a8b and the file there is the committed one). No hand edits to `packages/api/src/generated/*`; regenerate with `pnpm --filter @iziwellpass/api generate`; `check-freshness` must pass.
- H2: the member and admin apps are not modified (they compile unchanged against the new client).
- H3: the edit form never sends `is_active`; lifecycle only via suspend/reactivate.
- H4: for `account.mode === 'login'` members the e-mail field is read-only with the hint and `email` is omitted from the update payload.
- H5: member edit, access scope and venues send `expected_version` = the loaded member's `version`, verbatim. On 409 `VERSION_MISMATCH`: refetch, keep the user's input, show the warning Alert (`TriangleAlertIcon`, `variant="warning"`) with « Ce membre a été modifié entre-temps. Vérifiez puis enregistrez à nouveau. ».
- Error codes (verbatim from the backend): `VERSION_MISMATCH`, `INVALID_LIFECYCLE_TRANSITION` (`details.current_status`), `ACCESS_DOWNSCOPE_BLOCKED` (`details.affected_venues: [{ venue_id, future_bookings }]`), `LOGIN_EMAIL_REQUIRES_SECURE_CHANGE`, `CONFLICT` (duplicate, 409).
- Copy is the spec §4 table, verbatim (fr and en). Message JSON files: edit by inserting/removing text with the Edit tool only, never parse and re-serialize; keep fr/en parity and each file's indentation.
- Design system « Le comptoir clair » (`DESIGN.md`): sentence case, one ink button per screen, Lucide icons at stroke 1.5, no em dashes in copy.
- Do not run `pnpm test --force` (the api test script runs orval; with `--force` turbo may replay/regenerate); if `git status` shows unexpected changes under `packages/api/src/generated/` after a test run, revert them with `git checkout -- packages/api/src/generated` unless the task is Task 1.
- Gates (from `web/`): `pnpm --filter @iziwellpass/<pkg> typecheck`, `… lint`, `… test` for touched packages; before committing a task also `pnpm typecheck && pnpm lint && pnpm test`.
- Commits: `feat(api): …`, `feat(owner): …`, `fix(owner): …`, each ending with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- Worktree: `web/.worktrees/feat-phase5a-sync`, branch `feat/phase5a-sync` off local `main`.
- **Browser checks** (Tasks 4–7): mock API on port 8091, Next on 3021, Chrome debugging port 9335. Never touch 8090, 3011, 8082 (the user's own processes). Mock: `PORT=8091 node apps/owner/scripts/mock-server.mjs`; Next: `NEXT_PUBLIC_AUTH_MOCK=1 API_PROXY_TARGET=http://localhost:8091 NEXT_PUBLIC_API_BASE_URL=/api/backend CONTROL_PLANE_PROXY_TARGET=http://localhost:8091 NEXT_PUBLIC_CONTROL_PLANE_BASE_URL=/api/control pnpm --filter @iziwellpass/owner exec next dev --port 3021`; sign in with any e-mail and password `owner`. Chrome for Testing: `"/Users/abdel/.cache/puppeteer/chrome/mac_arm-151.0.7922.47/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing" --headless=new --disable-gpu --disable-dev-shm-usage --remote-debugging-port=9335 --user-data-dir=/tmp/sph-chrome --lang=fr-FR` plus `Emulation.setUserAgentOverride({ userAgent, acceptLanguage: 'fr-FR,fr' })`. Drive from ONE `/tmp/sph-task<N>.mjs` CDP script run in the FOREGROUND; never background a script and wait on it. Time box each task's browser check to 20 minutes; a step that still fails after one retry is recorded as UNVERIFIED and the task moves on. Type into inputs with one `Input.insertText` call per character. Viewports 390×844 (deviceScaleFactor 2) and 1440×900. Screenshots to `/tmp/sph-task<N>-*.png`. Stop everything you start; confirm 8091/3021/9335 are free.
- Owner app locale is fixed to `fr` (pre-existing); English copy is verified in JSON only.
- Radius tokens are non-standard here (`rounded-2xl` = 28px, `rounded-xl`/`rounded-3xl` = 24px, `rounded-lg` = 20px); use existing components rather than new radii.

**Plan rulings (spec details decided while planning):**

- **P1 — The is_active toggle goes in Task 1.** Removing it is required for the owner app to compile against the new `UpdateMemberRequest`; the rest of the edit-form work (H4, H5) is Task 4.
- **P2 — Wallet badge has no icon.** The check-in feed badges carry text only today; « Wallet » uses the `info` badge variant like « QR » (both are self-service scans). Spec H10's icon line is superseded.
- **P3 — Mock identity mode.** A mock member is `login` when it was created with an e-mail, `roster` otherwise (seed and `POST /members` alike), mirroring the backend's typical tenant policy.
- **P4 — Access dialog resets only when it opens.** Today it also resets when `member.access_scope` changes, which would wipe the user's selection after the H5 refetch; the reset now runs on the closed→open transition only.
- **P5 — Venue names for down-scope lines come from `useListVenues`** (the tenant's venues), already cached by the venue selector.

## Review Focus

1. **Saving an edit twice in a row after a conflict** → the second save must use the refetched `version`, not the stale one; pinned in Task 2 (`buildMemberUpdate` takes the version it is given) and Task 4 (the submit reads `member.version` at submit time; browser step).
2. **A login member whose e-mail field is untouched** → the update must not carry `email` at all (not even the same value), or the backend could refuse it; pinned in Task 2 (`buildMemberUpdate` omits the key for `login`).
3. **A conflict or down-scope error with missing or malformed `details`** → the screen still shows the generic message for that kind, never crashes; pinned in Task 2 (`classifyMemberError` tests with absent/garbled details).
4. **Suspending from the members list a member who was already suspended elsewhere** → « Ce membre n'est plus actif. », list refreshed, dialog closed; pinned in Task 6 (suspend dialog handles `invalidLifecycle` from both the row menu and the danger zone; browser step).
5. **An affected venue id the tenant's venue list doesn't contain** → the line reads « Salle inconnue · n réservations à venir », order kept; pinned in Task 2 (`downscopeLines` test).

---

## File Structure

| File | Task | Responsibility |
| --- | --- | --- |
| `openapi.json`, `packages/api/src/generated/*` | 1 | New contract, regenerated client |
| 25 owner files importing `Member` / `MemberSubscription` / `PaginatedApiResponseVecMember` | 1 | Renamed types |
| `apps/owner/app/(app)/members/[id]/edit-member-form.tsx` | 1, 4 | Task 1: drop the is_active field; Task 4: login lock, version, conflict |
| `apps/owner/messages/{fr,en}.json` | 1, 4–7 | Copy |
| `apps/owner/lib/member-errors.ts` (+test) | 2 | `classifyMemberError`, `downscopeLines` |
| `apps/owner/lib/member-update.ts` (+test) | 2 | `buildMemberUpdate` |
| `apps/owner/lib/checkin-feed.ts` (+test) | 2 | `methodBadge(method)` |
| `apps/owner/scripts/mock-server.mjs` | 3 | Contract mirror + demo hooks |
| `apps/owner/app/(app)/members/[id]/page.tsx` | 4 | Pass the profile down |
| `apps/owner/app/(app)/members/[id]/edit-access-dialog.tsx` | 5 | Version, conflict, down-scope |
| `apps/owner/app/(app)/members/suspend-member-dialog.tsx` | 6 | 204 / 409 |
| `apps/owner/app/(app)/members/[id]/reactivate-member-dialog.tsx` | 6 | New confirm dialog |
| `apps/owner/app/(app)/members/[id]/danger-zone.tsx` | 6 | Buttons by status |
| `apps/owner/app/(app)/members/[id]/subscriptions-section.tsx` | 7 | Backend plan/venue names |
| `apps/owner/components/checkin/checkin-feed.tsx` | 7 | Wallet label |

---

### Task 1: Contract sync, regenerated client, renames, no is_active toggle

**Files:**
- Modify: `openapi.json`, `packages/api/src/generated/endpoints.ts`, `packages/api/src/generated/endpoints.schemas.ts` (regenerated)
- Modify (owner, rename imports/usages): `app/(app)/dashboard/attention-list.tsx`, `app/(app)/dashboard/kpi-row.tsx`, `app/(app)/dashboard/starter.tsx`, `app/(app)/members/[id]/cancel-subscription-dialog.tsx`, `app/(app)/members/[id]/danger-zone.tsx`, `app/(app)/members/[id]/edit-access-dialog.tsx`, `app/(app)/members/[id]/edit-member-form.tsx`, `app/(app)/members/[id]/member-header.tsx`, `app/(app)/members/[id]/membership-section.tsx`, `app/(app)/members/[id]/subscriptions-section.tsx`, `app/(app)/members/member-row.tsx`, `app/(app)/members/members-directory.tsx`, `app/(app)/members/suspend-member-dialog.tsx`, `app/(app)/schedules/bookings-sheet.tsx`, `app/(app)/schedules/planning-utils.ts`, `components/checkin/checkin-command.tsx`, `components/checkin/checkin-feed.tsx`, `components/checkin/use-register-checkin.ts`, `lib/all-members.ts`, `lib/member-search.ts`, `lib/member-search.test.ts`, `lib/member-status.ts`, `lib/member-status.test.ts`
- Modify: `apps/owner/messages/fr.json`, `apps/owner/messages/en.json` (remove the toggle's keys)

**Interfaces:**
- Produces: `StaffMemberView` (all former `Member` fields except `user_id`, plus `version: string`), `StaffMemberProfile` (= `StaffMemberView` & `{ access: MemberAccessView; account: MemberAccountSummary }`), `StaffSubscriptionView` (adds `plan_name`, `plan_kind`, `venue_name`, `assigned_by_name`; no `assigned_by`), hooks `useReactivateMember`, `useUpdateMember` / `useSetMemberAccess` / `useSetMemberVenues` whose mutation variables accept `params: { expected_version?: string }`, `CheckInMethod.wallet`.

- [ ] **Step 1: Replace the contract and regenerate**

```bash
cp /Users/abdel/dev/gymz-v1/iziwellpass/docs/openapi.json openapi.json
git -C /Users/abdel/dev/gymz-v1/iziwellpass log -1 --format=%h -- docs/openapi.json   # expect 63c74ac (part of b572a8b)
pnpm --filter @iziwellpass/api generate
```

Then run `(cd apps/owner && pnpm exec tsc --noEmit)` and keep the error list: it must be the rename set below plus `is_active` in `edit-member-form.tsx`. `(cd apps/admin && pnpm exec tsc --noEmit)` and `(cd apps/member && pnpm exec tsc --noEmit)` must already pass.

- [ ] **Step 2: Rename the types**

In every owner file listed above, replace imports and usages:
- `Member` (the schema type from `@iziwellpass/api/schemas`) → `StaffMemberView`
- `MemberSubscription` → `StaffSubscriptionView`
- `PaginatedApiResponseVecMember` → `PaginatedApiResponseVecStaffMemberView`

Keep local names readable: where a file uses `Member` many times, `import type { StaffMemberView } from '@iziwellpass/api/schemas'` and rename the usages (do not alias it back to `Member`). Grep afterwards: `grep -rn "user_id\|assigned_by\b" apps/owner/app apps/owner/lib apps/owner/components` must show no member/subscription reads (staff `user_id` usages in check-in `recordedByLabel` are unrelated and stay). In `lib/member-search.test.ts` and `lib/member-status.test.ts`, fixtures typed as the member view gain `version: '2026-09-01T00:00:00Z'` and lose `user_id`.

- [ ] **Step 3: Remove the edit form's status toggle (P1, H3)**

In `apps/owner/app/(app)/members/[id]/edit-member-form.tsx`:
- delete `is_active: z.enum(['active', 'inactive']),` from the schema,
- delete `is_active: m.is_active ? 'active' : 'inactive',` from `toDefaults`,
- delete `is_active: values.is_active === 'active',` from the payload,
- delete the whole `{/* UpdateMemberRequest exposes is_active … */}` comment and the `<FormField … name="is_active" …/>` block.

In `apps/owner/messages/fr.json` and `en.json`, under `members.detail.edit`, remove the keys `active`, `activeHint`, `activeOption`, `inactiveOption` (first `grep -rn "detail.edit.active\|activeOption\|inactiveOption\|activeHint" apps/owner/app apps/owner/components` to confirm nothing else uses them).

- [ ] **Step 4: Run the gates**

Run: `pnpm --filter @iziwellpass/owner typecheck && pnpm --filter @iziwellpass/owner lint && pnpm --filter @iziwellpass/owner test && pnpm --filter @iziwellpass/api test && pnpm typecheck && pnpm lint && pnpm test`
Expected: PASS; the api test prints `check-freshness: generated client is up to date`; `git status` shows no other generated drift.

- [ ] **Step 5: Commit**

```bash
git add openapi.json packages/api/src/generated apps/owner
git commit -m "feat(api): sync the client with backend b572a8b (Phase 5A member contract)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Pure helpers (error classifier, update builder, check-in method badge)

**Files:**
- Create: `apps/owner/lib/member-errors.ts`, `apps/owner/lib/member-errors.test.ts`, `apps/owner/lib/member-update.ts`, `apps/owner/lib/member-update.test.ts`
- Modify: `apps/owner/lib/checkin-feed.ts`, `apps/owner/lib/checkin-feed.test.ts`

**Interfaces:**
- Consumes: `ApiError` from `@iziwellpass/api/client` (`new ApiError(status, { code, message, details? }, requestId?)`); `MemberAccountMode`, `MembershipType`, `UpdateMemberRequest`, `CheckInMethod` from `@iziwellpass/api/schemas` (Task 1).
- Produces:
  - `interface AffectedVenue { venueId: string; futureBookings: number }`
  - `type MemberError = { kind: 'versionMismatch' } | { kind: 'invalidLifecycle'; currentStatus?: string } | { kind: 'downscopeBlocked'; affected: AffectedVenue[] } | { kind: 'loginEmailLocked' } | { kind: 'duplicate' } | { kind: 'other' }`
  - `classifyMemberError(err: unknown): MemberError`
  - `interface DownscopeLine { venueId: string; name: string; count: number }`, `downscopeLines(affected: AffectedVenue[], venues: readonly { id: string; name: string }[], unknownLabel: string): DownscopeLine[]`
  - `interface MemberFormValues { first_name: string; last_name: string; email: string; phone: string; membership_type: MembershipType; membership_end: string; notes: string }`
  - `buildMemberUpdate(values: MemberFormValues, ctx: { mode: MemberAccountMode; version: string }): { data: UpdateMemberRequest; params: { expected_version: string } }`
  - `type MethodBadge = { labelKey: 'methodQr' | 'methodWallet' | 'methodManual'; variant: 'info' | 'default' }`, `methodBadge(method: CheckInMethod): MethodBadge`

- [ ] **Step 1: Write the failing tests**

`apps/owner/lib/member-errors.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { ApiError } from '@iziwellpass/api/client';

import { classifyMemberError, downscopeLines } from './member-errors';

const api = (status: number, code: string, details?: unknown) =>
  new ApiError(status, { code, message: 'x', details });

describe('classifyMemberError', () => {
  it('maps a stale version', () => {
    expect(classifyMemberError(api(409, 'VERSION_MISMATCH'))).toEqual({ kind: 'versionMismatch' });
  });

  it('maps a lifecycle refusal with its current status', () => {
    expect(
      classifyMemberError(
        api(409, 'INVALID_LIFECYCLE_TRANSITION', {
          operation: 'suspend',
          current_status: 'suspended',
          required_status: 'active',
        }),
      ),
    ).toEqual({ kind: 'invalidLifecycle', currentStatus: 'suspended' });
  });

  it('keeps the lifecycle kind when details are missing or garbled', () => {
    expect(classifyMemberError(api(409, 'INVALID_LIFECYCLE_TRANSITION'))).toEqual({
      kind: 'invalidLifecycle',
    });
    expect(classifyMemberError(api(409, 'INVALID_LIFECYCLE_TRANSITION', 'oops'))).toEqual({
      kind: 'invalidLifecycle',
    });
  });

  it('maps a blocked down-scope with its affected venues', () => {
    expect(
      classifyMemberError(
        api(409, 'ACCESS_DOWNSCOPE_BLOCKED', {
          affected_venues: [
            { venue_id: 'v2', future_bookings: 2 },
            { venue_id: 'v3', future_bookings: 1 },
          ],
        }),
      ),
    ).toEqual({
      kind: 'downscopeBlocked',
      affected: [
        { venueId: 'v2', futureBookings: 2 },
        { venueId: 'v3', futureBookings: 1 },
      ],
    });
  });

  it('drops malformed affected entries and survives missing details', () => {
    expect(
      classifyMemberError(
        api(409, 'ACCESS_DOWNSCOPE_BLOCKED', {
          affected_venues: [{ venue_id: 'v2' }, { venue_id: 4, future_bookings: 1 }, null, { venue_id: 'v5', future_bookings: 3 }],
        }),
      ),
    ).toEqual({ kind: 'downscopeBlocked', affected: [{ venueId: 'v5', futureBookings: 3 }] });
    expect(classifyMemberError(api(409, 'ACCESS_DOWNSCOPE_BLOCKED'))).toEqual({
      kind: 'downscopeBlocked',
      affected: [],
    });
  });

  it('maps the login e-mail lock and duplicates', () => {
    expect(classifyMemberError(api(409, 'LOGIN_EMAIL_REQUIRES_SECURE_CHANGE'))).toEqual({
      kind: 'loginEmailLocked',
    });
    expect(classifyMemberError(api(409, 'CONFLICT'))).toEqual({ kind: 'duplicate' });
  });

  it('falls back to other', () => {
    expect(classifyMemberError(api(400, 'VALIDATION_ERROR'))).toEqual({ kind: 'other' });
    expect(classifyMemberError(api(500, 'CONFLICT'))).toEqual({ kind: 'other' });
    expect(classifyMemberError(new Error('network'))).toEqual({ kind: 'other' });
    expect(classifyMemberError(undefined)).toEqual({ kind: 'other' });
  });
});

describe('downscopeLines', () => {
  const venues = [
    { id: 'v1', name: 'Studio Téranga' },
    { id: 'v2', name: 'Espace Wellness Plateau' },
  ];

  it('names each venue and keeps the backend order', () => {
    expect(
      downscopeLines(
        [
          { venueId: 'v2', futureBookings: 2 },
          { venueId: 'v1', futureBookings: 1 },
        ],
        venues,
        'Salle inconnue',
      ),
    ).toEqual([
      { venueId: 'v2', name: 'Espace Wellness Plateau', count: 2 },
      { venueId: 'v1', name: 'Studio Téranga', count: 1 },
    ]);
  });

  it('labels an unknown venue', () => {
    expect(downscopeLines([{ venueId: 'v9', futureBookings: 4 }], venues, 'Salle inconnue')).toEqual([
      { venueId: 'v9', name: 'Salle inconnue', count: 4 },
    ]);
  });
});
```

`apps/owner/lib/member-update.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { buildMemberUpdate, type MemberFormValues } from './member-update';

const values: MemberFormValues = {
  first_name: 'Awa',
  last_name: 'Ndiaye',
  email: 'awa@example.sn',
  phone: '',
  membership_type: 'monthly',
  membership_end: '',
  notes: '',
};

describe('buildMemberUpdate', () => {
  it('sends the given version as expected_version', () => {
    expect(buildMemberUpdate(values, { mode: 'roster', version: 'v-7' }).params).toEqual({
      expected_version: 'v-7',
    });
  });

  it('never sends is_active', () => {
    const { data } = buildMemberUpdate(values, { mode: 'roster', version: 'v' });
    expect(Object.keys(data)).not.toContain('is_active');
  });

  it('omits email entirely for a login member', () => {
    const { data } = buildMemberUpdate(values, { mode: 'login', version: 'v' });
    expect('email' in data).toBe(false);
  });

  it('sends the e-mail (or null) for a roster member', () => {
    expect(buildMemberUpdate(values, { mode: 'roster', version: 'v' }).data.email).toBe(
      'awa@example.sn',
    );
    expect(
      buildMemberUpdate({ ...values, email: '' }, { mode: 'roster', version: 'v' }).data.email,
    ).toBeNull();
  });

  it('turns empty optional fields into null', () => {
    const { data } = buildMemberUpdate(values, { mode: 'roster', version: 'v' });
    expect(data).toMatchObject({
      first_name: 'Awa',
      last_name: 'Ndiaye',
      phone: null,
      membership_type: 'monthly',
      membership_end: null,
      notes: null,
    });
  });
});
```

Append to `apps/owner/lib/checkin-feed.test.ts` (add `methodBadge` to its import from `./checkin-feed`):

```ts
describe('methodBadge', () => {
  it('labels each check-in method', () => {
    expect(methodBadge('qr')).toEqual({ labelKey: 'methodQr', variant: 'info' });
    expect(methodBadge('wallet')).toEqual({ labelKey: 'methodWallet', variant: 'info' });
    expect(methodBadge('manual')).toEqual({ labelKey: 'methodManual', variant: 'default' });
  });
});
```

(If `describe`/`it`/`expect` are not yet imported in that file, import them from `vitest` as the file's other tests do.)

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @iziwellpass/owner test`
Expected: FAIL (modules and `methodBadge` missing).

- [ ] **Step 3: Implement**

`apps/owner/lib/member-errors.ts`:

```ts
import { ApiError } from '@iziwellpass/api/client';

/** A venue a down-scope would remove while the member still has bookings there. */
export interface AffectedVenue {
  venueId: string;
  futureBookings: number;
}

/**
 * What a member write's failure means for the screen. The backend's Phase 5A
 * conflicts carry structured `details`; anything missing or malformed degrades
 * to the kind without details, never to a crash.
 */
export type MemberError =
  | { kind: 'versionMismatch' }
  | { kind: 'invalidLifecycle'; currentStatus?: string }
  | { kind: 'downscopeBlocked'; affected: AffectedVenue[] }
  | { kind: 'loginEmailLocked' }
  | { kind: 'duplicate' }
  | { kind: 'other' };

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseAffected(value: unknown): AffectedVenue[] {
  if (!Array.isArray(value)) return [];
  const out: AffectedVenue[] = [];
  for (const entry of value) {
    const e = asRecord(entry);
    if (e && typeof e.venue_id === 'string' && typeof e.future_bookings === 'number') {
      out.push({ venueId: e.venue_id, futureBookings: e.future_bookings });
    }
  }
  return out;
}

export function classifyMemberError(err: unknown): MemberError {
  if (!(err instanceof ApiError)) return { kind: 'other' };
  const details = asRecord(err.details);
  switch (err.code) {
    case 'VERSION_MISMATCH':
      return { kind: 'versionMismatch' };
    case 'INVALID_LIFECYCLE_TRANSITION':
      return typeof details?.current_status === 'string'
        ? { kind: 'invalidLifecycle', currentStatus: details.current_status }
        : { kind: 'invalidLifecycle' };
    case 'ACCESS_DOWNSCOPE_BLOCKED':
      return { kind: 'downscopeBlocked', affected: parseAffected(details?.affected_venues) };
    case 'LOGIN_EMAIL_REQUIRES_SECURE_CHANGE':
      return { kind: 'loginEmailLocked' };
    case 'CONFLICT':
      return err.status === 409 ? { kind: 'duplicate' } : { kind: 'other' };
    default:
      return { kind: 'other' };
  }
}

export interface DownscopeLine {
  venueId: string;
  name: string;
  count: number;
}

/** One line per blocked venue, in the backend's order, named from the tenant's venues. */
export function downscopeLines(
  affected: AffectedVenue[],
  venues: readonly { id: string; name: string }[],
  unknownLabel: string,
): DownscopeLine[] {
  const names = new Map(venues.map((v) => [v.id, v.name]));
  return affected.map((a) => ({
    venueId: a.venueId,
    name: names.get(a.venueId) ?? unknownLabel,
    count: a.futureBookings,
  }));
}
```

`apps/owner/lib/member-update.ts`:

```ts
import type {
  MemberAccountMode,
  MembershipType,
  UpdateMemberRequest,
} from '@iziwellpass/api/schemas';

/** The edit form's values (strings as typed; empty means « not set »). */
export interface MemberFormValues {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  membership_type: MembershipType;
  membership_end: string;
  notes: string;
}

/**
 * The `PUT /gms/v1/members/{mid}` payload. Never carries `is_active` (the
 * backend rejects unknown fields). A login member's e-mail changes only through
 * the secure flow, so the key is left out entirely for them. `expected_version`
 * is the member's `version` as last loaded, echoed verbatim (optimistic
 * concurrency: a mismatch is a 409 and nothing is written).
 */
export function buildMemberUpdate(
  values: MemberFormValues,
  ctx: { mode: MemberAccountMode; version: string },
): { data: UpdateMemberRequest; params: { expected_version: string } } {
  const data: UpdateMemberRequest = {
    first_name: values.first_name,
    last_name: values.last_name,
    phone: values.phone || null,
    membership_type: values.membership_type,
    membership_end: values.membership_end || null,
    notes: values.notes || null,
  };
  if (ctx.mode !== 'login') {
    data.email = values.email || null;
  }
  return { data, params: { expected_version: ctx.version } };
}
```

In `apps/owner/lib/checkin-feed.ts` add (import `CheckInMethod` as a type from `@iziwellpass/api/schemas` if not already imported):

```ts
export type MethodBadge = {
  labelKey: 'methodQr' | 'methodWallet' | 'methodManual';
  variant: 'info' | 'default';
};

/** Feed badge per check-in method: self-service scans (QR, wallet) in blue, staff entry neutral. */
export function methodBadge(method: CheckInMethod): MethodBadge {
  switch (method) {
    case 'qr':
      return { labelKey: 'methodQr', variant: 'info' };
    case 'wallet':
      return { labelKey: 'methodWallet', variant: 'info' };
    default:
      return { labelKey: 'methodManual', variant: 'default' };
  }
}
```

- [ ] **Step 4: Run the gates**

Run: `pnpm --filter @iziwellpass/owner test && pnpm --filter @iziwellpass/owner typecheck && pnpm --filter @iziwellpass/owner lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/owner/lib/member-errors.ts apps/owner/lib/member-errors.test.ts apps/owner/lib/member-update.ts apps/owner/lib/member-update.test.ts apps/owner/lib/checkin-feed.ts apps/owner/lib/checkin-feed.test.ts
git commit -m "feat(owner): member error classifier, update builder, check-in method badge

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Mock API server mirrors the Phase 5A member contract

**Files:**
- Modify: `apps/owner/scripts/mock-server.mjs`

**Interfaces:**
- Produces (HTTP, for Tasks 4–7): members without `user_id`, with `version`; `GET /gms/v1/members/{mid}` → profile with `access` and `account`; `PUT /members/{mid}` 400 on unknown fields, 409 `LOGIN_EMAIL_REQUIRES_SECURE_CHANGE`, `expected_version` → 409 `VERSION_MISMATCH`; `PUT /members/{mid}/suspend` and `/reactivate` → 204 or 409 `INVALID_LIFECYCLE_TRANSITION`; `PUT /members/{mid}/access` and `/venues` honour `expected_version`; `/venues` → 409 `ACCESS_DOWNSCOPE_BLOCKED`; subscriptions with names; one wallet check-in. Demo hooks: `mbr-05` (Bineta Cissé, login) conflicts once on its first versioned write; `mbr-09` (Ndeye Faye, venues 1+2) narrowing that drops venue 2 is blocked (2 future bookings); `mbr-06` is suspended (reactivate demo); `mbr-03` has no e-mail (roster edit demo).

- [ ] **Step 1: Member shape, version, identity mode**

In `mkMember`: delete `user_id: …`, add `version: iso(daysFromNow(Math.max(startDaysOffset, -30))),` (same value as `updated_at`), and after building the object record its mode: replace `return { … };` with

```js
  const member = { …same fields as today, without user_id, plus version… };
  memberMode.set(id, email ? 'login' : 'roster');
  return member;
```

Declare right after `const memberVenues = new Map();` (it must exist before the `members` seed runs `mkMember`): `const memberMode = new Map(); // P3: login when created with an e-mail`.

Add these helpers in the `// ---- members` section (before `listMembersHandler`):

```js
let lastVersionMs = 0;
/** Bump updated_at and the optimistic-concurrency token; strictly increasing. */
function touch(member) {
  lastVersionMs = Math.max(Date.now(), lastVersionMs + 1);
  member.updated_at = iso(new Date(lastVersionMs));
  member.version = member.updated_at;
}

function memberAccess(member) {
  return {
    access_scope: member.access_scope,
    venue_ids: member.access_scope === 'chain_wide' ? [] : (memberVenues.get(member.id) ?? []),
  };
}

function memberProfile(member) {
  const login = memberMode.get(member.id) === 'login';
  return {
    ...member,
    access: memberAccess(member),
    account: {
      mode: login ? 'login' : 'roster',
      invitation: login ? 'accepted' : 'not_applicable',
      email: login ? 'verified' : 'not_applicable',
      email_change: null,
      invitation_resend: null,
    },
  };
}

// Demo: mbr-05's first versioned write reports a concurrent change (and bumps
// its version), the retry with the refetched version succeeds.
const conflictOnce = new Set(['mbr-05']);

function versionConflict(member, query) {
  const expected = query.get('expected_version');
  if (!expected) return null;
  if (conflictOnce.delete(member.id)) {
    touch(member);
    return [409, errorBody('VERSION_MISMATCH', 'The member was modified concurrently')];
  }
  if (expected !== member.version) {
    return [409, errorBody('VERSION_MISMATCH', 'The member was modified concurrently')];
  }
  return null;
}

function lifecycleConflict(member, operation, required) {
  return [
    409,
    errorBody('INVALID_LIFECYCLE_TRANSITION', `Member is not ${required}`, {
      operation,
      current_status: member.membership_status,
      required_status: required,
    }),
  ];
}

const UPDATE_MEMBER_FIELDS = new Set([
  'email',
  'first_name',
  'last_name',
  'membership_end',
  'membership_type',
  'notes',
  'phone',
]);
```

(`errorBody(code, message, details)` already exists at the top of the file.)

- [ ] **Step 2: Handlers**

Replace `registerMemberHandler`'s member literal: drop `user_id`, add `version: iso(now())`; after `members.push(member)` add `memberMode.set(id, body.email ? 'login' : 'roster');` and return:

```js
  const login = memberMode.get(id) === 'login';
  return [
    201,
    envelope({
      ...member,
      effective_mode: login ? 'login' : 'roster',
      provisioning: login
        ? { id: newId('op'), kind: 'provisioning', state: 'requested', updated_at: iso(now()) }
        : null,
    }),
  ];
```

`getMemberHandler` returns `[200, envelope(memberProfile(member))]`.

Replace `updateMemberHandler`, `setMemberAccessHandler`, `suspendMemberHandler`, `setMemberVenuesHandler` with:

```js
function updateMemberHandler(memberId, body, query) {
  const member = members.find((m) => m.id === memberId);
  if (!member) return notFound(`Member ${memberId} not found`);
  const unknown = Object.keys(body ?? {}).filter((k) => !UPDATE_MEMBER_FIELDS.has(k));
  if (unknown.length) {
    return validationError(unknown.map((field) => ({ field, message: 'Unknown field' })));
  }
  if (
    memberMode.get(member.id) === 'login' &&
    body?.email !== undefined &&
    body.email !== member.email
  ) {
    return [
      409,
      errorBody(
        'LOGIN_EMAIL_REQUIRES_SECURE_CHANGE',
        "A login member's email changes through the secure email-change flow",
      ),
    ];
  }
  const conflict = versionConflict(member, query);
  if (conflict) return conflict;
  for (const key of UPDATE_MEMBER_FIELDS) {
    if (body?.[key] !== undefined) member[key] = body[key];
  }
  touch(member);
  return [200, envelope(member)];
}

function setMemberAccessHandler(memberId, body, query) {
  const details = requireFields(body, ['scope']);
  if (details.length) return validationError(details);
  const member = members.find((m) => m.id === memberId);
  if (!member) return notFound(`Member ${memberId} not found`);
  const conflict = versionConflict(member, query);
  if (conflict) return conflict;
  member.access_scope = body.scope;
  touch(member);
  return [200, envelope(member)];
}

function suspendMemberHandler(memberId) {
  const member = members.find((m) => m.id === memberId);
  if (!member) return notFound(`Member ${memberId} not found`);
  if (member.membership_status !== 'active') return lifecycleConflict(member, 'suspend', 'active');
  member.membership_status = 'suspended';
  member.is_active = false;
  touch(member);
  return [204, ''];
}

function reactivateMemberHandler(memberId) {
  const member = members.find((m) => m.id === memberId);
  if (!member) return notFound(`Member ${memberId} not found`);
  if (member.membership_status !== 'suspended') {
    return lifecycleConflict(member, 'reactivate', 'suspended');
  }
  member.membership_status = 'active';
  member.is_active = true;
  touch(member);
  return [204, ''];
}

/** Future, non-cancelled bookings of this member at each venue about to be removed. */
function blockedVenues(member, nextVenueIds) {
  const current =
    member.access_scope === 'chain_wide'
      ? venues.map((v) => v.id)
      : (memberVenues.get(member.id) ?? []);
  const dropped = current.filter((id) => !nextVenueIds.includes(id));
  const today = dateOnly(now());
  const counts = new Map();
  for (const b of bookings) {
    if (b.member_id !== member.id || b.status === 'cancelled') continue;
    const slot = slots.find((s) => s.id === b.slot_id);
    if (!slot || !dropped.includes(slot.venue_id) || slot.date < today) continue;
    counts.set(slot.venue_id, (counts.get(slot.venue_id) ?? 0) + 1);
  }
  // Demo: Ndeye Faye (mbr-09) keeps two upcoming bookings at venue 2.
  if (member.id === 'mbr-09' && dropped.includes(VENUE_2)) {
    counts.set(VENUE_2, (counts.get(VENUE_2) ?? 0) + 2);
  }
  return [...counts].map(([venue_id, future_bookings]) => ({ venue_id, future_bookings }));
}

function setMemberVenuesHandler(memberId, body, query) {
  const details = requireFields(body, ['venue_ids']);
  if (details.length) return validationError(details);
  const member = members.find((m) => m.id === memberId);
  if (!member) return notFound(`Member ${memberId} not found`);
  const conflict = versionConflict(member, query);
  if (conflict) return conflict;
  const affected = blockedVenues(member, body.venue_ids);
  if (affected.length) {
    return [
      409,
      errorBody('ACCESS_DOWNSCOPE_BLOCKED', 'The member still has upcoming bookings there', {
        affected_venues: affected,
      }),
    ];
  }
  memberVenues.set(memberId, body.venue_ids);
  member.access_scope = 'venue_scoped';
  touch(member);
  return [200, envelope(body.venue_ids)];
}
```

Check the names `venues`, `slots`, `bookings`, `slot.date`, `slot.venue_id` against the file (they are the seeded arrays; `mkSlot` sets `date` and `venue_id`); adapt the property names if they differ and say so in the report.

Routes: pass the query to the three versioned handlers (`handler: (m, body, q) => updateMemberHandler(m[1], body, q)` and likewise for `/access` and `/venues`), and add after the suspend route:

```js
  {
    method: 'PUT',
    pattern: /^\/gms\/v1\/members\/([^/]+)\/reactivate$/,
    handler: (m) => reactivateMemberHandler(m[1]),
  },
```

- [ ] **Step 3: Subscriptions and check-ins**

In `mkSubscription` and in `assignSubscriptionHandler`'s literal: remove `assigned_by`, add

```js
    plan_name: plan?.name ?? 'Offre',
    plan_kind: plan?.kind ?? 'subscription',
    venue_name: venues.find((v) => v.id === venueId)?.name ?? 'Salle',
    assigned_by_name: 'Fatou (accueil)',
```

(in `assignSubscriptionHandler` use `plan.name`, `plan.kind`, and `plan.venue_id` for the venue lookup).

Add to `checkIns`:

```js
  mkCheckIn(
    'chk-wallet-01',
    VENUE_1,
    'mbr-07',
    undefined,
    'wallet',
    iso(hoursFromNow(-0.5)),
    undefined,
    undefined,
  ),
```

- [ ] **Step 4: Document the demo hooks**

Append to the header's « Fixed demo hooks » list:

```
//   - Phase 5A members: members carry `version`; `PUT /members/{mid}`, `/access`
//     and `/venues` honour `?expected_version=` (409 VERSION_MISMATCH). `mbr-05`
//     (Bineta Cissé) conflicts once on its first versioned write. Members created
//     with an e-mail are `login` (their e-mail can't change here: 409
//     LOGIN_EMAIL_REQUIRES_SECURE_CHANGE), others `roster` (e.g. `mbr-03`).
//     Unknown update fields (incl. `is_active`) are a 400.
//   - Suspend/reactivate answer 204, or 409 INVALID_LIFECYCLE_TRANSITION with
//     `details.current_status`; `mbr-06` starts suspended.
//   - Narrowing `mbr-09` (Ndeye Faye) so venue 2 is dropped is refused with 409
//     ACCESS_DOWNSCOPE_BLOCKED (2 upcoming bookings at venue 2).
//   - `chk-wallet-01` is a wallet check-in.
```

- [ ] **Step 5: Smoke-test (port 8091 only)**

```bash
node --check apps/owner/scripts/mock-server.mjs
PORT=8091 node apps/owner/scripts/mock-server.mjs & MOCK_PID=$!
for i in $(seq 1 20); do curl -sf http://localhost:8091/health >/dev/null && break; sleep 0.25; done
H='authorization: Bearer x.eyJyb2xlIjoib3duZXIifQ.s'
B=http://localhost:8091/gms/v1/members
curl -s -H "$H" $B/mbr-05 | grep -o '"version":"[^"]*"\|"mode":"[^"]*"\|"user_id"'           # version + mode login, no user_id
curl -s -o /dev/null -w '%{http_code}\n' -X PUT -H "$H" -H 'content-type: application/json' -d '{"is_active":true}' $B/mbr-03   # 400
curl -s -o /dev/null -w '%{http_code}\n' -X PUT -H "$H" -H 'content-type: application/json' -d '{"email":"new@x.sn"}' $B/mbr-05  # 409 login email
V=$(curl -s -H "$H" $B/mbr-05 | sed -E 's/.*"version":"([^"]*)".*/\1/')
curl -s -X PUT -H "$H" -H 'content-type: application/json' -d '{"first_name":"Bineta"}' "$B/mbr-05?expected_version=$V" | grep -o VERSION_MISMATCH   # conflict once
V=$(curl -s -H "$H" $B/mbr-05 | sed -E 's/.*"version":"([^"]*)".*/\1/')
curl -s -o /dev/null -w '%{http_code}\n' -X PUT -H "$H" -H 'content-type: application/json' -d '{"first_name":"Bineta"}' "$B/mbr-05?expected_version=$V"   # 200
curl -s -o /dev/null -w '%{http_code}\n' -X PUT -H "$H" $B/mbr-06/suspend      # 409
curl -s -o /dev/null -w '%{http_code}\n' -X PUT -H "$H" $B/mbr-06/reactivate   # 204
curl -s -X PUT -H "$H" -H 'content-type: application/json' -d '{"venue_ids":["venue-dakar-01"]}' $B/mbr-09/venues | grep -o 'ACCESS_DOWNSCOPE_BLOCKED\|"future_bookings":[0-9]*'
curl -s -H "$H" $B/mbr-01/subscriptions | grep -o '"plan_name":"[^"]*"\|"venue_name":"[^"]*"' | head -2
kill $MOCK_PID
```

Expected: the values in the comments. (`x.eyJyb2xlIjoib3duZXIifQ.s` is an unsigned token whose payload is `{"role":"owner"}`; the mock only checks that a bearer is present.)

- [ ] **Step 6: Commit**

```bash
git add apps/owner/scripts/mock-server.mjs
git commit -m "feat(owner): mock mirrors the Phase 5A member contract

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Edit form — login e-mail lock, optimistic concurrency

**Files:**
- Modify: `apps/owner/app/(app)/members/[id]/page.tsx`, `apps/owner/app/(app)/members/[id]/edit-member-form.tsx`, `apps/owner/messages/fr.json`, `apps/owner/messages/en.json`

**Interfaces:**
- Consumes: `buildMemberUpdate`, `MemberFormValues` (Task 2); `classifyMemberError` (Task 2); `StaffMemberProfile` (Task 1).
- Produces: `EditMemberForm` props `{ member: StaffMemberProfile; canEdit: boolean }`; `members.detail.versionConflict` copy (reused by Task 5).

- [ ] **Step 1: Copy**

`fr.json` under `members.detail`: add `"versionConflict": "Ce membre a été modifié entre-temps. Vérifiez puis enregistrez à nouveau.",` (next to `loadError`), and under `members.detail.edit` add `"emailLockedHint": "Adresse de connexion : elle se change par une procédure sécurisée, bientôt disponible ici.",`.
`en.json`: `"versionConflict": "This member was changed in the meantime. Check, then save again.",` and `"emailLockedHint": "Sign-in address: it changes through a secure procedure, coming here soon.",`.

- [ ] **Step 2: The page passes the profile**

`page.tsx` already passes `memberQuery.data` (now a `StaffMemberProfile`) as `member`; no code change is needed beyond confirming `EditMemberForm` receives it. `MemberHeader`, `MembershipSection`, `DangerZone` keep their `StaffMemberView` prop type (a profile is assignable).

- [ ] **Step 3: The edit form**

In `edit-member-form.tsx`:
- Props: `{ member: StaffMemberProfile; canEdit: boolean }` (import the type from `@iziwellpass/api/schemas`).
- Add `import { useEffect, useMemo, useRef, useState } from 'react';`, `import { TriangleAlertIcon } from 'lucide-react';`, `import { Alert, AlertDescription } from '@iziwellpass/ui/components/alert';`, `import { buildMemberUpdate } from '@/lib/member-update';`, `import { classifyMemberError } from '@/lib/member-errors';`.
- After `const updateMember = useUpdateMember();` add:

```tsx
  const loginMode = member.account.mode === 'login';
  const [conflict, setConflict] = useState(false);
  // After a VERSION_MISMATCH the member is refetched; keep what the user typed
  // instead of resetting the form to the refetched values (H5).
  const keepInputRef = useRef(false);
```

- Replace the reset effect with:

```tsx
  useEffect(() => {
    if (keepInputRef.current) return;
    form.reset(toDefaults(member));
  }, [member, form]);
```

- Replace `onSubmit` with:

```tsx
  const onSubmit = (values: EditMemberValues) => {
    // Read the version at submit time: after a conflict this is the refetched one.
    const { data, params } = buildMemberUpdate(values, {
      mode: member.account.mode,
      version: member.version,
    });
    updateMember.mutate(
      { mid: member.id, data, params },
      {
        onSuccess: () => {
          keepInputRef.current = false;
          setConflict(false);
          toast.success(t('detail.edit.success'));
          void queryClient.invalidateQueries({ queryKey: getGetMemberQueryKey(member.id) });
          void queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
        },
        onError: (err) => {
          const error = classifyMemberError(err);
          if (error.kind === 'versionMismatch') {
            keepInputRef.current = true;
            setConflict(true);
            void queryClient.invalidateQueries({ queryKey: getGetMemberQueryKey(member.id) });
            return;
          }
          if (error.kind === 'loginEmailLocked') {
            form.setError('email', { type: 'server', message: t('detail.edit.emailLockedHint') });
            return;
          }
          if (!applyFieldErrors(form, err)) {
            toast.error(apiErrorMessage(err, t('detail.edit.error')));
          }
        },
      },
    );
  };
```

- Render the notice as the first child of the `<form>`:

```tsx
          {conflict ? (
            <Alert variant="warning">
              <TriangleAlertIcon />
              <AlertDescription>{t('detail.versionConflict')}</AlertDescription>
            </Alert>
          ) : null}
```

- E-mail field: `disabled={!canEdit || loginMode}` on the input, and under `<FormControl>…</FormControl>` add `{loginMode ? <p className="text-sm text-muted-foreground">{t('detail.edit.emailLockedHint')}</p> : null}` before `<FormMessage />`.

`MemberFormValues` (Task 2) and the form's `EditMemberValues` have the same keys; if TypeScript needs it, pass `values` as `MemberFormValues` (they are structurally identical; do not cast through `unknown`).

- [ ] **Step 4: Gates**

Run: `pnpm --filter @iziwellpass/owner typecheck && pnpm --filter @iziwellpass/owner lint && pnpm --filter @iziwellpass/owner test`
Expected: PASS.

- [ ] **Step 5: Browser check**

Setup per Global Constraints (mock with no switches). At 390×844 and 1440×900:
1. `/members/mbr-03` (roster): change the phone, « Enregistrer » → toast « Membre mis à jour »; the e-mail field is editable. Screenshot `/tmp/sph-task4-roster.png`.
2. `/members/mbr-01` (login): the e-mail is read-only with the hint; change the notes → saves; the mock log shows `PUT /gms/v1/members/mbr-01?expected_version=…` with no `email` in the body (log the request body or check the network event in CDP). Screenshot `/tmp/sph-task4-login.png`.
3. `/members/mbr-05`: change the first name, save → the warning notice, the typed first name is still in the field; save again → toast, notice gone. Screenshots `/tmp/sph-task4-conflict.png` and `/tmp/sph-task4-conflict-saved.png`.
4. The form has no « Statut du compte » field.

- [ ] **Step 6: Commit**

```bash
git add "apps/owner/app/(app)/members/[id]/edit-member-form.tsx" "apps/owner/app/(app)/members/[id]/page.tsx" apps/owner/messages
git commit -m "feat(owner): lock login e-mails, optimistic concurrency on member edits

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Access dialog — version, conflict, blocked down-scope

**Files:**
- Modify: `apps/owner/app/(app)/members/[id]/edit-access-dialog.tsx`, `apps/owner/messages/fr.json`, `apps/owner/messages/en.json`

**Interfaces:**
- Consumes: `classifyMemberError`, `downscopeLines` (Task 2); `members.detail.versionConflict` (Task 4); `useListVenues` from `@iziwellpass/api/generated`, `unwrap` from `@iziwellpass/api/client`.

- [ ] **Step 1: Copy**

`fr.json` under `members.detail.access`:

```json
      "downscopeBlocked": "Impossible de retirer ces salles : des réservations à venir y sont encore prévues.",
      "downscopeVenue": "{venue} · {count, plural, one {# réservation à venir} other {# réservations à venir}}",
      "unknownVenue": "Salle inconnue",
```

`en.json`:

```json
      "downscopeBlocked": "These venues can't be removed: upcoming bookings are still planned there.",
      "downscopeVenue": "{venue} · {count, plural, one {# upcoming booking} other {# upcoming bookings}}",
      "unknownVenue": "Unknown venue",
```

- [ ] **Step 2: The dialog**

In `edit-access-dialog.tsx`:
- Props: `member: StaffMemberView` (from Task 1) — unchanged otherwise.
- Imports: `useRef` from react; `CircleAlertIcon, TriangleAlertIcon` from `lucide-react`; `Alert, AlertDescription` from `@iziwellpass/ui/components/alert`; `unwrap` from `@iziwellpass/api/client`; `useListVenues` added to the generated import; `classifyMemberError, downscopeLines, type DownscopeLine` from `@/lib/member-errors`.
- State after `venuesError`:

```tsx
  const [conflict, setConflict] = useState(false);
  const [blocked, setBlocked] = useState<DownscopeLine[] | null>(null);
  const venuesQuery = useListVenues({ query: { select: unwrap } });
```

- Replace the reset effect (P4: only on the closed → open transition):

```tsx
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      setScope(member.access_scope);
      setVenueIds([]);
      setVenuesError(false);
      setConflict(false);
      setBlocked(null);
    }
    wasOpen.current = open;
  }, [open, member.access_scope]);
```

- Replace `onErr` and the two mutate calls:

```tsx
  const onErr = (err: unknown) => {
    const error = classifyMemberError(err);
    if (error.kind === 'versionMismatch') {
      setBlocked(null);
      setConflict(true);
      void queryClient.invalidateQueries({ queryKey: getGetMemberQueryKey(member.id) });
      return;
    }
    if (error.kind === 'downscopeBlocked') {
      setConflict(false);
      setBlocked(downscopeLines(error.affected, venuesQuery.data ?? [], t('detail.access.unknownVenue')));
      return;
    }
    toast.error(apiErrorMessage(err, t('detail.access.error')));
  };

  const handleSave = () => {
    const params = { expected_version: member.version };
    if (scope === 'venue_scoped') {
      if (venueIds.length === 0) {
        setVenuesError(true);
        return;
      }
      setVenues.mutate(
        { mid: member.id, data: { venue_ids: venueIds }, params },
        { onSuccess: onDone, onError: onErr },
      );
    } else {
      setAccess.mutate(
        { mid: member.id, data: { scope: 'chain_wide' }, params },
        { onSuccess: onDone, onError: onErr },
      );
    }
  };
```

- Render, at the top of the `flex flex-col gap-[18px]` body:

```tsx
          {conflict ? (
            <Alert variant="warning">
              <TriangleAlertIcon />
              <AlertDescription>{t('detail.versionConflict')}</AlertDescription>
            </Alert>
          ) : null}
          {blocked ? (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertDescription>
                <p>{t('detail.access.downscopeBlocked')}</p>
                {blocked.length > 0 ? (
                  <ul className="mt-1.5 flex flex-col gap-0.5">
                    {blocked.map((line) => (
                      <li key={line.venueId}>
                        {t('detail.access.downscopeVenue', { venue: line.name, count: line.count })}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}
```

`onDone` stays (invalidate, toast, close). The version sent is read at click time (`member.version`), so after a conflict the refetched member supplies the fresh one.

- [ ] **Step 3: Gates**

Run: `pnpm --filter @iziwellpass/owner typecheck && pnpm --filter @iziwellpass/owner lint && pnpm --filter @iziwellpass/owner test`
Expected: PASS.

- [ ] **Step 4: Browser check**

1. `/members/mbr-09` → « Gérer l'accès » → « Établissements spécifiques », tick only Studio Téranga, save → the destructive notice with « Espace Wellness Plateau · 2 réservations à venir »; the dialog stays open with the selection. Screenshot `/tmp/sph-task5-blocked.png` (390 and 1440).
2. Restart the mock (so `mbr-05` conflicts again), `/members/mbr-05` → « Gérer l'accès » → « Tous les établissements », save → the warning notice, selection kept; save again → toast « Accès mis à jour », dialog closes. Screenshot `/tmp/sph-task5-conflict.png`.

- [ ] **Step 5: Commit**

```bash
git add "apps/owner/app/(app)/members/[id]/edit-access-dialog.tsx" apps/owner/messages
git commit -m "feat(owner): versioned access changes, explain a blocked down-scope

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Suspend 204/409 and « Réactiver »

**Files:**
- Modify: `apps/owner/app/(app)/members/suspend-member-dialog.tsx`, `apps/owner/app/(app)/members/[id]/danger-zone.tsx`, `apps/owner/messages/fr.json`, `apps/owner/messages/en.json`
- Create: `apps/owner/app/(app)/members/[id]/reactivate-member-dialog.tsx`

**Interfaces:**
- Consumes: `classifyMemberError` (Task 2); `useReactivateMember`, `useSuspendMember` (Task 1; mutation variables `{ mid }`, resolve `void`).
- Produces: `ReactivateMemberDialog` props `{ member: StaffMemberView; open: boolean; onOpenChange(open: boolean): void }`.

- [ ] **Step 1: Copy**

`fr.json`: under `members.detail.suspendDialog` add `"notActive": "Ce membre n'est plus actif.",`; under `members.detail.danger` remove `"reactivateSoon": "Bientôt disponible"` (fix the preceding comma); add under `members.detail`:

```json
    "reactivateDialog": {
      "title": "Réactiver ce membre ?",
      "description": "{name} retrouvera l'accès à ses salles et pourra de nouveau réserver.",
      "confirm": "Réactiver",
      "confirming": "Réactivation…",
      "success": "Membre réactivé",
      "notSuspended": "Ce membre n'est plus suspendu.",
      "error": "Impossible de réactiver ce membre."
    },
```

`en.json`: `"notActive": "This member is no longer active.",`; remove `reactivateSoon`; add

```json
    "reactivateDialog": {
      "title": "Reactivate this member?",
      "description": "{name} will get access to their venues back and can book again.",
      "confirm": "Reactivate",
      "confirming": "Reactivating…",
      "success": "Member reactivated",
      "notSuspended": "This member is no longer suspended.",
      "error": "Couldn't reactivate this member."
    },
```

(The cancel button uses the existing `common.cancel`, « Annuler ».)

- [ ] **Step 2: Suspend handles 409**

In `suspend-member-dialog.tsx` (props now `member: StaffMemberView`), import `classifyMemberError` from `@/lib/member-errors` and replace `onError`:

```tsx
        onError: (err) => {
          if (classifyMemberError(err).kind === 'invalidLifecycle') {
            toast.error(t('detail.suspendDialog.notActive'));
            void queryClient.invalidateQueries({ queryKey: getGetMemberQueryKey(member.id) });
            void queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
            onOpenChange(false);
            return;
          }
          toast.error(apiErrorMessage(err, t('detail.suspendDialog.error')));
        },
```

`onSuccess` is unchanged (it never read a body).

- [ ] **Step 3: The reactivate dialog**

`apps/owner/app/(app)/members/[id]/reactivate-member-dialog.tsx`:

```tsx
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  getGetMemberQueryKey,
  getListMembersQueryKey,
  useReactivateMember,
} from '@iziwellpass/api/generated';
import type { StaffMemberView } from '@iziwellpass/api/schemas';
import { Button } from '@iziwellpass/ui/components/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@iziwellpass/ui/components/dialog';

import { apiErrorMessage } from '@/lib/api-error';
import { classifyMemberError } from '@/lib/member-errors';
import { memberName } from '@/lib/member-search';

/** Confirm « Réactiver » (danger zone, canvas `L6sMyP`): `PUT /members/{mid}/reactivate`, 204. */
export function ReactivateMemberDialog({
  member,
  open,
  onOpenChange,
}: {
  member: StaffMemberView;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('members');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const reactivate = useReactivateMember();

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: getGetMemberQueryKey(member.id) });
    void queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
  };

  const handleReactivate = () => {
    reactivate.mutate(
      { mid: member.id },
      {
        onSuccess: () => {
          toast.success(t('detail.reactivateDialog.success'));
          refresh();
          onOpenChange(false);
        },
        onError: (err) => {
          if (classifyMemberError(err).kind === 'invalidLifecycle') {
            toast.error(t('detail.reactivateDialog.notSuspended'));
            refresh();
            onOpenChange(false);
            return;
          }
          toast.error(apiErrorMessage(err, t('detail.reactivateDialog.error')));
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t('detail.reactivateDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('detail.reactivateDialog.description', { name: memberName(member) })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{tCommon('cancel')}</Button>
          </DialogClose>
          <Button onClick={handleReactivate} disabled={reactivate.isPending}>
            {reactivate.isPending
              ? t('detail.reactivateDialog.confirming')
              : t('detail.reactivateDialog.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: The danger zone**

Replace `danger-zone.tsx`'s body (drop the `Tooltip` imports and the "no reactivate endpoint" comment):

```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import type { StaffMemberView } from '@iziwellpass/api/schemas';
import { Button } from '@iziwellpass/ui/components/button';
import { SectionHeading } from '@iziwellpass/ui/components/working-page';

import { SuspendMemberDialog } from '../suspend-member-dialog';
import { ReactivateMemberDialog } from './reactivate-member-dialog';

/** « Zone sensible » (canvas `L6sMyP`): danger « Suspendre le membre » + secondary « Réactiver ». */
export function DangerZone({ member }: { member: StaffMemberView }) {
  const t = useTranslations('members');
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const isSuspended = member.membership_status === 'suspended';
  const canSuspend = member.membership_status === 'active';

  return (
    <section className="flex flex-col gap-4">
      <SectionHeading
        title={t('detail.danger.title')}
        description={t('detail.danger.description')}
      />
      <div className="flex flex-wrap items-center gap-2.5">
        <Button variant="destructive" onClick={() => setSuspendOpen(true)} disabled={!canSuspend}>
          {isSuspended ? t('detail.danger.suspended') : t('detail.danger.suspend')}
        </Button>
        <Button variant="outline" onClick={() => setReactivateOpen(true)} disabled={!isSuspended}>
          {t('detail.danger.reactivate')}
        </Button>
      </div>
      <SuspendMemberDialog member={member} open={suspendOpen} onOpenChange={setSuspendOpen} />
      <ReactivateMemberDialog
        member={member}
        open={reactivateOpen}
        onOpenChange={setReactivateOpen}
      />
    </section>
  );
}
```

- [ ] **Step 5: Gates**

Run: `pnpm --filter @iziwellpass/owner typecheck && pnpm --filter @iziwellpass/owner lint && pnpm --filter @iziwellpass/owner test`
Expected: PASS.

- [ ] **Step 6: Browser check**

1. `/members/mbr-06` (suspended): « Suspendre le membre » disabled reading « Membre suspendu », « Réactiver » enabled → dialog → « Réactiver » → toast « Membre réactivé »; buttons swap. Screenshots `/tmp/sph-task6-reactivate-dialog.png`, `/tmp/sph-task6-reactivated.png`.
2. Same member: « Suspendre le membre » → confirm → toast « Membre suspendu ».
3. Open `/members` (list), note a member row still showing active, suspend that member in a second tab via `/members/<id>`, then use the row menu « Suspendre » in the first tab → toast « Ce membre n'est plus actif. », list refreshes. (If the list's row menu hides « Suspendre » for suspended members after refresh, that is expected.)
4. `/members/mbr-04` (expired): both buttons disabled.

- [ ] **Step 7: Commit**

```bash
git add "apps/owner/app/(app)/members" apps/owner/messages
git commit -m "feat(owner): réactiver a suspended member, handle suspend conflicts

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Subscription names from the backend, wallet check-ins

**Files:**
- Modify: `apps/owner/app/(app)/members/[id]/subscriptions-section.tsx`, `apps/owner/components/checkin/checkin-feed.tsx`, `apps/owner/messages/fr.json`, `apps/owner/messages/en.json`

**Interfaces:**
- Consumes: `StaffSubscriptionView` (Task 1); `methodBadge` (Task 2).

- [ ] **Step 1: Copy**

`fr.json` under `frontdesk.feed`: add `"methodWallet": "Wallet",` after `"methodManual"`. `en.json`: `"methodWallet": "Wallet",`. Under `members.detail.subscriptions` remove `"unknownPlan"` if nothing else uses it (`grep -rn "unknownPlan" apps/owner` first).

- [ ] **Step 2: Subscriptions**

In `subscriptions-section.tsx`:
- Delete `useVenuePlanNames` (and its doc comment), the `venueIds` memo, `planNames`, `planNameFor`, and the now-unused imports (`useQueries`, `getListPlansQueryOptions`).
- In `SubscriptionsSection`'s map, pass `planName={subscription.plan_name}`.
- In `SubscriptionTile`, the meta line becomes

```tsx
        <p className="text-sm text-muted-strong">
          {[subscription.venue_name, terms, price].filter(Boolean).join(' · ')}
        </p>
```

- [ ] **Step 3: Wallet label**

In `checkin-feed.tsx`: import `methodBadge` from `@/lib/checkin-feed`, replace `const isQr = checkIn.method === CheckInMethod.qr;` with `const badge = methodBadge(checkIn.method);`, and the badge with

```tsx
      <Badge variant={badge.variant}>{t(`feed.${badge.labelKey}`)}</Badge>
```

Drop the `CheckInMethod` import if now unused.

- [ ] **Step 4: Gates**

Run: `pnpm --filter @iziwellpass/owner typecheck && pnpm --filter @iziwellpass/owner lint && pnpm --filter @iziwellpass/owner test && pnpm typecheck && pnpm lint && pnpm test`
Then, with no dev server running in this worktree: `pnpm --filter @iziwellpass/owner build`.
Expected: PASS.

- [ ] **Step 5: Browser check**

1. `/members/mbr-01`: the subscription tile reads « Abonnement Mensuel » and a meta line starting « Studio Téranga · Expire le … · … ». Screenshot `/tmp/sph-task7-subscriptions.png`.
2. Accueil / check-in feed: the `mbr-07` row shows a blue « Wallet » badge. Screenshot `/tmp/sph-task7-wallet.png`.

- [ ] **Step 6: Commit**

```bash
git add "apps/owner/app/(app)/members/[id]/subscriptions-section.tsx" apps/owner/components/checkin/checkin-feed.tsx apps/owner/messages
git commit -m "feat(owner): subscription names from the backend, wallet check-ins

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Spec coverage

| Spec item | Task |
| --- | --- |
| H1 contract source, regeneration, freshness | 1 |
| H2 renames; member/admin untouched | 1 |
| H3 no lifecycle in the edit form | 1 (P1) |
| H4 login e-mail locked | 2 (`buildMemberUpdate`), 4 |
| H5 optimistic concurrency | 2, 4 (edit), 5 (access/venues) |
| H6 suspend 204/409 | 6 |
| H7 Réactiver | 6 |
| H8 blocked down-scope | 2 (`downscopeLines`), 5 |
| H9 subscription names | 7 |
| H10 wallet | 2 (`methodBadge`), 7 (P2) |
| H11 one classifier | 2 |
| H12 mock | 3 |
| §4 copy | 1 (removals), 4, 5, 6, 7 |
| §5 tests and browser | 2 (units), 4–7 (browser), 7 (full gates + build) |
