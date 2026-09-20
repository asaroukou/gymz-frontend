# « Le comptoir clair » SP-C, plan C1 — Working Screens (primitives, planning, members) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the owner app's planning and members screens exactly as drawn on the canvas, on top of new working-screen primitives in `packages/ui`.

**Architecture:** Three new ui modules (`working-page.tsx` family, `pagination.tsx`, `day-toggle.tsx`) plus an in-place restyle of `Table`, `Dialog` and `Sheet` carry the working-screen chrome. Pure helpers (`paginate`, `roleBadgeVariant`, `slotBadgeVariant`/`bookingBadgeVariant`, `subscriptionTone`, `isExpiringSoon`) live in `apps/owner/lib/` under node tests. The planning tab files, the members directory and the member detail page are rewritten as small files composed from those pieces. Data hooks, mutations and validation schemas move between files but do not change.

**Tech Stack:** Next 15 / React 19, Tailwind v4 (`@theme inline`), Radix (Dialog, DropdownMenu, Tabs, Popover), react-query, react-hook-form + zod, next-intl, sonner, vitest (jsdom in `packages/ui`, node in `apps/owner`, jsdom in `apps/admin`).

**Spec:** `docs/superpowers/specs/2026-09-20-comptoir-clair-working-screens-design.md` (decisions D1–D10; this plan covers §3, §4, §5, §6 and the C1 half of §9/§12).

## Global Constraints

- The canvas `screens.pen` is the source of truth; C1 frames are `oouHs`, `s8ABF`, `jFogY`, `skmEM`, `xLxJY`, `nVkMG`, `L6sMyP`, `WYHdY` (PNGs in `docs/design-refs/comptoir-clair/`).
- Font weights 400/500/600 only (`font-normal`, `font-medium`, `font-semibold`); sentence case; no uppercase; no `Card` on any C1 page after Task 8; no bordered box around content; hairlines only between rows (`border-b border-border`, never around a group).
- One dark 44px control per surface (page, dialog, sheet). Dark *small* (36px) buttons inside a section or sheet row, and the dark round « + » in the participants sheet, are allowed where the canvas draws them (spec D1).
- Status tints are never used as text colour (`text-destructive`, `text-success`, `text-warning`, `text-info` are forbidden; use the `-foreground` stops).
- Type scale: `text-xs` 12, `text-sm` 13, `text-md` 14, `text-base` 15, `text-lg` 16, `text-xl` 22, `text-2xl` 32. Sizes the scale lacks use arbitrary values: `text-[1.125rem]` (18), `text-[1.5rem]` (24), `text-[1.75rem]` (28).
- Radii: `rounded-2xl` is 1.75rem (dialog), `rounded-xl` 1.5rem (tiles), `rounded-lg` 1.25rem (subscription tiles, selected rows), `rounded-full` (every control).
- `apps/owner/messages/fr.json` and `en.json` change together; a key present in one and not the other is a defect. Do not delete keys in C1 (spec D4); orphans are handled in the final fix wave.
- Owner unit tests live in `apps/owner/lib/**/*.test.ts` (node environment, no React); ui and admin tests are jsdom.
- Gates before every commit: `pnpm check:design && pnpm typecheck && pnpm lint && pnpm test` from the repo root. `pnpm build` in Task 8 only. Never run `next build` while a dev server of the same checkout is running.
- Prettier formats changed files (`pnpm exec prettier --write <files>`); it is not a repo gate.
- Commits use explicit pathspecs (`git add <files>`), never `git add -A` or a bare `git commit -a`.
- Members paging is client-side, page size 20, footer counts exact (spec D2). Expired/exhausted/cancelled subscription tiles render `bg-secondary` (spec D10). Mobile (< `md`) renders stacked hairline rows, not cards (spec D6).

---

### Task 1: ui — `WorkingPage` family + admin registry entry and specimen

**Files:**
- Create: `packages/ui/src/components/working-page.tsx`
- Create: `packages/ui/src/components/working-page.test.tsx`
- Modify: `apps/admin/lib/design-registry.ts` (add one entry after `wash`)
- Modify: `apps/admin/app/design/primitives/display.tsx` (import + one `Section` after `wash`)

**Interfaces:**
- Produces: `WorkingPage`, `WorkingHeader({ title, subtitle?, action?, badges? })`, `BackLink({ href, linkComponent?, children })`, `SectionHeading({ title, description?, action? })`, `KeyValueList`, `KeyValueRow({ label, children })`. Tasks 4–8 consume all of them.

- [ ] **Step 1: Write the failing test**

`packages/ui/src/components/working-page.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  BackLink,
  KeyValueList,
  KeyValueRow,
  SectionHeading,
  WorkingHeader,
  WorkingPage,
} from './working-page';

describe('WorkingPage', () => {
  it('is a vertical stack with a 32px rhythm', () => {
    const { container } = render(<WorkingPage>x</WorkingPage>);
    const el = container.querySelector('[data-slot="working-page"]') as HTMLElement;
    expect(el.className).toContain('gap-8');
    expect(el.className).toContain('flex-col');
  });

  it('header renders the 32px title, the subtitle, one action and badges', () => {
    render(
      <WorkingHeader
        title="Membres"
        subtitle="128 membres"
        action={<button>Ajouter un membre</button>}
        badges={<span>Actif</span>}
      />,
    );
    const h1 = screen.getByRole('heading', { level: 1, name: 'Membres' });
    expect(h1.className).toContain('text-2xl');
    expect(h1.className).toContain('font-normal');
    expect(screen.getByText('128 membres').className).toContain('text-muted-foreground');
    expect(screen.getByRole('button', { name: 'Ajouter un membre' })).toBeTruthy();
    expect(screen.getByText('Actif').parentElement?.dataset.slot).toBe('working-header-badges');
  });

  it('header omits the subtitle node when none is given', () => {
    const { container } = render(<WorkingHeader title="Planning" />);
    expect(container.querySelectorAll('p')).toHaveLength(0);
  });

  it('BackLink renders a plain anchor by default and the given link component otherwise', () => {
    const { rerender } = render(<BackLink href="/members">Retour aux membres</BackLink>);
    const anchor = screen.getByRole('link', { name: 'Retour aux membres' });
    expect(anchor.getAttribute('href')).toBe('/members');
    expect(anchor.className).toContain('text-muted-foreground');
    expect(anchor.querySelector('svg')).not.toBeNull();

    const Fake = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
      <a data-fake href={href} className={className}>
        {children}
      </a>
    );
    rerender(
      <BackLink href="/venues" linkComponent={Fake}>
        Retour
      </BackLink>,
    );
    expect(screen.getByRole('link', { name: 'Retour' }).hasAttribute('data-fake')).toBe(true);
  });

  it('SectionHeading renders an h2 at 22px with an optional description and action', () => {
    render(
      <SectionHeading
        title="Abonnements"
        description="Les formules achetées par ce membre."
        action={<button>Attribuer</button>}
      />,
    );
    const h2 = screen.getByRole('heading', { level: 2, name: 'Abonnements' });
    expect(h2.className).toContain('text-xl');
    expect(h2.className).toContain('font-medium');
    expect(screen.getByText('Les formules achetées par ce membre.').className).toContain('text-md');
    expect(screen.getByRole('button', { name: 'Attribuer' })).toBeTruthy();
  });

  it('KeyValueList draws hairlines between rows only and right-aligns values', () => {
    const { container } = render(
      <KeyValueList>
        <KeyValueRow label="Type">Mensuel</KeyValueRow>
        <KeyValueRow label="Début">1 sept. 2026</KeyValueRow>
      </KeyValueList>,
    );
    const list = container.querySelector('dl') as HTMLElement;
    expect(list.className).toContain('[&>*+*]:border-t');
    expect(list.className).not.toContain('rounded');
    const rows = container.querySelectorAll('[data-slot="key-value-row"]');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.className).toContain('min-h-[42px]');
    const dd = screen.getByText('Mensuel');
    expect(dd.tagName).toBe('DD');
    expect(dd.className).toContain('text-right');
    expect(dd.className).toContain('font-medium');
    expect(screen.getByText('Type').tagName).toBe('DT');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @iziwellpass/ui exec vitest run src/components/working-page.test.tsx`
Expected: FAIL — cannot resolve `./working-page`.

- [ ] **Step 3: Write the primitives**

`packages/ui/src/components/working-page.tsx`:

```tsx
import * as React from 'react';
import { ArrowLeftIcon } from 'lucide-react';

import { cn } from '@iziwellpass/ui/lib/utils';

/**
 * Working-screen chrome (DESIGN.md « working density »): a 32px vertical
 * rhythm, a light 32px title with one dark action, 14px back links, 22px
 * section titles and key/value hairline rows. No boxes anywhere.
 */
function WorkingPage({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="working-page"
      className={cn('flex w-full flex-col gap-8', className)}
      {...props}
    />
  );
}

function WorkingHeader({
  title,
  subtitle,
  action,
  badges,
  className,
  ...props
}: Omit<React.ComponentProps<'header'>, 'title'> & {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** The one dark 44px control of the page, bottom-aligned with the title block. */
  action?: React.ReactNode;
  /** Detail-page variant: status badges bottom-aligned on the right. */
  badges?: React.ReactNode;
}) {
  return (
    <header
      data-slot="working-header"
      className={cn('flex flex-wrap items-end justify-between gap-4', className)}
      {...props}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <h1 className="text-2xl font-normal">{title}</h1>
        {subtitle ? <p className="text-base text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action ? (
        <div data-slot="working-header-action" className="flex shrink-0 items-center gap-2">
          {action}
        </div>
      ) : null}
      {badges ? (
        <div data-slot="working-header-badges" className="flex shrink-0 items-center gap-2 self-end">
          {badges}
        </div>
      ) : null}
    </header>
  );
}

type LinkLike = React.ComponentType<{
  href: string;
  className?: string;
  children: React.ReactNode;
}>;

const DefaultLink: LinkLike = ({ href, className, children }) => (
  <a href={href} className={className}>
    {children}
  </a>
);

function BackLink({
  href,
  linkComponent,
  className,
  children,
}: {
  href: string;
  /** Pass Next's `Link` from an app; defaults to a plain anchor. */
  linkComponent?: LinkLike;
  className?: string;
  children: React.ReactNode;
}) {
  const Comp = linkComponent ?? DefaultLink;
  return (
    <Comp
      href={href}
      className={cn(
        'inline-flex w-fit items-center gap-1.5 text-md text-muted-foreground transition-colors hover:text-foreground',
        className,
      )}
    >
      <ArrowLeftIcon className="size-4" aria-hidden />
      {children}
    </Comp>
  );
}

function SectionHeading({
  title,
  description,
  action,
  className,
  ...props
}: Omit<React.ComponentProps<'div'>, 'title'> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      data-slot="section-heading"
      className={cn('flex items-start justify-between gap-4', className)}
      {...props}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-xl font-medium">{title}</h2>
        {description ? <p className="text-md text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function KeyValueList({ className, ...props }: React.ComponentProps<'dl'>) {
  return (
    <dl
      data-slot="key-value-list"
      className={cn('flex flex-col [&>*+*]:border-t [&>*+*]:border-border', className)}
      {...props}
    />
  );
}

function KeyValueRow({
  label,
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & { label: React.ReactNode }) {
  return (
    <div
      data-slot="key-value-row"
      className={cn('flex min-h-[42px] items-center justify-between gap-6 py-3', className)}
      {...props}
    >
      <dt className="shrink-0 text-base text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right text-base font-medium">{children}</dd>
    </div>
  );
}

export { WorkingPage, WorkingHeader, BackLink, SectionHeading, KeyValueList, KeyValueRow };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @iziwellpass/ui exec vitest run src/components/working-page.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Register the primitive in admin `/design`**

In `apps/admin/lib/design-registry.ts`, after `{ id: 'wash', title: 'Lavis', group: 'display' },` add:

```ts
  { id: 'working-page', title: 'Page de travail', group: 'display' },
```

In `apps/admin/app/design/primitives/display.tsx`, add the import next to the `hub-page` import:

```tsx
import {
  BackLink,
  KeyValueList,
  KeyValueRow,
  SectionHeading,
  WorkingHeader,
  WorkingPage,
} from '@iziwellpass/ui/components/working-page';
```

and, after the `wash` `</Section>`, before the closing `</>`:

```tsx
      <Section
        id="working-page"
        number={number('working-page')}
        title="Page de travail"
        note="Les écrans de travail (planning, membres, équipe, établissements) : un titre 32 léger, une action sombre, un lien de retour 14, des titres de section 22 et des lignes clé/valeur entre filets."
      >
        <Specimen
          name="WorkingPage"
          signature="WorkingHeader, BackLink, SectionHeading, KeyValueList, KeyValueRow"
        >
          <WorkingPage className="max-w-[640px]">
            <BackLink href="#working-page">Retour aux membres</BackLink>
            <WorkingHeader
              title="Awa Ndiaye"
              subtitle="Membre depuis le 3 mars 2026"
              badges={
                <>
                  <Badge variant="success">Actif</Badge>
                  <Badge>Mensuel</Badge>
                </>
              }
            />
            <div className="flex flex-col gap-4">
              <SectionHeading
                title="Adhésion"
                description="Ce que le membre a acheté et jusqu’à quand."
                action={
                  <Button variant="secondary" size="sm">
                    <PlusIcon />
                    Attribuer une formule
                  </Button>
                }
              />
              <KeyValueList>
                <KeyValueRow label="Type">Mensuel</KeyValueRow>
                <KeyValueRow label="Début">1 sept. 2026</KeyValueRow>
                <KeyValueRow label="Statut">
                  <Badge variant="success">Actif</Badge>
                </KeyValueRow>
              </KeyValueList>
            </div>
          </WorkingPage>
        </Specimen>
      </Section>
```

`Badge`, `Button` and `PlusIcon` are already imported in `display.tsx`; if `Button` is not, add `import { Button } from '@iziwellpass/ui/components/button';`.

- [ ] **Step 6: Run the gates**

Run: `pnpm check:design && pnpm typecheck && pnpm lint && pnpm test`
Expected: all green; `apps/admin` `design-registry.test.ts` passes with the new entry.

- [ ] **Step 7: Format and commit**

```bash
pnpm exec prettier --write packages/ui/src/components/working-page.tsx packages/ui/src/components/working-page.test.tsx apps/admin/lib/design-registry.ts apps/admin/app/design/primitives/display.tsx
git add packages/ui/src/components/working-page.tsx packages/ui/src/components/working-page.test.tsx apps/admin/lib/design-registry.ts apps/admin/app/design/primitives/display.tsx
git commit -m "feat(ui): WorkingPage family (header, back link, section heading, key/value rows) + /design specimen"
```

---

### Task 2: ui — `Pagination` and `DayToggle` + registry entries and specimens

**Files:**
- Create: `packages/ui/src/components/pagination.tsx`, `packages/ui/src/components/pagination.test.tsx`
- Create: `packages/ui/src/components/day-toggle.tsx`, `packages/ui/src/components/day-toggle.test.tsx`
- Modify: `apps/admin/lib/design-registry.ts` (two entries in the controls block after `dropdown-menu`)
- Modify: `apps/admin/app/design/primitives/controls.tsx` (imports + two `Section`s after `tabs`)

**Interfaces:**
- Produces: `pageItems(page, pageCount): Array<number | 'ellipsis'>`, `Pagination({ page, pageCount, onPageChange, labels: { label, previous, next, page(n) }, className? })` (Task 7); `DayToggle<T>({ days: {value, short, long}[], value: T[], onChange(next: T[]), disabled?, className?, 'aria-labelledby'? })` (Task 6).

- [ ] **Step 1: Write the failing tests**

`packages/ui/src/components/pagination.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Pagination, pageItems } from './pagination';

const labels = {
  label: 'Pagination',
  previous: 'Page précédente',
  next: 'Page suivante',
  page: (n: number) => `Page ${n}`,
};

describe('pageItems', () => {
  it('is empty for a single page', () => {
    expect(pageItems(1, 1)).toEqual([]);
    expect(pageItems(1, 0)).toEqual([]);
  });
  it('keeps first, last and the current neighbourhood with ellipses in the gaps', () => {
    expect(pageItems(1, 13)).toEqual([1, 2, 'ellipsis', 13]);
    expect(pageItems(7, 13)).toEqual([1, 'ellipsis', 6, 7, 8, 'ellipsis', 13]);
    expect(pageItems(13, 13)).toEqual([1, 'ellipsis', 12, 13]);
    expect(pageItems(2, 3)).toEqual([1, 2, 3]);
    expect(pageItems(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('Pagination', () => {
  it('renders nothing for a single page', () => {
    const { container } = render(
      <Pagination page={1} pageCount={1} onPageChange={() => {}} labels={labels} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('marks the current page, disables prev at the start and reports clicks', () => {
    const onPageChange = vi.fn();
    render(<Pagination page={1} pageCount={13} onPageChange={onPageChange} labels={labels} />);
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeTruthy();
    const current = screen.getByRole('button', { name: 'Page 1' });
    expect(current.getAttribute('aria-current')).toBe('page');
    expect(current.className).toContain('bg-secondary');
    expect((screen.getByRole('button', { name: 'Page précédente' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Page suivante' }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Page 13' }));
    expect(onPageChange).toHaveBeenCalledWith(13);
    fireEvent.click(screen.getByRole('button', { name: 'Page suivante' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('disables next on the last page', () => {
    render(<Pagination page={3} pageCount={3} onPageChange={() => {}} labels={labels} />);
    expect((screen.getByRole('button', { name: 'Page suivante' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
```

`packages/ui/src/components/day-toggle.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DayToggle } from './day-toggle';

const DAYS = [
  { value: 'MO', short: 'L', long: 'Lundi' },
  { value: 'TU', short: 'M', long: 'Mardi' },
  { value: 'WE', short: 'M', long: 'Mercredi' },
] as const;

describe('DayToggle', () => {
  it('renders one 44px round pressed/unpressed button per day', () => {
    render(<DayToggle days={DAYS} value={['TU']} onChange={() => {}} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Mardi' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Lundi' }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('button', { name: 'Mardi' }).className).toContain('bg-primary');
    expect(screen.getByRole('button', { name: 'Lundi' }).className).toContain('size-11');
  });

  it('toggles and reports the next value in day order', () => {
    const onChange = vi.fn();
    render(<DayToggle days={DAYS} value={['WE']} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Lundi' }));
    expect(onChange).toHaveBeenCalledWith(['MO', 'WE']);
    fireEvent.click(screen.getByRole('button', { name: 'Mercredi' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('disables every day when disabled', () => {
    render(<DayToggle days={DAYS} value={[]} onChange={() => {}} disabled />);
    for (const button of screen.getAllByRole<HTMLButtonElement>('button')) expect(button.disabled).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @iziwellpass/ui exec vitest run src/components/pagination.test.tsx src/components/day-toggle.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write `pagination.tsx`**

```tsx
'use client';

import * as React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

import { Button } from '@iziwellpass/ui/components/button';
import { cn } from '@iziwellpass/ui/lib/utils';

export type PageItem = number | 'ellipsis';

/**
 * Which pills to show: always the first and last page, the current page and
 * its two neighbours, with an ellipsis wherever numbers are skipped. Empty when
 * there is only one page, so the component renders nothing.
 */
export function pageItems(page: number, pageCount: number): PageItem[] {
  if (pageCount <= 1) return [];
  const wanted = new Set<number>([1, pageCount]);
  for (let n = page - 1; n <= page + 1; n += 1) {
    if (n >= 1 && n <= pageCount) wanted.add(n);
  }
  const sorted = [...wanted].sort((a, b) => a - b);
  const items: PageItem[] = [];
  let previous = 0;
  for (const n of sorted) {
    if (previous > 0 && n - previous > 1) items.push('ellipsis');
    items.push(n);
    previous = n;
  }
  return items;
}

export interface PaginationLabels {
  /** `aria-label` of the nav landmark, e.g. « Pagination ». */
  label: string;
  previous: string;
  next: string;
  page: (n: number) => string;
}

export interface PaginationProps {
  /** 1-based. */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  labels: PaginationLabels;
  className?: string;
}

/** 36px prev/next icon buttons around 36px page pills; the current page is a grey pill. */
export function Pagination({ page, pageCount, onPageChange, labels, className }: PaginationProps) {
  const items = pageItems(page, pageCount);
  if (items.length === 0) return null;
  return (
    <nav data-slot="pagination" aria-label={labels.label} className={className}>
      <ul className="flex items-center gap-1">
        <li>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={labels.previous}
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeftIcon />
          </Button>
        </li>
        {items.map((item, index) =>
          item === 'ellipsis' ? (
            <li
              key={`ellipsis-${index}`}
              aria-hidden
              className="w-9 text-center text-md text-muted-foreground"
            >
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                aria-label={labels.page(item)}
                aria-current={item === page ? 'page' : undefined}
                className={cn(
                  'h-9 min-w-9 rounded-full px-2 font-numeric text-md text-muted-foreground transition-colors hover:bg-side',
                  item === page && 'bg-secondary font-semibold text-foreground hover:bg-secondary',
                )}
                onClick={() => onPageChange(item)}
              >
                {item}
              </button>
            </li>
          ),
        )}
        <li>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={labels.next}
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRightIcon />
          </Button>
        </li>
      </ul>
    </nav>
  );
}
```

- [ ] **Step 4: Write `day-toggle.tsx`**

```tsx
'use client';

import * as React from 'react';

import { cn } from '@iziwellpass/ui/lib/utils';

export interface DayToggleDay<T extends string> {
  value: T;
  /** One letter, shown in the pill. */
  short: string;
  /** Full name, the accessible label. */
  long: string;
}

export interface DayToggleProps<T extends string> extends Omit<
  React.ComponentProps<'div'>,
  'onChange' | 'value'
> {
  days: ReadonlyArray<DayToggleDay<T>>;
  value: ReadonlyArray<T>;
  /** Receives the selected days in the order of `days`, so a stored rule stays stable. */
  onChange: (next: T[]) => void;
  disabled?: boolean;
}

/** 44px round day pills: ink when pressed, grey pill when idle. */
export function DayToggle<T extends string>({
  days,
  value,
  onChange,
  disabled,
  className,
  ...props
}: DayToggleProps<T>) {
  const toggle = (day: T) => {
    const pressed = value.includes(day);
    onChange(
      days
        .map((d) => d.value)
        .filter((d) => (d === day ? !pressed : value.includes(d))),
    );
  };
  return (
    <div role="group" data-slot="day-toggle" className={cn('flex flex-wrap gap-2', className)} {...props}>
      {days.map((day) => {
        const pressed = value.includes(day.value);
        return (
          <button
            key={day.value}
            type="button"
            aria-pressed={pressed}
            aria-label={day.long}
            disabled={disabled}
            className={cn(
              'size-11 rounded-full text-md font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50',
              pressed
                ? 'bg-primary text-primary-foreground hover:bg-primary-hover'
                : 'bg-secondary text-foreground hover:bg-accent',
            )}
            onClick={() => toggle(day.value)}
          >
            {day.short}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @iziwellpass/ui exec vitest run src/components/pagination.test.tsx src/components/day-toggle.test.tsx`
Expected: PASS (8 tests).

- [ ] **Step 6: Register and add specimens**

`apps/admin/lib/design-registry.ts`, in the controls block after `{ id: 'dropdown-menu', ... },`:

```ts
  { id: 'pagination', title: 'Pagination', group: 'controls' },
  { id: 'day-toggle', title: 'Jours', group: 'controls' },
```

`apps/admin/app/design/primitives/controls.tsx`: add imports

```tsx
import { useState } from 'react';
import { DayToggle } from '@iziwellpass/ui/components/day-toggle';
import { Pagination } from '@iziwellpass/ui/components/pagination';
```

(`useState` may already be imported; merge.) Add two specimen components above `ControlSpecimens`:

```tsx
const WEEK = [
  { value: 'MO', short: 'L', long: 'Lundi' },
  { value: 'TU', short: 'M', long: 'Mardi' },
  { value: 'WE', short: 'M', long: 'Mercredi' },
  { value: 'TH', short: 'J', long: 'Jeudi' },
  { value: 'FR', short: 'V', long: 'Vendredi' },
  { value: 'SA', short: 'S', long: 'Samedi' },
  { value: 'SU', short: 'D', long: 'Dimanche' },
] as const;

function PaginationSpecimen() {
  const [page, setPage] = useState(1);
  return (
    <Pagination
      page={page}
      pageCount={13}
      onPageChange={setPage}
      labels={{
        label: 'Pagination',
        previous: 'Page précédente',
        next: 'Page suivante',
        page: (n) => `Page ${n}`,
      }}
    />
  );
}

function DayToggleSpecimen() {
  const [days, setDays] = useState<string[]>(['MO', 'WE', 'FR']);
  return <DayToggle days={WEEK} value={days} onChange={setDays} />;
}
```

and two sections after the `tabs` `</Section>`:

```tsx
      <Section
        id="pagination"
        number={number('pagination')}
        title="Pagination"
        note="Sous un tableau : flèches 36px et pastilles 36px, la page courante en pastille grise. Première, dernière, la page courante et ses voisines ; des points de suspension ailleurs."
      >
        <Specimen name="Pagination" signature="page, pageCount, onPageChange, labels">
          <PaginationSpecimen />
        </Specimen>
      </Section>

      <Section
        id="day-toggle"
        number={number('day-toggle')}
        title="Jours"
        note="Les jours d’un cours récurrent : sept pastilles rondes de 44px, encre quand le jour est choisi."
      >
        <Specimen name="DayToggle" signature="days, value, onChange, disabled">
          <DayToggleSpecimen />
        </Specimen>
      </Section>
```

- [ ] **Step 7: Run the gates**

Run: `pnpm check:design && pnpm typecheck && pnpm lint && pnpm test`
Expected: all green.

- [ ] **Step 8: Format and commit**

```bash
pnpm exec prettier --write packages/ui/src/components/pagination.tsx packages/ui/src/components/pagination.test.tsx packages/ui/src/components/day-toggle.tsx packages/ui/src/components/day-toggle.test.tsx apps/admin/lib/design-registry.ts apps/admin/app/design/primitives/controls.tsx
git add packages/ui/src/components/pagination.tsx packages/ui/src/components/pagination.test.tsx packages/ui/src/components/day-toggle.tsx packages/ui/src/components/day-toggle.test.tsx apps/admin/lib/design-registry.ts apps/admin/app/design/primitives/controls.tsx
git commit -m "feat(ui): Pagination and DayToggle primitives + /design specimens"
```

---

### Task 3: ui `Table` / `Dialog` / `Sheet` restyle, owner lib helpers, message keys

**Files:**
- Modify: `packages/ui/src/components/table.tsx`
- Create: `packages/ui/src/components/table.test.tsx`
- Modify: `packages/ui/src/components/dialog.tsx`
- Modify: `packages/ui/src/components/sheet.tsx`
- Create: `apps/owner/lib/paginate.ts`, `apps/owner/lib/paginate.test.ts`
- Create: `apps/owner/lib/role-badge.ts`, `apps/owner/lib/role-badge.test.ts`
- Create: `apps/owner/lib/slot-status.ts`, `apps/owner/lib/slot-status.test.ts`
- Create: `apps/owner/lib/subscription-tone.ts`, `apps/owner/lib/subscription-tone.test.ts`
- Modify: `apps/owner/lib/member-status.ts`, `apps/owner/lib/member-status.test.ts` (create the test if missing)
- Modify: `apps/owner/messages/fr.json`, `apps/owner/messages/en.json`

**Interfaces:**
- Produces: `paginate<T>(items, page, pageSize): { items, page, pageCount, total }`; `roleBadgeVariant(role): 'info' | 'default'`; `slotBadgeVariant(status)`, `bookingBadgeVariant(status)`: `'success' | 'warning' | 'info' | 'outline'`; `subscriptionTone(status, index): 'side' | number`; `isExpiringSoon(member): boolean`. Message keys `common.pagination.{label,previous,next,page}`, `members.footer`, `planning.bookings.eyebrow`.
- Nothing in `apps/owner/app` changes in this task; `planning-utils.ts` keeps its `BadgeSpec` helpers until Task 5 replaces their consumers.

- [ ] **Step 1: Write the failing ui table test**

`packages/ui/src/components/table.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

describe('Table (comptoir clair geometry)', () => {
  it('draws a 36px atténué header and 15px cells with 14px vertical padding', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Membre</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow data-state="selected">
            <TableCell>Awa Ndiaye</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const head = screen.getByText('Membre');
    expect(head.className).toContain('h-9');
    expect(head.className).toContain('text-sm');
    expect(head.className).toContain('text-muted-foreground');
    const cell = screen.getByText('Awa Ndiaye');
    expect(cell.className).toContain('py-[14px]');
    expect(cell.className).toContain('text-base');
    const row = cell.closest('tr') as HTMLElement;
    expect(row.className).toContain('data-[state=selected]:bg-secondary');
    expect(row.className).toContain('border-b');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @iziwellpass/ui exec vitest run src/components/table.test.tsx`
Expected: FAIL on `h-9` / `py-[14px]` / `bg-secondary`.

- [ ] **Step 3: Restyle `table.tsx`**

Replace the `TableRow`, `TableHead` and `TableCell` class strings:

```tsx
function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        // Hairline between rows; a selected row (participants sheet open) turns
        // into a grey pill with no hairline, rounded on its outer cells.
        'border-b border-border transition-colors data-[state=selected]:border-transparent data-[state=selected]:bg-secondary data-[state=selected]:[&>td:first-child]:rounded-l-lg data-[state=selected]:[&>td:last-child]:rounded-r-lg',
        className,
      )}
      {...props}
    />
  );
}
```

`TableHead`: change `h-11 px-3` to `h-9 px-3` (rest unchanged).

`TableCell`: change `'px-3 py-3 align-middle whitespace-nowrap ...'` to `'px-3 py-[14px] align-middle text-base whitespace-nowrap ...'` (rest unchanged).

- [ ] **Step 4: Run the ui table test to verify it passes**

Run: `pnpm --filter @iziwellpass/ui exec vitest run src/components/table.test.tsx`
Expected: PASS.

- [ ] **Step 5: Restyle `dialog.tsx`**

In `DialogContent`, replace the class string:

```tsx
'fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-6 rounded-2xl bg-card p-8 duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-[520px]'
```

(`sm:max-w-lg` → `sm:max-w-[520px]`; `rounded-2xl` is already the 1.75rem dialog token.) Change the close button's `absolute top-6 right-6` to `absolute top-7 right-7`. In `DialogHeader`, replace `'flex flex-col gap-2 text-center sm:text-left'` with `'flex flex-col gap-2 pr-10 text-left'`.

- [ ] **Step 6: Restyle `sheet.tsx`**

- `SheetContent` base class: `'fixed z-50 flex flex-col gap-4 bg-card ...'` → `'fixed z-50 flex flex-col gap-6 bg-card p-8 ...'` (the shell drawer passes `p-0`, which wins through `cn`).
- Close button: `absolute top-6 right-6` → `absolute top-7 right-7`.
- `SheetHeader`: `'flex flex-col gap-1.5 p-8 pb-0'` → `'flex flex-col gap-2 pr-10'`.
- `SheetFooter`: `'mt-auto flex flex-col gap-2 p-8 pt-0'` → `'mt-auto flex flex-col gap-2'`.
- `SheetTitle`: `'text-[1.5rem] leading-[1.2] font-medium text-foreground'` → `'text-[1.75rem] leading-[1.2] font-normal text-foreground'`.
- `SheetDescription`: `'text-base text-muted-foreground'` → `'text-base font-medium text-muted-foreground'`.

- [ ] **Step 7: Write the failing owner lib tests**

`apps/owner/lib/paginate.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { paginate } from './paginate';

const items = Array.from({ length: 45 }, (_, i) => i + 1);

describe('paginate', () => {
  it('slices the requested page and reports exact counts', () => {
    const page = paginate(items, 2, 20);
    expect(page.items).toEqual(items.slice(20, 40));
    expect(page.page).toBe(2);
    expect(page.pageCount).toBe(3);
    expect(page.total).toBe(45);
  });
  it('clamps the page into range', () => {
    expect(paginate(items, 0, 20).page).toBe(1);
    expect(paginate(items, 99, 20).page).toBe(3);
    expect(paginate(items, 99, 20).items).toEqual(items.slice(40));
  });
  it('has one empty page for no items', () => {
    const page = paginate([], 1, 20);
    expect(page).toEqual({ items: [], page: 1, pageCount: 1, total: 0 });
  });
  it('never divides by a zero page size', () => {
    expect(paginate(items, 1, 0).pageCount).toBe(45);
  });
});
```

`apps/owner/lib/role-badge.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { roleBadgeVariant } from './role-badge';

describe('roleBadgeVariant', () => {
  it('reads owner and admin as info, the rest as neutral', () => {
    expect(roleBadgeVariant('owner')).toBe('info');
    expect(roleBadgeVariant('admin')).toBe('info');
    expect(roleBadgeVariant('trainer')).toBe('default');
    expect(roleBadgeVariant('receptionist')).toBe('default');
  });
});
```

`apps/owner/lib/slot-status.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { bookingBadgeVariant, slotBadgeVariant } from './slot-status';

describe('slotBadgeVariant', () => {
  it('maps available → success, full → warning, cancelled → outline', () => {
    expect(slotBadgeVariant('available')).toBe('success');
    expect(slotBadgeVariant('full')).toBe('warning');
    expect(slotBadgeVariant('cancelled')).toBe('outline');
  });
});

describe('bookingBadgeVariant', () => {
  it('maps checked_in → success, confirmed → info, no_show → warning, cancelled → outline', () => {
    expect(bookingBadgeVariant('checked_in')).toBe('success');
    expect(bookingBadgeVariant('confirmed')).toBe('info');
    expect(bookingBadgeVariant('no_show')).toBe('warning');
    expect(bookingBadgeVariant('cancelled')).toBe('outline');
  });
});
```

`apps/owner/lib/subscription-tone.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { subscriptionTone } from './subscription-tone';

describe('subscriptionTone', () => {
  it('tints live subscriptions by index and greys every other status', () => {
    expect(subscriptionTone('active', 0)).toBe(0);
    expect(subscriptionTone('active', 3)).toBe(3);
    expect(subscriptionTone('expired', 1)).toBe('side');
    expect(subscriptionTone('exhausted', 1)).toBe('side');
    expect(subscriptionTone('cancelled', 1)).toBe('side');
  });
});
```

`apps/owner/lib/member-status.test.ts` (create if absent; append the `isExpiringSoon` block otherwise):

```ts
import { describe, expect, it } from 'vitest';
import type { Member } from '@iziwellpass/api/schemas';
import { isExpiringSoon, memberStatusBadgeVariant } from './member-status';

function member(overrides: Partial<Member>): Member {
  return {
    id: 'm1',
    tenant_id: 't1',
    first_name: 'Awa',
    last_name: 'Ndiaye',
    email: null,
    phone: null,
    membership_type: 'monthly',
    membership_status: 'active',
    membership_start: '2026-09-01',
    membership_end: null,
    access_scope: 'chain_wide',
    is_active: true,
    notes: null,
    created_at: '2026-03-03T00:00:00Z',
    updated_at: '2026-03-03T00:00:00Z',
    ...overrides,
  } as Member;
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('memberStatusBadgeVariant', () => {
  it('maps active → success, suspended → destructive, others → secondary', () => {
    expect(memberStatusBadgeVariant('active')).toBe('success');
    expect(memberStatusBadgeVariant('suspended')).toBe('destructive');
    expect(memberStatusBadgeVariant('expired')).toBe('secondary');
  });
});

describe('isExpiringSoon', () => {
  it('flags an active membership ending within 7 days', () => {
    expect(isExpiringSoon(member({ membership_end: daysFromNow(3) }))).toBe(true);
    expect(isExpiringSoon(member({ membership_end: daysFromNow(7) }))).toBe(true);
  });
  it('ignores far-off, past, missing, or non-active memberships', () => {
    expect(isExpiringSoon(member({ membership_end: daysFromNow(8) }))).toBe(false);
    expect(isExpiringSoon(member({ membership_end: daysFromNow(-1) }))).toBe(false);
    expect(isExpiringSoon(member({ membership_end: null }))).toBe(false);
    expect(
      isExpiringSoon(member({ membership_status: 'expired', membership_end: daysFromNow(2) })),
    ).toBe(false);
  });
});
```

If `Member` has fields the cast above omits, the `as Member` cast keeps the test compiling; do not widen the fixture.

- [ ] **Step 8: Run the owner tests to verify they fail**

Run: `pnpm --filter @iziwellpass/owner exec vitest run lib/paginate.test.ts lib/role-badge.test.ts lib/slot-status.test.ts lib/subscription-tone.test.ts lib/member-status.test.ts`

Expected: FAIL — modules/exports missing.

- [ ] **Step 9: Write the helpers**

`apps/owner/lib/paginate.ts`:

```ts
export interface Page<T> {
  items: T[];
  /** 1-based, clamped into `[1, pageCount]`. */
  page: number;
  pageCount: number;
  total: number;
}

/** Client-side paging (spec D2): exact counts, page clamped, size floored to ≥ 1. */
export function paginate<T>(items: readonly T[], page: number, pageSize: number): Page<T> {
  const total = items.length;
  const size = Math.max(1, Math.floor(pageSize) || 1);
  const pageCount = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  const start = (current - 1) * size;
  return { items: items.slice(start, start + size), page: current, pageCount, total };
}
```

`apps/owner/lib/role-badge.ts`:

```ts
import type { Staff } from '@iziwellpass/api/schemas';

/** Canvas `e0TehM`: Propriétaire and Admin read as info; every other role is neutral. */
export function roleBadgeVariant(role: Staff['role']): 'info' | 'default' {
  return role === 'owner' || role === 'admin' ? 'info' : 'default';
}
```

`apps/owner/lib/slot-status.ts`:

```ts
import type { BookingStatus, SlotStatus } from '@iziwellpass/api/schemas';

export type StatusBadgeVariant = 'success' | 'warning' | 'info' | 'outline';

/** Canvas `s8ABF`: Disponible (success), Complet (sable), Annulée (outline). */
export function slotBadgeVariant(status: SlotStatus): StatusBadgeVariant {
  switch (status) {
    case 'available':
      return 'success';
    case 'full':
      return 'warning';
    case 'cancelled':
    default:
      return 'outline';
  }
}

/** Canvas `skmEM`: Enregistré (success), Confirmé (info), Absent (sable), Annulé (outline). */
export function bookingBadgeVariant(status: BookingStatus): StatusBadgeVariant {
  switch (status) {
    case 'checked_in':
      return 'success';
    case 'confirmed':
      return 'info';
    case 'no_show':
      return 'warning';
    case 'cancelled':
    default:
      return 'outline';
  }
}
```

`apps/owner/lib/subscription-tone.ts`:

```ts
import type { SubscriptionStatus } from '@iziwellpass/api/schemas';

/**
 * Tile tone for a member subscription (canvas `L6sMyP`): live subscriptions
 * rotate through the pastels by index; expired, exhausted and cancelled ones
 * take the grey pill tone (`bg-secondary`, spec D10).
 */
export function subscriptionTone(status: SubscriptionStatus, index: number): 'side' | number {
  return status === 'active' ? index : 'side';
}
```

Append to `apps/owner/lib/member-status.ts`:

```ts
import type { Member } from '@iziwellpass/api/schemas';

import { daysUntilCalendarDate } from './datetime';

/** Number of days before the membership end date we flag it « Expire bientôt ». */
export const EXPIRING_SOON_DAYS = 7;

/** Active membership whose end date is within the next `EXPIRING_SOON_DAYS`. */
export function isExpiringSoon(member: Member): boolean {
  if (member.membership_status !== 'active') return false;
  const days = daysUntilCalendarDate(member.membership_end);
  return days !== null && days >= 0 && days <= EXPIRING_SOON_DAYS;
}
```

(Merge the two `import type ... from '@iziwellpass/api/schemas'` lines into one.)

- [ ] **Step 10: Run the owner tests to verify they pass**

Run: the same vitest command as Step 8.
Expected: PASS.

- [ ] **Step 11: Add the message keys (fr and en)**

`apps/owner/messages/fr.json`:
- in `common`, add `"pagination": { "label": "Pagination", "previous": "Page précédente", "next": "Page suivante", "page": "Page {n}" }`
- in `members`, add `"footer": "{shown, plural, one {# membre} other {# membres}} sur {total}"`
- in `planning.bookings`, add `"eyebrow": "{day} · {room}"`

`apps/owner/messages/en.json`:
- `common.pagination`: `{ "label": "Pagination", "previous": "Previous page", "next": "Next page", "page": "Page {n}" }`
- `members.footer`: `"{shown, plural, one {# member} other {# members}} of {total}"`
- `planning.bookings.eyebrow`: `"{day} · {room}"`

Edit the JSON in place (keep the file's 2-space formatting and key order; do not re-serialize the whole file). Then run the parity check:

```bash
node -e 'const f=require("./apps/owner/messages/fr.json"),e=require("./apps/owner/messages/en.json");const k=(o,p="")=>Object.entries(o).flatMap(([a,b])=>typeof b==="string"?[p+a]:k(b,p+a+"."));const F=new Set(k(f)),E=new Set(k(e));const d=[...F].filter(x=>!E.has(x)).concat([...E].filter(x=>!F.has(x)));if(d.length){console.error(d);process.exit(1)}console.log("parity ok")'
```

Expected: `parity ok`.

- [ ] **Step 12: Run the gates**

Run: `pnpm check:design && pnpm typecheck && pnpm lint && pnpm test`
Expected: all green. The admin `/design` dialog and sheet specimens still render (no API change).

- [ ] **Step 13: Format and commit**

```bash
pnpm exec prettier --write packages/ui/src/components/table.tsx packages/ui/src/components/table.test.tsx packages/ui/src/components/dialog.tsx packages/ui/src/components/sheet.tsx apps/owner/lib/paginate.ts apps/owner/lib/paginate.test.ts apps/owner/lib/role-badge.ts apps/owner/lib/role-badge.test.ts apps/owner/lib/slot-status.ts apps/owner/lib/slot-status.test.ts apps/owner/lib/subscription-tone.ts apps/owner/lib/subscription-tone.test.ts apps/owner/lib/member-status.ts apps/owner/lib/member-status.test.ts apps/owner/messages/fr.json apps/owner/messages/en.json
git add packages/ui/src/components/table.tsx packages/ui/src/components/table.test.tsx packages/ui/src/components/dialog.tsx packages/ui/src/components/sheet.tsx apps/owner/lib/paginate.ts apps/owner/lib/paginate.test.ts apps/owner/lib/role-badge.ts apps/owner/lib/role-badge.test.ts apps/owner/lib/slot-status.ts apps/owner/lib/slot-status.test.ts apps/owner/lib/subscription-tone.ts apps/owner/lib/subscription-tone.test.ts apps/owner/lib/member-status.ts apps/owner/lib/member-status.test.ts apps/owner/messages/fr.json apps/owner/messages/en.json
git commit -m "feat(ui,owner): table/dialog/sheet at canvas geometry; paging, badge and tone helpers; pagination keys"
```

---

### Task 4: Planning page header + recurring courses table

**Files:**
- Modify: `apps/owner/app/(app)/schedules/page.tsx` (rewrite)
- Modify: `apps/owner/app/(app)/schedules/schedules-tab.tsx` (rewrite)
- Modify: `apps/owner/app/(app)/schedules/schedule-dialogs.tsx` (one prop type only: `AddScheduleDialog.variant` becomes `'default' | 'secondary'`)
- Create: `apps/owner/components/rows-skeleton.tsx`

**Interfaces:**
- Consumes: `WorkingPage`, `WorkingHeader` (Task 1); restyled `Table` (Task 3); existing `AddScheduleDialog({ venueId, resources, staff, variant? })`, `EditScheduleDialog`, `DeleteScheduleDialog`, `usePlanningLabels().formatRecurrence`.
- Produces: `RowsSkeleton({ rows?, className? })` used by Tasks 5, 7, 8. `SchedulesTab({ venueId, canManage })` keeps its signature.

- [ ] **Step 1: Create `apps/owner/components/rows-skeleton.tsx`**

```tsx
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { cn } from '@iziwellpass/ui/lib/utils';

/** Loading rows at the hairline-table height (64px): avatar, a name, a right-hand value. */
export function RowsSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col', className)} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex h-16 items-center gap-4 border-b border-border last:border-0"
        >
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="ml-auto h-4 w-24" />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `schedules/page.tsx`**

```tsx
'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { unwrap } from '@iziwellpass/api/client';
import { useListResources, useListStaff } from '@iziwellpass/api/generated';
import { useRole } from '@iziwellpass/auth/provider';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@iziwellpass/ui/components/tabs';
import { WorkingHeader, WorkingPage } from '@iziwellpass/ui/components/working-page';

import { RequirePageAccess } from '@/components/page-access';
import { RowsSkeleton } from '@/components/rows-skeleton';
import { apiErrorMessage } from '@/lib/api-error';
import { useVenueContext } from '@/lib/venue-context';

import { AddScheduleDialog } from './schedule-dialogs';
import { SchedulesTab } from './schedules-tab';
import { SlotsTab } from './slots-tab';

type PlanningTab = 'courses' | 'slots';

function PlanningContent() {
  const t = useTranslations('planning');
  const role = useRole();
  const canManageSchedules = role === 'owner' || role === 'admin';
  const canManageBookings = role === 'owner' || role === 'admin' || role === 'receptionist';

  const { venues, isLoading, isError, error, selectedVenueId, selectedVenue } = useVenueContext();
  const timeZone = selectedVenue?.timezone;

  // The header's « Ajouter un cours » needs the venue's rooms and the staff
  // list; the tabs query the same keys, so react-query serves one fetch.
  const resourcesQuery = useListResources(selectedVenueId ?? '', {
    query: { select: unwrap, enabled: selectedVenueId != null },
  });
  const staffQuery = useListStaff({ query: { select: unwrap } });
  const resources = useMemo(() => resourcesQuery.data ?? [], [resourcesQuery.data]);
  const staff = useMemo(() => staffQuery.data ?? [], [staffQuery.data]);

  const [tab, setTab] = useState<PlanningTab>('courses');

  const action =
    canManageSchedules && selectedVenueId ? (
      <AddScheduleDialog venueId={selectedVenueId} resources={resources} staff={staff} />
    ) : null;

  return (
    <WorkingPage>
      <WorkingHeader title={t('title')} subtitle={t('subtitle')} action={action} />

      {isLoading ? (
        <div className="flex flex-col gap-8">
          <Skeleton className="h-10 w-64 rounded-full" />
          <RowsSkeleton />
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertTitle>{t('errorTitle')}</AlertTitle>
          <AlertDescription>{apiErrorMessage(error, t('venuesError'))}</AlertDescription>
        </Alert>
      ) : venues.length === 0 ? (
        <p className="py-12 text-center text-base text-muted-foreground">{t('venueNone')}</p>
      ) : !selectedVenueId ? (
        <p className="py-12 text-center text-base text-muted-foreground">{t('venuePrompt')}</p>
      ) : (
        <Tabs value={tab} onValueChange={(value) => setTab(value as PlanningTab)} className="gap-8">
          <TabsList aria-label={t('tabsLabel')}>
            <TabsTrigger value="courses">{t('tabs.courses')}</TabsTrigger>
            <TabsTrigger value="slots">{t('tabs.slots')}</TabsTrigger>
          </TabsList>
          <TabsContent value="courses">
            <SchedulesTab venueId={selectedVenueId} canManage={canManageSchedules} />
          </TabsContent>
          <TabsContent value="slots">
            <SlotsTab
              venueId={selectedVenueId}
              timeZone={timeZone}
              canManageSlots={canManageSchedules}
              canManageBookings={canManageBookings}
            />
          </TabsContent>
        </Tabs>
      )}
    </WorkingPage>
  );
}

export default function SchedulesPage() {
  return (
    <RequirePageAccess href="/schedules">
      <PlanningContent />
    </RequirePageAccess>
  );
}
```

- [ ] **Step 3: Widen `AddScheduleDialog`'s `variant` prop**

In `schedule-dialogs.tsx`, change `variant?: 'default' | 'outline';` to `variant?: 'default' | 'secondary';` (the JSX `<Button variant={variant}>` needs no change).

- [ ] **Step 4: Rewrite `schedules-tab.tsx`**

```tsx
'use client';

import { useMemo, useState } from 'react';
import { MoreHorizontalIcon, RepeatIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { unwrap } from '@iziwellpass/api/client';
import { useListResources, useListSchedules, useListStaff } from '@iziwellpass/api/generated';
import type { Resource, Schedule, Staff } from '@iziwellpass/api/schemas';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Button } from '@iziwellpass/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@iziwellpass/ui/components/dropdown-menu';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@iziwellpass/ui/components/empty';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@iziwellpass/ui/components/table';

import { RowsSkeleton } from '@/components/rows-skeleton';
import { apiErrorMessage } from '@/lib/api-error';
import { formatCalendarDate } from '@/lib/datetime';

import { usePlanningLabels } from './planning-utils';
import { AddScheduleDialog, DeleteScheduleDialog, EditScheduleDialog } from './schedule-dialogs';

/** Edit/delete menu on a 36px « ··· » button, shared by the table row and the phone stack. */
function CourseActions({
  schedule,
  onEdit,
  onDelete,
}: {
  schedule: Schedule;
  onEdit: (schedule: Schedule) => void;
  onDelete: (schedule: Schedule) => void;
}) {
  const t = useTranslations('planning');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={t('courses.rowMenu')}>
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onEdit(schedule)}>{t('courses.edit')}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => onDelete(schedule)}>
          {t('courses.delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** `Schedule.start_time`/`end_time` are `NaiveTime` clock strings ("09:00:00"),
 * the recurring template's venue-local daily window. Trim to "HH:MM"; never run
 * through the venue-timezone formatters. */
function scheduleClock(schedule: Schedule): string {
  return `${schedule.start_time.slice(0, 5)}–${schedule.end_time.slice(0, 5)}`;
}

function usePeriodLabel() {
  const t = useTranslations('planning');
  const locale = useLocale();
  return (schedule: Schedule): string =>
    schedule.effective_until
      ? t('courses.dateRange', {
          from: formatCalendarDate(schedule.effective_from, locale),
          until: formatCalendarDate(schedule.effective_until, locale),
        })
      : t('courses.dateFrom', { from: formatCalendarDate(schedule.effective_from, locale) });
}

interface CourseRowProps {
  schedule: Schedule;
  resourceName: string;
  instructorName: string;
  canManage: boolean;
  onEdit: (schedule: Schedule) => void;
  onDelete: (schedule: Schedule) => void;
}

/** Desktop row (canvas `oouHs`): 64px, title + 13px description, rule + clock, room, instructor, period, « ··· ». */
function CourseRow({
  schedule,
  resourceName,
  instructorName,
  canManage,
  onEdit,
  onDelete,
}: CourseRowProps) {
  const t = useTranslations('planning');
  const { formatRecurrence } = usePlanningLabels();
  const periodLabel = usePeriodLabel();

  return (
    <TableRow>
      <TableCell>
        <p className="font-medium">{schedule.title}</p>
        {schedule.description ? (
          <p className="truncate text-sm text-muted-foreground">{schedule.description}</p>
        ) : null}
      </TableCell>
      <TableCell>
        <p>{formatRecurrence(schedule.recurrence_rule)}</p>
        <p className="font-numeric text-sm font-medium text-muted-foreground">
          {scheduleClock(schedule)}
        </p>
      </TableCell>
      <TableCell>{resourceName}</TableCell>
      <TableCell className={instructorName ? undefined : 'text-muted-foreground'}>
        {instructorName || t('courses.noInstructor')}
      </TableCell>
      <TableCell className="text-muted-foreground">{periodLabel(schedule)}</TableCell>
      <TableCell className="text-right">
        {canManage ? <CourseActions schedule={schedule} onEdit={onEdit} onDelete={onDelete} /> : null}
      </TableCell>
    </TableRow>
  );
}

/** Phone stack (spec D6): the same cells stacked between hairlines, no card. */
function CourseStack({
  schedule,
  resourceName,
  instructorName,
  canManage,
  onEdit,
  onDelete,
}: CourseRowProps) {
  const t = useTranslations('planning');
  const { formatRecurrence } = usePlanningLabels();
  const periodLabel = usePeriodLabel();

  return (
    <div className="flex items-start gap-3 border-b border-border py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{schedule.title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
          <span>{formatRecurrence(schedule.recurrence_rule)}</span>
          <span className="font-numeric font-medium">{scheduleClock(schedule)}</span>
        </p>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          {resourceName}
          {instructorName ? ` · ${instructorName}` : ` · ${t('courses.noInstructor')}`}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">{periodLabel(schedule)}</p>
      </div>
      {canManage ? <CourseActions schedule={schedule} onEdit={onEdit} onDelete={onDelete} /> : null}
    </div>
  );
}

export function SchedulesTab({ venueId, canManage }: { venueId: string; canManage: boolean }) {
  const t = useTranslations('planning');

  const schedulesQuery = useListSchedules(venueId, { query: { select: unwrap } });
  const resourcesQuery = useListResources(venueId, { query: { select: unwrap } });
  const staffQuery = useListStaff({ query: { select: unwrap } });

  const resources = useMemo(() => resourcesQuery.data ?? [], [resourcesQuery.data]);
  const staff = useMemo(() => staffQuery.data ?? [], [staffQuery.data]);
  const resourceById = useMemo(
    () => new Map(resources.map((r: Resource) => [r.id, r])),
    [resources],
  );
  const staffById = useMemo(() => new Map(staff.map((s: Staff) => [s.id, s])), [staff]);

  const schedules = useMemo(() => schedulesQuery.data ?? [], [schedulesQuery.data]);

  const [editing, setEditing] = useState<Schedule | null>(null);
  const [deleting, setDeleting] = useState<Schedule | null>(null);

  const instructorName = (schedule: Schedule): string => {
    if (!schedule.instructor_staff_id) return '';
    const member = staffById.get(schedule.instructor_staff_id);
    return member ? `${member.first_name} ${member.last_name}`.trim() : '';
  };

  // Gate on the label-feeding queries too (resource names + instructor names)
  // so rows never render fallback labels that then flash to real names once
  // the secondary queries resolve. The schedules query stays the primary driver.
  if (schedulesQuery.isLoading || resourcesQuery.isLoading || staffQuery.isLoading) {
    return <RowsSkeleton />;
  }

  if (schedulesQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{t('errorTitle')}</AlertTitle>
        <AlertDescription>
          {apiErrorMessage(schedulesQuery.error, t('courses.loadError'))}
        </AlertDescription>
      </Alert>
    );
  }

  if (schedules.length === 0) {
    return (
      <Empty>
        <EmptyMedia>
          <RepeatIcon />
        </EmptyMedia>
        <EmptyTitle>{t('courses.emptyTitle')}</EmptyTitle>
        <EmptyDescription>{t('courses.emptyBody')}</EmptyDescription>
        {canManage ? (
          <EmptyContent>
            <AddScheduleDialog
              venueId={venueId}
              resources={resources}
              staff={staff}
              variant="secondary"
            />
          </EmptyContent>
        ) : null}
      </Empty>
    );
  }

  const rowProps = (schedule: Schedule): CourseRowProps => ({
    schedule,
    resourceName: resourceById.get(schedule.resource_id)?.name ?? t('courses.unknownResource'),
    instructorName: instructorName(schedule),
    canManage,
    onEdit: setEditing,
    onDelete: setDeleting,
  });

  return (
    <>
      {/* Phone: stacked hairline rows. The 6-column table would force horizontal scroll at 375px. */}
      <div className="md:hidden">
        {schedules.map((schedule: Schedule) => (
          <CourseStack key={schedule.id} {...rowProps(schedule)} />
        ))}
      </div>
      {/* Tablet/desktop: the hairline table at the canvas column widths. */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[204px]">{t('courses.columns.course')}</TableHead>
              <TableHead className="w-[300px]">{t('courses.columns.recurrence')}</TableHead>
              <TableHead className="w-[120px]">{t('courses.columns.resource')}</TableHead>
              <TableHead className="w-[160px]">{t('courses.columns.instructor')}</TableHead>
              <TableHead>{t('courses.columns.period')}</TableHead>
              <TableHead className="w-16 text-right">
                <span className="sr-only">{t('courses.columns.actions')}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedules.map((schedule: Schedule) => (
              <CourseRow key={schedule.id} {...rowProps(schedule)} />
            ))}
          </TableBody>
        </Table>
      </div>

      {editing ? (
        <EditScheduleDialog
          venueId={venueId}
          schedule={editing}
          resources={resources}
          staff={staff}
          open={editing !== null}
          onOpenChange={(next) => {
            if (!next) setEditing(null);
          }}
        />
      ) : null}
      {deleting ? (
        <DeleteScheduleDialog
          venueId={venueId}
          schedule={deleting}
          open={deleting !== null}
          onOpenChange={(next) => {
            if (!next) setDeleting(null);
          }}
        />
      ) : null}
    </>
  );
}
```

- [ ] **Step 5: Run the gates**

Run: `pnpm check:design && pnpm typecheck && pnpm lint && pnpm test`
Expected: all green. `grep -n "Card" "apps/owner/app/(app)/schedules/schedules-tab.tsx" "apps/owner/app/(app)/schedules/page.tsx"` prints nothing.

- [ ] **Step 6: Visual check (desktop 1440)**

With the mock API on 8091 and the dev server on 3021 (`pnpm --filter @iziwellpass/owner dev -- -p 3021` with the mock env; see `scripts/mock-server.mjs`), open `/schedules` and compare with `docs/design-refs/comptoir-clair/oouHs.png`: 32px title with the dark « Ajouter un cours » right, pill tabs, a 36px header row, 64px rows, no box. Stop the dev server before any later `pnpm build`.

- [ ] **Step 7: Format and commit**

```bash
pnpm exec prettier --write "apps/owner/app/(app)/schedules/page.tsx" "apps/owner/app/(app)/schedules/schedules-tab.tsx" "apps/owner/app/(app)/schedules/schedule-dialogs.tsx" apps/owner/components/rows-skeleton.tsx
git add "apps/owner/app/(app)/schedules/page.tsx" "apps/owner/app/(app)/schedules/schedules-tab.tsx" "apps/owner/app/(app)/schedules/schedule-dialogs.tsx" apps/owner/components/rows-skeleton.tsx
git commit -m "feat(owner): planning header on WorkingPage; recurring courses as a hairline table"
```

---

### Task 5: Sessions tab (day groups, hairline rows) + participants sheet

**Files:**
- Modify: `apps/owner/app/(app)/schedules/slots-tab.tsx` (rewrite)
- Modify: `apps/owner/app/(app)/schedules/bookings-sheet.tsx` (rewrite)
- Modify: `apps/owner/app/(app)/schedules/planning-utils.ts` (drop `BadgeSpec`, `slotStatusBadge`, `bookingStatusBadge`; add `slotStatusLabel`, `bookingStatusLabel`)

**Interfaces:**
- Consumes: `slotBadgeVariant`, `bookingBadgeVariant` (Task 3), restyled `Sheet` (Task 3), `RowsSkeleton` (Task 4), `Capacity` (`hideCount`), `Avatar`/`AvatarFallback tint`.
- Produces: `BookingsSheet` gains two props: `dayLabel: string` and `resourceName: string`. `usePlanningLabels()` returns `{ weekdayAbbr, weekdayShort, weekdayLong, formatRecurrence, slotStatusLabel, bookingStatusLabel, bookingSourceLabel }`.

- [ ] **Step 1: Trim `planning-utils.ts`**

Delete `BadgeVariant`, `BadgeSpec`, `SLOT_STATUS_VARIANT`, `BOOKING_STATUS_VARIANT` and the two `*Badge` callbacks. Replace the `PlanningLabels` interface and the corresponding parts of `usePlanningLabels` with:

```ts
export interface PlanningLabels {
  weekdayAbbr: (day: Weekday) => string;
  weekdayShort: (day: Weekday) => string;
  weekdayLong: (day: Weekday) => string;
  formatRecurrence: (rule: string | null | undefined) => string;
  slotStatusLabel: (status: SlotStatus) => string;
  bookingStatusLabel: (status: BookingStatus) => string;
  bookingSourceLabel: (source: BookingSource) => string;
}
```

```ts
  const slotStatusLabel = useCallback((status: SlotStatus) => t(`slotStatus.${status}`), [t]);
  const bookingStatusLabel = useCallback(
    (status: BookingStatus) => t(`bookingStatus.${status}`),
    [t],
  );
  // ... return { weekdayAbbr, weekdayShort, weekdayLong, formatRecurrence, slotStatusLabel, bookingStatusLabel, bookingSourceLabel };
```

Keep `memberName`, `memberInitials`, `resolveBookingActorLabel` and the recurrence formatter unchanged. Update the file's leading comment about the capacity bar to: `// Badge colours live in lib/slot-status.ts (slotBadgeVariant, bookingBadgeVariant).`

- [ ] **Step 2: Rewrite `slots-tab.tsx`**

```tsx
'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarClockIcon, MoreHorizontalIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { unwrap } from '@iziwellpass/api/client';
import {
  getListSlotsQueryKey,
  useCancelSlot,
  useListResources,
  useListSchedules,
} from '@iziwellpass/api/generated';
import type { Resource, Schedule, ScheduleSlot } from '@iziwellpass/api/schemas';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Button } from '@iziwellpass/ui/components/button';
import { Capacity } from '@iziwellpass/ui/components/capacity';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@iziwellpass/ui/components/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@iziwellpass/ui/components/dropdown-menu';
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '@iziwellpass/ui/components/empty';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { cn } from '@iziwellpass/ui/lib/utils';

import { RowsSkeleton } from '@/components/rows-skeleton';
import { useAllMembers } from '@/lib/all-members';
import { apiErrorMessage } from '@/lib/api-error';
import { useSlotsByDate } from '@/lib/dated-api';
import { formatTime, venueDateKey, venueToday } from '@/lib/datetime';
import { slotBadgeVariant } from '@/lib/slot-status';

import { BookingsSheet } from './bookings-sheet';
import { usePlanningLabels } from './planning-utils';

/**
 * Friendly, venue-local day heading for a slot group: "Aujourd'hui" /
 * "Demain" / "Lundi 21 septembre". `dateKey` is the venue-local `YYYY-MM-DD`
 * group key (from `venueDateKey`); relative labels compare against today's
 * and tomorrow's venue-local keys. The weekday/day/month text is formatted in
 * the venue timezone off the slot's real UTC instant, sentence-cased.
 */
function useDayHeading(timeZone: string | undefined) {
  const locale = useLocale();
  const t = useTranslations('planning');

  return useMemo(() => {
    const now = Date.now();
    const todayKey = venueDateKey(new Date(now).toISOString(), timeZone);
    const tomorrowKey = venueDateKey(new Date(now + 24 * 60 * 60 * 1000).toISOString(), timeZone);

    return (dateKey: string, iso: string): string => {
      if (dateKey === todayKey) return t('slots.today');
      if (dateKey === tomorrowKey) return t('slots.tomorrow');
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return dateKey;
      let text: string;
      try {
        text = new Intl.DateTimeFormat(locale, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          timeZone: timeZone && timeZone.trim().length > 0 ? timeZone : undefined,
        }).format(date);
      } catch {
        text = new Intl.DateTimeFormat(locale, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        }).format(date);
      }
      return text.charAt(0).toUpperCase() + text.slice(1);
    };
  }, [locale, t, timeZone]);
}

function CancelSlotDialog({
  slot,
  venueId,
  timeZone,
  open,
  onOpenChange,
}: {
  slot: ScheduleSlot;
  venueId: string;
  timeZone: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('planning');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const cancelSlot = useCancelSlot();

  const handleCancel = () => {
    cancelSlot.mutate(
      { sid: slot.id },
      {
        onSuccess: () => {
          toast.success(t('cancelSlot.success'));
          void queryClient.invalidateQueries({ queryKey: getListSlotsQueryKey(venueId) });
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(apiErrorMessage(err, t('cancelSlot.error')));
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t('cancelSlot.title')}</DialogTitle>
          <DialogDescription>
            {t('cancelSlot.description', {
              start: formatTime(slot.start_time, timeZone),
              end: formatTime(slot.end_time, timeZone),
            })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{tCommon('cancel')}</Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleCancel} disabled={cancelSlot.isPending}>
            {cancelSlot.isPending ? t('cancelSlot.confirming') : t('cancelSlot.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * One session (canvas `s8ABF`): 18px time, title over the room, a 120px
 * capacity bar with its count, the status badge, « Participants » and « ··· ».
 * 64px tall between hairlines; the row whose sheet is open becomes a grey pill.
 */
function SlotRow({
  slot,
  title,
  resourceName,
  timeZone,
  canManageSlots,
  selected,
  onOpenParticipants,
}: {
  slot: ScheduleSlot;
  title: string;
  resourceName: string;
  timeZone: string | undefined;
  canManageSlots: boolean;
  selected: boolean;
  onOpenParticipants: (slot: ScheduleSlot) => void;
}) {
  const t = useTranslations('planning');
  const { slotStatusLabel } = usePlanningLabels();
  const [cancelling, setCancelling] = useState(false);

  const isCancelled = slot.status === 'cancelled';

  return (
    <div
      data-state={selected ? 'selected' : undefined}
      className={cn(
        'grid grid-cols-[64px_1fr_auto] items-center gap-x-4 gap-y-2 border-b border-border py-[14px] last:border-0 md:grid-cols-[64px_1fr_120px_48px_auto_auto]',
        selected && 'rounded-lg border-transparent bg-secondary',
        isCancelled && 'text-muted-foreground',
      )}
    >
      <span className="font-numeric text-[1.125rem] font-medium">
        {formatTime(slot.start_time, timeZone)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-base font-medium">{title}</p>
        <p className="truncate text-sm text-muted-foreground">{resourceName}</p>
      </div>
      {isCancelled ? (
        <div className="hidden md:block" />
      ) : (
        <Capacity
          hideCount
          booked={slot.booked_count}
          capacity={slot.capacity}
          className="col-start-2 md:col-start-auto md:w-[120px]"
          label={t('slots.capacityLabel', { booked: slot.booked_count, cap: slot.capacity })}
        />
      )}
      <span className="col-start-2 font-numeric text-md font-medium text-muted-foreground md:col-start-auto">
        {isCancelled ? '' : `${slot.booked_count}/${slot.capacity}`}
      </span>
      <Badge variant={slotBadgeVariant(slot.status)} className="col-start-2 md:col-start-auto">
        {slotStatusLabel(slot.status)}
      </Badge>
      <div className="col-start-3 row-start-1 flex items-center gap-1 md:col-start-auto md:row-start-auto">
        {/* 44px touch targets below md, the canvas 36px from md up. */}
        <Button
          variant="secondary"
          size="sm"
          className="h-11 md:h-9"
          onClick={() => onOpenParticipants(slot)}
        >
          {t('slots.participants')}
        </Button>
        {canManageSlots && !isCancelled ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-11 md:size-9"
                aria-label={t('slots.rowMenu')}
              >
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem variant="destructive" onSelect={() => setCancelling(true)}>
                {t('slots.cancel')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      {cancelling ? (
        <CancelSlotDialog
          slot={slot}
          venueId={slot.venue_id}
          timeZone={timeZone}
          open={cancelling}
          onOpenChange={setCancelling}
        />
      ) : null}
    </div>
  );
}

export function SlotsTab({
  venueId,
  timeZone,
  canManageSlots,
  canManageBookings,
}: {
  venueId: string;
  timeZone: string | undefined;
  canManageSlots: boolean;
  canManageBookings: boolean;
}) {
  const t = useTranslations('planning');
  const dayHeading = useDayHeading(timeZone);

  // The slots endpoint requires a `date` param the generated client can't send
  // (see lib/dated-api.ts) and returns ONE day of slots. Until the backend
  // supports a range, the Séances tab shows the venue's current day; the
  // group-by-day layout below therefore renders a single "Aujourd'hui" group.
  const slotsQuery = useSlotsByDate(venueId, venueToday(timeZone));
  const schedulesQuery = useListSchedules(venueId, { query: { select: unwrap } });
  const resourcesQuery = useListResources(venueId, { query: { select: unwrap } });
  const membersQuery = useAllMembers();

  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data]);
  const scheduleTitleById = useMemo(
    () => new Map((schedulesQuery.data ?? []).map((s: Schedule) => [s.id, s.title])),
    [schedulesQuery.data],
  );
  const resourceNameById = useMemo(
    () => new Map((resourcesQuery.data ?? []).map((r: Resource) => [r.id, r.name])),
    [resourcesQuery.data],
  );

  const [participantsSlot, setParticipantsSlot] = useState<ScheduleSlot | null>(null);

  const slotsByDate = useMemo(() => {
    const groups = new Map<string, ScheduleSlot[]>();
    for (const slot of slotsQuery.data ?? []) {
      // Group by the venue-local calendar date derived from the slot's real
      // UTC `start_time`, not the raw `date` field — `date` is the slot's UTC
      // calendar date and can disagree with the venue's local date near
      // midnight for non-UTC venues.
      const key = venueDateKey(slot.start_time, timeZone);
      const list = groups.get(key) ?? [];
      list.push(slot);
      groups.set(key, list);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, slots]) => ({
        key,
        slots: slots.sort((a, b) => a.start_time.localeCompare(b.start_time)),
      }));
  }, [slotsQuery.data, timeZone]);

  // Gate on the label-feeding queries too (schedule titles + resource names)
  // so rows never render fallback labels that then flash to real names once
  // the secondary queries resolve. The slots query stays the primary driver.
  if (slotsQuery.isLoading || schedulesQuery.isLoading || resourcesQuery.isLoading) {
    return (
      <div className="flex flex-col gap-1">
        <Skeleton className="h-7 w-32" />
        <RowsSkeleton />
      </div>
    );
  }

  if (slotsQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{t('errorTitle')}</AlertTitle>
        <AlertDescription>
          {apiErrorMessage(slotsQuery.error, t('slots.loadError'))}
        </AlertDescription>
      </Alert>
    );
  }

  if (slotsByDate.length === 0) {
    return (
      <Empty>
        <EmptyMedia>
          <CalendarClockIcon />
        </EmptyMedia>
        <EmptyTitle>{t('slots.emptyTitle')}</EmptyTitle>
        <EmptyDescription>{t('slots.emptyBody')}</EmptyDescription>
      </Empty>
    );
  }

  const titleOf = (slot: ScheduleSlot) =>
    scheduleTitleById.get(slot.schedule_id) ?? t('slots.untitled');
  const roomOf = (slot: ScheduleSlot) =>
    resourceNameById.get(slot.resource_id) ?? t('slots.unknownResource');

  return (
    <>
      <div className="flex flex-col gap-8">
        {slotsByDate.map(({ key, slots }) => {
          const first = slots[0];
          const heading = first ? dayHeading(key, first.start_time) : key;
          return (
            <section key={key} className="flex flex-col gap-1">
              <h2 className="text-xl font-medium">{heading}</h2>
              <div className="flex flex-col">
                {slots.map((slot) => (
                  <SlotRow
                    key={slot.id}
                    slot={slot}
                    title={titleOf(slot)}
                    resourceName={roomOf(slot)}
                    timeZone={timeZone}
                    canManageSlots={canManageSlots}
                    selected={participantsSlot?.id === slot.id}
                    onOpenParticipants={setParticipantsSlot}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {participantsSlot ? (
        <BookingsSheet
          slot={participantsSlot}
          venueId={venueId}
          timeZone={timeZone}
          title={titleOf(participantsSlot)}
          dayLabel={dayHeading(
            venueDateKey(participantsSlot.start_time, timeZone),
            participantsSlot.start_time,
          )}
          resourceName={roomOf(participantsSlot)}
          members={members}
          canManageBookings={canManageBookings}
          open={participantsSlot !== null}
          onOpenChange={(next) => {
            if (!next) setParticipantsSlot(null);
          }}
        />
      ) : null}
    </>
  );
}
```

- [ ] **Step 3: Rewrite `bookings-sheet.tsx`**

```tsx
'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MoreHorizontalIcon, PlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { unwrap } from '@iziwellpass/api/client';
import {
  getGetAttendanceQueryKey,
  getListBookingsForSlotQueryKey,
  getListCheckInsQueryKey,
  getListSlotsQueryKey,
  useCancelBooking,
  useCheckInManual,
  useCreateBooking,
  useListBookingsForSlot,
} from '@iziwellpass/api/generated';
import type { Booking, CreateBookingRequest, Member, ScheduleSlot } from '@iziwellpass/api/schemas';
import { BookingSource } from '@iziwellpass/api/schemas';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Avatar, AvatarFallback } from '@iziwellpass/ui/components/avatar';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Button } from '@iziwellpass/ui/components/button';
import { Combobox } from '@iziwellpass/ui/components/combobox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@iziwellpass/ui/components/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@iziwellpass/ui/components/dropdown-menu';
import { Label } from '@iziwellpass/ui/components/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@iziwellpass/ui/components/sheet';
import { Textarea } from '@iziwellpass/ui/components/textarea';

import { RowsSkeleton } from '@/components/rows-skeleton';
import { apiErrorMessage } from '@/lib/api-error';
import { formatTime } from '@/lib/datetime';
import { bookingBadgeVariant } from '@/lib/slot-status';

import {
  memberInitials,
  memberName,
  resolveBookingActorLabel,
  usePlanningLabels,
} from './planning-utils';

function CancelBookingDialog({
  booking,
  venueId,
  open,
  onOpenChange,
}: {
  booking: Booking;
  venueId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('planning');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const cancelBooking = useCancelBooking();
  const [reason, setReason] = useState('');

  const handleCancel = () => {
    cancelBooking.mutate(
      { bid: booking.id, data: { reason: reason.trim() || null } },
      {
        onSuccess: () => {
          toast.success(t('cancelBooking.success'));
          void queryClient.invalidateQueries({
            queryKey: getListBookingsForSlotQueryKey(booking.slot_id),
          });
          void queryClient.invalidateQueries({ queryKey: getListSlotsQueryKey(venueId) });
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(apiErrorMessage(err, t('cancelBooking.error')));
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t('cancelBooking.title')}</DialogTitle>
          <DialogDescription>{t('cancelBooking.description')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cancel-booking-reason">{t('cancelBooking.reason')}</Label>
          <Textarea
            id="cancel-booking-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('cancelBooking.reasonPlaceholder')}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{tCommon('close')}</Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleCancel} disabled={cancelBooking.isPending}>
            {cancelBooking.isPending ? t('cancelBooking.confirming') : t('cancelBooking.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Canvas `skmEM`: a search pill and a 48px dark round « + ». Logic unchanged. */
function AddParticipant({
  slotId,
  venueId,
  members,
  bookedMemberIds,
  full,
}: {
  slotId: string;
  venueId: string;
  members: Member[];
  bookedMemberIds: Set<string>;
  full: boolean;
}) {
  const t = useTranslations('planning');
  const queryClient = useQueryClient();
  const createBooking = useCreateBooking();
  const [memberId, setMemberId] = useState('');

  // A member can only be booked while active with a live membership. Ineligible
  // members stay in the list but are disabled with the reason, so front-desk
  // staff can find the name and understand why they can't add it (rather than
  // seeing an empty result), then go fix the membership.
  const options = useMemo(() => {
    const ineligibleReason = (member: Member): string | null => {
      if (!member.is_active) return t('addBooking.ineligible.inactive');
      switch (member.membership_status) {
        case 'active':
          return null;
        case 'expired':
          return t('addBooking.ineligible.expired');
        case 'suspended':
          return t('addBooking.ineligible.suspended');
        case 'cancelled':
          return t('addBooking.ineligible.cancelled');
        default:
          return null;
      }
    };

    return members
      .filter((member) => !bookedMemberIds.has(member.id))
      .map((member) => {
        const reason = ineligibleReason(member);
        return {
          value: member.id,
          label: memberName(member),
          disabled: reason !== null,
          hint: reason ?? undefined,
        };
      })
      .sort((a, b) => Number(a.disabled) - Number(b.disabled)); // eligible first
  }, [members, bookedMemberIds, t]);

  const handleAdd = () => {
    if (!memberId) return;
    const data: CreateBookingRequest = {
      slot_id: slotId,
      member_id: memberId,
      source: BookingSource.walk_in,
    };
    createBooking.mutate(
      { sid: slotId, data },
      {
        onSuccess: () => {
          toast.success(t('addBooking.success'));
          void queryClient.invalidateQueries({ queryKey: getListBookingsForSlotQueryKey(slotId) });
          void queryClient.invalidateQueries({ queryKey: getListSlotsQueryKey(venueId) });
          setMemberId('');
        },
        onError: (err) => {
          toast.error(apiErrorMessage(err, t('addBooking.error')));
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <Label id="add-participant-label" className="sr-only">
        {t('addBooking.label')}
      </Label>
      <div className="flex items-center gap-2">
        <Combobox
          options={options}
          value={memberId}
          onValueChange={setMemberId}
          placeholder={t('addBooking.placeholder')}
          searchPlaceholder={t('addBooking.search')}
          emptyText={t('addBooking.noMembers')}
          disabled={full}
          className="flex-1"
        />
        <Button
          size="icon"
          aria-label={createBooking.isPending ? t('addBooking.adding') : t('addBooking.add')}
          onClick={handleAdd}
          disabled={full || !memberId || createBooking.isPending}
        >
          <PlusIcon />
        </Button>
      </div>
      {full ? <p className="text-sm text-muted-foreground">{t('addBooking.slotFull')}</p> : null}
    </div>
  );
}

export function BookingsSheet({
  slot,
  venueId,
  timeZone,
  title,
  dayLabel,
  resourceName,
  members,
  canManageBookings,
  open,
  onOpenChange,
}: {
  slot: ScheduleSlot;
  venueId: string;
  timeZone: string | undefined;
  title: string;
  /** « Aujourd'hui », « Demain », « Lundi 21 septembre » — the group heading of the slot. */
  dayLabel: string;
  resourceName: string;
  members: Member[];
  canManageBookings: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('planning');
  const { bookingStatusLabel, bookingSourceLabel } = usePlanningLabels();
  const queryClient = useQueryClient();

  const bookingsQuery = useListBookingsForSlot(slot.id, { query: { select: unwrap } });
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const checkIn = useCheckInManual();
  const [validatingBookingId, setValidatingBookingId] = useState<string | null>(null);

  const handleValidate = (booking: Booking) => {
    setValidatingBookingId(booking.id);
    checkIn.mutate(
      { data: { booking_id: booking.id, venue_id: venueId } },
      {
        onSuccess: () => {
          toast.success(t('bookings.validateSuccess'));
          void queryClient.invalidateQueries({ queryKey: getListBookingsForSlotQueryKey(slot.id) });
          void queryClient.invalidateQueries({ queryKey: getListCheckInsQueryKey(venueId) });
          void queryClient.invalidateQueries({ queryKey: getGetAttendanceQueryKey(venueId) });
        },
        onError: (err) => toast.error(apiErrorMessage(err, t('bookings.validateError'))),
        onSettled: () => setValidatingBookingId(null),
      },
    );
  };

  const bookings = useMemo(() => bookingsQuery.data ?? [], [bookingsQuery.data]);
  const bookedMemberIds = useMemo(() => {
    const set = new Set<string>();
    for (const booking of bookings) {
      if (booking.member_id && booking.status !== 'cancelled') {
        set.add(booking.member_id);
      }
    }
    return set;
  }, [bookings]);

  // Block adding once the slot is full. Count live (non-cancelled) bookings once
  // they've loaded — that reflects adds/cancels made in this sheet before the
  // parent slot prop refetches; fall back to the slot's server count until then.
  const bookedCount = bookingsQuery.data
    ? bookings.filter((booking) => booking.status !== 'cancelled').length
    : slot.booked_count;
  const isFull = bookedCount >= slot.capacity;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <p className="text-md text-muted-foreground">
            {t('bookings.eyebrow', { day: dayLabel, room: resourceName })}
          </p>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            {t('bookings.subtitle', {
              start: formatTime(slot.start_time, timeZone),
              end: formatTime(slot.end_time, timeZone),
              booked: bookedCount,
              cap: slot.capacity,
            })}
          </SheetDescription>
        </SheetHeader>

        {canManageBookings ? (
          <AddParticipant
            slotId={slot.id}
            venueId={venueId}
            members={members}
            bookedMemberIds={bookedMemberIds}
            full={isFull}
          />
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {bookingsQuery.isLoading ? (
            <RowsSkeleton rows={3} />
          ) : bookingsQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>{t('errorTitle')}</AlertTitle>
              <AlertDescription>
                {apiErrorMessage(bookingsQuery.error, t('bookings.loadError'))}
              </AlertDescription>
            </Alert>
          ) : bookings.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-base font-medium">{t('bookings.emptyTitle')}</p>
              <p className="mt-1 text-base text-muted-foreground">{t('bookings.emptyBody')}</p>
            </div>
          ) : (
            <ul className="flex flex-col">
              {bookings.map((booking, index) => {
                const canCancel =
                  canManageBookings &&
                  (booking.status === 'confirmed' || booking.status === 'checked_in');
                const member = booking.member_id ? memberById.get(booking.member_id) : undefined;
                return (
                  <li
                    key={booking.id}
                    className="flex items-center gap-3 border-b border-border py-3 last:border-0"
                  >
                    <Avatar>
                      <AvatarFallback aria-hidden tint={index}>
                        {member ? memberInitials(member) : '—'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-medium">
                        {resolveBookingActorLabel(booking, memberById)}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {bookingSourceLabel(booking.source)}
                      </p>
                    </div>
                    <Badge variant={bookingBadgeVariant(booking.status)} className="shrink-0">
                      {bookingStatusLabel(booking.status)}
                    </Badge>
                    {canManageBookings && booking.status === 'confirmed' ? (
                      <Button
                        size="sm"
                        disabled={validatingBookingId === booking.id}
                        onClick={() => handleValidate(booking)}
                      >
                        {validatingBookingId === booking.id
                          ? t('bookings.validating')
                          : t('bookings.validate')}
                      </Button>
                    ) : null}
                    {canCancel ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="size-11 md:size-9"
                            aria-label={t('slots.rowMenu')}
                          >
                            <MoreHorizontalIcon />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setCancellingBooking(booking)}
                          >
                            {t('cancelBooking.confirm')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SheetContent>

      {cancellingBooking ? (
        <CancelBookingDialog
          booking={cancellingBooking}
          venueId={venueId}
          open={cancellingBooking !== null}
          onOpenChange={(next) => {
            if (!next) setCancellingBooking(null);
          }}
        />
      ) : null}
    </Sheet>
  );
}
```

Note: the row menu reuses `slots.rowMenu` for its `aria-label` and `cancelBooking.confirm` for the item; no new keys. The `bookings.cancel` key becomes an orphan (final fix wave).

- [ ] **Step 4: Run the gates**

Run: `pnpm check:design && pnpm typecheck && pnpm lint && pnpm test`
Expected: all green. `grep -rn "slotStatusBadge\|bookingStatusBadge\|BadgeSpec" "apps/owner/app/(app)/schedules"` prints nothing.

- [ ] **Step 5: Visual check**

`/schedules` → « Séances » against `s8ABF.png`; open « Participants » against `skmEM.png` (sheet 460px, 32px padding, eyebrow / 28px title / 15px line, search pill + dark « + », 60px rows, the open row highlighted as a grey pill).

- [ ] **Step 6: Format and commit**

```bash
pnpm exec prettier --write "apps/owner/app/(app)/schedules/slots-tab.tsx" "apps/owner/app/(app)/schedules/bookings-sheet.tsx" "apps/owner/app/(app)/schedules/planning-utils.ts"
git add "apps/owner/app/(app)/schedules/slots-tab.tsx" "apps/owner/app/(app)/schedules/bookings-sheet.tsx" "apps/owner/app/(app)/schedules/planning-utils.ts"
git commit -m "feat(owner): sessions as day-grouped hairline rows; participants sheet at canvas geometry"
```

---

### Task 6: Course dialog at 620px with `DayToggle`

**Files:**
- Modify: `apps/owner/app/(app)/schedules/recurrence-editor.tsx` (rewrite)
- Modify: `apps/owner/app/(app)/schedules/schedule-dialogs.tsx` (rewrite `ScheduleFormFields`, the three dialogs' shells and footers; keep schema, defaults, mutations)

**Interfaces:**
- Consumes: `DayToggle` (Task 2), restyled `Dialog` (Task 3), `RecurrenceEditorState`/`WEEKDAYS` from `@/lib/recurrence`, `usePlanningLabels().weekdayShort/weekdayLong`.
- Produces: `RecurrenceEditor({ value, onChange })` renders two rows (Répétition · Intervalle, then Les jours) instead of a grey box. `AddScheduleDialog`, `EditScheduleDialog`, `DeleteScheduleDialog` keep their props.

- [ ] **Step 1: Rewrite `recurrence-editor.tsx`**

```tsx
'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { DayToggle } from '@iziwellpass/ui/components/day-toggle';
import { Input } from '@iziwellpass/ui/components/input';
import { Label } from '@iziwellpass/ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@iziwellpass/ui/components/select';

import { WEEKDAYS, type RecurrenceEditorState, type Weekday } from '@/lib/recurrence';

import { usePlanningLabels } from './planning-utils';

/**
 * Editor for the `recurrence_rule` iCal-subset string. State maps 1:1 to
 * `serializeRecurrenceRule`, so the encoded wire value is unchanged. Canvas
 * `jFogY`: a Répétition · Intervalle row, then « Les jours » as 44px round
 * toggles. No box around it.
 */
export function RecurrenceEditor({
  value,
  onChange,
}: {
  value: RecurrenceEditorState;
  onChange: (next: RecurrenceEditorState) => void;
}) {
  const t = useTranslations('planning');
  const { weekdayShort, weekdayLong } = usePlanningLabels();

  const days = useMemo(
    () => WEEKDAYS.map((day) => ({ value: day, short: weekdayShort(day), long: weekdayLong(day) })),
    [weekdayShort, weekdayLong],
  );

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="recurrence-frequency">{t('form.repeats')}</Label>
          <Select
            value={value.frequency}
            onValueChange={(frequency) =>
              onChange({ ...value, frequency: frequency as RecurrenceEditorState['frequency'] })
            }
          >
            <SelectTrigger id="recurrence-frequency" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('form.repeatNone')}</SelectItem>
              <SelectItem value="daily">{t('form.repeatDaily')}</SelectItem>
              <SelectItem value="weekly">{t('form.repeatWeekly')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {value.frequency !== 'none' ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="recurrence-interval">
              {value.frequency === 'daily' ? t('form.intervalDays') : t('form.intervalWeeks')}
            </Label>
            <Input
              id="recurrence-interval"
              type="number"
              min={1}
              step={1}
              value={value.interval}
              onChange={(e) =>
                onChange({
                  ...value,
                  interval: Math.max(1, Math.floor(e.target.valueAsNumber) || 1),
                })
              }
            />
          </div>
        ) : null}
      </div>

      {value.frequency === 'weekly' ? (
        <div className="flex flex-col gap-2">
          <Label id="recurrence-days-label">{t('form.onDays')}</Label>
          <DayToggle<Weekday>
            aria-labelledby="recurrence-days-label"
            days={days}
            value={value.byDay}
            onChange={(byDay) => onChange({ ...value, byDay })}
          />
        </div>
      ) : null}
    </>
  );
}
```

- [ ] **Step 2: Rewrite `ScheduleFormFields` in `schedule-dialogs.tsx`**

Replace the whole `ScheduleFormFields` function with:

```tsx
/**
 * Canvas `jFogY`, top to bottom: Titre · Salle / Intervenant · Description /
 * « Horaire » / Répétition · Intervalle / Les jours / Heure de début · Heure de
 * fin / À partir du · Jusqu'au. 18px between rows, 16px gutter.
 */
function ScheduleFormFields({
  form,
  resources,
  staff,
  recurrence,
  onRecurrenceChange,
}: {
  form: ReturnType<typeof useForm<ScheduleValues>>;
  resources: Resource[];
  staff: Staff[];
  recurrence: RecurrenceEditorState;
  onRecurrenceChange: (next: RecurrenceEditorState) => void;
}) {
  const t = useTranslations('planning');

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.title')}</FormLabel>
              <FormControl>
                <Input {...field} placeholder={t('form.titlePlaceholder')} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="resource_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.resource')}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('form.resourcePlaceholder')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {resources.map((resource) => (
                    <SelectItem key={resource.id} value={resource.id}>
                      {resource.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="instructor_staff_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.instructor')}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NO_INSTRUCTOR}>{t('form.noInstructor')}</SelectItem>
                  {staff.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.first_name} {member.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.description')}</FormLabel>
              <FormControl>
                <Textarea {...field} className="min-h-24" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <h3 className="text-lg font-semibold">{t('form.sectionTiming')}</h3>

      <RecurrenceEditor value={recurrence} onChange={onRecurrenceChange} />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="start_time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.startTime')}</FormLabel>
              <FormControl>
                <Input type="time" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="end_time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.endTime')}</FormLabel>
              <FormControl>
                <Input type="time" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="effective_from"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.effectiveFrom')}</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="effective_until"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.effectiveUntil')}</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Restyle the three dialog shells**

Add `DialogClose` to the dialog import. In `AddScheduleDialog`:

- `<DialogContent className="max-h-[85vh] overflow-y-auto">` → `<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[620px]">`
- the `<form ... className="grid gap-4">` → `className="flex flex-col gap-6"`
- the footer becomes:

```tsx
            <DialogFooter className="items-center">
              {weeklyNeedsDay ? (
                <p className="text-sm text-muted-foreground sm:mr-auto">
                  {t('form.weekdayRequired')}
                </p>
              ) : null}
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {tCommon('cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={createSchedule.isPending || weeklyNeedsDay}>
                {createSchedule.isPending
                  ? t('scheduleDialog.creating')
                  : t('scheduleDialog.create')}
              </Button>
            </DialogFooter>
```

(add `const tCommon = useTranslations('common');` next to `t`). Apply the same three changes to `EditScheduleDialog` (submit label `scheduleDialog.saving` / `scheduleDialog.save`). In `DeleteScheduleDialog`: `<DialogContent className="sm:max-w-[480px]">` and replace the outline cancel with

```tsx
          <DialogClose asChild>
            <Button variant="ghost">{tCommon('cancel')}</Button>
          </DialogClose>
```

The `Button` import already exists; the `PlusIcon` trigger stays.

- [ ] **Step 4: Run the gates**

Run: `pnpm check:design && pnpm typecheck && pnpm lint && pnpm test`
Expected: all green; `grep -n "bg-side\|rounded-lg" "apps/owner/app/(app)/schedules/recurrence-editor.tsx"` prints nothing.

- [ ] **Step 5: Visual check**

`/schedules` → « Ajouter un cours » against `jFogY.png`: 620px panel, 28px radius, 24px title, two-column rows, « Horaire », round day toggles (ink when chosen), ghost « Annuler » beside the dark « Créer le cours ». Confirm `serializeRecurrenceRule` output is unchanged by creating a weekly course on Mon/Wed/Fri and reopening it in « Modifier ».

- [ ] **Step 6: Format and commit**

```bash
pnpm exec prettier --write "apps/owner/app/(app)/schedules/recurrence-editor.tsx" "apps/owner/app/(app)/schedules/schedule-dialogs.tsx"
git add "apps/owner/app/(app)/schedules/recurrence-editor.tsx" "apps/owner/app/(app)/schedules/schedule-dialogs.tsx"
git commit -m "feat(owner): course dialog at canvas geometry with DayToggle recurrence"
```

---

### Task 7: Members directory split (header, toolbar, hairline table, paging, add dialog)

**Files:**
- Modify: `apps/owner/app/(app)/members/page.tsx` (rewrite; becomes the page shell only)
- Create: `apps/owner/app/(app)/members/members-directory.tsx`
- Create: `apps/owner/app/(app)/members/member-row.tsx`
- Create: `apps/owner/app/(app)/members/add-member-dialog.tsx`
- Create: `apps/owner/app/(app)/members/suspend-member-dialog.tsx`

**Interfaces:**
- Consumes: `WorkingPage`, `WorkingHeader` (Task 1), `Pagination` (Task 2), restyled `Table`/`Dialog` (Task 3), `paginate`, `isExpiringSoon` (Task 3), `RowsSkeleton` (Task 4), `memberName`/`memberInitials` from `@/lib/member-search`, `memberStatusBadgeVariant`, `VenueChecklist`, `ACCESS_SCOPE_VALUES`.
- Produces: `MembersDirectory({ members, canManage })`, `PAGE_SIZE = 20`; `MemberRow`/`MemberStack`/`MemberActions`; `AddMemberDialog({ variant? })`; `SuspendMemberDialog({ member, open, onOpenChange })` (Task 8 imports it from `../suspend-member-dialog`).

- [ ] **Step 1: Create `suspend-member-dialog.tsx`**

Move the `SuspendMemberDialog` function out of `members/page.tsx` verbatim (imports: `useQueryClient`, `useTranslations`, `toast`, `getGetMemberQueryKey`, `getListMembersQueryKey`, `useSuspendMember`, `Member`, `Button`, `Dialog*`, `apiErrorMessage`, `memberName` from `@/lib/member-search`) and export it. Two changes: `<DialogContent className="sm:max-w-[480px]">`, and the cancel button becomes

```tsx
          <DialogClose asChild>
            <Button variant="ghost">{tCommon('cancel')}</Button>
          </DialogClose>
```

(add `DialogClose` to the dialog import).

- [ ] **Step 2: Create `add-member-dialog.tsx`**

Move `AddMemberDialog`, `MEMBERSHIP_TYPE_VALUES` and `todayIsoDate` out of `members/page.tsx` with their imports, export the dialog, and apply these changes only:

- signature `export function AddMemberDialog({ variant = 'default' }: { variant?: 'default' | 'secondary' })`; trigger `<Button variant={variant}>{t('add')}</Button>`.
- `<DialogContent className="sm:max-w-[560px]">`.
- `onSubmit` success branch: after `form.reset(defaults)`, `if (addAnother) form.setFocus('first_name'); else setOpen(false);` (spec D9).
- form `className="flex flex-col gap-6"`; wrap the fields in `<div className="flex flex-col gap-[18px]">` and lay them out as: `grid gap-4 sm:grid-cols-2` (Prénom, Nom) / `grid gap-4 sm:grid-cols-2` (E-mail, Téléphone) / `grid gap-4 sm:grid-cols-2` (Type d'abonnement, Début d'abonnement) / Accès aux établissements (full width) / the conditional `venue_ids` checklist / Notes (`<Textarea {...field} className="min-h-24" />`).
- footer unchanged in content (ghost « Ajouter et enchaîner », dark « Ajouter le membre »).

- [ ] **Step 3: Create `member-row.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { BanIcon, EyeIcon, MoreHorizontalIcon, PencilIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import type { Member } from '@iziwellpass/api/schemas';
import { Avatar, AvatarFallback } from '@iziwellpass/ui/components/avatar';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Button } from '@iziwellpass/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@iziwellpass/ui/components/dropdown-menu';
import { TableCell, TableRow } from '@iziwellpass/ui/components/table';

import { formatCalendarDate } from '@/lib/datetime';
import { memberInitials, memberName } from '@/lib/member-search';
import { isExpiringSoon, memberStatusBadgeVariant } from '@/lib/member-status';

export interface MemberRowProps {
  member: Member;
  /** Row index on the page, drives the avatar tint rotation. */
  index: number;
  canManage: boolean;
  onSuspend: (member: Member) => void;
}

/** Row action menu (view, edit, suspend): 36px « ··· » in the table, 44px on the phone stack. */
export function MemberActions({
  member,
  canManage,
  onSuspend,
  size = 'icon-sm',
}: Omit<MemberRowProps, 'index'> & { size?: 'icon' | 'icon-sm' }) {
  const t = useTranslations('members');
  const canSuspend = canManage && member.membership_status !== 'suspended';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={size} aria-label={t('row.menu')}>
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/members/${member.id}`}>
            <EyeIcon />
            {t('row.view')}
          </Link>
        </DropdownMenuItem>
        {canManage ? (
          <DropdownMenuItem asChild>
            <Link href={`/members/${member.id}`}>
              <PencilIcon />
              {t('row.edit')}
            </Link>
          </DropdownMenuItem>
        ) : null}
        {canSuspend ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => onSuspend(member)}>
              <BanIcon />
              {t('row.suspend')}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function useEndCell(member: Member) {
  const t = useTranslations('members');
  const locale = useLocale();
  return {
    label: member.membership_end ? formatCalendarDate(member.membership_end, locale) : t('noEnd'),
    muted: !member.membership_end,
    expiringSoon: isExpiringSoon(member),
  };
}

/** Desktop row (canvas `xLxJY`): 64px, avatar + name, stacked contact, type, status, end + « Bientôt », « ··· ». */
export function MemberRow({ member, index, canManage, onSuspend }: MemberRowProps) {
  const t = useTranslations('members');
  const end = useEndCell(member);

  return (
    <TableRow>
      <TableCell>
        <Link href={`/members/${member.id}`} className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback aria-hidden tint={index}>
              {memberInitials(member)}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{memberName(member)}</span>
        </Link>
      </TableCell>
      <TableCell>
        <p className={member.email ? undefined : 'text-muted-foreground'}>
          {member.email ?? t('detail.noEmail')}
        </p>
        {member.phone ? (
          <p className="font-numeric text-sm text-muted-foreground">{member.phone}</p>
        ) : null}
      </TableCell>
      <TableCell>{t(`type.${member.membership_type}`)}</TableCell>
      <TableCell>
        <Badge variant={memberStatusBadgeVariant(member.membership_status)}>
          {t(`status.${member.membership_status}`)}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-5">
          <span className={end.muted ? 'text-muted-foreground' : undefined}>{end.label}</span>
          {end.expiringSoon ? <Badge variant="warning">{t('expiringSoon')}</Badge> : null}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <MemberActions member={member} canManage={canManage} onSuspend={onSuspend} />
      </TableCell>
    </TableRow>
  );
}

/** Phone stack (spec D6): the same cells stacked between hairlines, no card. */
export function MemberStack({ member, index, canManage, onSuspend }: MemberRowProps) {
  const t = useTranslations('members');
  const end = useEndCell(member);

  return (
    <div className="flex items-start gap-3 border-b border-border py-3 last:border-0">
      <Link href={`/members/${member.id}`} className="flex min-w-0 flex-1 items-start gap-3">
        <Avatar>
          <AvatarFallback aria-hidden tint={index}>
            {memberInitials(member)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{memberName(member)}</p>
          <p className="truncate text-sm text-muted-foreground">
            {member.email ?? member.phone ?? t('detail.noEmail')}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant={memberStatusBadgeVariant(member.membership_status)}>
              {t(`status.${member.membership_status}`)}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {t(`type.${member.membership_type}`)} · {end.label}
            </span>
            {end.expiringSoon ? <Badge variant="warning">{t('expiringSoon')}</Badge> : null}
          </div>
        </div>
      </Link>
      <MemberActions member={member} canManage={canManage} onSuspend={onSuspend} size="icon" />
    </div>
  );
}
```

- [ ] **Step 4: Create `members-directory.tsx`**

```tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { SearchIcon, SearchXIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { Member } from '@iziwellpass/api/schemas';
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '@iziwellpass/ui/components/empty';
import { Input } from '@iziwellpass/ui/components/input';
import { Pagination } from '@iziwellpass/ui/components/pagination';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@iziwellpass/ui/components/table';
import { Tabs, TabsList, TabsTrigger } from '@iziwellpass/ui/components/tabs';

import { memberName } from '@/lib/member-search';
import { paginate } from '@/lib/paginate';

import { MemberRow, MemberStack } from './member-row';
import { SuspendMemberDialog } from './suspend-member-dialog';

/** Spec D2: client-side paging over the full roster. */
export const PAGE_SIZE = 20;

type StatusFilter = 'all' | 'active' | 'expired' | 'suspended' | 'cancelled';

/**
 * Canvas `xLxJY`: a 380px search pill with the status pills on the right, the
 * hairline table, then « 8 membres sur 128 » and the pagination pills.
 */
export function MembersDirectory({ members, canManage }: { members: Member[]; canManage: boolean }) {
  const t = useTranslations('members');
  const tCommon = useTranslations('common');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [suspendTarget, setSuspendTarget] = useState<Member | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((member) => {
      if (status !== 'all' && member.membership_status !== status) return false;
      if (!q) return true;
      const name = memberName(member).toLowerCase();
      const email = (member.email ?? '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [members, query, status]);

  // A new query or filter starts again from the first page.
  useEffect(() => {
    setPage(1);
  }, [query, status]);

  const current = paginate(filtered, page, PAGE_SIZE);

  const tabs: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: t('filters.all') },
    { value: 'active', label: t('filters.active') },
    { value: 'expired', label: t('filters.expired') },
    { value: 'suspended', label: t('filters.suspended') },
    { value: 'cancelled', label: t('filters.cancelled') },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full md:w-[380px]">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search')}
            aria-label={t('search')}
            className="pl-11"
          />
        </div>
        <Tabs
          value={status}
          onValueChange={(value) => setStatus(value as StatusFilter)}
          className="max-w-full overflow-x-auto"
        >
          <TabsList aria-label={t('columns.status')}>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {filtered.length === 0 ? (
        <Empty>
          <EmptyMedia>
            <SearchXIcon />
          </EmptyMedia>
          <EmptyTitle>{t('noResults.title')}</EmptyTitle>
          <EmptyDescription>{t('noResults.body')}</EmptyDescription>
        </Empty>
      ) : (
        <>
          {/* Phone: stacked hairline rows. The table would force horizontal scroll at 375px. */}
          <div className="md:hidden">
            {current.items.map((member, index) => (
              <MemberStack
                key={member.id}
                member={member}
                index={index}
                canManage={canManage}
                onSuspend={setSuspendTarget}
              />
            ))}
          </div>
          {/* Tablet/desktop: the hairline table at the canvas column widths. */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[244px]">{t('columns.member')}</TableHead>
                  <TableHead className="w-[260px]">{t('columns.contact')}</TableHead>
                  <TableHead className="w-[130px]">{t('columns.type')}</TableHead>
                  <TableHead className="w-[130px]">{t('columns.status')}</TableHead>
                  <TableHead>{t('columns.end')}</TableHead>
                  <TableHead className="w-16 text-right">
                    <span className="sr-only">{t('columns.actions')}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {current.items.map((member, index) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    index={index}
                    canManage={canManage}
                    onSuspend={setSuspendTarget}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-md text-muted-foreground">
              {t('footer', { shown: current.items.length, total: current.total })}
            </p>
            <Pagination
              page={current.page}
              pageCount={current.pageCount}
              onPageChange={setPage}
              labels={{
                label: tCommon('pagination.label'),
                previous: tCommon('pagination.previous'),
                next: tCommon('pagination.next'),
                page: (n) => tCommon('pagination.page', { n }),
              }}
            />
          </div>
        </>
      )}

      {suspendTarget ? (
        <SuspendMemberDialog
          member={suspendTarget}
          open={suspendTarget !== null}
          onOpenChange={(next) => {
            if (!next) setSuspendTarget(null);
          }}
        />
      ) : null}
    </div>
  );
}
```

- [ ] **Step 5: Rewrite `members/page.tsx`**

```tsx
'use client';

import { UsersRoundIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useRole } from '@iziwellpass/auth/provider';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Button } from '@iziwellpass/ui/components/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@iziwellpass/ui/components/empty';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { WorkingHeader, WorkingPage } from '@iziwellpass/ui/components/working-page';

import { RequirePageAccess } from '@/components/page-access';
import { RowsSkeleton } from '@/components/rows-skeleton';
import { useAllMembers } from '@/lib/all-members';
import { apiErrorMessage } from '@/lib/api-error';

import { AddMemberDialog } from './add-member-dialog';
import { MembersDirectory } from './members-directory';

function MembersContent() {
  const t = useTranslations('members');
  const tCommon = useTranslations('common');
  const role = useRole();
  const canManage = role === 'owner' || role === 'admin' || role === 'receptionist';

  const membersQuery = useAllMembers();
  const members = membersQuery.data ?? [];

  const subtitle = membersQuery.isLoading ? (
    <Skeleton className="h-4 w-28" />
  ) : membersQuery.isError ? undefined : (
    t('subtitle', { count: members.length })
  );

  return (
    <WorkingPage>
      <WorkingHeader
        title={t('title')}
        subtitle={subtitle}
        action={canManage ? <AddMemberDialog /> : null}
      />

      {membersQuery.isLoading ? (
        <div className="flex flex-col gap-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Skeleton className="h-12 w-full rounded-full md:w-[380px]" />
            <Skeleton className="h-10 w-96 rounded-full" />
          </div>
          <RowsSkeleton rows={8} />
        </div>
      ) : membersQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>{t('errorTitle')}</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            <span>{apiErrorMessage(membersQuery.error, t('loadError'))}</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void membersQuery.refetch()}
              disabled={membersQuery.isFetching}
            >
              {tCommon('retry')}
            </Button>
          </AlertDescription>
        </Alert>
      ) : members.length === 0 ? (
        <Empty>
          <EmptyMedia>
            <UsersRoundIcon />
          </EmptyMedia>
          <EmptyTitle>{t('empty.title')}</EmptyTitle>
          <EmptyDescription>{t('empty.body')}</EmptyDescription>
          {canManage ? (
            <EmptyContent>
              <AddMemberDialog variant="secondary" />
            </EmptyContent>
          ) : null}
        </Empty>
      ) : (
        <MembersDirectory members={members} canManage={canManage} />
      )}
    </WorkingPage>
  );
}

export default function MembersPage() {
  return (
    <RequirePageAccess href="/members">
      <MembersContent />
    </RequirePageAccess>
  );
}
```

- [ ] **Step 6: Run the gates**

Run: `pnpm check:design && pnpm typecheck && pnpm lint && pnpm test`
Expected: all green. `grep -rn "components/card" "apps/owner/app/(app)/members"` prints only `[id]/` files (Task 8 handles them).

- [ ] **Step 7: Visual check**

`/members` against `xLxJY.png` (search pill left, status pills right, 64px rows, footer count + pagination pills once the mock has more than 20 members) and « Ajouter un membre » against `nVkMG.png` (560px, two-column rows, ghost « Ajouter et enchaîner » + dark « Ajouter le membre »). Confirm « Ajouter et enchaîner » keeps the dialog open with the cursor back in « Prénom ».

- [ ] **Step 8: Format and commit**

```bash
pnpm exec prettier --write "apps/owner/app/(app)/members/page.tsx" "apps/owner/app/(app)/members/members-directory.tsx" "apps/owner/app/(app)/members/member-row.tsx" "apps/owner/app/(app)/members/add-member-dialog.tsx" "apps/owner/app/(app)/members/suspend-member-dialog.tsx"
git add "apps/owner/app/(app)/members/page.tsx" "apps/owner/app/(app)/members/members-directory.tsx" "apps/owner/app/(app)/members/member-row.tsx" "apps/owner/app/(app)/members/add-member-dialog.tsx" "apps/owner/app/(app)/members/suspend-member-dialog.tsx"
git commit -m "feat(owner): members directory as a hairline table with client-side paging"
```

---

### Task 8: Member detail split (header, membership, subscription tiles, edit form, danger zone, dialogs)

**Files:**
- Modify: `apps/owner/app/(app)/members/[id]/page.tsx` (rewrite; page shell only)
- Create: `apps/owner/app/(app)/members/[id]/member-header.tsx`
- Create: `apps/owner/app/(app)/members/[id]/membership-section.tsx`
- Rename + rewrite: `apps/owner/app/(app)/members/[id]/subscriptions-card.tsx` → `subscriptions-section.tsx` (`git mv`)
- Create: `apps/owner/app/(app)/members/[id]/edit-member-form.tsx`
- Create: `apps/owner/app/(app)/members/[id]/danger-zone.tsx`
- Create: `apps/owner/app/(app)/members/[id]/edit-access-dialog.tsx`
- Modify: `apps/owner/app/(app)/members/[id]/assign-subscription-dialog.tsx` (shell, switch row, footer)
- Modify: `apps/owner/app/(app)/members/[id]/cancel-subscription-dialog.tsx` (trigger + footer)

**Interfaces:**
- Consumes: `WorkingPage`, `BackLink`, `SectionHeading`, `KeyValueList`, `KeyValueRow` (Task 1), `subscriptionTone` (Task 3), `SuspendMemberDialog` from `../suspend-member-dialog` (Task 7), `tintClass`/`tintForIndex` from `@iziwellpass/ui/lib/tints`, `memberName`/`memberInitials` from `@/lib/member-search`.
- Produces: `MemberHeader({ member, canManage })`, `MembershipSection({ member })`, `SubscriptionsSection({ memberId, canManage })`, `EditMemberForm({ member, canEdit })`, `DangerZone({ member })`, `EditAccessDialog({ member, open, onOpenChange })`.
- Ruling: the canvas tiles show no price; the price is appended to the tile's meta line (« Expire le 30 sept. 2026 · 45 000 FCFA ») so no information is lost.

- [ ] **Step 1: Create `edit-access-dialog.tsx`**

Move `EditAccessDialog` out of `[id]/page.tsx` verbatim with its imports (`useEffect`, `useState`, `useQueryClient`, `useTranslations`, `toast`, `getGetMemberQueryKey`, `getListMembersQueryKey`, `useSetMemberAccess`, `useSetMemberVenues`, `Member`, `Button`, `Dialog*`, `Select*`, `VenueChecklist`, `ACCESS_SCOPE_VALUES`, `apiErrorMessage`), export it, and change: the `<div className="grid gap-4">` body → `className="flex flex-col gap-[18px]"`, each `grid gap-2` → `flex flex-col gap-2`, the outline cancel → `<DialogClose asChild><Button variant="ghost">{tCommon('cancel')}</Button></DialogClose>`.

- [ ] **Step 2: Create `member-header.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import type { Member } from '@iziwellpass/api/schemas';
import { Avatar, AvatarFallback } from '@iziwellpass/ui/components/avatar';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Button } from '@iziwellpass/ui/components/button';

import { useAccessScopeLabel } from '@/lib/access-scope';
import { formatCalendarDate } from '@/lib/datetime';
import { memberInitials, memberName } from '@/lib/member-search';
import { memberStatusBadgeVariant } from '@/lib/member-status';

import { EditAccessDialog } from './edit-access-dialog';

/**
 * Canvas `L6sMyP`: a 72px tinted avatar, the 32px name over a badge row
 * (type, status, access + « Gérer l'accès »), and the contact block on the
 * right (email 15/500, phone, « Membre depuis le … » 13px).
 */
export function MemberHeader({ member, canManage }: { member: Member; canManage: boolean }) {
  const t = useTranslations('members');
  const locale = useLocale();
  const scopeLabel = useAccessScopeLabel();
  const [accessOpen, setAccessOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-start justify-between gap-6">
      <div className="flex items-start gap-5">
        <Avatar className="size-[72px]">
          <AvatarFallback aria-hidden className="text-xl" tint={0}>
            {memberInitials(member)}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-2.5">
          <h1 className="text-2xl font-normal">{memberName(member)}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{t(`type.${member.membership_type}`)}</Badge>
            <Badge variant={memberStatusBadgeVariant(member.membership_status)}>
              {t(`status.${member.membership_status}`)}
            </Badge>
            <Badge variant={member.access_scope === 'chain_wide' ? 'info' : 'default'}>
              {scopeLabel(member.access_scope)}
            </Badge>
            {canManage ? (
              <Button variant="ghost" size="sm" onClick={() => setAccessOpen(true)}>
                {t('detail.access.manage')}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1 text-base md:self-center md:text-right">
        <p className={member.email ? 'font-medium' : 'text-muted-foreground'}>
          {member.email ?? t('detail.noEmail')}
        </p>
        <p className="font-numeric text-muted-foreground">{member.phone ?? t('detail.noPhone')}</p>
        {/*
          `created_at` is a date-time instant, but members are org-scoped with
          no single venue timezone to convert against. We format the leading
          calendar date in the active locale — can be off by a day right at
          UTC midnight; acceptable for a "member since" line.
        */}
        <p className="text-sm text-muted-foreground">
          {t('detail.memberSince', { date: formatCalendarDate(member.created_at, locale) })}
        </p>
      </div>
      <EditAccessDialog member={member} open={accessOpen} onOpenChange={setAccessOpen} />
    </div>
  );
}
```

- [ ] **Step 3: Create `membership-section.tsx`**

```tsx
'use client';

import { useLocale, useTranslations } from 'next-intl';

import type { Member } from '@iziwellpass/api/schemas';
import { Badge } from '@iziwellpass/ui/components/badge';
import {
  KeyValueList,
  KeyValueRow,
  SectionHeading,
} from '@iziwellpass/ui/components/working-page';

import { formatCalendarDate } from '@/lib/datetime';
import { memberStatusBadgeVariant } from '@/lib/member-status';

/**
 * « Adhésion » (canvas `L6sMyP`): the flat membership_* fields on `Member` as
 * key/value hairline rows. Distinct from SubscriptionsSection, which lists
 * priced `MemberSubscription` rows.
 */
export function MembershipSection({ member }: { member: Member }) {
  const t = useTranslations('members');
  const locale = useLocale();

  return (
    <section className="flex flex-col gap-4">
      <SectionHeading title={t('detail.membership.title')} />
      <KeyValueList>
        <KeyValueRow label={t('detail.membership.type')}>
          {t(`type.${member.membership_type}`)}
        </KeyValueRow>
        <KeyValueRow label={t('detail.membership.start')}>
          {formatCalendarDate(member.membership_start, locale)}
        </KeyValueRow>
        <KeyValueRow label={t('detail.membership.end')}>
          {member.membership_end ? (
            formatCalendarDate(member.membership_end, locale)
          ) : (
            <span className="font-normal text-muted-foreground">{t('noEnd')}</span>
          )}
        </KeyValueRow>
        <KeyValueRow label={t('detail.membership.status')}>
          <Badge variant={memberStatusBadgeVariant(member.membership_status)}>
            {t(`status.${member.membership_status}`)}
          </Badge>
        </KeyValueRow>
        <KeyValueRow label={t('detail.membership.notes')} className="items-start">
          {member.notes ? (
            <span className="block max-w-[60%] whitespace-pre-wrap md:ml-auto">{member.notes}</span>
          ) : (
            <span className="font-normal text-muted-foreground">
              {t('detail.membership.noNotes')}
            </span>
          )}
        </KeyValueRow>
      </KeyValueList>
    </section>
  );
}
```

- [ ] **Step 4: Rename and rewrite `subscriptions-section.tsx`**

`git mv "apps/owner/app/(app)/members/[id]/subscriptions-card.tsx" "apps/owner/app/(app)/members/[id]/subscriptions-section.tsx"`, then replace its contents with:

```tsx
'use client';

import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';

import { unwrap } from '@iziwellpass/api/client';
import { getListPlansQueryOptions, useListSubscriptions } from '@iziwellpass/api/generated';
import type { MemberSubscription } from '@iziwellpass/api/schemas';
import { Alert, AlertDescription } from '@iziwellpass/ui/components/alert';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { SectionHeading } from '@iziwellpass/ui/components/working-page';
import { tintClass, tintForIndex } from '@iziwellpass/ui/lib/tints';
import { cn } from '@iziwellpass/ui/lib/utils';

import { apiErrorMessage } from '@/lib/api-error';
import { formatCalendarDate } from '@/lib/datetime';
import { formatMoney } from '@/lib/money';
import { subscriptionTone } from '@/lib/subscription-tone';

import { AssignSubscriptionDialog } from './assign-subscription-dialog';
import { CancelSubscriptionDialog } from './cancel-subscription-dialog';

/**
 * One subscription as a tinted tile (canvas `L6sMyP`): name (+ « Impayé »),
 * a 13px meta line, the status on the right in 14/500. Live tiles rotate the
 * pastels; expired, exhausted or cancelled ones take the grey pill tone (D10).
 */
function SubscriptionTile({
  subscription,
  planName,
  index,
  memberId,
  canManage,
}: {
  subscription: MemberSubscription;
  planName: string;
  index: number;
  memberId: string;
  canManage: boolean;
}) {
  const t = useTranslations('members');
  const locale = useLocale();

  // A subscription is time-based or count-based; show whichever the plan uses.
  // When entries_total is known but entries_remaining isn't, show a
  // total-only label rather than coercing the remaining count to zero —
  // "0 / N left" would misread as exhausted when it's actually unknown.
  const terms =
    subscription.entries_total != null
      ? subscription.entries_remaining != null
        ? t('detail.subscriptions.entriesLeft', {
            remaining: subscription.entries_remaining,
            total: subscription.entries_total,
          })
        : t('detail.subscriptions.entriesTotal', { total: subscription.entries_total })
      : subscription.expires_on != null
        ? t('detail.subscriptions.expiresOn', {
            date: formatCalendarDate(subscription.expires_on, locale),
          })
        : null;
  const price = formatMoney(subscription.price_amount_minor, subscription.price_currency, locale);
  const tone = subscriptionTone(subscription.status, index);
  const live = subscription.status === 'active';

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-lg p-5',
        tone === 'side' ? 'bg-secondary' : tintClass(tintForIndex(tone)),
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-semibold">{planName}</span>
          {subscription.payment_status === 'unpaid' ? (
            <Badge variant="warning">{t('detail.subscriptions.unpaid')}</Badge>
          ) : null}
        </div>
        <p className="text-sm text-muted-strong">{terms ? `${terms} · ${price}` : price}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={cn(
            'text-md font-medium',
            live ? 'text-success-foreground' : 'text-muted-foreground',
          )}
        >
          {t(`detail.subscriptions.status.${subscription.status}`)}
        </span>
        {canManage && live ? (
          <CancelSubscriptionDialog
            memberId={memberId}
            subscription={subscription}
            planName={planName}
          />
        ) : null}
      </div>
    </div>
  );
}

/**
 * Plan names live on the venue's plan list, not on the subscription, so every
 * venue represented in the list needs its own plan query. `useQueries` runs
 * that variable-length set in parallel and `combine` folds it into one id→name
 * map plus one aggregate pending flag.
 *
 * Archived plans are included: a member can hold a subscription to a plan that
 * was archived afterwards. Callers must distinguish "still loading" from "no
 * such plan".
 */
function useVenuePlanNames(venueIds: string[]) {
  return useQueries({
    queries: venueIds.map((venueId) =>
      getListPlansQueryOptions(venueId, { include_archived: true }, { query: { select: unwrap } }),
    ),
    combine: (results) => ({
      names: Object.fromEntries(
        results.flatMap((result) => (result.data ?? []).map((plan) => [plan.id, plan.name])),
      ) as Record<string, string>,
      isPending: results.some((result) => result.isPending),
    }),
  });
}

export function SubscriptionsSection({
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
  const subscriptions = useMemo(() => subscriptionsQuery.data ?? [], [subscriptionsQuery.data]);

  // Memoised so the query list handed to useQueries keeps a stable identity.
  const venueIds = useMemo(
    () => [...new Set(subscriptions.map((s) => s.venue_id))],
    [subscriptions],
  );
  const planNames = useVenuePlanNames(venueIds);

  // Until the plan queries settle, a name we don't have yet is unknown to us,
  // not unknown to the system: show a neutral dash rather than claiming
  // « Offre inconnue ».
  const planNameFor = (planId: string) =>
    planNames.names[planId] ?? (planNames.isPending ? '—' : t('detail.subscriptions.unknownPlan'));

  return (
    <section className="flex flex-col gap-4">
      <SectionHeading
        title={t('detail.subscriptions.title')}
        description={t('detail.subscriptions.description')}
        action={canManage ? <AssignSubscriptionDialog memberId={memberId} /> : undefined}
      />
      {subscriptionsQuery.isLoading ? (
        <Skeleton className="h-[78px] w-full rounded-lg" />
      ) : subscriptionsQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {apiErrorMessage(subscriptionsQuery.error, t('detail.subscriptions.loadError'))}
          </AlertDescription>
        </Alert>
      ) : subscriptions.length === 0 ? (
        <p className="text-base text-muted-foreground">{t('detail.subscriptions.empty')}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {subscriptions.map((subscription, index) => (
            <SubscriptionTile
              key={subscription.id}
              subscription={subscription}
              planName={planNameFor(subscription.plan_id)}
              index={index}
              memberId={memberId}
              canManage={canManage}
            />
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 5: Restyle `assign-subscription-dialog.tsx` and `cancel-subscription-dialog.tsx`**

`assign-subscription-dialog.tsx`:
- trigger: `<Button variant="secondary" size="sm"><PlusIcon />{t('detail.subscriptions.assign')}</Button>`
- `<DialogContent className="sm:max-w-[520px]">`
- body `<div className="grid gap-4">` → `<div className="flex flex-col gap-[18px]">`; each `grid gap-2` → `flex flex-col gap-2`; `SelectTrigger` gains `className="w-full"`.
- the « Réglé » row (canvas `WYHdY`: title 15/500 + 13px helper, switch right):

```tsx
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="assign-paid" className="text-base font-medium">
                {t('detail.subscriptions.assignDialog.paid')}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t('detail.subscriptions.assignDialog.paidHint')}
              </p>
            </div>
            <Switch id="assign-paid" checked={paid} onCheckedChange={setPaid} />
          </div>
```

- footer: `<DialogClose asChild><Button variant="ghost">{tCommon('cancel')}</Button></DialogClose>` before the dark « Attribuer » (add `const tCommon = useTranslations('common');` and `DialogClose` to the import).

Add the helper key to both message files under `members.detail.subscriptions.assignDialog`: fr `"paidHint": "Le paiement a été encaissé à l'attribution."`, en `"paidHint": "Payment was collected on assignment."`.

`cancel-subscription-dialog.tsx`: trigger `<Button variant="ghost" size="sm">` (was `outline`); `<DialogContent className="sm:max-w-[480px]">`; the outline cancel → `<DialogClose asChild><Button variant="ghost">…</Button></DialogClose>` (keep its existing label key).

- [ ] **Step 6: Create `edit-member-form.tsx`**

Move `EditMemberForm` and `MEMBERSHIP_TYPE_VALUES` out of `[id]/page.tsx` with their imports, export the form, replace the `Card`/`CardHeader`/`CardTitle`/`CardContent` wrapper with:

```tsx
    <section className="flex flex-col gap-4">
      <SectionHeading title={t('detail.edit.title')} />
      <Form {...form}>
        <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="flex flex-col gap-[18px]">
          <div className="grid gap-4 sm:grid-cols-2">{/* first_name, last_name */}</div>
          <div className="grid gap-4 sm:grid-cols-2">{/* email, phone */}</div>
          <div className="grid gap-4 sm:grid-cols-2">{/* membership_type, membership_end */}</div>
          {/* is_active (full width, with its helper as <p className="text-sm text-muted-foreground">) */}
          {/* notes (full width, <Textarea {...field} className="min-h-24" disabled={!canEdit} />) */}
          {canEdit ? (
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={updateMember.isPending}>
                {updateMember.isPending ? t('detail.edit.saving') : t('detail.edit.save')}
              </Button>
            </div>
          ) : null}
        </form>
      </Form>
    </section>
```

Each `FormField` block is copied verbatim from the current file into the slot named in the comment; drop the `sm:col-span-2` on Notes and the wrapping `div.sm:col-span-2` around the submit. Import `SectionHeading` from `@iziwellpass/ui/components/working-page`.

- [ ] **Step 7: Create `danger-zone.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import type { Member } from '@iziwellpass/api/schemas';
import { Button } from '@iziwellpass/ui/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@iziwellpass/ui/components/tooltip';
import { SectionHeading } from '@iziwellpass/ui/components/working-page';

import { SuspendMemberDialog } from '../suspend-member-dialog';

/** « Zone sensible » (canvas `L6sMyP`): danger « Suspendre le membre » + secondary « Réactiver ». */
export function DangerZone({ member }: { member: Member }) {
  const t = useTranslations('members');
  const [suspendOpen, setSuspendOpen] = useState(false);
  const isSuspended = member.membership_status === 'suspended';

  return (
    <section className="flex flex-col gap-4">
      <SectionHeading title={t('detail.danger.title')} description={t('detail.danger.description')} />
      <div className="flex flex-wrap items-center gap-2.5">
        <Button variant="destructive" onClick={() => setSuspendOpen(true)} disabled={isSuspended}>
          {isSuspended ? t('detail.danger.suspended') : t('detail.danger.suspend')}
        </Button>
        {/*
          No unsuspend / reactivate endpoint exists in the API (only
          `suspendMember`). The affordance is rendered disabled with a
          "coming soon" tooltip rather than wired to a nonexistent path.
        */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <Button variant="secondary" disabled aria-disabled className="pointer-events-none">
                {t('detail.danger.reactivate')}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{t('detail.danger.reactivateSoon')}</TooltipContent>
        </Tooltip>
      </div>
      <SuspendMemberDialog member={member} open={suspendOpen} onOpenChange={setSuspendOpen} />
    </section>
  );
}
```

- [ ] **Step 8: Rewrite `[id]/page.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { unwrap } from '@iziwellpass/api/client';
import { useGetMember } from '@iziwellpass/api/generated';
import { useRole } from '@iziwellpass/auth/provider';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { BackLink, WorkingPage } from '@iziwellpass/ui/components/working-page';

import { RequirePageAccess } from '@/components/page-access';
import { apiErrorMessage } from '@/lib/api-error';

import { DangerZone } from './danger-zone';
import { EditMemberForm } from './edit-member-form';
import { MemberHeader } from './member-header';
import { MembershipSection } from './membership-section';
import { SubscriptionsSection } from './subscriptions-section';

function MemberDetailContent() {
  const t = useTranslations('members');
  const params = useParams<{ id: string }>();
  const memberId = params.id;
  const role = useRole();
  const canEdit = role === 'owner' || role === 'admin' || role === 'receptionist';

  const memberQuery = useGetMember(memberId, { query: { select: unwrap } });

  const backLink = (
    <BackLink href="/members" linkComponent={Link}>
      {t('detail.back')}
    </BackLink>
  );

  if (memberQuery.isLoading) {
    return (
      <WorkingPage>
        {backLink}
        <div className="flex items-center gap-5">
          <Skeleton className="size-[72px] rounded-full" />
          <Skeleton className="h-9 w-64" />
        </div>
        <div className="grid gap-10 md:grid-cols-2 md:gap-16">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </WorkingPage>
    );
  }

  if (memberQuery.isError) {
    return (
      <WorkingPage>
        {backLink}
        <Alert variant="destructive">
          <AlertTitle>{t('errorTitle')}</AlertTitle>
          <AlertDescription>
            {apiErrorMessage(memberQuery.error, t('detail.loadError'))}
          </AlertDescription>
        </Alert>
      </WorkingPage>
    );
  }

  const member = memberQuery.data;
  if (!member) {
    return (
      <WorkingPage>
        {backLink}
        <p className="text-base text-muted-foreground">{t('detail.notFound')}</p>
      </WorkingPage>
    );
  }

  return (
    <WorkingPage>
      {backLink}
      <MemberHeader member={member} canManage={canEdit} />
      <div className="grid gap-10 md:grid-cols-2 md:gap-16">
        <div className="flex flex-col gap-10">
          <MembershipSection member={member} />
          <SubscriptionsSection memberId={member.id} canManage={canEdit} />
        </div>
        <div className="flex flex-col gap-10">
          <EditMemberForm member={member} canEdit={canEdit} />
          {canEdit ? <DangerZone member={member} /> : null}
        </div>
      </div>
    </WorkingPage>
  );
}

export default function MemberDetailPage() {
  return (
    <RequirePageAccess href="/members">
      <MemberDetailContent />
    </RequirePageAccess>
  );
}
```

`BackLink`'s `linkComponent` prop expects `{ href, className?, children }`; Next's `Link` satisfies it.

- [ ] **Step 9: Parity, gates, build**

```bash
node -e 'const f=require("./apps/owner/messages/fr.json"),e=require("./apps/owner/messages/en.json");const k=(o,p="")=>Object.entries(o).flatMap(([a,b])=>typeof b==="string"?[p+a]:k(b,p+a+"."));const F=new Set(k(f)),E=new Set(k(e));const d=[...F].filter(x=>!E.has(x)).concat([...E].filter(x=>!F.has(x)));if(d.length){console.error(d);process.exit(1)}console.log("parity ok")'
pnpm check:design && pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

Expected: `parity ok`, all gates green, build green (stop any dev server of this checkout first). `grep -rln "components/card" "apps/owner/app/(app)/members" "apps/owner/app/(app)/schedules"` prints nothing.

- [ ] **Step 10: Visual check**

`/members/<id>` against `L6sMyP.png` (72px avatar, 32px name, badges + « Gérer l'accès », contact block right, two columns with Adhésion rows, tinted subscription tiles, « Modifier le membre » with the dark « Enregistrer » right-aligned, « Zone sensible ») and « Attribuer une formule » against `WYHdY.png`.

- [ ] **Step 11: Format and commit**

```bash
pnpm exec prettier --write "apps/owner/app/(app)/members/[id]/page.tsx" "apps/owner/app/(app)/members/[id]/member-header.tsx" "apps/owner/app/(app)/members/[id]/membership-section.tsx" "apps/owner/app/(app)/members/[id]/subscriptions-section.tsx" "apps/owner/app/(app)/members/[id]/edit-member-form.tsx" "apps/owner/app/(app)/members/[id]/danger-zone.tsx" "apps/owner/app/(app)/members/[id]/edit-access-dialog.tsx" "apps/owner/app/(app)/members/[id]/assign-subscription-dialog.tsx" "apps/owner/app/(app)/members/[id]/cancel-subscription-dialog.tsx" apps/owner/messages/fr.json apps/owner/messages/en.json
git add "apps/owner/app/(app)/members/[id]" apps/owner/messages/fr.json apps/owner/messages/en.json
git commit -m "feat(owner): member detail as two columns of sections with tinted subscription tiles"
```

---

## After Task 8

Dispatch the final whole-branch review over Tasks 1–8 (base = the commit before Task 1), one fix wave, one scoped re-review. Then plan C2 (venues, team, offers dialog) is written from spec §7, §8 and the C2 half of §12.
