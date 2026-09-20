# « Le comptoir clair » SP-B — hub screens (owner)

**Date:** 2026-09-20
**Status:** approved design, ready for a plan
**Builds on:** `docs/superpowers/specs/2026-09-20-comptoir-clair-design-system-design.md` (SP-A, merged at 1a602fe)
**Canvas frames (source of truth, `screens.pen`):** `ssgpT` Tableau de bord, `r8d6IC` Tableau de bord · Premier démarrage, `jhjgK` Accueil · QR / code, `NKvSc` Accueil · Sans réservation + confirmation, `oHqxA` Accueil · Mobile, `T9KwQ` Auth · Connexion, `ZllMy` Auth · Nouveau mot de passe, `JCot2` Auth · Créer un compte, `QD9fi` Auth · E-mail envoyé, `tZ9zj` Onboarding · Créer mon établissement. PNG exports at `docs/design-refs/comptoir-clair/<frameId>.png`.

## 1. Purpose

SP-A gave the apps the tokens, primitives and shell. The owner app's hub screens still use the SP1 composition: cards, two-column grids, a left-aligned 32px title. SP-B rebuilds the four hub families exactly as drawn: one light centred heading over the command bar, a stat strip, pill tabs, tinted tiles, a hairline feed, and the lavis wash. Working screens (planning, members, offers, venues, team) are SP-C.

## 2. Decisions

- **D1 — « À régler » is out.** The dashboard shows two pills (« Planning du jour », « Derniers passages »). The third pill returns with real data in SP-C.
- **D2 — One check-in control for both hubs.** The dashboard's command bar is the front desk's: it registers the passage in place and the feed and stats refresh. No redirect.
- **D3 — Owner only.** Nothing user-facing under `apps/admin` changes, except the `/design` registry, which must list every ui primitive: it gains `hub-page` and `wash` entries with minimal specimens.
- **D4 — Structure.** Hub primitives (`Wash`, `HubPage` family) live in `packages/ui`; the check-in logic, command, modes and feed live in one owner module `apps/owner/components/checkin/`. Pages are rebuilt on those pieces. No route-group layout.
- **D5 — One type-scale addition.** `text-display-sm` (36px) for auth and onboarding titles; the canvas draws them at 36 and the scale has no step between 32 and 44.
- **D6 — Auth column width is 400 for every auth state**, including « E-mail envoyé » (drawn at 440). Onboarding is 620.
- **D7 — Honest placeholders.** The canvas writes « Scanner un QR ou rechercher un membre » on the bar in QR mode. In QR mode typing a name does nothing, so the copy is « Scanner un QR ou saisir un code » (QR) and « Rechercher un membre » (walk-in). Mobile QR keeps the canvas « Scanner ou saisir ».
- **D8 — Cancelled tiles take côté.** DESIGN.md reserves `#fafafa` for disabled or archived tiles; a cancelled session is one.

## 3. Hub primitives (`packages/ui`)

### 3.1 `Wash` — `packages/ui/src/components/wash.tsx`

The one sanctioned gradient. Renders `<div aria-hidden data-slot="wash">` with:

- `pointer-events-none absolute left-1/2 top-[-260px] hidden h-[640px] w-[800px] -translate-x-1/2 md:block`
- `style={{ background: 'radial-gradient(closest-side, var(--wash), transparent)' }}`

Geometry is the canvas `Wash` node (800×640, top −260, centred on the column). Hidden below `md`: the mobile frames carry no wash. The word `gradient` appears in this file only (see §9).

### 3.2 `HubPage` family — `packages/ui/src/components/hub-page.tsx`

| Export                                    | Element and classes                                                                | Notes                                                                                                                                                      |
| ----------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HubPage({ wash?, className, children })` | `div.relative.mx-auto.flex.w-full.max-w-[940px].flex-col.gap-6.md:gap-12.md:pt-10` | Sits inside the shell's `main` (`p-6`), so 24 + 40 = the drawn 64px top. Renders `<Wash />` first when `wash` is true, then children in a `relative` flow. |
| `HubHero`                                 | `div.flex.flex-col.items-center.gap-3.text-center.md:gap-5`                        | Eyebrow, title, lead or bar. Canvas gap 20 desktop, 12 mobile.                                                                                             |
| `HubEyebrow`                              | `p.text-sm.text-muted-foreground.md:text-md`                                       | 13 mobile, 14 desktop.                                                                                                                                     |
| `HubTitle`                                | `h1.text-2xl.font-normal.md:text-3xl`                                              | 32 mobile, 44 desktop (Display). One per screen.                                                                                                           |
| `HubLead`                                 | `p.max-w-[36rem].text-lg.text-muted-foreground`                                    | 16, atténué.                                                                                                                                               |
| `HubSection({ className, children })`     | `div.flex.flex-col.items-center.gap-4`                                             | A centred block: the stat strip, the tab row, the feed.                                                                                                    |

Tests (`hub-page.test.tsx`, jsdom): `HubPage` renders no `[data-slot=wash]` by default and one when `wash` is set; `HubTitle` renders an `h1`.

### 3.3 Token — `packages/ui/src/styles/globals.css`

Add to `@theme inline`:

```css
--text-display-sm: 2.25rem;
--text-display-sm--line-height: 1.15;
--text-display-sm--letter-spacing: -0.025em;
```

`tokens.test.ts` gains the step. DESIGN.md §3 Hierarchy gains « **Auth title** (400, 2.25rem, 1.15, −0.025em): the question on an auth or onboarding screen. » DESIGN.json mirrors it.

### 3.4 `Tile` — unchanged API

The starter uses `Tile aspect="tall" className="p-6"`; session tiles use the default square. A full session passes `tint="sable"`; a cancelled one passes `className="bg-side"` (tailwind-merge drops the rotated tint).

## 4. Check-in module (`apps/owner/components/checkin/`)

### 4.1 Pure helpers (`apps/owner/lib/`, node tests)

- `checkin-errors.ts`: `qrErrorMessage(t, err, decoded, venueId)` and `walkinErrorFallback(t, err)` moved verbatim from the register panel. Test: token rejection + expired token → expired copy; 403 → generic; pass token with foreign venue → generic; walk-in 409 → duplicate copy.
- `member-search.ts`: `searchMembers(members, query, limit = 8): Member[]`. Case- and diacritic-insensitive (`normalize('NFD')`, strip marks) match on the start of any word of `first_name last_name`; empty query returns `[]`; result order is the input order. `memberLabel(member, statusLabel)` → `"Awa Ndiaye · actif"`. Tests: « ai » matches Aïssatou; « nd » matches Ndiaye and Ndour; limit respected; empty query empty.
- `today-tiles.ts`: `pickTodayTiles(slots, timeZone, max = 4): { tiles: ScheduleSlot[]; total: number }`. Filters to the venue-local day (existing `venueDateKey`), sorts by `start_time`, takes the first `max`. `tileTint(slot, index): TintName | 'side'` → `'side'` when `status === 'cancelled'`, `'sable'` when `status === 'full'` or `booked_count >= capacity`, else `tintForIndex(index)`. Tests: order, cap at four with `total` = all, full → sable, cancelled → side, other → rotation.
- `checkin-feed.ts`: `feedRows(checkIns, limit?)` sorts newest first and slices; `recordedByLabel(checkIn, staffByUserId, t)` returns the staff name, the unknown-staff label, or the self label. Tests for each branch.

### 4.2 `useRegisterCheckin` — `components/checkin/use-register-checkin.ts`

```ts
export function useRegisterCheckin(args: { venueId: string; memberById: Map<string, Member> }): {
  submitToken: (token: string, onSuccess?: () => void) => void;
  submitWalkin: (memberId: string, onSuccess?: () => void) => void;
  isPending: boolean;
};
```

Lifted from the register panel without behaviour change: token routing (`decodeQrToken` → `checkinRouteFor` → pass / walk-in QR / booking mutation), in-flight guard, success toast with the member's name or the pass-visitor label, invalidation of the check-in and attendance keys for the venue the server resolved, error toasts via the helpers in §4.1. There is no react-hook-form any more: a 422 on the token is toasted with its message.

### 4.3 `CheckinFeed` — `components/checkin/checkin-feed.tsx`

```ts
interface CheckinFeedProps {
  checkIns: QueryLike<CheckIn[]>;
  members: QueryLike<Member[]>;
  staff: QueryLike<Staff[]>;
  timeZone: string | undefined;
  title?: string; // 22/500 heading; omitted under the dashboard tab
  live?: boolean; // « En direct » success badge with a dot, right of the title
  limit?: number; // dashboard passes 8
}
```

- Width: `w-full max-w-[45rem]` centred (the canvas feed is 720).
- Head: `flex items-center justify-between` — `h2.text-lg.font-medium.md:text-xl` and, when `live`, `<Badge variant="success"><span class="size-1.5 rounded-full bg-current" /> En direct</Badge>`.
- Rows: 60px (`py-3`, hairline `border-t` between rows, none on the first): `Avatar` (default 36px) with `AvatarFallback tint={index}`; name `text-base font-semibold truncate`; meta `text-sm text-muted-foreground truncate` = « par Aïssatou Ba » for manual, « Auto (QR) » for QR; `Badge variant="info"` « QR » or `variant="default"` « Manuel »; time `font-numeric text-sm font-medium text-muted-foreground`.
- The one-shot `animate-checkin-arrive` flash on a genuinely new top row is kept.
- Loading: three `h-[60px]` skeleton rows. Error: destructive Alert with the load-error copy. Empty: one sentence `text-base text-muted-foreground text-center py-6` (« Aucun passage pour le moment. »). No Empty/EmptyMedia illustration on a hub.
- Copy comes from the `frontdesk.feed` namespace on both hubs; the dashboard's `checkins.method*` and `checkins.empty` keys are removed.

### 4.4 `CheckinModes` — `components/checkin/checkin-modes.tsx`

```ts
interface CheckinModesProps {
  mode: 'qr' | 'walkin';
  onModeChange: (mode: 'qr' | 'walkin') => void;
  onScan?: (token: string) => void; // camera button rendered only when given
  disabled?: boolean;
}
```

A centred row: `Tabs value={mode}` with two `TabsTrigger`s (« QR / code », « Sans réservation »), `aria-label` « Mode d'enregistrement », plus — desktop only (`hidden md:inline-flex`) — the existing `QrScannerDialog` whose trigger is restyled to match an inactive pill (`h-10 rounded-full px-[18px] text-base text-muted-foreground`, ghost). A detected token calls `onScan`.

### 4.5 `CheckinCommand` — `components/checkin/checkin-command.tsx`

```ts
interface CheckinCommandProps {
  mode: 'qr' | 'walkin';
  onModeChange: (mode: 'qr' | 'walkin') => void;
  members: Member[];
  register: ReturnType<typeof useRegisterCheckin>;
  statusLabel: (status: MembershipStatus) => string;
}
```

Wraps the SP-A `CommandBar`:

- **QR mode.** Icon `QrCode`; placeholder « Scanner un QR ou saisir un code » (`md:` and up) and « Scanner ou saisir » below (two placeholders switched with a `matchMedia('(min-width: 768px)')` hook, `useIsDesktop`, added to `apps/owner/lib/`); `inputProps` `autoComplete="off" autoCapitalize="none" spellCheck={false}`; focus on mount and after every success (scan-ready); submit → `register.submitToken(value, clear)`. Empty submit is ignored.
- **Walk-in mode.** Icon `UserSearch`; placeholder « Rechercher un membre ». The input is a type-ahead: `searchMembers(members, query)` feeds a `Popover` (SP-A côté surface, no border) anchored under the bar (`PopoverAnchor` on the form, `PopoverContent` `w-[var(--radix-popover-trigger-width)]`, `onOpenAutoFocus` prevented so the input keeps focus). Options are 48px rows: `Avatar` 28 + name + `text-muted-foreground` status label. ARIA: input `role="combobox" aria-expanded aria-controls aria-activedescendant`; list `role="listbox"`, rows `role="option" aria-selected`. Keys: ArrowDown/ArrowUp move, Enter selects the active option (or submits when a member is already selected), Escape closes. Selecting sets the input to `memberLabel(member, statusLabel(member.membership_status))` and holds the id; any further edit clears the id. Submit → `register.submitWalkin(id, clear)`; submit with no id re-opens the list. Empty results show one row « Aucun membre ».
- **Mode selector.** `mode` slot = `DropdownMenu` whose trigger is a ghost 36px pill « Accueil ▾ » (QR) or « Sans réservation ▾ » (walk-in) with a `ChevronDown`, `hidden md:inline-flex`; the menu lists the two modes with a check on the current one. Below `md` the pills row is the only switch.
- The whole bar is `disabled` while `register.isPending` (input `readOnly`, submit disabled).

Switching mode clears the input and the selected member.

## 5. Dashboard — `apps/owner/app/(app)/page.tsx` + `dashboard/`

### 5.1 Data

`useDashboardData` gains `staff: useListStaff(...)` (for « par … » in the feed) and keeps attendance, members, slots, schedules, resources, checkIns.

### 5.2 Layout (venue selected, not first run)

```
HubPage wash
  HubHero
    HubEyebrow   « {date} · {venue name} »       dashboard.eyebrow
    HubTitle     « Bonjour, Moussa » / « Bonjour »
    CheckinCommand (QR default; dropdown to switch)
  HubSection     KpiRow (existing StatPanel, four stats), centred
  HubSection
    Tabs (centred TabsList): « Planning du jour » | « Derniers passages »
    TabsContent schedule → TodayTiles
    TabsContent checkins → CheckinFeed limit=8, no title, live=false
```

The tab state is local (`useState<'schedule' | 'checkins'>('schedule')`).

### 5.3 `TodayTiles` — `dashboard/today-tiles.tsx` (replaces `today-schedule.tsx`)

- `pickTodayTiles(slots.data, timeZone)` → up to four `Tile`s in `grid grid-cols-2 gap-4 md:grid-cols-4` (canvas: 4 × 223 + 3 × 16 = 940).
- Tile content: `TileTop` with `TileTime` (`formatTime(start_time)`) and `TileCount` (« 14/18 » as `booked_count/capacity`; a cancelled tile shows no count); bottom `TileTitle` (schedule title) and `TileMeta` = resource name, then « · » + instructor name when `instructor_staff_id` resolves in the staff list, then « · Complet » when full, or « Annulé » alone when cancelled.
- Tint: `tileTint(slot, index)`; `'side'` becomes `className="bg-side"`.
- Below the grid, centred: `Link` to `/schedules` — `text-md font-medium text-muted-foreground` with a trailing `ArrowRight` 16px — labelled with the ICU plural `dashboard.schedule.seeAll` (« Voir la séance du jour » / « Voir les # séances du jour »), rendered whenever `total > 0`.
- Loading: four square skeletons in the same grid. Error: `SectionError`. Empty: the existing sentence pair (`schedule.emptyTitle` as `text-base`, `schedule.emptyBody` in atténué) centred, and for owner/admin a `Button variant="secondary"` « Créer un planning » linking to `/schedules`. No `Empty` illustration.

### 5.4 First run — `dashboard/starter.tsx`

Shown when the venue has no schedules and no members (rule unchanged). No command bar, as drawn.

```
HubPage wash
  HubHero
    HubEyebrow  « {date} · {venue} »
    HubTitle    « Bienvenue, Moussa » / « Bienvenue »
    HubLead     « Trois étapes pour démarrer. Chacune prend moins d'une minute. »
  grid grid-cols-1 gap-4 md:grid-cols-3
    Tile aspect="tall" tint={i} className="p-6 gap-4"   (canvas 303×240, r 24, pad 24)
      TileTop: <span font-numeric text-xl font-medium>1</span> · icon 20px text-muted-strong
      TileTitle « Créer un planning »  (text-lg font-semibold)
      TileMeta  « Définissez vos cours et vos créneaux. » (text-md text-muted-strong)
      Button variant="ghost" size="sm" className="mt-auto self-start bg-card hover:bg-side" → « Créer un cours » / « Ajouter » / « Ouvrir l'accueil »
  HubSection  KpiRow with zeros; occupancy shows « — » when attendance has no data
  p.text-md.text-muted-foreground.text-center « Le planning du jour et les derniers passages apparaîtront ici. »
```

A role that cannot access the step's route (`canAccessPath`) gets the tile without the button.

### 5.5 Other states

Loading: the hero skeleton (eyebrow 14×160, title 44×320, a 60px bar 720 wide), a strip of four stat skeletons, four square tiles. No venue / pick a venue / venues error: the existing copy, centred inside `HubPage`. All wrapped in `HubPage wash`.

### 5.6 Deleted

`dashboard/today-schedule.tsx`, `dashboard/recent-checkins.tsx`. `kpi-row.tsx`, `section-error.tsx`, `use-dashboard-data.ts` stay.

## 6. Front desk — `apps/owner/app/(app)/checkins/page.tsx`

### 6.1 Layout

```
RequirePageAccess href="/checkins"
HubPage wash
  HubHero
    HubEyebrow  « Accueil · {date} »
    HubTitle    « Qui entre ? »  |  « Qui entre sans réservation ? » in walk-in mode
    CheckinCommand
    CheckinModes (with the camera button → register.submitToken)
    p.max-w-[35rem].text-md.text-muted-foreground.text-center  = hint per mode
  HubSection  StatPanel with three Stats: Passages · Membres uniques (« Uniques » below md) · Occupation
  CheckinFeed title=« Derniers passages » live
```

Mode state is local to the page (`useState<'qr' | 'walkin'>('qr')`) and shared by the command, the modes row, the title and the hint.

### 6.2 Copy (frontdesk namespace)

- `question` « Qui entre ? », `questionWalkin` « Qui entre sans réservation ? »
- `command.placeholderQr` « Scanner un QR ou saisir un code », `command.placeholderQrShort` « Scanner ou saisir », `command.placeholderWalkin` « Rechercher un membre », `command.submit` « Valider », `command.modeQr` « Accueil », `command.modeWalkin` « Sans réservation », `command.modeMenuLabel` « Mode d'enregistrement »
- `qr.hint` becomes « Présentez le QR au lecteur ou saisissez le jeton. Réservations, entrées libres et pass marketplace sont acceptés. »
- `walkin.hint` becomes « Choisissez un membre présent, puis validez l'entrée. »; `walkin.noMembers` « Aucun membre » stays
- `feed.live` « En direct »; `stats.uniqueMembersShort` « Uniques »
- Removed: `register.title`, `register.tabsLabel` (→ `command.modeMenuLabel`), `qr.label`, `qr.placeholder`, `qr.submit`, `qr.submitting`, `walkin.member`, `walkin.memberPlaceholder`, `walkin.memberSearch`, `walkin.submit`, `walkin.submitting`, `validation.*`, `subtitle`.

Member status labels for the type-ahead come from the existing `members.status.*` keys (`active` « Actif », `expired` « Expiré », `suspended` « Suspendu », `cancelled` « Annulé »).

### 6.3 Mobile (below `md`)

The SP-A shell already draws the 56px bar with the venue switcher and avatar. On this page: 32px title, 13px eyebrow, the bar at 56px without the dropdown, the two pills, three stats with the short label, the feed with an 18px heading. `useIsDesktop` also drives the short stat label.

### 6.4 Deleted

`checkins/register-panel.tsx`, `checkins/day-stats.tsx`, `checkins/recent-checkins.tsx`. `qr-scanner-dialog.tsx` and `use-frontdesk-data.ts` stay.

## 7. Auth — `apps/owner/app/(auth)/`

### 7.1 Layout — `(auth)/layout.tsx`

```
div.relative.flex.min-h-screen.flex-col.items-center.justify-center.overflow-hidden.px-4.py-10
  Wash                       (top of the viewport, centred)
  div.relative.flex.w-full.max-w-[400px].flex-col.items-center.gap-10
    Wordmark
    {children}
    p.text-center.text-sm.text-muted-foreground  « Besoin d'aide ? … »
```

`overflow-hidden` on the outer box keeps the wash from adding a scrollbar. The wordmark moves here from `AuthCard`.

### 7.2 `AuthCard` — `apps/owner/components/auth-card.tsx`

```ts
{ title: string; subtitle?: string; media?: ReactNode; children: ReactNode; footer?: ReactNode }
```

`div.flex.w-full.flex-col.gap-7` → optional `media` (a 56px circle `bg-tint-bleu` with a 22px ink icon, centred), head `flex flex-col items-center gap-2.5 text-center` with `h1.text-display-sm.font-normal` and `p.text-base.text-muted-foreground`, body, then `footer` as `div.text-center.text-md.text-muted-foreground` (the inline link is `font-medium text-foreground`). `auth-card-skeleton.tsx` mirrors the centred head (title 36×240, subtitle 15×300, three 48px rows, a 44px pill).

### 7.3 Screens

- **Login.** `login.title` → « Bon retour ». Form `grid gap-[18px]`. The onboarded notice is `<Alert variant="success"><CircleCheck /><AlertDescription>…</AlertDescription></Alert>`. Fields keep 48px (SP-A default; drop the `h-11` overrides). Forgot-password stays a disabled control with the « Bientôt disponible » tooltip, right-aligned. Root error stays `text-destructive-foreground`. Submit 44px full width.
- **New password.** Same card. `PasswordChecklist` rows use `CircleCheck` (`text-success-foreground`) when satisfied and `Circle` (`text-muted-foreground`) otherwise, `text-base`. Back: `Button variant="ghost"` full width with a leading `ArrowLeft` « Retour à la connexion ».
- **Signup.** `signup.subtitle` → « Vous recevrez un mot de passe provisoire par e-mail. » Two-column names, e-mail, submit, footer link row. **Sent state:** `media={<Mail />}`, title « Vérifiez votre boîte mail », `signup.sentBody` → « Si un compte peut être créé pour {email}, un e-mail avec un mot de passe provisoire vient d'être envoyé. », one dark `Button asChild` « Se connecter », same footer.

## 8. Onboarding — `apps/owner/app/(onboarding)/`

Layout: as §7.1 with `max-w-[620px]`, no help footer (the canvas has none). Page: drop the `Card`; render `AuthCard title subtitle` with the form as children. Form grid: `grid gap-y-[18px] gap-x-4 sm:grid-cols-2`, address and submit `sm:col-span-2`, helper `text-sm text-muted-foreground text-center` under the button. Loading shell: three 48px skeleton rows inside a 620px column.

## 9. Guard and tests

- `scripts/check-design-system.mjs`: a third list `excludedPatterns = [{ pattern: 'gradient', exclude: 'wash.tsx' }]` swept with `grep -rn -F -e <pattern> --exclude=<file>`; same exit-code handling as the other sweeps. So `gradient` is forbidden everywhere except the wash.
- `packages/ui`: `hub-page.test.tsx`, `wash.test.tsx` (renders `aria-hidden`, class list contains `md:block`), `tokens.test.ts` step check.
- `apps/owner/lib`: tests listed in §4.1. The owner vitest config only runs `lib/**/*.test.ts` in node; hooks and components are not unit-tested there and are covered by review and screenshots.
- Both message files (`fr.json`, `en.json`) change together; a key present in one and not the other is a defect.

## 10. Verification

- `pnpm check:design && pnpm build && pnpm typecheck && pnpm lint && pnpm test` green (never build while a dev server of the same checkout runs).
- Headless Chrome screenshots at 1440×900 (and 390×844 for the front desk) against the mock API on a free port with `NEXT_PUBLIC_AUTH_MOCK=1`: login, login with `?onboarded=1`, signup and its sent state, onboarding, dashboard, first-run dashboard, front desk QR and walk-in modes, front desk mobile. Compare against the PNGs in `docs/design-refs/comptoir-clair/`. If the mock session cannot reach the authenticated pages, say so and the reviewer covers them from code.

## 11. Out of scope

« À régler »; the admin app; the member app; working screens (SP-C); a real forgot-password flow; richer `/design` hub specimens (parked with the `/design` chrome; the registry entries and minimal specimens land in SP-B); the shell (unchanged).

## 12. Task shape (for the plan)

1. ui: token, `Wash`, `HubPage` family, tests, guard exclusion, DESIGN.md/json rows.
2. owner lib helpers and their tests; both message files (all key additions, changes and removals in one pass).
3. `useRegisterCheckin` + `CheckinFeed`.
4. `CheckinCommand` (type-ahead, mode menu) + `CheckinModes`.
5. Front desk page rebuild and deletions.
6. Dashboard rebuild (`TodayTiles`, `Starter`, page) and deletions.
7. Auth layout, `AuthCard`, skeleton, login, new password, signup, checklist icons.
8. Onboarding, then screenshots and the full gate.
