# Venue domain API sync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consume the updated backend spec in the venue domain — migrate the venue-type enum (`VenueType`→`ActivityType`, 9→23 values), add venue creation, and add per-venue activity management.

**Architecture:** Share a small helper for the 23-value catalog (options + fallback-safe label) and a `VenueFormFields` component for the near-identical create + edit forms. Onboarding keeps its own form but swaps its type picker to the shared Combobox. Activities get a new section on the venue detail page.

**Tech Stack:** Next.js 15 (App Router) + React 19, react-hook-form + zod, next-intl (fr/en), TanStack Query with Orval-generated hooks, shadcn/Radix UI (`@iziwellpass/ui`), Tailwind v4.

---

## Conventions for this plan

- **Commits are ON HOLD** (user instruction). Each task ends with a **Verify** step, not a commit. A suggested commit message is given for when the hold lifts; do **not** run `git commit` unless the user says so.
- **owner has no unit-test runner** (scripts: dev/build/lint/typecheck only). Verification is `pnpm --filter owner typecheck`, `pnpm --filter owner lint`, and browser preview. Do not add vitest to owner for this feature.
- Orval mutation call shapes (from existing code in `apps/owner/app/(app)/venues/[id]/page.tsx`): body-only → `.mutate({ data })`; path+body → `.mutate({ id, data })`; path-only params → `.mutate({ id, activity })`.
- Preview: another chat's dev server may occupy port 3011. If preview tools can't reach it, run `preview_start` for this session, then follow the verification workflow.

## File map

- **Create** `apps/owner/lib/activity-type.ts` — catalog values + `useActivityTypeOptions()` + `useActivityTypeLabel()`.
- **Create** `apps/owner/components/venue-form-fields.tsx` — shared venue form fields (create + edit).
- **Create** `apps/owner/app/(app)/venues/new/page.tsx` — create-venue page.
- **Modify** `apps/owner/app/(app)/venues/[id]/page.tsx` — enum→Combobox in `ProfileSection` (via shared fields), header badge, new `ActivitiesSection`.
- **Modify** `apps/owner/app/(app)/venues/page.tsx` — badge via helper; "Ajouter un lieu" CTA.
- **Modify** `apps/owner/app/(onboarding)/onboarding/page.tsx` — remove icon grid, use Combobox.
- **Modify** `apps/owner/messages/fr.json`, `apps/owner/messages/en.json` — `activityType.*`, `venues.detail.activities.*`; remove old enum labels.

---

## Task 1: Shared activity-type helper

**Files:**
- Create: `apps/owner/lib/activity-type.ts`

- [ ] **Step 1: Create the helper**

```ts
import { useTranslations } from 'next-intl';

import { ActivityType } from '@iziwellpass/api/schemas';
import type { ComboboxOption } from '@iziwellpass/ui/components/combobox';

/** All 23 catalog values, as a tuple for `z.enum(...)`. Order = display order. */
export const ACTIVITY_TYPE_VALUES = Object.values(ActivityType) as [
  ActivityType,
  ...ActivityType[],
];

/** Humanize a raw enum value as a last-resort label (e.g. `yoga_studio` → "Yoga studio"). */
function humanizeActivityValue(value: string): string {
  const spaced = value.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Returns a labeller for a single `activity_type`/`venue_type` value. Reads the
 * shared `activityType.*` namespace and falls back to a humanized raw value so a
 * legacy/unknown stored value (e.g. the removed `yoga_studio`) never renders blank.
 */
export function useActivityTypeLabel(): (value: string) => string {
  const t = useTranslations();
  return (value: string) =>
    t.has(`activityType.${value}`) ? t(`activityType.${value}`) : humanizeActivityValue(value);
}

/** Combobox options for the full catalog, labelled + in catalog order. */
export function useActivityTypeOptions(): ComboboxOption[] {
  const label = useActivityTypeLabel();
  return ACTIVITY_TYPE_VALUES.map((value) => ({ value, label: label(value) }));
}
```

- [ ] **Step 2: Verify types resolve**

Run: `pnpm --filter owner typecheck 2>&1 | grep activity-type || echo "no activity-type errors"`
Expected: `no activity-type errors` (the file itself compiles; unrelated WS1 errors in other files remain until later tasks).

- [ ] **Step 3: Commit (DEFERRED — hold)**

Suggested message: `feat(owner): shared activity-type options and labels`

---

## Task 2: i18n — activityType namespace + activities copy

**Files:**
- Modify: `apps/owner/messages/fr.json`
- Modify: `apps/owner/messages/en.json`

- [ ] **Step 1: Add the top-level `activityType` namespace**

Add this as a new top-level key (e.g. after `"nav"`) in **`fr.json`**:

```json
"activityType": {
  "gym": "Salle de sport",
  "crossfit": "CrossFit",
  "hiit": "HIIT",
  "bootcamp": "Bootcamp",
  "cycling": "Cycling",
  "boxing": "Boxe",
  "martial_arts": "Arts martiaux",
  "dance": "Danse",
  "running": "Course à pied",
  "padel": "Padel",
  "tennis": "Tennis",
  "squash": "Squash",
  "basketball": "Basketball",
  "football": "Football",
  "swimming": "Natation",
  "climbing": "Escalade",
  "bouldering": "Bloc",
  "yoga": "Yoga",
  "pilates": "Pilates",
  "stretch": "Stretching",
  "spa": "Spa",
  "massage": "Massage",
  "beauty": "Beauté"
},
```

Add to **`en.json`** at the same position:

```json
"activityType": {
  "gym": "Gym",
  "crossfit": "CrossFit",
  "hiit": "HIIT",
  "bootcamp": "Bootcamp",
  "cycling": "Cycling",
  "boxing": "Boxing",
  "martial_arts": "Martial arts",
  "dance": "Dance",
  "running": "Running",
  "padel": "Padel",
  "tennis": "Tennis",
  "squash": "Squash",
  "basketball": "Basketball",
  "football": "Football",
  "swimming": "Swimming",
  "climbing": "Climbing",
  "bouldering": "Bouldering",
  "yoga": "Yoga",
  "pilates": "Pilates",
  "stretch": "Stretching",
  "spa": "Spa",
  "massage": "Massage",
  "beauty": "Beauty"
},
```

- [ ] **Step 2: Add the activities section copy**

Inside `venues.detail` in **`fr.json`**, add an `activities` key (sibling of `profile`/`resources`):

```json
"activities": {
  "title": "Activités",
  "subtitle": "Les disciplines proposées dans cet établissement.",
  "add": "Ajouter une activité",
  "addPlaceholder": "Choisir une activité",
  "searchPlaceholder": "Rechercher une activité",
  "empty": "Aucune activité pour le moment.",
  "allAdded": "Toutes les activités sont ajoutées.",
  "loadError": "Impossible de charger les activités",
  "addError": "Impossible d'ajouter l'activité",
  "removeConfirm": {
    "title": "Retirer l'activité",
    "description": "Retirer « {activity} » de cet établissement ?",
    "confirm": "Retirer",
    "confirming": "Retrait…",
    "error": "Impossible de retirer l'activité"
  }
},
```

Inside `venues.detail` in **`en.json`**:

```json
"activities": {
  "title": "Activities",
  "subtitle": "The disciplines offered at this venue.",
  "add": "Add an activity",
  "addPlaceholder": "Choose an activity",
  "searchPlaceholder": "Search an activity",
  "empty": "No activities yet.",
  "allAdded": "All activities are added.",
  "loadError": "Could not load activities",
  "addError": "Could not add the activity",
  "removeConfirm": {
    "title": "Remove activity",
    "description": "Remove \"{activity}\" from this venue?",
    "confirm": "Remove",
    "confirming": "Removing…",
    "error": "Could not remove the activity"
  }
},
```

- [ ] **Step 3: Remove the old enum-label keys**

Delete the `"types"` object under `onboarding` and the `"type"` object under `venues` in **both** `fr.json` and `en.json` (the 9 old values — `gym, yoga_studio, spa, tennis_club, cross_fit, swimming_pool, martial_arts, dance, other`). These are replaced by `activityType.*`.

- [ ] **Step 4: Verify JSON + parity + coverage**

Run:
```bash
cd apps/owner && node -e '
const fr=require("./messages/fr.json"), en=require("./messages/en.json");
const vals=["gym","crossfit","hiit","bootcamp","cycling","boxing","martial_arts","dance","running","padel","tennis","squash","basketball","football","swimming","climbing","bouldering","yoga","pilates","stretch","spa","massage","beauty"];
for(const v of vals){ if(!fr.activityType?.[v]) throw new Error("fr missing "+v); if(!en.activityType?.[v]) throw new Error("en missing "+v); }
if(fr.onboarding.types || en.onboarding.types || fr.venues.type || en.venues.type) throw new Error("old enum keys still present");
if(!fr.venues.detail.activities || !en.venues.detail.activities) throw new Error("activities copy missing");
console.log("i18n OK: 23 activityType labels x2, old keys removed, activities copy present");
'
```
Expected: `i18n OK: ...`

- [ ] **Step 5: Commit (DEFERRED — hold)**

Suggested message: `i18n(owner): activityType labels + venue activities copy`

---

## Task 3: Shared `VenueFormFields` component

**Files:**
- Create: `apps/owner/components/venue-form-fields.tsx`

The component is generic over the form values (`T extends VenueFieldValues`) so both the create schema and the edit schema (which adds `is_active`) can pass their form in type-safely.

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { useTranslations } from 'next-intl';
import type { FieldPath, FieldValues, UseFormReturn } from 'react-hook-form';

import { Combobox } from '@iziwellpass/ui/components/combobox';
import {
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
import { Textarea } from '@iziwellpass/ui/components/textarea';

import { useActivityTypeOptions } from '@/lib/activity-type';
import { COUNTRIES, TIMEZONES, withCurrentValue } from '@/lib/locations';

/** The venue fields shared by the create and edit forms. */
export interface VenueFieldValues {
  name: string;
  venue_type: string;
  description: string;
  address_line: string;
  city: string;
  country: string;
  timezone: string;
  phone: string;
}

export function VenueFormFields<T extends VenueFieldValues & FieldValues>({
  form,
  disabled = false,
}: {
  form: UseFormReturn<T>;
  disabled?: boolean;
}) {
  const t = useTranslations('venues');
  const typeOptions = useActivityTypeOptions();
  // Field names are literal keys of VenueFieldValues, valid paths of T.
  const name = (k: keyof VenueFieldValues) => k as FieldPath<T>;

  return (
    <>
      <FormField
        control={form.control}
        name={name('name')}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('detail.profile.name')}</FormLabel>
            <FormControl>
              <Input {...field} disabled={disabled} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={name('venue_type')}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('detail.profile.type')}</FormLabel>
            {/* No FormControl: Combobox is a component, not a forwardRef DOM node,
                so wrapping it in FormControl's Radix Slot would warn on ref. */}
            <Combobox
              options={typeOptions}
              value={field.value as string}
              onValueChange={field.onChange}
              disabled={disabled}
              placeholder={t('detail.profile.typePlaceholder')}
              searchPlaceholder={t('detail.profile.typeSearch')}
            />
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={name('description')}
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>{t('detail.profile.description')}</FormLabel>
            <FormControl>
              <Textarea {...field} disabled={disabled} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={name('address_line')}
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>{t('detail.profile.address')}</FormLabel>
            <FormControl>
              <Input {...field} disabled={disabled} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={name('city')}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('detail.profile.city')}</FormLabel>
            <FormControl>
              <Input {...field} disabled={disabled} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={name('country')}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('detail.profile.country')}</FormLabel>
            <Select
              value={field.value as string}
              onValueChange={field.onChange}
              disabled={disabled}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('detail.profile.countryPlaceholder')} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {withCurrentValue(COUNTRIES, field.value as string).map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
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
        name={name('timezone')}
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>{t('detail.profile.timezone')}</FormLabel>
            <Select
              value={field.value as string}
              onValueChange={field.onChange}
              disabled={disabled}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('detail.profile.timezonePlaceholder')} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {withCurrentValue(TIMEZONES, field.value as string).map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
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
        name={name('phone')}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('detail.profile.phone')}</FormLabel>
            <FormControl>
              <Input inputMode="tel" {...field} disabled={disabled} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
```

- [ ] **Step 2: Add the two new label keys used above**

Add `typePlaceholder` and `typeSearch` under `venues.detail.profile` in both message files.

`fr.json` (`venues.detail.profile`): `"typePlaceholder": "Choisir un type", "typeSearch": "Rechercher un type"`
`en.json` (`venues.detail.profile`): `"typePlaceholder": "Choose a type", "typeSearch": "Search a type"`

- [ ] **Step 3: Verify**

Run: `pnpm --filter owner typecheck 2>&1 | grep venue-form-fields || echo "venue-form-fields OK"`
Expected: `venue-form-fields OK`

- [ ] **Step 4: Commit (DEFERRED — hold)**

Suggested message: `feat(owner): shared VenueFormFields for create + edit`

---

## Task 4: WS1 — migrate `ProfileSection` (venue detail) + header badge

**Files:**
- Modify: `apps/owner/app/(app)/venues/[id]/page.tsx`

- [ ] **Step 1: Fix imports**

Remove `import { VenueType } from '@iziwellpass/api/schemas';` (line ~30). Remove the now-unused `Select*` imports **only if** no longer used elsewhere in the file (they are still used by `NewResourceTypeDialog`/`ResourceFormFields`, so keep them). Remove the `const VENUE_TYPE_VALUES = Object.values(VenueType) ...` line (~90).

Add:
```ts
import { ACTIVITY_TYPE_VALUES, useActivityTypeLabel } from '@/lib/activity-type';
import { VenueFormFields } from '@/components/venue-form-fields';
```

- [ ] **Step 2: Update the ProfileSection schema**

In `ProfileSection`, change the `venue_type` schema line from `venue_type: z.enum(VENUE_TYPE_VALUES),` to:
```ts
venue_type: z.enum(ACTIVITY_TYPE_VALUES),
```

- [ ] **Step 3: Replace the inline shared fields with `VenueFormFields`**

In the `ProfileSection` `<form>`, replace the eight inline `FormField`s (name, venue_type, description, address_line, city, country, phone) **and** the timezone field with a single:
```tsx
<VenueFormFields form={form} disabled={!canEdit} />
```
Keep, in this order after it: the read-only **email** `FormItem` (unchanged), the **is_active** `FormField` (unchanged), and the submit button block (unchanged). Remove the `Textarea`/`Input`/`Select`/`withCurrentValue`/`COUNTRIES`/`TIMEZONES` imports **only if** they are no longer referenced in the file after this change (the email field still uses `Input`; resources still use `Select` and `Input` — verify before removing; likely only `Textarea`, `COUNTRIES`, `TIMEZONES`, `withCurrentValue` become unused here — remove those that lint flags).

- [ ] **Step 4: Update the detail header badge**

At the top of `VenueDetailContent`, add `const activityLabel = useActivityTypeLabel();`. Change the header type badge from `{t(\`type.${venue.venue_type}\`)}` to `{activityLabel(venue.venue_type)}`.

- [ ] **Step 5: Verify**

Run: `pnpm --filter owner typecheck 2>&1 | grep 'venues/\[id\]' || echo "venue detail OK"` then `pnpm --filter owner lint 2>&1 | tail -3`
Expected: `venue detail OK`; lint clean (fix any unused-import warnings by removing the flagged imports).

- [ ] **Step 6: Commit (DEFERRED — hold)**

Suggested message: `feat(owner): venue detail uses activity-type Combobox`

---

## Task 5: WS1 — migrate onboarding picker

**Files:**
- Modify: `apps/owner/app/(onboarding)/onboarding/page.tsx`

- [ ] **Step 1: Remove the icon grid + VenueType**

Remove the venue-type icon imports (`BoxIcon, DumbbellIcon, Flower2Icon, MusicIcon, SparklesIcon, SwordsIcon, TrophyIcon, WavesIcon, MoreHorizontalIcon, type LucideIcon` — keep `CheckIcon` only if still used elsewhere; if not, remove it too). Remove `import { VenueType } from '@iziwellpass/api/schemas';`, the `VENUE_TYPE_ICONS` map, the `VENUE_TYPE_VALUES` const, and the entire `VenueTypeFieldset` component.

Add: `import { ACTIVITY_TYPE_VALUES, useActivityTypeOptions } from '@/lib/activity-type';` and `import { Combobox } from '@iziwellpass/ui/components/combobox';`.

- [ ] **Step 2: Update the schema + default**

Change the venue_type schema to `venue_type: z.enum(ACTIVITY_TYPE_VALUES),`. Keep the default `venue_type: 'gym'` (still a valid value).

- [ ] **Step 3: Render the Combobox in the form**

Where `<VenueTypeFieldset field={field} />` (or the fieldset) was rendered for `venue_type`, replace with a standard field using the shared options. Add near the top of the onboarding form component: `const typeOptions = useActivityTypeOptions();`. Then:
```tsx
<FormField
  control={form.control}
  name="venue_type"
  render={({ field }) => (
    <FormItem>
      <FormLabel>{t('venueType')}</FormLabel>
      {/* No FormControl around Combobox (see VenueFormFields note). */}
      <Combobox
        options={typeOptions}
        value={field.value}
        onValueChange={field.onChange}
        placeholder={t('venueTypePlaceholder')}
        searchPlaceholder={t('venueTypeSearch')}
      />
      <FormMessage />
    </FormItem>
  )}
/>
```

- [ ] **Step 4: Add the two onboarding label keys**

Under `onboarding` in both message files:
`fr.json`: `"venueTypePlaceholder": "Choisir un type", "venueTypeSearch": "Rechercher un type"`
`en.json`: `"venueTypePlaceholder": "Choose a type", "venueTypeSearch": "Search a type"`

- [ ] **Step 5: Verify**

Run: `pnpm --filter owner typecheck 2>&1 | grep onboarding || echo "onboarding OK"` then `pnpm --filter owner lint 2>&1 | tail -3`
Expected: `onboarding OK`; lint clean.

- [ ] **Step 6: Commit (DEFERRED — hold)**

Suggested message: `feat(owner): onboarding uses activity-type Combobox`

---

## Task 6: WS1 — venues list card badge

**Files:**
- Modify: `apps/owner/app/(app)/venues/page.tsx`

- [ ] **Step 1: Use the fallback-safe label**

Add `import { useActivityTypeLabel } from '@/lib/activity-type';`. In `VenueCard`, add `const activityLabel = useActivityTypeLabel();` and change `{t(\`type.${venue.venue_type}\`)}` to `{activityLabel(venue.venue_type)}`.

- [ ] **Step 2: Verify**

Run: `pnpm --filter owner typecheck 2>&1 | grep 'venues/page' || echo "venues list OK"`
Expected: `venues list OK`

- [ ] **Step 3: Commit (DEFERRED — hold)**

Suggested message: `feat(owner): venue list badge via activity-type label`

At this point `pnpm --filter owner typecheck` should be **fully green** (WS1 complete).

---

## Task 7: WS2 — create-venue page + CTA

**Files:**
- Create: `apps/owner/app/(app)/venues/new/page.tsx`
- Modify: `apps/owner/app/(app)/venues/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeftIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { unwrap } from '@iziwellpass/api/client';
import { getListVenuesQueryKey, useCreateVenue } from '@iziwellpass/api/generated';
import { Button } from '@iziwellpass/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@iziwellpass/ui/components/card';
import { Form } from '@iziwellpass/ui/components/form';

import { RequirePageAccess } from '@/components/page-access';
import { ACTIVITY_TYPE_VALUES } from '@/lib/activity-type';
import { apiErrorMessage, applyFieldErrors } from '@/lib/api-error';
import { VenueFormFields } from '@/components/venue-form-fields';

function CreateVenueContent() {
  const t = useTranslations('venues');
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
    <div className="space-y-6">
      <Link
        href="/venues"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        {t('detail.back')}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">{t('create.title')}</h1>
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>{t('create.formTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
              className="grid gap-4 sm:grid-cols-2"
            >
              <VenueFormFields form={form} />
              <div className="sm:col-span-2">
                <Button type="submit" disabled={createVenue.isPending}>
                  {createVenue.isPending ? t('create.submitting') : t('create.submit')}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
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

- [ ] **Step 2: Add the create i18n keys**

Under `venues` add a `create` object in both files.

`fr.json`:
```json
"create": {
  "cta": "Ajouter un lieu",
  "title": "Nouvel établissement",
  "formTitle": "Informations",
  "cityRequired": "La ville est requise",
  "countryRequired": "Le pays est requis",
  "submit": "Créer l'établissement",
  "submitting": "Création…",
  "success": "Établissement créé",
  "error": "Impossible de créer l'établissement"
},
```
`en.json`:
```json
"create": {
  "cta": "Add a venue",
  "title": "New venue",
  "formTitle": "Details",
  "cityRequired": "City is required",
  "countryRequired": "Country is required",
  "submit": "Create venue",
  "submitting": "Creating…",
  "success": "Venue created",
  "error": "Could not create the venue"
},
```

- [ ] **Step 3: Add the CTA to the venues list**

In `apps/owner/app/(app)/venues/page.tsx`, add `import Link` (already imported) and `Button`. In `VenuesContent`, change the header block so the title row has the CTA when the user can manage venues. Use the existing role gate pattern (`useRole()` → owner/admin). Concretely, wrap the `<h1>` row:

```tsx
<div className="flex flex-wrap items-center justify-between gap-3">
  <div className="space-y-1">
    <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
    {/* existing subtitle/skeleton block stays here */}
  </div>
  {canManage ? (
    <Button asChild>
      <Link href="/venues/new">
        <PlusIcon />
        {t('create.cta')}
      </Link>
    </Button>
  ) : null}
</div>
```

Add `import { PlusIcon } from 'lucide-react';`, `import { Button } from '@iziwellpass/ui/components/button';`, `import { useRole } from '@iziwellpass/auth/provider';`, and `const role = useRole(); const canManage = role === 'owner' || role === 'admin';` in `VenuesContent`. Also add the same CTA into the empty-state `Empty` via `EmptyContent` (import `EmptyContent` from the empty component):
```tsx
{canManage ? (
  <EmptyContent>
    <Button asChild>
      <Link href="/venues/new">
        <PlusIcon />
        {t('create.cta')}
      </Link>
    </Button>
  </EmptyContent>
) : null}
```

- [ ] **Step 4: Verify (typecheck + preview)**

Run: `pnpm --filter owner typecheck 2>&1 | tail -3` (expect clean) and `pnpm --filter owner lint 2>&1 | tail -3`.
Preview: start the server, go to `/venues`, confirm the "Ajouter un lieu" button; open `/venues/new`, fill name/type/city/country/timezone, submit, and confirm redirect to `/venues/{id}` with a success toast. Use `preview_*` tools; verify no console errors.

- [ ] **Step 5: Commit (DEFERRED — hold)**

Suggested message: `feat(owner): create-venue page and CTA`

---

## Task 8: WS3 — activities section on the venue detail page

**Files:**
- Modify: `apps/owner/app/(app)/venues/[id]/page.tsx`

- [ ] **Step 1: Add imports + hooks**

Add to the generated import block: `getListResourcesQueryKey` (already imported), `getListResourceTypesQueryKey` (already imported), `getListVenueActivitiesQueryKey`, `useAddVenueActivity`, `useListVenueActivities`, `useRemoveVenueActivity`. Add type `VenueActivity` to the schemas import. Add `import { Combobox } from '@iziwellpass/ui/components/combobox';` and (already present) Dialog/Badge/Card/Empty imports. Import `ACTIVITY_TYPE_VALUES, useActivityTypeLabel, useActivityTypeOptions` from `@/lib/activity-type` (extend the existing import).

- [ ] **Step 2: Add the `ActivitiesSection` component**

Place this above `VenueDetailContent`:

```tsx
function ActivitiesSection({ venueId, canEdit }: { venueId: string; canEdit: boolean }) {
  const t = useTranslations('venues');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const activityLabel = useActivityTypeLabel();
  const allOptions = useActivityTypeOptions();

  const activitiesQuery = useListVenueActivities(venueId, { query: { select: unwrap } });
  const activities = useMemo(() => activitiesQuery.data ?? [], [activitiesQuery.data]);
  const present = useMemo(
    () => new Set(activities.map((a: VenueActivity) => a.activity_type)),
    [activities],
  );
  const options = useMemo(
    () => allOptions.filter((o) => !present.has(o.value as (typeof ACTIVITY_TYPE_VALUES)[number])),
    [allOptions, present],
  );

  const addActivity = useAddVenueActivity();
  const removeActivity = useRemoveVenueActivity();
  const [removing, setRemoving] = useState<VenueActivity | null>(null);

  // Adding/removing an activity seeds/deactivates resource types on the backend.
  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: getListVenueActivitiesQueryKey(venueId) });
    void queryClient.invalidateQueries({ queryKey: getListResourcesQueryKey(venueId) });
    void queryClient.invalidateQueries({ queryKey: getListResourceTypesQueryKey() });
  };

  const handleAdd = (value: string) => {
    addActivity.mutate(
      { id: venueId, data: { activity_type: value as (typeof ACTIVITY_TYPE_VALUES)[number] } },
      {
        onSuccess: invalidateAll,
        onError: (err) => toast.error(apiErrorMessage(err, t('detail.activities.addError'))),
      },
    );
  };

  const handleRemove = () => {
    if (!removing) return;
    removeActivity.mutate(
      { id: venueId, activity: removing.activity_type },
      {
        onSuccess: () => {
          invalidateAll();
          setRemoving(null);
        },
        onError: (err) =>
          toast.error(apiErrorMessage(err, t('detail.activities.removeConfirm.error'))),
      },
    );
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>{t('detail.activities.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
          <p className="text-sm text-muted-foreground">{t('detail.activities.empty')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {activities.map((activity: VenueActivity) => (
              <Badge key={activity.id} variant="secondary" className="gap-1.5 py-1 pr-1 pl-3">
                {activityLabel(activity.activity_type)}
                {canEdit ? (
                  <button
                    type="button"
                    aria-label={t('detail.activities.removeConfirm.title')}
                    onClick={() => setRemoving(activity)}
                    className="grid size-5 place-items-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                ) : null}
              </Badge>
            ))}
          </div>
        )}

        {canEdit && options.length > 0 ? (
          <div className="max-w-xs">
            <Combobox
              options={options}
              value=""
              onValueChange={handleAdd}
              placeholder={t('detail.activities.add')}
              searchPlaceholder={t('detail.activities.searchPlaceholder')}
            />
          </div>
        ) : canEdit ? (
          <p className="text-sm text-muted-foreground">{t('detail.activities.allAdded')}</p>
        ) : null}
      </CardContent>

      <Dialog open={removing !== null} onOpenChange={(next) => !next && setRemoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('detail.activities.removeConfirm.title')}</DialogTitle>
            <DialogDescription>
              {t('detail.activities.removeConfirm.description', {
                activity: removing ? activityLabel(removing.activity_type) : '',
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoving(null)}>
              {tCommon('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={removeActivity.isPending}
            >
              {removeActivity.isPending
                ? t('detail.activities.removeConfirm.confirming')
                : t('detail.activities.removeConfirm.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
```

Add `XIcon` to the `lucide-react` import.

- [ ] **Step 3: Render it between Profile and Resources**

In `VenueDetailContent`'s return, insert between `<ProfileSection .../>` and `<ResourcesSection .../>`:
```tsx
<ActivitiesSection venueId={venue.id} canEdit={canEdit} />
```

- [ ] **Step 4: Verify (typecheck + preview)**

Run: `pnpm --filter owner typecheck 2>&1 | tail -3` (clean) and lint. Preview: open a venue detail, confirm the Activities section renders current activities as chips; add one via the Combobox (chip appears, picker option disappears); click a chip's × → confirm dialog → remove → chip gone. Verify no console errors.

- [ ] **Step 5: Commit (DEFERRED — hold)**

Suggested message: `feat(owner): venue activities management`

---

## Task 9: Final verification

- [ ] **Step 1: Full typecheck + lint + build**

Run:
```bash
pnpm --filter @iziwellpass/api typecheck && \
pnpm --filter @iziwellpass/ui typecheck && \
pnpm --filter owner typecheck && \
pnpm --filter owner lint && \
pnpm --filter owner build 2>&1 | tail -15
```
Expected: all green; build completes.

- [ ] **Step 2: i18n parity sweep**

Run:
```bash
cd apps/owner && node -e '
const fr=require("./messages/fr.json"), en=require("./messages/en.json");
function keys(o,p=""){return Object.entries(o).flatMap(([k,v])=>v&&typeof v==="object"&&!Array.isArray(v)?keys(v,p+k+"."):[p+k]);}
const fk=new Set(keys(fr)), ek=new Set(keys(en));
const onlyFr=[...fk].filter(k=>!ek.has(k)), onlyEn=[...ek].filter(k=>!fk.has(k));
if(onlyFr.length||onlyEn.length){console.log("PARITY GAPS", {onlyFr, onlyEn}); process.exit(1);}
console.log("i18n parity OK");
'
```
Expected: `i18n parity OK`

- [ ] **Step 3: Preview smoke test**

With the dev server running: create a venue end-to-end, edit its type, add + remove an activity, and load onboarding to confirm the type Combobox. Capture a screenshot of the venue detail (Profile + Activities + Resources). No console errors.

- [ ] **Step 4: Commit (DEFERRED — hold)**

When the hold lifts, commit the tasks (or squash) on the agreed branch. Suggested final message if squashing: `feat(owner): venue domain API sync (enum, create, activities)`.

---

## Self-review notes (author)

- **Spec coverage:** WS1 → Tasks 1,2,3,4,5,6; WS2 → Task 7; WS3 → Tasks 2 (copy) + 8; shared building blocks → Tasks 1,3; single `activityType.*` namespace → Task 2; fallback label → Task 1; timezone-required → Task 7. All spec sections mapped.
- **Deviation from spec naming:** spec said `activityTypeLabel(t, value)`; implemented as `useActivityTypeLabel()` returning a labeller (cleaner — avoids threading a root `t` through components). Functionally identical.
- **TDD note:** owner has no unit-test runner; verification is typecheck/lint/build/preview per task, matching the repo's actual tooling. The only pure logic (`humanizeActivityValue`) is covered by preview + typecheck rather than a unit test.
- **Backend ask (unchanged):** confirm old `venue_type` values were data-migrated; the fallback label protects the UI regardless.
