# « Le comptoir clair » SP-C, plan C2 — Working Screens (venues, team, offers dialog) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the owner app's venue (new + detail), team and offer-dialog screens exactly as drawn on the canvas, on the working-screen primitives plan C1 landed.

**Architecture:** No new ui primitives. `VenueFormFields` gains a `layout="rows"` mode and `VenueChecklist` loses its bordered box. The venue detail page (1175 lines) and the team page (783 lines) are split into small files composed from `WorkingPage`, `SectionHeading`, the restyled `Table`/`Dialog` and the lib helpers. Data hooks, mutations and zod schemas move unchanged. The offer dialog is restyled in place.

**Tech Stack:** Next 15 / React 19, Tailwind v4, Radix, react-query, react-hook-form + zod, next-intl, sonner, vitest.

**Spec:** `docs/superpowers/specs/2026-09-20-comptoir-clair-working-screens-design.md` (§7, §8, §9, §12 C2 half; decisions D1–D11).

## Global Constraints

- The canvas `screens.pen` is the source of truth; C2 frames are `aussB` (Nouvel établissement), `Ro3gM` (Établissement · Fiche), `W1G1mM` (Ajouter une ressource), `e0TehM` (Équipe), `RZF9q` (Inviter), `TmgT0` (Retirer), `N2Rqjs` (Créer une offre); PNGs in `docs/design-refs/comptoir-clair/`.
- Plan C1 is the base (HEAD ≥ 66b2a30): `WorkingPage`, `WorkingHeader({ title, subtitle?, action?, badges? })`, `BackLink({ href, linkComponent })`, `SectionHeading({ title, description?, action? })`, `KeyValueList/Row` from `@iziwellpass/ui/components/working-page`; `Table` (`table-fixed` when column widths are fixed), `Dialog` (default 520px, viewport-capped, `DialogClose` for ghost cancels), `RowsSkeleton` at `apps/owner/components/rows-skeleton.tsx`, `roleBadgeVariant` at `apps/owner/lib/role-badge.ts`.
- Canvas « Button/Secondary » = ui `variant="outline"` (spec D11). ui `secondary` (grey fill) only for tabs, chips and empty-state CTAs.
- One dark 44px control per surface. Dark *small* buttons inside a section are allowed where the canvas draws them (« + Ajouter une ressource », spec D1).
- Desktop rows keep the 36px « ··· » (`icon-sm`); anything rendered below `md` uses 44px (`size="icon"` on phone stacks).
- Overlays opened from a row menu stay mounted and are driven by an `open` boolean (never `{state ? <Dialog/> : null}` that unmounts on close) so Radix restores focus.
- Font weights `font-normal`/`font-medium`/`font-semibold` only; sentence case; no `Card`, no bordered box around content (`VenueChecklist` included); hairlines only between rows; status tints never as text colour.
- Type scale: `text-xs` 12, `text-sm` 13, `text-md` 14, `text-base` 15, `text-lg` 16, `text-xl` 22, `text-2xl` 32.
- `apps/owner/messages/fr.json` and `en.json` change together with targeted edits (never re-serialize); no key deletions in C2 (orphans are for the final fix wave). Parity one-liner (must print `parity ok`):
  `node -e 'const f=require("./apps/owner/messages/fr.json"),e=require("./apps/owner/messages/en.json");const k=(o,p="")=>Object.entries(o).flatMap(([a,b])=>typeof b==="string"?[p+a]:k(b,p+a+"."));const F=new Set(k(f)),E=new Set(k(e));const d=[...F].filter(x=>!E.has(x)).concat([...E].filter(x=>!F.has(x)));if(d.length){console.error(d);process.exit(1)}console.log("parity ok")'`
- No new dependencies; no `@testing-library/jest-dom` (plain vitest assertions). Owner unit tests: `apps/owner/lib/**/*.test.ts` (node).
- Gates before every commit: `pnpm check:design && pnpm typecheck && pnpm lint && pnpm test` from the repo root. `pnpm build` in Task 6 only, and never while a dev server of the same checkout runs (if one runs, build in a throwaway `git worktree` of the commit instead).
- Prettier on changed files only. Commits use explicit pathspecs. Paths contain parentheses/brackets: quote them in the shell.

---

### Task 1: `VenueFormFields layout="rows"`, `VenueChecklist` without a box, new-venue page

**Files:**
- Modify: `apps/owner/components/venue-form-fields.tsx`
- Modify: `apps/owner/components/venue-checklist.tsx`
- Modify: `apps/owner/app/(app)/venues/new/page.tsx` (rewrite)

**Interfaces:**
- Produces: `VenueFormFields({ form, disabled?, layout?: 'stack' | 'rows' })` — `'stack'` (default) is today's behaviour (each field a sibling; callers place them in their own grid); `'rows'` renders Nom · Type / Description / Adresse / Ville · Pays / Fuseau horaire · Téléphone as `grid gap-4 sm:grid-cols-2` rows inside a `flex flex-col gap-[18px]`. Task 2 uses `'rows'`. `VenueChecklist` keeps its props.

- [ ] **Step 1: `layout` prop on `VenueFormFields`**

Replace the component's signature and body wrapper (the seven `FormField` blocks stay byte-identical; only their grouping changes):

```tsx
export function VenueFormFields<T extends VenueFieldValues & FieldValues>({
  form,
  disabled = false,
  layout = 'stack',
}: {
  form: UseFormReturn<T>;
  disabled?: boolean;
  /** `rows`: the canvas two-column rows (Nom · Type / Description / Adresse / Ville · Pays / Fuseau · Téléphone). */
  layout?: 'stack' | 'rows';
}) {
  const t = useTranslations('venues');
  const typeOptions = useActivityTypeOptions();
  const name = (k: keyof VenueFieldValues) => k as FieldPath<T>;

  const nameField = ( /* the existing name FormField */ );
  const typeField = ( /* the existing venue_type FormField */ );
  const descriptionField = ( /* existing, but its FormItem className becomes layout === 'stack' ? 'sm:col-span-2' : undefined */ );
  const addressField = ( /* same treatment */ );
  const cityField = ( /* existing */ );
  const countryField = ( /* existing */ );
  const timezoneField = ( /* existing, className as above */ );
  const phoneField = ( /* existing */ );

  if (layout === 'stack') {
    return (
      <>
        {nameField}
        {typeField}
        {descriptionField}
        {addressField}
        {cityField}
        {countryField}
        {timezoneField}
        {phoneField}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="grid gap-4 sm:grid-cols-2">
        {nameField}
        {typeField}
      </div>
      {descriptionField}
      {addressField}
      <div className="grid gap-4 sm:grid-cols-2">
        {cityField}
        {countryField}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {timezoneField}
        {phoneField}
      </div>
    </div>
  );
}
```

Assign each existing `<FormField … />` element to the named `const` (keep every prop as it is today; the `Textarea` in `descriptionField` gets `className="min-h-24"`). Only three `FormItem`s carried `sm:col-span-2` (description, address, timezone): make that `className={layout === 'stack' ? 'sm:col-span-2' : undefined}`.

- [ ] **Step 2: `VenueChecklist` as a hairline-free list (canvas `RZF9q`)**

Replace the list container and rows:

```tsx
    <div className="flex max-h-56 flex-col gap-3 overflow-y-auto">
      {venues.map((venue) => {
        const checked = value.includes(venue.id);
        return (
          <label key={venue.id} className="flex items-center gap-2.5 text-base">
            <Checkbox
              checked={checked}
              disabled={disabled}
              aria-label={venue.name}
              onCheckedChange={(next) => toggle(venue.id, next === true)}
            />
            <span className="truncate">{venue.name}</span>
          </label>
        );
      })}
    </div>
```

and the loading skeletons: `<Skeleton className="h-5 w-40 rounded-full" />` ×2 in a `flex flex-col gap-3`.

- [ ] **Step 3: Rewrite `venues/new/page.tsx`**

```tsx
'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { unwrap } from '@iziwellpass/api/client';
import { getListVenuesQueryKey, useCreateVenue } from '@iziwellpass/api/generated';
import { Button } from '@iziwellpass/ui/components/button';
import { Form } from '@iziwellpass/ui/components/form';
import { BackLink, WorkingHeader, WorkingPage } from '@iziwellpass/ui/components/working-page';

import { RequirePageAccess } from '@/components/page-access';
import { VenueFormFields } from '@/components/venue-form-fields';
import { ACTIVITY_TYPE_VALUES } from '@/lib/activity-type';
import { apiErrorMessage, applyFieldErrors } from '@/lib/api-error';

function CreateVenueContent() {
  const t = useTranslations('venues');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const queryClient = useQueryClient();
  const createVenue = useCreateVenue();

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t('detail.profile.nameRequired')),
        venue_type: z.enum(ACTIVITY_TYPE_VALUES),
        description: z.string(),
        address_line: z.string(),
        city: z.string().min(1, t('create.cityRequired')),
        country: z.string().min(1, t('create.countryRequired')),
        timezone: z.string().min(1, t('detail.profile.timezoneRequired')),
        phone: z.string(),
      }),
    [t],
  );

  type CreateValues = z.infer<typeof schema>;

  const form = useForm<CreateValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      venue_type: 'gym',
      description: '',
      address_line: '',
      city: '',
      country: '',
      timezone: '',
      phone: '',
    },
  });

  const onSubmit = (values: CreateValues) => {
    createVenue.mutate(
      {
        data: {
          name: values.name,
          venue_type: values.venue_type,
          description: values.description || null,
          address_line: values.address_line || null,
          city: values.city,
          country: values.country,
          timezone: values.timezone,
          phone: values.phone || null,
        },
      },
      {
        onSuccess: (response) => {
          const venue = unwrap(response);
          toast.success(t('create.success'));
          void queryClient.invalidateQueries({ queryKey: getListVenuesQueryKey() });
          router.push(`/venues/${venue.id}`);
        },
        onError: (err) => {
          if (!applyFieldErrors(form, err)) {
            toast.error(apiErrorMessage(err, t('create.error')));
          }
        },
      },
    );
  };

  return (
    <WorkingPage>
      <BackLink href="/venues" linkComponent={Link}>
        {t('detail.back')}
      </BackLink>
      <WorkingHeader title={t('create.title')} />
      <Form {...form}>
        <form
          onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
          className="flex w-full max-w-[680px] flex-col gap-[18px]"
        >
          <VenueFormFields form={form} layout="rows" />
          <div className="flex justify-end gap-2.5 pt-2">
            <Button type="button" variant="ghost" asChild>
              <Link href="/venues">{tCommon('cancel')}</Link>
            </Button>
            <Button type="submit" disabled={createVenue.isPending}>
              {createVenue.isPending ? t('create.submitting') : t('create.submit')}
            </Button>
          </div>
        </form>
      </Form>
    </WorkingPage>
  );
}

export default function CreateVenuePage() {
  return (
    <RequirePageAccess href="/venues">
      <CreateVenueContent />
    </RequirePageAccess>
  );
}
```

- [ ] **Step 4: Gates**

Run: `pnpm check:design && pnpm typecheck && pnpm lint && pnpm test`
Expected: green. `grep -n "components/card\|border p-1\|rounded-md border" "apps/owner/app/(app)/venues/new/page.tsx" apps/owner/components/venue-checklist.tsx` prints nothing. The existing `stack` callers (`venues/[id]/page.tsx` ProfileSection, until Task 2) still typecheck.

- [ ] **Step 5: Format and commit**

```bash
pnpm exec prettier --write apps/owner/components/venue-form-fields.tsx apps/owner/components/venue-checklist.tsx "apps/owner/app/(app)/venues/new/page.tsx"
git add apps/owner/components/venue-form-fields.tsx apps/owner/components/venue-checklist.tsx "apps/owner/app/(app)/venues/new/page.tsx"
git commit -m "feat(owner): new-venue page at canvas geometry; venue form rows; checklist without a box"
```

---

### Task 2: Venue detail — page shell, header, profile section

**Files:**
- Modify: `apps/owner/app/(app)/venues/[id]/page.tsx` (rewrite; keeps `ActivitiesSection`/`ResourcesSection` and their dialogs in place for Task 3)
- Create: `apps/owner/app/(app)/venues/[id]/profile-section.tsx`

**Interfaces:**
- Produces: `ProfileSection({ venue, canEdit })` in its own file. The page renders `WorkingPage` → `BackLink` → `WorkingHeader` (name, address subtitle, badges) → two-column grid: left `ProfileSection`, right `ActivitiesSection` + `ResourcesSection` (still defined in `page.tsx` until Task 3 moves them).

- [ ] **Step 1: Create `profile-section.tsx`**

Move `ProfileSection` out of `page.tsx` with its imports (`useEffect`, `useMemo`, `zodResolver`, `useQueryClient`, `useTranslations`, `useForm`, `toast`, `z`, `getGetVenueQueryKey`, `getListVenuesQueryKey`, `useUpdateVenue`, `Venue`, `Button`, `Form*`, `Input`, `Switch`, `Tooltip*`, `VenueFormFields`, `ACTIVITY_TYPE_VALUES`, `apiErrorMessage`, `applyFieldErrors`), export it, keep schema/defaults/`useEffect` reset/mutation byte-identical, and replace the `Card…` return with (canvas `Ro3gM`, Profil column):

```tsx
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading title={t('detail.profile.title')} />
      <Form {...form}>
        <form
          onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
          className="flex flex-col gap-[18px]"
        >
          <VenueFormFields form={form} disabled={!canEdit} layout="rows" />
          {/*
            Email is read-only: `UpdateVenueRequest` has no `email` field, so
            there is no contract to persist an edited value against.
          */}
          <FormItem>
            <FormLabel>{t('detail.profile.email')}</FormLabel>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="block">
                  <Input
                    type="email"
                    value={venue.email ?? ''}
                    disabled
                    readOnly
                    className="pointer-events-none"
                    aria-label={t('detail.profile.email')}
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent>{t('detail.profile.emailReadOnly')}</TooltipContent>
            </Tooltip>
            <p className="text-sm text-muted-foreground">{t('detail.profile.emailReadOnly')}</p>
          </FormItem>
          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <FormLabel className="text-base font-medium">{t('detail.profile.active')}</FormLabel>
                  <p className="text-sm text-muted-foreground">{t('detail.profile.activeHint')}</p>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={!canEdit}
                    aria-label={t('detail.profile.active')}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          {canEdit ? (
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={updateVenue.isPending}>
                {updateVenue.isPending ? t('detail.profile.saving') : t('detail.profile.save')}
              </Button>
            </div>
          ) : null}
        </form>
      </Form>
    </section>
  );
```

(`SectionHeading` from `@iziwellpass/ui/components/working-page`; the `VenueSettings` comment can stay above the switch.)

- [ ] **Step 2: Rewrite the page shell in `page.tsx`**

Delete `ProfileSection` and its now-unused imports from `page.tsx` (keep everything `ActivitiesSection`/`ResourcesSection`/the resource dialogs need). Replace `VenueDetailContent` with:

```tsx
function VenueDetailContent() {
  const t = useTranslations('venues');
  const activityLabel = useActivityTypeLabel();
  const params = useParams<{ id: string }>();
  const venueId = params.id;
  const role = useRole();
  const canEdit = role === 'owner' || role === 'admin';
  const { setSelectedVenueId } = useVenueContext();

  // Unified venue context: opening a venue's detail page makes it the current
  // venue, so the shell switcher reflects the route (route -> context).
  useEffect(() => {
    if (venueId) {
      setSelectedVenueId(venueId);
    }
  }, [venueId, setSelectedVenueId]);

  const venueQuery = useGetVenue(venueId, { query: { select: unwrap } });

  const backLink = (
    <BackLink href="/venues" linkComponent={Link}>
      {t('detail.back')}
    </BackLink>
  );

  if (venueQuery.isLoading) {
    return (
      <WorkingPage>
        {backLink}
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-10 md:grid-cols-2 md:gap-16">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </WorkingPage>
    );
  }

  if (venueQuery.isError) {
    return (
      <WorkingPage>
        {backLink}
        <Alert variant="destructive">
          <AlertTitle>{t('errorTitle')}</AlertTitle>
          <AlertDescription>
            {apiErrorMessage(venueQuery.error, t('detail.loadError'))}
          </AlertDescription>
        </Alert>
      </WorkingPage>
    );
  }

  const venue = venueQuery.data;
  if (!venue) {
    return (
      <WorkingPage>
        {backLink}
        <p className="text-base text-muted-foreground">{t('detail.notFound')}</p>
      </WorkingPage>
    );
  }

  const subtitle = [venue.address_line, venue.city].filter(Boolean).join(', ') || t('noAddress');

  return (
    <WorkingPage>
      {backLink}
      <WorkingHeader
        title={venue.name}
        subtitle={subtitle}
        badges={
          <>
            <Badge variant={venue.is_active ? 'success' : 'default'}>
              {venue.is_active ? t('status.active') : t('status.inactive')}
            </Badge>
            <Badge>{activityLabel(venue.venue_type)}</Badge>
          </>
        }
      />
      <div className="grid gap-10 md:grid-cols-2 md:gap-16">
        <ProfileSection venue={venue} canEdit={canEdit} />
        <div className="flex flex-col gap-10">
          <ActivitiesSection venueId={venue.id} canEdit={canEdit} />
          <ResourcesSection venueId={venue.id} canEdit={canEdit} />
        </div>
      </div>
    </WorkingPage>
  );
}
```

Imports to add: `BackLink, WorkingHeader, WorkingPage` from `@iziwellpass/ui/components/working-page`, `ProfileSection` from `./profile-section`; remove `ArrowLeftIcon` and the `Card*` imports only if nothing else in the file still uses them (the two remaining sections still use `Card` until Task 3 — keep that import for now).

- [ ] **Step 3: Gates**

Run: `pnpm check:design && pnpm typecheck && pnpm lint && pnpm test`
Expected: green.

- [ ] **Step 4: Format and commit**

```bash
pnpm exec prettier --write "apps/owner/app/(app)/venues/[id]/page.tsx" "apps/owner/app/(app)/venues/[id]/profile-section.tsx"
git add "apps/owner/app/(app)/venues/[id]/page.tsx" "apps/owner/app/(app)/venues/[id]/profile-section.tsx"
git commit -m "feat(owner): venue detail shell and profile section at canvas geometry"
```

---

### Task 3: Venue detail — activities, resources, resource dialogs

**Files:**
- Create: `apps/owner/app/(app)/venues/[id]/activities-section.tsx`
- Create: `apps/owner/app/(app)/venues/[id]/resources-section.tsx`
- Create: `apps/owner/app/(app)/venues/[id]/resource-dialogs.tsx`
- Modify: `apps/owner/app/(app)/venues/[id]/page.tsx` (becomes the shell only; imports the three files)

**Interfaces:**
- Produces: `ActivitiesSection({ venueId, canEdit })`, `ResourcesSection({ venueId, canEdit })`, and from `resource-dialogs.tsx`: `AddResourceDialog({ venueId, resourceTypes, variant? })`, `EditResourceDialog({ venueId, resource, resourceTypes, open, onOpenChange })`, `DeleteResourceDialog({ venueId, resource, open, onOpenChange })`, `NewResourceTypeDialog({ onCreated })`, plus the shared `useResourceSchema`, `ResourceValues`, `ResourceFormFields`, `BOOKING_MODE_VALUES`.

- [ ] **Step 1: Create `resource-dialogs.tsx`**

Move `BOOKING_MODE_VALUES`, `NewResourceTypeDialog`, `useResourceSchema`, `ResourceValues`, `ResourceFormFields`, `AddResourceDialog`, `EditResourceDialog`, `DeleteResourceDialog` out of `page.tsx` verbatim with their imports; export the four dialogs. Apply only these changes:

- `NewResourceTypeDialog`: trigger `<Button type="button" variant="ghost" size="sm">{t('detail.resources.typeDialog.add')}</Button>` (canvas: ghost small « Nouveau type de ressource » under the table); the trigger is no longer rendered inside the type `FormLabel` row (see `ResourceFormFields` below) but by `ResourcesSection`; so `NewResourceTypeDialog` keeps `onCreated` and `ResourceFormFields` no longer renders it. `DialogContent className="sm:max-w-[520px]"`; form `className="flex flex-col gap-[18px]"`; footer gains a ghost cancel: `<DialogClose asChild><Button type="button" variant="ghost">{tCommon('cancel')}</Button></DialogClose>` before the submit (add `const tCommon = useTranslations('common');`).
- `ResourceFormFields`: the `resource_type_id` item renders only `<FormLabel>` + the `Select` (drop the `flex … justify-between` row and the `NewResourceTypeDialog`); order Nom / Type de ressource / Capacité / Description; `Textarea className="min-h-24"`.
- `AddResourceDialog`: signature `{ venueId, resourceTypes, variant = 'default', size = 'sm' }: { …; variant?: 'default' | 'secondary'; size?: 'default' | 'sm' }`; trigger `<Button variant={variant} size={size}><PlusIcon />{t('detail.resources.add')}</Button>` (canvas `Ro3gM`: dark small in the section heading; the empty state passes `variant="secondary" size="default"`); `DialogContent className="sm:max-w-[520px]"`; form `flex flex-col gap-[18px]`; footer ghost `DialogClose` cancel + dark submit.
- `EditResourceDialog`: same shell/footer treatment (labels `editDialog.saving/save`).
- `DeleteResourceDialog`: `DialogContent className="sm:max-w-[480px]"`; outline cancel → `<DialogClose asChild><Button variant="ghost">{tCommon('cancel')}</Button></DialogClose>`.

- [ ] **Step 2: Create `resources-section.tsx`** (canvas `Ro3gM`, Ressources)

```tsx
'use client';

import { useMemo, useState } from 'react';
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { unwrap } from '@iziwellpass/api/client';
import { useListResources, useListResourceTypes } from '@iziwellpass/api/generated';
import type { Resource } from '@iziwellpass/api/schemas';
import { Alert, AlertDescription } from '@iziwellpass/ui/components/alert';
import { Button } from '@iziwellpass/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@iziwellpass/ui/components/dropdown-menu';
import { Empty, EmptyContent, EmptyDescription, EmptyTitle } from '@iziwellpass/ui/components/empty';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@iziwellpass/ui/components/table';
import { SectionHeading } from '@iziwellpass/ui/components/working-page';

import { RowsSkeleton } from '@/components/rows-skeleton';
import { apiErrorMessage } from '@/lib/api-error';

import {
  AddResourceDialog,
  DeleteResourceDialog,
  EditResourceDialog,
  NewResourceTypeDialog,
} from './resource-dialogs';

/**
 * « Ressources »: a 22px heading with the dark small « + Ajouter une ressource »
 * (spec D1), a hairline table Nom 168 · Type 180 · Capacité 90 · 64 at 46px
 * rows, and a ghost small « Nouveau type de ressource » beneath.
 */
export function ResourcesSection({ venueId, canEdit }: { venueId: string; canEdit: boolean }) {
  const t = useTranslations('venues');
  const resourcesQuery = useListResources(venueId, { query: { select: unwrap } });
  const resourceTypesQuery = useListResourceTypes({ query: { select: unwrap } });
  const resourceTypes = useMemo(() => resourceTypesQuery.data ?? [], [resourceTypesQuery.data]);
  const resourceTypeById = useMemo(
    () => new Map(resourceTypes.map((type) => [type.id, type])),
    [resourceTypes],
  );
  const resources = resourcesQuery.data ?? [];

  // Overlays stay mounted after close so focus returns to the row menu.
  const [editing, setEditing] = useState<Resource | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState<Resource | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <section className="flex flex-col gap-4">
      <SectionHeading
        title={t('detail.resources.title')}
        action={
          canEdit && resources.length > 0 ? (
            <AddResourceDialog venueId={venueId} resourceTypes={resourceTypes} />
          ) : undefined
        }
      />
      {resourcesQuery.isLoading ? (
        <RowsSkeleton rows={3} />
      ) : resourcesQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {apiErrorMessage(resourcesQuery.error, t('detail.resources.loadError'))}
          </AlertDescription>
        </Alert>
      ) : resources.length === 0 ? (
        <Empty>
          <EmptyTitle>{t('detail.resources.empty.title')}</EmptyTitle>
          <EmptyDescription>{t('detail.resources.empty.body')}</EmptyDescription>
          {canEdit ? (
            <EmptyContent>
              <AddResourceDialog
                venueId={venueId}
                resourceTypes={resourceTypes}
                variant="secondary"
                size="default"
              />
            </EmptyContent>
          ) : null}
        </Empty>
      ) : (
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[168px]">{t('detail.resources.columns.name')}</TableHead>
              <TableHead>{t('detail.resources.columns.type')}</TableHead>
              <TableHead className="w-[90px]" numeric>
                {t('detail.resources.columns.capacity')}
              </TableHead>
              {canEdit ? (
                <TableHead className="w-16 text-right">
                  <span className="sr-only">{t('detail.resources.columns.actions')}</span>
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {resources.map((resource) => (
              <TableRow key={resource.id}>
                <TableCell className="truncate font-medium">{resource.name}</TableCell>
                <TableCell className="truncate">
                  {resourceTypeById.get(resource.resource_type_id)?.name ??
                    t('detail.resources.unknownType')}
                </TableCell>
                <TableCell numeric className="font-medium">
                  {resource.capacity}
                </TableCell>
                {canEdit ? (
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t('detail.resources.row.menu')}
                        >
                          <MoreHorizontalIcon />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => {
                            setEditing(resource);
                            setEditOpen(true);
                          }}
                        >
                          <PencilIcon />
                          {t('detail.resources.row.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => {
                            setDeleting(resource);
                            setDeleteOpen(true);
                          }}
                        >
                          <Trash2Icon />
                          {t('detail.resources.row.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {canEdit ? (
        <div>
          <NewResourceTypeDialog onCreated={() => undefined} />
        </div>
      ) : null}
      {editing ? (
        <EditResourceDialog
          venueId={venueId}
          resource={editing}
          resourceTypes={resourceTypes}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      ) : null}
      {deleting ? (
        <DeleteResourceDialog
          venueId={venueId}
          resource={deleting}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
        />
      ) : null}
    </section>
  );
}
```

Ruling: `NewResourceTypeDialog` lived inside the resource form's type row; the canvas puts « Nouveau type de ressource » under the table, so it moves there and its `onCreated` no longer pre-selects a type in an open resource form (it invalidates the resource-type list, so the new type appears in the dialog's `Select` on next open). Keep the `onCreated` prop for that invalidation flow.

- [ ] **Step 3: Create `activities-section.tsx`** (canvas `Ro3gM`, Activités)

Move `ActivitiesSection` out of `page.tsx` with its imports and export it; keep queries, `invalidateAll`, `handleAdd`, `handleRemove` byte-identical; replace the returned JSX with:

```tsx
  const [pending, setPending] = useState('');

  return (
    <section className="flex flex-col gap-4">
      <SectionHeading
        title={t('detail.activities.title')}
        description={t('detail.activities.subtitle')}
      />
      {activitiesQuery.isLoading ? (
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
      ) : activitiesQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {apiErrorMessage(activitiesQuery.error, t('detail.activities.loadError'))}
          </AlertDescription>
        </Alert>
      ) : activities.length === 0 ? (
        <p className="text-base text-muted-foreground">{t('detail.activities.empty')}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {activities.map((activity: VenueActivity) => (
            <Chip
              key={activity.id}
              onRemove={canEdit ? () => setRemoving(activity) : undefined}
              removeLabel={t('detail.activities.removeConfirm.title')}
            >
              {activityLabel(activity.activity_type)}
            </Chip>
          ))}
        </div>
      )}

      {canEdit && !activitiesQuery.isLoading && !activitiesQuery.isError ? (
        options.length > 0 ? (
          <div className="flex items-center gap-2">
            <Combobox
              options={options}
              value={pending}
              onValueChange={setPending}
              placeholder={t('detail.activities.add')}
              searchPlaceholder={t('detail.activities.searchPlaceholder')}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              disabled={!pending || addActivity.isPending}
              onClick={() => {
                handleAdd(pending);
                setPending('');
              }}
            >
              {tCommon('add')}
            </Button>
          </div>
        ) : (
          <p className="text-base text-muted-foreground">{t('detail.activities.allAdded')}</p>
        )
      ) : null}

      <Dialog open={removing !== null} onOpenChange={(next) => !next && setRemoving(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{t('detail.activities.removeConfirm.title')}</DialogTitle>
            <DialogDescription>
              {t('detail.activities.removeConfirm.description', {
                activity: removing ? activityLabel(removing.activity_type) : '',
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">{tCommon('cancel')}</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleRemove} disabled={removeActivity.isPending}>
              {removeActivity.isPending
                ? t('detail.activities.removeConfirm.confirming')
                : t('detail.activities.removeConfirm.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
```

`Chip` comes from `@iziwellpass/ui/components/chip` (`{ children, onRemove?, removeLabel? }`); `DialogClose` from the dialog module; `SectionHeading` from working-page; drop the `Badge`/`XIcon`/`Card*` imports. (The remove dialog is always mounted; its `open` is derived, so focus returns.)

- [ ] **Step 4: Trim `page.tsx` to the shell**

Remove the moved code and unused imports; import `ActivitiesSection` from `./activities-section` and `ResourcesSection` from `./resources-section`. After this, `grep -n "components/card\|Card" "apps/owner/app/(app)/venues/[id]/page.tsx"` prints nothing and the file is under 150 lines.

- [ ] **Step 5: Gates**

Run: `pnpm check:design && pnpm typecheck && pnpm lint && pnpm test`
Expected: green. `grep -rln "components/card" "apps/owner/app/(app)/venues"` prints nothing.

- [ ] **Step 6: Format and commit**

```bash
pnpm exec prettier --write "apps/owner/app/(app)/venues/[id]/page.tsx" "apps/owner/app/(app)/venues/[id]/activities-section.tsx" "apps/owner/app/(app)/venues/[id]/resources-section.tsx" "apps/owner/app/(app)/venues/[id]/resource-dialogs.tsx"
git add "apps/owner/app/(app)/venues/[id]"
git commit -m "feat(owner): venue activities as chips + outline add; resources as a hairline table with canvas dialogs"
```

---

### Task 4: Team — page shell and hairline table

**Files:**
- Modify: `apps/owner/app/(app)/staff/page.tsx` (rewrite; the four dialogs stay in this file until Task 5)
- Create: `apps/owner/app/(app)/staff/staff-table.tsx`

**Interfaces:**
- Consumes: `roleBadgeVariant` from `@/lib/role-badge` (delete the page-local copy), `WorkingPage`/`WorkingHeader`, restyled `Table`, `RowsSkeleton`.
- Produces: `StaffTable({ staff, selfUserId })` (toolbar-less: the search pill lives in the page), `StaffRow`/`StaffStack`; `staffName`, `initials`, `ASSIGNABLE_ROLES`, `VENUE_SCOPED_ROLES`, `isVenueScopedRole`, `assignableRoleOrFallback` stay exported from `page.tsx` for now (Task 5 moves them with the dialogs into `staff-dialogs.tsx`; `staff-table.tsx` imports `staffName`/`initials` from `./page`… no: to avoid a page import, move the two name helpers now into `apps/owner/lib/staff-name.ts`).
- Create: `apps/owner/lib/staff-name.ts` with `staffName(staff)` and `staffInitials(staff)` (+ `staff-name.test.ts`).

- [ ] **Step 1: `apps/owner/lib/staff-name.ts` + test**

```ts
import type { Staff } from '@iziwellpass/api/schemas';

export function staffName(staff: Pick<Staff, 'first_name' | 'last_name'>): string {
  return `${staff.first_name} ${staff.last_name}`.trim();
}

export function staffInitials(staff: Pick<Staff, 'first_name' | 'last_name'>): string {
  const first = staff.first_name.charAt(0);
  const last = staff.last_name.charAt(0);
  return `${first}${last}`.toUpperCase() || '?';
}
```

`apps/owner/lib/staff-name.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { staffInitials, staffName } from './staff-name';

describe('staff-name', () => {
  it('joins and trims the name', () => {
    expect(staffName({ first_name: 'Moussa', last_name: 'Diallo' })).toBe('Moussa Diallo');
    expect(staffName({ first_name: 'Moussa', last_name: '' })).toBe('Moussa');
  });
  it('builds upper-case initials with a fallback', () => {
    expect(staffInitials({ first_name: 'moussa', last_name: 'diallo' })).toBe('MD');
    expect(staffInitials({ first_name: '', last_name: '' })).toBe('?');
  });
});
```

Run: `pnpm --filter @iziwellpass/owner exec vitest run lib/staff-name.test.ts` → PASS.

- [ ] **Step 2: Create `staff-table.tsx`** (canvas `e0TehM`: Membre 464 · E-mail 340 · Rôle 200 · 64)

```tsx
'use client';

import { useTranslations } from 'next-intl';

import type { Staff } from '@iziwellpass/api/schemas';
import { Avatar, AvatarFallback } from '@iziwellpass/ui/components/avatar';
import { Badge } from '@iziwellpass/ui/components/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@iziwellpass/ui/components/table';

import { roleBadgeVariant } from '@/lib/role-badge';
import { staffInitials, staffName } from '@/lib/staff-name';

import { StaffRowActions } from './staff-dialogs';

interface StaffRowProps {
  member: Staff;
  index: number;
  isSelf: boolean;
}

/** Desktop row: tinted avatar, name + « · vous », email, role badge, « ··· ». */
function StaffRow({ member, index, isSelf }: StaffRowProps) {
  const t = useTranslations('staff');
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback aria-hidden tint={index}>
              {staffInitials(member)}
            </AvatarFallback>
          </Avatar>
          <span className="truncate font-medium">{staffName(member)}</span>
          {isSelf ? <span className="text-muted-foreground">· {t('row.you')}</span> : null}
        </div>
      </TableCell>
      <TableCell className="truncate">{member.email}</TableCell>
      <TableCell>
        <Badge variant={roleBadgeVariant(member.role)}>{t(`role.${member.role}`)}</Badge>
      </TableCell>
      <TableCell className="text-right">
        <StaffRowActions staff={member} isSelf={isSelf} />
      </TableCell>
    </TableRow>
  );
}

/** Phone stack (spec D6): the same cells between hairlines, 44px menu. */
function StaffStack({ member, index, isSelf }: StaffRowProps) {
  const t = useTranslations('staff');
  return (
    <div className="flex items-start gap-3 border-b border-border py-3 last:border-0">
      <Avatar>
        <AvatarFallback aria-hidden tint={index}>
          {staffInitials(member)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate font-medium">
          {staffName(member)}
          {isSelf ? <span className="text-muted-foreground"> · {t('row.you')}</span> : null}
        </p>
        <p className="truncate text-sm text-muted-foreground">{member.email}</p>
        <div className="mt-2">
          <Badge variant={roleBadgeVariant(member.role)}>{t(`role.${member.role}`)}</Badge>
        </div>
      </div>
      <StaffRowActions staff={member} isSelf={isSelf} size="icon" />
    </div>
  );
}

export function StaffTable({ staff, selfUserId }: { staff: Staff[]; selfUserId: string | null }) {
  const t = useTranslations('staff');
  const isSelf = (member: Staff) => selfUserId !== null && member.user_id === selfUserId;

  return (
    <>
      <div className="md:hidden">
        {staff.map((member, index) => (
          <StaffStack key={member.id} member={member} index={index} isSelf={isSelf(member)} />
        ))}
      </div>
      <div className="hidden md:block">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead>{t('columns.member')}</TableHead>
              <TableHead className="w-[340px]">{t('columns.email')}</TableHead>
              <TableHead className="w-[200px]">{t('columns.role')}</TableHead>
              <TableHead className="w-16 text-right">
                <span className="sr-only">{t('columns.actions')}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((member, index) => (
              <StaffRow key={member.id} member={member} index={index} isSelf={isSelf(member)} />
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
```

`StaffRowActions` gains a `size?: 'icon' | 'icon-sm'` prop (default `'icon-sm'`) in Task 5; in this task it is imported from `./page`? No — to keep every commit green, this task also creates `staff-dialogs.tsx` with `StaffRowActions` and the four dialogs moved verbatim (plus the `size` prop and the helpers `ASSIGNABLE_ROLES`, `VENUE_SCOPED_ROLES`, `isVenueScopedRole`, `assignableRoleOrFallback`); Task 5 then restyles them. Do that move now (no styling changes yet, only the `size` prop).

- [ ] **Step 3: Create `staff-dialogs.tsx` (verbatim move + `size` prop)**

Move `ASSIGNABLE_ROLES`, `VENUE_SCOPED_ROLES`, `isVenueScopedRole`, `assignableRoleOrFallback`, `InviteStaffDialog`, `ChangeRoleDialog`, `ManageVenuesDialog`, `RemoveStaffDialog`, `StaffRowActions` with their imports out of `page.tsx`; export `InviteStaffDialog` and `StaffRowActions`; replace `staffName` uses with the lib import. `StaffRowActions({ staff, isSelf, size = 'icon-sm' }: { …; size?: 'icon' | 'icon-sm' })` renders `<Button variant="ghost" size={size} …>`. `InviteStaffDialog({ variant = 'default' }: { variant?: 'default' | 'secondary' })` renders `<Button variant={variant}><UserPlusIcon />{t('invite')}</Button>` (import `UserPlusIcon` from lucide-react).

- [ ] **Step 4: Add the `row.you` key (fr « vous », en « you »)**

Targeted edits under `staff.row` in both message files; parity one-liner → `parity ok`.

- [ ] **Step 5: Rewrite `staff/page.tsx`** (canvas `e0TehM`)

```tsx
'use client';

import { useMemo, useState } from 'react';
import { SearchIcon, SearchXIcon, UsersRoundIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { unwrap } from '@iziwellpass/api/client';
import { useListStaff } from '@iziwellpass/api/generated';
import { useSession } from '@iziwellpass/auth/provider';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@iziwellpass/ui/components/empty';
import { Input } from '@iziwellpass/ui/components/input';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { WorkingHeader, WorkingPage } from '@iziwellpass/ui/components/working-page';

import { RequirePageAccess } from '@/components/page-access';
import { RowsSkeleton } from '@/components/rows-skeleton';
import { apiErrorMessage } from '@/lib/api-error';
import { staffName } from '@/lib/staff-name';

import { InviteStaffDialog } from './staff-dialogs';
import { StaffTable } from './staff-table';

function StaffContent() {
  const t = useTranslations('staff');
  const session = useSession();
  const selfUserId = session.status === 'signed-in' ? session.claims.sub : null;

  const staffQuery = useListStaff({ query: { select: unwrap } });
  const staff = useMemo(() => staffQuery.data ?? [], [staffQuery.data]);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((member) => {
      const name = staffName(member).toLowerCase();
      const email = member.email.toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [staff, query]);

  const subtitle = staffQuery.isLoading ? (
    <Skeleton className="h-4 w-28" />
  ) : staffQuery.isError ? undefined : (
    t('subtitle', { count: staff.length })
  );

  return (
    <WorkingPage>
      <WorkingHeader title={t('title')} subtitle={subtitle} action={<InviteStaffDialog />} />

      {staffQuery.isLoading ? (
        <div className="flex flex-col gap-8">
          <Skeleton className="h-12 w-full rounded-full md:w-[380px]" />
          <RowsSkeleton rows={6} />
        </div>
      ) : staffQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>{t('errorTitle')}</AlertTitle>
          <AlertDescription>{apiErrorMessage(staffQuery.error, t('loadError'))}</AlertDescription>
        </Alert>
      ) : staff.length === 0 ? (
        <Empty>
          <EmptyMedia>
            <UsersRoundIcon />
          </EmptyMedia>
          <EmptyTitle>{t('empty.title')}</EmptyTitle>
          <EmptyDescription>{t('empty.body')}</EmptyDescription>
          <EmptyContent>
            <InviteStaffDialog variant="secondary" />
          </EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-col gap-8">
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
          {filtered.length === 0 ? (
            <Empty>
              <EmptyMedia>
                <SearchXIcon />
              </EmptyMedia>
              <EmptyTitle>{t('noResults.title')}</EmptyTitle>
              <EmptyDescription>{t('noResults.body')}</EmptyDescription>
            </Empty>
          ) : (
            <StaffTable staff={filtered} selfUserId={selfUserId} />
          )}
        </div>
      )}
    </WorkingPage>
  );
}

export default function StaffPage() {
  return (
    <RequirePageAccess href="/staff">
      <StaffContent />
    </RequirePageAccess>
  );
}
```

- [ ] **Step 6: Gates, format, commit**

Run: `pnpm check:design && pnpm typecheck && pnpm lint && pnpm test` → green; `grep -rn "components/card\|roleBadgeVariant" "apps/owner/app/(app)/staff"` prints only the lib import in `staff-table.tsx`.

```bash
pnpm exec prettier --write "apps/owner/app/(app)/staff/page.tsx" "apps/owner/app/(app)/staff/staff-table.tsx" "apps/owner/app/(app)/staff/staff-dialogs.tsx" apps/owner/lib/staff-name.ts apps/owner/lib/staff-name.test.ts apps/owner/messages/fr.json apps/owner/messages/en.json
git add "apps/owner/app/(app)/staff" apps/owner/lib/staff-name.ts apps/owner/lib/staff-name.test.ts apps/owner/messages/fr.json apps/owner/messages/en.json
git commit -m "feat(owner): team page on WorkingPage with a hairline table and phone stack"
```

---

### Task 5: Team dialogs at canvas geometry

**Files:**
- Modify: `apps/owner/app/(app)/staff/staff-dialogs.tsx`

**Interfaces:** unchanged exports; only shells, layouts and footers change.

- [ ] **Step 1: `InviteStaffDialog`** (canvas `RZF9q`, 520)

- `<DialogContent className="sm:max-w-[520px]">`; form `className="flex flex-col gap-6"` with the fields wrapped in `<div className="flex flex-col gap-[18px]">`: the Prénom · Nom `grid gap-4 sm:grid-cols-2` row (exists) / E-mail / Rôle (`SelectTrigger className="w-full"`, exists) / the conditional « Établissements » item: `FormLabel`, `<VenueChecklist …/>`, then `<p className="text-sm text-muted-foreground">{t('inviteDialog.venuesHint')}</p>` (exists) / `<p className="text-md text-muted-foreground">{t('inviteDialog.expectation')}</p>`.
- Footer: `<DialogClose asChild><Button type="button" variant="ghost">{tCommon('cancel')}</Button></DialogClose>` + dark submit (add `tCommon`).

- [ ] **Step 2: `ChangeRoleDialog` and `ManageVenuesDialog`** (520)

- Both `DialogContent className="sm:max-w-[520px]"`; bodies `flex flex-col gap-[18px]`; hints `text-sm text-muted-foreground`; ghost `DialogClose` cancel before the dark submit (`ManageVenuesDialog` already has a cancel: switch it from `outline` to `DialogClose` + ghost). `ManageVenuesDialog` has no description: add `aria-describedby={undefined}` on its `DialogContent`.

- [ ] **Step 3: `RemoveStaffDialog`** (canvas `TmgT0`, 480)

`<DialogContent className="sm:max-w-[480px]">`; cancel → `<DialogClose asChild><Button variant="ghost">{tCommon('cancel')}</Button></DialogClose>`; destructive confirm unchanged.

- [ ] **Step 4: Gates, format, commit**

Run the gates → green.

```bash
pnpm exec prettier --write "apps/owner/app/(app)/staff/staff-dialogs.tsx"
git add "apps/owner/app/(app)/staff/staff-dialogs.tsx"
git commit -m "feat(owner): team dialogs at canvas geometry (invite 520, remove 480, ghost cancels)"
```

---

### Task 6: Offer dialog at canvas geometry; build

**Files:**
- Modify: `apps/owner/app/(app)/plans/plan-dialog.tsx`
- Modify: `apps/owner/messages/fr.json`, `apps/owner/messages/en.json` (add `plans.dialog.allActivitiesHint`)

- [ ] **Step 1: Message key**

`plans.dialog.allActivitiesHint`: fr `"Sinon, choisissez les activités concernées ci-dessous."`, en `"Otherwise pick the activities below."` (targeted edits; parity → `parity ok`).

- [ ] **Step 2: Restyle `PlanDialog`** (canvas `N2Rqjs`, 520)

- `<DialogContent className="sm:max-w-[520px]">`; form `className="flex flex-col gap-6"`; wrap the fields in `<div className="flex flex-col gap-[18px]">`.
- Order: Nom / Type (`SelectTrigger className="w-full"`) / `grid gap-4 sm:grid-cols-2` Prix · Devise (`SelectTrigger className="w-full"`) / Nombre d'entrées (entry_pack only) / Durée (jours) / switch row / activity chips when off. Keep `ReadOnlyField` for edit mode (restyle: label `text-sm font-medium`, value `text-base text-muted-foreground`).
- Switch row (canvas: title 15/500 + 13px helper, switch right):

```tsx
            <FormField
              control={form.control}
              name="all_activities"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <FormLabel className="text-base font-medium">{t('dialog.allActivities')}</FormLabel>
                    <p className="text-sm text-muted-foreground">{t('dialog.allActivitiesHint')}</p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
```

- Activity chips (when off): selected `variant="default"` stays; unselected `variant="outline"` stays (canvas Secondary = outline, D11).
- Footer: `<DialogClose asChild><Button type="button" variant="ghost">{tCommon('cancel')}</Button></DialogClose>` + dark submit (add `tCommon`, import `DialogClose`).

- [ ] **Step 3: Gates and build**

Run: `pnpm check:design && pnpm typecheck && pnpm lint && pnpm test` → green; parity → ok. Then `pnpm build` — only if no dev server of this checkout is running (`lsof -nP -iTCP:3011 -iTCP:3012 -sTCP:LISTEN`); otherwise build the commit in a throwaway worktree (`git worktree add --detach /tmp/c2-build HEAD && cd /tmp/c2-build && pnpm install --frozen-lockfile --prefer-offline && pnpm build`, then `git worktree remove --force /tmp/c2-build`).

- [ ] **Step 4: Format and commit**

```bash
pnpm exec prettier --write "apps/owner/app/(app)/plans/plan-dialog.tsx" apps/owner/messages/fr.json apps/owner/messages/en.json
git add "apps/owner/app/(app)/plans/plan-dialog.tsx" apps/owner/messages/fr.json apps/owner/messages/en.json
git commit -m "feat(owner): offer dialog at canvas geometry"
```

---

## After Task 6

Final whole-branch review over Tasks 1–6 of C2 (base = the commit before Task 1), with live screenshots against `aussB`, `Ro3gM`, `W1G1mM`, `e0TehM`, `RZF9q`, `TmgT0`, `N2Rqjs` at 1440 and 390; one fix wave; scoped re-review; then `superpowers:finishing-a-development-branch` for the whole `feat/comptoir-clair-hubs` branch. Orphan keys to delete in that fix wave if still unused: `venues.create.formTitle`, `planning.venuePlaceholder`.
