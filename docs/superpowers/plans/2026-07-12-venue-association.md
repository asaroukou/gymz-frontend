# Venue association Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the member access-scope + venue-entitlements system (enroll with scope+venues, scope badge, edit-access on existing members) and staff invite-time venue assignment, via a shared venue checklist.

**Architecture:** Add a `Checkbox` primitive to `@iziwellpass/ui` and a reusable owner `VenueChecklist` (checkbox list over `useVenueContext`). A small `access-scope` lib provides the enum tuple + label/badge helpers. The member enroll dialog, member detail edit-access dialog, and staff invite dialog consume these. The client is already regenerated (`AccessScope`, `useSetMemberAccess`, `useSetMemberVenues`, updated `Member`/`CreateMemberRequest`).

**Tech Stack:** Next.js 15 + React 19, react-hook-form + zod, next-intl (fr/en), TanStack Query + Orval hooks, shadcn/Radix (`@iziwellpass/ui`, unified `radix-ui` package), Tailwind v4. `packages/ui` has vitest.

---

## Conventions

- **Commits:** the user is managing commits (currently uncommitted working tree). Each task ends with **Verify**, not a commit. Do not `git commit` unless told.
- **owner has no unit runner** → `pnpm --filter owner typecheck` / `lint` / `build` + preview. **`packages/ui` has vitest** → the `Checkbox` gets a test.
- Run from repo root `/Users/abdel/dev/gymz-v1/web`.

## Facts verified

- `AccessScope = { chain_wide: 'chain_wide', venue_scoped: 'venue_scoped' } as const` (schemas). `Member.access_scope: AccessScope` (readable). `CreateMemberRequest.access_scope?` + `venue_ids?` (comment: defaults to `venue_scoped`, which requires `venue_ids`).
- Mutations: `useSetMemberAccess` → `.mutate({ mid, data: { scope } })`; `useSetMemberVenues` → `.mutate({ mid, data: { venue_ids } })`; `useRegisterMember` → `.mutate({ data: CreateMemberRequest })`; `useInviteStaff` → `.mutate({ data: InviteStaffRequest })`.
- No `Checkbox` in `packages/ui/src/components`; the package uses the unified `radix-ui` import (see `switch.tsx`). `cn` from `@iziwellpass/ui/lib/utils`.
- `useVenueContext()` (`@/lib/venue-context`) returns `{ venues, isLoading, isError, ... }`.
- Member enroll dialog: `app/(app)/members/page.tsx` `AddMemberDialog` (uses `useRegisterMember`, Select for `membership_type`, add-another flow). Member detail: `app/(app)/members/[id]/page.tsx` (has `useGetMember`, `useRole`, Dialog pattern via `SuspendMemberDialog`, `memberStatusBadgeVariant`). Staff invite: `app/(app)/staff/page.tsx` `InviteStaffDialog` (`useInviteStaff`, `ASSIGNABLE_ROLES`, role Select).

## File map

- **Create** `packages/ui/src/components/checkbox.tsx` (+ test) — checkbox primitive.
- **Create** `apps/owner/lib/access-scope.ts` — enum tuple + label/badge helpers.
- **Create** `apps/owner/components/venue-checklist.tsx` — reusable venue checkbox list.
- **Modify** `apps/owner/app/(app)/members/page.tsx` — enroll scope+venues; list badge.
- **Modify** `apps/owner/app/(app)/members/[id]/page.tsx` — detail badge + edit-access dialog.
- **Modify** `apps/owner/app/(app)/staff/page.tsx` — invite venue checklist.
- **Modify** `apps/owner/messages/{fr,en}.json` — new copy.

---

## Task 1: Checkbox primitive (`@iziwellpass/ui`)

**Files:**
- Create: `packages/ui/src/components/checkbox.tsx`
- Test: `packages/ui/src/components/checkbox.test.tsx`

- [ ] **Step 1: Confirm the radix import style**

Read `packages/ui/src/components/switch.tsx` and note how it imports the primitive (expected: `import { Switch as SwitchPrimitive } from 'radix-ui';`). Mirror that exact style for Checkbox. If the package instead uses `@radix-ui/react-checkbox`, use that; report which.

- [ ] **Step 2: Write the failing test**

`packages/ui/src/components/checkbox.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { Checkbox } from './checkbox';

describe('Checkbox', () => {
  it('renders a checkbox role, unchecked by default', () => {
    render(<Checkbox aria-label="pick" />);
    const box = screen.getByRole('checkbox', { name: 'pick' });
    expect(box.getAttribute('data-state')).toBe('unchecked');
  });

  it('reflects the checked prop', () => {
    render(<Checkbox aria-label="pick" checked />);
    expect(screen.getByRole('checkbox', { name: 'pick' }).getAttribute('data-state')).toBe('checked');
  });
});
```

- [ ] **Step 3: Run — verify FAIL**

Run: `pnpm --filter @iziwellpass/ui test -- checkbox 2>&1 | tail -15`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement**

`packages/ui/src/components/checkbox.tsx` (adjust the import per Step 1):
```tsx
'use client';

import type { ComponentProps } from 'react';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import { CheckIcon } from 'lucide-react';

import { cn } from '@iziwellpass/ui/lib/utils';

export function Checkbox({
  className,
  ...props
}: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer size-4 shrink-0 rounded-[4px] border border-input shadow-xs outline-none transition-shadow',
        'focus-visible:ring-[3px] focus-visible:ring-ring/15',
        'data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className="grid place-items-center text-current">
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
```

- [ ] **Step 5: Run — verify PASS + typecheck**

Run: `pnpm --filter @iziwellpass/ui test -- checkbox 2>&1 | tail -8` (PASS) then `pnpm --filter @iziwellpass/ui typecheck 2>&1 | tail -3` (clean).
If `border-input` isn't a defined token in this project, substitute `border-border` (check `globals.css`/other components; `switch.tsx`/`input.tsx` show the convention) and note the change.

---

## Task 2: access-scope lib

**Files:**
- Create: `apps/owner/lib/access-scope.ts`

- [ ] **Step 1: Create the helper**

```ts
import { useTranslations } from 'next-intl';

import { AccessScope } from '@iziwellpass/api/schemas';

/** Both scope values as a tuple for `z.enum(...)`. */
export const ACCESS_SCOPE_VALUES = Object.values(AccessScope) as [AccessScope, ...AccessScope[]];

function humanizeScope(value: string): string {
  const spaced = value.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Fallback-safe label for an access scope, read from the `accessScope.*` namespace. */
export function useAccessScopeLabel(): (value: string) => string {
  const t = useTranslations();
  return (value: string) =>
    t.has(`accessScope.${value}`) ? t(`accessScope.${value}`) : humanizeScope(value);
}

/** Quiet badge variant — scope is descriptive metadata, not a status. */
export function accessScopeBadgeVariant(scope: string): 'secondary' | 'outline' {
  return scope === 'chain_wide' ? 'secondary' : 'outline';
}
```

- [ ] **Step 2: Verify**

Run: `pnpm --filter owner typecheck 2>&1 | grep access-scope || echo "access-scope OK"`
Expected: `access-scope OK`. (Confirm `AccessScope` is exported as a value from `@iziwellpass/api/schemas`; it is — `export const AccessScope`.)

---

## Task 3: i18n copy

**Files:**
- Modify: `apps/owner/messages/fr.json`, `apps/owner/messages/en.json`

- [ ] **Step 1: Add the `accessScope` namespace (top-level, both files)**

`fr.json`: `"accessScope": { "chain_wide": "Tous les établissements", "venue_scoped": "Établissements spécifiques" }`
`en.json`: `"accessScope": { "chain_wide": "All venues", "venue_scoped": "Specific venues" }`

- [ ] **Step 2: Member enroll + detail-access copy**

Add under `members.addDialog` (both files). `fr.json`:
```json
"accessScope": "Accès aux établissements",
"scopeChainWide": "Tous les établissements",
"scopeVenueScoped": "Établissements spécifiques",
"venues": "Établissements",
"venuesRequired": "Sélectionnez au moins un établissement"
```
`en.json`:
```json
"accessScope": "Venue access",
"scopeChainWide": "All venues",
"scopeVenueScoped": "Specific venues",
"venues": "Venues",
"venuesRequired": "Select at least one venue"
```

Add under `members.detail` a new `access` object. `fr.json`:
```json
"access": {
  "title": "Accès aux établissements",
  "current": "Accès actuel",
  "manage": "Gérer l'accès",
  "scopeLabel": "Type d'accès",
  "scopeChainWide": "Tous les établissements",
  "scopeVenueScoped": "Établissements spécifiques",
  "replaceWarning": "La liste ci-dessous remplace entièrement l'accès actuel du membre.",
  "venuesRequired": "Sélectionnez au moins un établissement",
  "submit": "Enregistrer l'accès",
  "submitting": "Enregistrement…",
  "success": "Accès mis à jour",
  "error": "Impossible de mettre à jour l'accès"
}
```
`en.json`:
```json
"access": {
  "title": "Venue access",
  "current": "Current access",
  "manage": "Manage access",
  "scopeLabel": "Access type",
  "scopeChainWide": "All venues",
  "scopeVenueScoped": "Specific venues",
  "replaceWarning": "The list below fully replaces the member's current access.",
  "venuesRequired": "Select at least one venue",
  "submit": "Save access",
  "submitting": "Saving…",
  "success": "Access updated",
  "error": "Could not update access"
}
```

- [ ] **Step 3: Staff invite copy**

Add under `staff.inviteDialog` (both files). `fr.json`: `"venues": "Établissements", "venuesRequired": "Sélectionnez au moins un établissement", "venuesHint": "Uniquement pour les rôles liés à un établissement."`
`en.json`: `"venues": "Venues", "venuesRequired": "Select at least one venue", "venuesHint": "Only for venue-scoped roles."`

- [ ] **Step 4: Shared venue-checklist state copy**

Add a top-level `venueChecklist` namespace (both files). `fr.json`: `{ "loadError": "Impossible de charger les établissements", "empty": "Créez d'abord un établissement." }` `en.json`: `{ "loadError": "Could not load venues", "empty": "Create a venue first." }`

- [ ] **Step 5: Verify parity**

Run:
```bash
cd /Users/abdel/dev/gymz-v1/web/apps/owner && node -e 'const fr=require("./messages/fr.json"),en=require("./messages/en.json");function k(o,p=""){return Object.entries(o).flatMap(([a,v])=>v&&typeof v==="object"&&!Array.isArray(v)?k(v,p+a+"."):[p+a]);}const f=new Set(k(fr)),e=new Set(k(en));const of=[...f].filter(x=>!e.has(x)),oe=[...e].filter(x=>!f.has(x));console.log(of.length||oe.length?["GAPS",of,oe]:"parity OK");'
```
Expected: `parity OK`.

---

## Task 4: VenueChecklist component

**Files:**
- Create: `apps/owner/components/venue-checklist.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { useTranslations } from 'next-intl';

import { Checkbox } from '@iziwellpass/ui/components/checkbox';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';

import { useVenueContext } from '@/lib/venue-context';

/**
 * Controlled checkbox list of the org's venues. `value` is the selected venue
 * ids; toggling a row adds/removes its id. Venues come from the shared context
 * (already loaded app-wide). Purely controlled — no internal selection state.
 */
export function VenueChecklist({
  value,
  onChange,
  disabled = false,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const t = useTranslations('venueChecklist');
  const { venues, isLoading, isError } = useVenueContext();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full rounded-md" />
        <Skeleton className="h-8 w-2/3 rounded-md" />
      </div>
    );
  }
  if (isError) {
    return <p className="text-sm text-destructive">{t('loadError')}</p>;
  }
  if (venues.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('empty')}</p>;
  }

  const toggle = (id: string, checked: boolean) => {
    onChange(checked ? [...value, id] : value.filter((v) => v !== id));
  };

  return (
    <div className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-md border p-1">
      {venues.map((venue) => {
        const checked = value.includes(venue.id);
        return (
          <label
            key={venue.id}
            className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
          >
            <Checkbox
              checked={checked}
              disabled={disabled}
              onCheckedChange={(next) => toggle(venue.id, next === true)}
            />
            <span className="truncate">{venue.name}</span>
          </label>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm --filter owner typecheck 2>&1 | grep venue-checklist || echo "venue-checklist OK"`
Expected: `venue-checklist OK`. (Confirm `Checkbox` `onCheckedChange` yields `boolean | 'indeterminate'`; the `next === true` guard handles that.)

---

## Task 5: Member enroll — access scope + venues

**Files:**
- Modify: `apps/owner/app/(app)/members/page.tsx`

- [ ] **Step 1: Extend the schema + defaults**

In `AddMemberDialog`, add imports:
```ts
import { ACCESS_SCOPE_VALUES } from '@/lib/access-scope';
import { VenueChecklist } from '@/components/venue-checklist';
```
Add to the zod object (inside `useMemo`): `access_scope: z.enum(ACCESS_SCOPE_VALUES)` and `venue_ids: z.array(z.string())`. Wrap the object with a refine — change `z.object({...})` to `z.object({...}).superRefine((val, ctx) => { if (val.access_scope === 'venue_scoped' && val.venue_ids.length === 0) { ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['venue_ids'], message: t('addDialog.venuesRequired') }); } })`.
Add to `defaults`: `access_scope: 'venue_scoped'`, `venue_ids: []`.

- [ ] **Step 2: Render the scope Select + conditional checklist**

After the `membership_start` field block (before `notes`), add:
```tsx
            <FormField
              control={form.control}
              name="access_scope"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('addDialog.accessScope')}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="chain_wide">{t('addDialog.scopeChainWide')}</SelectItem>
                      <SelectItem value="venue_scoped">{t('addDialog.scopeVenueScoped')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.watch('access_scope') === 'venue_scoped' ? (
              <FormField
                control={form.control}
                name="venue_ids"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('addDialog.venues')}</FormLabel>
                    <VenueChecklist value={field.value} onChange={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
```

- [ ] **Step 3: Send scope + venues in the payload**

In `onSubmit`'s `registerMember.mutate({ data: {...} })`, add to `data`:
```ts
          access_scope: values.access_scope,
          venue_ids: values.access_scope === 'venue_scoped' ? values.venue_ids : undefined,
```

- [ ] **Step 4: Verify (typecheck/lint + preview)**

Run: `pnpm --filter owner typecheck 2>&1 | grep 'members/page' || echo "enroll OK"` and `pnpm --filter owner lint 2>&1 | tail -3`.
Preview: open the enroll dialog; default is "Établissements spécifiques" with a required checklist (submitting with none shows the error); switching to "Tous les établissements" hides the checklist; submit each and confirm no console errors (check the request payload carries `access_scope`, plus `venue_ids` when scoped, via `preview_network`).

---

## Task 6: Access-scope badge (list + detail)

**Files:**
- Modify: `apps/owner/app/(app)/members/page.tsx`
- Modify: `apps/owner/app/(app)/members/[id]/page.tsx`

- [ ] **Step 1: List badge**

In `members/page.tsx`, add `import { useAccessScopeLabel, accessScopeBadgeVariant } from '@/lib/access-scope';`. In the components that render the status/type badges (`MemberRow` and `MemberCard`), add `const scopeLabel = useAccessScopeLabel();` and, next to the existing type/status `Badge`s, add:
```tsx
                <Badge variant={accessScopeBadgeVariant(member.access_scope)}>
                  {scopeLabel(member.access_scope)}
                </Badge>
```

- [ ] **Step 2: Detail header badge**

In `members/[id]/page.tsx`, add the same import + `const scopeLabel = useAccessScopeLabel();` in the detail content component, and render the scope badge alongside the membership-status badge in the header (near line ~159 where `memberStatusBadgeVariant` is used):
```tsx
        <Badge variant={accessScopeBadgeVariant(member.access_scope)}>
          {scopeLabel(member.access_scope)}
        </Badge>
```

- [ ] **Step 3: Verify**

Run: `pnpm --filter owner typecheck 2>&1 | grep -E 'members/(page|\[id\])' || echo "badges OK"`
Expected: `badges OK`. (Confirm `member.access_scope` exists on the `Member` type — it does after regen.)

---

## Task 7: Member detail — edit-access dialog

**Files:**
- Modify: `apps/owner/app/(app)/members/[id]/page.tsx`

- [ ] **Step 1: Add imports + hooks**

Add to the generated import: `getGetMemberQueryKey` (likely already imported), `getListMembersQueryKey`, `useSetMemberAccess`, `useSetMemberVenues`. Add `import { ACCESS_SCOPE_VALUES, useAccessScopeLabel } from '@/lib/access-scope';` and `import { VenueChecklist } from '@/components/venue-checklist';` and (if missing) `useState`, `useQueryClient`, `toast`, `apiErrorMessage`, Dialog parts, `Button`, `Select*`, `Badge`.

- [ ] **Step 2: Add an `EditAccessDialog`**

Place near `SuspendMemberDialog`:
```tsx
function EditAccessDialog({
  member,
  open,
  onOpenChange,
}: {
  member: Member;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('members');
  const queryClient = useQueryClient();
  const setAccess = useSetMemberAccess();
  const setVenues = useSetMemberVenues();
  const [scope, setScope] = useState<(typeof ACCESS_SCOPE_VALUES)[number]>(member.access_scope);
  const [venueIds, setVenueIds] = useState<string[]>([]);
  const [venuesError, setVenuesError] = useState(false);

  // Reset local edit state whenever the dialog (re)opens for a member.
  useEffect(() => {
    if (open) {
      setScope(member.access_scope);
      setVenueIds([]);
      setVenuesError(false);
    }
  }, [open, member.access_scope]);

  const pending = setAccess.isPending || setVenues.isPending;

  const onDone = () => {
    void queryClient.invalidateQueries({ queryKey: getGetMemberQueryKey(member.id) });
    void queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
    toast.success(t('detail.access.success'));
    onOpenChange(false);
  };
  const onErr = (err: unknown) => toast.error(apiErrorMessage(err, t('detail.access.error')));

  const handleSave = () => {
    if (scope === 'venue_scoped') {
      if (venueIds.length === 0) {
        setVenuesError(true);
        return;
      }
      // setMemberVenues implies venue_scoped.
      setVenues.mutate({ mid: member.id, data: { venue_ids: venueIds } }, { onSuccess: onDone, onError: onErr });
    } else {
      setAccess.mutate({ mid: member.id, data: { scope: 'chain_wide' } }, { onSuccess: onDone, onError: onErr });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('detail.access.title')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <span className="text-sm font-medium">{t('detail.access.scopeLabel')}</span>
            <Select value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chain_wide">{t('detail.access.scopeChainWide')}</SelectItem>
                <SelectItem value="venue_scoped">{t('detail.access.scopeVenueScoped')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {scope === 'venue_scoped' ? (
            <div className="grid gap-2">
              <p className="text-sm text-muted-foreground">{t('detail.access.replaceWarning')}</p>
              <VenueChecklist
                value={venueIds}
                onChange={(next) => {
                  setVenueIds(next);
                  if (next.length > 0) setVenuesError(false);
                }}
              />
              {venuesError ? (
                <p className="text-sm text-destructive">{t('detail.access.venuesRequired')}</p>
              ) : null}
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {useTranslations('common')('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={pending}>
            {pending ? t('detail.access.submitting') : t('detail.access.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```
Note: do not call `useTranslations` inside JSX like the cancel button above — instead add `const tCommon = useTranslations('common');` at the top of the component and use `{tCommon('cancel')}`. (Fix that line accordingly.)

- [ ] **Step 3: Add the "Gérer l'accès" section + trigger**

In the member detail content component, add `const [accessOpen, setAccessOpen] = useState(false);` and a small block near the access-scope badge (Task 6) shown when the user can manage (reuse the page's existing `canManage`/role gate):
```tsx
        {canManage ? (
          <Button variant="outline" size="sm" onClick={() => setAccessOpen(true)}>
            {t('detail.access.manage')}
          </Button>
        ) : null}
```
And render the dialog once: `<EditAccessDialog member={member} open={accessOpen} onOpenChange={setAccessOpen} />`. Match the exact `canManage` expression the page already uses (grep for `useRole`/`canManage` in the file; owner/admin, possibly receptionist — use whatever the page uses for member mutations).

- [ ] **Step 4: Verify (typecheck/lint + preview)**

Run: `pnpm --filter owner typecheck 2>&1 | tail -4` (clean) and `pnpm --filter owner lint 2>&1 | tail -3`.
Preview: open a member detail, click "Gérer l'accès"; flip to "Tous les établissements" and save (member scope badge updates to chain-wide); reopen, choose "Établissements spécifiques", see the replace warning, saving with no venues shows the required error, pick ≥1 and save (badge updates to venue-scoped). No console errors.

---

## Task 8: Staff invite — venue assignment

**Files:**
- Modify: `apps/owner/app/(app)/staff/page.tsx`

- [ ] **Step 1: Extend schema + defaults + payload gate**

In `InviteStaffDialog`, add `import { VenueChecklist } from '@/components/venue-checklist';`. Add a venue-scoped-role helper near the top of the file:
```ts
const VENUE_SCOPED_ROLES = ['trainer', 'receptionist'] as const;
const isVenueScopedRole = (role: string): boolean =>
  (VENUE_SCOPED_ROLES as readonly string[]).includes(role);
```
Add to the zod object `venue_ids: z.array(z.string())`, and wrap with `.superRefine((val, ctx) => { if (isVenueScopedRole(val.role) && val.venue_ids.length === 0) { ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['venue_ids'], message: t('inviteDialog.venuesRequired') }); } })`. Add `venue_ids: []` to `defaults`.

- [ ] **Step 2: Conditional checklist**

After the `role` FormField, add:
```tsx
            {isVenueScopedRole(form.watch('role')) ? (
              <FormField
                control={form.control}
                name="venue_ids"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('inviteDialog.venues')}</FormLabel>
                    <VenueChecklist value={field.value} onChange={field.onChange} />
                    <p className="text-sm text-muted-foreground">{t('inviteDialog.venuesHint')}</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
```

- [ ] **Step 3: Payload**

In `onSubmit`, replace `{ data: values }` with:
```ts
      {
        data: {
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email,
          role: values.role,
          venue_ids: isVenueScopedRole(values.role) ? values.venue_ids : undefined,
        },
      },
```

- [ ] **Step 4: Verify (typecheck/lint + preview)**

Run: `pnpm --filter owner typecheck 2>&1 | grep 'staff/page' || echo "staff OK"` and `pnpm --filter owner lint 2>&1 | tail -3`.
Preview: open the invite dialog; with role trainer/receptionist the venue checklist shows and is required; switching to admin hides it; invite a trainer with a venue and confirm `venue_ids` in the payload (`preview_network`), no console errors.

---

## Task 9: Final verification

- [ ] **Step 1: Full checks**

Run:
```bash
cd /Users/abdel/dev/gymz-v1/web
pnpm --filter @iziwellpass/ui test 2>&1 | tail -6
pnpm --filter @iziwellpass/api typecheck && \
pnpm --filter @iziwellpass/ui typecheck && \
pnpm --filter owner typecheck && \
pnpm --filter owner lint && \
pnpm --filter owner build 2>&1 | tail -12
```
Expected: ui tests green (incl. Checkbox); all typecheck/lint pass; build completes.

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

- [ ] **Step 3: Preview smoke**

Enroll a venue-scoped and a chain-wide member; confirm scope badges on the list; edit an existing member's access (flip + set-venues with the replace warning); invite a trainer with a venue. No console errors. Screenshot the member list showing scope badges.

---

## Self-review notes (author)

- **Spec coverage:** shared blocks → Tasks 1 (Checkbox), 2 (access-scope lib), 4 (VenueChecklist); member enroll + contract fix → Task 5; scope badge → Task 6; edit-access → Task 7; staff invite → Task 8; i18n → Task 3; verification → Task 9. All spec sections mapped.
- **Deviation:** the spec's "pre-check the sole venue" convenience is dropped — `VenueChecklist` stays purely controlled (no auto-select effect) to avoid controlled/effect races. Single-venue users check the one box. Low-cost, noted.
- **Type consistency:** `ACCESS_SCOPE_VALUES` (Task 2) used in Tasks 5 & 7; `VenueChecklist({ value, onChange, disabled? })` signature consistent across Tasks 4/5/7/8; mutation shapes `{ mid, data }` per verified generated signatures; `member.access_scope` read in Tasks 6/7.
- **Checkbox token caveat:** Task 1 Step 5 flags the `border-input` vs `border-border` token check so the primitive matches the project's convention.
- **owner has no unit runner:** owner-side logic verified by typecheck + preview; the one test-capable addition (`Checkbox` in `packages/ui`) gets a vitest.
