# « Le comptoir clair » — SP-A: design system code (tokens, primitives, shell)

**Date:** 2026-09-20
**Status:** approved in brainstorming, awaiting user review of this document
**Register:** product (owner and admin web apps)
**Source of truth:** `screens.pen` (canvas, top-level frame `IziWellPass · Plat` = components sheet; 33 owner screens) and the regenerated `DESIGN.md` / `DESIGN.json` / `PRODUCT.md` at the repo root. PNG exports of the sheet and reference screens live in `docs/design-refs/comptoir-clair/` for reviewers.

## 1. Goal

Migrate the shared UI package and the two Next apps from « Le studio documentaire » (merged 2026-09-20 at `4aebb71`) to « Le comptoir clair »: white page, `#fafafa` side column, near-black ink as the only dark control (one per screen), grey pills for every active state, five pastel tints for glanceable tiles, hairlines between rows and never boxes, Inter at 400/500 headings, sentence case only, tabular numerals, zero elevation.

SP-A delivers the **system**, not the screens: tokens, every primitive re-skinned with unchanged props, three new primitives, the side-column shell, both apps wired and swept so they compile and render flat. Hub screens (SP-B: dashboard, accueil, auth, onboarding) and working screens (SP-C: planning, members, offers, venues, team) are rebuilt to the canvas layouts in later sub-projects. The member Expo app is out of scope.

## 2. Decisions taken in brainstorming

| # | Decision | Ruling |
|---|---|---|
| D1 | Docs vs code | The uncommitted `DESIGN.md` / `DESIGN.json` / `PRODUCT.md` / `AGENTS.md` rewrites already match the canvas variables; they are committed as-is with two fixes (textarea radius 1.25rem; Neutre and Outline badges documented). SP-A regenerates the code. |
| D2 | Split | SP-A system → SP-B hubs → SP-C working screens. Admin inherits SP-A through `packages/ui`. |
| D3 | Shell | No desktop top bar. 260px side column with wordmark, pill nav, venue switcher and user menu pinned at the bottom. Mobile keeps a 56px top bar and a 300px drawer over the scrim. |
| D4 | Cards | `Card` becomes a flat section (no border, background, radius, shadow); `CardTitle` is the 22/500 section heading. Grouping looks loose on unrebuilt screens until SP-B/C; accepted. |
| D5 | Approach | Re-skin in place, same component API. Canvas exports are a visual reference only. |
| D6 | Borders: canvas fidelity | A border exists in code only where the canvas draws one: the command bar, Input/Select/Textarea, outline button and outline badge, the venue switcher, the unchecked checkbox, and the 1px hairline between rows. Nothing else gets a border, and nothing gets a shadow (no node on the canvas carries an effect). The canvas draws no open dropdown, popover, or select list, so floating menus follow the sheet and toast: no border, no shadow; they separate by tone only (côté `#fafafa` on the white page). Tooltip and toast are ink pills. |

## 3. Tokens (`packages/ui/src/styles/globals.css`)

Hex is canonical. No `color-mix`, no OKLCH, no `.dark`, no shadow tokens, no `--font-mono`.

### 3.1 `:root`

| Token | Value | Canvas name | Use |
|---|---|---|---|
| `--background` | `#ffffff` | fond | the page |
| `--card`, `--popover` | `#ffffff` | fond | dialog, sheet, (card is flat) |
| `--card-foreground`, `--popover-foreground` | `#1f1f1f` | encre | |
| `--side` | `#fafafa` | côté | side column, drawer, disabled tiles, floating menus |
| `--foreground` | `#1f1f1f` | encre | text, icons |
| `--primary` | `#1f1f1f` | encre | the one dark control |
| `--primary-foreground` | `#ffffff` | | |
| `--primary-hover` | `#333333` | | |
| `--secondary`, `--muted` | `#eceef2` | pilule | active pill, soft button, neutral badge, skeleton, progress track |
| `--secondary-foreground`, `--accent-foreground` | `#1f1f1f` | | |
| `--accent` | `#e3e6ec` | pilule-survol | hover step of a pill |
| `--muted-foreground` | `#5f6368` | atténué | secondary text on white and côté |
| `--muted-strong` | `#4d5156` | atténué fort | secondary text on tints and pills |
| `--border`, `--input` | `#dcdcdc` | filet | hairlines, outlines |
| `--ring` | `#1f1f1f` | encre | focus outline |
| `--overlay` | `rgb(31 31 31 / 25%)` | scrim | dialog and sheet backdrop |
| `--danger` | `#b23a2a` | danger | invalid field outline only, never a fill |
| `--success` / `--success-foreground` | `#e9f3ee` / `#1d5c3c` | statut succès | tint / text |
| `--warning` / `--warning-foreground` | `#fbf1dc` / `#7a5c10` | statut attention | tint / text |
| `--destructive` / `--destructive-foreground` | `#fbe9e7` / `#8f2f22` | statut erreur | tint / text; destructive button |
| `--info` / `--info-foreground` | `#e8eefb` / `#2c4f8a` | statut info | tint / text |
| `--tint-bleu`, `--tint-vert`, `--tint-sable`, `--tint-rose`, `--tint-lavande` | `#e8eefb`, `#e9f3ee`, `#fbf1dc`, `#f6ecf2`, `#eee9f8` | teintes | tiles, avatars |
| `--wash` | `#dfe8fa` | lavis | the optional radial wash (used by SP-B only) |
| `--chart-1` … `--chart-5` | encre, atténué, info-foreground, success-foreground, warning-foreground | | chart marks on white |
| `--chart-grid`, `--chart-track` | `--border`, `--secondary` | | |
| `--radius-sm` | `0.375rem` | | checkbox |
| `--radius-lg` | `1.25rem` | | textarea, floating menus, alert rows |
| `--radius-xl` | `1.5rem` | | tiles |
| `--radius-2xl` | `1.75rem` | | dialog |
| `--radius-pill` | `9999px` | | every control |
| `--motion-standard` | `200ms ease-out` | | pill state changes, dialog fade |

Retired (must be zero after SP-A, enforced by the guard): `--foret`, `--argile`, `--ocre`, `--sauge`, `--eucalyptus`, `--eau`, the `/18` tint modifier on status colours, the 360ms cubic-bezier, `--radius` (fields are pills), the `eyebrow` utility, the root font-size clamp.

### 3.2 `@theme inline`

Map every `:root` colour to `--color-*` (including `side`, `muted-strong`, `danger`, the five `tint-*`, `wash`). Radii: `--radius-sm` (0.375rem, checkbox), `--radius-md` (0.5rem, the wordmark square and other 24px elements), `--radius-lg`, `--radius-xl`, `--radius-2xl`, `--radius-pill`. Text scale replaces Tailwind's defaults:

| Class | Size | Canvas step |
|---|---|---|
| `text-xs` | 0.75rem (12) | avatar initials, user role |
| `text-sm` | 0.8125rem (13) | label, table header, badge, stat label, timestamps |
| `text-md` (new) | 0.875rem (14) | small buttons, chips, tile counts, venue name, mode selector |
| `text-base` | 0.9375rem (15) | body, rows, buttons, fields, nav items |
| `text-lg` | 1rem (16) | tile title, row primary text |
| `text-xl` | 1.375rem (22) | section heading, tile time |
| `text-2xl` | 2rem (32) | page title, stat number |
| `text-3xl` | 2.75rem (44) | display (hub greeting) |

Line heights: 1.5 for body and below, 1.3 for label and title, 1.2 for section, 1.1 for 2xl/3xl. Letter spacing: `-0.03em` on 2xl/3xl, `-0.02em` on xl, none below.

`--font-sans` stays `var(--font-inter), Inter, ui-sans-serif, system-ui, sans-serif`. Weights in use: 400, 500, 600 only.

### 3.3 Utilities and base

- Delete `@utility eyebrow`.
- `@utility font-numeric`: `font-variant-numeric: tabular-nums; font-feature-settings: 'tnum' 1;` and nothing else (no weight, no family).
- `html`: no font-size rule (16px root so canvas px map 1:1).
- `body`: `bg-background text-foreground font-sans antialiased` and `text-base` (15px).
- `:focus-visible { outline: 3px solid var(--ring); outline-offset: 0.25rem }` (ink, not `currentColor`, so it shows on the dark pill).
- Keep the reduced-motion block and the `checkin-arrive` keyframe (its wash uses `--primary` at 9%, still valid).

## 4. Primitives (`packages/ui/src/components/*`), props unchanged

All values are the canvas components sheet. "Tone step" = `secondary` → `accent`, `primary` → `primary-hover`, transparent → `side`.

- **Button** base: `inline-flex items-center justify-center gap-2 rounded-full text-base font-medium h-11 px-5 transition-colors duration-200 ease-out disabled:opacity-50`. Variants: `default` ink fill / white text / hover `primary-hover`; `secondary` pilule / ink / hover accent (the canvas "Soft"); `outline` transparent / 1px `border-border` / ink / hover `side`; `ghost` transparent / ink / hover `side`; `destructive` `bg-destructive text-destructive-foreground` (tint + text stop, the canvas "Danger") / hover one tone darker via `brightness-95`; `link` unchanged. Sizes: `default` h-11 px-5; `sm` h-9 px-4 `text-md`; `xs` h-7 px-3 `text-sm` (tables only); `lg` = default (kept as alias); `icon` size-11; `icon-sm` size-9; `icon-md` size-10 (the 40px dark submit inside the command bar: `variant="default" size="icon-md"`); `icon-xs` size-7. The `lg:` desktop step-downs are removed: 44px everywhere.
- **Badge**: `rounded-full px-3 py-1 text-sm font-medium`. `success|warning|info|destructive`: `bg-<status> text-<status>-foreground`. `default` and `secondary`: `bg-secondary text-muted-strong` (Neutre). `outline`: `border border-border text-muted-strong`. `ghost`, `link` unchanged. No dark badge.
- **Tabs**: `TabsList` = `inline-flex gap-1` with no background and no padding. `TabsTrigger` = `h-10 rounded-full px-[18px] text-base font-normal text-muted-foreground data-[state=active]:bg-secondary data-[state=active]:font-semibold data-[state=active]:text-foreground`.
- **Input**, **Select** trigger: `h-12 w-full rounded-full border border-input bg-card px-[18px] text-base placeholder:text-muted-foreground focus-visible:border-foreground aria-invalid:border-danger`. Icons inside are 18px atténué. `Input[type=number]` keeps `font-numeric`.
- **Textarea**: `rounded-lg border border-input bg-card px-[18px] py-3.5 text-base leading-relaxed`.
- **Label**: `text-sm font-medium text-muted-strong`. **Form** description `text-sm text-muted-foreground`; message `text-sm text-destructive-foreground`.
- **Checkbox**: `size-5 rounded-sm border border-input bg-card data-[state=checked]:bg-primary data-[state=checked]:border-primary`, 14px white check.
- **Switch**: `h-6 w-10 rounded-full bg-border data-[state=checked]:bg-primary`, 20px white thumb.
- **Card**: `flex flex-col gap-6` (no border, background, radius, padding, shadow). `CardHeader`: `flex flex-col gap-1.5`. `CardTitle`: `text-xl font-medium tracking-[-0.02em] leading-[1.2]`. `CardDescription`: `text-base text-muted-foreground`. `CardContent`, `CardFooter`: no padding. `CardAction` unchanged in layout.
- **Stat / StatPanel**: `StatPanel` = `flex justify-center divide-x divide-border` with no border, background or radius; children are `Stat`s. `Stat` = `flex flex-col items-center gap-1 px-10` (`px-5` below `md`); value `text-2xl font-medium tracking-[-0.03em] leading-[1.1] font-numeric`; label `text-sm text-muted-foreground`; loading state keeps the Skeleton (pilule).
- **Table**: no wrapper border; `TableHead` `h-11 text-sm font-medium text-muted-foreground` with no background; `TableRow` `border-b border-border` and no hover fill; `TableCell` `py-3 text-base`; `numeric` variant keeps `font-numeric`.
- **Dialog**: overlay `bg-overlay`; content `rounded-2xl bg-card p-8 gap-6` with no border; `DialogTitle` `text-[1.5rem] font-medium leading-[1.2]`; `DialogDescription` `text-base text-muted-foreground`; footer `gap-2.5`; close = 36px ghost icon button top-right (`right-6 top-6`).
- **Sheet**: `w-[460px] max-w-full bg-card p-8` with no border; same overlay. The mobile nav drawer overrides to `bg-side w-[300px] p-0`.
- **Popover**, **DropdownMenu** content, **Select** content, **Combobox** list: `rounded-lg bg-side p-2` with no border and no shadow; items `h-10 rounded-full px-3.5 text-base data-[highlighted]:bg-secondary`; separators `bg-border`.
- **Tooltip**: `rounded-full bg-primary px-3 py-1.5 text-md text-primary-foreground`, no arrow.
- **Sonner toast**: `rounded-full bg-primary text-primary-foreground h-[52px] px-5 text-base`, timestamp `text-primary-foreground/60 font-numeric`, position bottom-right.
- **Alert**: `rounded-lg px-4 py-3 gap-3` on the status tint with the status text stop; `default` variant uses `bg-secondary text-foreground`; no border. `AlertReference` keeps `font-numeric`.
- **Skeleton**: `bg-secondary rounded-lg` with `animate-none` (No pulse).
- **Progress**: `h-1.5 rounded-full bg-secondary`, indicator `bg-primary`; `full` prop switches the indicator to `bg-warning-foreground`.
- **Avatar**: `size-9 rounded-full` tinted via `tintForIndex`, fallback initials `text-xs font-semibold text-foreground`.
- **Separator**: `bg-border`.
- **Empty**: heading `text-xl font-medium`, body `text-base text-muted-foreground`, no box, no icon circle; action slot unchanged.
- **Capacity**: count `font-numeric`, threshold colours use `text-success-foreground` / `text-warning-foreground` / `text-destructive-foreground`; bar uses Progress.
- **InputOTP**: slots `size-12 rounded-full border border-input`, active slot `border-foreground`. The old ring treatment is removed.

## 5. New primitives

- **`components/tile.tsx`** — `Tile` (`tint?: TintName | number`, `aspect?: 'square' | 'tall'`, `asChild`), `TileTop` (flex row space-between), `TileTime` (`text-xl font-medium tracking-[-0.02em] font-numeric`), `TileCount` (`text-md font-medium text-muted-strong font-numeric`), `TileTitle` (`text-lg font-semibold`), `TileMeta` (`text-sm text-muted-strong`). Base: `flex flex-col justify-between rounded-xl p-5 text-foreground` with `aspect-square` or `min-h-[14rem]`. No border, no shadow. A number tint rotates through the five tints via `tintForIndex`.
- **`components/command-bar.tsx`** — `CommandBar` (`<form>`): `flex h-[60px] max-w-[45rem] items-center gap-3.5 rounded-full border border-input bg-card pr-2.5 pl-[22px]` (`h-14 pl-[18px] pr-2` below `md`). Props: `icon` (ReactNode, 20px ink), `placeholder`, `value`, `onChange`, `onSubmit`, `mode` (ReactNode slot rendered as a 36px ghost pill before the submit, e.g. a DropdownMenu trigger), `submitLabel` (aria-label), `inputProps`. The submit is `Button variant="default" size="icon-md"` with an `arrow-up` icon. The bar is the only place two dark controls may coexist on a hub screen with a primary button; SP-B decides which one stays.
- **`components/chip.tsx`** — `Chip`: `inline-flex items-center gap-1.5 rounded-full bg-secondary py-1.5 pr-1.5 pl-3.5 text-md font-medium`; optional `onRemove` renders a 14px `x` icon button with `removeLabel`.
- **`lib/tints.ts`** — `TINTS = ['bleu','vert','sable','rose','lavande'] as const`, `tintForIndex(i: number): TintName`, `tintClass(t: TintName): string` (`bg-tint-<t>`).
- **`components/wordmark.tsx`** — `Wordmark` (`name`, `size?: 'sm' | 'md'`): 24px ink square `rounded-md` plus `text-lg font-semibold tracking-[-0.02em]`. Replaces the owner's local `wordmark.tsx` and the shell's private `Wordmark`.

Each new file ships with a vitest render test (tile tint rotation, command bar submit + aria, chip remove).

## 6. Shell (`packages/ui/src/app-shell.tsx`)

Props: existing (`title`, `nav`, `navGroups`, `navHeader`, `leading`, `actions`, `currentPath`, `linkComponent`, `onNavigate`, `openMenuLabel`, `children`) plus **`navFooter?: ReactNode`**. `leading` and `actions` now render only in the mobile top bar; the JSDoc says so.

- **Desktop (`md` and up)**: `aside` `flex w-[260px] shrink-0 flex-col bg-side px-3 py-4` with no border. Brand row: `Wordmark` in `px-2.5 pt-2 pb-5` (the canvas collapse icon is omitted in SP-A). `navHeader` under the brand if given. Nav groups: items are `flex h-[42px] items-center gap-3 rounded-full px-3.5 text-base text-foreground hover:bg-accent/60`, icon 18px; active `bg-secondary font-semibold`; group label `px-3.5 pt-5 pb-1.5 text-sm font-medium text-muted-foreground`. No hairline between groups. `flex-1` spacer, then `navFooter` in a `flex flex-col gap-0.5`.
- **Main**: `flex min-w-0 flex-1 flex-col bg-background`; page padding unchanged in SP-A (current `<main>` classes stay).
- **Mobile (below `md`)**: top bar `flex h-14 items-center gap-2.5 px-3` with no border: menu trigger `Button variant="ghost" size="icon-sm"` (36px) with the `Menu` icon, then `leading`, then `actions` pushed right. Drawer: `Sheet side="left"` content `w-[300px] bg-side p-3 pt-4`, same brand row, `navHeader`, nav groups, spacer, `navFooter`; closes on navigate.
- Hidden `SheetTitle` for the drawer keeps the current accessible name.

## 7. Apps

### 7.1 Owner

- `app/(app)/layout.tsx`: `navHeader` removed; `navFooter={<><VenueSwitcher /><UserMenu variant="row" /></>}`; mobile `leading` keeps `<VenueSwitcher compact />`, `actions` keeps `<UserMenu />` (avatar trigger).
- `components/venue-switcher.tsx`: 44px outline pill, `building-2` icon 18px atténué, name `text-md font-medium` truncated, `chevrons-up-down` 16px atténué; `compact` keeps the existing narrow form for the mobile bar.
- `UserMenu` (in the layout): new `variant="row"` renders a 48px `rounded-3xl` row with `Avatar` 36px tinted, name `text-md font-medium`, role `text-xs text-muted-foreground`, opening the same dropdown.
- `components/auth-card.tsx`: no `Card`, no band. `Wordmark` (from ui), `h1` `text-2xl font-normal tracking-[-0.03em]`, subtitle `text-base text-muted-foreground`, children, footer. Width stays as today; the wash and full layout are SP-B.
- `components/wordmark.tsx` deleted; imports point at `@iziwellpass/ui/components/wordmark`.
- Sweep (mechanical, grep-verified): `font-[650]` → `font-semibold`; `font-[750]` on headlines → `font-normal` with `tracking-[-0.03em]`; `font-[800]` → `font-semibold`; `eyebrow` → `text-sm font-medium text-muted-foreground`; `rounded-2xl` removed where it overrides Card/containers; `bg-argile|bg-foret|text-foret|argile|foret|ocre|sauge|eucalyptus|eau` gone; `StatPanel`/`Stat` call sites untouched.

### 7.2 Admin

- `app/(app)/layout.tsx`: `actions={<UserMenu />}` moves to `navFooter`; mobile keeps `actions`.
- `components/auth-card.tsx`: same flat form as owner (no ink band).
- Same sweep as owner.
- `app/design/**` (the living reference): update the data arrays and copy in one bounded task: colour swatches and contrast rows to §3.1 values, type scale to §3.2, radii to §3.1, rules to `DESIGN.md` §2–4, "Élévation" section states the No-Elevation Rule, specimens use the new variants (Tile, CommandBar, Chip added to primitives). Remove any eyebrow or uppercase in its chrome.

### 7.3 Message catalogs

Unchanged. Uppercase was CSS only and is now gone; fr/en parity untouched.

## 8. Guards and tests

- `packages/ui/src/styles/tokens.test.ts`: parse `globals.css` `:root`; assert every hex in §3.1; assert WCAG AA (≥ 4.5:1) for: encre on fond, encre on côté, encre on pilule, atténué on fond, atténué on côté, atténué fort on each of the five tints and on pilule, each status text on its tint, fond on encre. Assert `--overlay` alpha is 25%.
- `packages/ui/src/styles/focus.test.ts`: unchanged (glob, input-otp exemption removed since its ring treatment is gone).
- `packages/ui/src/styles/weights.test.ts` (new): every `font-[NNN]`, `font-bold`, `font-extrabold`, `font-black` occurrence in `packages/ui/src` is a failure; only `font-normal|medium|semibold` allowed.
- `scripts/check-design-system.mjs`: add `eyebrow`, `font-[650]`, `font-[750]`, `font-[800]`, `font-bold`, `uppercase`, `tracking-wide`, `bg-argile`, `bg-foret`, `text-foret`, `text-argile`, `ocre`, `sauge`, `eucalyptus`, `box-shadow`, `shadow-sm`, `shadow-md` to the pattern list. Keep the existing ones. Roots unchanged.
- Gates from the repo root: `pnpm check:design && pnpm build && pnpm typecheck && pnpm lint && pnpm test`. Never build while a dev server for the same checkout is running; work in a worktree.
- Visual checks by the controller: owner login, dashboard, members, front desk; admin login and `/design`; compared against `docs/design-refs/comptoir-clair/*.png`.

## 9. Out of scope (later sub-projects or follow-ups)

- SP-B: hub layouts (940px centred column, 64/120 padding, greeting 44/400, command bar under the heading, stat strip, tile grid, lavis wash), auth screens with the wash and the notice row, onboarding, the collapse control on the brand row.
- SP-C: working-screen layouts (40/56 padding, 32/400 title, toolbar with search pill and tabs, hairline tables with avatars, footers with pagination pills), dialogs and sheets content, tinted plan and venue tiles.
- Member app (Expo) migration.
- The old `prj-design` skill kit (shadcn-era) was deleted on 2026-09-20; the canvas is the reference kit.
- Parked from SP1 review: Tabs/Popover panel focus outline visual pass; stale prose on admin `/design` (fixed here by the §7.2 rewrite).

## 10. Task shape for the plan

1. Commit the regenerated docs (`DESIGN.md`, `DESIGN.json`, `PRODUCT.md`, `AGENTS.md`) and this spec, plus the PNG references.
2. Tokens, text scale, utilities, base, guard patterns, `tokens.test.ts`, `weights.test.ts`.
3. Primitive skins (§4) in one pass with `focus.test.ts` and existing tests green.
4. New primitives (§5) with tests; `Wordmark` extracted.
5. Shell (§6) with its test updated.
6. Owner wiring and sweep (§7.1).
7. Admin wiring, sweep, `/design` rewrite (§7.2).
8. Full gates, visual checks, whole-branch review.
