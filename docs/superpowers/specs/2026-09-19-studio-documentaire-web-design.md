# « Le studio documentaire » — Shared Web Layer Migration (Sub-project 1)

**Date:** 2026-09-19
**Status:** Approved in brainstorming (all-three shared-first; dark mode dropped; native static weights accepted for SP2)
**Design authority:** `DESIGN.md` / `PRODUCT.md` (regenerated 2026-09-19 from the public landing `thot_web`)

## Goal

Move the shared web layer (`packages/ui`) and, through it, the owner and admin
apps from "green ink on paper" to « Le studio documentaire »: ink on bone, the
forêt/argile identity surfaces, Inter Variable only, pills + 1.25rem panels,
zero shadows, one motion token. The member app follows in Sub-project 2 with
its own NativeWind token layer.

## Strategy: re-point, don't rename

shadcn's semantic token vocabulary stays as the consumed API; only values
change. New *named* tokens are added for identity surfaces. Code churn is
limited to mechanical, greppable substitutions (shadows, `font-mono`, focus
rings, `dark:`).

## Tokens — `packages/ui/src/styles/globals.css` (rewritten)

Hex canonical (thot's doctrine); the OKLCH layer and all `.dark` tokens are
removed. `@custom-variant dark` is removed.

| Token | Value |
|---|---|
| `--background` | `#f2eee5` (os) |
| `--foreground` | `#141512` (encre) |
| `--card`, `--popover` | `#ffffff` (blanc); their `-foreground` = encre |
| `--primary` / `--primary-foreground` | `#141512` / `#ffffff` |
| `--primary-hover` | `color-mix(in srgb, #141512 85%, transparent)` |
| `--secondary`, `--muted` | `color-mix(in srgb, var(--foreground) 6%, var(--background))`; `-foreground` = encre / muted-foreground below |
| `--muted-foreground` | `color-mix(in srgb, var(--foreground) 62%, transparent)` |
| `--accent` / `--accent-foreground` | `color-mix(in srgb, var(--foreground) 8%, var(--background))` / encre |
| `--border`, `--input` | `color-mix(in srgb, currentColor 18%, transparent)` |
| `--ring` | `#141512` |
| `--destructive` / `--destructive-foreground` | `#b23a2a` / `#8f2f22` |
| `--success` / `--success-foreground` | `#257a4e` / `#1d5c3c` |
| `--warning` / `--warning-foreground` | `#d9b84b` / `#7a5c10` |
| `--info` / `--info-foreground` | `#8ebbd2` / `#2c6a8a` |
| `--overlay` | `rgb(10 13 11 / 34%)` |
| `--foret`, `--argile` | `#244f3c`, `#c66f50` |
| `--ocre`, `--sauge`, `--eucalyptus`, `--eau` | `#d9b84b`, `#b9c9a4`, `#9fc0bb`, `#8ebbd2` |
| `--chart-1..5` | encre, muted-foreground, eau, sauge, ocre; `--chart-grid` = border, `--chart-track` = muted |
| `--radius` / `--radius-xl` / `--radius-pill` | `0.75rem` / `1.25rem` / `9999px` |
| `--motion-standard` | `360ms cubic-bezier(0.22, 1, 0.36, 1)` |
| `--font-sans` | `var(--font-inter), Inter, ui-sans-serif, system-ui, sans-serif` (no `--font-mono`) |

Shadow tokens (`--shadow-xs/popover/lg`) are deleted. `@theme inline` exposes
the identity tokens as colors (`bg-foret`, `text-argile`, …) and drops the
shadow/mono entries.

Base layer:
- `html { font-size: clamp(1rem, 0.95rem + 0.25vw, 1.125rem) }`.
- `:focus-visible { outline: 3px solid currentColor; outline-offset: 0.25rem }`
  replaces the ring convention.
- Reduced-motion guard and the `checkin-arrive` keyframe stay.
- Utilities: `@utility eyebrow` (0.75rem, weight 750, 0.14em, uppercase,
  line-height 1.3) and `@utility font-numeric` (font-sans, `font-variant-numeric:
  tabular-nums`, `font-feature-settings: 'tnum' 1`, weight 650).

## Fonts

Owner and admin `app/layout.tsx`: `Inter` from `next/font/google` (variable,
`variable: '--font-inter'`, `display: 'swap'`) replaces `Hanken_Grotesk` and
`Geist_Mono`. `ThemeProvider`/`next-themes` removed from both layouts and
package manifests where unused elsewhere.

## Component set — `packages/ui/src/components`

- **button**: pill; label weight 750 (default) / 800 (primary); `shadow-xs`
  removed; hover = `--primary-hover`; `outline` = 1px `currentColor` border,
  transparent; `secondary/ghost` = accent wash; transitions use
  `--motion-standard`. Sizes unchanged (`h-11`, `lg:h-9`).
- **input / textarea / select trigger / combobox**: `rounded-[var(--radius)]`
  (0.75rem), `bg-card` (blanc), hairline border; pill removed; `shadow-xs`
  removed; `[type=number]` uses `font-numeric`.
- **badge**: status variants (`success`, `warning`, `info`, `destructive`) =
  18% tint of the status color (`bg-<status>/18`) + `text-<status>-foreground`;
  `default` = encre solid / blanc text; `outline` = hairline; weight 650.
- **card, dialog, sheet, popover, dropdown-menu, tooltip, sonner**: blanc
  surface, `rounded-xl` (now 1.25rem), hairline border, no shadow; overlays
  use `bg-overlay`.
- **app-shell**: wordmark weight 800 / `tracking-[-0.04em]`; nav items weight
  650 at `opacity-[0.62]`, hover/active `opacity-100`; active = weight 800 +
  a 2px `rounded-pill` `bg-current` underline (`after:` pseudo, inset 0.75rem,
  bottom 0.25rem); the solid ink pill and its shadow are gone; group labels
  use `eyebrow`.
- **stat**: value uses `font-numeric`; label uses `eyebrow`.
- **capacity**: track = `bg-muted`, fill = `bg-primary`; thresholds keep
  warning/destructive; count uses `font-numeric`.
- **skeleton, separator, table, tabs, switch, checkbox, progress**: strip
  shadows/`dark:`; tabs triggers stay pills; table rows keep hairlines.
- Every component: strip `dark:` classes and the
  `focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/15`
  / `aria-invalid:ring-*` strings (the global outline rule takes over;
  `aria-invalid:border-destructive` stays).

## Apps — owner and admin

- Replace `font-mono` → `font-numeric` (all files; `tabular-nums` classes may
  stay). Strip the single `shadow-*` usage in each app and all `dark:` classes
  (admin: 2 files).
- Section/group labels that use `text-xs … uppercase` (admin: 6 files) and
  the dashboard/section overlines adopt `eyebrow`.
- Auth mastheads (The Two Places Rule): owner login/signup masthead
  `bg-argile text-foreground`; admin login masthead `bg-primary
  text-primary-foreground` (platform-internal, no place).
- Page titles: `text-2xl font-semibold` → weight 750, `tracking-[-0.035em]`
  (headline scale, tempered); one display-weight (800) title per surface at most.
- No feature or layout changes beyond the above.

## DESIGN.md amendment (recorded)

"Don't compress into the dense enterprise admin: reading text stays at 1rem;
dense tables and rows may use 0.875rem, never below; rows breathe with
hairlines; screens survive a 375px phone." (Front-desk density needs `text-sm`
in lists; with the fluid base it renders 14–15.75px.)

## Verification

- Four gates green from repo root: `pnpm build && pnpm typecheck && pnpm lint
  && pnpm test` (ui tests that assert old classes are updated, not deleted).
- Contrast: every status pair (`<status>-foreground` on an 18% tint over both
  os and blanc), `primary-foreground` on encre, encre on argile, blanc on forêt:
  all ≥ 4.5:1 (script check in the plan).
- Visual spot-checks (screenshots): owner login, dashboard, members, front
  desk; admin login, tenant list, tenant detail. No shadow, no Hanken/Geist,
  bone ground, active-nav underline, eyebrows present.
- `grep` gates: zero `shadow-xs|shadow-popover|shadow-lg`, zero `font-mono`,
  zero `dark:`, zero `next-themes` across `packages/ui`, `apps/owner`,
  `apps/admin`.

## Out of scope

Member app (Sub-project 2); dark mode; landing-only patterns (split gateway,
media mosaics, documentary photography); new features or IA changes;
`packages/ui` API renames.

## Global constraints (inherited)

- Never hand-edit `packages/api/src/generated/**`.
- French-first i18n, exact fr/en key parity; no copy changes in this
  sub-project except eyebrow-case labels are NOT changed in the catalogs
  (uppercase is a CSS transform, never typed copy).
- `verbatimModuleSyntax`, `noUncheckedIndexedAccess`; `@iziwellpass/ui`
  subpath imports only; Prettier on touched files; quote `()`/`[]` paths.
- Never run a build while a dev server for the same checkout is up.
