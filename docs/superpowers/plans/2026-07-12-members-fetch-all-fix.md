# Members fetch-all cursor-loop fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken `limit=1000` hack in `apps/owner/lib/all-members.ts` with a correct cursor-loop that fetches the full member list, clearing the `ApiResponseVecMember` → `PaginatedApiResponseVecMember` build break.

**Architecture:** One file is rewritten. `fetchAllMembers()` pages through `GET /gms/v1/members?limit=100[&cursor=…]` following `meta.next_cursor` until exhausted (with a page-count safety cap), returning `Member[]`. `useAllMembers()` wraps it in a React Query whose key is prefixed by `getListMembersQueryKey()` so existing invalidations keep matching. All consumers are untouched.

**Tech Stack:** Next.js 15 / React 19, TanStack Query, Orval-generated client (`@iziwellpass/api`), TypeScript.

---

## Conventions for this plan

- **Commits are ON HOLD** (user instruction). Each task ends with a **Verify** step, not a commit. A suggested commit message is given for when the hold lifts; do **not** run `git commit` unless the user says so.
- **owner has no unit-test runner** (scripts: dev/build/lint/typecheck only). Verification is `pnpm --filter owner typecheck`, `pnpm --filter owner lint`, `pnpm --filter owner build`, and browser preview. Do not add a test runner.
- Run all commands from the repo root `/Users/abdel/dev/gymz-v1/web`.

## Facts verified against the codebase (do not re-guess)

- `getListMembersUrl(params?: ListMembersParams)` exists (`packages/api/src/generated/endpoints.ts:474`); it builds the query string, omitting `undefined` values — so `getListMembersUrl({ limit: 100, cursor: undefined })` yields `/gms/v1/members?limit=100`.
- `ListMembersParams` = `{ limit?: number (1-100, default 20); cursor?: string; name?; phone?; email? }`.
- Response type `PaginatedApiResponseVecMember` = `{ data: PaginatedApiResponseVecMemberDataItem[]; meta: PaginationMeta; request_id: string }`; `PaginationMeta = { next_cursor?: string | null }`.
- `PaginatedApiResponseVecMemberDataItem` is structurally identical to `Member` (same fields; nullable aliases resolve to `string | null`), so `response.data` is assignable to `Member[]` with **no cast**.
- `customFetch` and `unwrap` are exported from `@iziwellpass/api/client`; `getListMembersQueryKey` and `getListMembersUrl` from `@iziwellpass/api/generated`; `Member` and `PaginatedApiResponseVecMember` types from `@iziwellpass/api/schemas`.

## File map

- **Rewrite** `apps/owner/lib/all-members.ts` — the cursor-loop helper + `useAllMembers` hook.
- No other files change.

---

## Task 1: Rewrite `all-members.ts` as a cursor loop

**Files:**
- Modify (full rewrite): `apps/owner/lib/all-members.ts`

- [ ] **Step 1: Replace the file contents**

Overwrite `apps/owner/lib/all-members.ts` with exactly:

```ts
'use client';

import { useQuery } from '@tanstack/react-query';

import { customFetch } from '@iziwellpass/api/client';
import { getListMembersQueryKey, getListMembersUrl } from '@iziwellpass/api/generated';
import type { Member, PaginatedApiResponseVecMember } from '@iziwellpass/api/schemas';

/**
 * Materialize the FULL member list via cursor pagination.
 *
 * `GET /gms/v1/members` is paginated: it caps `limit` at 100 and returns a
 * `meta.next_cursor`. Several consumers need the whole set rather than a page —
 * the dashboard "active members" count and the check-in name maps — so this
 * helper walks the cursor to completion and concatenates the pages.
 *
 * The thin `useAllMembers` wrapper keeps every call site on one query-key prefix
 * (`getListMembersQueryKey`) so register/suspend/edit invalidations still match.
 *
 * This is a candidate to replace with server-side search in a later WS6 phase
 * (browse-page search + async pickers); until then, the full list backs the
 * client-side filter and the aggregate consumers.
 */

/** Endpoint maximum page size — fewest round-trips. */
const PAGE_SIZE = 100;
/** Hard cap so a malformed/looping cursor can never spin forever (5000 members). */
const MAX_PAGES = 50;

/** Fetch every member by following `meta.next_cursor` to exhaustion. */
export async function fetchAllMembers(): Promise<Member[]> {
  const all: Member[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const response = await customFetch<PaginatedApiResponseVecMember>(
      getListMembersUrl({ limit: PAGE_SIZE, cursor }),
      { method: 'GET' },
    );
    all.push(...response.data);
    const next = response.meta.next_cursor;
    if (!next) return all;
    cursor = next;
  }

  console.warn('[all-members] MAX_PAGES cap reached; returning a truncated member list');
  return all;
}

export function useAllMembers() {
  return useQuery({
    queryKey: [...getListMembersQueryKey(), { scope: 'all' }],
    queryFn: fetchAllMembers,
  });
}
```

Notes for the implementer:
- `unwrap` is intentionally **not** imported anymore — `fetchAllMembers` returns `Member[]` directly, so the query needs no `select`. If `unwrap` lingers in the imports, lint will flag it.
- `response.data` (type `PaginatedApiResponseVecMemberDataItem[]`) is pushed into a `Member[]` — this compiles because the two shapes are identical. Do **not** add a cast; if tsc complains, stop and report (it would mean the shapes diverged).
- Keep `'use client'` at the top — the file is imported by client components.

- [ ] **Step 2: Verify the file compiles and the build break is cleared**

Run:
```bash
cd /Users/abdel/dev/gymz-v1/web
pnpm --filter owner typecheck 2>&1 | grep -E 'all-members|ApiResponseVecMember' || echo "all-members OK — no errors"
```
Expected: `all-members OK — no errors` (the previous TS2724 is gone and the rewrite itself compiles).

- [ ] **Step 3: Commit (DEFERRED — hold)**

Suggested message: `fix(owner): fetch all members via cursor loop`

---

## Task 2: Full verification (build unblock + consumers intact)

**Files:** none (verification only).

- [ ] **Step 1: Whole-owner typecheck is now fully green**

Run:
```bash
cd /Users/abdel/dev/gymz-v1/web && pnpm --filter owner typecheck 2>&1 | tail -8
```
Expected: completes with **no errors** (this is the WS6 blocker clearing — with the venue work already in the tree, the owner app should now typecheck clean end-to-end).

- [ ] **Step 2: Lint + build**

Run:
```bash
cd /Users/abdel/dev/gymz-v1/web
pnpm --filter owner lint 2>&1 | tail -5
pnpm --filter owner build 2>&1 | tail -15
```
Expected: lint clean; `next build` completes successfully (previously it failed on `all-members.ts`).

- [ ] **Step 3: Confirm no consumer needed changes**

Run:
```bash
cd /Users/abdel/dev/gymz-v1/web && grep -rn "useAllMembers" apps/owner/app | grep -v '\.next'
```
Expected: the four consumers (`schedules/slots-tab.tsx`, `dashboard/use-dashboard-data.ts`, `members/page.tsx`, `checkins/use-frontdesk-data.ts`) still call `useAllMembers()` unchanged, and typecheck (Step 1) already proved they compile against the `Member[]` result. No edits required.

- [ ] **Step 4: Preview smoke test**

With the dev server running (`preview_start`; another chat may already hold port 3011 — start this session's server if the preview tools can't reach it), verify via `preview_*` tools, no console errors:
- `/members` — the directory loads; the subtitle count and client-side search/status tabs work over the full list.
- `/` (dashboard) — the "Membres actifs" KPI renders a number.
- `/checkins` — the recent check-ins list resolves member names, and the manual check-in picker lists members.

Capture a screenshot of `/members` as proof.

- [ ] **Step 5: Commit (DEFERRED — hold)**

Nothing new to stage beyond Task 1. When the hold lifts, this single change ships as `fix(owner): fetch all members via cursor loop`.

---

## Self-review notes (author)

- **Spec coverage:** rewrite + cursor loop + `PAGE_SIZE`/`MAX_PAGES` cap + reframed comment + query-key prefix → Task 1; build/typecheck/lint/preview green + consumers-untouched proof → Task 2. Out-of-scope items (server search, pagination UI, tab removal, picker async, deleting the file) are correctly absent.
- **Type consistency:** `fetchAllMembers(): Promise<Member[]>` and `useAllMembers()` returning `UseQueryResult<Member[]>` match the consumer expectation of `.data: Member[]`; `response.data` → `Member[]` relies on the verified structural-identity fact.
- **No test file:** owner has no unit runner (per spec); the loop is verified by typecheck + preview, consistent with Spec 1's tooling decision.
