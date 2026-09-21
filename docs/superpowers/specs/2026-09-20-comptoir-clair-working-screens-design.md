# « Le comptoir clair » SP-C — working screens (owner)

**Date:** 2026-09-20
**Status:** approved design, ready for two plans (C1, C2)
**Builds on:** SP-A (`2026-09-20-comptoir-clair-design-system-design.md`, merged at 1a602fe) and SP-B (`2026-09-20-comptoir-clair-hub-screens-design.md`, on branch `feat/comptoir-clair-hubs`).
**Canvas frames (source of truth, `screens.pen`):** `oouHs` Planning · Cours récurrents, `s8ABF` Planning · Séances, `jFogY` Planning · Ajouter un cours, `skmEM` Planning · Participants d'une séance, `xLxJY` Membres, `nVkMG` Membres · Ajouter un membre, `L6sMyP` Membre · Fiche, `WYHdY` Membre · Attribuer une formule, `N2Rqjs` Offres · Créer une offre, `aussB` Établissements · Nouvel établissement, `Ro3gM` Établissement · Fiche, `W1G1mM` Établissement · Ajouter une ressource, `e0TehM` Équipe, `RZF9q` Équipe · Inviter un membre, `TmgT0` Équipe · Retirer un membre. PNG exports at `docs/design-refs/comptoir-clair/<frameId>.png`.

## 1. Purpose

SP-B rebuilt the hubs. The working screens (planning, members, offers dialog, venues, team) still carry the SP1 composition: bordered cards around tables and forms, 24px titles, boxed recurrence editor, generic dialogs. SP-C rebuilds them exactly as drawn: a light 32px title with one dark action, a 380px search pill, hairline tables at 15px, two-column detail pages with 22px section titles, key/value hairline rows, tinted subscription tiles, and 28px-radius dialogs with a ghost cancel beside the one dark action.

No data hook, mutation, or API call changes. This is composition and styling on top of the existing owner data layer.

## 2. Decisions

- **D1 — Canvas geometry wins where DESIGN.md is silent.** The One Dark Rule reads "one dark 44px action per surface" (page, dialog, or sheet). Dark *small* (36px) buttons inside a section, and the dark round « + » in the participants sheet, are allowed where the canvas draws them (`Ro3gM` Ressources, `skmEM`).
- **D2 — Members paging is client-side.** The directory keeps its full fetch and local search/status filter, then slices pages of 20. The footer reads « {shown} membres sur {total} » with exact counts. Page resets to 1 whenever the query or the status filter changes.
- **D3 — Gallery deferred.** The venue image API (presign/register/list/reorder/delete) is SP-D. `openapi.json` is not re-synced in SP-C.
- **D4 — No API changes, no key deletions beyond what the rewritten pages stop using.** fr/en key parity stays a gate.
- **D5 — One spec, two plans.** C1 = shared primitives + planning + members. C2 = venues + team + offers dialog. C2 starts only after C1's final review is clean. Both land on `feat/comptoir-clair-hubs`.
- **D6 — Mobile is stacked hairline rows, not cards.** The canvas has desktop frames only. Below `md`, tables render the same cells as a vertical stack per row separated by hairlines; two-column grids stack; dialogs go full-width with 16px margins. The mobile `*Card` components are deleted.
- **D7 — Existing `Table` is restyled in place**, not replaced: head 36px / 13px atténué, cells 15px with 14px vertical padding. All consumers (owner and admin) inherit the geometry.
- **D8 — Admin `/design` registry is the one admin change**: entries and specimens for `working-page`, `pagination`, `day-toggle`; refreshed specimens for `table` and `dialog`.
- **D9 — « Ajouter et enchaîner »** submits, toasts success, resets the form, keeps the dialog open with focus on « Prénom ». « Ajouter le membre » submits and closes. Both exist today (`addDialog.submitAndAnother`); only the placement changes (ghost, left of the dark action).
- **D10 — Expired subscription tiles take the grey pill tone, not côté.** The canvas (`L6sMyP`) draws the expired tile at `#eceef2` (`bg-secondary`), unlike SP-B's cancelled sessions at côté. Follow the canvas: `subscriptionTone` → `'side'` renders `bg-secondary`.
- **D11 — Canvas « Button/Secondary » is the ui `outline` variant.** DESIGN.md gives the secondary button a filet outline on white; the ui `secondary` variant is the grey pilule fill and is reserved for tabs, chips and empty-state CTAs. « Participants », « + Attribuer une formule », « Réactiver », « Ajouter » (activités) and every other canvas secondary pill render with `variant="outline"`.
- **D12 — Dialogs opened from a row menu restore focus explicitly.** Radix only restores focus to a `DialogTrigger`; controlled dialogs and sheets opened from a « ··· » menu, a chip or a row button take `restoreFocusTo={() => element}` on `DialogContent`/`SheetContent` (a callback returning the originating button, kept in a per-row focus registry). Staying mounted is not enough.
- **D13 — Table row heights follow from content.** `TableCell` padding is 14px; a row holding a 36px control or avatar is 64px. The canvas 46px (resources) and 60px (team) rows are not reproduced; every hairline table row is 64px.

## 3. Shared primitives (`packages/ui`)

Geometry below is measured on the canvas at 1440px. Vertical rhythm inside a working page is 32px.

### 3.1 `WorkingPage` family — `packages/ui/src/components/working-page.tsx`

| Export | Element and classes | Notes |
| --- | --- | --- |
| `WorkingPage({ className, children })` | `div.flex.w-full.flex-col.gap-8` | Sits inside the shell `main` (already `px-4 py-6 md:px-14 md:pt-10 md:pb-12` from SP-B). |
| `WorkingHeader({ title, subtitle?, action?, badges?, className })` | `header.flex.flex-wrap.items-end.justify-between.gap-4` → `div.flex.flex-col.gap-1.5` with `h1.text-2xl.font-normal` and `p.text-base.text-muted-foreground`; `action` right in `div.flex.shrink-0.items-center.gap-2`; `badges` right in `div.flex.items-center.gap-2.self-end` | Canvas: title 32/400, subtitle 15 atténué, gap 6, action 44px bottom-aligned with the title block (`items-end`). `badges` is the detail-page variant (`Ro3gM`: status + activity badges, 24px, gap 8, bottom-aligned). Replaces `PlansHeader` and every inline `<h1 className="text-2xl font-normal">` in owner. |
| `BackLink({ href, children, linkComponent? })` | `a.inline-flex.items-center.gap-1.5.text-md.text-muted-foreground.hover:text-foreground` with `ArrowLeft` 16px | Canvas 14px, icon 16, gap 6. `linkComponent` defaults to `a`; owner passes Next `Link`. |
| `SectionHeading({ title, description?, action?, className })` | `div.flex.items-start.justify-between.gap-4` → `div.flex.flex-col.gap-1` with `h2.text-xl.font-medium` (22/500) and `p.text-md.text-muted-foreground` (14); `action` right, `self-start` | Section titles on detail pages. Never a card. |
| `KeyValueList({ children, className })` | `dl.flex.flex-col` | Rows separated by `border-t border-border` from the second row on. |
| `KeyValueRow({ label, children, className })` | `div.flex.min-h-[42px].items-center.justify-between.gap-6.py-3` → `dt.text-base.text-muted-foreground` and `dd.text-base.font-medium.text-right` | Canvas rows 42px (48 when the value is a badge, which the `py-3` + badge 24 gives). Values right-aligned; a `Badge` child renders as-is. |

Tests (`working-page.test.tsx`): header renders title/subtitle/action/badges; `BackLink` renders the custom link component with `href`; `KeyValueList` puts hairlines only between rows; `SectionHeading` renders `h2`.

### 3.2 `Pagination` — `packages/ui/src/components/pagination.tsx`

```ts
interface PaginationProps {
  page: number;              // 1-based
  pageCount: number;
  onPageChange(page: number): void;
  labels: { label: string; previous: string; next: string; page(n: number): string };
  className?: string;
}
```

- `nav` with `aria-label={labels.label}` containing a `ul.flex.items-center.gap-1`; each page pill carries `aria-label={labels.page(n)}`.
- Prev/next: `Button variant="ghost" size="icon-sm"` (36px) with `ChevronLeft`/`ChevronRight`, `aria-label`, disabled at the bounds.
- Page pills: `button.h-9.min-w-9.rounded-full.px-2.text-md.text-muted-foreground` ; the current page gets `bg-secondary font-semibold text-foreground` and `aria-current="page"` (same look as an active `TabsTrigger`, 36px like the canvas `OiryV` at 36×36).
- Ellipsis: `span.w-9.text-center.text-muted-foreground` with `aria-hidden`, text `…`.
- Visible pages, pure function `pageItems(page, pageCount): Array<number | 'ellipsis'>`: always 1 and `pageCount`; `page − 1 … page + 1`; an ellipsis wherever a gap exists. Returns `[]` when `pageCount ≤ 1`, and the component renders nothing then.

Tests: `pageItems(1, 13)` → `[1, 2, 'ellipsis', 13]`; `pageItems(7, 13)` → `[1, 'ellipsis', 6, 7, 8, 'ellipsis', 13]`; `pageItems(1, 1)` → `[]`; prev disabled on page 1; clicking a pill calls `onPageChange`; `aria-current` on the active pill.

### 3.3 `DayToggle` — `packages/ui/src/components/day-toggle.tsx`

```ts
interface DayToggleProps<T extends string> {
  days: ReadonlyArray<{ value: T; short: string; long: string }>;
  value: ReadonlyArray<T>;
  onChange(next: T[]): void;
  disabled?: boolean;
  className?: string;
}
```

- `div[role=group].flex.flex-wrap.gap-2`; each day a `button[type=button][aria-pressed]` with `aria-label={long}`, classes `size-11 rounded-full text-md font-semibold transition-colors` + pressed `bg-primary text-primary-foreground` / idle `bg-secondary text-foreground hover:bg-secondary/80`.
- Canvas: 44px round, ink `#1f1f1f` active, `#eceef2` idle, 14/600 letter, 8px gap.
- Toggling preserves the incoming order of `days` in `onChange` (sort by index in `days`), so the encoded rule is stable.

Tests: renders 7 buttons; click toggles and calls `onChange` in day order; `aria-pressed` reflects value; `disabled` disables all.

### 3.4 `Table` — restyle in place, `packages/ui/src/components/table.tsx`

- `TableHead`: `h-9 px-3 text-left align-middle text-sm font-medium whitespace-nowrap text-muted-foreground` (36px, 13/500 atténué; was `h-11`).
- `TableCell`: `px-3 py-[14px] align-middle text-base` (15px; was `py-3`, size inherited).
- `TableRow`: keep `border-b border-border`; `data-[state=selected]:bg-secondary` (was `bg-side`), plus `data-[state=selected]:[&>td:first-child]:rounded-l-[20px] data-[state=selected]:[&>td:last-child]:rounded-r-[20px]` for the participants-open highlight (`skmEM`).
- `TableHeader`: `[&_tr]:border-b` unchanged.
- Row heights fall out of content: every row that holds a 36px avatar or control is 64px (D13).

Admin consumers are checked visually in `/design` (specimen updated) and by the admin test suite; no admin page code changes.

### 3.5 `Dialog` and `Sheet` — restyle in place

`dialog.tsx`:
- `DialogContent`: `rounded-[1.75rem] p-8 gap-6 sm:max-w-[520px]` (was `rounded-2xl sm:max-w-lg`). Callers widen with `className="sm:max-w-[560px]"` (add member) or `sm:max-w-[620px]` (course), or narrow with `sm:max-w-[480px]` (confirmations).
- Close button: `absolute top-7 right-7 size-9` (canvas 36px at 28/28).
- `DialogHeader`: `flex flex-col gap-2 pr-10` (room for the close button; canvas padding-right 40).
- `DialogTitle`: `text-[1.5rem] leading-[1.2] font-medium` (24/500).
- `DialogDescription`: `text-base text-muted-foreground` (15).
- `DialogFooter`: `flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2.5` (canvas gap 10, both buttons 44px).
- Form body inside dialogs: `div.flex.flex-col.gap-[18px]`; two-column rows `div.grid.gap-4.sm:grid-cols-2` (canvas gutter 16).

`sheet.tsx` (right side): `p-8 gap-6`; `SheetHeader` `flex flex-col gap-2 pr-10`; `SheetTitle` `text-[1.75rem] leading-[1.2] font-normal` (28/400); `SheetDescription` `text-base font-medium text-muted-foreground`. Width stays 460.

Spec §9 lists the guard implications (none: no new banned strings).

### 3.6 Unchanged primitives used as-is

`Tabs` (pill triggers, already 40px), `Badge` (`default` = neutral, `success`, `warning`, `info`, `outline`), `Chip` with `onRemove`, `Avatar` + `AvatarFallback` (tinted by `tintForIndex`), `Capacity` (bar + count; count is moved next to the bar in SP-C via `hideCount` + a sibling `span`), `Empty` family, `Alert`, `Skeleton`, `Input` 48px pill, `Select`, `Textarea`, `Switch`, `Checkbox`, `Button` (`default` dark, `secondary`, `ghost`, `destructive`, `outline`; sizes `default` 44, `sm` 36, `icon-sm` 36).

### 3.7 Admin `/design` registry

`apps/admin/lib/design-registry.ts` gains `{ id: 'working-page', title: 'Page de travail', group: 'display' }`, `{ id: 'pagination', title: 'Pagination', group: 'controls' }`, `{ id: 'day-toggle', title: 'Jours', group: 'controls' }` (the registry has two groups, `controls` and `display`). Specimens in `apps/admin/app/design/primitives/` render each with French sample content. `design-registry.test.ts` continues to assert every ui component has an entry.

## 4. Owner shared helpers (`apps/owner/lib/`, node tests)

- `paginate.ts`: `paginate<T>(items: T[], page: number, pageSize: number): { items: T[]; page: number; pageCount: number; total: number }` — clamps `page` into `[1, pageCount]`, `pageCount = max(1, ceil(total / pageSize))`. `PAGE_SIZE = 20` exported from `members/members-directory.tsx`, not from lib.
- `role-badge.ts`: `roleBadgeVariant(role): 'info' | 'default'` — `owner`, `admin` → `info`; everything else `default`. Moves out of `staff/page.tsx`.
- `slot-status.ts`: `slotBadge(status: SlotStatus): { variant: 'success' | 'warning' | 'outline' }` — `available` → success, `full` → warning (sable), `cancelled` → outline; and `bookingBadge(status: BookingStatus)`: `checked_in` → success, `confirmed` → info, `no_show` → warning, `cancelled` → outline. Replaces the `BadgeSpec` mapping inside `planning-utils.ts` (`usePlanningLabels` keeps only the labels).
- `subscription-tone.ts`: `subscriptionTone(status, index): 'side' | number` — `expired`, `exhausted`, `cancelled` → `'side'` (rendered `bg-secondary`), otherwise `index` (tint). Mirrors `tileTone` from SP-B.

Existing helpers reused unchanged: `member-search.ts` (`memberName`, `memberInitials`), `datetime.ts`, `recurrence.ts`, `member-status.ts`, `money.ts`.

## 5. Plan C1 — Planning (`apps/owner/app/(app)/schedules/`)

### 5.1 `page.tsx`

`WorkingPage` → `WorkingHeader` (title `planning.title`, subtitle `planning.subtitle`, action = `AddScheduleDialog` trigger, dark `Button` 44px « Ajouter un cours ») → `Tabs` with `TabsList` (« Cours récurrents » | « Séances ») → the tab panels. Venue-none / venues-error states unchanged in copy, rendered without `Card`.

### 5.2 `schedules-tab.tsx` — recurring courses

Hairline `Table`, columns and widths from `oouHs` (1068 total): Cours 204 · Récurrence 300 · Salle 120 · Intervenant 160 · Période 220 · actions 64.

- Cours: `p.text-base.font-medium` title, `p.text-sm.text-muted-foreground` description (omitted when empty).
- Récurrence: rule line 15px (`recurrence.*` labels + weekday shorts), time range `p.text-sm.font-medium.text-muted-foreground.font-numeric` « 06:30–07:30 ».
- Salle: resource name or `courses.unknownResource` atténué.
- Intervenant: name or `courses.noInstructor` atténué.
- Période: `courses.dateFrom` / `courses.dateRange` in atténué.
- Actions: `DropdownMenu` on a 36px ghost icon button (`MoreHorizontal`), items Modifier / Supprimer (existing dialogs).
- `CourseCard` deleted; below `md` each row is `div.flex.flex-col.gap-1.border-b.py-3` with the same content (title, recurrence + time, room · instructor, period, actions row).
- Empty state: `Empty` with `courses.emptyTitle/emptyBody` and the add dialog trigger as a `secondary` button. Error: `Alert`.

### 5.3 `slots-tab.tsx` — sessions

Day groups as today (grouping and heading logic untouched). Each group: `h2.text-xl.font-medium` (22/500) then rows in a `div.flex.flex-col` with hairlines.

Row (`s8ABF`, 64px): `div.grid.items-center.gap-4.border-b.py-3.md:grid-cols-[64px_1fr_120px_44px_auto_auto]`:
1. Time `span.text-lg.font-medium.font-numeric` (18/500) — the slot's venue-local start.
2. Title `p.text-base.font-medium` + room `p.text-sm.text-muted-foreground`.
3. `Capacity` bar 120px, `hideCount`.
4. Count `span.text-md.font-medium.font-numeric.text-muted-foreground` « 14/18 ».
5. `Badge` from `slotBadge(status)` with `planning.slotStatus.*`.
6. Actions: `Button variant="outline" size="sm"` « Participants » (opens `BookingsSheet`) and the 36px « ··· » menu (Annuler la séance).

Cancelled rows: title and time in `text-muted-foreground`, bar hidden, badge outline. The row whose sheet is open gets `data-state="selected"` → `bg-secondary rounded-[20px]` (the grid is a `div`, so the class is applied directly, not through `TableRow`).

Mobile: grid collapses to `grid-cols-[64px_1fr]` with capacity, badge and actions on a second line. `SlotRow`'s card variant deleted.

### 5.4 `bookings-sheet.tsx` — participants

`Sheet` right (460). Header: `p.text-md.text-muted-foreground` eyebrow « {day} · {room} », `SheetTitle` slot title (28/400), `SheetDescription` « 06:30–07:30 · 14/18 inscrits » (15/500 atténué).

Add row (when `canManageBookings` and slot not full/cancelled): `Input` 48px search (existing member type-ahead) and a 48px dark round `Button size="icon"` with `Plus` (`aria-label=addBooking.add`). The existing `AddParticipant` type-ahead keeps its logic; only its shell changes.

Rows (60px): `Avatar` 36 tinted by index, name 15/500, source 13 atténué (`bookingSource.*`), `Badge` from `bookingBadge(status)`, and for `confirmed` a dark small « Valider » (`Button size="sm"`) when `canManageBookings`. Cancel booking stays in the row menu.

### 5.5 `schedule-dialogs.tsx` — add / edit / delete

Add and edit share `ScheduleFormFields`; dialog `sm:max-w-[620px]`. Field order per `jFogY`, in `gap-[18px]` with two-column rows:
1. Titre · Salle (`Select`)
2. Intervenant (`Select`) · Description (`Textarea`, 96px)
3. `h3.text-lg.font-semibold` « Horaire » (`form.sectionTiming`, 16/600)
4. Répétition (`Select`) · Intervalle (`Input` number; label `form.intervalWeeks`/`intervalDays` by frequency; hidden when `none`)
5. « Les jours » → `DayToggle` (weekly only; `form.onDays` label; `form.weekdayRequired` validation)
6. Heure de début · Heure de fin
7. À partir du · Jusqu'au (facultatif)

`RecurrenceEditor` keeps `RecurrenceEditorState` and `serializeRecurrenceRule`; it drops its `bg-side` box and renders rows 4 and 5 above with `DayToggle`. Footer: ghost « Annuler » + dark « Créer le cours » / « Enregistrer ». Delete dialog: `sm:max-w-[480px]`, ghost Annuler + `destructive` confirm.

### 5.6 Deleted

`CourseCard`, `SlotRow` card branch, the `BadgeSpec` mapping in `planning-utils.ts`.

## 6. Plan C1 — Members

### 6.1 `members/page.tsx` → split

- `page.tsx`: page access, venue/data loading, `WorkingPage` + `WorkingHeader` (title `members.title`, subtitle « {count} membres » via a new ICU key `members.count`, action = `AddMemberDialog` trigger dark 44px), then `MembersDirectory`.
- `members-directory.tsx`: toolbar + table + footer. `export const PAGE_SIZE = 20`.
- `member-row.tsx`: `MemberRow` (desktop `TableRow`) and `MemberStack` (mobile stacked row), plus `MemberActions` menu.
- `add-member-dialog.tsx`: the dialog (existing form logic).
- `suspend-member-dialog.tsx`: shared with the detail page (moved out of both page files).

### 6.2 Directory layout (`xLxJY`)

Toolbar `div.flex.flex-wrap.items-center.justify-between.gap-4`: `Input` search 48px, `md:w-[380px]`, with a `Search` icon at left; status `Tabs` right (`Tous · Actifs · Expirés · Suspendus · Annulés`, existing `filters.*` keys) — `TabsList` only, no panels, `value` bound to the status filter.

Table columns (1068): Membre 244 · Contact 260 · Type 130 · Statut 130 · Fin d'abonnement 240 · actions 64.
- Membre: `Avatar` 36 tinted by row index (`tintForIndex`), name 15/500. The cell is a `Link` to the detail page.
- Contact: email 15 (or `detail.noEmail` atténué), phone 13 atténué `font-numeric`.
- Type: plain text `type.*` (no badge).
- Statut: `Badge` by `memberStatusBadgeVariant` (existing).
- Fin: date 15 (or `noEnd` atténué) + `Badge variant="warning"` « Bientôt » (`expiringSoon`) inline to the right, gap 20.
- Actions: 36px « ··· » menu (Voir / Modifier / Suspendre).

Footer `div.flex.items-center.justify-between.pt-2`: `p.text-md.text-muted-foreground` « {shown} membres sur {total} » (new key `members.footer`, ICU) and `Pagination`.

Data flow: `members` → `filtered` (query + status, existing `useMemo`) → `paginate(filtered, page, PAGE_SIZE)`. `useEffect` resets `page` to 1 when `query` or `status` changes. Empty (`empty.*`) and no-results (`noResults.*`) states use `Empty`, no card. `DirectorySkeleton` renders 8 rows of 64px.

### 6.3 Add member dialog (`nVkMG`)

`sm:max-w-[560px]`. Rows: Prénom · Nom / E-mail · Téléphone / Type d'abonnement (`Select`) · Début d'abonnement / Accès aux établissements (`Select`, full width; the venue multi-select appears beneath when scoped, as today) / Notes (`Textarea`). Footer: ghost « Ajouter et enchaîner » + dark « Ajouter le membre » (D9).

### 6.4 `members/[id]/page.tsx` → split (`L6sMyP`)

- `page.tsx`: loading, not-found, error, then `WorkingPage` with: `BackLink` « Retour aux membres »; `MemberHeader`; `div.grid.gap-10.md:grid-cols-2.md:gap-16` with left `MembershipSection` + `SubscriptionsSection`, right `EditMemberForm` + `DangerZone`. Columns are `flex flex-col gap-10` (canvas 40).
- `member-header.tsx`: `div.flex.flex-wrap.items-start.justify-between.gap-6`. Left: `Avatar` 72 (`size-[72px] text-xl`) tinted, then `h1.text-2xl.font-normal` name and a badge row (`Badge default` type, status badge, `Badge info` « Tous les établissements » or the venue count, and `Button variant="ghost" size="sm"` « Gérer l'accès » opening `EditAccessDialog`). Right (`text-right`, `self-center`): email 15/500 (or `noEmail`), phone 15 atténué, « Membre depuis le … » 13 atténué (`detail.memberSince`).
- `membership-section.tsx`: `SectionHeading` « Adhésion » then `KeyValueList` rows Type / Début / Fin / Statut (badge) / Notes (`noNotes` atténué when empty; long notes wrap, `dd` gets `max-w-[60%]`).
- `subscriptions-section.tsx` (renames `subscriptions-card.tsx`): `SectionHeading` with description and action `Button variant="outline" size="sm"` « + Attribuer une formule »; then tiles `div.flex.flex-col.gap-4`: each `div.flex.items-center.justify-between.rounded-[20px].p-5` with `tintClass(subscriptionTone(status, index))` (`bg-secondary` for `'side'`): left name 15/600 + optional `Badge warning` « Impayé » inline, meta 13 in `text-muted-strong` (« Expire le … », « 3 / 10 entrées restantes »); right `span.text-md.font-medium` status coloured `text-success-foreground` when active, `text-muted-foreground` otherwise. Cancel stays as a ghost small button revealed in the tile's right group when `canManage` (existing `CancelSubscriptionDialog`).
- `edit-member-form.tsx`: `SectionHeading` « Modifier le membre »; the form in `gap-[18px]` with rows Prénom · Nom / E-mail · Téléphone / Type · Fin d'abonnement / Statut du compte (`Select`) / Notes; footer `div.flex.justify-end` dark « Enregistrer » 44px.
- `danger-zone.tsx`: `SectionHeading` « Zone sensible » + description; `div.flex.gap-2.5` with `destructive` « Suspendre le membre » and `outline` « Réactiver » (disabled when not suspended, as today).
- `assign-subscription-dialog.tsx`: `sm:max-w-[520px]`; Établissement (`Select`), Offre (`Select`, items « Mensuel illimité · FCFA 45 000 »), Début, then a switch row `div.flex.items-center.justify-between.gap-4` with title 15/500 « Réglé » + helper 13 atténué and `Switch`; footer ghost Annuler + dark « Attribuer ».
- `IdentityCard`, `MembershipCard` deleted.

## 7. Plan C2 — Venues

### 7.1 `venues/new/page.tsx` (`aussB`)

`WorkingPage` → `BackLink` « Retour aux établissements » → `WorkingHeader` title « Nouvel établissement » (no subtitle) → `form.flex.max-w-[680px].flex-col.gap-[18px]` using `VenueFormFields` with `layout="rows"`: Nom · Type / Description / Adresse / Ville · Pays / Fuseau horaire · Téléphone; footer `div.flex.justify-end.gap-2.5.pt-2` ghost Annuler (back) + dark « Créer l'établissement ». `Card` removed.

`components/venue-form-fields.tsx` gains `layout?: 'rows' | 'stack'` (default `'stack'`, current behaviour); `'rows'` wraps the pairs in `div.grid.gap-4.sm:grid-cols-2`.

### 7.2 `venues/[id]/page.tsx` → split (`Ro3gM`)

- `page.tsx`: loading / not-found / error; `WorkingPage` with `BackLink`, `WorkingHeader` (title = venue name, subtitle = address line or `noAddress`, `badges` = status `Badge` (success « Actif » / default « Inactif ») + first activity `Badge default` if any), then `div.grid.gap-10.md:grid-cols-2.md:gap-16`: left `ProfileSection`; right `ActivitiesSection` + `ResourcesSection` (column `flex flex-col gap-10`).
- `profile-section.tsx`: `SectionHeading` « Profil »; form `gap-[18px]` with `VenueFormFields layout="rows"` plus E-mail (`Input disabled`, helper `emailReadOnly` « Modifiable prochainement » 13 atténué) and the switch row « Établissement actif » + helper; footer `div.flex.justify-end` dark « Enregistrer ».
- `activities-section.tsx`: `SectionHeading` « Activités » + description; `div.flex.flex-wrap.gap-2` of `Chip` with `onRemove` (existing confirm dialog); add row `div.flex.gap-2`: `Input` search (`searchPlaceholder`) + `Button variant="outline"` « Ajouter » 44px; the existing suggestion popover stays.
- `resources-section.tsx`: `SectionHeading` « Ressources » with action = dark small `Button size="sm"` « + Ajouter une ressource » (`AddResourceDialog` trigger; D1); hairline `Table` Nom 168 · Type 180 · Capacité 90 (numeric, right) · actions 64, rows 46px; below, `Button variant="ghost" size="sm"` « Nouveau type de ressource » (`NewResourceTypeDialog`). Empty state `Empty`.
- `resource-dialogs.tsx`: `AddResourceDialog`, `EditResourceDialog` (`sm:max-w-[520px]`: Nom / Type de ressource `Select` / Capacité / Description), `DeleteResourceDialog` (`sm:max-w-[480px]`, destructive), `NewResourceTypeDialog` (unchanged fields, restyled shell). `ResourceFormFields` and `useResourceSchema` move here.

### 7.3 Deleted

`Card` usage across venues; the inline `ProfileSection` / `ResourcesSection` / `ActivitiesSection` in `page.tsx`.

## 8. Plan C2 — Team and offers dialog

### 8.1 `staff/page.tsx` → split (`e0TehM`)

- `page.tsx`: access, data, `WorkingPage` + `WorkingHeader` (title « Équipe », subtitle « {count} membres » via new ICU key `staff.count`, action dark 44px « Inviter » with `UserPlus` icon), `Input` search `md:w-[380px]` (existing local filter), `StaffTable`.
- `staff-table.tsx`: `Table` Membre 464 · E-mail 340 · Rôle 200 · actions 64, rows 60px. Membre: `Avatar` 36 tinted, name 15/500, « · vous » atténué (`row.selfHint`). Rôle: `Badge` from `roleBadgeVariant`. Actions: 36px « ··· » (Changer le rôle / Établissements / Retirer). `StaffRowActions` moves here. Mobile stacked rows. `StaffTableSkeleton` 6 rows of 60px.
- `staff-dialogs.tsx`: `InviteStaffDialog` (`sm:max-w-[520px]`: Prénom · Nom / E-mail / Rôle `Select` / « Établissements » `Checkbox` list 20px with 15px labels, gap 12, helper 13 atténué `venuesHint`; then `p.text-md.text-muted-foreground` `expectation`; footer ghost Annuler + dark « Envoyer l'invitation »), `ChangeRoleDialog`, `ManageVenuesDialog` (both 520), `RemoveStaffDialog` (`sm:max-w-[480px]`, ghost Annuler + `destructive` « Retirer », `TmgT0`).

### 8.2 `plans/plan-dialog.tsx` (`N2Rqjs`)

`sm:max-w-[520px]`, body `gap-[18px]`: Nom / Type (`Select` `kind.*`) / Prix · Devise (`Select`) / Durée (jours) or Nombre d'entrées by kind / switch row « Valable pour toutes les activités » + helper (new key `plans.dialog.allActivitiesHint`) + the activity multi-select beneath when off; footer ghost Annuler + dark « Enregistrer » (`dialog.submit`). Create and edit share the shell; the trigger variants set in the tiles pass stay.

## 9. Guard, copy and tests

- Design guard: no new banned strings. `rounded-[1.75rem]`, `rounded-[20px]`, `py-[14px]`, `size-11`, `text-[1.5rem]`, `text-[1.75rem]` are arbitrary values the guard does not police. No `shadow-*`, no `border` around groups, no `Card` on any SP-C page after C2.
- fr/en keys reused: `members.subtitle` and `staff.subtitle` (already ICU plurals) for the header counts, `planning.bookings.subtitle` for the sheet description. Keys added: `members.footer` (« {shown} membres sur {total} », plural on `total`), `planning.bookings.dateLine` (« {day} · {room} »), `plans.dialog.allActivitiesHint`, `members.detail.subscriptions.assignDialog.paidHint` (« Le paiement a été encaissé à l'attribution. »), and `common.pagination.{label,previous,next,page}` (« Pagination », « Page précédente », « Page suivante », « Page {n} »). Keys removed with their consumers: none required; orphans found during the final review are deleted in the fix wave, never before. Parity gate:
  `node -e 'const f=require("./apps/owner/messages/fr.json"),e=require("./apps/owner/messages/en.json");const k=(o,p="")=>Object.entries(o).flatMap(([a,b])=>typeof b==="string"?[p+a]:k(b,p+a+"."));const F=new Set(k(f)),E=new Set(k(e));const d=[...F].filter(x=>!E.has(x)).concat([...E].filter(x=>!F.has(x)));if(d.length){console.error(d);process.exit(1)}'`
- Tests: ui (`working-page`, `pagination`, `day-toggle`, plus a `table` test asserting the head/cell classes and selected-row class); owner lib (`paginate`, `role-badge`, `slot-status`, `subscription-tone`); existing owner lib tests untouched. Admin `design-registry.test.ts` stays green with the new entries.

## 10. Verification

`pnpm check:design && pnpm build && pnpm typecheck && pnpm lint && pnpm test` plus the parity one-liner, on each plan's final commit. Visual check per frame against `docs/design-refs/comptoir-clair/<id>.png` at 1440 wide with the mock API (port 8091, dev 3021), reviewer-driven through CDP as in SP-B. Never build while a dev server of the same checkout runs.

## 11. Out of scope

Venue gallery (SP-D). Server-side members pagination. Admin working screens. Member app. « À régler » dashboard tab. New API endpoints or `openapi.json` sync. Any change to data hooks, mutations, or validation schemas beyond moving them between files.

## 12. Task shape (for the plans)

**Plan C1 (primitives + planning + members)**
1. `working-page.tsx` family + tests + admin registry entry/specimen.
2. `pagination.tsx` + `day-toggle.tsx` + tests + registry entries/specimens.
3. `Table` / `Dialog` / `Sheet` restyle + table test + specimen refresh; owner lib helpers (`paginate`, `role-badge`, `slot-status`, `subscription-tone`) + tests; new message keys (fr/en).
4. Planning page + `schedules-tab.tsx` (courses table, delete `CourseCard`).
5. `slots-tab.tsx` + `bookings-sheet.tsx`.
6. `schedule-dialogs.tsx` + `recurrence-editor.tsx` on `DayToggle`.
7. Members directory split (page, directory, row, add dialog, suspend dialog) with paging.
8. Member detail split (header, membership, subscriptions, edit form, danger zone, assign dialog).
Final whole-branch review, one fix wave, re-review.

**Plan C2 (venues + team + offers)**
1. `venue-form-fields.tsx` `layout="rows"` + `venues/new/page.tsx`.
2. Venue detail split: page + header + `profile-section.tsx`.
3. `activities-section.tsx` + `resources-section.tsx` + `resource-dialogs.tsx`.
4. Staff split: page + `staff-table.tsx`.
5. `staff-dialogs.tsx`.
6. `plan-dialog.tsx`.
Final whole-branch review, one fix wave, re-review.
