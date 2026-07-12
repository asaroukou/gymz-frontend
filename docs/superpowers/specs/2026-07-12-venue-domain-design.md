# Venue domain — API sync (Spec 1)

Design spec for consuming the updated backend OpenAPI in the venue domain of the
owner app. First of two specs from the API-sync plan
(`docs/api-sync-plan.md`); the second covers members (WS6). Staff (WS4) is parked
on a backend read endpoint.

## Goal

Adopt the new venue-related spec surface:

- **WS1** — `venue_type` enum migrated `VenueType` (9 values) → `ActivityType`
  (23 values). Unbreak the build, relabel, and move the type picker to a
  searchable Combobox.
- **WS2** — create a venue via `POST /gms/v1/venues` (`useCreateVenue`).
- **WS3** — manage a venue's activities via
  `useListVenueActivities` / `useAddVenueActivity` / `useRemoveVenueActivity`.

Model: a venue has one primary `venue_type` **plus** a many `activities` list —
both drawn from the same `ActivityType` catalog, both meaningful in the UI.

Already done (WS0/WS0b): Orval regen; `lib/dated-api.ts` migrated to the new
`date` query param. Out of scope here: WS4 (staff↔venues), WS6 (members),
WS5 (pass bookings — platform scope).

## Generated surface (post-regen, confirmed)

- Hooks: `useCreateVenue`, `useListVenueActivities`, `useAddVenueActivity`,
  `useRemoveVenueActivity`.
- Types: `ActivityType` (const + type), `CreateVenueRequest`,
  `AddActivityRequest`, `VenueActivity`, `VenueActivityId`.
- `Venue.venue_type` now refs `ActivityType`. `VenueType` no longer exists.

`ActivityType` values (23): `gym, crossfit, hiit, bootcamp, cycling, boxing,
martial_arts, dance, running, padel, tennis, squash, basketball, football,
swimming, climbing, bouldering, yoga, pilates, stretch, spa, massage, beauty`.

Removed vs old `VenueType`: `yoga_studio, tennis_club, cross_fit, swimming_pool,
other`.

## Architecture — shared building blocks (approach A)

Share the small high-value pieces; do not fold onboarding into a common form.

### `apps/owner/lib/activity-type.ts`
- `ACTIVITY_TYPE_VALUES` — tuple from generated `ActivityType` for `z.enum`.
- `useActivityTypeOptions(): ComboboxOption[]` — `{ value, label }` per catalog
  value, label from the shared `activityType.<value>` namespace, in catalog order.
- `activityTypeLabel(t, value): string` — label lookup with a **safe fallback**:
  if the key is missing (legacy/unknown stored value), return a humanized raw
  value (e.g. `yoga_studio` → "Yoga studio") rather than an empty string.

**One label namespace.** The enum labels live in a single top-level
`activityType.*` messages namespace used by onboarding, venue create/edit, the
type badges, and the activities picker. The old `venues.type.*` and
`onboarding.types.*` enum labels are removed (no double-maintenance). The helpers
take a root `useTranslations()` `t` and read `activityType.<value>`.

### `apps/owner/components/venue-form-fields.tsx`
- `VenueFormFields({ form, disabled })` — renders the shared venue fields:
  name · type (Combobox via `useActivityTypeOptions`) · description · address ·
  city · country (Select over `COUNTRIES`) · timezone (Select over `TIMEZONES`) ·
  phone. Layout mirrors the current `ProfileSection` grid.
- Consumed by the create page (WS2) and the detail `ProfileSection` (WS1). Each
  parent owns its own zod schema + submit + any extra fields. `is_active` and
  read-only `email` remain in the edit parent only.
- Field names align to the `Venue`/`CreateVenueRequest` contract: `name`,
  `venue_type`, `description`, `address_line`, `city`, `country`, `timezone`,
  `phone`.

## WS1 — enum migration (clears the compile errors)

Files: `app/(app)/venues/[id]/page.tsx`, `app/(app)/venues/page.tsx`,
`app/(onboarding)/onboarding/page.tsx`, `messages/{fr,en}.json`.

- Replace `const VENUE_TYPE_VALUES = Object.values(VenueType)` with
  `ACTIVITY_TYPE_VALUES` from the shared lib.
- `ProfileSection`: `venue_type` **Select → Combobox** (via `VenueFormFields`);
  `z.enum(ACTIVITY_TYPE_VALUES)`.
- Onboarding: remove `VenueTypeFieldset` (icon-tile grid) and `VENUE_TYPE_ICONS`;
  render the type as a Combobox using `useActivityTypeOptions`. This also
  resolves the `Icon is undefined` error. **Tradeoff (accepted):** onboarding's
  visual tile picker is replaced by the searchable Combobox.
- Type badges — venues list card (`t(\`type.${venue.venue_type}\`)`) and detail
  header — use `activityTypeLabel(t, venue.venue_type)` (fallback-safe).
- i18n: introduce a single top-level `activityType.*` namespace with the 23
  values in fr + en (below); remove the old `venues.type.*` and
  `onboarding.types.*` enum-label keys.

### Proposed labels (review these) — under `activityType.*`

| value | fr | en |
|---|---|---|
| gym | Salle de sport | Gym |
| crossfit | CrossFit | CrossFit |
| hiit | HIIT | HIIT |
| bootcamp | Bootcamp | Bootcamp |
| cycling | Cycling | Cycling |
| boxing | Boxe | Boxing |
| martial_arts | Arts martiaux | Martial arts |
| dance | Danse | Dance |
| running | Course à pied | Running |
| padel | Padel | Padel |
| tennis | Tennis | Tennis |
| squash | Squash | Squash |
| basketball | Basketball | Basketball |
| football | Football | Football |
| swimming | Natation | Swimming |
| climbing | Escalade | Climbing |
| bouldering | Bloc | Bouldering |
| yoga | Yoga | Yoga |
| pilates | Pilates | Pilates |
| stretch | Stretching | Stretching |
| spa | Spa | Spa |
| massage | Massage | Massage |
| beauty | Beauté | Beauty |

## WS2 — create venue

- New route `app/(app)/venues/new/page.tsx`, wrapped in `RequirePageAccess`
  (owner/admin), full-page form using `VenueFormFields` + a Create button.
- Zod schema: `name`, `venue_type`, `city`, `country`, `timezone` **required**
  (timezone treated as required — every venue-local date depends on it);
  `description`, `address_line`, `phone` optional.
- `useCreateVenue`; on success: toast, `invalidateQueries(getListVenuesQueryKey())`,
  `router.push('/venues/{created.id}')`. Field errors via `applyFieldErrors`,
  other errors via toast.
- CTA: primary **"Ajouter un lieu"** button in the venues page header **and** in
  the empty state, both linking to `/venues/new`.

## WS3 — venue activities

- New `ActivitiesSection` card on the venue detail page, placed **after
  `ProfileSection`, before `ResourcesSection`**.
- `useListVenueActivities(venueId, { query: { select: unwrap } })`.
- Render each activity as a chip (`Badge`) labeled via `activityTypeLabel`; when
  `canEdit`, each chip has a remove × that opens a **confirm dialog** →
  `useRemoveVenueActivity` → invalidate the list.
- **"Ajouter une activité"** Combobox whose options are the catalog values **not
  already present** in the list (independent of `venue_type`); selecting one
  calls `useAddVenueActivity` → invalidate. Hide the picker when every value is
  already added.
- Loading / error / empty states mirror `ResourcesSection`.
- New i18n under `venues.detail.activities.*` (title, add label, empty, remove
  confirm dialog copy) in fr + en.

## Edge cases & error handling

- Unknown/legacy `venue_type` value → `activityTypeLabel` fallback (never blank).
- Add-activity duplicate 409 (shouldn't occur — picker excludes existing) →
  toast the mapped API error, no crash.
- Create/edit field validation → `applyFieldErrors`; network/API errors →
  `apiErrorMessage` toast.
- All mutating affordances (create, add/remove activity, profile save) gated on
  `canEdit` (owner/admin), consistent with existing checks.

## Testing

- Unit: `activityTypeLabel` returns the mapped label for a known value and a
  humanized fallback for an unknown one; `useActivityTypeOptions` yields 23
  options in catalog order.
- i18n parity: every `activityType.*` and `venues.detail.activities.*` key
  exists in both fr and en.
- Green `typecheck` + `lint` across `@iziwellpass/api`, `@iziwellpass/ui`, owner;
  production build.
- Preview verification: create-venue flow end-to-end (redirect to detail),
  type Combobox in create/edit/onboarding, activity add + remove-with-confirm.

## Out of scope (YAGNI)

- Per-activity icons, activity reordering, bulk add.
- Folding onboarding into the shared venue form (only its picker changes).
- WS4 (staff↔venues), WS6 (members), WS5 (pass bookings).

## Backend asks (carried from the plan)

- Confirm old `venue_type` values were data-migrated to the new catalog.
