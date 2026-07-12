# Scoped navigation grouping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the owner sidebar into a venue-scoped group (headed by the venue switcher showing the current venue) and an org-wide "Organisation" group, so it's visually obvious which pages follow the current venue.

**Architecture:** `nav.ts` gains a `scope` per item and a `navGroupsForRole()` helper. `AppShell` grows `navGroups` + a `navHeader` sidebar slot (rendered in both desktop sidebar and mobile drawer) while keeping the flat `nav` prop for back-compat. The venue switcher moves into `navHeader` on desktop and stays as a compact mobile-topbar control (`leading`, `md:hidden`). All visuals follow `DESIGN.md` ("Le comptoir calme": one-ink, hairline-led, quiet, `label`-type section headings).

**Tech Stack:** Next.js 15 + React 19, next-intl (fr/en), shadcn/Radix (`@iziwellpass/ui`), Tailwind v4. `packages/ui` uses vitest.

---

## Conventions & design constraints

- **Commits ON HOLD** — each task ends with Verify, not a commit. Suggested messages given; do not `git commit`.
- **owner has no unit runner** → verify with `pnpm --filter owner typecheck` / `lint` / `build` + preview. **`packages/ui` has vitest** → the `AppShell` change gets tests.
- Run commands from repo root `/Users/abdel/dev/gymz-v1/web`.
- **DESIGN.md fidelity (binding):** distinction is carried by a **1px hairline** (`border-border`) + one small **section label** (`text-xs font-medium text-muted-foreground`, sentence case) + the venue name. No boxes, no tints, no side-stripes, no new color. Active pill unchanged (solid `bg-primary`/`text-primary-foreground`). Motion ≤150ms color/opacity only.

## Facts verified

- Only `apps/owner/app/(app)/layout.tsx` renders `<AppShell>` (onboarding does NOT). `packages/ui/src/app-shell.test.tsx` passes a flat `nav` — keep that prop working.
- `nav.ts`: `NAV_ITEMS` = dashboard `/`, frontdesk `/checkins`, members `/members`, planning `/schedules`, venues `/venues`, staff `/staff`, each with `roles`. `navForRole(role)` and `canAccessPath(role, href)` exist.
- `AppShell` (`app-shell.tsx`): desktop `<aside className="hidden ... md:flex">` with `Wordmark` (h-[72px]) then `NavLinks`; mobile `Sheet` drawer repeats `Wordmark` + `NavLinks`; topbar `<header>` has the `Sheet` trigger, then `{leading}` (added earlier), then `<div className="ml-auto ...">{actions}</div>`.
- `VenueSwitcher` (`apps/owner/components/venue-switcher.tsx`) trigger `Button` has `className="max-w-[220px] gap-2"`; also renders an outline `Button` for the 0-venues CTA.
- `cn` is exported from `@iziwellpass/ui/lib/utils`.

## File map

- **Modify** `apps/owner/lib/nav.ts` — add `scope` + `navGroupsForRole()`.
- **Modify** `packages/ui/src/app-shell.tsx` — `navGroups` + `navHeader`; grouped rendering.
- **Modify** `packages/ui/src/app-shell.test.tsx` — grouped-nav + navHeader tests.
- **Modify** `apps/owner/components/venue-switcher.tsx` — accept `className` for reuse.
- **Modify** `apps/owner/app/(app)/layout.tsx` — build groups, mount switcher in `navHeader` + mobile `leading`, redirect guard.
- **Modify** `apps/owner/messages/{fr,en}.json` — `nav.organizationGroup`.

---

## Task 1: nav.ts — scope + grouped helper

**Files:**
- Modify: `apps/owner/lib/nav.ts`

- [ ] **Step 1: Add `scope` to items and a grouped helper**

Add `scope: 'venue' | 'org'` to each `NAV_ITEMS` entry and a new exported type + helper. Edit `NAV_ITEMS` to:

```ts
export type NavScope = 'venue' | 'org';

export interface OwnerNavItem {
  labelKey: NavLabelKey;
  href: string;
  roles: readonly Role[];
  scope: NavScope;
}

const STAFF_ROLES = ['owner', 'admin', 'trainer', 'receptionist'] as const;

export const NAV_ITEMS: readonly OwnerNavItem[] = [
  { labelKey: 'dashboard', href: '/', roles: STAFF_ROLES, scope: 'venue' },
  { labelKey: 'frontdesk', href: '/checkins', roles: STAFF_ROLES, scope: 'venue' },
  { labelKey: 'planning', href: '/schedules', roles: STAFF_ROLES, scope: 'venue' },
  { labelKey: 'members', href: '/members', roles: ['owner', 'admin', 'receptionist'], scope: 'org' },
  { labelKey: 'venues', href: '/venues', roles: ['owner', 'admin'], scope: 'org' },
  { labelKey: 'staff', href: '/staff', roles: ['owner', 'admin'], scope: 'org' },
];
```

(Order changed so venue-scoped items are contiguous: dashboard, frontdesk, planning, then org: members, venues, staff. `canAccessPath` looks items up by `href`, so order does not affect it.)

Add below `navForRole` (keep `navForRole` and `canAccessPath` unchanged):

```ts
export interface OwnerNavGroup {
  scope: NavScope;
  items: { labelKey: NavLabelKey; href: string }[];
}

/**
 * Role-filtered nav split into the venue-scoped group (governed by the venue
 * switcher) and the org-wide group. Empty groups are dropped so a role that
 * can see only one zone renders only that zone.
 */
export function navGroupsForRole(role: Role | null): OwnerNavGroup[] {
  const visible =
    role === 'platform_admin'
      ? NAV_ITEMS
      : role
        ? NAV_ITEMS.filter((i) => i.roles.includes(role))
        : [];
  const scopes: NavScope[] = ['venue', 'org'];
  return scopes
    .map((scope) => ({
      scope,
      items: visible
        .filter((i) => i.scope === scope)
        .map(({ labelKey, href }) => ({ labelKey, href })),
    }))
    .filter((g) => g.items.length > 0);
}
```

- [ ] **Step 2: Verify**

Run: `pnpm --filter owner typecheck 2>&1 | grep 'lib/nav' || echo "nav OK"`
Expected: `nav OK`.

- [ ] **Step 3: Commit (DEFERRED — hold)** — `feat(owner): nav items grouped by venue/org scope`

---

## Task 2: AppShell — grouped nav + navHeader slot

**Files:**
- Modify: `packages/ui/src/app-shell.tsx`
- Test: `packages/ui/src/app-shell.test.tsx`

- [ ] **Step 1: Write failing tests**

Add these cases inside `describe('AppShell', ...)` in `app-shell.test.tsx`:

```tsx
  it('renders the navHeader slot in the sidebar', () => {
    render(
      <AppShell nav={nav} title="IziWellPass" navHeader={<span>venue-switcher</span>}>
        <p>content</p>
      </AppShell>,
    );
    expect(screen.getAllByText('venue-switcher').length).toBeGreaterThan(0);
  });

  it('renders grouped nav with a group label', () => {
    render(
      <AppShell
        title="IziWellPass"
        navGroups={[
          { items: [{ title: 'Dashboard', href: '/' }] },
          { label: 'Organisation', items: [{ title: 'Members', href: '/members' }] },
        ]}
      >
        <p>content</p>
      </AppShell>,
    );
    expect(screen.getAllByText('Organisation').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Dashboard' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Members' }).length).toBeGreaterThan(0);
  });
```

(Use `getAllBy*` because the sidebar and the mobile drawer both render the nav, so nodes appear twice.)

- [ ] **Step 2: Run tests — verify they FAIL**

Run: `pnpm --filter @iziwellpass/ui test -- app-shell 2>&1 | tail -20`
Expected: FAIL (`navHeader`/`navGroups` unknown props; text not found).

- [ ] **Step 3: Implement grouped nav + navHeader**

In `app-shell.tsx`:

Add types + props. After the existing `NavItem` interface:
```ts
export interface NavGroup {
  /** Optional section heading. Omit for the leading (venue) group headed by navHeader. */
  label?: string;
  items: NavItem[];
}
```
In `AppShellProps`, after `nav: NavItem[];` change it to optional and add the new props:
```ts
  /** Flat nav (back-compat). Ignored when `navGroups` is provided. */
  nav?: NavItem[];
  /** Grouped nav; takes precedence over `nav`. Groups render top-to-bottom with a hairline between them. */
  navGroups?: NavGroup[];
  /** Sidebar slot rendered below the wordmark, above the nav (e.g. the venue switcher). */
  navHeader?: ReactNode;
```

Add a grouped renderer (replaces direct `NavLinks` use in the sidebar/drawer). Keep `NavLinks` as the per-group link list, but factor the link out so a group can render its own label + links:

```tsx
function NavGroupList({
  groups,
  currentPath,
  linkComponent: LinkComponent = DefaultLink,
  onNavigate,
}: {
  groups: NavGroup[];
  currentPath?: string;
  linkComponent?: ComponentType<AnchorHTMLAttributes<HTMLAnchorElement>>;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex flex-col px-2 py-2">
      {groups.map((group, i) => (
        <div
          key={group.label ?? `group-${i}`}
          className={cn('flex flex-col gap-1', i > 0 && 'mt-3 border-t border-border pt-3')}
        >
          {group.label ? (
            <p className="px-4 pb-1 text-xs font-medium text-muted-foreground">{group.label}</p>
          ) : null}
          {group.items.map((item) => {
            const active = isActivePath(item.href, currentPath);
            return (
              <LinkComponent
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                data-active={active || undefined}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/15 lg:h-9',
                  active
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                {item.icon}
                {item.title}
              </LinkComponent>
            );
          })}
        </div>
      ))}
    </div>
  );
}
```

Add a helper to normalize props to groups (so flat `nav` still works):
```tsx
function toGroups(navGroups?: NavGroup[], nav?: NavItem[]): NavGroup[] {
  if (navGroups && navGroups.length > 0) return navGroups;
  return nav ? [{ items: nav }] : [];
}
```

Destructure the new props in `AppShell({ ... })` (`nav`, `navGroups`, `navHeader` alongside the rest), compute `const groups = toGroups(navGroups, nav);`, and render. In the **desktop sidebar** `<aside>`, replace the `<NavLinks .../>` with:
```tsx
        {navHeader ? <div className="px-2 pb-2">{navHeader}</div> : null}
        <NavGroupList
          groups={groups}
          currentPath={currentPath}
          linkComponent={linkComponent}
          onNavigate={handleNavigate}
        />
```
In the **mobile drawer** `SheetContent`, after the `SheetTitle` wordmark block, likewise replace `<NavLinks .../>` with the same two blocks (navHeader + `NavGroupList`).

The old `NavLinks` function may now be unused — delete it if so (tsc/lint will confirm). Ensure `cn` is imported (it already is, line 8).

- [ ] **Step 4: Run tests — verify they PASS**

Run: `pnpm --filter @iziwellpass/ui test -- app-shell 2>&1 | tail -20`
Expected: PASS (all AppShell cases, including the earlier `leading`-slot test).

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @iziwellpass/ui typecheck 2>&1 | tail -3`
Expected: clean.

- [ ] **Step 6: Commit (DEFERRED — hold)** — `feat(ui): AppShell grouped nav + navHeader slot`

---

## Task 3: VenueSwitcher — reusable width

**Files:**
- Modify: `apps/owner/components/venue-switcher.tsx`

- [ ] **Step 1: Accept a `className` on the trigger/CTA**

Add a `className` prop and merge it onto the trigger button and the 0-venues CTA button so the switcher can be full-width in the sidebar and compact in the mobile topbar. Import `cn`:
```ts
import { cn } from '@iziwellpass/ui/lib/utils';
```
Change the component signature to:
```tsx
export function VenueSwitcher({ className }: { className?: string } = {}) {
```
On the 0-venues CTA `Button`, add `className={cn('justify-start', className)}`. On the main trigger `Button`, change `className="max-w-[220px] gap-2"` to `className={cn('gap-2', className)}`.

(The skeleton loading branch can keep its fixed `className="h-9 w-44 rounded-full"`, or use `cn('h-9 w-44 rounded-full', className)` — use the `cn` form so a full-width sidebar skeleton matches.)

- [ ] **Step 2: Verify**

Run: `pnpm --filter owner typecheck 2>&1 | grep venue-switcher || echo "venue-switcher OK"` and `pnpm --filter owner lint 2>&1 | tail -3`
Expected: `venue-switcher OK`; lint clean.

- [ ] **Step 3: Commit (DEFERRED — hold)** — `refactor(owner): VenueSwitcher accepts className`

---

## Task 4: layout.tsx — mount grouped nav + switcher placements + i18n

**Files:**
- Modify: `apps/owner/app/(app)/layout.tsx`
- Modify: `apps/owner/messages/fr.json`, `apps/owner/messages/en.json`

- [ ] **Step 1: Add the group label copy**

Add `"organizationGroup"` inside the existing `nav` namespace in both files (parity):
`fr.json` `nav`: `"organizationGroup": "Organisation"`
`en.json` `nav`: `"organizationGroup": "Organization"`

- [ ] **Step 2: Build grouped nav and mount the switcher**

In `apps/owner/app/(app)/layout.tsx`:
- Replace the `navForRole` import usage with `navGroupsForRole`: change `import { navForRole, type NavLabelKey } from '@/lib/nav';` to `import { navGroupsForRole, type NavLabelKey } from '@/lib/nav';`.
- Replace the `navItems`/`nav` construction. Currently:
  ```tsx
  const navItems = session.status === 'signed-in' ? navForRole(session.claims.role) : [];
  const nav: NavItem[] = navItems.map((item) => { ... });
  ```
  with:
  ```tsx
  const groups = session.status === 'signed-in' ? navGroupsForRole(session.claims.role) : [];
  const navItemCount = groups.reduce((count, group) => count + group.items.length, 0);
  const navGroups: NavGroup[] = groups.map((group) => ({
    label: group.scope === 'org' ? tNav('organizationGroup') : undefined,
    items: group.items.map((item) => {
      const Icon = NAV_ICONS[item.labelKey];
      return {
        title: tNav(item.labelKey),
        href: item.href,
        icon: <Icon className="size-4 shrink-0" />,
      };
    }),
  }));
  ```
- Update the `NavItem` import to also pull `NavGroup`: `import { AppShell, type NavGroup, type NavItem } from '@iziwellpass/ui/app-shell';` (keep `NavItem` if still referenced; if not, drop it — tsc/lint will tell you).
- Update the redirect guard: change `if (session.status === 'signed-in' && nav.length === 0)` to use `navItemCount === 0`, and the later early return `if (nav.length === 0)` to `if (navItemCount === 0)`.
- Change the final return to pass grouped nav + both switcher placements:
  ```tsx
  return (
    <VenueProvider>
      <AppShell
        title="IziWellPass"
        navGroups={navGroups}
        navHeader={<VenueSwitcher className="w-full" />}
        linkComponent={NavLink}
        currentPath={pathname}
        openMenuLabel={tShell('openMenu')}
        leading={<VenueSwitcher className="max-w-[168px] md:hidden" />}
        actions={<UserMenu />}
      >
        {children}
      </AppShell>
    </VenueProvider>
  );
  ```
  (Desktop: the sidebar `navHeader` switcher shows, `leading` is `md:hidden`. Mobile: the sidebar is hidden, the compact `leading` switcher shows in the topbar; the drawer also carries the full switcher via `navHeader`.)

- [ ] **Step 3: Verify**

Run:
```bash
cd /Users/abdel/dev/gymz-v1/web
pnpm --filter owner typecheck 2>&1 | tail -4
pnpm --filter owner lint 2>&1 | tail -3
cd apps/owner && node -e 'const fr=require("./messages/fr.json"),en=require("./messages/en.json");function k(o,p=""){return Object.entries(o).flatMap(([a,v])=>v&&typeof v==="object"&&!Array.isArray(v)?k(v,p+a+"."):[p+a]);}const f=new Set(k(fr)),e=new Set(k(en));const of=[...f].filter(x=>!e.has(x)),oe=[...e].filter(x=>!f.has(x));console.log(of.length||oe.length?["GAPS",of,oe]:"parity OK");'
```
Expected: typecheck clean; lint clean; `parity OK`.

- [ ] **Step 4: Commit (DEFERRED — hold)** — `feat(owner): scoped sidebar groups + switcher in sidebar`

---

## Task 5: Verification + DESIGN.md critique

- [ ] **Step 1: Full checks**

Run:
```bash
cd /Users/abdel/dev/gymz-v1/web
pnpm --filter @iziwellpass/ui test 2>&1 | tail -6
pnpm --filter @iziwellpass/ui typecheck && \
pnpm --filter owner typecheck && \
pnpm --filter owner lint && \
pnpm --filter owner build 2>&1 | tail -12
```
Expected: ui tests green; all typecheck/lint pass; build completes.

- [ ] **Step 2: DESIGN.md fidelity self-critique**

Read the rendered structure against `DESIGN.md` and confirm each — fix any that fail:
- Separation is a **1px hairline** (`border-border`) + one `text-xs font-medium text-muted-foreground` sentence-case label ("Organisation"), nothing louder. No box, tint, gradient, or side-stripe.
- The venue switcher heads the venue group; active nav item is still the solid-encre pill; inactive items unchanged (`text-muted-foreground` + hover wash).
- No new color introduced; motion is color/opacity ≤150ms; touch targets `h-11` on mobile preserved.
- No `#000`/`#fff`, no ALL-CAPS, no emoji.

- [ ] **Step 3: Preview smoke (when a server is available)**

With the dev server running, verify via `preview_*`, no console errors:
- Desktop: sidebar shows the venue switcher heading dashboard/front desk/planning, a hairline, then "Organisation" over members/venues/staff. Switching venue re-scopes the venue-group pages.
- Mobile width: compact switcher in the topbar; hamburger opens a drawer with the same grouping.
- Single-venue and 0-venue states render sensibly.
Capture a desktop screenshot of the sidebar.

- [ ] **Step 4: Commit (DEFERRED — hold)** — squash-ready: `feat: scoped navigation grouping`

---

## Self-review notes (author)

- **Brief coverage:** venue-name-headed group via switcher-in-`navHeader` → Tasks 2,3,4; org group with "Organisation" label → Tasks 1,2,4; hairline seam + label type → Task 2 (DESIGN.md classes); mobile compact switcher (`leading`, `md:hidden`) + drawer grouping → Tasks 2,4; states (loading/error/0/1 venue) inherited from the existing `VenueSwitcher` → unchanged. All brief sections mapped.
- **Type consistency:** `NavGroup` (ui) vs `OwnerNavGroup` (nav.ts) are deliberately distinct — the layout maps the latter to the former; `navGroups`/`navHeader` names match across Tasks 2 and 4.
- **Back-compat:** `nav` stays optional and works (flat), so the existing `leading`-slot test and any flat consumer keep passing; `toGroups()` normalizes.
- **No owner test file:** owner has no runner; grouping logic (`navGroupsForRole`) is covered by typecheck + the AppShell vitest (which exercises grouped rendering) + preview.
