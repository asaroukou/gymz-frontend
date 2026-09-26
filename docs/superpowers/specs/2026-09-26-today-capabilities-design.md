# SP-G — Today snapshot and plan capabilities

**Date:** 2026-09-26
**Status:** approved design, ready for one plan
**Builds on:** SP-C working screens (2dcbef7), SP-D0 API sync (24f1c6b), SP-E planning contract (29157bd). Independent of SP-D (unmerged branch `feat/venue-gallery`).
**Brief:** `docs/design-briefs/2026-09-21-console-flows-and-actions.md` §5 (Aujourd'hui) and §9 (Plan capabilities).
**Backend contract:** iziwellpass `origin/main`: `GET /gms/v1/venues/{id}/today` (`TodaySnapshot`), `GET /gms/v1/capabilities` (`TenantCapabilitiesResponse`), `crates/iziwellpass-common/src/types/capability.rs` (`capabilities_for`), `crates/iziwellpass-common/src/error.rs` (`FEATURE_NOT_AVAILABLE`, 403).
**Canvas frames (source of truth, `screens.pen`):** `s8LRy3` Tableau de bord · Planning du jour · états de séance, `D2YWBH` Tableau de bord · À régler, `r5BGk` Tableau de bord · À régler · Vide, `zCLZV` Équipe · Verrouillée (plan Starter), `p6hCM` Établissements · Ajout verrouillé + tooltip nav. PNGs and verbatim copy in `docs/design-refs/comptoir-clair/wave-2/` (`INVENTORY.md`).

## 1. Purpose

Front-desk staff and owners open the dashboard to know what is happening today and what needs them now. The backend now returns the whole venue day in one call (every session with its lifecycle, arrivals, bookings and a `needs_attention` flag, plus the day's attendance). SP-G moves the dashboard onto that snapshot, adds the « À régler » tab with quick fixes, and a date control for the tiles.

The backend also gates features by subscription plan and answers `403 FEATURE_NOT_AVAILABLE` when a plan lacks one. SP-G makes the console show those limits before the user hits them (lock glyphs, locked pages, locked buttons with tooltips), explains them when they are hit anyway (upgrade toast vs « Accès refusé »), shows the current plan in the sidebar, and adds a read-only `/plan` comparison page.

## 2. Decisions

- **T1 — Canvas copy and geometry win over the brief** (same rule as SP-E E1, SP-D G1). **Exception: lock placement follows the backend matrix, not the canvas scene.** `zCLZV` draws « Équipe » locked on Starter, but `capabilities_for(Starter)` includes `staff_accounts` (and the brief says « Équipe » on free). The locked page keeps the `zCLZV` layout; which page locks, and every tag and row in its list, comes from the matrix (§6).
- **T2 — The reason is derived in the browser.** `TodaySlot.needs_attention` is a boolean; the reason is computed from the slot with a fixed priority: `no_instructor` (booked_count > 0 and no `instructor_staff_id`) → `over_capacity` (booked_count > capacity) → `no_arrivals` (lifecycle `active` and checked_in_count = 0). Only slots with `needs_attention = true` get a reason; if the flag is true and no rule matches (backend rule drift), the reason is `unknown` and renders the generic « À régler » badge with no reason line.
- **T3 — One snapshot query per venue-day.** `useTodaySnapshot(venueId, date)` wraps the generated `useVenueToday(venueId, { date })` with `select: unwrap`; `date` is always sent (venue-local `YYYY-MM-DD`, from `venueToday(timeZone)` or the date control), so the query key is stable. On the dashboard it replaces `useSlotsByDate` and `useAttendanceByDate`.
- **T4 — The date control scopes the tiles only.** The stats strip and « À régler » always read today's snapshot; « needs attention » only means something relative to now. When the tiles show another day, a second snapshot query runs for that day.
- **T5 — Quick actions open in place.** « Voir les participants » mounts the existing `BookingsSheet`; « Modifier le cours » mounts the existing `EditScheduleDialog`. Both live on the dashboard, pass `restoreFocusTo` (D12), and on close invalidate `getVenueTodayQueryKey(venueId)` (prefix) so the row leaves the list once fixed.
- **T6 — Capabilities load once per session.** A `CapabilitiesProvider` in the `(app)` layout runs `useGetCapabilities` with `staleTime: Infinity` and `retry: 1`. The plan changes only after re-login, which remounts the tree.
- **T7 — Fail open.** While capabilities load, on any error (including 403 `MFA_ENROLLMENT_REQUIRED`, which is SP-F's to handle), nothing renders locked and the plan row is hidden. The backend stays the enforcer; the toast (T9) explains a refusal. A slow or broken capabilities call must never lock staff out of the console.
- **T8 — The console keeps a display copy of the matrix** in `lib/capabilities.ts`, used only for labels (« Pro » / « Starter » tags, « Passer au plan … », the `/plan` table). Locking reads the server's `capabilities` array, never the local matrix. A unit test pins the local matrix to the backend's `capabilities_for` as of `origin/main`.
- **T9 — Error distinction at the gated call sites.** A new `toastApiError(err, { fallback, capability, action })` shows: `FEATURE_NOT_AVAILABLE` → dark upgrade toast « Passez au plan {plan} pour {action}. » with the « Voir les plans » action (owner/admin) ; other 403 → « Accès refusé. » ; anything else → the existing `apiErrorMessage(err, fallback)`. It replaces `toast.error(apiErrorMessage(...))` at the six gated call sites only (§6.5); other call sites are untouched.
- **T10 — Upgrade surfaces are owner/admin only.** The plan row, « Passer au plan … », « Comparer les plans », « Voir les plans » and `/plan` itself (nav-less route, `RequirePageAccess`-style role gate) are for `owner` and `admin`. Trainers and receptionists still see lock glyphs, locked pages (without the two buttons) and tooltips.
- **T11 — Locked controls stay focusable.** `aria-disabled="true"`, never `disabled`, so keyboard and screen-reader users reach the tooltip. Activating one (click, Enter, or a tap on touch where tooltips never open) shows the upgrade toast without calling the API.
- **T12 — « Passer au plan … » is a contact action.** It opens `mailto:${NEXT_PUBLIC_SALES_EMAIL}` with a prefilled subject « Passer au plan {plan} ». When the variable is unset, it links to `/plan` instead. « Comparer les plans », « Changer » and « Voir les plans » always link to `/plan`. No payment flow.
- **T13 — Mock mirrors the backend** (§8); the app never depends on a mock-only string.

## 3. Units

| File | Responsibility |
| --- | --- |
| `apps/owner/lib/today.ts` | Pure snapshot helpers: `attentionReason(slot) → AttentionReason \| null`, `tileState(slot) → TileState`, `pickTiles(slots, max = 4) → { tiles: TodaySlot[]; total: number }`, `attentionRows(snapshot) → TodaySlot[]` (flagged, start order), `addDays(dateKey, n) → string` |
| `apps/owner/lib/capabilities.ts` | `PLAN_ORDER`, `PLAN_CAPABILITIES` (display copy of the matrix), `minPlanFor(cap) → Plan`, `CONSOLE_CAPABILITIES` (the six rows of the locked-page list, §6.2), `planLabelKey(plan)` |
| `apps/owner/lib/plan-errors.ts` | `isFeatureNotAvailable(err)`, `isForbidden(err)` (403 and not `FEATURE_NOT_AVAILABLE`/`MFA_ENROLLMENT_REQUIRED`) |
| `apps/owner/lib/use-today-snapshot.ts` | `useTodaySnapshot(venueId, date)` (T3) |
| `apps/owner/components/capabilities/capabilities-provider.tsx` | Provider + `useCapabilities() → { status: 'loading' \| 'ready' \| 'unknown'; plan?: Plan; has(cap): boolean; isLocked(cap): boolean }`. `has` is true unless status is `ready` and the cap is missing; `isLocked` is its negation (T7) |
| `apps/owner/components/capabilities/locked-page.tsx` | `LockedPage({ capability, title })`, the `zCLZV` layout |
| `apps/owner/components/capabilities/locked-button.tsx` | `LockedButton({ capability, children, action, size?, variant? })`: lock icon + label, tooltip, T11 behaviour |
| `apps/owner/components/capabilities/plan-row.tsx` | Sidebar « Plan Starter · Changer » row, expanded and collapsed variants |
| `apps/owner/components/capabilities/toast-api-error.ts` | `toastApiError` (T9); needs `useTranslations`, so exported as a hook `useToastApiError()` returning the function |
| `apps/owner/app/(app)/plan/page.tsx` | `/plan` comparison page (§7) |
| `apps/owner/app/(app)/dashboard/today-tiles.tsx` | Rewritten on `TodaySlot` (§4.2) |
| `apps/owner/app/(app)/dashboard/day-control.tsx` | « Aujourd'hui / Demain / Choisir une date » (§4.3) |
| `apps/owner/app/(app)/dashboard/attention-list.tsx` | « À régler » rows, empty state, quick actions (§4.4) |

Types: `AttentionReason = 'no_instructor' | 'over_capacity' | 'no_arrivals' | 'unknown'`. `TileState = { tone: 'upcoming' | 'active' | 'completed' | 'cancelled'; badge: 'attention' | 'active' | 'completed' | 'cancelled' | null; reason: AttentionReason | null }`.

## 4. Dashboard (`s8LRy3`, `D2YWBH`, `r5BGk`)

### 4.1 Data and stats strip

`useDashboardData` drops `slots` and `attendance` and gains `today` (= `useTodaySnapshot(venueId, venueToday(timeZone))`). It keeps members, schedules, resources, check-ins and staff (the sheet, the edit dialog and the feed need them).

The KPI row reads `today.data.attendance`: « Passages aujourd'hui » = `total_check_ins`, « Membres uniques » = `unique_attendees` (now members + pass holders; the canvas label stays), « Occupation » = `Math.round(occupancy_pct) %`, still `null` (« — ») when `total_check_ins` is 0. « Membres actifs » is unchanged. The Accueil page's `DayStats` switches to the same snapshot hook (same key, so both screens share one cache entry and cannot disagree). `useRegisterCheckin` adds `getVenueTodayQueryKey(venueId)` to its invalidations so a check-in from the command bar updates the strip, tiles and list.

### 4.2 Tiles

Grid unchanged (`grid-cols-2 lg:grid-cols-4`, square `Tile`). Per tile, from `tileState`:

| Tone | Tile background | Badge (top right) |
| --- | --- | --- |
| upcoming | `bleu` | none, or « À régler » (`warning`) when flagged |
| active | `vert` | « En cours » (`success`), or « À régler » when flagged |
| completed | `bg-side` | « Terminée » (`default`) |
| cancelled | `bg-side` | « Annulée » (`default`) |

This replaces the positional tint rotation and the « full → sable » rule on this surface only: the canvas colours dashboard tiles by lifecycle (`s8LRy3`). Other tile surfaces keep the Tile Rule.

Content: time (`TileTime`, `start_local` formatted `HH:mm`, falling back to `formatTime(start_utc, timeZone)` when `start_local` is null), badge; bottom: title (`title ?? '—'`), meta « {resource_name ?? '—'} · {instructor_name ?? 'Aucun intervenant'} », then (not cancelled) a 4px bar (`Capacity hideCount`, booked/capacity) and the line « {n} arrivés · {n} inscrits · {n} places » 13px. A flagged tile with a known reason adds the reason line in `text-warning-foreground` with `CircleAlert` 14px (`s8LRy3` tile 3). A cancelled tile shows the meta and « Annulée » only.

`pickTiles`: slots sorted by `start_utc`. When more than `max`, the window starts one slot before the first slot that is neither `completed` nor `cancelled` (so one past session stays for context), clamped to `[0, total − max]`; if every slot is past, the last `max`. `total` counts every slot (cancelled included) for « Voir les {count} séances du jour → » (link to `/schedules`, unchanged).

Loading, error and empty states are unchanged (skeleton, `SectionError`, empty copy with « Créer un cours » for owner/admin). A 403 on the snapshot uses `SectionError` with the « Accès refusé » copy.

### 4.3 Date control

Under the tabs, inside the « Planning du jour » panel, above the tiles and the link: a pill row (`Tabs` look, `aria-label` « Jour affiché ») with « Aujourd'hui », « Demain », and « Choisir une date » (`CalendarDays` 16px). « Choisir une date » opens a `Popover` holding a native `<input type="date">` labelled « Date »; picking a day closes the popover, selects that pill and changes its label to the formatted day (« Lundi 22 septembre »). Days are venue-local keys; « Demain » = `addDays(today, 1)`. The selection is component state (resets on reload). The empty state for another day reads « Aucune séance ce jour-là. ».

### 4.4 « À régler » tab

Third tab trigger: « À régler ({count}) » when count > 0, « À régler » at 0. The count and list come from today's snapshot (`attentionRows`), never from the tiles' selected day. While the snapshot loads the trigger reads « À régler ».

List (`D2YWBH`): `max-w-[720px]` centered, hairline rows (`divide-y`), min height 64px (D13). Row: time 16px mono (`w-20`), then title 15/500 with « En cours » (`success`) when active, room below 13px muted; right side: reason badge (`warning`) and one outline small action. Reason copy: « Aucun intervenant », « Au-delà de la capacité · {booked}/{capacity} », « Personne n'est arrivé », `unknown` → « À régler ».

Action: `no_instructor` and the user can edit schedules (owner, admin) → « Modifier le cours » opens `EditScheduleDialog` for `schedule_id` (from the schedules query; if the schedule is not found the action falls back to « Voir les participants »). Every other row → « Voir les participants » opens `BookingsSheet` for the slot. Below `md` the row wraps: badge and action go to a second line, the action is 44px tall.

`BookingsSheet` narrows its `slot` prop to `Pick<ScheduleSlot, 'id' | 'booked_count' | 'capacity' | 'start_time' | 'end_time'>`; the dashboard maps `TodaySlot` (`slot_id → id`, `start_utc → start_time`, `end_utc → end_time`). Sheet props from the dashboard: `title`, `resourceName`, `dayLabel` = « Aujourd'hui », `members`, `canManageBookings` per the planning page's rule.

Empty (`r5BGk`): centered, icon chip 48px `bg-success` with `CircleCheck` in `text-success-foreground`, title « Rien à régler pour l'instant. », description « Les séances sans arrivée, au-delà de la capacité ou sans intervenant apparaîtront ici. », no button. Error: `SectionError`.

## 5. Capabilities data

`PLAN_CAPABILITIES` (pinned to `capabilities_for`):

| Plan | Capabilities |
| --- | --- |
| free | none |
| starter | `activity_pricing`, `qr_checkin`, `staff_accounts`, `member_self_service` |
| pro, enterprise | all seven |

`minPlanFor`: `activity_pricing`, `qr_checkin`, `staff_accounts`, `member_self_service` → starter; `multi_venue`, `analytics`, `member_qr` → pro. Plan labels: « Gratuit », « Starter », « Pro », « Entreprise ».

## 6. Locks

### 6.1 Where

| Capability | Surface | Treatment |
| --- | --- | --- |
| `staff_accounts` | nav « Équipe », `/staff` | nav lock glyph + compact tooltip; page body replaced by `LockedPage` |
| `activity_pricing` | nav « Offres », `/plans`; member detail « Attribuer une formule » | nav lock glyph; page body `LockedPage`; the member action becomes `LockedButton` |
| `multi_venue` | `/venues` « Ajouter un lieu », `/venues/new`, venue switcher « Ajouter un lieu » | when at least one venue exists: `LockedButton` on the page header, `LockedPage` on `/venues/new`, the switcher item shows a lock icon and the upgrade toast on select. The first venue is never locked |
| `qr_checkin` | check-in command bar QR mode (dashboard and Accueil), scanner pill | QR pill rendered locked (lock icon, tooltip, T11); default mode becomes `walkin` when locked; the scanner pill becomes `LockedButton` |
| `analytics`, `member_self_service`, `member_qr` | none in the console | listed in comparisons only |

Nav: `OwnerNavItem` gains optional `capability`; `navGroupsForRole` passes it through; the layout renders a trailing `Lock` 14px (muted) after the label with a `Tooltip` « Disponible avec le plan {plan} » (`p6hCM` compact variant, 192px, title only). The link stays navigable (the page shows `LockedPage`). Collapsed sidebar: the lock is omitted (the icon-only item keeps its existing tooltip).

### 6.2 Locked page (`zCLZV`)

Centered, `max-w-[440px]`, top padding as the canvas: icon chip 64px `bg-secondary` with `Lock` 24px; title (the page's own title, e.g. « Équipe ») 32/400; description « Disponible avec le plan {plan}. {benefit} » 15px muted; then a hairline list (`divide-y`, rows 38px, 15px) of `CONSOLE_CAPABILITIES` = `staff_accounts`, `multi_venue`, `analytics`, `activity_pricing`, `qr_checkin`, `member_self_service`: locked ones first (`Lock` 16px, `text-muted-foreground`, tag = `minPlanFor` label 12px right), then granted ones (`Check` 16px `text-success-foreground`, ink text, tag = `minPlanFor` label). Order inside each group follows `CONSOLE_CAPABILITIES`. Then (owner/admin) primary « Passer au plan {plan} » (T12) and ghost « Comparer les plans » (`/plan`); then 13px muted « Un changement de plan est visible après reconnexion. ». `{plan}` is `minPlanFor(capability)`.

Benefit copy per capability: `staff_accounts` « Invitez des administrateurs, des coachs et des réceptionnistes, chacun avec son propre accès. » ; `multi_venue` « Gérez plusieurs établissements depuis la même console. » ; `activity_pricing` « Créez des offres par activité et attribuez-les à vos membres. » ; `qr_checkin` « Enregistrez les arrivées en scannant le QR du membre. ».

### 6.3 Locked button and tooltip (`p6hCM`)

`LockedButton`: the original button's variant and size, `Lock` 16px replacing its icon, `text-muted-foreground`, `aria-disabled`. Tooltip (280px, dark per the canvas): title « Disponible avec le plan {plan} » 13/500, description = the capability's benefit copy 13px. Activation → upgrade toast (T11).

### 6.4 Plan row

In `navFooter`, above the venue switcher (owner/admin, capabilities `ready`): 36px row, `Sparkles` 16px muted, « Plan {label} » 13px muted, and a right-aligned link « Changer » 13/500 to `/plan`. Collapsed (`navFooterCollapsed`): the `Sparkles` icon as a 44px link to `/plan` with tooltip « Plan {label} ». Hidden for other roles and while `loading`/`unknown`.

### 6.5 Toasts

`useToastApiError()(err, { fallback, capability, action })` at: staff invite (`action` « inviter un membre de l'équipe »), venue create (« ajouter un établissement »), offer create (« créer une offre »), subscription assign (« attribuer une formule »), QR check-in and walk-in QR (« enregistrer une arrivée par QR »). Upgrade toast: sonner `toast(message, { action: { label: 'Voir les plans', onClick: → router.push('/plan') } })` for owner/admin, no action for other roles, `Lock` icon; `{plan}` = `minPlanFor(capability)`; `action` is the translated `capabilities.action.*` phrase. Plain 403: `toast.error('Accès refusé.')` plus the `ref:` suffix when a request id exists. The dark toast styling is the existing sonner theme; no new toast primitive.

## 7. `/plan` page

Route `app/(app)/plan/page.tsx`, not in the nav, owner/admin only (others get the existing no-access notice). `WorkingPage` header: title « Plan », description « Vous êtes sur le plan {label}. ». Body: a table-free hairline grid, `max-w-[720px]`: header row with the four columns « Gratuit », « Starter », « Pro » (Pro stands for Pro and Entreprise; the column header reads « Pro » and, when the tenant is on enterprise, the pill reads « Entreprise »), the current plan's header wearing a grey pill « Votre plan »; one row per capability (all seven, labels §10) with `Check` (`text-success-foreground`, `aria-label` « Inclus ») or `Minus` (muted, `aria-label` « Non inclus ») per column. Below `md` the grid becomes one block per plan (title + included list). Footer: « Nous contacter » (primary, T12 mailto, hidden when unset) and the re-login note. Loading: skeleton rows; capabilities `unknown`: description « Plan indisponible pour le moment. » and no pill.

## 8. Mock server

- `GET /gms/v1/venues/:id/today?date=` → `TodaySnapshot` built from the seeded slots of that venue-local date (UTC offsets as today's seed): lifecycle from `now` (`cancelled` if status cancelled; `completed` if end ≤ now; `active` if start ≤ now < end; else `upcoming`), `checked_in_count` from check-ins with that slot id, `instructor_*` from the schedule, `resource_name`, `title`, `start_local`/`end_local` in the venue timezone, `needs_attention` per T2's rules (cancelled never), `attendance` from the day's check-ins (unique over member ids and pass ids; occupancy = check-ins ÷ capacity of non-cancelled slots × 100), `buckets`, `needs_attention` ids. `400 VALIDATION_ERROR` on a malformed date. Seed changes so today shows all three reasons: one active slot with zero check-ins, one slot overbooked (booked 20 / capacity 18), one slot with bookings on a schedule without instructor.
- `GET /gms/v1/capabilities` → `{ plan: MOCK_PLAN ?? 'pro', capabilities: capabilities_for(plan) }`.
- The six gated routes (`POST /staff/invite`, `POST /venues` when the tenant already has a venue, `POST /venues/:id/plans`, `POST /members/:mid/subscriptions`, `POST /checkins/qr`, `POST /checkins/walkin/qr`) answer `403 { error: { code: 'FEATURE_NOT_AVAILABLE', message: 'Feature not available: <cap>' } }` when `MOCK_PLAN` lacks the capability.
- `MOCK_PLAN` is read once at start (`MOCK_PLAN=starter pnpm --filter @iziwellpass/owner dev:mock`).

## 9. Errors

| Case | Result |
| --- | --- |
| Snapshot 403 | `SectionError` « Accès refusé. » in the tiles and list; strip « — » |
| Snapshot other error | `SectionError` with `errors.today` fallback |
| Capabilities error / 403 | fail open (T7), no plan row |
| Gated mutation 403 `FEATURE_NOT_AVAILABLE` | upgrade toast (§6.5) |
| Gated mutation plain 403 | « Accès refusé. » |
| Date input cleared | selection unchanged |

## 10. Messages (fr, en mirrored)

New keys (fr shown; en in plain English, same ICU shapes):

- `dashboard.tabs.attention` « À régler », `dashboard.tabs.attentionCount` « À régler ({count}) »
- `dashboard.day.label` « Jour affiché », `.today` « Aujourd'hui », `.tomorrow` « Demain », `.pick` « Choisir une date », `.input` « Date », `.emptyOther` « Aucune séance ce jour-là. »
- `dashboard.tile.completed` « Terminée », `.active` « En cours », `.attention` « À régler », `.cancelled` « Annulée », `.noInstructor` « Aucun intervenant », `.stats` « {arrived} arrivés · {booked} inscrits · {capacity} places »
- `dashboard.attention.reason.no_instructor` « Aucun intervenant », `.over_capacity` « Au-delà de la capacité · {booked}/{capacity} », `.no_arrivals` « Personne n'est arrivé », `.unknown` « À régler »; `dashboard.attention.seeRoster` « Voir les participants », `.editCourse` « Modifier le cours », `.emptyTitle` « Rien à régler pour l'instant. », `.emptyBody` « Les séances sans arrivée, au-delà de la capacité ou sans intervenant apparaîtront ici. »
- `dashboard.errors.today` « Impossible de charger la journée. »
- `capabilities.plan.free` « Gratuit », `.starter` « Starter », `.pro` « Pro », `.enterprise` « Entreprise »
- `capabilities.cap.activity_pricing` « Tarification par activité », `.qr_checkin` « Entrée par QR », `.staff_accounts` « Comptes équipe », `.multi_venue` « Plusieurs établissements », `.analytics` « Statistiques », `.member_self_service` « Espace membre », `.member_qr` « QR membre »
- `capabilities.benefit.*` (four, §6.2)
- `capabilities.locked.availableWith` « Disponible avec le plan {plan} », `.description` « Disponible avec le plan {plan}. {benefit} », `.upgrade` « Passer au plan {plan} », `.compare` « Comparer les plans », `.relogin` « Un changement de plan est visible après reconnexion. »
- `capabilities.row.plan` « Plan {plan} », `.change` « Changer »
- `capabilities.toast.upgrade` « Passez au plan {plan} pour {action}. », `.seePlans` « Voir les plans », `.forbidden` « Accès refusé. », `capabilities.action.*` (six, §6.5)
- `capabilities.page.title` « Plan », `.current` « Vous êtes sur le plan {plan}. », `.yours` « Votre plan », `.included` « Inclus », `.notIncluded` « Non inclus », `.contact` « Nous contacter », `.unknown` « Plan indisponible pour le moment. », `.mailSubject` « Passer au plan {plan} »

## 11. Testing

- Node tests: `lib/today.ts` (reason priority incl. cancelled and `unknown`, tile states for every lifecycle × flag, `pickTiles` windowing incl. all-past and fewer than max, `addDays` across month ends), `lib/capabilities.ts` (matrix pinned, `minPlanFor` for all seven), `lib/plan-errors.ts`, `lib/nav.ts` (capability passthrough).
- Component tests where the repo already has them for the primitive in question (none required for new app components beyond the existing pattern).
- Gates: `pnpm check:design && pnpm typecheck && pnpm lint && pnpm test`, fr/en parity.
- CDP drive (mock, `MOCK_PLAN` default): dashboard tiles show « Terminée », « En cours », « À régler » + reason, a plain upcoming tile; « Demain » and a picked date swap the tiles and leave the strip; « À régler (3) » lists the three reasons; « Voir les participants » opens the sheet in place, « Modifier le cours » opens the dialog, closing refetches; empty tab after fixing all three. `MOCK_PLAN=free`: « Équipe » and « Offres » locked in the nav and pages, QR mode locked, toast on a forced gated call. `MOCK_PLAN=starter`: « Ajouter un lieu » locked with tooltip, switcher item locked, `/venues/new` locked, plan row « Plan Starter », `/plan` marks Starter. Receptionist: no plan row, no upgrade buttons. Phone width (390px): attention rows wrap, 44px actions.

## 12. Out of scope

- Payment or self-serve plan change; `PATCH /platform/v1/admin/tenants/{id}/plan` is admin-app territory.
- MFA (`MFA_ENROLLMENT_REQUIRED` routing) — SP-F.
- Metrics/analytics screens (`GET /venues/{vid}/metrics`).
- Member-app capabilities (`member_self_service`, `member_qr`).
- Deep links from the dashboard into Planning.
- A calendar widget; the native date input is the picker.
