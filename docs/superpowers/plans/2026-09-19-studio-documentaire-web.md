# « Le studio documentaire » Web Layer Implementation Plan (SP1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-point `packages/ui` (tokens, fonts, component set) to the digested design system so the owner and admin apps flip to ink-on-bone, Inter-only, flat, one-motion-token visuals with no feature changes.

**Architecture:** shadcn semantic token names stay; only values change in `globals.css` (hex canonical, `color-mix` neutrals). Mechanical strips remove shadows, `dark:` classes, focus-ring strings, and `font-mono`. Targeted edits reshape button/input/badge/card/app-shell/stat/capacity. Both apps swap fonts, drop `next-themes`, recolor their auth mastheads, and adopt `eyebrow`/`font-numeric` utilities.

**Tech Stack:** Tailwind v4 (`@theme inline`, `@utility`), Next 15 + `next/font/google` Inter, shadcn/radix components, vitest.

**Spec:** `docs/superpowers/specs/2026-09-19-studio-documentaire-web-design.md`

## Global Constraints

- Token values are the spec's table, verbatim (hex canonical; neutrals via `color-mix`). No OKLCH, no `.dark` block, no shadow tokens, no `--font-mono`.
- Zero after this plan, across `packages/ui`, `apps/owner`, `apps/admin`: `shadow-xs|shadow-popover|shadow-lg`, `font-mono`, `dark:`, `next-themes`, `Hanken`, `Geist`.
- Focus: the global `:focus-visible` outline rule; ring classes are stripped.
- Copy is never changed in the message catalogs; uppercase is CSS (`eyebrow`) only. French-first, fr/en parity untouched.
- `@iziwellpass/ui` subpath imports only; `verbatimModuleSyntax`; `noUncheckedIndexedAccess`; Prettier on touched files; quote `()`/`[]` paths.
- Never hand-edit `packages/api/src/generated/**`. Never run `pnpm build` while a dev server for this checkout is up (work in the worktree).
- Gates from repo root: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`.

---

### Task 1: Tokens and base layer (`globals.css` rewrite)

**Files:**
- Modify: `packages/ui/src/styles/globals.css` (full rewrite)
- Create: `packages/ui/src/styles/tokens.test.ts`

**Interfaces:**
- Produces: CSS custom properties per the spec table; Tailwind colors `bg-foret`, `bg-argile`, `bg-ocre`, `bg-sauge`, `bg-eucalyptus`, `bg-eau`, `bg-overlay`; utilities `eyebrow` and `font-numeric`; `--motion-standard`.

- [ ] **Step 1: Write the failing contrast test**

`packages/ui/src/styles/tokens.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

// Spec values (hex canonical). Keep in sync with globals.css by hand: this test
// is the AA guard for every badge/ink pairing the system ships.
const OS = '#f2eee5';
const BLANC = '#ffffff';
const ENCRE = '#141512';
const ARGILE = '#c66f50';
const FORET = '#244f3c';
const STATUS: Array<[string, string]> = [
  ['#257a4e', '#1d5c3c'], // succès
  ['#d9b84b', '#7a5c10'], // attention
  ['#b23a2a', '#8f2f22'], // erreur
  ['#8ebbd2', '#2c6a8a'], // info
];

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lum([r, g, b]: [number, number, number]): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}
/** Composite `top` at `alpha` over `base` (sRGB, like an 18% tint badge). */
function tint(top: string, alpha: number, base: string): [number, number, number] {
  const t = rgb(top);
  const b = rgb(base);
  return [0, 1, 2].map((i) => Math.round(t[i]! * alpha + b[i]! * (1 - alpha))) as [
    number,
    number,
    number,
  ];
}

describe('studio documentaire contrast (WCAG AA ≥ 4.5)', () => {
  it.each(STATUS)('text stop on 18%% tint of %s over os and blanc', (base, stop) => {
    expect(contrast(rgb(stop), tint(base, 0.18, OS))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(rgb(stop), tint(base, 0.18, BLANC))).toBeGreaterThanOrEqual(4.5);
  });
  it('ink pairings', () => {
    expect(contrast(rgb(BLANC), rgb(ENCRE))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(rgb(ENCRE), rgb(OS))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(rgb(ENCRE), rgb(ARGILE))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(rgb(BLANC), rgb(FORET))).toBeGreaterThanOrEqual(4.5);
  });
});
```

- [ ] **Step 2: Run it**

Run: `pnpm --filter @iziwellpass/ui test -- tokens`
Expected: PASS (it is a guard on the spec's values; if any pair fails, STOP and report the failing pair — do not tune values silently).

- [ ] **Step 3: Rewrite `globals.css`**

Replace the entire file with:

```css
@import 'tailwindcss';

/* Scan this package's own source for class names when imported by an app. */
@source '../';

/* ============================================================
   IziWellPass — « Le studio documentaire » token layer
   Ink on bone, forêt/argile identity surfaces, documentary
   accents, one family (Inter), flat: no shadows, no gradients.
   Hex is canonical (matches DESIGN.md and the public landing);
   neutrals are color-mix() of encre into the surface, so there
   is no grey scale to maintain.
   ============================================================ */

:root {
  /* Ground and ink */
  --background: #f2eee5; /* os */
  --foreground: #141512; /* encre */
  --card: #ffffff; /* blanc */
  --card-foreground: #141512;
  --popover: #ffffff;
  --popover-foreground: #141512;
  --overlay: rgb(10 13 11 / 34%);

  /* The one control color (The Flat Ink Rule) */
  --primary: #141512;
  --primary-foreground: #ffffff;
  --primary-hover: color-mix(in srgb, #141512 85%, transparent);

  /* Neutral washes: encre mixed into the surface */
  --secondary: color-mix(in srgb, var(--foreground) 6%, var(--background));
  --secondary-foreground: #141512;
  --muted: color-mix(in srgb, var(--foreground) 6%, var(--background));
  --muted-foreground: color-mix(in srgb, var(--foreground) 62%, transparent);
  --accent: color-mix(in srgb, var(--foreground) 8%, var(--background));
  --accent-foreground: #141512;
  --border: color-mix(in srgb, currentColor 18%, transparent);
  --input: color-mix(in srgb, currentColor 18%, transparent);
  --ring: #141512;

  /* Status (18% tint under the text stop in badges) */
  --destructive: #b23a2a;
  --destructive-foreground: #8f2f22;
  --success: #257a4e;
  --success-foreground: #1d5c3c;
  --warning: #d9b84b;
  --warning-foreground: #7a5c10;
  --info: #8ebbd2;
  --info-foreground: #2c6a8a;

  /* Identity surfaces (The Two Places Rule) and documentary accents */
  --foret: #244f3c;
  --argile: #c66f50;
  --ocre: #d9b84b;
  --sauge: #b9c9a4;
  --eucalyptus: #9fc0bb;
  --eau: #8ebbd2;

  /* Charts: ink first, documentary accents for categories */
  --chart-1: var(--primary);
  --chart-2: var(--muted-foreground);
  --chart-3: var(--eau);
  --chart-4: var(--sauge);
  --chart-5: var(--ocre);
  --chart-grid: var(--border);
  --chart-track: var(--muted);

  /* Shape and motion */
  --radius: 0.75rem; /* fields */
  --radius-xl: 1.25rem; /* panels */
  --radius-pill: 9999px; /* controls */
  --motion-standard: 360ms cubic-bezier(0.22, 1, 0.36, 1);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-overlay: var(--overlay);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-info: var(--info);
  --color-info-foreground: var(--info-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-foret: var(--foret);
  --color-argile: var(--argile);
  --color-ocre: var(--ocre);
  --color-sauge: var(--sauge);
  --color-eucalyptus: var(--eucalyptus);
  --color-eau: var(--eau);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-chart-grid: var(--chart-grid);
  --color-chart-track: var(--chart-track);

  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-xl: var(--radius-xl);
  --radius-pill: var(--radius-pill);

  --font-sans: var(--font-inter), Inter, ui-sans-serif, system-ui, sans-serif;
}

/* The signature overline: the only uppercase in the system. */
@utility eyebrow {
  font-size: 0.75rem;
  font-weight: 750;
  line-height: 1.3;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

/* Every figure someone compares or reads back (The Tabular Rule). */
@utility font-numeric {
  font-family: var(--font-sans);
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
  font-weight: 650;
}

@layer base {
  * {
    @apply border-border;
  }
  html {
    font-size: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);
  }
  body {
    @apply bg-background text-foreground font-sans antialiased;
  }
  /* One focus convention for everything: a solid outline in the element's own
     color, offset so it never fights a pill's border. */
  :focus-visible {
    outline: 3px solid currentColor;
    outline-offset: 0.25rem;
  }
  /* Motion is functional, never decorative (PRODUCT.md): honor the OS
     preference app-wide. */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}

/* A newly recorded check-in easing into the live feed: a short fade-and-lift
   settles the row, then a faint ink wash decays to transparent so the eye
   catches which row just arrived. Functional, not celebratory. */
@keyframes checkin-arrive {
  0% {
    opacity: 0;
    transform: translateY(6px);
    background-color: color-mix(in srgb, var(--primary) 9%, transparent);
  }
  16% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    transform: translateY(0);
    background-color: transparent;
  }
}
.animate-checkin-arrive {
  animation: checkin-arrive 1100ms cubic-bezier(0.22, 1, 0.36, 1);
}
```

- [ ] **Step 4: Verify the package still compiles and tests pass**

Run: `pnpm --filter @iziwellpass/ui typecheck && pnpm --filter @iziwellpass/ui lint && pnpm --filter @iziwellpass/ui test`
Expected: all green (component tests do not assert visual classes). `dark:` classes still present in components are inert now (no variant) and are removed in Task 3.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/styles && git commit -m "feat(ui): studio documentaire token layer — ink on bone, flat, Inter, one motion token"
```

---

### Task 2: Fonts and theme removal (owner, admin, sonner)

**Files:**
- Modify: `apps/owner/app/layout.tsx`, `apps/admin/app/layout.tsx`
- Modify: `packages/ui/src/components/sonner.tsx`
- Modify: `apps/owner/package.json`, `apps/admin/package.json`, `packages/ui/package.json`, `pnpm-lock.yaml`

**Interfaces:**
- Produces: `--font-inter` CSS variable on `<html>` in both apps; no `next-themes` anywhere.

- [ ] **Step 1: Owner layout**

In `apps/owner/app/layout.tsx` replace the font imports/consts and the html/ThemeProvider wrapper:

```tsx
import { Inter } from 'next/font/google';
// remove: Hanken_Grotesk, Geist_Mono, ThemeProvider imports

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});
```

`<html lang={locale} className={inter.variable}>` (drop `suppressHydrationWarning` if it existed only for next-themes). Remove the `<ThemeProvider …>` element, keeping its children in place.

- [ ] **Step 2: Admin layout**

Apply the identical change to `apps/admin/app/layout.tsx`.

- [ ] **Step 3: Sonner without next-themes**

In `packages/ui/src/components/sonner.tsx` remove the `useTheme` import and the `const { theme = 'system' } = useTheme();` line; pass `theme="light"` to `<Sonner … />`. Also remove any `shadow-*`/`dark:` classes in the file.

- [ ] **Step 4: Drop the dependency**

```bash
pnpm --filter @iziwellpass/owner remove next-themes
pnpm --filter @iziwellpass/admin remove next-themes
pnpm --filter @iziwellpass/ui remove next-themes
```

- [ ] **Step 5: Verify**

Run: `grep -rn "next-themes\|Hanken\|Geist" apps/owner apps/admin packages/ui --include='*.ts' --include='*.tsx' --include='package.json' | grep -v node_modules`
Expected: no output.
Run: `pnpm --filter @iziwellpass/ui typecheck && (cd apps/owner && pnpm exec tsc --noEmit) && (cd apps/admin && pnpm exec tsc --noEmit)`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add apps/owner apps/admin packages/ui pnpm-lock.yaml && git commit -m "feat(ui,owner,admin): Inter via next/font, drop next-themes and dark mode"
```

---

### Task 3: Component set pass (`packages/ui`)

**Files:**
- Modify: every file in `packages/ui/src/components/*.tsx` and `packages/ui/src/app-shell.tsx` (mechanical strip), plus targeted edits to `button.tsx`, `input.tsx`, `textarea.tsx`, `select.tsx`, `combobox.tsx`, `badge.tsx`, `card.tsx`, `dialog.tsx`, `sheet.tsx`, `popover.tsx`, `dropdown-menu.tsx`, `tooltip.tsx`, `stat.tsx`, `capacity.tsx`, `app-shell.tsx`.

**Interfaces:**
- Produces: the same exported components and variant names; only classes change.

- [ ] **Step 1: Mechanical strip (shadows, dark:, focus rings)**

From `packages/ui`:

```bash
perl -pi -e "s/\s?(dark:[^\s'\"\`]+|focus-visible:ring-[^\s'\"\`]+|focus-visible:border-ring|aria-invalid:ring-[^\s'\"\`]+|shadow-(xs|popover|lg|sm|md))//g" src/components/*.tsx src/app-shell.tsx
pnpm exec prettier --write src/components/*.tsx src/app-shell.tsx
```

Then read the diff (`git diff --stat` and skim `git diff`) for any accidentally mangled string (e.g. a class token that lost its leading space and merged with the previous token). Fix by hand if any.

- [ ] **Step 2: Button**

In `button.tsx`: base string gains `transition-[color,background-color,border-color,opacity] duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)]` (replace the existing `transition-[…] duration-150 ease-out`) and `font-medium` → `font-[750]`. Variants:
- `default`: `'bg-primary text-primary-foreground font-[800] hover:bg-[color:var(--primary-hover)]'`
- `destructive`: `'bg-destructive text-white hover:opacity-90'`
- `outline`: `'border border-current bg-transparent hover:bg-accent'`
- `secondary`: `'bg-secondary text-secondary-foreground hover:bg-accent'`
- `ghost`, `link`: unchanged apart from the strip.

- [ ] **Step 3: Fields leave the pill family**

In `input.tsx`, `textarea.tsx`, `select.tsx` (trigger), `combobox.tsx` (trigger/input): `rounded-full` → `rounded-lg` (= `--radius`, 0.75rem); `bg-transparent` → `bg-card`; keep the hairline `border border-input`; in `input.tsx` replace `[&[type=number]]:font-mono [&[type=number]]:tabular-nums` with `[&[type=number]]:font-numeric`.

- [ ] **Step 4: Badge status tints**

In `badge.tsx` set the variants to:
- `default`: `'bg-primary text-primary-foreground'`
- `secondary`: `'bg-secondary text-secondary-foreground'`
- `outline`: `'border-border text-foreground'`
- `destructive`: `'bg-destructive/18 text-destructive-foreground'`
- `success`: `'bg-success/18 text-success-foreground'`
- `warning`: `'bg-warning/18 text-warning-foreground'`
- `info`: `'bg-info/18 text-info-foreground'`
and base `font-medium` → `font-[650]`. (If a variant name above does not exist yet in the file, add it; if the file has extra variants, restyle them by the same rule.)

- [ ] **Step 5: Surfaces**

- `card.tsx`: `rounded-2xl` → `rounded-xl` (1.25rem), keep `border bg-card`.
- `dialog.tsx`, `sheet.tsx`: overlay class `bg-black/50` (or similar) → `bg-overlay`; content `rounded-*` → `rounded-xl`, keep border.
- `popover.tsx`, `dropdown-menu.tsx`, `tooltip.tsx`, `sonner.tsx` toast class: ensure `border bg-popover` (or `bg-card`) and `rounded-lg`; no shadow.

- [ ] **Step 6: App shell**

In `app-shell.tsx`:
- Wordmark text: add `font-[800] tracking-[-0.04em]`; the avatar/wordmark chip keeps `bg-primary text-primary-foreground` (drop `font-mono` if present → `font-numeric`).
- Group label `<p className="px-4 pb-1 text-xs font-medium text-muted-foreground">` → `<p className="eyebrow px-4 pb-1 text-muted-foreground">`.
- Nav item classes: replace the active/inactive pair with
  - active: `'relative font-[800] text-foreground after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:rounded-pill after:bg-current after:content-[""]'`
  - inactive: `'font-[650] text-foreground opacity-[0.62] transition-opacity duration-[360ms] hover:opacity-100'`
  (the `bg-primary` pill treatment is gone).

- [ ] **Step 7: Stat and capacity**

- `stat.tsx`: container `rounded-2xl` → `rounded-xl`; value `font-mono text-3xl font-semibold tabular-nums tracking-tight` → `font-numeric text-3xl tracking-tight`; the label `<p>` gets `eyebrow text-muted-foreground` (replace its size/weight classes).
- `capacity.tsx`: `font-mono text-xs tabular-nums` → `font-numeric text-xs`.

- [ ] **Step 8: Verify**

```bash
grep -rn "shadow-xs\|shadow-popover\|shadow-lg\|font-mono\|dark:" packages/ui/src || echo CLEAN
pnpm --filter @iziwellpass/ui typecheck && pnpm --filter @iziwellpass/ui lint && pnpm --filter @iziwellpass/ui test
```
Expected: `CLEAN`; gates green (fix any test that asserted a removed class by asserting the new one).

- [ ] **Step 9: Commit**

```bash
git add packages/ui && git commit -m "feat(ui): flat studio documentaire component set — pills, hairlines, tint badges, nav underline"
```

---

### Task 4: Owner app pass

**Files:**
- Modify: every owner file using `font-mono`, `shadow-*`, `dark:` (`grep -rl`), `apps/owner/components/auth-card.tsx`, `apps/owner/components/auth-card-skeleton.tsx`, `apps/owner/components/wordmark.tsx`, page-title elements (`grep -rn "text-2xl font-semibold" apps/owner/app`).

- [ ] **Step 1: Mechanical replacements**

From `apps/owner`:

```bash
perl -pi -e 's/\bfont-mono\b/font-numeric/g; s/\s?tabular-nums\b//g; s/\s?(dark:[^\s'"'"'"\`]+|shadow-(xs|popover|lg|sm|md))//g' $(grep -rlE "font-mono|shadow-(xs|popover|lg|sm|md)|dark:" app components lib)
pnpm exec prettier --write $(git diff --name-only)
```

- [ ] **Step 2: Mastheads (The Two Places Rule: owner = argile)**

- `auth-card.tsx`: `bg-primary px-6 pt-6 pb-5 text-primary-foreground` → `bg-argile px-6 pt-6 pb-5 text-foreground`.
- `auth-card-skeleton.tsx`: `bg-primary` → `bg-argile`; `bg-primary-foreground/15` → `bg-foreground/15`.
- `wordmark.tsx`: the chip keeps `bg-primary text-primary-foreground`; `font-mono` already became `font-numeric`; add `font-[800]` to the wordmark text if it renders one.

- [ ] **Step 3: Headline scale and eyebrows**

- Page titles `text-2xl font-semibold` → `text-2xl font-[750] tracking-[-0.035em]`.
- Section overlines that read as small muted labels above a list/card group (e.g. `text-xs font-medium text-muted-foreground` used as a heading) → `eyebrow text-muted-foreground`. Limit to labels that introduce a section; do not touch table headers or helper text.

- [ ] **Step 4: Verify**

```bash
grep -rn "shadow-xs\|shadow-popover\|shadow-lg\|font-mono\|dark:\|next-themes" apps/owner/app apps/owner/components apps/owner/lib || echo CLEAN
cd apps/owner && pnpm exec tsc --noEmit && pnpm exec eslint . && pnpm exec vitest run
```
Expected: `CLEAN`; green.

- [ ] **Step 5: Commit**

```bash
git add apps/owner && git commit -m "feat(owner): studio documentaire pass — argile masthead, numeric figures, eyebrows"
```

---

### Task 5: Admin app pass (incl. the /design preview section)

**Files:**
- Modify: admin files using `font-mono`, `shadow-*`, `dark:`, `uppercase` (`grep -rl`), `apps/admin/components/auth-card.tsx`, `apps/admin/app/design/**`.

- [ ] **Step 1: Mechanical replacements**

Same commands as Task 4 Step 1, run from `apps/admin`.

- [ ] **Step 2: Masthead (admin = platform-internal, stays encre)**

`apps/admin/components/auth-card.tsx` keeps `bg-primary … text-primary-foreground` (now encre/blanc). No change unless a shadow/dark class remained.

- [ ] **Step 3: Design preview section**

- Any literal « Le comptoir calme » → « Le studio documentaire ».
- Specimen/section labels using `text-xs tracking-wider uppercase` or `text-sm font-medium tracking-wide uppercase` → `eyebrow` (drop the size/tracking/weight classes; keep color classes). `route-bar.tsx` tabs: `font-numeric text-xs tracking-wider uppercase` → `eyebrow` and remove the leftover `focus-visible:ring-*` classes.
- `foundations/page.tsx` hand-written button sample: `bg-primary … font-medium` → add `font-[800]`; remove `shadow`.
- Leave the `passwordUppercase` i18n key alone (it is validation copy, not styling).

- [ ] **Step 4: Verify**

```bash
grep -rn "shadow-xs\|shadow-popover\|shadow-lg\|font-mono\|dark:\|next-themes\|comptoir calme" apps/admin/app apps/admin/components || echo CLEAN
cd apps/admin && pnpm exec tsc --noEmit && pnpm exec eslint . && pnpm exec vitest run
```
Expected: `CLEAN`; green.

- [ ] **Step 5: Commit**

```bash
git add apps/admin && git commit -m "feat(admin): studio documentaire pass — eyebrows, numeric figures, design preview relabel"
```

---

### Task 6: Full gates and grep guard

**Files:**
- Create: `scripts/check-design-system.mjs`
- Modify: root `package.json` (add script `"check:design": "node scripts/check-design-system.mjs"`)

- [ ] **Step 1: Write the guard**

```js
// Fails when a forbidden pattern from DESIGN.md reappears in the web layer.
import { execSync } from 'node:child_process';

const patterns = ['shadow-xs', 'shadow-popover', 'shadow-lg', 'font-mono', 'dark:', 'next-themes', 'Hanken', 'Geist'];
const roots = ['packages/ui/src', 'apps/owner/app', 'apps/owner/components', 'apps/owner/lib', 'apps/admin/app', 'apps/admin/components'];
let failed = false;
for (const p of patterns) {
  try {
    const out = execSync(`grep -rn --include='*.ts' --include='*.tsx' --include='*.css' -F ${JSON.stringify(p)} ${roots.join(' ')}`, { encoding: 'utf8' });
    if (out.trim()) {
      failed = true;
      console.error(`forbidden pattern "${p}":\n${out}`);
    }
  } catch {
    // grep exit 1 = no match = good
  }
}
if (failed) process.exit(1);
console.log('design-system guard: clean');
```

- [ ] **Step 2: Run everything**

```bash
node scripts/check-design-system.mjs
pnpm build && pnpm typecheck && pnpm lint && pnpm test
```
Expected: guard clean; four gates green.

- [ ] **Step 3: Commit**

```bash
git add scripts/check-design-system.mjs package.json && git commit -m "chore: design-system grep guard"
```

Screenshot spot-checks (owner login/dashboard/members/front desk; admin login/tenants) are performed by the controller against the worktree's dev servers before the finishing menu.
