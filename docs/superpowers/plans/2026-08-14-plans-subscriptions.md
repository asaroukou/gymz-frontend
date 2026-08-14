# Plans Catalog & Member Subscriptions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give venue owners a priced plan catalog per venue, and let staff assign those plans to members as subscriptions.

**Architecture:** A new venue-scoped `/plans` page (nav label **Offres**) does plan CRUD against `useListPlans`/`useCreatePlan`/`useUpdatePlan`/`useArchivePlan`, reading the active venue from the existing `VenueProvider`. Member detail gains an **Abonnements** card that lists, assigns and cancels `MemberSubscription` rows. Pure logic (money conversion, nav gating, plan form validation) is extracted into `lib/` modules with real unit tests; React screens follow the existing dialog/mutation/toast patterns.

**Tech Stack:** Next.js App Router (client components), TanStack Query via Orval-generated hooks, react-hook-form + zod v4, shadcn-based `@iziwellpass/ui`, next-intl (French-first), vitest.

**Spec:** `docs/superpowers/specs/2026-08-14-plans-subscriptions-design.md`

## Global Constraints

Every task's requirements implicitly include this section.

- **Never hand-edit `packages/api/src/generated/**`.** It is Orval output; `pnpm test` fails if it drifts from `openapi.json`.
- **French-first i18n.** All user-visible copy goes through next-intl. `messages/fr.json` and `messages/en.json` must keep **exact key parity** — same keys, same nesting, in the same order.
- **`verbatimModuleSyntax: true`** in the shared tsconfig — use `import type` / `export type` for type-only imports.
- **`noUncheckedIndexedAccess: true`** — indexing an array yields `T | undefined`; guard before use.
- **`@iziwellpass/ui` has subpath exports only** — `@iziwellpass/ui/components/<name>`, never a barrel import.
- **Data pattern:** `useListX({ query: { select: unwrap } })` for queries; `err instanceof ApiError` for typed errors. `unwrap` and `ApiError` come from `@iziwellpass/api/client`.
- **Errors:** toast via `apiErrorMessage(err, fallback)`; for form submissions call `applyFieldErrors(form, err)` first and only toast when it returns `false`. Both from `@/lib/api-error`.
- **Default currency is `XOF`** (FCFA). XOF and XAF have **zero** decimal digits; EUR, USD, GHS, NGN have two.
- **Role gating:** `/plans` is `owner` / `admin`. The subscriptions card follows the members page (`owner` / `admin` / `receptionist`).
- **Pre-production:** no real users, no production data. Prefer the clean change over the compatible one.
- **Prettier:** run `npx prettier --write` on every file you create or modify before committing.
- **Gates:** `pnpm build && pnpm typecheck && pnpm lint && pnpm test` must be green before each commit.

## File Structure

**Create:**

| Path                                                               | Responsibility                                                |
| ------------------------------------------------------------------ | ------------------------------------------------------------- |
| `apps/owner/vitest.config.ts`                                      | Node-env vitest config for owner-app `lib/` unit tests        |
| `apps/owner/lib/money.ts`                                          | Currency exponent, minor↔major conversion, display formatting |
| `apps/owner/lib/money.test.ts`                                     | Unit tests for the above                                      |
| `apps/owner/lib/nav.test.ts`                                       | Unit tests for role gating, incl. the new `/plans` entry      |
| `apps/owner/lib/plan-form.ts`                                      | Plan form value shape, zod schema builder, request mappers    |
| `apps/owner/lib/plan-form.test.ts`                                 | Unit tests for the above                                      |
| `apps/owner/app/(app)/plans/page.tsx`                              | `/plans` route shell: page gate, venue resolution, states     |
| `apps/owner/app/(app)/plans/plans-list.tsx`                        | Plan list + archived toggle + row actions                     |
| `apps/owner/app/(app)/plans/plan-dialog.tsx`                       | Create + edit dialog (one component, two modes)               |
| `apps/owner/app/(app)/plans/archive-plan-dialog.tsx`               | Archive confirm dialog                                        |
| `apps/owner/app/(app)/members/[id]/subscriptions-card.tsx`         | Abonnements card + rows                                       |
| `apps/owner/app/(app)/members/[id]/assign-subscription-dialog.tsx` | Venue → plan → date → paid, then assign                       |
| `apps/owner/app/(app)/members/[id]/cancel-subscription-dialog.tsx` | Cancel confirm dialog                                         |

**Modify:**

| Path                                              | Change                                                            |
| ------------------------------------------------- | ----------------------------------------------------------------- |
| `apps/owner/package.json`                         | Add `test` script + vitest devDependency                          |
| `apps/owner/lib/nav.ts`                           | Add `plans` to `NavLabelKey` and `NAV_ITEMS`                      |
| `apps/owner/app/(app)/members/[id]/page.tsx`      | Rename membership card to **Adhésion**, mount `SubscriptionsCard` |
| `apps/owner/messages/fr.json`, `messages/en.json` | New `plans` namespace, `nav.plans`, subscription keys             |
| `docs/backend-issues.md`                          | Four backend asks from the spec                                   |

Member detail is already 732 lines, so every new subscription component lives in a sibling file — matching how `checkins/` and `schedules/` are split.

---

### Task 1: Owner-app test runner + money module

The owner app currently has no test runner, so `lib/` logic is untested. `money.ts` is pure and has a real edge case (XOF has no decimal digits), so it earns the runner.

**Files:**

- Create: `apps/owner/vitest.config.ts`
- Create: `apps/owner/lib/money.ts`
- Create: `apps/owner/lib/money.test.ts`
- Modify: `apps/owner/package.json`

**Interfaces:**

- Consumes: `Currency` from `@iziwellpass/api/schemas`.
- Produces: `currencyExponent(currency: Currency): number`, `toMinorUnits(major: number, currency: Currency): number`, `fromMinorUnits(minor: number, currency: Currency): number`, `formatMoney(minor: number, currency: Currency, locale: string): string`. Tasks 3, 4, 6 and 7 all import from `@/lib/money`.

- [ ] **Step 1: Add the vitest config**

Create `apps/owner/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': new URL('./', import.meta.url).pathname,
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['lib/**/*.test.ts'],
  },
});
```

Only `lib/**` is included: these are pure-logic tests. React component tests would need jsdom plus the next-intl and provider harness, which this plan does not set up.

- [ ] **Step 2: Wire the test script**

In `apps/owner/package.json`, add to `scripts`:

```json
"test": "vitest run"
```

and to `devDependencies`:

```json
"vitest": "^3.1.0"
```

Then run `pnpm install` from the repo root.

- [ ] **Step 3: Write the failing tests**

Create `apps/owner/lib/money.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';

import { currencyExponent, formatMoney, fromMinorUnits, toMinorUnits } from './money';

describe('currencyExponent', () => {
  it('is 0 for the CFA francs', () => {
    expect(currencyExponent('XOF')).toBe(0);
    expect(currencyExponent('XAF')).toBe(0);
  });

  it('is 2 for the decimal currencies', () => {
    expect(currencyExponent('EUR')).toBe(2);
    expect(currencyExponent('USD')).toBe(2);
    expect(currencyExponent('GHS')).toBe(2);
    expect(currencyExponent('NGN')).toBe(2);
  });
});

describe('toMinorUnits', () => {
  it('leaves zero-decimal currencies unscaled', () => {
    expect(toMinorUnits(25000, 'XOF')).toBe(25000);
  });

  it('scales decimal currencies by 100', () => {
    expect(toMinorUnits(19.99, 'EUR')).toBe(1999);
  });

  it('rounds rather than truncating float drift', () => {
    // 19.99 * 100 === 1998.9999999999998 in IEEE 754
    expect(toMinorUnits(19.99, 'EUR')).not.toBe(1998);
    expect(toMinorUnits(0.145, 'USD')).toBe(15);
  });
});

describe('fromMinorUnits', () => {
  it('inverts toMinorUnits', () => {
    expect(fromMinorUnits(1999, 'EUR')).toBe(19.99);
    expect(fromMinorUnits(25000, 'XOF')).toBe(25000);
  });
});

describe('formatMoney', () => {
  it('renders XOF with no decimal part', () => {
    const out = formatMoney(25000, 'XOF', 'fr-FR');
    expect(out).not.toMatch(/[.,]\d\d/);
    // Non-breaking / narrow-no-break spaces vary by ICU build, so compare digits only.
    expect(out.replace(/\D/g, '')).toBe('25000');
  });

  it('renders EUR with two decimals', () => {
    expect(formatMoney(1999, 'EUR', 'fr-FR').replace(/\D/g, '')).toBe('1999');
  });
});
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `pnpm --filter @iziwellpass/owner test`
Expected: FAIL — `Failed to resolve import "./money"`.

- [ ] **Step 5: Implement the money module**

Create `apps/owner/lib/money.ts`:

```typescript
import type { Currency } from '@iziwellpass/api/schemas';

/**
 * Number of decimal digits a currency uses. XOF and XAF (the CFA francs) have
 * none — 25 000 FCFA is 25000 minor units, not 2 500 000 — while EUR, USD, GHS
 * and NGN have two. Derived from ICU via `Intl` rather than a hardcoded table,
 * so a currency added to the API enum later is handled without a code change.
 */
export function currencyExponent(currency: Currency): number {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
  }).resolvedOptions().maximumFractionDigits;
}

/**
 * Major units (what an owner types: `25000`) → minor units (what the API
 * stores in `price_amount_minor`). Rounds, because `19.99 * 100` is
 * `1998.9999999999998` in IEEE 754 and truncation would lose a centime.
 */
export function toMinorUnits(major: number, currency: Currency): number {
  return Math.round(major * 10 ** currencyExponent(currency));
}

/** Minor units → major units, for pre-filling an edit form. */
export function fromMinorUnits(minor: number, currency: Currency): number {
  return minor / 10 ** currencyExponent(currency);
}

/** Localized display string, e.g. `25 000 F CFA` for XOF in `fr`. */
export function formatMoney(minor: number, currency: Currency, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(
    fromMinorUnits(minor, currency),
  );
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm --filter @iziwellpass/owner test`
Expected: PASS — 8 tests.

- [ ] **Step 7: Run the full gates**

Run: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`
Expected: all green, and `pnpm test` now reports 4 successful tasks instead of 3.

- [ ] **Step 8: Commit**

```bash
npx prettier --write apps/owner/vitest.config.ts apps/owner/lib/money.ts apps/owner/lib/money.test.ts apps/owner/package.json
git add apps/owner/vitest.config.ts apps/owner/lib/money.ts apps/owner/lib/money.test.ts apps/owner/package.json pnpm-lock.yaml
git commit -m "feat(owner): add money helpers and a test runner for lib

The owner app had no test runner, so lib/ logic went untested. Money
conversion earns one: XOF and XAF have no decimal digits while EUR, USD, GHS
and NGN have two, so price_amount_minor cannot be scaled by a fixed 100. The
exponent is derived from Intl rather than a hardcoded table.

Vitest is scoped to lib/**/*.test.ts — component tests would need jsdom plus
the next-intl and provider harness, which this does not set up."
```

---

### Task 2: Nav entry and `/plans` route shell

**Files:**

- Modify: `apps/owner/lib/nav.ts`
- Create: `apps/owner/lib/nav.test.ts`
- Create: `apps/owner/app/(app)/plans/page.tsx`
- Modify: `apps/owner/messages/fr.json`, `apps/owner/messages/en.json`

**Interfaces:**

- Consumes: `useVenueContext` from `@/lib/venue-context`, `RequirePageAccess` from `@/components/page-access`.
- Produces: the `/plans` route rendering `<PlansList venueId={…} canManage={…} />` (Task 3), and `NavLabelKey` gaining `'plans'`.

- [ ] **Step 1: Write the failing nav tests**

Create `apps/owner/lib/nav.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';

import { canAccessPath, navForRole, navGroupsForRole } from './nav';

describe('plans nav entry', () => {
  it('is visible to owner and admin', () => {
    for (const role of ['owner', 'admin'] as const) {
      expect(navForRole(role).some((i) => i.href === '/plans')).toBe(true);
    }
  });

  it('is hidden from trainer and receptionist', () => {
    for (const role of ['trainer', 'receptionist'] as const) {
      expect(navForRole(role).some((i) => i.href === '/plans')).toBe(false);
    }
  });

  it('gates /plans by role', () => {
    expect(canAccessPath('owner', '/plans')).toBe(true);
    expect(canAccessPath('trainer', '/plans')).toBe(false);
    expect(canAccessPath(null, '/plans')).toBe(false);
    expect(canAccessPath('platform_admin', '/plans')).toBe(true);
  });

  it('places plans in the venue-scoped group, after planning', () => {
    const groups = navGroupsForRole('owner');
    const venueGroup = groups.find((g) => g.scope === 'venue');
    expect(venueGroup).toBeDefined();
    const hrefs = venueGroup!.items.map((i) => i.href);
    expect(hrefs).toEqual(['/', '/checkins', '/schedules', '/plans']);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @iziwellpass/owner test`
Expected: FAIL — the `/plans` assertions fail because no such nav item exists.

- [ ] **Step 3: Add the nav entry**

In `apps/owner/lib/nav.ts`, extend the label union:

```typescript
export type NavLabelKey =
  'dashboard' | 'frontdesk' | 'members' | 'planning' | 'plans' | 'venues' | 'staff';
```

and add the item to `NAV_ITEMS`, immediately after the `planning` entry:

```typescript
  { labelKey: 'plans', href: '/plans', roles: ['owner', 'admin'], scope: 'venue' },
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @iziwellpass/owner test`
Expected: PASS.

- [ ] **Step 5: Add the i18n keys**

In `messages/fr.json`, add `"plans": "Offres"` to the `nav` namespace after `planning`, and add a new top-level `plans` namespace (place it after the `planning` namespace to mirror nav order):

```json
"plans": {
  "title": "Offres",
  "subtitle": "Les formules et tarifs proposés dans cet établissement.",
  "errorTitle": "Erreur",
  "venuesError": "Impossible de charger les établissements",
  "venueNone": "Aucun établissement pour le moment.",
  "venuePrompt": "Choisissez un établissement pour voir ses offres.",
  "loadError": "Impossible de charger les offres",
  "empty": "Aucune offre pour le moment.",
  "showArchived": "Afficher les archivées",
  "archivedBadge": "Archivée",
  "kind": { "subscription": "Abonnement", "entry_pack": "Carnet d'entrées" },
  "durationDays": "{count, plural, one {# jour} other {# jours}}",
  "entryCount": "{count, plural, one {# entrée} other {# entrées}}",
  "allActivities": "Toutes les activités",
  "add": "Créer une offre",
  "edit": "Modifier",
  "archive": "Archiver"
}
```

In `messages/en.json`, add `"plans": "Plans"` to `nav` and the mirrored namespace:

```json
"plans": {
  "title": "Plans",
  "subtitle": "The plans and prices offered at this venue.",
  "errorTitle": "Error",
  "venuesError": "Could not load venues",
  "venueNone": "No venues yet.",
  "venuePrompt": "Pick a venue to see its plans.",
  "loadError": "Could not load plans",
  "empty": "No plans yet.",
  "showArchived": "Show archived",
  "archivedBadge": "Archived",
  "kind": { "subscription": "Subscription", "entry_pack": "Entry pack" },
  "durationDays": "{count, plural, one {# day} other {# days}}",
  "entryCount": "{count, plural, one {# entry} other {# entries}}",
  "allActivities": "All activities",
  "add": "Create a plan",
  "edit": "Edit",
  "archive": "Archive"
}
```

Keys are added in the same position in both files to preserve parity.

- [ ] **Step 6: Create the route shell**

Create `apps/owner/app/(app)/plans/page.tsx`. This mirrors `schedules/page.tsx` — same gate, same venue resolution, same four states:

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { useRole } from '@iziwellpass/auth/provider';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';

import { RequirePageAccess } from '@/components/page-access';
import { apiErrorMessage } from '@/lib/api-error';
import { useVenueContext } from '@/lib/venue-context';

import { PlansList } from './plans-list';

function PlansContent() {
  const t = useTranslations('plans');
  const role = useRole();
  const canManage = role === 'owner' || role === 'admin';

  const { venues, isLoading, isError, error, selectedVenueId } = useVenueContext();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-9 w-64 rounded-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertTitle>{t('errorTitle')}</AlertTitle>
          <AlertDescription>{apiErrorMessage(error, t('venuesError'))}</AlertDescription>
        </Alert>
      ) : venues.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">{t('venueNone')}</p>
      ) : !selectedVenueId ? (
        <p className="py-12 text-center text-sm text-muted-foreground">{t('venuePrompt')}</p>
      ) : (
        <PlansList venueId={selectedVenueId} canManage={canManage} />
      )}
    </div>
  );
}

export default function PlansPage() {
  return (
    <RequirePageAccess href="/plans">
      <PlansContent />
    </RequirePageAccess>
  );
}
```

This will not compile until Task 3 creates `plans-list.tsx` — that is expected; Steps 7–8 are deferred to the end of Task 3. Do **not** commit a broken build.

- [ ] **Step 7: Create a placeholder list so the build is green**

Create `apps/owner/app/(app)/plans/plans-list.tsx` with a minimal shell that Task 3 replaces wholesale:

```tsx
'use client';

export function PlansList({ venueId, canManage }: { venueId: string; canManage: boolean }) {
  return <div data-venue={venueId} data-can-manage={canManage} />;
}
```

- [ ] **Step 8: Run the gates and commit**

Run: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`
Expected: all green.

```bash
npx prettier --write apps/owner/lib/nav.ts apps/owner/lib/nav.test.ts "apps/owner/app/(app)/plans/page.tsx" "apps/owner/app/(app)/plans/plans-list.tsx" apps/owner/messages/fr.json apps/owner/messages/en.json
git add apps/owner/lib/nav.ts apps/owner/lib/nav.test.ts "apps/owner/app/(app)/plans" apps/owner/messages
git commit -m "feat(owner): add the Offres nav entry and /plans route shell

Plans are venue-scoped, so the entry joins the venue group governed by the
venue switcher rather than the org group, and is gated to owner/admin. The
route shell mirrors the planning page: same page gate, same venue resolution,
same loading/error/no-venue states.

Adds the first tests for nav gating, which had none."
```

---

### Task 3: Plan list with archived toggle

**Files:**

- Modify: `apps/owner/app/(app)/plans/plans-list.tsx` (replaces the Task 2 placeholder)

**Interfaces:**

- Consumes: `formatMoney` from `@/lib/money`; `useListPlans(id: string, params?: ListPlansParams, options?)` from `@iziwellpass/api/generated`.
- Produces: `PlansList({ venueId, canManage })`. Tasks 4 and 5 mount `<PlanDialog>` and `<ArchivePlanDialog>` inside it.

- [ ] **Step 1: Implement the list**

Replace `apps/owner/app/(app)/plans/plans-list.tsx` entirely:

```tsx
'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { unwrap } from '@iziwellpass/api/client';
import { useListPlans } from '@iziwellpass/api/generated';
import type { ActivityPlan } from '@iziwellpass/api/schemas';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Card, CardContent } from '@iziwellpass/ui/components/card';
import { Label } from '@iziwellpass/ui/components/label';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { Switch } from '@iziwellpass/ui/components/switch';

import { useActivityTypeLabel } from '@/lib/activity-type';
import { apiErrorMessage } from '@/lib/api-error';
import { formatMoney } from '@/lib/money';

/** One plan, rendered as a row: name + badges above, price + terms below. */
function PlanRow({ plan }: { plan: ActivityPlan }) {
  const t = useTranslations('plans');
  const locale = useLocale();
  const activityLabel = useActivityTypeLabel();

  // A plan is either time-based (duration_days) or count-based (entry_count);
  // an entry_pack may also carry duration_days as an expiry, so show both.
  const terms = [
    plan.entry_count != null ? t('entryCount', { count: plan.entry_count }) : null,
    plan.duration_days != null ? t('durationDays', { count: plan.duration_days }) : null,
  ].filter((x): x is string => x !== null);

  return (
    <Card>
      <CardContent className="flex flex-wrap items-start justify-between gap-4 py-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{plan.name}</span>
            <Badge variant="secondary">{t(`kind.${plan.kind}`)}</Badge>
            {plan.is_active ? null : <Badge variant="outline">{t('archivedBadge')}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {plan.all_activities
              ? t('allActivities')
              : plan.activities.map(activityLabel).join(' · ')}
          </p>
        </div>
        <div className="text-right">
          <p className="font-medium">
            {formatMoney(plan.price_amount_minor, plan.price_currency, locale)}
          </p>
          {terms.length > 0 ? (
            <p className="text-sm text-muted-foreground">{terms.join(' · ')}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function PlansList({ venueId, canManage }: { venueId: string; canManage: boolean }) {
  const t = useTranslations('plans');
  const [showArchived, setShowArchived] = useState(false);

  const plansQuery = useListPlans(
    venueId,
    { include_archived: showArchived },
    { query: { select: unwrap } },
  );
  const plans = plansQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Switch id="show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
          <Label htmlFor="show-archived">{t('showArchived')}</Label>
        </div>
        {canManage ? <div id="plans-actions" /> : null}
      </div>

      {plansQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : plansQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>{t('errorTitle')}</AlertTitle>
          <AlertDescription>{apiErrorMessage(plansQuery.error, t('loadError'))}</AlertDescription>
        </Alert>
      ) : plans.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <PlanRow key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </div>
  );
}
```

`include_archived` is part of the query key (`getListPlansQueryKey(id, params)`), so toggling refetches under a distinct cache entry rather than showing stale rows.

The `<div id="plans-actions" />` is a deliberate seam: Task 4 replaces it with the create button, Task 5 adds the per-row archive action.

- [ ] **Step 2: Run the gates**

Run: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`
Expected: all green.

- [ ] **Step 3: Verify against staging**

Log in as an owner, open **Offres**. Expected: the empty state (no plans exist yet), the archived toggle rendering, and no console errors. Toggle it and confirm a second network request goes out with `?include_archived=true`.

- [ ] **Step 4: Commit**

```bash
npx prettier --write "apps/owner/app/(app)/plans/plans-list.tsx"
git add "apps/owner/app/(app)/plans/plans-list.tsx"
git commit -m "feat(owner): list a venue's plans with an archived toggle

Rows show the plan kind, price, and whichever terms apply — an entry_pack can
carry both an entry count and an expiry, so both render when present.
include_archived is part of the Orval query key, so toggling refetches under a
separate cache entry instead of showing stale rows."
```

---

### Task 4: Create and edit plan dialog

The form's validation branches on `kind`, which is the fiddliest logic in this plan — so it is extracted into a pure module and tested before any JSX is written.

**Files:**

- Create: `apps/owner/lib/plan-form.ts`
- Create: `apps/owner/lib/plan-form.test.ts`
- Create: `apps/owner/app/(app)/plans/plan-dialog.tsx`
- Modify: `apps/owner/app/(app)/plans/plans-list.tsx`
- Modify: `apps/owner/messages/fr.json`, `apps/owner/messages/en.json`

**Interfaces:**

- Consumes: `toMinorUnits` / `fromMinorUnits` from `@/lib/money`.
- Produces: `PlanFormValues`, `PlanFormMessages`, `buildPlanSchema(m: PlanFormMessages)`, `toCreatePlanRequest(v: PlanFormValues): CreatePlanRequest`, `toUpdatePlanRequest(v: PlanFormValues): UpdatePlanRequest`, `planToFormValues(p: ActivityPlan): PlanFormValues`, and the `PlanDialog` component.

- [ ] **Step 1: Write the failing plan-form tests**

Create `apps/owner/lib/plan-form.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';

import type { PlanFormMessages, PlanFormValues } from './plan-form';
import {
  buildPlanSchema,
  planToFormValues,
  toCreatePlanRequest,
  toUpdatePlanRequest,
} from './plan-form';

const messages: PlanFormMessages = {
  nameRequired: 'name required',
  priceInvalid: 'price invalid',
  durationRequired: 'duration required',
  entriesRequired: 'entries required',
  activitiesRequired: 'activities required',
};

const base: PlanFormValues = {
  name: 'Mensuel illimité',
  kind: 'subscription',
  price_major: '25000',
  price_currency: 'XOF',
  duration_days: '30',
  entry_count: '',
  all_activities: true,
  activities: [],
};

const schema = buildPlanSchema(messages);

describe('buildPlanSchema', () => {
  it('accepts a valid subscription', () => {
    expect(schema.safeParse(base).success).toBe(true);
  });

  it('rejects a subscription with no duration', () => {
    const result = schema.safeParse({ ...base, duration_days: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['duration_days']);
  });

  it('accepts an entry pack with a count and no duration', () => {
    const result = schema.safeParse({
      ...base,
      kind: 'entry_pack',
      duration_days: '',
      entry_count: '10',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an entry pack with a zero count', () => {
    const result = schema.safeParse({
      ...base,
      kind: 'entry_pack',
      duration_days: '',
      entry_count: '0',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['entry_count']);
  });

  it('rejects a restricted plan with no activities', () => {
    const result = schema.safeParse({ ...base, all_activities: false, activities: [] });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['activities']);
  });

  it('rejects a non-numeric price', () => {
    expect(schema.safeParse({ ...base, price_major: 'gratuit' }).success).toBe(false);
  });
});

describe('toCreatePlanRequest', () => {
  it('scales the price to minor units and omits the irrelevant term', () => {
    expect(toCreatePlanRequest(base)).toEqual({
      name: 'Mensuel illimité',
      kind: 'subscription',
      price_amount_minor: 25000,
      price_currency: 'XOF',
      all_activities: true,
      duration_days: 30,
    });
  });

  it('sends entry_count and no duration for a bare entry pack', () => {
    const request = toCreatePlanRequest({
      ...base,
      kind: 'entry_pack',
      duration_days: '',
      entry_count: '10',
    });
    expect(request.entry_count).toBe(10);
    expect('duration_days' in request).toBe(false);
  });

  it('sends the activity subset when all_activities is off', () => {
    const request = toCreatePlanRequest({
      ...base,
      all_activities: false,
      activities: ['yoga', 'pilates'],
    });
    expect(request.all_activities).toBe(false);
    expect(request.activities).toEqual(['yoga', 'pilates']);
  });
});

describe('toUpdatePlanRequest', () => {
  it('omits kind, which the API treats as immutable', () => {
    expect('kind' in toUpdatePlanRequest(base)).toBe(false);
  });
});

describe('planToFormValues', () => {
  it('round-trips a plan back into major units', () => {
    const values = planToFormValues({
      activities: [],
      all_activities: true,
      created_at: '2026-08-14T00:00:00Z',
      duration_days: 30,
      entry_count: null,
      id: 'plan-1',
      is_active: true,
      kind: 'subscription',
      name: 'Mensuel illimité',
      price_amount_minor: 25000,
      price_currency: 'XOF',
      tenant_id: 'tenant-1',
      updated_at: '2026-08-14T00:00:00Z',
      venue_id: 'venue-1',
    });
    expect(values.price_major).toBe('25000');
    expect(values.duration_days).toBe('30');
    expect(values.entry_count).toBe('');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @iziwellpass/owner test`
Expected: FAIL — `Failed to resolve import "./plan-form"`.

- [ ] **Step 3: Implement the plan-form module**

Create `apps/owner/lib/plan-form.ts`:

```typescript
import { z } from 'zod';

import type {
  ActivityPlan,
  ActivityType,
  CreatePlanRequest,
  Currency,
  PlanKind,
  UpdatePlanRequest,
} from '@iziwellpass/api/schemas';

import { fromMinorUnits, toMinorUnits } from './money';

/**
 * Numeric fields are held as strings because they are text inputs: an empty
 * input must be distinguishable from zero (an entry_pack with `entry_count: 0`
 * is invalid, but a blank field is merely incomplete).
 */
export interface PlanFormValues {
  name: string;
  kind: PlanKind;
  price_major: string;
  price_currency: Currency;
  duration_days: string;
  entry_count: string;
  all_activities: boolean;
  /**
   * Held as `string[]`, not `ActivityType[]`: the zod schema validates this as
   * `z.array(z.string())`, and a narrower form type would not match what
   * `zodResolver` infers. Narrowed at the API boundary in `toCreatePlanRequest`.
   */
  activities: string[];
}

/** Validation copy, injected so the schema stays pure and testable. */
export interface PlanFormMessages {
  nameRequired: string;
  priceInvalid: string;
  durationRequired: string;
  entriesRequired: string;
  activitiesRequired: string;
}

/** Parses a positive integer from a text input; null when blank or invalid. */
function positiveInt(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

/**
 * The API's rules, mirrored client-side so owners get inline errors instead of
 * a 400: a `subscription` needs `duration_days` and forbids `entry_count`; an
 * `entry_pack` needs `entry_count > 0` and may carry `duration_days` as an
 * expiry; a plan restricted to some activities needs a non-empty list.
 */
export function buildPlanSchema(m: PlanFormMessages) {
  return z
    .object({
      name: z.string().min(1, m.nameRequired),
      kind: z.enum(['subscription', 'entry_pack']),
      price_major: z.string(),
      price_currency: z.enum(['XOF', 'XAF', 'EUR', 'USD', 'GHS', 'NGN']),
      duration_days: z.string(),
      entry_count: z.string(),
      all_activities: z.boolean(),
      activities: z.array(z.string()),
    })
    .superRefine((val, ctx) => {
      const price = Number(val.price_major.trim());
      if (val.price_major.trim() === '' || Number.isNaN(price) || price < 0) {
        ctx.addIssue({ code: 'custom', path: ['price_major'], message: m.priceInvalid });
      }
      if (val.kind === 'subscription' && positiveInt(val.duration_days) === null) {
        ctx.addIssue({ code: 'custom', path: ['duration_days'], message: m.durationRequired });
      }
      if (val.kind === 'entry_pack' && positiveInt(val.entry_count) === null) {
        ctx.addIssue({ code: 'custom', path: ['entry_count'], message: m.entriesRequired });
      }
      if (!val.all_activities && val.activities.length === 0) {
        ctx.addIssue({ code: 'custom', path: ['activities'], message: m.activitiesRequired });
      }
    });
}

/** Shared body fields for create and update. */
function commonFields(v: PlanFormValues) {
  return {
    name: v.name,
    price_amount_minor: toMinorUnits(Number(v.price_major.trim()), v.price_currency),
    price_currency: v.price_currency,
    all_activities: v.all_activities,
    // Narrowed here rather than in the form type — see PlanFormValues.activities.
    ...(v.all_activities ? {} : { activities: v.activities as ActivityType[] }),
  };
}

export function toCreatePlanRequest(v: PlanFormValues): CreatePlanRequest {
  const duration = positiveInt(v.duration_days);
  const entries = positiveInt(v.entry_count);
  return {
    ...commonFields(v),
    kind: v.kind,
    // A subscription must not carry entry_count at all, so omit rather than null.
    ...(duration !== null ? { duration_days: duration } : {}),
    ...(v.kind === 'entry_pack' && entries !== null ? { entry_count: entries } : {}),
  };
}

/** `kind`, `duration_days` and `entry_count` are not in UpdatePlanRequest. */
export function toUpdatePlanRequest(v: PlanFormValues): UpdatePlanRequest {
  return commonFields(v);
}

export function planToFormValues(plan: ActivityPlan): PlanFormValues {
  return {
    name: plan.name,
    kind: plan.kind,
    price_major: String(fromMinorUnits(plan.price_amount_minor, plan.price_currency)),
    price_currency: plan.price_currency,
    duration_days: plan.duration_days == null ? '' : String(plan.duration_days),
    entry_count: plan.entry_count == null ? '' : String(plan.entry_count),
    all_activities: plan.all_activities,
    activities: plan.activities,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @iziwellpass/owner test`
Expected: PASS.

- [ ] **Step 5: Add the dialog i18n keys**

Add to the `plans` namespace in `messages/fr.json`:

```json
"dialog": {
  "createTitle": "Créer une offre",
  "editTitle": "Modifier l'offre",
  "description": "Une offre est soit un abonnement limité dans le temps, soit un carnet d'entrées.",
  "name": "Nom",
  "kind": "Type",
  "price": "Prix",
  "currency": "Devise",
  "duration": "Durée (jours)",
  "entries": "Nombre d'entrées",
  "allActivities": "Valable pour toutes les activités",
  "activities": "Activités concernées",
  "submit": "Enregistrer",
  "submitting": "Enregistrement…",
  "createSuccess": "Offre créée",
  "editSuccess": "Offre modifiée",
  "createError": "Impossible de créer l'offre",
  "editError": "Impossible de modifier l'offre"
},
"validation": {
  "nameRequired": "Le nom est requis",
  "priceInvalid": "Saisissez un prix valide",
  "durationRequired": "La durée est requise pour un abonnement",
  "entriesRequired": "Le nombre d'entrées doit être supérieur à 0",
  "activitiesRequired": "Choisissez au moins une activité"
}
```

And the mirrored English in `messages/en.json`:

```json
"dialog": {
  "createTitle": "Create a plan",
  "editTitle": "Edit plan",
  "description": "A plan is either a time-limited subscription or a pack of entries.",
  "name": "Name",
  "kind": "Kind",
  "price": "Price",
  "currency": "Currency",
  "duration": "Duration (days)",
  "entries": "Number of entries",
  "allActivities": "Valid for all activities",
  "activities": "Included activities",
  "submit": "Save",
  "submitting": "Saving…",
  "createSuccess": "Plan created",
  "editSuccess": "Plan updated",
  "createError": "Could not create the plan",
  "editError": "Could not update the plan"
},
"validation": {
  "nameRequired": "Name is required",
  "priceInvalid": "Enter a valid price",
  "durationRequired": "Duration is required for a subscription",
  "entriesRequired": "Entry count must be greater than 0",
  "activitiesRequired": "Pick at least one activity"
}
```

- [ ] **Step 6: Implement the dialog**

Create `apps/owner/app/(app)/plans/plan-dialog.tsx`:

```tsx
'use client';

import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { PlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { getListPlansQueryKey, useCreatePlan, useUpdatePlan } from '@iziwellpass/api/generated';
import type { ActivityPlan } from '@iziwellpass/api/schemas';
import { Currency, PlanKind } from '@iziwellpass/api/schemas';
import { Button } from '@iziwellpass/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@iziwellpass/ui/components/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@iziwellpass/ui/components/form';
import { Input } from '@iziwellpass/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@iziwellpass/ui/components/select';
import { Switch } from '@iziwellpass/ui/components/switch';

import { useActivityTypeLabel } from '@/lib/activity-type';
import { apiErrorMessage, applyFieldErrors } from '@/lib/api-error';
import type { PlanFormValues } from '@/lib/plan-form';
import {
  buildPlanSchema,
  planToFormValues,
  toCreatePlanRequest,
  toUpdatePlanRequest,
} from '@/lib/plan-form';

const CURRENCIES = Object.values(Currency);
const KINDS = Object.values(PlanKind);

const emptyPlan: PlanFormValues = {
  name: '',
  kind: 'subscription',
  price_major: '',
  price_currency: 'XOF',
  duration_days: '',
  entry_count: '',
  all_activities: true,
  activities: [],
};

/**
 * One dialog, two modes. In edit mode `kind` renders as static text because the
 * API treats it as immutable, and the payload goes through toUpdatePlanRequest
 * (which drops kind, duration_days and entry_count — none are updatable).
 */
export function PlanDialog({
  venueId,
  venueActivities,
  plan,
}: {
  venueId: string;
  venueActivities: string[];
  plan?: ActivityPlan;
}) {
  const t = useTranslations('plans');
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const activityLabel = useActivityTypeLabel();
  const isEdit = plan !== undefined;

  const schema = useMemo(
    () =>
      buildPlanSchema({
        nameRequired: t('validation.nameRequired'),
        priceInvalid: t('validation.priceInvalid'),
        durationRequired: t('validation.durationRequired'),
        entriesRequired: t('validation.entriesRequired'),
        activitiesRequired: t('validation.activitiesRequired'),
      }),
    [t],
  );

  const defaults = useMemo(() => (plan ? planToFormValues(plan) : emptyPlan), [plan]);

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const kind = form.watch('kind');
  const allActivities = form.watch('all_activities');
  const pending = createPlan.isPending || updatePlan.isPending;

  const onDone = (message: string) => {
    toast.success(message);
    void queryClient.invalidateQueries({ queryKey: getListPlansQueryKey(venueId) });
    form.reset(defaults);
    setOpen(false);
  };

  const onError = (err: unknown, fallback: string) => {
    if (!applyFieldErrors(form, err)) {
      toast.error(apiErrorMessage(err, fallback));
    }
  };

  const onSubmit = (values: PlanFormValues) => {
    if (plan) {
      updatePlan.mutate(
        { id: venueId, planId: plan.id, data: toUpdatePlanRequest(values) },
        {
          onSuccess: () => onDone(t('dialog.editSuccess')),
          onError: (err) => onError(err, t('dialog.editError')),
        },
      );
      return;
    }
    createPlan.mutate(
      { id: venueId, data: toCreatePlanRequest(values) },
      {
        onSuccess: () => onDone(t('dialog.createSuccess')),
        onError: (err) => onError(err, t('dialog.createError')),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset(defaults);
      }}
    >
      <DialogTrigger asChild>
        <Button variant={isEdit ? 'outline' : 'default'} size={isEdit ? 'sm' : 'default'}>
          {isEdit ? null : <PlusIcon />}
          {isEdit ? t('edit') : t('add')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t('dialog.editTitle') : t('dialog.createTitle')}</DialogTitle>
          <DialogDescription>{t('dialog.description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('dialog.name')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEdit ? (
              <div className="space-y-1">
                <p className="text-sm font-medium">{t('dialog.kind')}</p>
                <p className="text-sm text-muted-foreground">{t(`kind.${kind}`)}</p>
              </div>
            ) : (
              <FormField
                control={form.control}
                name="kind"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dialog.kind')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {KINDS.map((k) => (
                          <SelectItem key={k} value={k}>
                            {t(`kind.${k}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price_major"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dialog.price')}</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price_currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dialog.currency')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* An entry_pack may also carry a duration as an expiry, so the
                duration field stays visible for both kinds. */}
            {kind === 'entry_pack' ? (
              <FormField
                control={form.control}
                name="entry_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dialog.entries')}</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <FormField
              control={form.control}
              name="duration_days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('dialog.duration')}</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="all_activities"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4">
                  <FormLabel>{t('dialog.allActivities')}</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {allActivities ? null : (
              <FormField
                control={form.control}
                name="activities"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dialog.activities')}</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {venueActivities.map((activity) => {
                        const selected = field.value.includes(activity);
                        return (
                          <Button
                            key={activity}
                            type="button"
                            size="sm"
                            variant={selected ? 'default' : 'outline'}
                            onClick={() =>
                              field.onChange(
                                selected
                                  ? field.value.filter((a) => a !== activity)
                                  : [...field.value, activity],
                              )
                            }
                          >
                            {activityLabel(activity)}
                          </Button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? t('dialog.submitting') : t('dialog.submit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 7: Mount create and edit in the list**

In `plans-list.tsx`:

Add the imports:

```tsx
import { useListVenueActivities } from '@iziwellpass/api/generated';

import { PlanDialog } from './plan-dialog';
```

In `PlansList`, fetch the venue's activities (needed by the restricted-activities picker) and pass them down:

```tsx
const activitiesQuery = useListVenueActivities(venueId, { query: { select: unwrap } });
const venueActivities = (activitiesQuery.data ?? []).map((a) => a.activity_type);
```

Replace `<div id="plans-actions" />` with:

```tsx
{
  canManage ? <PlanDialog venueId={venueId} venueActivities={venueActivities} /> : null;
}
```

Give `PlanRow` the extra props and render the edit button. Change its signature to:

```tsx
function PlanRow({
  plan,
  venueId,
  venueActivities,
  canManage,
}: {
  plan: ActivityPlan;
  venueId: string;
  venueActivities: string[];
  canManage: boolean;
}) {
```

and add, inside the right-hand `<div className="text-right">`, below the terms:

```tsx
{
  canManage ? (
    <div className="mt-2 flex justify-end gap-2">
      <PlanDialog venueId={venueId} venueActivities={venueActivities} plan={plan} />
    </div>
  ) : null;
}
```

Update the map accordingly:

```tsx
<PlanRow
  key={plan.id}
  plan={plan}
  venueId={venueId}
  venueActivities={venueActivities}
  canManage={canManage}
/>
```

`VenueActivity.activity_type` is the field name (confirmed against `packages/api/src/generated/endpoints.schemas.ts`).

- [ ] **Step 8: Run the gates**

Run: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`
Expected: all green.

- [ ] **Step 9: Verify against staging**

Create a `subscription` plan (25000 XOF, 30 days) and an `entry_pack` (10 entries). Confirm: the price renders as FCFA with no decimals; the entry field appears only for entry packs; editing shows `kind` as static text; turning off "toutes les activités" requires at least one chip.

- [ ] **Step 10: Commit**

```bash
npx prettier --write apps/owner/lib/plan-form.ts apps/owner/lib/plan-form.test.ts "apps/owner/app/(app)/plans/plan-dialog.tsx" "apps/owner/app/(app)/plans/plans-list.tsx" apps/owner/messages/fr.json apps/owner/messages/en.json
git add apps/owner/lib/plan-form.ts apps/owner/lib/plan-form.test.ts "apps/owner/app/(app)/plans" apps/owner/messages
git commit -m "feat(owner): create and edit activity plans

The form's rules branch on kind — a subscription needs duration_days and
forbids entry_count, an entry_pack needs a positive entry_count and may carry
duration_days as an expiry — so that logic lives in lib/plan-form.ts with unit
tests rather than inline in JSX.

Numeric fields are held as strings because an empty input must be
distinguishable from zero: entry_count 0 is invalid, blank is merely
incomplete. kind renders as static text when editing, since the API treats it
as immutable."
```

---

### Task 5: Archive a plan

**Files:**

- Create: `apps/owner/app/(app)/plans/archive-plan-dialog.tsx`
- Modify: `apps/owner/app/(app)/plans/plans-list.tsx`
- Modify: `apps/owner/messages/fr.json`, `apps/owner/messages/en.json`

**Interfaces:**

- Consumes: `useArchivePlan` — mutation variables `{ id: string; planId: string }`.
- Produces: `ArchivePlanDialog({ venueId, plan })`.

- [ ] **Step 1: Add the i18n keys**

Add to the `plans` namespace in `messages/fr.json`:

```json
"archiveDialog": {
  "title": "Archiver cette offre ?",
  "description": "« {name} » ne pourra plus être attribuée. Les abonnements déjà vendus ne sont pas affectés.",
  "confirm": "Archiver",
  "submitting": "Archivage…",
  "success": "Offre archivée",
  "error": "Impossible d'archiver l'offre"
}
```

and in `messages/en.json`:

```json
"archiveDialog": {
  "title": "Archive this plan?",
  "description": "\"{name}\" can no longer be assigned. Subscriptions already sold are unaffected.",
  "confirm": "Archive",
  "submitting": "Archiving…",
  "success": "Plan archived",
  "error": "Could not archive the plan"
}
```

- [ ] **Step 2: Implement the confirm dialog**

Create `apps/owner/app/(app)/plans/archive-plan-dialog.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { getListPlansQueryKey, useArchivePlan } from '@iziwellpass/api/generated';
import type { ActivityPlan } from '@iziwellpass/api/schemas';
import { Button } from '@iziwellpass/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@iziwellpass/ui/components/dialog';

import { apiErrorMessage } from '@/lib/api-error';

/** Archive is a soft delete (is_active=false), so the copy avoids "supprimer". */
export function ArchivePlanDialog({ venueId, plan }: { venueId: string; plan: ActivityPlan }) {
  const t = useTranslations('plans');
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const archivePlan = useArchivePlan();

  const onConfirm = () => {
    archivePlan.mutate(
      { id: venueId, planId: plan.id },
      {
        onSuccess: () => {
          toast.success(t('archiveDialog.success'));
          void queryClient.invalidateQueries({ queryKey: getListPlansQueryKey(venueId) });
          setOpen(false);
        },
        onError: (err) => toast.error(apiErrorMessage(err, t('archiveDialog.error'))),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {t('archive')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('archiveDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('archiveDialog.description', { name: plan.name })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="destructive" onClick={onConfirm} disabled={archivePlan.isPending}>
            {archivePlan.isPending ? t('archiveDialog.submitting') : t('archiveDialog.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Mount it on active rows only**

In `plans-list.tsx`, import it:

```tsx
import { ArchivePlanDialog } from './archive-plan-dialog';
```

and inside `PlanRow`'s action row, next to the edit dialog — an already-archived plan has nothing to archive:

```tsx
{
  plan.is_active ? <ArchivePlanDialog venueId={venueId} plan={plan} /> : null;
}
```

- [ ] **Step 4: Run the gates**

Run: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`
Expected: all green.

- [ ] **Step 5: Verify against staging**

Archive the entry pack. Expected: it disappears from the default list, reappears with an **Archivée** badge when the toggle is on, and shows no archive button in that state.

- [ ] **Step 6: Commit**

```bash
npx prettier --write "apps/owner/app/(app)/plans/archive-plan-dialog.tsx" "apps/owner/app/(app)/plans/plans-list.tsx" apps/owner/messages/fr.json apps/owner/messages/en.json
git add "apps/owner/app/(app)/plans" apps/owner/messages
git commit -m "feat(owner): archive a plan behind a confirm dialog

DELETE on a plan is a soft archive (is_active=false), so the copy says
archiver rather than supprimer and spells out that subscriptions already sold
are unaffected. The action is hidden on rows that are already archived."
```

---

### Task 6: Abonnements card on member detail

**Files:**

- Create: `apps/owner/app/(app)/members/[id]/subscriptions-card.tsx`
- Modify: `apps/owner/app/(app)/members/[id]/page.tsx`
- Modify: `apps/owner/messages/fr.json`, `apps/owner/messages/en.json`

**Interfaces:**

- Consumes: `useListSubscriptions(mid, params?, options?)`, `useListPlans` (to resolve plan names), `formatMoney`, `formatCalendarDate` from `@/lib/datetime`.
- Produces: `SubscriptionsCard({ memberId, canManage })`. Tasks 7 and 8 mount their dialogs inside it.

- [ ] **Step 1: Rename the existing card to Adhésion**

The spec keeps both membership models but requires they not read as duplicates. In `messages/fr.json`, change `members.detail.subscription.title` to `"Adhésion"` (from its current value) and in `messages/en.json` to `"Membership"`. Leave the rest of that namespace alone.

- [ ] **Step 2: Add the subscriptions i18n keys**

Add a `subscriptions` block inside `members.detail` in `messages/fr.json`, directly after the `subscription` block:

```json
"subscriptions": {
  "title": "Abonnements",
  "description": "Les formules achetées par ce membre.",
  "empty": "Aucun abonnement pour le moment.",
  "loadError": "Impossible de charger les abonnements",
  "unknownPlan": "Offre inconnue",
  "expiresOn": "Expire le {date}",
  "entriesLeft": "{remaining} / {total} entrées restantes",
  "unpaid": "Impayé",
  "status": {
    "active": "Actif",
    "expired": "Expiré",
    "exhausted": "Épuisé",
    "cancelled": "Annulé"
  }
}
```

and in `messages/en.json`:

```json
"subscriptions": {
  "title": "Subscriptions",
  "description": "The plans this member has bought.",
  "empty": "No subscriptions yet.",
  "loadError": "Could not load subscriptions",
  "unknownPlan": "Unknown plan",
  "expiresOn": "Expires {date}",
  "entriesLeft": "{remaining} / {total} entries left",
  "unpaid": "Unpaid",
  "status": {
    "active": "Active",
    "expired": "Expired",
    "exhausted": "Exhausted",
    "cancelled": "Cancelled"
  }
}
```

- [ ] **Step 3: Implement the card**

Create `apps/owner/app/(app)/members/[id]/subscriptions-card.tsx`:

```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';

import { unwrap } from '@iziwellpass/api/client';
import { useListSubscriptions } from '@iziwellpass/api/generated';
import type { MemberSubscription, SubscriptionStatus } from '@iziwellpass/api/schemas';
import { Alert, AlertDescription } from '@iziwellpass/ui/components/alert';
import { Badge } from '@iziwellpass/ui/components/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@iziwellpass/ui/components/card';
import { Separator } from '@iziwellpass/ui/components/separator';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';

import { apiErrorMessage } from '@/lib/api-error';
import { formatCalendarDate } from '@/lib/datetime';
import { formatMoney } from '@/lib/money';

/**
 * Status colour mirrors lib/member-status.ts: live reads as success, cancelled
 * as destructive, spent/lapsed as muted. Colour always pairs with a text label.
 */
function statusVariant(status: SubscriptionStatus): 'success' | 'destructive' | 'secondary' {
  if (status === 'active') return 'success';
  if (status === 'cancelled') return 'destructive';
  return 'secondary';
}

function SubscriptionRow({
  subscription,
  planName,
}: {
  subscription: MemberSubscription;
  planName: string;
}) {
  const t = useTranslations('members');
  const locale = useLocale();

  // A subscription is time-based or count-based; show whichever the plan uses.
  const terms =
    subscription.entries_total != null
      ? t('detail.subscriptions.entriesLeft', {
          remaining: subscription.entries_remaining ?? 0,
          total: subscription.entries_total,
        })
      : subscription.expires_on != null
        ? t('detail.subscriptions.expiresOn', {
            date: formatCalendarDate(subscription.expires_on, locale),
          })
        : null;

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{planName}</span>
          <Badge variant={statusVariant(subscription.status)}>
            {t(`detail.subscriptions.status.${subscription.status}`)}
          </Badge>
          {subscription.payment_status === 'unpaid' ? (
            <Badge variant="outline">{t('detail.subscriptions.unpaid')}</Badge>
          ) : null}
        </div>
        {terms ? <p className="text-sm text-muted-foreground">{terms}</p> : null}
      </div>
      <span className="font-medium">
        {formatMoney(subscription.price_amount_minor, subscription.price_currency, locale)}
      </span>
    </div>
  );
}

export function SubscriptionsCard({
  memberId,
  canManage,
}: {
  memberId: string;
  canManage: boolean;
}) {
  const t = useTranslations('members');

  const subscriptionsQuery = useListSubscriptions(memberId, undefined, {
    query: { select: unwrap },
  });
  const subscriptions = subscriptionsQuery.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('detail.subscriptions.title')}</CardTitle>
        <CardDescription>{t('detail.subscriptions.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {subscriptionsQuery.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : subscriptionsQuery.isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              {apiErrorMessage(subscriptionsQuery.error, t('detail.subscriptions.loadError'))}
            </AlertDescription>
          </Alert>
        ) : subscriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('detail.subscriptions.empty')}</p>
        ) : (
          <div className="space-y-4">
            {subscriptions.map((subscription, i) => (
              <div key={subscription.id} className="space-y-4">
                {i > 0 ? <Separator /> : null}
                <SubscriptionRow
                  subscription={subscription}
                  planName={t('detail.subscriptions.unknownPlan')}
                />
              </div>
            ))}
          </div>
        )}
        {canManage ? <div id="subscription-actions" /> : null}
      </CardContent>
    </Card>
  );
}
```

`MemberSubscription` carries `plan_id` but no plan name, and plans are listed per venue — so resolving real names needs a per-venue `useListPlans` lookup. Task 7 introduces that lookup for the assign picker; until then rows show the `unknownPlan` placeholder. The `<div id="subscription-actions" />` is the seam Task 7 replaces.

- [ ] **Step 4: Mount the card on member detail**

In `apps/owner/app/(app)/members/[id]/page.tsx`, add the import:

```tsx
import { SubscriptionsCard } from './subscriptions-card';
```

Find where `<SubscriptionCard member={member} />` is rendered inside `MemberDetailContent` and insert the new card immediately **above** it, so the priced record reads first:

```tsx
<SubscriptionsCard memberId={member.id} canManage={canEdit} />
```

`canEdit` is already in scope — `MemberDetailContent` computes it at `page.tsx:658` as `role === 'owner' || role === 'admin' || role === 'receptionist'`, which is exactly the gating this card needs. Do not add a second role boolean.

- [ ] **Step 5: Run the gates**

Run: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`
Expected: all green.

- [ ] **Step 6: Verify against staging**

Open a member. Expected: an **Abonnements** card above **Adhésion**, showing the empty state, and the two cards reading as clearly different things.

- [ ] **Step 7: Commit**

```bash
npx prettier --write "apps/owner/app/(app)/members/[id]/subscriptions-card.tsx" "apps/owner/app/(app)/members/[id]/page.tsx" apps/owner/messages/fr.json apps/owner/messages/en.json
git add "apps/owner/app/(app)/members/[id]" apps/owner/messages
git commit -m "feat(owner): show a member's subscriptions alongside their membership

A member now carries two unconnected notions of membership: the flat
membership_* fields on Member, and MemberSubscription rows that hold a real
price and lifecycle. The spec keeps both, so the existing card is renamed
Adhesion and the priced record gets its own Abonnements card above it.

Plan names are still placeholders — MemberSubscription carries only plan_id,
and plans are listed per venue, so resolving names needs the per-venue lookup
that lands with the assign dialog."
```

---

### Task 7: Assign a plan to a member

**Files:**

- Create: `apps/owner/app/(app)/members/[id]/assign-subscription-dialog.tsx`
- Modify: `apps/owner/app/(app)/members/[id]/subscriptions-card.tsx`
- Modify: `apps/owner/messages/fr.json`, `apps/owner/messages/en.json`

**Interfaces:**

- Consumes: `useAssignSubscription` — variables `{ mid: string; data: AssignSubscriptionRequest }`; `useVenueContext`; `venueToday` from `@/lib/datetime`.
- Produces: `AssignSubscriptionDialog({ memberId })`, and `usePlanNames(venueIds)` exported from the same file for row name resolution.

- [ ] **Step 1: Add the i18n keys**

Add inside `members.detail.subscriptions` in `messages/fr.json`:

```json
"assign": "Attribuer une formule",
"assignDialog": {
  "title": "Attribuer une formule",
  "description": "L'établissement de l'offre détermine où l'abonnement est valable.",
  "venue": "Établissement",
  "plan": "Offre",
  "planPlaceholder": "Choisissez une offre",
  "noPlans": "Aucune offre active dans cet établissement.",
  "startsOn": "Début",
  "paid": "Réglé",
  "submit": "Attribuer",
  "submitting": "Attribution…",
  "success": "Abonnement attribué",
  "error": "Impossible d'attribuer l'abonnement"
}
```

and in `messages/en.json`:

```json
"assign": "Assign a plan",
"assignDialog": {
  "title": "Assign a plan",
  "description": "The plan's venue determines where the subscription is valid.",
  "venue": "Venue",
  "plan": "Plan",
  "planPlaceholder": "Pick a plan",
  "noPlans": "No active plans at this venue.",
  "startsOn": "Start",
  "paid": "Paid",
  "submit": "Assign",
  "submitting": "Assigning…",
  "success": "Subscription assigned",
  "error": "Could not assign the subscription"
}
```

- [ ] **Step 2: Implement the dialog**

Create `apps/owner/app/(app)/members/[id]/assign-subscription-dialog.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PlusIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { unwrap } from '@iziwellpass/api/client';
import {
  getListSubscriptionsQueryKey,
  useAssignSubscription,
  useListPlans,
} from '@iziwellpass/api/generated';
import { Button } from '@iziwellpass/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@iziwellpass/ui/components/dialog';
import { Input } from '@iziwellpass/ui/components/input';
import { Label } from '@iziwellpass/ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@iziwellpass/ui/components/select';
import { Switch } from '@iziwellpass/ui/components/switch';

import { apiErrorMessage } from '@/lib/api-error';
import { venueToday } from '@/lib/datetime';
import { formatMoney } from '@/lib/money';
import { useVenueContext } from '@/lib/venue-context';

/**
 * Assign a venue's plan to a member.
 *
 * The venue picker offers every venue the caller can see, not just the ones
 * this member may enter: `Member` carries no `venue_ids` and there is no read
 * endpoint for member entitlements. The API rejects a mismatch with
 * `403 "the member is not entitled to the plan's venue"`, which surfaces as a
 * toast — see the backend asks in docs/backend-issues.md.
 */
export function AssignSubscriptionDialog({ memberId }: { memberId: string }) {
  const t = useTranslations('members');
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const assign = useAssignSubscription();

  const { venues, selectedVenueId } = useVenueContext();
  const [venueId, setVenueId] = useState<string>(selectedVenueId ?? '');
  const [planId, setPlanId] = useState<string>('');
  const [paid, setPaid] = useState(true);

  const venue = venues.find((v) => v.id === venueId);
  const [startsOn, setStartsOn] = useState<string>(() => venueToday(undefined));

  // Only active plans can be sold; archived ones stay visible on existing rows.
  const plansQuery = useListPlans(
    venueId,
    { include_archived: false },
    { query: { select: unwrap, enabled: venueId !== '' } },
  );
  const plans = plansQuery.data ?? [];

  // Changing venue invalidates the chosen plan, and re-anchors the start date
  // to the new venue's local today.
  useEffect(() => {
    setPlanId('');
    if (venue) {
      setStartsOn(venueToday(venue.timezone));
    }
  }, [venueId, venue]);

  const onSubmit = () => {
    assign.mutate(
      {
        mid: memberId,
        data: {
          plan_id: planId,
          starts_on: startsOn,
          payment_status: paid ? 'paid' : 'unpaid',
        },
      },
      {
        onSuccess: () => {
          toast.success(t('detail.subscriptions.assignDialog.success'));
          void queryClient.invalidateQueries({
            queryKey: getListSubscriptionsQueryKey(memberId),
          });
          setPlanId('');
          setOpen(false);
        },
        onError: (err) =>
          toast.error(apiErrorMessage(err, t('detail.subscriptions.assignDialog.error'))),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon />
          {t('detail.subscriptions.assign')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('detail.subscriptions.assignDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('detail.subscriptions.assignDialog.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="assign-venue">{t('detail.subscriptions.assignDialog.venue')}</Label>
            <Select value={venueId} onValueChange={setVenueId}>
              <SelectTrigger id="assign-venue">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {venues.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="assign-plan">{t('detail.subscriptions.assignDialog.plan')}</Label>
            {venueId !== '' && !plansQuery.isLoading && plans.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('detail.subscriptions.assignDialog.noPlans')}
              </p>
            ) : (
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger id="assign-plan">
                  <SelectValue
                    placeholder={t('detail.subscriptions.assignDialog.planPlaceholder')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} —{' '}
                      {formatMoney(plan.price_amount_minor, plan.price_currency, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="assign-start">{t('detail.subscriptions.assignDialog.startsOn')}</Label>
            <Input
              id="assign-start"
              type="date"
              value={startsOn}
              onChange={(e) => setStartsOn(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="assign-paid">{t('detail.subscriptions.assignDialog.paid')}</Label>
            <Switch id="assign-paid" checked={paid} onCheckedChange={setPaid} />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onSubmit} disabled={planId === '' || assign.isPending}>
            {assign.isPending
              ? t('detail.subscriptions.assignDialog.submitting')
              : t('detail.subscriptions.assignDialog.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

This uses plain controlled state rather than react-hook-form: there are four fields, no cross-field rules, and the submit button is disabled until a plan is chosen — a zod schema would add ceremony without catching anything.

- [ ] **Step 3: Mount it and resolve plan names**

In `subscriptions-card.tsx`, import:

```tsx
import { AssignSubscriptionDialog } from './assign-subscription-dialog';
```

Replace `<div id="subscription-actions" />` with:

```tsx
{
  canManage ? <AssignSubscriptionDialog memberId={memberId} /> : null;
}
```

Then resolve real plan names. Subscriptions carry `venue_id`, so plans must be looked up per distinct venue present in the list, and a name map keyed by plan id built from the results. Because hooks cannot be called in a loop, render one lookup component per venue instead — add this above `SubscriptionsCard`:

```tsx
/**
 * Plan names live on the venue's plan list, not on the subscription, so each
 * venue represented in the list needs its own query. Archived plans are
 * included: a member can hold a subscription to a plan that was later archived.
 */
function VenuePlanNames({
  venueId,
  onLoaded,
}: {
  venueId: string;
  onLoaded: (names: Record<string, string>) => void;
}) {
  const plansQuery = useListPlans(
    venueId,
    { include_archived: true },
    { query: { select: unwrap } },
  );
  const plans = plansQuery.data;

  useEffect(() => {
    if (!plans) return;
    onLoaded(Object.fromEntries(plans.map((p) => [p.id, p.name])));
  }, [plans, onLoaded]);

  return null;
}
```

In `SubscriptionsCard`, hold the map and render one lookup per distinct venue:

```tsx
const [planNames, setPlanNames] = useState<Record<string, string>>({});
const mergeNames = useCallback(
  (names: Record<string, string>) => setPlanNames((prev) => ({ ...prev, ...names })),
  [],
);
const venueIds = [...new Set(subscriptions.map((s) => s.venue_id))];
```

Render the lookups just inside the `<CardContent>`:

```tsx
{
  venueIds.map((id) => <VenuePlanNames key={id} venueId={id} onLoaded={mergeNames} />);
}
```

and pass the resolved name to each row, replacing the `unknownPlan` placeholder from Task 6:

```tsx
                  planName={
                    planNames[subscription.plan_id] ?? t('detail.subscriptions.unknownPlan')
                  }
```

Add `useCallback`, `useEffect` and `useState` to the `react` import, and `useListPlans` to the existing `@iziwellpass/api/generated` import.

Note `useVenueContext` is **not** needed in this file — `VenuePlanNames` derives its venue ids from the subscriptions themselves. Only the assign dialog needs the venue list.

- [ ] **Step 4: Run the gates**

Run: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`
Expected: all green.

- [ ] **Step 5: Verify against staging**

Assign the 25000 XOF subscription to a member as **Réglé**. Expected: the row appears with the real plan name, the price in FCFA, an **Actif** badge and no unpaid badge. Assign the entry pack unpaid and confirm the **Impayé** badge plus the entries counter. Then check that member in at the door and confirm the paid subscription is accepted — this is the proof the two membership models line up. Also attempt an assignment for a venue the member is not entitled to and confirm the 403 surfaces as a toast rather than a silent failure.

- [ ] **Step 6: Commit**

```bash
npx prettier --write "apps/owner/app/(app)/members/[id]/assign-subscription-dialog.tsx" "apps/owner/app/(app)/members/[id]/subscriptions-card.tsx" apps/owner/messages/fr.json apps/owner/messages/en.json
git add "apps/owner/app/(app)/members/[id]" apps/owner/messages
git commit -m "feat(owner): assign a plan to a member

Payment is chosen at assign time rather than tracked afterwards: the API
stores only a paid/unpaid flag with no method or date, and subscriptions are
listable only per member, so a collection worklist is not buildable.

The venue picker offers every venue the caller can see, because Member carries
no venue_ids and entitlements have no read endpoint. The API rejects a
mismatch with a 403, which surfaces as a toast.

Plan names now resolve through a per-venue plan lookup, archived plans
included, since a member can hold a plan that was archived later."
```

---

### Task 8: Cancel a subscription, and file the backend asks

**Files:**

- Create: `apps/owner/app/(app)/members/[id]/cancel-subscription-dialog.tsx`
- Modify: `apps/owner/app/(app)/members/[id]/subscriptions-card.tsx`
- Modify: `apps/owner/messages/fr.json`, `apps/owner/messages/en.json`
- Modify: `docs/backend-issues.md`

**Interfaces:**

- Consumes: `useUpdateSubscription` — variables `{ mid: string; sid: string; data: UpdateSubscriptionRequest }`.
- Produces: `CancelSubscriptionDialog({ memberId, subscription, planName })`.

- [ ] **Step 1: Add the i18n keys**

Add inside `members.detail.subscriptions` in `messages/fr.json`:

```json
"cancel": "Annuler",
"cancelDialog": {
  "title": "Annuler cet abonnement ?",
  "description": "« {name} » sera marqué comme annulé. Cette action est définitive.",
  "confirm": "Annuler l'abonnement",
  "submitting": "Annulation…",
  "success": "Abonnement annulé",
  "error": "Impossible d'annuler l'abonnement"
}
```

and in `messages/en.json`:

```json
"cancel": "Cancel",
"cancelDialog": {
  "title": "Cancel this subscription?",
  "description": "\"{name}\" will be marked cancelled. This cannot be undone.",
  "confirm": "Cancel subscription",
  "submitting": "Cancelling…",
  "success": "Subscription cancelled",
  "error": "Could not cancel the subscription"
}
```

- [ ] **Step 2: Implement the confirm dialog**

Create `apps/owner/app/(app)/members/[id]/cancel-subscription-dialog.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { getListSubscriptionsQueryKey, useUpdateSubscription } from '@iziwellpass/api/generated';
import type { MemberSubscription } from '@iziwellpass/api/schemas';
import { Button } from '@iziwellpass/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@iziwellpass/ui/components/dialog';

import { apiErrorMessage } from '@/lib/api-error';

/**
 * PUT .../subscriptions/{sid} serves both "mark paid" and "cancel"; the owner
 * app uses it only for cancellation, since payment is decided at assign time.
 */
export function CancelSubscriptionDialog({
  memberId,
  subscription,
  planName,
}: {
  memberId: string;
  subscription: MemberSubscription;
  planName: string;
}) {
  const t = useTranslations('members');
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const updateSubscription = useUpdateSubscription();

  const onConfirm = () => {
    updateSubscription.mutate(
      { mid: memberId, sid: subscription.id, data: { cancel: true } },
      {
        onSuccess: () => {
          toast.success(t('detail.subscriptions.cancelDialog.success'));
          void queryClient.invalidateQueries({
            queryKey: getListSubscriptionsQueryKey(memberId),
          });
          setOpen(false);
        },
        onError: (err) =>
          toast.error(apiErrorMessage(err, t('detail.subscriptions.cancelDialog.error'))),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {t('detail.subscriptions.cancel')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('detail.subscriptions.cancelDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('detail.subscriptions.cancelDialog.description', { name: planName })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="destructive" onClick={onConfirm} disabled={updateSubscription.isPending}>
            {updateSubscription.isPending
              ? t('detail.subscriptions.cancelDialog.submitting')
              : t('detail.subscriptions.cancelDialog.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Mount it on active rows**

In `subscriptions-card.tsx`, import it and thread `memberId` plus `canManage` into `SubscriptionRow`. Extend that component's props:

```tsx
function SubscriptionRow({
  subscription,
  planName,
  memberId,
  canManage,
}: {
  subscription: MemberSubscription;
  planName: string;
  memberId: string;
  canManage: boolean;
}) {
```

and render the action below the price, only while the subscription is still live — cancelling an expired, exhausted or already-cancelled row is meaningless:

```tsx
<div className="text-right">
  <span className="font-medium">
    {formatMoney(subscription.price_amount_minor, subscription.price_currency, locale)}
  </span>
  {canManage && subscription.status === 'active' ? (
    <div className="mt-2">
      <CancelSubscriptionDialog
        memberId={memberId}
        subscription={subscription}
        planName={planName}
      />
    </div>
  ) : null}
</div>
```

Replace the bare `<span>` price element with this block, and pass the two new props at the call site.

- [ ] **Step 4: File the backend asks**

Append to `docs/backend-issues.md`, following that file's existing format:

```markdown
## Plans & subscriptions (2026-08-14, owner app)

1. **Venue- or tenant-level subscription listing.** `GET /gms/v1/members/{mid}/subscriptions`
   is the only read path, so "who hasn't paid?" and any revenue view would require
   walking every member. Requesting `GET /gms/v1/venues/{vid}/subscriptions`
   (filterable by `payment_status` and `status`).
2. **Payment method and date on `MemberSubscription`.** The model stores only a
   `paid`/`unpaid` flag plus a price snapshot. The market collects by cash, Wave and
   Orange Money, and owners need to know which and when. Until this exists the owner
   app records payment at assign time only and offers no collection worklist.
3. **Read side for member venue entitlements.** `Member` carries no `venue_ids` and
   `PUT /gms/v1/members/{mid}/venues` is write-only, so the assign dialog cannot
   filter plans to venues the member may actually enter, and `EditAccessDialog` cannot
   pre-fill. Mirrors the still-open staff-venues ask.
4. **Clarify the check-in "no valid, paid plan" 403.** `POST /checkins/qr` and
   `/checkins/manual` gained a 403 for "the member has no valid, paid plan covering
   this visit". If that evaluates `MemberSubscription` while the members list badges
   off `Member.membership_status`, a member can read **Actif** in the owner app and
   still be refused at the door. Please confirm what it evaluates, and whether the
   flat `membership_*` fields are deprecated in favour of subscriptions.
```

- [ ] **Step 5: Run the gates**

Run: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`
Expected: all green.

- [ ] **Step 6: Verify against staging**

Cancel the entry-pack subscription. Expected: the badge flips to **Annulé**, the cancel button disappears from that row, and the row stays visible as history. Confirm the member's other subscription is untouched.

- [ ] **Step 7: Commit**

```bash
npx prettier --write "apps/owner/app/(app)/members/[id]/cancel-subscription-dialog.tsx" "apps/owner/app/(app)/members/[id]/subscriptions-card.tsx" apps/owner/messages/fr.json apps/owner/messages/en.json docs/backend-issues.md
git add "apps/owner/app/(app)/members/[id]" apps/owner/messages docs/backend-issues.md
git commit -m "feat(owner): cancel a member's subscription

PUT on a subscription serves both mark-paid and cancel; the owner app uses it
only for cancel, since payment is decided at assign time. The action shows
only on active rows — cancelling an expired, exhausted or already-cancelled
subscription is meaningless — and cancelled rows stay visible as history.

Also files the four backend asks this work surfaced, the sharpest being what
the new check-in 'no valid, paid plan' 403 actually evaluates."
```

---

## Definition of Done

- [ ] `pnpm build && pnpm typecheck && pnpm lint && pnpm test` green; `pnpm test` reports 4 tasks (owner app now included).
- [ ] `messages/fr.json` and `messages/en.json` have exact key parity — verify with:
  ```bash
  cd apps/owner && node -e "
  const a=require('./messages/fr.json'), b=require('./messages/en.json');
  const keys=(o,p='')=>Object.entries(o).flatMap(([k,v])=>typeof v==='object'&&v?keys(v,p+k+'.'):[p+k]);
  const fr=keys(a).sort(), en=keys(b).sort();
  const missing=fr.filter(k=>!en.includes(k)), extra=en.filter(k=>!fr.includes(k));
  console.log(missing.length||extra.length ? {missing,extra} : 'parity OK');"
  ```
- [ ] A live staging pass covering: create both plan kinds, edit one, archive one, assign both to a member, cancel one, and **check a member in at the door with a paid subscription**.
- [ ] Assign as a `receptionist` to settle whether that role holds `member:write` server-side. If it does not, remove `'receptionist'` from the `canManage` computation in `members/[id]/page.tsx` rather than letting the front desk hit a 403.
- [ ] Four backend asks appended to `docs/backend-issues.md`.

## Known Deferrals

These are deliberate, not oversights:

- **No revenue or unpaid worklist** — blocked on backend ask 1.
- **No "mark paid later" action** — payment is set at assign time; blocked on ask 2 for anything richer.
- **Assign dialog cannot pre-filter venues** by member entitlement — blocked on ask 3.
- **`todayIsoDate` is duplicated** in `members/page.tsx` and `schedules/schedule-dialogs.tsx`. This plan uses `venueToday` from `@/lib/datetime` instead of adding a third copy, but does not consolidate the existing two.
- **Plan names on subscription rows cost one query per distinct venue.** Acceptable because a member's subscriptions rarely span more than one or two venues; revisit if `MemberSubscription` ever carries a denormalized plan name.
