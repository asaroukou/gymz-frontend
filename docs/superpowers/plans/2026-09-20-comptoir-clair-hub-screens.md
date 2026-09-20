# « Le comptoir clair » SP-B — Hub Screens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the owner app's hub screens (dashboard, front desk, auth, onboarding) exactly as drawn on the canvas, on top of the SP-A design system.

**Architecture:** Two new ui primitives (`Wash`, the `HubPage` family) carry the hub chrome. One owner module `components/checkin/` holds the check-in hook, the command bar with its mode menu and member type-ahead, the modes row and the hairline feed; both hubs compose it. Pure logic (member search, today's tiles, feed rows, error phrasing) lives in `apps/owner/lib/` where the owner's node-only vitest can test it. Auth and onboarding drop their cards for a centred column under the wash.

**Tech Stack:** Next 15 / React 19, Tailwind v4 (`@theme inline`), Radix (Popover, DropdownMenu, Tabs), react-query, next-intl, sonner, vitest (jsdom in `packages/ui`, node in `apps/owner`).

**Spec:** `docs/superpowers/specs/2026-09-20-comptoir-clair-hub-screens-design.md`

## Global Constraints

- The canvas `screens.pen` is the source of truth; frames `ssgpT`, `r8d6IC`, `jhjgK`, `NKvSc`, `oHqxA`, `T9KwQ`, `ZllMy`, `JCot2`, `QD9fi`, `tZ9zj` (PNGs in `docs/design-refs/comptoir-clair/`).
- The word `gradient` appears in exactly one file: `packages/ui/src/components/wash.tsx`. The guard enforces it.
- Font weights 400/500/600 only; sentence case; no uppercase; no `Card` on any hub screen; no bordered box around content; hairlines only between rows.
- One dark control per screen: the command bar's submit on the hubs, the submit button on auth and onboarding.
- Status tints are never used as text colour (`text-destructive`, `text-success`, `text-warning`, `text-info` are forbidden; use the `-foreground` stops).
- Touch targets ≥ 44px on the front desk; pill controls are 40 or 44px tall.
- `apps/owner/messages/fr.json` and `en.json` change together; a key present in one and not the other is a defect.
- Owner unit tests live in `apps/owner/lib/**/*.test.ts` (node environment, no React); ui tests are jsdom.
- Gates before every commit that touches more than one package: `pnpm check:design && pnpm typecheck && pnpm lint && pnpm test`. `pnpm build` in Task 8 only. Never run `next build` while a dev server of the same checkout is running.
- Prettier formats changed files (`pnpm exec prettier --write <files>`); it is not a repo gate.
- Decisions D1–D8 of the spec are binding: no « À régler », one shared check-in control, owner app only, `text-display-sm` = 36px, auth column 400px / onboarding 620px, honest placeholders, cancelled tiles take `bg-side`.
- Plan rulings: `DESIGN.json` has no typography section, so only `DESIGN.md` gains the « Auth title » row. `checkins/day-stats.tsx` stays (it already is a `StatPanel` with the count-up) and only gains the short label; the spec's deletion list is amended accordingly.

---

### Task 1: ui — `text-display-sm`, `Wash`, `HubPage` family, guard exclusion

**Files:**
- Modify: `packages/ui/src/styles/globals.css` (after the `--text-3xl--letter-spacing` line)
- Modify: `packages/ui/src/styles/tokens.test.ts` (append)
- Create: `packages/ui/src/components/wash.tsx`
- Create: `packages/ui/src/components/wash.test.tsx`
- Create: `packages/ui/src/components/hub-page.tsx`
- Create: `packages/ui/src/components/hub-page.test.tsx`
- Modify: `scripts/check-design-system.mjs`
- Modify: `DESIGN.md` (§3 Hierarchy, after the Display line)

**Interfaces:**
- Produces: `Wash({ className? })`; `HubPage({ wash?: boolean } & div props)`, `HubHero`, `HubEyebrow` (p), `HubTitle` (h1), `HubLead` (p), `HubSection` (div) — all from `@iziwellpass/ui/components/hub-page`; Tailwind class `text-display-sm`.

- [ ] **Step 1: Write the failing ui tests**

`packages/ui/src/components/wash.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Wash } from './wash';

describe('Wash', () => {
  it('is decorative, absolute and desktop-only', () => {
    const { container } = render(<Wash />);
    const el = container.querySelector('[data-slot="wash"]') as HTMLElement;
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.className).toContain('absolute');
    expect(el.className).toContain('hidden');
    expect(el.className).toContain('md:block');
    expect(el.className).toContain('pointer-events-none');
    expect(el.className).toContain('radial-gradient');
  });
});
```

`packages/ui/src/components/hub-page.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HubEyebrow, HubHero, HubLead, HubPage, HubSection, HubTitle } from './hub-page';

describe('HubPage', () => {
  it('renders no wash by default and one when asked', () => {
    const { container, rerender } = render(<HubPage>x</HubPage>);
    expect(container.querySelector('[data-slot="wash"]')).toBeNull();
    rerender(<HubPage wash>x</HubPage>);
    expect(container.querySelectorAll('[data-slot="wash"]')).toHaveLength(1);
  });
  it('is a centred 940px column', () => {
    const { container } = render(<HubPage>x</HubPage>);
    const el = container.querySelector('[data-slot="hub-page"]') as HTMLElement;
    expect(el.className).toContain('max-w-[940px]');
    expect(el.className).toContain('mx-auto');
    expect(el.className).toContain('relative');
  });
  it('hero pieces render the right elements', () => {
    render(
      <HubHero>
        <HubEyebrow>Samedi 20 septembre</HubEyebrow>
        <HubTitle>Bonjour, Moussa</HubTitle>
        <HubLead>Trois étapes pour démarrer.</HubLead>
      </HubHero>,
    );
    expect(screen.getByText('Bonjour, Moussa').tagName).toBe('H1');
    expect(screen.getByText('Bonjour, Moussa').className).toContain('md:text-3xl');
    expect(screen.getByText('Samedi 20 septembre').tagName).toBe('P');
    expect(screen.getByText('Trois étapes pour démarrer.').className).toContain('text-muted-foreground');
  });
  it('HubSection centres its children', () => {
    const { container } = render(<HubSection>x</HubSection>);
    expect((container.firstChild as HTMLElement).className).toContain('items-center');
  });
});
```

Append to `packages/ui/src/styles/tokens.test.ts` (the imports `readFileSync`, `dirname`, `join`, `fileURLToPath`, `describe`, `expect`, `it` already exist at the top of the file):

```ts
describe('comptoir clair text scale additions', () => {
  it('declares the 36px auth title step', () => {
    const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'globals.css'), 'utf8');
    expect(css).toMatch(/--text-display-sm:\s*2\.25rem;/);
    expect(css).toMatch(/--text-display-sm--line-height:\s*1\.15;/);
    expect(css).toMatch(/--text-display-sm--letter-spacing:\s*-0\.025em;/);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @iziwellpass/ui exec vitest run src/components/wash.test.tsx src/components/hub-page.test.tsx src/styles/tokens.test.ts`
Expected: FAIL — `./wash` and `./hub-page` cannot be resolved; the text-scale assertion fails.

- [ ] **Step 3: Add the token**

In `packages/ui/src/styles/globals.css`, directly after the line `--text-3xl--letter-spacing: -0.03em;` inside `@theme inline`, add:

```css
  /* Auth title: the question on an auth or onboarding screen (canvas 36px). */
  --text-display-sm: 2.25rem;
  --text-display-sm--line-height: 1.15;
  --text-display-sm--letter-spacing: -0.025em;
```

- [ ] **Step 4: Create `Wash`**

`packages/ui/src/components/wash.tsx`:

```tsx
import * as React from 'react';

import { cn } from '@iziwellpass/ui/lib/utils';

/**
 * The one sanctioned gradient (DESIGN.md §4, "the wash exception"): a soft
 * radial of lavis behind a hub heading, fading to transparent within ~640px.
 * Geometry is the canvas `Wash` node — 800×640, top −260, centred on the
 * column. Hidden below `md`: the mobile frames carry no wash. The word
 * "gradient" must not appear anywhere else in the web layer
 * (scripts/check-design-system.mjs excludes only this file).
 */
export function Wash({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      data-slot="wash"
      className={cn(
        'pointer-events-none absolute top-[-260px] left-1/2 hidden h-[640px] w-[800px] -translate-x-1/2 md:block',
        'bg-[radial-gradient(closest-side,var(--wash),transparent)]',
        className,
      )}
    />
  );
}
```

- [ ] **Step 5: Create the `HubPage` family**

`packages/ui/src/components/hub-page.tsx`:

```tsx
import * as React from 'react';

import { Wash } from '@iziwellpass/ui/components/wash';
import { cn } from '@iziwellpass/ui/lib/utils';

/**
 * The hub column: 940px centred inside the shell's `main` (which pads 24px,
 * so `md:pt-10` lands the drawn 64px top). Sections sit 48px apart on desktop
 * and 24px on a phone. `wash` draws the lavis behind the heading.
 */
function HubPage({
  wash = false,
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & { wash?: boolean }) {
  return (
    <div
      data-slot="hub-page"
      className={cn('relative mx-auto w-full max-w-[940px] md:pt-10', className)}
      {...props}
    >
      {wash ? <Wash /> : null}
      <div className="relative flex flex-col gap-6 md:gap-12">{children}</div>
    </div>
  );
}

/** Eyebrow, title, lead and the command bar, centred. Canvas gap 20 / 12. */
function HubHero({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="hub-hero"
      className={cn('flex flex-col items-center gap-3 text-center md:gap-5', className)}
      {...props}
    />
  );
}

function HubEyebrow({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="hub-eyebrow"
      className={cn('text-sm text-muted-foreground md:text-md', className)}
      {...props}
    />
  );
}

/** The Display step: 44px on desktop, 32px on a phone. One per screen. */
function HubTitle({ className, ...props }: React.ComponentProps<'h1'>) {
  return (
    <h1
      data-slot="hub-title"
      className={cn('text-2xl font-normal md:text-3xl', className)}
      {...props}
    />
  );
}

function HubLead({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="hub-lead"
      className={cn('max-w-[36rem] text-lg text-muted-foreground', className)}
      {...props}
    />
  );
}

/** A centred block: the stat strip, the tab row, the feed. */
function HubSection({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="hub-section"
      className={cn('flex w-full flex-col items-center gap-4', className)}
      {...props}
    />
  );
}

export { HubPage, HubHero, HubEyebrow, HubTitle, HubLead, HubSection };
```

- [ ] **Step 6: Run the ui tests to verify they pass**

Run: `pnpm --filter @iziwellpass/ui exec vitest run src/components/wash.test.tsx src/components/hub-page.test.tsx src/styles/tokens.test.ts`
Expected: PASS (all).

- [ ] **Step 7: Extend the guard**

In `scripts/check-design-system.mjs`, after the `regexPatterns` declaration add:

```js
// Fixed strings forbidden everywhere except one named file. The lavis wash is
// the single sanctioned gradient (DESIGN.md §4); it lives in wash.tsx only.
const excludedPatterns = [{ pattern: 'gradient', exclude: 'wash.tsx' }];
```

and, after the `regexPatterns` sweep loop (before `if (failed) process.exit(1);`), add:

```js
for (const { pattern, exclude } of excludedPatterns) {
  let out = '';
  try {
    out = execSync(
      `grep -rn --include='*.ts' --include='*.tsx' --include='*.css' --exclude=${JSON.stringify(exclude)} -F -e ${JSON.stringify(pattern)} ${roots.join(' ')}`,
      { encoding: 'utf8' },
    );
  } catch (err) {
    // Same exit-code handling as the fixed-string sweep: only 1 (no match) is good.
    if (err.status !== 1) {
      console.error(`grep failed for pattern "${pattern}" (status ${err.status ?? '?'}):`);
      console.error(err.stderr?.toString() || err.message);
      process.exit(2);
    }
  }
  if (out.trim()) {
    failed = true;
    console.error(`forbidden pattern "${pattern}" (allowed only in ${exclude}):\n${out}`);
  }
}
```

Run: `pnpm check:design`
Expected: `design-system guard: clean`. Then prove the exclusion works: `echo "const x = 'gradient';" > apps/owner/lib/zz-probe.ts && pnpm check:design; rm apps/owner/lib/zz-probe.ts` — the guard must fail with `forbidden pattern "gradient"` on the probe (exit 1), and be clean again after the probe is removed.

- [ ] **Step 8: DESIGN.md row**

In `DESIGN.md`, directly after the line starting `- **Display** (400, 2.75rem, 1.1, −0.03em)`, add:

```markdown
- **Auth title** (400, 2.25rem, 1.15, −0.025em): the question on an auth or onboarding screen.
```

- [ ] **Step 9: Gates and commit**

Run: `pnpm exec prettier --write packages/ui/src/components/wash.tsx packages/ui/src/components/hub-page.tsx packages/ui/src/components/wash.test.tsx packages/ui/src/components/hub-page.test.tsx scripts/check-design-system.mjs && pnpm check:design && pnpm --filter @iziwellpass/ui typecheck && pnpm --filter @iziwellpass/ui lint && pnpm --filter @iziwellpass/ui test`
Expected: all green.

```bash
git add packages/ui/src/styles/globals.css packages/ui/src/styles/tokens.test.ts packages/ui/src/components/wash.tsx packages/ui/src/components/wash.test.tsx packages/ui/src/components/hub-page.tsx packages/ui/src/components/hub-page.test.tsx scripts/check-design-system.mjs DESIGN.md
git commit -m "feat(ui): hub page column, lavis wash and the 36px auth title step"
```

---

### Task 2: owner lib helpers, `useIsDesktop`, and the message files

**Files:**
- Create: `apps/owner/lib/member-search.ts`, `apps/owner/lib/member-search.test.ts`
- Create: `apps/owner/lib/today-tiles.ts`, `apps/owner/lib/today-tiles.test.ts`
- Create: `apps/owner/lib/checkin-feed.ts`, `apps/owner/lib/checkin-feed.test.ts`
- Create: `apps/owner/lib/checkin-errors.ts`, `apps/owner/lib/checkin-errors.test.ts`
- Create: `apps/owner/lib/use-is-desktop.ts`
- Modify: `apps/owner/messages/fr.json`, `apps/owner/messages/en.json`

**Interfaces:**
- Consumes: `venueDateKey(iso, timeZone)` from `apps/owner/lib/datetime.ts`; `ApiError` from `@iziwellpass/api/client`; `DecodedQrToken` from `apps/owner/lib/qr-token.ts`.
- Produces:
  - `searchMembers(members: readonly Member[], query: string, limit = 8): Member[]`, `memberLabel(member: Member, statusLabel: string): string`, `memberName(member: Member): string`, `memberInitials(member: Member | undefined): string`
  - `pickTodayTiles(slots: readonly ScheduleSlot[] | undefined, timeZone: string | undefined, max = 4, now = new Date()): { tiles: ScheduleSlot[]; total: number }`, `isSlotFull(slot): boolean`, `tileTone(slot, index): 'side' | 'sable' | number`
  - `feedRows(checkIns: readonly CheckIn[] | undefined, limit?: number): CheckIn[]`, `recordedByLabel(checkIn, staffByUserId, labels): string`
  - `qrErrorMessage(t, err, decoded, venueId): string`, `walkinErrorFallback(t, err): string`, type `Translate`
  - `useIsDesktop(): boolean`
  - Message keys listed in Step 7 (both locales).

- [ ] **Step 1: Write the failing tests**

`apps/owner/lib/member-search.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import type { Member } from '@iziwellpass/api/schemas';

import { memberInitials, memberLabel, memberName, searchMembers } from './member-search';

function member(first: string, last: string, id = `${first}-${last}`): Member {
  return {
    id,
    first_name: first,
    last_name: last,
    tenant_id: 't',
    access_scope: 'venue',
    created_at: '',
    updated_at: '',
    is_active: true,
    membership_start: '2026-01-01',
    membership_status: 'active',
    membership_type: 'monthly',
  } as unknown as Member;
}

const MEMBERS = [
  member('Aïssatou', 'Ba'),
  member('Awa', 'Ndiaye'),
  member('Moussa', 'Ndour'),
  member('Fatou', 'Ndao'),
];

describe('searchMembers', () => {
  it('returns nothing for an empty query', () => {
    expect(searchMembers(MEMBERS, '')).toEqual([]);
    expect(searchMembers(MEMBERS, '   ')).toEqual([]);
  });
  it('matches the start of any name word, ignoring case and diacritics', () => {
    expect(searchMembers(MEMBERS, 'ai').map((m) => m.first_name)).toEqual(['Aïssatou']);
    expect(searchMembers(MEMBERS, 'ND').map((m) => m.last_name)).toEqual(['Ndiaye', 'Ndour', 'Ndao']);
  });
  it('matches a full-name prefix across the space', () => {
    expect(searchMembers(MEMBERS, 'awa n').map((m) => m.last_name)).toEqual(['Ndiaye']);
  });
  it('respects the limit and keeps input order', () => {
    expect(searchMembers(MEMBERS, 'nd', 2).map((m) => m.last_name)).toEqual(['Ndiaye', 'Ndour']);
  });
});

describe('labels', () => {
  it('memberName trims, memberLabel appends the status', () => {
    expect(memberName(member('Awa', 'Ndiaye'))).toBe('Awa Ndiaye');
    expect(memberLabel(member('Awa', 'Ndiaye'), 'Actif')).toBe('Awa Ndiaye · Actif');
  });
  it('memberInitials upper-cases two letters and falls back to ?', () => {
    expect(memberInitials(member('awa', 'ndiaye'))).toBe('AN');
    expect(memberInitials(undefined)).toBe('?');
    expect(memberInitials(member('', ''))).toBe('?');
  });
});
```

`apps/owner/lib/today-tiles.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import type { ScheduleSlot } from '@iziwellpass/api/schemas';

import { isSlotFull, pickTodayTiles, tileTone } from './today-tiles';

function slot(start: string, extra: Partial<ScheduleSlot> = {}): ScheduleSlot {
  return {
    id: start,
    start_time: start,
    end_time: start,
    date: start.slice(0, 10),
    status: 'available',
    booked_count: 3,
    capacity: 10,
    resource_id: 'r',
    schedule_id: 's',
    tenant_id: 't',
    venue_id: 'v',
    created_at: '',
    ...extra,
  } as ScheduleSlot;
}

const NOW = new Date('2026-09-20T10:00:00Z');
const TZ = 'Africa/Dakar';

describe('pickTodayTiles', () => {
  it('keeps only today (venue-local), sorted, capped at four, with the total', () => {
    const slots = [
      slot('2026-09-20T18:00:00Z'),
      slot('2026-09-21T06:30:00Z'),
      slot('2026-09-20T06:30:00Z'),
      slot('2026-09-20T12:15:00Z'),
      slot('2026-09-20T08:00:00Z'),
      slot('2026-09-20T16:00:00Z'),
    ];
    const { tiles, total } = pickTodayTiles(slots, TZ, 4, NOW);
    expect(total).toBe(5);
    expect(tiles.map((s) => s.start_time)).toEqual([
      '2026-09-20T06:30:00Z',
      '2026-09-20T08:00:00Z',
      '2026-09-20T12:15:00Z',
      '2026-09-20T16:00:00Z',
    ]);
  });
  it('handles undefined and empty input', () => {
    expect(pickTodayTiles(undefined, TZ, 4, NOW)).toEqual({ tiles: [], total: 0 });
  });
});

describe('tileTone', () => {
  it('cancelled → side, full → sable, else the rotation index', () => {
    expect(tileTone(slot('x', { status: 'cancelled' }), 0)).toBe('side');
    expect(tileTone(slot('x', { status: 'full' }), 0)).toBe('sable');
    expect(tileTone(slot('x', { booked_count: 10, capacity: 10 }), 1)).toBe('sable');
    expect(tileTone(slot('x'), 3)).toBe(3);
  });
  it('isSlotFull reads status or the counts', () => {
    expect(isSlotFull(slot('x', { status: 'full' }))).toBe(true);
    expect(isSlotFull(slot('x', { booked_count: 12, capacity: 12 }))).toBe(true);
    expect(isSlotFull(slot('x'))).toBe(false);
  });
});
```

`apps/owner/lib/checkin-feed.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import type { CheckIn, Staff } from '@iziwellpass/api/schemas';

import { feedRows, recordedByLabel } from './checkin-feed';

function checkIn(at: string, extra: Partial<CheckIn> = {}): CheckIn {
  return {
    id: at,
    checked_in_at: at,
    method: 'qr',
    tenant_id: 't',
    venue_id: 'v',
    ...extra,
  } as CheckIn;
}

const LABELS = {
  self: 'Auto (QR)',
  unknownStaff: "l'équipe",
  by: (name: string) => `par ${name}`,
};

describe('feedRows', () => {
  it('sorts newest first and applies the limit', () => {
    const rows = feedRows(
      [checkIn('2026-09-20T06:24:00Z'), checkIn('2026-09-20T06:32:00Z'), checkIn('2026-09-20T06:29:00Z')],
      2,
    );
    expect(rows.map((r) => r.checked_in_at)).toEqual(['2026-09-20T06:32:00Z', '2026-09-20T06:29:00Z']);
  });
  it('returns everything without a limit and [] for undefined', () => {
    expect(feedRows(undefined)).toEqual([]);
    expect(feedRows([checkIn('a'), checkIn('b')])).toHaveLength(2);
  });
});

describe('recordedByLabel', () => {
  const staff = new Map<string, Staff>([
    ['u1', { user_id: 'u1', first_name: 'Aïssatou', last_name: 'Ba' } as Staff],
  ]);
  it('self for QR without a recorder', () => {
    expect(recordedByLabel(checkIn('a'), staff, LABELS)).toBe('Auto (QR)');
  });
  it('by <staff name> when resolvable', () => {
    expect(recordedByLabel(checkIn('a', { method: 'manual', checked_in_by: 'u1' }), staff, LABELS)).toBe(
      'par Aïssatou Ba',
    );
  });
  it('by <unknown staff> otherwise, never the raw id', () => {
    expect(recordedByLabel(checkIn('a', { method: 'manual', checked_in_by: 'u9' }), staff, LABELS)).toBe(
      "par l'équipe",
    );
  });
});
```

`apps/owner/lib/checkin-errors.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { ApiError } from '@iziwellpass/api/client';

import { qrErrorMessage, walkinErrorFallback, type Translate } from './checkin-errors';
import type { DecodedQrToken } from './qr-token';

// The fake t echoes the key so assertions read the copy path, not the copy.
const t = ((key: string) => key) as unknown as Translate;
const api = (status: number) => new ApiError(status, { code: 'x', message: 'server said' });
const decoded = (extra: Partial<DecodedQrToken>): DecodedQrToken =>
  ({ kind: 'booking', venueId: 'v1', expiresAt: null, ...extra }) as DecodedQrToken;

describe('qrErrorMessage', () => {
  it('phrases an expired token only when the server rejected it', () => {
    const past = Math.floor(Date.now() / 1000) - 60;
    expect(qrErrorMessage(t, api(401), decoded({ expiresAt: past }), 'v1')).toContain('qr.errorExpired');
    expect(qrErrorMessage(t, api(403), decoded({ expiresAt: past }), 'v1')).toContain('error');
    expect(qrErrorMessage(t, api(403), decoded({ expiresAt: past }), 'v1')).not.toContain('qr.errorExpired');
  });
  it('phrases a wrong venue for booking/walkin tokens, never for pass tokens', () => {
    expect(qrErrorMessage(t, api(400), decoded({ venueId: 'other' }), 'v1')).toContain('qr.errorWrongVenue');
    expect(
      qrErrorMessage(t, api(400), decoded({ kind: 'pass_booking', venueId: 'other' }), 'v1'),
    ).not.toContain('qr.errorWrongVenue');
  });
  it('falls back to the generic message for transport errors and undecodable tokens', () => {
    expect(qrErrorMessage(t, new TypeError('offline'), null, 'v1')).toBe('error');
    expect(qrErrorMessage(t, api(409), null, 'v1')).toContain('error');
  });
});

describe('walkinErrorFallback', () => {
  it('names the duplicate on 409 and is generic otherwise', () => {
    expect(walkinErrorFallback(t, api(409))).toBe('walkin.errorDuplicate');
    expect(walkinErrorFallback(t, api(500))).toBe('error');
    expect(walkinErrorFallback(t, new Error('x'))).toBe('error');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @iziwellpass/owner test`
Expected: FAIL — the four new modules cannot be resolved.

- [ ] **Step 3: Implement the helpers**

`apps/owner/lib/member-search.ts`:

```ts
import type { Member } from '@iziwellpass/api/schemas';

/** Lower-case, diacritics stripped: « Aïssatou » → « aissatou ». */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function memberName(member: Member): string {
  return `${member.first_name} ${member.last_name}`.trim();
}

/** « Awa Ndiaye · Actif » — what the command bar shows once a member is picked. */
export function memberLabel(member: Member, statusLabel: string): string {
  return `${memberName(member)} · ${statusLabel}`;
}

/** Never a raw id: two upper-cased initials, or « ? ». */
export function memberInitials(member: Member | undefined): string {
  if (!member) return '?';
  const initials = `${member.first_name.charAt(0)}${member.last_name.charAt(0)}`.toUpperCase();
  return initials || '?';
}

/**
 * Type-ahead match for the walk-in command: the query must start a word of
 * the full name, or the full name itself (« awa n » → Awa Ndiaye). Case and
 * diacritics are ignored. Input order is preserved; `limit` caps the list.
 */
export function searchMembers(members: readonly Member[], query: string, limit = 8): Member[] {
  const q = fold(query.trim());
  if (!q) return [];
  const out: Member[] = [];
  for (const member of members) {
    const full = fold(memberName(member));
    if (full.startsWith(q) || full.split(/\s+/).some((word) => word.startsWith(q))) {
      out.push(member);
      if (out.length >= limit) break;
    }
  }
  return out;
}
```

`apps/owner/lib/today-tiles.ts`:

```ts
import type { ScheduleSlot } from '@iziwellpass/api/schemas';

import { venueDateKey } from './datetime';

/**
 * The dashboard's session tiles: today's slots (venue-local day), earliest
 * first, capped at `max`. `total` is the whole day's count for the
 * « Voir les N séances du jour » link.
 */
export function pickTodayTiles(
  slots: readonly ScheduleSlot[] | undefined,
  timeZone: string | undefined,
  max = 4,
  now: Date = new Date(),
): { tiles: ScheduleSlot[]; total: number } {
  const todayKey = venueDateKey(now.toISOString(), timeZone);
  const today = (slots ?? [])
    .filter((slot) => venueDateKey(slot.start_time, timeZone) === todayKey)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  return { tiles: today.slice(0, max), total: today.length };
}

export function isSlotFull(slot: ScheduleSlot): boolean {
  return slot.status === 'full' || slot.booked_count >= slot.capacity;
}

/**
 * The Tile Rule with its two exceptions: tints rotate by position (the
 * number is the rotation index the Tile primitive accepts), a full session
 * takes sable, a cancelled one takes the côté tone (`bg-side`).
 */
export function tileTone(slot: ScheduleSlot, index: number): 'side' | 'sable' | number {
  if (slot.status === 'cancelled') return 'side';
  if (isSlotFull(slot)) return 'sable';
  return index;
}
```

`apps/owner/lib/checkin-feed.ts`:

```ts
import type { CheckIn, Staff } from '@iziwellpass/api/schemas';

/** Newest first; `limit` slices (the dashboard tab shows eight). */
export function feedRows(checkIns: readonly CheckIn[] | undefined, limit?: number): CheckIn[] {
  const rows = [...(checkIns ?? [])].sort((a, b) => b.checked_in_at.localeCompare(a.checked_in_at));
  return limit === undefined ? rows : rows.slice(0, limit);
}

export interface RecordedByLabels {
  /** « Auto (QR) » — a QR self check-in has no recorder. */
  self: string;
  /** « l'équipe » — a recorder we cannot resolve; never the raw user id. */
  unknownStaff: string;
  /** « par {name} ». */
  by: (name: string) => string;
}

export function recordedByLabel(
  checkIn: CheckIn,
  staffByUserId: ReadonlyMap<string, Staff>,
  labels: RecordedByLabels,
): string {
  if (!checkIn.checked_in_by) return labels.self;
  const staff = staffByUserId.get(checkIn.checked_in_by);
  return labels.by(staff ? `${staff.first_name} ${staff.last_name}`.trim() : labels.unknownStaff);
}
```

`apps/owner/lib/checkin-errors.ts` (the two functions move here from `checkins/register-panel.tsx`, comments included):

```ts
import type { useTranslations } from 'next-intl';

import { ApiError } from '@iziwellpass/api/client';

import { apiErrorMessage } from './api-error';
import type { DecodedQrToken } from './qr-token';

export type Translate = ReturnType<typeof useTranslations<'frontdesk'>>;

/**
 * Explains a rejection the SERVER already made; never pre-empts the call.
 * A counter tablet with a skewed clock must not be able to refuse a valid
 * scan, so expiry is only ever used to phrase an error, not to skip a request.
 *
 * Only enriches when the server actually rejected the TOKEN (400/401) — a
 * plan-gate 403, a duplicate 409, a 404, or a transport failure (offline
 * TypeError, not even an ApiError) has nothing to do with the token's expiry
 * or venue, and must fall straight through to the generic message instead of
 * being mislabelled "expired" just because the local clock is skewed.
 *
 * The venue-mismatch branch is skipped for `pass_booking` tokens: those carry
 * no venue_id of ours (the server resolves the venue from the token), so
 * `decoded.venueId` there is never "this counter's venue".
 */
export function qrErrorMessage(
  t: Translate,
  err: unknown,
  decoded: DecodedQrToken | null,
  venueId: string,
): string {
  const isTokenRejection = err instanceof ApiError && (err.status === 400 || err.status === 401);
  if (isTokenRejection && decoded) {
    if (decoded.expiresAt !== null && decoded.expiresAt * 1000 < Date.now()) {
      return apiErrorMessage(err, t('qr.errorExpired'));
    }
    if (
      decoded.kind !== 'pass_booking' &&
      decoded.venueId !== null &&
      decoded.venueId !== venueId
    ) {
      return apiErrorMessage(err, t('qr.errorWrongVenue'));
    }
  }
  return apiErrorMessage(err, t('error'));
}

/**
 * 409 on a walk-in means the member already walked in at this venue inside
 * the venue's dedupe window (walkin_dedupe_minutes, default 24h). It is the
 * error staff will hit most, so it gets its own copy.
 */
export function walkinErrorFallback(t: Translate, err: unknown): string {
  return err instanceof ApiError && err.status === 409 ? t('walkin.errorDuplicate') : t('error');
}
```

If `ReturnType<typeof useTranslations<'frontdesk'>>` does not type-check under the repo's TypeScript version, use `ReturnType<typeof useTranslations>` instead (that is what the register panel used) and keep the tests' cast.

`apps/owner/lib/use-is-desktop.ts`:

```ts
'use client';

import { useEffect, useState } from 'react';

const QUERY = '(min-width: 768px)';

/**
 * True at Tailwind's `md` and above. Starts true on both server and first
 * client render (no hydration mismatch), then follows the media query. Use it
 * only for things CSS cannot switch — a placeholder attribute, a stat label.
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const update = () => setIsDesktop(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);
  return isDesktop;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @iziwellpass/owner test`
Expected: PASS (the four new files plus the existing four).

- [ ] **Step 5: Replace the `dashboard` and `frontdesk` namespaces and patch the auth keys — French**

Write this script to `/tmp/sp-b-messages.mjs` and run it once with `node /tmp/sp-b-messages.mjs` from the repo root. It rewrites both files with two-space indentation (the files' current style) and keeps every other namespace untouched.

```js
import { readFileSync, writeFileSync } from 'node:fs';

const FR = {
  dashboard: {
    greeting: 'Bonjour, {name}',
    greetingNoName: 'Bonjour',
    eyebrow: '{date} · {venue}',
    venuePlaceholder: 'Choisir un établissement',
    venueNone: 'Aucun établissement pour le moment.',
    venuePrompt: 'Sélectionnez un établissement pour voir son tableau de bord.',
    kpi: {
      checkins: "Passages aujourd'hui",
      uniqueMembers: 'Membres uniques',
      occupancy: 'Occupation',
      activeMembers: 'Membres actifs',
    },
    tabs: {
      label: 'Sections du tableau de bord',
      schedule: 'Planning du jour',
      checkins: 'Derniers passages',
    },
    schedule: {
      full: 'Complet',
      cancelled: 'Annulé',
      seeAll: '{count, plural, one {Voir la séance du jour} other {Voir les # séances du jour}}',
      emptyTitle: "Aucun créneau aujourd'hui",
      emptyBody: 'Créez un planning pour générer les créneaux de la journée.',
      emptyCta: 'Créer un planning',
    },
    starter: {
      title: 'Bienvenue, {name}',
      titleNoName: 'Bienvenue',
      body: "Trois étapes pour démarrer. Chacune prend moins d'une minute.",
      step1Title: 'Créer un planning',
      step1Body: 'Définissez vos cours et vos créneaux.',
      step1Cta: 'Créer un cours',
      step2Title: 'Ajouter un membre',
      step2Body: 'Enregistrez vos premiers adhérents.',
      step2Cta: 'Ajouter',
      step3Title: 'Premier passage',
      step3Body: "Enregistrez une entrée à l'accueil.",
      step3Cta: "Ouvrir l'accueil",
      placeholder: 'Le planning du jour et les derniers passages apparaîtront ici.',
    },
    errors: {
      venues: 'Impossible de charger les établissements',
      slots: 'Impossible de charger les créneaux',
      checkins: 'Impossible de charger les passages',
      loadTitle: 'Une erreur est survenue',
    },
  },
  frontdesk: {
    title: 'Accueil',
    eyebrow: 'Accueil · {date}',
    question: 'Qui entre ?',
    questionWalkin: 'Qui entre sans réservation ?',
    venuePlaceholder: 'Choisir un établissement',
    venueNone: 'Aucun établissement pour le moment.',
    venuePrompt: 'Sélectionnez un établissement pour enregistrer les passages.',
    venuesError: 'Impossible de charger les établissements',
    errorTitle: 'Une erreur est survenue',
    stats: {
      checkins: 'Passages',
      uniqueMembers: 'Membres uniques',
      uniqueMembersShort: 'Uniques',
      occupancy: 'Occupation',
    },
    command: {
      placeholderQr: 'Scanner un QR ou saisir un code',
      placeholderQrShort: 'Scanner ou saisir',
      placeholderWalkin: 'Rechercher un membre',
      submit: 'Valider',
      modeQr: 'Accueil',
      modeWalkin: 'Sans réservation',
      modeMenuLabel: "Mode d'enregistrement",
      results: 'Membres correspondants',
    },
    modes: {
      qr: 'QR / code',
      walkin: 'Sans réservation',
    },
    qr: {
      hint: 'Présentez le QR au lecteur ou saisissez le jeton. Réservations, entrées libres et pass marketplace sont acceptés.',
      scanButton: 'Scanner avec la caméra',
      cameraError: 'Accès à la caméra refusé — utilisez le champ de texte.',
      dialogDescription: 'Pointez la caméra vers le QR code du membre.',
      errorExpired: "Ce code a expiré. Demandez au membre d'en générer un nouveau.",
      errorWrongVenue: 'Ce code a été généré pour un autre établissement.',
      errorPassNotSettleable:
        "Cette réservation pass ne peut pas être validée ici — elle concerne peut-être un autre jour, a déjà été utilisée ou a été annulée. Demandez au visiteur de vérifier sa réservation.",
    },
    walkin: {
      hint: "Choisissez un membre présent, puis validez l'entrée.",
      noMembers: 'Aucun membre',
      selectPrompt: 'Choisissez un membre dans la liste',
      errorDuplicate: 'Ce membre a déjà été enregistré ici récemment.',
      membersError: 'Impossible de charger les membres',
    },
    feed: {
      title: 'Derniers passages',
      live: 'En direct',
      methodQr: 'QR',
      methodManual: 'Manuel',
      self: 'Auto (QR)',
      unknownMember: 'Membre',
      unknownStaff: "l'équipe",
      byLabel: 'par {name}',
      empty: 'Aucun passage pour le moment.',
      loadError: 'Impossible de charger les passages',
    },
    success: 'Passage enregistré — {name}',
    successNoName: 'Passage enregistré',
    error: "Impossible d'enregistrer le passage",
  },
};

const EN = {
  dashboard: {
    greeting: 'Hello, {name}',
    greetingNoName: 'Hello',
    eyebrow: '{date} · {venue}',
    venuePlaceholder: 'Choose a venue',
    venueNone: 'No venues yet.',
    venuePrompt: 'Select a venue to view its dashboard.',
    kpi: {
      checkins: 'Check-ins today',
      uniqueMembers: 'Unique members',
      occupancy: 'Occupancy',
      activeMembers: 'Active members',
    },
    tabs: {
      label: 'Dashboard sections',
      schedule: "Today's schedule",
      checkins: 'Recent check-ins',
    },
    schedule: {
      full: 'Full',
      cancelled: 'Cancelled',
      seeAll: "{count, plural, one {See today's session} other {See today's # sessions}}",
      emptyTitle: 'No slots today',
      emptyBody: "Create a schedule to generate the day's slots.",
      emptyCta: 'Create a schedule',
    },
    starter: {
      title: 'Welcome, {name}',
      titleNoName: 'Welcome',
      body: 'Three steps to get started. Each takes under a minute.',
      step1Title: 'Create a schedule',
      step1Body: 'Define your classes and time slots.',
      step1Cta: 'Create a class',
      step2Title: 'Add a member',
      step2Body: 'Enroll your first members.',
      step2Cta: 'Add',
      step3Title: 'First check-in',
      step3Body: 'Record an entry at the front desk.',
      step3Cta: 'Open the front desk',
      placeholder: "Today's schedule and recent check-ins will appear here.",
    },
    errors: {
      venues: 'Could not load venues',
      slots: 'Could not load slots',
      checkins: 'Could not load check-ins',
      loadTitle: 'Something went wrong',
    },
  },
  frontdesk: {
    title: 'Front desk',
    eyebrow: 'Front desk · {date}',
    question: "Who's coming in?",
    questionWalkin: "Who's coming in without a booking?",
    venuePlaceholder: 'Choose a venue',
    venueNone: 'No venues yet.',
    venuePrompt: 'Select a venue to record check-ins.',
    venuesError: 'Could not load venues',
    errorTitle: 'Something went wrong',
    stats: {
      checkins: 'Check-ins',
      uniqueMembers: 'Unique members',
      uniqueMembersShort: 'Unique',
      occupancy: 'Occupancy',
    },
    command: {
      placeholderQr: 'Scan a QR or enter a code',
      placeholderQrShort: 'Scan or enter',
      placeholderWalkin: 'Search a member',
      submit: 'Validate',
      modeQr: 'Front desk',
      modeWalkin: 'No booking',
      modeMenuLabel: 'Check-in mode',
      results: 'Matching members',
    },
    modes: {
      qr: 'QR / code',
      walkin: 'No booking',
    },
    qr: {
      hint: 'Show the QR to the reader or type the token. Bookings, walk-ins and marketplace passes are accepted.',
      scanButton: 'Scan with camera',
      cameraError: 'Camera access denied — use the text field instead.',
      dialogDescription: "Point the camera at the member's QR code.",
      errorExpired: 'This code has expired. Ask the member to generate a new one.',
      errorWrongVenue: 'This code was issued for a different venue.',
      errorPassNotSettleable:
        "This pass booking can't be settled here — it may be for another day, already used, or cancelled. Ask the visitor to check their booking.",
    },
    walkin: {
      hint: 'Pick a member who is here, then confirm the entry.',
      noMembers: 'No members',
      selectPrompt: 'Pick a member from the list',
      errorDuplicate: 'This member was already checked in here recently.',
      membersError: 'Could not load members',
    },
    feed: {
      title: 'Recent check-ins',
      live: 'Live',
      methodQr: 'QR',
      methodManual: 'Manual',
      self: 'Self (QR)',
      unknownMember: 'Member',
      unknownStaff: 'staff',
      byLabel: 'by {name}',
      empty: 'No check-ins yet.',
      loadError: 'Could not load check-ins',
    },
    success: 'Check-in recorded — {name}',
    successNoName: 'Check-in recorded',
    error: 'Could not record the check-in',
  },
};

function patch(file, replacements, authPatch) {
  const json = JSON.parse(readFileSync(file, 'utf8'));
  for (const [ns, value] of Object.entries(replacements)) json[ns] = value;
  json.auth.login.title = authPatch.loginTitle;
  json.auth.signup.subtitle = authPatch.signupSubtitle;
  json.auth.signup.sentBody = authPatch.sentBody;
  writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
}

patch('apps/owner/messages/fr.json', FR, {
  loginTitle: 'Bon retour',
  signupSubtitle: 'Vous recevrez un mot de passe provisoire par e-mail.',
  sentBody:
    "Si un compte peut être créé pour {email}, un e-mail avec un mot de passe provisoire vient d'être envoyé.",
});
patch('apps/owner/messages/en.json', EN, {
  loginTitle: 'Welcome back',
  signupSubtitle: "You'll receive a temporary password by email.",
  sentBody: 'If an account can be created for {email}, an email with a temporary password has just been sent.',
});
console.log('messages patched');
```

Run: `node /tmp/sp-b-messages.mjs && git diff --stat apps/owner/messages`
Expected: both files change; `git diff apps/owner/messages/fr.json` shows only the `dashboard`, `frontdesk` and the three auth strings changed (other namespaces untouched). If the diff shows unrelated whitespace churn, the indentation assumption was wrong: restore with `git checkout apps/owner/messages` and redo the same edits by hand.

- [ ] **Step 6: Verify key parity between locales**

Run:

```bash
node -e '
const fr=require("./apps/owner/messages/fr.json"), en=require("./apps/owner/messages/en.json");
const keys=(o,p="")=>Object.entries(o).flatMap(([k,v])=>typeof v==="object"?keys(v,p+k+"."):[p+k]);
const a=new Set(keys(fr)), b=new Set(keys(en));
const only=(x,y)=>[...x].filter(k=>!y.has(k));
console.log("fr-only",only(a,b),"en-only",only(b,a));'
```

Expected: `fr-only [] en-only []`.

- [ ] **Step 7: Note which old keys are gone**

Removed on purpose (their consumers are rewritten in Tasks 3–6, which must not reference them): `dashboard.schedule.title`, `dashboard.schedule.capacityLabel`, `dashboard.checkins.*`, `dashboard.starter.*` unchanged names keep their values; `frontdesk.subtitle`, `frontdesk.register.*`, `frontdesk.qr.label`, `frontdesk.qr.placeholder`, `frontdesk.qr.submit`, `frontdesk.qr.submitting`, `frontdesk.walkin.member`, `frontdesk.walkin.memberPlaceholder`, `frontdesk.walkin.memberSearch`, `frontdesk.walkin.submit`, `frontdesk.walkin.submitting`, `frontdesk.validation.*`, `frontdesk.feed.emptyTitle`, `frontdesk.feed.emptyBody`. The owner typecheck will fail from this commit until Task 6 lands if a consumer still uses one of them — that is expected inside the branch; the per-task gate for Task 2 is `pnpm --filter @iziwellpass/owner test` plus `pnpm check:design`, not the owner typecheck.

- [ ] **Step 8: Commit**

Run: `pnpm exec prettier --write apps/owner/lib/member-search.ts apps/owner/lib/member-search.test.ts apps/owner/lib/today-tiles.ts apps/owner/lib/today-tiles.test.ts apps/owner/lib/checkin-feed.ts apps/owner/lib/checkin-feed.test.ts apps/owner/lib/checkin-errors.ts apps/owner/lib/checkin-errors.test.ts apps/owner/lib/use-is-desktop.ts && pnpm check:design && pnpm --filter @iziwellpass/owner test`
Expected: green.

```bash
git add apps/owner/lib/member-search.ts apps/owner/lib/member-search.test.ts apps/owner/lib/today-tiles.ts apps/owner/lib/today-tiles.test.ts apps/owner/lib/checkin-feed.ts apps/owner/lib/checkin-feed.test.ts apps/owner/lib/checkin-errors.ts apps/owner/lib/checkin-errors.test.ts apps/owner/lib/use-is-desktop.ts apps/owner/messages/fr.json apps/owner/messages/en.json
git commit -m "feat(owner): hub helpers (member search, today tiles, feed rows, check-in errors) and SP-B copy"
```

---

### Task 3: `useRegisterCheckin` and `CheckinFeed`

**Files:**
- Create: `apps/owner/components/checkin/use-register-checkin.ts`
- Create: `apps/owner/components/checkin/checkin-feed.tsx`
- Create: `apps/owner/components/checkin/query-like.ts`

**Interfaces:**
- Consumes: `qrErrorMessage`, `walkinErrorFallback` (`@/lib/checkin-errors`); `feedRows`, `recordedByLabel` (`@/lib/checkin-feed`); `memberName`, `memberInitials` (`@/lib/member-search`); `decodeQrToken`, `checkinRouteFor` (`@/lib/qr-token`); `apiErrorMessage` (`@/lib/api-error`); `formatTime` (`@/lib/datetime`); generated hooks `useCheckInViaQr`, `useCheckInWalkinQr`, `usePassCheckin`, `useCheckInWalkin`, `getListCheckInsQueryKey`, `getGetAttendanceQueryKey`; ui `Avatar`, `AvatarFallback`, `Badge`, `Alert`, `Skeleton`.
- Produces:
  - `interface QueryLike<T> { data: T | undefined; isLoading: boolean; isError: boolean; error: unknown }` from `components/checkin/query-like.ts` (the dashboard and front desk data hooks re-export it in Tasks 5–6).
  - `interface RegisterCheckin { submitToken(token: string, onSuccess?: () => void): void; submitWalkin(memberId: string, onSuccess?: () => void): void; isPending: boolean }` and `useRegisterCheckin({ venueId, memberById }): RegisterCheckin`.
  - `CheckinFeed({ checkIns, members, staff, timeZone, title?, live?, limit? })`.

There is no unit test for these (owner vitest is node-only, `lib/**`); the gate is typecheck + lint, and Task 5 exercises them in the browser.

- [ ] **Step 1: The shared `QueryLike` type**

`apps/owner/components/checkin/query-like.ts`:

```ts
/**
 * Structural subset of a react-query result that the hub sections consume.
 * Decouples the components from the exact generated hook return types while
 * staying assignable from `UseQueryResult`.
 */
export interface QueryLike<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}
```

- [ ] **Step 2: The hook**

`apps/owner/components/checkin/use-register-checkin.ts`:

```ts
'use client';

import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { ApiError } from '@iziwellpass/api/client';
import {
  getGetAttendanceQueryKey,
  getListCheckInsQueryKey,
  useCheckInViaQr,
  useCheckInWalkin,
  useCheckInWalkinQr,
  usePassCheckin,
} from '@iziwellpass/api/generated';
import type { ApiResponseCheckIn, Member } from '@iziwellpass/api/schemas';

import { apiErrorMessage } from '@/lib/api-error';
import { qrErrorMessage, walkinErrorFallback } from '@/lib/checkin-errors';
import { memberName } from '@/lib/member-search';
import { checkinRouteFor, decodeQrToken } from '@/lib/qr-token';

export interface RegisterCheckin {
  /** Scan or typed token; routes to the booking, walk-in QR or pass endpoint. */
  submitToken: (token: string, onSuccess?: () => void) => void;
  /** Manual walk-in for a member picked in the type-ahead. */
  submitWalkin: (memberId: string, onSuccess?: () => void) => void;
  /** True while any of the four mutations is in flight; the bar locks. */
  isPending: boolean;
}

/**
 * The one check-in engine behind both hubs. Success toasts the member's name
 * (or the pass-visitor label), invalidates the check-in and attendance keys
 * of the venue the SERVER resolved — a pass token sends no venue_id, so a
 * tenant-wide owner with another venue selected would otherwise see a toast
 * while the scanned venue's feed never moves — and then runs `onSuccess` so
 * the caller can clear and refocus the bar for the next scan.
 */
export function useRegisterCheckin({
  venueId,
  memberById,
}: {
  venueId: string;
  memberById: ReadonlyMap<string, Member>;
}): RegisterCheckin {
  const t = useTranslations('frontdesk');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const viaQr = useCheckInViaQr();
  const walkinQr = useCheckInWalkinQr();
  const pass = usePassCheckin();
  const walkin = useCheckInWalkin();

  const isPending = viaQr.isPending || walkinQr.isPending || pass.isPending || walkin.isPending;

  const settle = useCallback(
    (res: ApiResponseCheckIn, after?: () => void) => {
      // A null member_id is a marketplace pass-holder check-in; show the
      // neutral pass-visitor label instead of an identity lookup.
      const memberId = res.data.member_id;
      if (!memberId) {
        toast.success(t('success', { name: tCommon('passVisitor') }));
      } else {
        const member = memberById.get(memberId);
        toast.success(member ? t('success', { name: memberName(member) }) : t('successNoName'));
      }
      const checkedInVenueId = res.data.venue_id;
      void queryClient.invalidateQueries({ queryKey: getListCheckInsQueryKey(checkedInVenueId) });
      void queryClient.invalidateQueries({ queryKey: getGetAttendanceQueryKey(checkedInVenueId) });
      after?.();
    },
    [memberById, queryClient, t, tCommon],
  );

  const submitToken = useCallback<RegisterCheckin['submitToken']>(
    (token, after) => {
      // Guard the rapid-Enter loop: a wedge scanner double-fire during the
      // in-flight window would re-submit the still-visible token and trip a
      // spurious "already checked in" right after the success.
      if (isPending || !token) return;
      // Routing only — never a security decision. The payload is readable
      // without a key; the server still verifies the MAC.
      const decoded = decodeQrToken(token);
      const route = checkinRouteFor(decoded);
      const handlers = {
        onSuccess: (res: ApiResponseCheckIn) => settle(res, after),
        onError: (err: unknown) => {
          // The pass flow's most common failure: another day, another venue,
          // or already used. Gets its own copy rather than the generic fallback.
          const isPassNotSettleable =
            route === 'pass' && err instanceof ApiError && err.status === 409;
          toast.error(
            isPassNotSettleable
              ? apiErrorMessage(err, t('qr.errorPassNotSettleable'))
              : qrErrorMessage(t, err, decoded, venueId),
          );
        },
      };
      if (route === 'pass') {
        // Marketplace pass token: venue-keyed, so it carries no venue_id of ours.
        pass.mutate({ data: { qr_token: token } }, handlers);
        return;
      }
      if (route === 'walkin') {
        walkinQr.mutate({ data: { qr_token: token, venue_id: venueId } }, handlers);
        return;
      }
      // 'booking' — and every undecodable token: the server produces the
      // authoritative error, and a future token format keeps working.
      viaQr.mutate({ data: { qr_token: token, venue_id: venueId } }, handlers);
    },
    [isPending, pass, settle, t, venueId, viaQr, walkinQr],
  );

  const submitWalkin = useCallback<RegisterCheckin['submitWalkin']>(
    (memberId, after) => {
      if (isPending || !memberId) return;
      walkin.mutate(
        { data: { member_id: memberId, venue_id: venueId } },
        {
          onSuccess: (res) => settle(res, after),
          onError: (err) => toast.error(apiErrorMessage(err, walkinErrorFallback(t, err))),
        },
      );
    },
    [isPending, settle, t, venueId, walkin],
  );

  return useMemo(
    () => ({ submitToken, submitWalkin, isPending }),
    [submitToken, submitWalkin, isPending],
  );
}
```

- [ ] **Step 3: The feed**

`apps/owner/components/checkin/checkin-feed.tsx`:

```tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import type { CheckIn, Member, Staff } from '@iziwellpass/api/schemas';
import { CheckInMethod } from '@iziwellpass/api/schemas';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Avatar, AvatarFallback } from '@iziwellpass/ui/components/avatar';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { cn } from '@iziwellpass/ui/lib/utils';

import { apiErrorMessage } from '@/lib/api-error';
import { feedRows, recordedByLabel } from '@/lib/checkin-feed';
import { formatTime } from '@/lib/datetime';
import { memberInitials, memberName } from '@/lib/member-search';

import type { QueryLike } from './query-like';

export interface CheckinFeedProps {
  checkIns: QueryLike<CheckIn[]>;
  members: QueryLike<Member[]>;
  staff: QueryLike<Staff[]>;
  timeZone: string | undefined;
  /** 22/500 heading. Omitted under the dashboard tab (the tab is the heading). */
  title?: string;
  /** « En direct » success badge with a dot, right of the title. */
  live?: boolean;
  /** The dashboard tab shows eight; the front desk shows the whole day. */
  limit?: number;
}

function CheckinRow({
  checkIn,
  index,
  member,
  staffByUserId,
  timeZone,
  justArrived,
}: {
  checkIn: CheckIn;
  index: number;
  member: Member | undefined;
  staffByUserId: ReadonlyMap<string, Staff>;
  timeZone: string | undefined;
  justArrived: boolean;
}) {
  const t = useTranslations('frontdesk');
  const tCommon = useTranslations('common');
  // Never surface a raw UUID: fall back to a generic label when the member
  // isn't in the loaded list. A null member_id is a marketplace pass-holder.
  const name = member
    ? memberName(member)
    : checkIn.member_id
      ? t('feed.unknownMember')
      : tCommon('passVisitor');
  const isQr = checkIn.method === CheckInMethod.qr;
  const meta = recordedByLabel(checkIn, staffByUserId, {
    self: t('feed.self'),
    unknownStaff: t('feed.unknownStaff'),
    by: (who) => t('feed.byLabel', { name: who }),
  });

  return (
    <li
      className={cn(
        'flex items-center gap-3.5 border-t border-border py-3 first:border-t-0',
        justArrived && 'animate-checkin-arrive',
      )}
    >
      <Avatar>
        <AvatarFallback tint={index} aria-label={name}>
          {memberInitials(member)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold">{name}</p>
        <p className="truncate text-sm text-muted-foreground">{meta}</p>
      </div>
      <Badge variant={isQr ? 'info' : 'default'}>
        {isQr ? t('feed.methodQr') : t('feed.methodManual')}
      </Badge>
      <span className="w-11 shrink-0 text-right font-numeric text-sm font-medium text-muted-foreground">
        {formatTime(checkIn.checked_in_at, timeZone)}
      </span>
    </li>
  );
}

/**
 * The hairline feed of today's check-ins, 720px wide and centred: avatar
 * tinted by position, name, who recorded it, the method badge, the venue-tz
 * time. Refetches on its own after each check-in (the hook invalidates the
 * key); a genuinely new top row flashes once.
 */
export function CheckinFeed({
  checkIns,
  members,
  staff,
  timeZone,
  title,
  live = false,
  limit,
}: CheckinFeedProps) {
  const t = useTranslations('frontdesk');

  const memberById = useMemo(
    () => new Map((members.data ?? []).map((m) => [m.id, m])),
    [members.data],
  );
  const staffByUserId = useMemo(
    () => new Map((staff.data ?? []).map((s) => [s.user_id, s])),
    [staff.data],
  );
  const rows = useMemo(() => feedRows(checkIns.data, limit), [checkIns.data, limit]);

  // Animate only a genuinely new arrival: the first populated render seeds
  // the ref without flashing, so the feed doesn't animate on load.
  const topId = rows[0]?.id;
  const lastTopId = useRef<string | undefined>(undefined);
  const [arrivedId, setArrivedId] = useState<string | null>(null);
  useEffect(() => {
    if (topId === undefined) return;
    if (lastTopId.current !== undefined && topId !== lastTopId.current) {
      setArrivedId(topId);
      const timer = setTimeout(() => setArrivedId(null), 1200);
      lastTopId.current = topId;
      return () => clearTimeout(timer);
    }
    lastTopId.current = topId;
  }, [topId]);

  return (
    <section className="flex w-full max-w-[45rem] flex-col gap-3" aria-label={title ?? t('feed.title')}>
      {title ? (
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium md:text-xl">{title}</h2>
          {live ? (
            <Badge variant="success">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
              {t('feed.live')}
            </Badge>
          ) : null}
        </div>
      ) : null}
      {checkIns.isLoading ? (
        <div className="flex flex-col gap-3" aria-hidden="true">
          <Skeleton className="h-[60px] w-full" />
          <Skeleton className="h-[60px] w-full" />
          <Skeleton className="h-[60px] w-full" />
        </div>
      ) : checkIns.isError ? (
        <Alert variant="destructive">
          <AlertTitle>{t('errorTitle')}</AlertTitle>
          <AlertDescription>{apiErrorMessage(checkIns.error, t('feed.loadError'))}</AlertDescription>
        </Alert>
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-base text-muted-foreground">{t('feed.empty')}</p>
      ) : (
        <ul className="flex flex-col">
          {rows.map((checkIn, index) => (
            <CheckinRow
              key={checkIn.id}
              checkIn={checkIn}
              index={index}
              member={checkIn.member_id ? memberById.get(checkIn.member_id) : undefined}
              staffByUserId={staffByUserId}
              timeZone={timeZone}
              justArrived={checkIn.id === arrivedId}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
```

`animate-checkin-arrive` already exists (it was used by the old feed); confirm with `grep -rn "checkin-arrive" packages/ui/src/styles apps/owner/app --include='*.css'` and, if it lives in an owner css file, leave it there.

- [ ] **Step 4: Typecheck the new files**

Run: `pnpm --filter @iziwellpass/owner exec tsc --noEmit -p . 2>&1 | grep -E "components/checkin|lib/(member-search|today-tiles|checkin-)" ; true`
Expected: no lines (errors elsewhere from Task 2's removed keys are expected until Task 6 and are not this task's).

- [ ] **Step 5: Commit**

Run: `pnpm exec prettier --write apps/owner/components/checkin/*.ts apps/owner/components/checkin/*.tsx && pnpm check:design && pnpm --filter @iziwellpass/owner lint`
Expected: guard clean; lint clean for the new files (lint failures in files rewritten by later tasks are reported, not fixed here).

```bash
git add apps/owner/components/checkin/query-like.ts apps/owner/components/checkin/use-register-checkin.ts apps/owner/components/checkin/checkin-feed.tsx
git commit -m "feat(owner): shared check-in engine and hairline feed"
```

---

### Task 4: `CheckinCommand` (mode menu, member type-ahead) and `CheckinModes`

**Files:**
- Create: `apps/owner/components/checkin/checkin-command.tsx`
- Create: `apps/owner/components/checkin/checkin-modes.tsx`
- Modify: `apps/owner/app/(app)/checkins/qr-scanner-dialog.tsx` (the trigger only)

**Interfaces:**
- Consumes: `CommandBar` (`@iziwellpass/ui/components/command-bar`, props `icon, placeholder, value, onChange, onSubmit, mode, submitLabel, inputProps`); `Popover`, `PopoverAnchor`, `PopoverContent`; `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`; `Tabs`, `TabsList`, `TabsTrigger`; `searchMembers`, `memberLabel`, `memberName`, `memberInitials`; `useIsDesktop`; `RegisterCheckin` (Task 3); `QrScannerDialog({ onDetected, disabled, onClose })`.
- Produces: `type CheckinMode = 'qr' | 'walkin'`; `CheckinCommand({ mode, onModeChange, members, register, statusLabel })`; `CheckinModes({ mode, onModeChange, onScan?, disabled? })`.

- [ ] **Step 1: Restyle the scanner trigger as an inactive pill**

In `apps/owner/app/(app)/checkins/qr-scanner-dialog.tsx`, replace the `<DialogTrigger asChild>…</DialogTrigger>` block with:

```tsx
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          className="h-10 rounded-full px-[18px] text-base font-normal text-muted-foreground hover:text-foreground"
        >
          <CameraIcon aria-hidden="true" />
          {t('qr.scanButton')}
        </Button>
      </DialogTrigger>
```

(The label is now visible text, so the `aria-label` goes.) The `size="icon"` import stays valid; nothing else in the file changes.

- [ ] **Step 2: `CheckinModes`**

`apps/owner/components/checkin/checkin-modes.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { Tabs, TabsList, TabsTrigger } from '@iziwellpass/ui/components/tabs';

import { QrScannerDialog } from '@/app/(app)/checkins/qr-scanner-dialog';

export type CheckinMode = 'qr' | 'walkin';

/**
 * The pill row under the command bar: two radio-style pills bound to the
 * same mode as the bar's dropdown, plus — desktop only — the camera pill
 * that opens the scanner dialog. A detected token goes straight to `onScan`.
 */
export function CheckinModes({
  mode,
  onModeChange,
  onScan,
  disabled = false,
}: {
  mode: CheckinMode;
  onModeChange: (mode: CheckinMode) => void;
  onScan?: (token: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations('frontdesk');
  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      <Tabs value={mode} onValueChange={(value) => onModeChange(value as CheckinMode)}>
        <TabsList aria-label={t('command.modeMenuLabel')}>
          <TabsTrigger value="qr" disabled={disabled}>
            {t('modes.qr')}
          </TabsTrigger>
          <TabsTrigger value="walkin" disabled={disabled}>
            {t('modes.walkin')}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {onScan ? (
        <div className="hidden md:block">
          <QrScannerDialog onDetected={onScan} disabled={disabled} />
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: `CheckinCommand`**

`apps/owner/components/checkin/checkin-command.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { CheckIcon, ChevronDownIcon, QrCodeIcon, UserSearchIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { Member, MembershipStatus } from '@iziwellpass/api/schemas';
import { Avatar, AvatarFallback } from '@iziwellpass/ui/components/avatar';
import { Button } from '@iziwellpass/ui/components/button';
import { CommandBar } from '@iziwellpass/ui/components/command-bar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@iziwellpass/ui/components/dropdown-menu';
import { Popover, PopoverAnchor, PopoverContent } from '@iziwellpass/ui/components/popover';
import { cn } from '@iziwellpass/ui/lib/utils';

import { memberInitials, memberLabel, memberName, searchMembers } from '@/lib/member-search';
import { useIsDesktop } from '@/lib/use-is-desktop';

import type { CheckinMode } from './checkin-modes';
import type { RegisterCheckin } from './use-register-checkin';

export interface CheckinCommandProps {
  mode: CheckinMode;
  onModeChange: (mode: CheckinMode) => void;
  /** The loaded member list (walk-in type-ahead). */
  members: readonly Member[];
  register: RegisterCheckin;
  /** « Actif », « Expiré »… from the members namespace. */
  statusLabel: (status: MembershipStatus) => string;
}

const MODES: readonly CheckinMode[] = ['qr', 'walkin'];

/**
 * The hub's one control. QR mode: the token field a wedge scanner types
 * into, scan-ready on arrival and after every success. Walk-in mode: a
 * type-ahead over the member list in a borderless côté popover; picking a
 * member fills « Awa Ndiaye · Actif » and submit registers the entry. The
 * ghost dropdown on the right switches mode on desktop; below `md` the pill
 * row (CheckinModes) is the only switch.
 */
export function CheckinCommand({
  mode,
  onModeChange,
  members,
  register,
  statusLabel,
}: CheckinCommandProps) {
  const t = useTranslations('frontdesk');
  const isDesktop = useIsDesktop();
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const results = useMemo(
    () => (mode === 'walkin' ? searchMembers(members, query) : []),
    [members, mode, query],
  );
  const listOpen = mode === 'walkin' && open && query.trim() !== '' && selectedId === null;

  const clear = useCallback(() => {
    setQuery('');
    setSelectedId(null);
    setOpen(false);
    setActive(0);
    inputRef.current?.focus();
  }, []);

  // Scan-ready on arrival and on every mode switch: the field is the whole
  // point of the screen, so we don't gate by pointer type (a counter tablet
  // with a wedge scanner needs it as much as a laptop).
  useEffect(() => {
    clear();
  }, [mode, clear]);

  useEffect(() => {
    setActive(0);
  }, [results.length]);

  const select = useCallback(
    (member: Member) => {
      setQuery(memberLabel(member, statusLabel(member.membership_status)));
      setSelectedId(member.id);
      setOpen(false);
      inputRef.current?.focus();
    },
    [statusLabel],
  );

  const handleSubmit = (value: string) => {
    if (register.isPending) return;
    if (mode === 'qr') {
      register.submitToken(value, clear);
      return;
    }
    if (selectedId) {
      register.submitWalkin(selectedId, clear);
      return;
    }
    setOpen(true);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (mode !== 'walkin') return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter' && listOpen && results[active]) {
      // Selecting is not submitting: stop the implicit form submission.
      event.preventDefault();
      select(results[active]);
    } else if (event.key === 'Escape' && listOpen) {
      event.preventDefault();
      setOpen(false);
    }
  };

  const placeholder =
    mode === 'qr'
      ? isDesktop
        ? t('command.placeholderQr')
        : t('command.placeholderQrShort')
      : t('command.placeholderWalkin');

  const modeMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="hidden md:inline-flex"
          aria-label={t('command.modeMenuLabel')}
        >
          {mode === 'qr' ? t('command.modeQr') : t('command.modeWalkin')}
          <ChevronDownIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {MODES.map((m) => (
          <DropdownMenuItem key={m} onSelect={() => onModeChange(m)}>
            {m === 'qr' ? t('command.modeQr') : t('command.modeWalkin')}
            {m === mode ? <CheckIcon aria-hidden="true" className="ml-auto" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const activeId = listOpen && results[active] ? `${listId}-${active}` : undefined;

  return (
    <Popover open={listOpen} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="w-full max-w-[45rem]">
          <CommandBar
            icon={mode === 'qr' ? <QrCodeIcon /> : <UserSearchIcon />}
            placeholder={placeholder}
            value={query}
            onChange={(value) => {
              setQuery(value);
              setSelectedId(null);
              setOpen(true);
            }}
            onSubmit={handleSubmit}
            mode={modeMenu}
            submitLabel={t('command.submit')}
            inputProps={{
              ref: inputRef,
              onKeyDown,
              readOnly: register.isPending,
              autoComplete: 'off',
              autoCapitalize: 'none',
              spellCheck: false,
              inputMode: 'text',
              ...(mode === 'walkin'
                ? {
                    role: 'combobox',
                    'aria-autocomplete': 'list',
                    'aria-expanded': listOpen,
                    'aria-controls': listId,
                    'aria-activedescendant': activeId,
                  }
                : {}),
            }}
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[var(--radix-popover-trigger-width)] p-2"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <div id={listId} role="listbox" aria-label={t('command.results')}>
          {results.length === 0 ? (
            <p className="px-3 py-3 text-base text-muted-foreground">{t('walkin.noMembers')}</p>
          ) : (
            results.map((member, index) => (
              <div
                key={member.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => select(member)}
                className={cn(
                  'flex h-12 cursor-pointer items-center gap-3 rounded-full px-3 text-base',
                  index === active && 'bg-secondary',
                )}
              >
                <Avatar size="sm">
                  <AvatarFallback tint={index}>{memberInitials(member)}</AvatarFallback>
                </Avatar>
                <span className="truncate font-medium">{memberName(member)}</span>
                <span className="ml-auto shrink-0 text-sm text-muted-foreground">
                  {statusLabel(member.membership_status)}
                </span>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

Notes for the implementer: React 19 passes `ref` as an ordinary prop, so `inputProps.ref` reaches the `<input>` the `CommandBar` spreads it on. `readOnly` rather than `disabled` keeps focus in the field during the in-flight window. `onMouseDown` prevents the input from blurring before `onClick` fires.

- [ ] **Step 4: Typecheck the module**

Run: `pnpm --filter @iziwellpass/owner exec tsc --noEmit -p . 2>&1 | grep -E "components/checkin|qr-scanner-dialog" ; true`
Expected: no lines. If `inputProps.ref` is rejected, the `CommandBarProps.inputProps` type omits `ref`; in that case add `ref?: React.Ref<HTMLInputElement>` to that `Omit<…>` union in `packages/ui/src/components/command-bar.tsx` and pass it through explicitly (`<input ref={inputProps?.ref} …>`).

- [ ] **Step 5: Commit**

Run: `pnpm exec prettier --write apps/owner/components/checkin/checkin-command.tsx apps/owner/components/checkin/checkin-modes.tsx "apps/owner/app/(app)/checkins/qr-scanner-dialog.tsx" && pnpm check:design && pnpm --filter @iziwellpass/owner lint`
Expected: guard clean; no lint errors in the three files.

```bash
git add apps/owner/components/checkin/checkin-command.tsx apps/owner/components/checkin/checkin-modes.tsx "apps/owner/app/(app)/checkins/qr-scanner-dialog.tsx"
git commit -m "feat(owner): check-in command bar with mode menu and member type-ahead, modes row"
```

---

### Task 5: Front desk page on the hub

**Files:**
- Modify: `apps/owner/lib/datetime.ts` (append `todayLabel`)
- Modify: `apps/owner/app/(app)/checkins/use-frontdesk-data.ts` (re-export `QueryLike`)
- Modify: `apps/owner/app/(app)/checkins/day-stats.tsx`
- Rewrite: `apps/owner/app/(app)/checkins/page.tsx`
- Delete: `apps/owner/app/(app)/checkins/register-panel.tsx`, `apps/owner/app/(app)/checkins/recent-checkins.tsx`

**Interfaces:**
- Consumes: Tasks 1–4 (`HubPage` family, `CheckinCommand`, `CheckinModes`, `CheckinFeed`, `useRegisterCheckin`, `useIsDesktop`, `QueryLike`), `useFrontdeskData(venueId, timeZone)` → `{ attendance, checkIns, members, staff }`, `RequirePageAccess`, `useVenueContext()` → `{ venues, isLoading, isError, error, selectedVenueId, selectedVenue }`.
- Produces: `todayLabel(locale: string, timeZone: string | undefined): string` in `@/lib/datetime` (Task 6 uses it too).

- [ ] **Step 1: Move `todayLabel` into the lib**

Append to `apps/owner/lib/datetime.ts` (this is the function currently defined at the top of `apps/owner/app/(app)/page.tsx`; Task 6 deletes it there):

```ts
/**
 * Today's date in the active locale and the venue's timezone (falls back to
 * the runtime zone if the venue tz is missing/invalid), first letter
 * capitalised — French weekday names are otherwise lowercase.
 */
export function todayLabel(locale: string, timeZone: string | undefined): string {
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
  let text: string;
  try {
    text = new Intl.DateTimeFormat(locale, {
      ...options,
      timeZone: timeZone && timeZone.trim().length > 0 ? timeZone : undefined,
    }).format(new Date());
  } catch {
    text = new Intl.DateTimeFormat(locale, options).format(new Date());
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}
```

- [ ] **Step 2: Re-export `QueryLike` from the data hook**

In `apps/owner/app/(app)/checkins/use-frontdesk-data.ts` replace the local `export interface QueryLike<T> { … }` block (and its doc comment) with:

```ts
export type { QueryLike } from '@/components/checkin/query-like';
```

- [ ] **Step 3: Short stat label on a phone**

Rewrite `apps/owner/app/(app)/checkins/day-stats.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';

import type { AttendanceStats } from '@iziwellpass/api/schemas';
import { Stat, StatPanel } from '@iziwellpass/ui/components/stat';

import { useCountUp } from '@/lib/use-count-up';
import { useIsDesktop } from '@/lib/use-is-desktop';

import type { QueryLike } from './use-frontdesk-data';

/**
 * The front desk's three-stat hairline strip: passages, unique members (the
 * short « Uniques » on a phone, as drawn), occupancy. Occupancy eases up when
 * a check-in lands (useCountUp); the other two snap.
 */
export function DayStats({ attendance }: { attendance: QueryLike<AttendanceStats> }) {
  const t = useTranslations('frontdesk');
  const isDesktop = useIsDesktop();
  const stats = attendance.isError ? undefined : attendance.data;
  const occupancy = useCountUp(stats ? Math.round(stats.occupancy_pct) : 0);

  return (
    <StatPanel>
      <Stat
        label={t('stats.checkins')}
        value={stats ? String(stats.total_check_ins) : null}
        isLoading={attendance.isLoading}
      />
      <Stat
        label={isDesktop ? t('stats.uniqueMembers') : t('stats.uniqueMembersShort')}
        value={stats ? String(stats.unique_members) : null}
        isLoading={attendance.isLoading}
      />
      <Stat
        label={t('stats.occupancy')}
        value={stats ? `${occupancy} %` : null}
        isLoading={attendance.isLoading}
      />
    </StatPanel>
  );
}
```

- [ ] **Step 4: Rewrite the page**

`apps/owner/app/(app)/checkins/page.tsx`:

```tsx
'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import type { MembershipStatus } from '@iziwellpass/api/schemas';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import {
  HubEyebrow,
  HubHero,
  HubPage,
  HubSection,
  HubTitle,
} from '@iziwellpass/ui/components/hub-page';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';

import { CheckinCommand } from '@/components/checkin/checkin-command';
import { CheckinFeed } from '@/components/checkin/checkin-feed';
import { CheckinModes, type CheckinMode } from '@/components/checkin/checkin-modes';
import { useRegisterCheckin } from '@/components/checkin/use-register-checkin';
import { RequirePageAccess } from '@/components/page-access';
import { apiErrorMessage } from '@/lib/api-error';
import { todayLabel } from '@/lib/datetime';
import { useVenueContext } from '@/lib/venue-context';

import { DayStats } from './day-stats';
import { useFrontdeskData } from './use-frontdesk-data';

/** Eyebrow + question. The question follows the mode, as drawn. */
function Hero({ mode, children }: { mode: CheckinMode; children?: ReactNode }) {
  const t = useTranslations('frontdesk');
  const locale = useLocale();
  const { selectedVenue } = useVenueContext();
  return (
    <HubHero>
      <HubEyebrow>{t('eyebrow', { date: todayLabel(locale, selectedVenue?.timezone) })}</HubEyebrow>
      <HubTitle>{mode === 'walkin' ? t('questionWalkin') : t('question')}</HubTitle>
      {children}
    </HubHero>
  );
}

function LoadingState() {
  return (
    <div className="flex w-full flex-col items-center gap-6 md:gap-12" aria-hidden="true">
      <Skeleton className="h-14 w-full max-w-[45rem] rounded-full md:h-[60px]" />
      <div className="flex gap-10">
        <Skeleton className="h-14 w-24" />
        <Skeleton className="h-14 w-24" />
        <Skeleton className="h-14 w-24" />
      </div>
      <div className="flex w-full max-w-[45rem] flex-col gap-3">
        <Skeleton className="h-[60px] w-full" />
        <Skeleton className="h-[60px] w-full" />
        <Skeleton className="h-[60px] w-full" />
      </div>
    </div>
  );
}

/**
 * The desk once a venue is selected. `useFrontdeskData` fans out attendance,
 * check-ins, members and staff in parallel; the command, strip and feed render
 * from that shared data. A successful check-in invalidates the check-in and
 * attendance keys, so the feed and stats update live.
 */
function FrontdeskBody({
  venueId,
  timeZone,
  mode,
  onModeChange,
}: {
  venueId: string;
  timeZone: string | undefined;
  mode: CheckinMode;
  onModeChange: (mode: CheckinMode) => void;
}) {
  const t = useTranslations('frontdesk');
  const tMembers = useTranslations('members');
  const { attendance, checkIns, members, staff } = useFrontdeskData(venueId, timeZone);

  const list = useMemo(() => members.data ?? [], [members.data]);
  const memberById = useMemo(() => new Map(list.map((m) => [m.id, m])), [list]);
  const register = useRegisterCheckin({ venueId, memberById });
  const statusLabel = useCallback(
    (status: MembershipStatus) => tMembers(`status.${status}`),
    [tMembers],
  );

  return (
    <>
      <Hero mode={mode}>
        <CheckinCommand
          mode={mode}
          onModeChange={onModeChange}
          members={list}
          register={register}
          statusLabel={statusLabel}
        />
        <CheckinModes
          mode={mode}
          onModeChange={onModeChange}
          onScan={(token) => register.submitToken(token)}
          disabled={register.isPending}
        />
        <p className="max-w-[35rem] text-md text-muted-foreground">
          {mode === 'walkin' ? t('walkin.hint') : t('qr.hint')}
        </p>
      </Hero>
      <HubSection>
        <DayStats attendance={attendance} />
      </HubSection>
      <HubSection>
        <CheckinFeed
          checkIns={checkIns}
          members={members}
          staff={staff}
          timeZone={timeZone}
          title={t('feed.title')}
          live
        />
      </HubSection>
    </>
  );
}

function FrontdeskContent() {
  const t = useTranslations('frontdesk');
  const { venues, isLoading, isError, error, selectedVenueId, selectedVenue } = useVenueContext();
  const timeZone = selectedVenue?.timezone;
  const [mode, setMode] = useState<CheckinMode>('qr');

  if (isLoading) {
    return (
      <HubPage wash>
        <Hero mode={mode} />
        <LoadingState />
      </HubPage>
    );
  }

  if (isError) {
    return (
      <HubPage wash>
        <Hero mode={mode} />
        <Alert variant="destructive" className="max-w-[45rem] self-center">
          <AlertTitle>{t('errorTitle')}</AlertTitle>
          <AlertDescription>{apiErrorMessage(error, t('venuesError'))}</AlertDescription>
        </Alert>
      </HubPage>
    );
  }

  if (venues.length === 0 || !selectedVenueId) {
    return (
      <HubPage wash>
        <Hero mode={mode} />
        <p className="py-6 text-center text-base text-muted-foreground">
          {venues.length === 0 ? t('venueNone') : t('venuePrompt')}
        </p>
      </HubPage>
    );
  }

  return (
    <HubPage wash>
      <FrontdeskBody
        venueId={selectedVenueId}
        timeZone={timeZone}
        mode={mode}
        onModeChange={setMode}
      />
    </HubPage>
  );
}

export default function CheckinsPage() {
  return (
    <RequirePageAccess href="/checkins">
      <FrontdeskContent />
    </RequirePageAccess>
  );
}
```

If next-intl's typed keys reject the template `` `status.${status}` ``, write it as `tMembers(`status.${status}` as 'status.active')` — the four `MembershipStatus` values exist under `members.status` in both locales.

- [ ] **Step 5: Delete the replaced files**

```bash
git rm "apps/owner/app/(app)/checkins/register-panel.tsx" "apps/owner/app/(app)/checkins/recent-checkins.tsx"
```

- [ ] **Step 6: Gate**

Run: `pnpm exec prettier --write "apps/owner/app/(app)/checkins/page.tsx" "apps/owner/app/(app)/checkins/day-stats.tsx" "apps/owner/app/(app)/checkins/use-frontdesk-data.ts" apps/owner/lib/datetime.ts && pnpm check:design && pnpm --filter @iziwellpass/owner exec tsc --noEmit -p . 2>&1 | grep -v "app/(app)/page.tsx\|app/(app)/dashboard/" ; pnpm --filter @iziwellpass/owner lint`
Expected: guard clean; the only typecheck errors left are in the dashboard files Task 6 rewrites (removed `dashboard.checkins.*` / `schedule.title` keys and the `todayLabel` duplicate); lint clean for the changed files.

- [ ] **Step 7: Commit**

```bash
git add apps/owner/lib/datetime.ts "apps/owner/app/(app)/checkins/page.tsx" "apps/owner/app/(app)/checkins/day-stats.tsx" "apps/owner/app/(app)/checkins/use-frontdesk-data.ts"
git commit -m "feat(owner): front desk as a hub — question, command bar, modes, strip, live feed"
```

---

### Task 6: Dashboard on the hub — tiles, tabs, first run

**Files:**
- Modify: `apps/owner/app/(app)/dashboard/use-dashboard-data.ts`
- Modify: `apps/owner/app/(app)/dashboard/kpi-row.tsx` (occupancy « — » at zero)
- Create: `apps/owner/app/(app)/dashboard/today-tiles.tsx`
- Rewrite: `apps/owner/app/(app)/dashboard/starter.tsx`
- Rewrite: `apps/owner/app/(app)/page.tsx`
- Delete: `apps/owner/app/(app)/dashboard/today-schedule.tsx`, `apps/owner/app/(app)/dashboard/recent-checkins.tsx`

**Interfaces:**
- Consumes: Tasks 1–5; `pickTodayTiles`, `tileTone`, `isSlotFull` (`@/lib/today-tiles`); `Tile`, `TileTop`, `TileTime`, `TileCount`, `TileTitle`, `TileMeta`; `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`; `canAccessPath(role, href)`; `useRole()`; `useSession()`; `formatTime`.
- Produces: nothing downstream.

- [ ] **Step 1: Data hook gains staff, re-exports `QueryLike`**

Rewrite `apps/owner/app/(app)/dashboard/use-dashboard-data.ts`:

```ts
'use client';

import { unwrap } from '@iziwellpass/api/client';
import { useListResources, useListSchedules, useListStaff } from '@iziwellpass/api/generated';

import { useAllMembers } from '@/lib/all-members';
import { useAttendanceByDate, useCheckInsByDate, useSlotsByDate } from '@/lib/dated-api';
import { venueToday } from '@/lib/datetime';

export type { QueryLike } from '@/components/checkin/query-like';

/**
 * Initiates every venue-scoped dashboard query in one place so they fan out
 * in parallel on the first render of `DashboardBody`. The shared member list
 * is fetched once and reused by the KPI row, the command bar and the feed;
 * staff resolves instructors on the tiles and « par … » in the feed.
 */
export function useDashboardData(venueId: string, timeZone: string | undefined) {
  // slots / attendance / checkins require a `date` param the generated client
  // can't send — see lib/dated-api.ts. "Today" is the venue-local day.
  const date = venueToday(timeZone);

  const attendance = useAttendanceByDate(venueId, date);
  const members = useAllMembers();
  const slots = useSlotsByDate(venueId, date);
  const schedules = useListSchedules(venueId, { query: { select: unwrap } });
  const resources = useListResources(venueId, { query: { select: unwrap } });
  const checkIns = useCheckInsByDate(venueId, date);
  const staff = useListStaff({ query: { select: unwrap } });

  return { attendance, members, slots, schedules, resources, checkIns, staff };
}
```

- [ ] **Step 2: Occupancy shows « — » when nothing has been measured**

In `apps/owner/app/(app)/dashboard/kpi-row.tsx`, change the occupancy `value` prop to:

```tsx
        value={stats && stats.total_check_ins > 0 ? `${Math.round(stats.occupancy_pct)} %` : null}
```

(The first-run frame draws « — » under Occupation; `Stat` already renders `—` for `null`.)

- [ ] **Step 3: `TodayTiles`**

`apps/owner/app/(app)/dashboard/today-tiles.tsx`:

```tsx
'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRightIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { Resource, Schedule, ScheduleSlot, Staff } from '@iziwellpass/api/schemas';
import { useRole } from '@iziwellpass/auth/provider';
import { Button } from '@iziwellpass/ui/components/button';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import {
  Tile,
  TileCount,
  TileMeta,
  TileTime,
  TileTitle,
  TileTop,
} from '@iziwellpass/ui/components/tile';

import { formatTime } from '@/lib/datetime';
import { canAccessPath } from '@/lib/nav';
import { isSlotFull, pickTodayTiles, tileTone } from '@/lib/today-tiles';

import { SectionError } from './section-error';
import type { QueryLike } from './use-dashboard-data';

/**
 * Today's sessions as four square tiles — time and « booked/capacity » on
 * top, title and « Salle · Instructeur · Complet » at the bottom — then the
 * « Voir les N séances du jour » link to the planning. Tints rotate by
 * position; a full session takes sable, a cancelled one the côté tone.
 */
export function TodayTiles({
  slots,
  schedules,
  resources,
  staff,
  timeZone,
}: {
  slots: QueryLike<ScheduleSlot[]>;
  schedules: QueryLike<Schedule[]>;
  resources: QueryLike<Resource[]>;
  staff: QueryLike<Staff[]>;
  timeZone: string | undefined;
}) {
  const t = useTranslations('dashboard');
  const role = useRole();
  const canCreateSchedule =
    (role === 'owner' || role === 'admin') && canAccessPath(role, '/schedules');

  const scheduleById = useMemo(
    () => new Map((schedules.data ?? []).map((s) => [s.id, s])),
    [schedules.data],
  );
  const resourceNameById = useMemo(
    () => new Map((resources.data ?? []).map((r) => [r.id, r.name])),
    [resources.data],
  );
  const staffNameById = useMemo(
    () => new Map((staff.data ?? []).map((s) => [s.id, `${s.first_name} ${s.last_name}`.trim()])),
    [staff.data],
  );
  const { tiles, total } = useMemo(() => pickTodayTiles(slots.data, timeZone), [slots.data, timeZone]);

  if (slots.isLoading) {
    return (
      <div className="grid w-full grid-cols-2 gap-4 md:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (slots.isError) {
    return <SectionError error={slots.error} fallback={t('errors.slots')} />;
  }
  if (tiles.length === 0) {
    return (
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
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-12">
      <ul className="grid w-full grid-cols-2 gap-4 md:grid-cols-4">
        {tiles.map((slot, index) => {
          const tone = tileTone(slot, index);
          const isCancelled = slot.status === 'cancelled';
          const schedule = scheduleById.get(slot.schedule_id);
          const instructor = schedule?.instructor_staff_id
            ? staffNameById.get(schedule.instructor_staff_id)
            : undefined;
          const meta = isCancelled
            ? t('schedule.cancelled')
            : [
                resourceNameById.get(slot.resource_id) ?? '—',
                instructor,
                isSlotFull(slot) ? t('schedule.full') : undefined,
              ]
                .filter(Boolean)
                .join(' · ');
          return (
            <li key={slot.id} className="contents">
              <Tile
                tint={tone === 'side' ? index : tone}
                className={tone === 'side' ? 'bg-side' : undefined}
              >
                <TileTop>
                  <TileTime>{formatTime(slot.start_time, timeZone)}</TileTime>
                  {isCancelled ? null : (
                    <TileCount>
                      {slot.booked_count}/{slot.capacity}
                    </TileCount>
                  )}
                </TileTop>
                <div>
                  <TileTitle>{schedule?.title ?? '—'}</TileTitle>
                  <TileMeta>{meta}</TileMeta>
                </div>
              </Tile>
            </li>
          );
        })}
      </ul>
      <Link
        href="/schedules"
        className="inline-flex items-center gap-2 text-md font-medium text-muted-foreground hover:text-foreground"
      >
        {t('schedule.seeAll', { count: total })}
        <ArrowRightIcon aria-hidden="true" className="size-4" />
      </Link>
    </div>
  );
}
```

- [ ] **Step 4: `Starter` as three tiles**

Rewrite `apps/owner/app/(app)/dashboard/starter.tsx`:

```tsx
'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { CalendarPlusIcon, ScanLineIcon, UserPlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { AttendanceStats, Member } from '@iziwellpass/api/schemas';
import { useRole } from '@iziwellpass/auth/provider';
import { Button } from '@iziwellpass/ui/components/button';
import { HubEyebrow, HubHero, HubLead, HubSection, HubTitle } from '@iziwellpass/ui/components/hub-page';
import { Tile, TileMeta, TileTitle, TileTop } from '@iziwellpass/ui/components/tile';

import { canAccessPath } from '@/lib/nav';

import { KpiRow } from './kpi-row';
import type { QueryLike } from './use-dashboard-data';

interface Step {
  index: number;
  href: string;
  icon: ReactNode;
  title: string;
  body: string;
  cta: string;
}

/**
 * First-week starter, shown when the venue has no schedules AND no members:
 * a welcome instead of the greeting, three tinted step tiles (create a
 * schedule → add a member → first check-in), the stat strip at zero, and a
 * sentence saying what will appear here. No command bar, as drawn.
 */
export function Starter({
  eyebrow,
  name,
  attendance,
  members,
}: {
  eyebrow: string;
  name: string | null;
  attendance: QueryLike<AttendanceStats>;
  members: QueryLike<Member[]>;
}) {
  const t = useTranslations('dashboard');
  const role = useRole();

  const iconClass = 'size-5 text-muted-strong';
  const steps: Step[] = [
    {
      index: 1,
      href: '/schedules',
      icon: <CalendarPlusIcon className={iconClass} aria-hidden="true" />,
      title: t('starter.step1Title'),
      body: t('starter.step1Body'),
      cta: t('starter.step1Cta'),
    },
    {
      index: 2,
      href: '/members',
      icon: <UserPlusIcon className={iconClass} aria-hidden="true" />,
      title: t('starter.step2Title'),
      body: t('starter.step2Body'),
      cta: t('starter.step2Cta'),
    },
    {
      index: 3,
      href: '/checkins',
      icon: <ScanLineIcon className={iconClass} aria-hidden="true" />,
      title: t('starter.step3Title'),
      body: t('starter.step3Body'),
      cta: t('starter.step3Cta'),
    },
  ];

  return (
    <>
      <HubHero>
        <HubEyebrow>{eyebrow}</HubEyebrow>
        <HubTitle>{name ? t('starter.title', { name }) : t('starter.titleNoName')}</HubTitle>
        <HubLead>{t('starter.body')}</HubLead>
      </HubHero>
      <ol className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
        {steps.map((step, i) => (
          <li key={step.index} className="contents">
            <Tile aspect="tall" tint={i} className="gap-4 p-6">
              <TileTop>
                <span className="font-numeric text-xl font-medium">{step.index}</span>
                {step.icon}
              </TileTop>
              <div className="flex flex-col gap-4">
                <div>
                  <TileTitle>{step.title}</TileTitle>
                  <TileMeta>{step.body}</TileMeta>
                </div>
                {/* A role that can't perform the step gets it as context, not a link. */}
                {canAccessPath(role, step.href) ? (
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="self-start bg-card hover:bg-side"
                  >
                    <Link href={step.href}>{step.cta}</Link>
                  </Button>
                ) : null}
              </div>
            </Tile>
          </li>
        ))}
      </ol>
      <HubSection>
        <KpiRow attendance={attendance} members={members} />
      </HubSection>
      <p className="text-center text-md text-muted-foreground">{t('starter.placeholder')}</p>
    </>
  );
}
```

- [ ] **Step 5: Rewrite the page**

`apps/owner/app/(app)/page.tsx`:

```tsx
'use client';

import { useCallback, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import type { MembershipStatus } from '@iziwellpass/api/schemas';
import { useSession } from '@iziwellpass/auth/provider';
import {
  HubEyebrow,
  HubHero,
  HubPage,
  HubSection,
  HubTitle,
} from '@iziwellpass/ui/components/hub-page';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@iziwellpass/ui/components/tabs';

import { CheckinCommand } from '@/components/checkin/checkin-command';
import { CheckinFeed } from '@/components/checkin/checkin-feed';
import type { CheckinMode } from '@/components/checkin/checkin-modes';
import { useRegisterCheckin } from '@/components/checkin/use-register-checkin';
import { todayLabel } from '@/lib/datetime';
import { useVenueContext } from '@/lib/venue-context';

import { KpiRow } from './dashboard/kpi-row';
import { SectionError } from './dashboard/section-error';
import { Starter } from './dashboard/starter';
import { TodayTiles } from './dashboard/today-tiles';
import { useDashboardData } from './dashboard/use-dashboard-data';

type Tab = 'schedule' | 'checkins';

function LoadingHub({ eyebrow }: { eyebrow: string }) {
  return (
    <>
      <HubHero>
        <HubEyebrow>{eyebrow}</HubEyebrow>
        <Skeleton className="h-10 w-72 md:h-12 md:w-80" />
        <Skeleton className="h-14 w-full max-w-[45rem] rounded-full md:h-[60px]" />
      </HubHero>
      <HubSection aria-hidden="true">
        <div className="flex gap-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-24" />
          ))}
        </div>
      </HubSection>
      <div className="grid w-full grid-cols-2 gap-4 md:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full rounded-xl" />
        ))}
      </div>
    </>
  );
}

/**
 * The hub once a venue is selected. Every venue-scoped query fans out from
 * `useDashboardData`; the starter-vs-hub decision waits on schedules +
 * members so the first-week starter never flashes over the tiles.
 */
function DashboardBody({
  venueId,
  timeZone,
  eyebrow,
  name,
}: {
  venueId: string;
  timeZone: string | undefined;
  eyebrow: string;
  name: string | null;
}) {
  const t = useTranslations('dashboard');
  const tMembers = useTranslations('members');
  const data = useDashboardData(venueId, timeZone);
  const { attendance, members, slots, schedules, resources, checkIns, staff } = data;

  const list = useMemo(() => members.data ?? [], [members.data]);
  const memberById = useMemo(() => new Map(list.map((m) => [m.id, m])), [list]);
  const register = useRegisterCheckin({ venueId, memberById });
  const statusLabel = useCallback(
    (status: MembershipStatus) => tMembers(`status.${status}`),
    [tMembers],
  );
  const [mode, setMode] = useState<CheckinMode>('qr');
  const [tab, setTab] = useState<Tab>('schedule');

  if (schedules.isLoading || members.isLoading) {
    return <LoadingHub eyebrow={eyebrow} />;
  }

  const hasNoSchedules = !schedules.isError && (schedules.data ?? []).length === 0;
  const hasNoMembers = !members.isError && list.length === 0;
  if (hasNoSchedules && hasNoMembers) {
    return <Starter eyebrow={eyebrow} name={name} attendance={attendance} members={members} />;
  }

  return (
    <>
      <HubHero>
        <HubEyebrow>{eyebrow}</HubEyebrow>
        <HubTitle>{name ? t('greeting', { name }) : t('greetingNoName')}</HubTitle>
        <CheckinCommand
          mode={mode}
          onModeChange={setMode}
          members={list}
          register={register}
          statusLabel={statusLabel}
        />
      </HubHero>
      <HubSection>
        <KpiRow attendance={attendance} members={members} />
      </HubSection>
      <HubSection>
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as Tab)}
          className="w-full items-center gap-6"
        >
          <TabsList aria-label={t('tabs.label')}>
            <TabsTrigger value="schedule">{t('tabs.schedule')}</TabsTrigger>
            <TabsTrigger value="checkins">{t('tabs.checkins')}</TabsTrigger>
          </TabsList>
          <TabsContent value="schedule" className="w-full">
            <TodayTiles
              slots={slots}
              schedules={schedules}
              resources={resources}
              staff={staff}
              timeZone={timeZone}
            />
          </TabsContent>
          <TabsContent value="checkins" className="flex w-full justify-center">
            <CheckinFeed
              checkIns={checkIns}
              members={members}
              staff={staff}
              timeZone={timeZone}
              limit={8}
            />
          </TabsContent>
        </Tabs>
      </HubSection>
    </>
  );
}

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const session = useSession();

  // Greet by real given name when the token carries one; otherwise a warm
  // name-less « Bonjour » rather than the email local-part.
  const name = session.status === 'signed-in' ? (session.claims.name ?? null) : null;

  const { venues, isLoading, isError, error, selectedVenueId, selectedVenue } = useVenueContext();
  const timeZone = selectedVenue?.timezone;
  const date = todayLabel(locale, timeZone);
  const eyebrow = selectedVenue ? t('eyebrow', { date, venue: selectedVenue.name }) : date;

  return (
    <HubPage wash>
      {isLoading ? (
        <LoadingHub eyebrow={eyebrow} />
      ) : isError ? (
        <>
          <HubHero>
            <HubEyebrow>{eyebrow}</HubEyebrow>
            <HubTitle>{name ? t('greeting', { name }) : t('greetingNoName')}</HubTitle>
          </HubHero>
          <SectionError error={error} fallback={t('errors.venues')} />
        </>
      ) : venues.length === 0 || !selectedVenueId ? (
        <>
          <HubHero>
            <HubEyebrow>{eyebrow}</HubEyebrow>
            <HubTitle>{name ? t('greeting', { name }) : t('greetingNoName')}</HubTitle>
          </HubHero>
          <p className="py-6 text-center text-base text-muted-foreground">
            {venues.length === 0 ? t('venueNone') : t('venuePrompt')}
          </p>
        </>
      ) : (
        <DashboardBody
          venueId={selectedVenueId}
          timeZone={timeZone}
          eyebrow={eyebrow}
          name={name}
        />
      )}
    </HubPage>
  );
}
```

If `session.claims.name` is typed as `string | undefined` the `?? null` is needed; if it is already `string | null`, drop it. The `tMembers(`status.${status}`)` call takes the same cast as in Task 5 if next-intl's typed keys reject the template.

- [ ] **Step 6: Delete the replaced files**

```bash
git rm "apps/owner/app/(app)/dashboard/today-schedule.tsx" "apps/owner/app/(app)/dashboard/recent-checkins.tsx"
```

- [ ] **Step 7: Full owner gate**

Run: `pnpm exec prettier --write "apps/owner/app/(app)/page.tsx" "apps/owner/app/(app)/dashboard/"*.ts "apps/owner/app/(app)/dashboard/"*.tsx && pnpm check:design && pnpm --filter @iziwellpass/owner typecheck && pnpm --filter @iziwellpass/owner lint && pnpm --filter @iziwellpass/owner test`
Expected: all green — this is the first task after Task 2 where the owner typecheck must be fully clean. Also `grep -rn "dashboard.checkins\|'checkins.title'\|schedule.title\|register.title\|walkin.member'" apps/owner/app apps/owner/components` must return nothing.

- [ ] **Step 8: Commit**

```bash
git add "apps/owner/app/(app)/page.tsx" "apps/owner/app/(app)/dashboard/use-dashboard-data.ts" "apps/owner/app/(app)/dashboard/kpi-row.tsx" "apps/owner/app/(app)/dashboard/today-tiles.tsx" "apps/owner/app/(app)/dashboard/starter.tsx"
git commit -m "feat(owner): dashboard as a hub — greeting, command bar, strip, session tiles, feed tab, tile starter"
```

---

### Task 7: Auth on the wash — layout, `AuthCard`, login, new password, signup

**Files:**
- Rewrite: `apps/owner/app/(auth)/layout.tsx`
- Rewrite: `apps/owner/components/auth-card.tsx`
- Rewrite: `apps/owner/components/auth-card-skeleton.tsx`
- Modify: `apps/owner/components/password-checklist.tsx`
- Modify: `apps/owner/app/(auth)/login/page.tsx`
- Modify: `apps/owner/app/(auth)/signup/page.tsx`

**Interfaces:**
- Consumes: `Wash`, `Wordmark`, `Alert`, `AlertDescription`, `Button`, `Input`, `PasswordInput`, `PasswordChecklist`, message keys `auth.login.title` (« Bon retour »), `auth.signup.subtitle`, `auth.signup.sentBody` (Task 2).
- Produces: `AuthCard({ title, subtitle?, media?, children, footer? })`; `AuthCardSkeleton()`; `AuthFormSkeleton()`. Task 8 reuses `AuthCard` on the onboarding page.

- [ ] **Step 1: The auth layout**

`apps/owner/app/(auth)/layout.tsx`:

```tsx
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { Wash } from '@iziwellpass/ui/components/wash';
import { Wordmark } from '@iziwellpass/ui/components/wordmark';

/**
 * The auth surface: the lavis wash at the top of the viewport, a 400px column
 * vertically centred — wordmark, the screen, the help line — on the white
 * page. No card, no band, no border (The No-Box Rule). `overflow-hidden`
 * keeps the wash from adding a scrollbar.
 */
export default async function AuthLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations('auth');

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10">
      <Wash />
      <div className="relative flex w-full max-w-[400px] flex-col items-center gap-10">
        <Wordmark name="IziWellPass" />
        {children}
        <p className="text-center text-sm text-muted-foreground">{t('footer')}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `AuthCard`, centred, with a media slot**

`apps/owner/components/auth-card.tsx`:

```tsx
import type { ReactNode } from 'react';

/**
 * One auth screen: an optional 56px medallion, a 36px light title and an
 * atténué subtitle centred over the form, then the footer link row. The
 * wordmark and the help line belong to the (auth) layout.
 */
export function AuthCard({
  title,
  subtitle,
  media,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  media?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-7">
      {media ? (
        <div className="flex justify-center">
          <div
            aria-hidden="true"
            className="flex size-14 items-center justify-center rounded-full bg-tint-bleu text-foreground [&_svg]:size-[22px]"
          >
            {media}
          </div>
        </div>
      ) : null}
      <div className="flex flex-col items-center gap-2.5 text-center">
        <h1 className="text-display-sm font-normal">{title}</h1>
        {subtitle ? <p className="text-base text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div>{children}</div>
      {footer ? <div className="text-center text-md text-muted-foreground">{footer}</div> : null}
    </div>
  );
}
```

- [ ] **Step 3: The skeleton mirrors the centred head**

`apps/owner/components/auth-card-skeleton.tsx`:

```tsx
import { Skeleton } from '@iziwellpass/ui/components/skeleton';

/** Two labelled pill fields plus a submit pill, matching an auth form body. */
export function AuthFormSkeleton() {
  return (
    <div className="grid gap-[18px]" aria-hidden>
      <div className="grid gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
      <div className="grid gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
      <Skeleton className="h-11 w-full rounded-full" />
    </div>
  );
}

/**
 * Placeholder shown while an auth screen's client component resolves (it reads
 * search params, so it can't render on the server). Mirrors the AuthCard shape
 * — centred title and subtitle, then the form body — so the layout doesn't jump.
 */
export function AuthCardSkeleton() {
  return (
    <div className="flex w-full flex-col gap-7" aria-hidden>
      <div className="flex flex-col items-center gap-2.5">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-5 w-72" />
      </div>
      <AuthFormSkeleton />
    </div>
  );
}
```

- [ ] **Step 4: Checklist icons**

In `apps/owner/components/password-checklist.tsx`:

- change the lucide import to `import { CircleCheckIcon, CircleIcon } from 'lucide-react';`
- change the `<li>` class from `'flex items-center gap-2 text-sm transition-colors'` to `'flex items-center gap-2 text-base transition-colors'`
- replace the `<CheckIcon … />` element with:

```tsx
            {satisfied ? (
              <CircleCheckIcon aria-hidden className="size-4 shrink-0 text-success-foreground" />
            ) : (
              <CircleIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            )}
```

- [ ] **Step 5: Login**

In `apps/owner/app/(auth)/login/page.tsx`:

1. Add to the imports: `import { ArrowLeftIcon, CircleCheckIcon } from 'lucide-react';` and `import { Alert, AlertDescription } from '@iziwellpass/ui/components/alert';`.
2. In `NewPasswordCard`: the form class `grid gap-4` → `grid gap-[18px]`; remove `className="h-11"` from both `PasswordInput`s (fields are 48px by default); replace the back button with:

```tsx
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={onBack}
            disabled={pending}
          >
            <ArrowLeftIcon aria-hidden="true" />
            {t('newPassword.back')}
          </Button>
```

   and drop `className="h-11 w-full"` → `className="w-full"` on the submit.
3. In `CredentialsCard`: the form class `grid gap-4` → `grid gap-[18px]`; replace the onboarded notice `<p className="rounded-xl bg-secondary p-3 …">…</p>` with:

```tsx
          {onboarded ? (
            <Alert variant="success">
              <CircleCheckIcon aria-hidden="true" />
              <AlertDescription>{t('login.onboardedNotice')}</AlertDescription>
            </Alert>
          ) : null}
```

   remove `className="h-11"` from the e-mail `Input` and the `PasswordInput`; change the submit to `className="w-full"`. The forgot-password block, the root error and the footer stay as they are (the footer's inner `<p className="text-sm …">` becomes `<p>` — the `AuthCard` footer already sets the size and colour).

- [ ] **Step 6: Signup**

In `apps/owner/app/(auth)/signup/page.tsx`:

1. Add `import { MailIcon } from 'lucide-react';`.
2. The footer's `<p className="text-sm text-muted-foreground">` becomes `<p>`.
3. The sent state becomes:

```tsx
  if (sentTo) {
    return (
      <AuthCard
        media={<MailIcon />}
        title={t('signup.sentTitle')}
        subtitle={t('signup.sentBody', { email: sentTo })}
        footer={footer}
      >
        <Button asChild className="w-full">
          <Link href="/login">{t('signup.signin')}</Link>
        </Button>
      </AuthCard>
    );
  }
```

4. In the form: `className="grid gap-4"` → `className="grid gap-[18px]"`; the names row `grid grid-cols-2 gap-4` stays; remove `className="h-11"` from the three `Input`s; the submit `className="h-11 w-full"` → `className="w-full"`.

- [ ] **Step 7: Gate**

Run: `pnpm exec prettier --write "apps/owner/app/(auth)/layout.tsx" "apps/owner/app/(auth)/login/page.tsx" "apps/owner/app/(auth)/signup/page.tsx" apps/owner/components/auth-card.tsx apps/owner/components/auth-card-skeleton.tsx apps/owner/components/password-checklist.tsx && pnpm check:design && pnpm --filter @iziwellpass/owner typecheck && pnpm --filter @iziwellpass/owner lint`
Expected: green. `grep -rn "h-11" "apps/owner/app/(auth)"` returns nothing.

- [ ] **Step 8: Commit**

```bash
git add "apps/owner/app/(auth)/layout.tsx" "apps/owner/app/(auth)/login/page.tsx" "apps/owner/app/(auth)/signup/page.tsx" apps/owner/components/auth-card.tsx apps/owner/components/auth-card-skeleton.tsx apps/owner/components/password-checklist.tsx
git commit -m "feat(owner): auth screens on the wash — centred 400px column, 36px title, medallion, circle checklist"
```

---

### Task 8: Onboarding, screenshots, full gate

**Files:**
- Rewrite: `apps/owner/app/(onboarding)/layout.tsx`
- Modify: `apps/owner/app/(onboarding)/onboarding/page.tsx`

**Interfaces:**
- Consumes: `Wash`, `Wordmark`, `AuthCard` (Task 7), `Skeleton`.

- [ ] **Step 1: Onboarding layout**

`apps/owner/app/(onboarding)/layout.tsx`:

```tsx
import type { ReactNode } from 'react';

import { Wash } from '@iziwellpass/ui/components/wash';
import { Wordmark } from '@iziwellpass/ui/components/wordmark';

// Same surface as (auth) at 620px — deliberately NOT the AppShell: a
// signed-in-but-role-less user has nothing to navigate to yet. Session
// presence is enforced by middleware (see apps/owner/middleware.ts); the page
// re-checks client-side for the loading/signed-out/has-role branches.
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10">
      <Wash />
      <div className="relative flex w-full max-w-[620px] flex-col items-center gap-10">
        <Wordmark name="IziWellPass" />
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Onboarding page**

In `apps/owner/app/(onboarding)/onboarding/page.tsx`:

1. Remove the `Card, CardContent, CardDescription, CardHeader, CardTitle` import; add `import { AuthCard } from '@/components/auth-card';`.
2. Replace `LoadingShell` with:

```tsx
function LoadingShell() {
  return (
    <div className="grid w-full gap-[18px]" aria-hidden>
      <Skeleton className="h-12 w-full rounded-full" />
      <Skeleton className="h-12 w-full rounded-full" />
      <Skeleton className="h-12 w-full rounded-full" />
    </div>
  );
}
```

3. The form element's class `grid gap-4 sm:grid-cols-2` → `grid gap-x-4 gap-y-[18px] sm:grid-cols-2`.
4. The submit block becomes:

```tsx
        <div className="grid gap-4 sm:col-span-2">
          <Button type="submit" disabled={onboard.isPending} className="w-full">
            {onboard.isPending ? t('submitting') : t('submit')}
          </Button>
          <p className="text-center text-sm text-muted-foreground">{t('whatsNext')}</p>
        </div>
```

5. The page's final return becomes:

```tsx
  return (
    <AuthCard title={t('title')} subtitle={t('subtitle')}>
      <OnboardingForm />
    </AuthCard>
  );
```

- [ ] **Step 3: Full gate**

Make sure no dev server of this checkout is running (`lsof -nP -iTCP:3021 -sTCP:LISTEN` returns nothing), then:

Run: `pnpm exec prettier --write "apps/owner/app/(onboarding)/layout.tsx" "apps/owner/app/(onboarding)/onboarding/page.tsx" && pnpm check:design && pnpm build && pnpm typecheck && pnpm lint && pnpm test`
Expected: all green. Then `grep -rn "components/card'" "apps/owner/app/(app)/page.tsx" "apps/owner/app/(app)/checkins" "apps/owner/app/(app)/dashboard" "apps/owner/app/(auth)" "apps/owner/app/(onboarding)"` returns nothing (no Card on a hub).

- [ ] **Step 4: Commit the onboarding change**

```bash
git add "apps/owner/app/(onboarding)/layout.tsx" "apps/owner/app/(onboarding)/onboarding/page.tsx"
git commit -m "feat(owner): onboarding on the wash — 620px column, no card"
```

- [ ] **Step 5: Screenshots against the canvas**

Start the mock API and the owner dev server (from the repo root, in the background):

```bash
PORT=8090 pnpm --filter @iziwellpass/owner dev:mock &
API_PROXY_TARGET=http://localhost:8090 NEXT_PUBLIC_API_BASE_URL=/api/backend NEXT_PUBLIC_AUTH_MOCK=1 pnpm --filter @iziwellpass/owner exec next dev --port 3021 &
```

Wait for `Ready` on 3021, then capture with headless Chrome (one command per screen; the preview automation in this environment does not work on this port):

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
mkdir -p /tmp/sp-b-shots
for s in "login:/login" "onboarded:/login?onboarded=1" "signup:/signup" "onboarding:/onboarding" "dashboard:/" "frontdesk:/checkins"; do
  name=${s%%:*}; path=${s#*:}
  "$CHROME" --headless=new --hide-scrollbars --window-size=1440,900 --screenshot=/tmp/sp-b-shots/$name.png "http://localhost:3021$path" 2>/dev/null
done
"$CHROME" --headless=new --hide-scrollbars --window-size=390,844 --screenshot=/tmp/sp-b-shots/frontdesk-mobile.png "http://localhost:3021/checkins" 2>/dev/null
```

Read each PNG and compare against `docs/design-refs/comptoir-clair/`: `T9KwQ.png` (login, and the success notice with `?onboarded=1`), `JCot2.png` (signup), `tZ9zj.png` (onboarding), `ssgpT.png` (dashboard), `jhjgK.png` (front desk), `oHqxA.png` (front desk mobile). The signup sent state and the walk-in mode need interaction; if the authenticated pages redirect to `/login` because the mock session does not satisfy the middleware, record that in the ledger and stop — the reviewer covers those screens from code. Stop both servers afterwards (`kill %1 %2`).

Checklist per screen: wash visible only at `md+`; one dark control; 44/32px title; the bar 720px at 60px; stats centred on a hairline strip; pills for the tabs/modes; tiles 24px radius with the tint rotation; feed rows 60px with hairlines; no border around any group; French sentence case throughout.

- [ ] **Step 6: Record findings**

Anything off goes into the ledger as a note for the whole-branch review's fix wave; nothing is fixed silently in this task.
