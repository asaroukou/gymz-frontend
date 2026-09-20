# « Le comptoir clair » SP-A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `packages/ui`, `apps/owner` and `apps/admin` from « Le studio documentaire » to the canvas system « Le comptoir clair »: white page, `#fafafa` side column, one dark control, grey pills for active states, five pastel tints, hairlines never boxes, Inter 400/500/600, zero elevation.

**Architecture:** Re-skin in place with unchanged component props. Tokens are rewritten first (with tests and the grep guard extended), then every primitive's classes, then three new primitives plus a shared Wordmark and tint helper, then the side-column shell, then each app's layout, auth card and mechanical sweeps. Screens keep their structure; hub and working-screen layouts are SP-B and SP-C.

**Tech Stack:** pnpm + Turborepo, Next 15 (owner, admin), React 19, Tailwind v4 (`@theme inline` in `packages/ui/src/styles/globals.css`), Radix via `radix-ui`, cva, lucide-react, vitest + @testing-library/react, Prettier, ESLint.

**Spec:** `docs/superpowers/specs/2026-09-20-comptoir-clair-design-system-design.md` (read it first; §3–§8 hold the exact values). Visual references: `docs/design-refs/comptoir-clair/*.png` (`mMlyd.png` = components sheet, `ssgpT.png` = dashboard, `xLxJY.png` = members, `oHqxA.png`/`F8fDM.png` = mobile shell, `TmgT0.png` = dialog, `T9KwQ.png` = login).

## Global Constraints

- Hex is canonical in `globals.css`. No `color-mix`, no OKLCH, no `.dark`, no shadow tokens, no `--font-mono`, no `--neutral-*`.
- Zero after this plan across `packages/ui/src`, `apps/owner/{app,components,lib}`, `apps/admin/{app,components}`: `eyebrow`, `font-[650]`, `font-[750]`, `font-[800]`, `font-bold`, `uppercase`, `tracking-wide`, `bg-argile`, `bg-foret`, `text-foret`, `text-argile`, `ocre`, `sauge`, `eucalyptus`, `box-shadow`, `shadow-sm`, `shadow-md`, plus the existing guard list (`shadow-xs|shadow-popover|shadow-lg`, `font-mono`, `dark:`, `next-themes`, `Hanken`, `Geist`, `--neutral-`, `focus-visible:ring`).
- Font weights in code: `font-normal` (400), `font-medium` (500), `font-semibold` (600) only. Never `font-[NNN]`.
- Focus: the global `:focus-visible { outline: 3px solid var(--ring); outline-offset: 0.25rem }` rule. No `outline-none` / `outline-hidden` on focusable elements, no ring classes.
- Borders only where the canvas draws them: command bar, Input/Select/Textarea, `outline` button and badge, venue switcher, unchecked checkbox, hairline rows (`border-b border-border`). No border on Card, Dialog, Sheet, Popover, DropdownMenu, Select content, Combobox list, Tooltip, Alert, StatPanel, Skeleton, Tile.
- Copy in message catalogs is never changed; uppercase was CSS-only and is gone. French-first, fr/en parity untouched.
- `@iziwellpass/ui` subpath imports only (`@iziwellpass/ui/components/<name>`); `verbatimModuleSyntax`; `noUncheckedIndexedAccess`; Prettier on touched files; quote paths that contain `()` or `[]`.
- Never hand-edit `packages/api/src/generated/**`. Never run `pnpm build` while a dev server for this checkout is up (work in a worktree).
- Gates from the repo root: `pnpm check:design && pnpm build && pnpm typecheck && pnpm lint && pnpm test`.
- Every commit message ends with a blank line and `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

---

### Task 1: Tokens, text scale, utilities, guard, token and weight tests

**Files:**
- Modify: `packages/ui/src/styles/globals.css` (whole file)
- Modify: `packages/ui/src/styles/tokens.test.ts` (whole file)
- Create: `packages/ui/src/styles/weights.test.ts`
- Modify: `scripts/check-design-system.mjs:5-17` (pattern list)

**Interfaces:**
- Produces: CSS tokens and Tailwind utilities used by every later task: colours `background card popover side foreground primary primary-foreground primary-hover secondary secondary-foreground muted muted-foreground muted-strong accent accent-foreground border input ring overlay danger success success-foreground warning warning-foreground destructive destructive-foreground info info-foreground tint-bleu tint-vert tint-sable tint-rose tint-lavande wash chart-1..5 chart-grid chart-track`; radii `rounded-sm (0.375rem) rounded-md (0.5rem) rounded-lg (1.25rem) rounded-xl (1.5rem) rounded-2xl (1.75rem) rounded-pill`; text `text-xs text-sm text-md text-base text-lg text-xl text-2xl text-3xl`; utility `font-numeric`.

- [ ] **Step 1: Write the failing token test**

Replace `packages/ui/src/styles/tokens.test.ts` with:

```ts
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// « Le comptoir clair » values (DESIGN.md, canvas variables). The test reads
// globals.css from disk and checks the *parsed* values against this table,
// then measures WCAG contrast on what the stylesheet actually declares.
const FOND = '#ffffff';
const COTE = '#fafafa';
const ENCRE = '#1f1f1f';
const PILULE = '#eceef2';
const PILULE_SURVOL = '#e3e6ec';
const ATTENUE = '#5f6368';
const ATTENUE_FORT = '#4d5156';
const FILET = '#dcdcdc';
const TINTS: Record<string, string> = {
  '--tint-bleu': '#e8eefb',
  '--tint-vert': '#e9f3ee',
  '--tint-sable': '#fbf1dc',
  '--tint-rose': '#f6ecf2',
  '--tint-lavande': '#eee9f8',
};
const STATUS: Array<[tint: string, text: string]> = [
  ['--success', '--success-foreground'],
  ['--warning', '--warning-foreground'],
  ['--destructive', '--destructive-foreground'],
  ['--info', '--info-foreground'],
];

/** Every `--token: #hex` the spec pins, by name. */
const EXPECTED_HEX: Record<string, string> = {
  '--background': FOND,
  '--card': FOND,
  '--card-foreground': ENCRE,
  '--popover': FOND,
  '--popover-foreground': ENCRE,
  '--side': COTE,
  '--foreground': ENCRE,
  '--primary': ENCRE,
  '--primary-foreground': FOND,
  '--primary-hover': '#333333',
  '--secondary': PILULE,
  '--secondary-foreground': ENCRE,
  '--muted': PILULE,
  '--muted-foreground': ATTENUE,
  '--muted-strong': ATTENUE_FORT,
  '--accent': PILULE_SURVOL,
  '--accent-foreground': ENCRE,
  '--border': FILET,
  '--input': FILET,
  '--ring': ENCRE,
  '--danger': '#b23a2a',
  '--success': '#e9f3ee',
  '--success-foreground': '#1d5c3c',
  '--warning': '#fbf1dc',
  '--warning-foreground': '#7a5c10',
  '--destructive': '#fbe9e7',
  '--destructive-foreground': '#8f2f22',
  '--info': '#e8eefb',
  '--info-foreground': '#2c4f8a',
  ...TINTS,
  '--wash': '#dfe8fa',
};

type RGB = [number, number, number];

const CSS = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'globals.css'), 'utf-8');

/** The `:root { … }` declaration block, as `--name` → raw value. */
function parseRootBlock(css: string): Map<string, string> {
  const start = css.indexOf(':root {');
  if (start === -1) throw new Error('globals.css: no `:root {` block');
  const end = css.indexOf('\n}', start);
  if (end === -1) throw new Error('globals.css: unterminated `:root {` block');
  const body = css.slice(start + ':root {'.length, end).replace(/\/\*[^*]*\*\//g, '');
  const tokens = new Map<string, string>();
  for (const line of body.split(';')) {
    const match = /^\s*(--[\w-]+)\s*:\s*(.+?)\s*$/s.exec(line);
    if (match) tokens.set(match[1]!, match[2]!);
  }
  return tokens;
}

const TOKENS = parseRootBlock(CSS);
const HEX = /^#[0-9a-f]{6}$/i;

function rgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function opaque(name: string): RGB {
  const value = TOKENS.get(name);
  if (value === undefined) throw new Error(`globals.css: missing token \`${name}\``);
  const variable = /^var\((--[\w-]+)\)$/.exec(value);
  if (variable) return opaque(variable[1]!);
  if (!HEX.test(value)) throw new Error(`globals.css: \`${name}\` is not an opaque hex`);
  return rgb(value);
}
function lum([r, g, b]: RGB): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a: RGB, b: RGB): number {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}
const AA = 4.5;

describe('comptoir clair tokens (globals.css is the source of truth)', () => {
  it('every hex token matches the spec value', () => {
    const parsed = Object.fromEntries(
      [...TOKENS].filter(([, value]) => HEX.test(value)).map(([name, value]) => [name, value]),
    );
    expect(parsed).toEqual(EXPECTED_HEX);
  });
  it('the scrim is encre at 25%', () => {
    expect(TOKENS.get('--overlay')).toBe('rgb(31 31 31 / 25%)');
  });
  it('charts reuse ink, atténué and the status text stops', () => {
    expect(TOKENS.get('--chart-1')).toBe('var(--primary)');
    expect(TOKENS.get('--chart-2')).toBe('var(--muted-foreground)');
    expect(TOKENS.get('--chart-3')).toBe('var(--info-foreground)');
    expect(TOKENS.get('--chart-4')).toBe('var(--success-foreground)');
    expect(TOKENS.get('--chart-5')).toBe('var(--warning-foreground)');
  });
});

describe('comptoir clair contrast (WCAG AA ≥ 4.5)', () => {
  it('encre on fond, côté and pilule', () => {
    for (const surface of ['--background', '--side', '--secondary']) {
      expect(contrast(opaque('--foreground'), opaque(surface))).toBeGreaterThanOrEqual(AA);
    }
  });
  it('atténué on fond and côté', () => {
    for (const surface of ['--background', '--side']) {
      expect(contrast(opaque('--muted-foreground'), opaque(surface))).toBeGreaterThanOrEqual(AA);
    }
  });
  it.each([...Object.keys(TINTS), '--secondary'])('atténué fort on %s', (surface) => {
    expect(contrast(opaque('--muted-strong'), opaque(surface))).toBeGreaterThanOrEqual(AA);
  });
  it.each(STATUS)('%s text stop on its tint', (tintName, textName) => {
    expect(contrast(opaque(textName), opaque(tintName))).toBeGreaterThanOrEqual(AA);
  });
  it('fond on encre (primary button, toast, tooltip)', () => {
    expect(contrast(opaque('--primary-foreground'), opaque('--primary'))).toBeGreaterThanOrEqual(AA);
  });
});
```

- [ ] **Step 2: Write the failing weight test**

Create `packages/ui/src/styles/weights.test.ts`:

```ts
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The Light Heading Rule: Inter at 400, 500 or 600 only. Arbitrary weights
// (`font-[750]`) and Tailwind's bold tiers are design errors in this system.
const SRC_ROOT = join(__dirname, '..');
const FILES = [
  ...readdirSync(join(SRC_ROOT, 'components'))
    .filter((name) => name.endsWith('.tsx'))
    .sort()
    .map((name) => join('components', name)),
  'app-shell.tsx',
  'styles/globals.css',
];

describe('font weight guard', () => {
  it('sweeps every component in the package', () => {
    expect(FILES.length).toBeGreaterThan(20);
  });
  it.each(FILES)('%s uses only 400/500/600', (relativePath) => {
    const contents = readFileSync(join(SRC_ROOT, relativePath), 'utf-8');
    expect(contents).not.toMatch(/\bfont-\[\d+\]|\bfont-(bold|extrabold|black)\b/);
    expect(contents).not.toMatch(/font-weight:\s*(?!400|500|600)\d+/);
  });
});
```

- [ ] **Step 3: Run both tests to verify they fail**

Run: `pnpm --filter @iziwellpass/ui exec vitest run src/styles/tokens.test.ts src/styles/weights.test.ts`
Expected: FAIL — hex table mismatch (`--background` is `#f2eee5`), overlay mismatch; weights test fails on `globals.css` (`font-weight: 750` in `eyebrow`, `650` in `font-numeric`) and on components carrying `font-[650]`.

- [ ] **Step 4: Rewrite globals.css**

Replace `packages/ui/src/styles/globals.css` with:

```css
@import 'tailwindcss';

/* Scan this package's own source for class names when imported by an app. */
@source '../';

/* ============================================================
   IziWellPass — « Le comptoir clair » token layer
   White page, côté side column, one dark control, grey pills,
   five pastel tints, hairlines never boxes, Inter 400/500/600,
   zero elevation. Hex is canonical (DESIGN.md, screens.pen).
   ============================================================ */

:root {
  /* Page and ink */
  --background: #ffffff; /* fond */
  --card: #ffffff;
  --card-foreground: #1f1f1f;
  --popover: #ffffff;
  --popover-foreground: #1f1f1f;
  --side: #fafafa; /* côté: side column, drawer, floating menus */
  --foreground: #1f1f1f; /* encre */

  /* The one dark control (The One Dark Rule) */
  --primary: #1f1f1f;
  --primary-foreground: #ffffff;
  --primary-hover: #333333;

  /* Pills and secondary text */
  --secondary: #eceef2; /* pilule */
  --secondary-foreground: #1f1f1f;
  --muted: #eceef2;
  --muted-foreground: #5f6368; /* atténué */
  --muted-strong: #4d5156; /* atténué fort: on tints and pills */
  --accent: #e3e6ec; /* pilule survol */
  --accent-foreground: #1f1f1f;
  --border: #dcdcdc; /* filet */
  --input: #dcdcdc;
  --ring: #1f1f1f;
  --overlay: rgb(31 31 31 / 25%); /* scrim */
  --danger: #b23a2a; /* invalid field outline only */

  /* Status: pale tint under the text stop, never a solid fill */
  --success: #e9f3ee;
  --success-foreground: #1d5c3c;
  --warning: #fbf1dc;
  --warning-foreground: #7a5c10;
  --destructive: #fbe9e7;
  --destructive-foreground: #8f2f22;
  --info: #e8eefb;
  --info-foreground: #2c4f8a;

  /* Tints for glanceable content (The Tile Rule), rotating by position */
  --tint-bleu: #e8eefb;
  --tint-vert: #e9f3ee;
  --tint-sable: #fbf1dc;
  --tint-rose: #f6ecf2;
  --tint-lavande: #eee9f8;
  --wash: #dfe8fa; /* lavis: the one radial wash behind a hub heading */

  /* Charts: ink first, then the dark status stops (readable on white) */
  --chart-1: var(--primary);
  --chart-2: var(--muted-foreground);
  --chart-3: var(--info-foreground);
  --chart-4: var(--success-foreground);
  --chart-5: var(--warning-foreground);
  --chart-grid: var(--border);
  --chart-track: var(--secondary);

  /* Shape and motion */
  --radius-sm: 0.375rem; /* checkbox */
  --radius-md: 0.5rem; /* wordmark square */
  --radius-lg: 1.25rem; /* textarea, floating menus, alert rows */
  --radius-xl: 1.5rem; /* tiles */
  --radius-2xl: 1.75rem; /* dialog */
  --radius-pill: 9999px; /* every control */
  --motion-standard: 200ms ease-out;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-side: var(--side);
  --color-overlay: var(--overlay);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary-hover: var(--primary-hover);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted-strong: var(--muted-strong);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-danger: var(--danger);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-info: var(--info);
  --color-info-foreground: var(--info-foreground);
  --color-tint-bleu: var(--tint-bleu);
  --color-tint-vert: var(--tint-vert);
  --color-tint-sable: var(--tint-sable);
  --color-tint-rose: var(--tint-rose);
  --color-tint-lavande: var(--tint-lavande);
  --color-wash: var(--wash);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-chart-grid: var(--chart-grid);
  --color-chart-track: var(--chart-track);

  --radius-sm: var(--radius-sm);
  --radius-md: var(--radius-md);
  --radius-lg: var(--radius-lg);
  --radius-xl: var(--radius-xl);
  --radius-2xl: var(--radius-2xl);
  --radius-3xl: var(--radius-xl);
  --radius-pill: var(--radius-pill);

  /* Canvas type scale (px at the 16px root): 12 13 14 15 16 22 32 44 */
  --text-xs: 0.75rem;
  --text-xs--line-height: 1.3;
  --text-sm: 0.8125rem;
  --text-sm--line-height: 1.3;
  --text-md: 0.875rem;
  --text-md--line-height: 1.4;
  --text-base: 0.9375rem;
  --text-base--line-height: 1.5;
  --text-lg: 1rem;
  --text-lg--line-height: 1.3;
  --text-xl: 1.375rem;
  --text-xl--line-height: 1.2;
  --text-xl--letter-spacing: -0.02em;
  --text-2xl: 2rem;
  --text-2xl--line-height: 1.1;
  --text-2xl--letter-spacing: -0.03em;
  --text-3xl: 2.75rem;
  --text-3xl--line-height: 1.1;
  --text-3xl--letter-spacing: -0.03em;

  --font-sans: var(--font-inter), Inter, ui-sans-serif, system-ui, sans-serif;
}

/* Every figure someone compares or reads back (The Tabular Rule). */
@utility font-numeric {
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-base text-foreground font-sans antialiased;
  }
  /* One focus convention for everything: a 3px ink outline, offset so it
     never fights a pill's outline and stays visible on the dark pill. */
  :focus-visible {
    outline: 3px solid var(--ring);
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
  animation: checkin-arrive 1100ms ease-out;
}
```

Note: the `color-mix` inside `@keyframes` is allowed (it is not a token); the `:root` block has none.

- [ ] **Step 5: Extend the guard**

In `scripts/check-design-system.mjs`, replace the `patterns` array with:

```js
const patterns = [
  'shadow-xs',
  'shadow-sm',
  'shadow-md',
  'shadow-popover',
  'shadow-lg',
  'box-shadow',
  'font-mono',
  'dark:',
  'next-themes',
  'Hanken',
  'Geist',
  // The OKLCH neutral ramp is gone; a reference to it paints transparent.
  '--neutral-',
  // Focus is one global `:focus-visible` outline, never a per-component ring.
  'focus-visible:ring',
  // « Le comptoir clair »: no uppercase, no tracked labels, no heavy weights,
  // none of the retired studio documentaire surfaces.
  'eyebrow',
  'font-[650]',
  'font-[750]',
  'font-[800]',
  'font-bold',
  'uppercase',
  'tracking-wide',
  'bg-argile',
  'bg-foret',
  'text-foret',
  'text-argile',
  'ocre',
  'sauge',
  'eucalyptus',
];
```

(The guard will report hits until Tasks 2–7 land; that is expected. Task 8 runs it as a gate.)

- [ ] **Step 6: Run the two tests**

Run: `pnpm --filter @iziwellpass/ui exec vitest run src/styles/tokens.test.ts src/styles/weights.test.ts`
Expected: tokens.test.ts PASS (all). weights.test.ts: `globals.css` passes; component files with `font-[650]` etc. still FAIL — that is Task 2/3's job. Report the failing file list in the task report; do not edit components in this task.

- [ ] **Step 7: Typecheck and lint the package, then commit**

Run: `pnpm --filter @iziwellpass/ui typecheck && pnpm --filter @iziwellpass/ui lint`
Expected: clean (CSS changes do not affect tsc).

```bash
git add packages/ui/src/styles/globals.css packages/ui/src/styles/tokens.test.ts packages/ui/src/styles/weights.test.ts scripts/check-design-system.mjs
git commit -m "feat(ui): comptoir clair token layer — white page, côté side, pills, tints, canvas type scale"
```

---

### Task 2: Control primitives (button, badge, tabs, fields, checkbox, switch, otp)

**Files:**
- Modify: `packages/ui/src/components/button.tsx`, `badge.tsx`, `tabs.tsx`, `input.tsx`, `select.tsx`, `textarea.tsx`, `label.tsx`, `form.tsx`, `checkbox.tsx`, `switch.tsx`, `input-otp.tsx`
- Test: existing `checkbox.test.tsx`, `tabs.test.tsx`, `input-otp.test.tsx`, `focus.test.ts`, `weights.test.ts`

**Interfaces:**
- Consumes: Task 1 tokens.
- Produces: `Button` gains size `icon-md` (40px) used by `CommandBar` in Task 4; every other prop name is unchanged.

- [ ] **Step 1: Button**

In `button.tsx` replace the whole `buttonVariants` cva with:

```ts
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full text-base font-medium whitespace-nowrap transition-colors duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-danger [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        secondary: 'bg-secondary text-foreground hover:bg-accent',
        outline: 'border border-border bg-transparent text-foreground hover:bg-side',
        ghost: 'text-foreground hover:bg-side',
        destructive: 'bg-destructive text-destructive-foreground hover:brightness-95',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        // Front-desk first: 44px pills everywhere, no desktop step-down.
        default: 'h-11 px-5 has-[>svg]:px-4',
        lg: 'h-11 px-5 has-[>svg]:px-4',
        sm: 'h-9 gap-2 px-4 text-md has-[>svg]:px-3',
        xs: "h-7 gap-1 px-3 text-sm [&_svg:not([class*='size-'])]:size-3.5",
        icon: 'size-11',
        'icon-md': 'size-10',
        'icon-sm': 'size-9',
        'icon-xs': "size-7 [&_svg:not([class*='size-'])]:size-3.5",
        'icon-lg': 'size-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);
```

- [ ] **Step 2: Badge**

In `badge.tsx` replace the whole `badgeVariants` cva with:

```ts
const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors [&>svg]:pointer-events-none [&>svg]:size-3.5',
  {
    variants: {
      variant: {
        // Neutre: there is no dark badge in this system.
        default: 'bg-secondary text-muted-strong',
        secondary: 'bg-secondary text-muted-strong',
        destructive: 'bg-destructive text-destructive-foreground',
        success: 'bg-success text-success-foreground',
        warning: 'bg-warning text-warning-foreground',
        info: 'bg-info text-info-foreground',
        outline: 'border border-border text-muted-strong',
        ghost: 'text-muted-strong [a&]:hover:bg-side',
        link: 'text-primary underline-offset-4 [a&]:hover:underline',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);
```

- [ ] **Step 3: Tabs**

In `tabs.tsx`: `TabsList` class → `'inline-flex w-fit items-center gap-1'`. `TabsTrigger` class → `"inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-[18px] text-base font-normal whitespace-nowrap text-muted-foreground transition-colors disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-secondary data-[state=active]:font-semibold data-[state=active]:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]"`. Run `pnpm --filter @iziwellpass/ui exec vitest run src/components/tabs.test.tsx`; if an assertion targets an old class, update the assertion to the new class (the test checks behaviour, the class is incidental).

- [ ] **Step 4: Input, Select, Textarea, Label, Form**

`input.tsx`: base class → `'flex h-12 w-full min-w-0 rounded-full border border-input bg-card px-[18px] text-base text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-base file:font-medium [&[type=number]]:font-numeric'` (keep any existing `[&[type=number]]:font-numeric`; drop `md:text-sm`, `lg:h-9`, and any ring/outline classes).

`select.tsx` trigger (line 34): → `"flex w-fit items-center justify-between gap-2 rounded-full border border-input bg-card px-[18px] text-base whitespace-nowrap transition-colors focus-visible:border-foreground disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger data-[placeholder]:text-muted-foreground data-[size=default]:h-12 data-[size=sm]:h-9 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px] [&_svg:not([class*='text-'])]:text-muted-foreground"` (drop `hover:bg-accent` and `lg:data-[size=default]:h-9`). Select content (line 64): replace `rounded-lg border bg-popover` with `rounded-lg bg-side` (no border). Select item (line 109): replace `rounded-sm py-1.5 pr-8 pl-2 text-sm` with `h-10 rounded-full py-0 pr-8 pl-3.5 text-base` and `focus:bg-accent` with `focus:bg-secondary`. Select label (line 94): `text-xs` → `text-sm`.

`textarea.tsx`: base → `'flex field-sizing-content min-h-[96px] w-full rounded-lg border border-input bg-card px-[18px] py-3.5 text-base leading-relaxed transition-colors placeholder:text-muted-foreground focus-visible:border-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'`, second string `'aria-invalid:border-danger'`.

`label.tsx`: → `'flex items-center gap-2 text-sm leading-none font-medium text-muted-strong select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50'`.

`form.tsx`: line 89 `data-[error=true]:text-destructive` → `data-[error=true]:text-destructive-foreground`; line 135 `text-sm text-destructive` → `text-sm text-destructive-foreground`.

- [ ] **Step 5: Checkbox, Switch, InputOTP**

`checkbox.tsx` line 14: `'peer size-5 shrink-0 rounded-sm border border-input bg-card'` (keep lines 15–16; the check icon inside stays white on `bg-primary`).

`switch.tsx` line 13: `'peer inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-border'`; thumb (line 21): `'pointer-events-none block size-5 rounded-full bg-card transition-transform data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-0.5'`.

`input-otp.tsx` line 52: `'relative grid size-12 place-items-center rounded-full border border-input bg-card font-numeric text-lg transition-colors data-[active=true]:z-10 data-[active=true]:border-foreground'` (the `outline-none` and ring classes go; the slot is a decorative div, the real input is the library's hidden one).

Then in `packages/ui/src/styles/focus.test.ts` delete the `EXEMPT` constant and its comment, and change the filter to `.filter((name) => name.endsWith('.tsx'))`.

- [ ] **Step 6: Run the package tests and typecheck**

Run: `pnpm --filter @iziwellpass/ui exec vitest run && pnpm --filter @iziwellpass/ui typecheck && pnpm --filter @iziwellpass/ui lint`
Expected: `focus.test.ts` PASS (input-otp now clean); `weights.test.ts` still fails only on files owned by Task 3 (`card.tsx`, `dialog.tsx`, `sheet.tsx`, `empty.tsx`, `app-shell.tsx`) — list them in the report; every other test PASS. Fix any lint/prettier issue in the touched files.

- [ ] **Step 7: Verify and commit**

Run: `grep -nE 'font-\[|lg:h-|lg:size-|lg:data|ring-|outline-none|md:text-sm' packages/ui/src/components/{button,badge,tabs,input,select,textarea,label,form,checkbox,switch,input-otp}.tsx`
Expected: no output.

```bash
git add packages/ui/src/components packages/ui/src/styles/focus.test.ts
git commit -m "feat(ui): comptoir clair controls — 44px pills, tint badges, bare tabs, 48px fields"
```

---

### Task 3: Surface primitives (card, stat, table, overlays, feedback, data)

**Files:**
- Modify: `packages/ui/src/components/card.tsx`, `stat.tsx`, `table.tsx`, `dialog.tsx`, `sheet.tsx`, `popover.tsx`, `dropdown-menu.tsx`, `combobox.tsx`, `tooltip.tsx`, `sonner.tsx`, `alert.tsx`, `skeleton.tsx`, `progress.tsx`, `avatar.tsx`, `separator.tsx`, `empty.tsx`, `capacity.tsx`
- Test: existing `empty.test.tsx`, `progress.test.tsx`, `weights.test.ts`, `focus.test.ts`

**Interfaces:**
- Consumes: Task 1 tokens.
- Produces: `StatPanel`/`Stat` props unchanged (`label`, `value`, `isLoading`, `className`); `Progress` keeps its existing `full`/threshold props if any; `Avatar` unchanged.

- [ ] **Step 1: Card and Stat**

`card.tsx`: `Card` → `'flex flex-col gap-6 text-card-foreground'`; `CardHeader` → `'@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 has-data-[slot=card-action]:grid-cols-[1fr_auto]'`; `CardTitle` → `'text-xl font-medium'` (the xl step already carries 1.2 line-height and −0.02em); `CardDescription` → `'text-base text-muted-foreground'`; `CardContent` → `''` (just `cn(className)`); `CardFooter` → `'flex items-center'`.

`stat.tsx`: replace the two components' JSX with:

```tsx
export function StatPanel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('flex flex-wrap justify-center divide-x divide-border', className)}>
      {children}
    </div>
  );
}

export function Stat({ label, value, isLoading, className }: { label: string; value: string | null; isLoading?: boolean; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center gap-1 px-5 md:px-10', className)}>
      {isLoading ? (
        <Skeleton className="h-9 w-16" />
      ) : (
        <p className="font-numeric text-2xl font-medium">{value ?? '—'}</p>
      )}
      <p className="text-center text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
```

Update the two doc comments to describe a hairline strip (numbers over labels, vertical hairlines between siblings, no box).

- [ ] **Step 2: Table**

`table.tsx`: line 12 `text-sm` → `text-base`; line 37 (footer) → `'border-t font-medium [&>tr]:last:border-b-0'`; line 48 (row) → `'border-b border-border transition-colors data-[state=selected]:bg-side'`; line 65 (head) → `'h-11 px-3 text-left align-middle text-sm font-medium whitespace-nowrap text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]'`; line 85 (cell) → `'px-3 py-3 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]'`; line 98 (caption) `text-sm` stays.

- [ ] **Step 3: Dialog and Sheet**

`dialog.tsx` line 59: replace `gap-4 rounded-xl border bg-card p-6` with `gap-6 rounded-2xl bg-card p-8`; close button (line 75): `'absolute top-6 right-6 grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-side disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]'`; footer (line 107) `gap-2` → `gap-2.5`; title (line 124) → `'text-[1.5rem] leading-[1.2] font-medium'`; description (line 137) → `'text-base text-muted-foreground'`.

`sheet.tsx` line 66: `'fixed z-50 flex flex-col gap-4 bg-card transition ease-in-out …'` (unchanged) and in lines 68/70/72/74 delete `border-l`, `border-r`, `border-b`, `border-t`; right/left width: `w-3/4 … sm:max-w-sm` → `w-[460px] max-w-full`; close (line 81) same classes as the dialog close above; title (line 115) → `'text-[1.5rem] leading-[1.2] font-medium text-foreground'`; header (95) `p-4` → `p-8 pb-0`; footer (105) `p-4` → `p-8 pt-0`; description (128) → `'text-base text-muted-foreground'`.

- [ ] **Step 4: Floating surfaces**

`popover.tsx` line 33: `rounded-lg border bg-popover p-4` → `rounded-lg bg-side p-4`.
`dropdown-menu.tsx` line 36 and 204: `rounded-lg border bg-popover p-1` → `rounded-lg bg-side p-2`; items (64, 82, 113, 185): `rounded-sm` → `rounded-full`, `px-2 py-1.5 text-sm` → `h-10 px-3.5 py-0 text-base` (keep `pl-8` variants as `pl-9`), `focus:bg-accent` → `focus:bg-secondary`, `data-[state=open]:bg-accent` → `data-[state=open]:bg-secondary`, `data-[variant=destructive]:text-destructive` → `data-[variant=destructive]:text-destructive-foreground`, `data-[variant=destructive]:focus:bg-destructive/10` → `data-[variant=destructive]:focus:bg-destructive`, `data-[variant=destructive]:focus:text-destructive` → `data-[variant=destructive]:focus:text-destructive-foreground`, `*:[svg]:text-destructive!` → `*:[svg]:text-destructive-foreground!`; drop `min-h-11`/`lg:min-h-0`; label (139) `text-sm font-medium` → `text-sm font-medium text-muted-foreground`; shortcut (162) drop `tracking-widest`.
`combobox.tsx` line 57: `'flex h-12 w-full items-center justify-between gap-2 rounded-full border border-input bg-card px-[18px] text-base whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50'`; line 71: `rounded-lg bg-popover text-popover-foreground` → `rounded-lg bg-side text-foreground`; line 73: drop `border-b`; line 77: `h-9 … text-sm` → `h-11 … text-base`; line 94: `rounded-lg px-2 py-1.5 text-sm` → `h-10 rounded-full px-3.5 text-base`, `data-[selected=true]:bg-accent` → `data-[selected=true]:bg-secondary`.
`tooltip.tsx` line 45: `rounded-lg border bg-popover px-2 py-1 text-xs font-medium text-popover-foreground` → `rounded-full bg-primary px-3 py-1.5 text-md font-medium text-primary-foreground`; delete the `TooltipPrimitive.Arrow` element (line 51).
`sonner.tsx`: the style object → `{ '--normal-bg': 'var(--primary)', '--normal-text': 'var(--primary-foreground)', '--normal-border': 'transparent', '--border-radius': 'var(--radius-pill)' }`; set `position="bottom-right"` on the Toaster if not already; keep `theme="light"`.

- [ ] **Step 5: Feedback and data**

`alert.tsx`: base → `'relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg bg-secondary px-4 py-3 text-base text-foreground has-[>svg]:grid-cols-[calc(var(--spacing)*5)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-[18px] [&>svg]:translate-y-0.5 [&>svg]:text-current'`; variants: `default: ''`, `destructive: 'bg-destructive text-destructive-foreground'`, `success: 'bg-success text-success-foreground'`, `warning: 'bg-warning text-warning-foreground'`, `info: 'bg-info text-info-foreground'`; title (44) `font-medium tracking-tight` → `font-medium`; description (55) `text-sm text-muted-foreground` → `text-base text-current opacity-90`; reference (73) `text-xs text-muted-foreground` → `text-sm text-current`.
`skeleton.tsx`: → `'rounded-lg bg-secondary'` (no pulse).
`progress.tsx`: track `h-2` → `h-1.5`; the indicator stays `bg-primary` (full-session colouring is Capacity's job).
`capacity.tsx` lines 21–22: `tight: 'bg-warning-foreground'`, `over: 'bg-destructive-foreground'`; any `text-warning`/`text-destructive` in the file → `text-warning-foreground`/`text-destructive-foreground`; the count keeps `font-numeric`.
`avatar.tsx` line 20: `size-8` → `size-9`, `data-[size=lg]:size-10` → `data-[size=lg]:size-11`; fallback (46) → `'flex size-full items-center justify-center rounded-full bg-tint-bleu text-xs font-semibold text-foreground'` (callers that want the rotation pass `className={tintClass(tintForIndex(i))}` from `@iziwellpass/ui/lib/tints`, Task 4); drop `ring-2 ring-background` on lines 59, 75, 88 → replace with `border-2 border-background` (a stacked-avatar cut-out is not elevation).
`empty.tsx`: delete the icon-circle element on line 22–23 (`EmptyMedia` renders `children` in a plain `div` with `'mb-1 text-muted-foreground [&_svg:not([class*="size-"])]:size-6'`); title (35) → `'text-xl font-medium text-foreground'`; description (45) → `'max-w-sm text-base text-muted-foreground'`. Run `pnpm --filter @iziwellpass/ui exec vitest run src/components/empty.test.tsx` and adjust class assertions only.
`separator.tsx`: unchanged (already `bg-border`).

- [ ] **Step 6: Run, verify, commit**

Run: `pnpm --filter @iziwellpass/ui exec vitest run && pnpm --filter @iziwellpass/ui typecheck && pnpm --filter @iziwellpass/ui lint`
Expected: everything PASS except `weights.test.ts` on `app-shell.tsx` (Task 5). `focus.test.ts` PASS.
Run: `grep -nE 'font-\[|border bg-|rounded-xl border|ring-|animate-pulse|bg-popover|text-destructive\b|lg:' packages/ui/src/components/{card,stat,table,dialog,sheet,popover,dropdown-menu,combobox,tooltip,alert,skeleton,progress,avatar,empty,capacity}.tsx`
Expected: no output.

```bash
git add packages/ui/src/components
git commit -m "feat(ui): comptoir clair surfaces — flat cards, hairline stats and tables, borderless overlays and menus"
```

---

### Task 4: New primitives — tints, Wordmark, Tile, CommandBar, Chip

**Files:**
- Create: `packages/ui/src/lib/tints.ts`, `packages/ui/src/components/wordmark.tsx`, `tile.tsx`, `command-bar.tsx`, `chip.tsx`
- Test: `packages/ui/src/lib/tints.test.ts`, `packages/ui/src/components/tile.test.tsx`, `command-bar.test.tsx`, `chip.test.tsx`

**Interfaces:**
- Consumes: `Button` size `icon-md` (Task 2), tokens (Task 1).
- Produces: `TINTS`, `type TintName`, `tintForIndex(i: number): TintName`, `tintClass(t: TintName): string`; `Wordmark({ name, size?: 'sm' | 'md', className? })`; `Tile({ tint?: TintName | number, aspect?: 'square' | 'tall', className?, ...div })` with `TileTop`, `TileTime`, `TileCount`, `TileTitle`, `TileMeta`; `CommandBar({ icon?, placeholder, value?, onChange?, onSubmit?, mode?, submitLabel, inputProps?, className? })`; `Chip({ children, onRemove?, removeLabel?, className? })`.

- [ ] **Step 1: Failing tests**

`packages/ui/src/lib/tints.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { TINTS, tintClass, tintForIndex } from './tints';

describe('tints', () => {
  it('rotates through the five tints by position', () => {
    expect(TINTS).toEqual(['bleu', 'vert', 'sable', 'rose', 'lavande']);
    expect(tintForIndex(0)).toBe('bleu');
    expect(tintForIndex(4)).toBe('lavande');
    expect(tintForIndex(5)).toBe('bleu');
    expect(tintForIndex(-1)).toBe('lavande');
  });
  it('maps a tint to its background class', () => {
    expect(tintClass('sable')).toBe('bg-tint-sable');
  });
});
```

`packages/ui/src/components/tile.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tile, TileCount, TileMeta, TileTime, TileTitle, TileTop } from './tile';

describe('Tile', () => {
  it('renders the tint by index and the slots', () => {
    render(
      <Tile tint={2} data-testid="tile">
        <TileTop>
          <TileTime>06:30</TileTime>
          <TileCount>14/18</TileCount>
        </TileTop>
        <TileTitle>Yoga du matin</TileTitle>
        <TileMeta>Salle A · Aïssatou Ba</TileMeta>
      </Tile>,
    );
    expect(screen.getByTestId('tile').className).toContain('bg-tint-sable');
    expect(screen.getByText('14/18').className).toContain('font-numeric');
    expect(screen.getByText('Yoga du matin').tagName).toBe('H3');
  });
  it('accepts a named tint and the tall aspect', () => {
    render(<Tile tint="rose" aspect="tall" data-testid="tile" />);
    const el = screen.getByTestId('tile');
    expect(el.className).toContain('bg-tint-rose');
    expect(el.className).not.toContain('aspect-square');
  });
});
```

`packages/ui/src/components/command-bar.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CommandBar } from './command-bar';

describe('CommandBar', () => {
  it('submits the typed value and exposes an accessible submit', () => {
    const onSubmit = vi.fn();
    render(
      <CommandBar
        placeholder="Scanner un QR ou rechercher un membre"
        submitLabel="Valider"
        onSubmit={onSubmit}
      />,
    );
    const input = screen.getByPlaceholderText('Scanner un QR ou rechercher un membre');
    fireEvent.change(input, { target: { value: 'iwp1.abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }));
    expect(onSubmit).toHaveBeenCalledWith('iwp1.abc');
  });
  it('renders the mode slot before the submit', () => {
    render(<CommandBar placeholder="p" submitLabel="Go" mode={<span>Accueil</span>} />);
    expect(screen.getByText('Accueil')).toBeTruthy();
  });
});
```

`packages/ui/src/components/chip.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Chip } from './chip';

describe('Chip', () => {
  it('renders a dismiss button only when onRemove is given', () => {
    const { rerender } = render(<Chip>Yoga</Chip>);
    expect(screen.queryByRole('button')).toBeNull();
    const onRemove = vi.fn();
    rerender(
      <Chip onRemove={onRemove} removeLabel="Retirer Yoga">
        Yoga
      </Chip>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retirer Yoga' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
```

Run: `pnpm --filter @iziwellpass/ui exec vitest run src/lib/tints.test.ts src/components/tile.test.tsx src/components/command-bar.test.tsx src/components/chip.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 2: tints.ts**

```ts
/** The five pastel tints, rotated by position (The Tile Rule). */
export const TINTS = ['bleu', 'vert', 'sable', 'rose', 'lavande'] as const;
export type TintName = (typeof TINTS)[number];

const CLASSES: Record<TintName, string> = {
  bleu: 'bg-tint-bleu',
  vert: 'bg-tint-vert',
  sable: 'bg-tint-sable',
  rose: 'bg-tint-rose',
  lavande: 'bg-tint-lavande',
};

export function tintForIndex(index: number): TintName {
  const i = ((index % TINTS.length) + TINTS.length) % TINTS.length;
  return TINTS[i]!;
}

export function tintClass(tint: TintName): string {
  return CLASSES[tint];
}
```

- [ ] **Step 3: wordmark.tsx**

```tsx
import { cn } from '@iziwellpass/ui/lib/utils';

/** The brand mark: an ink square beside the name, 18/600. No colour, no icon. */
export function Wordmark({
  name,
  size = 'md',
  className,
}: {
  name: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        aria-hidden="true"
        className={cn('block rounded-md bg-primary', size === 'md' ? 'size-6' : 'size-5')}
      />
      <span className={cn('font-semibold tracking-[-0.02em]', size === 'md' ? 'text-lg' : 'text-base')}>
        {name}
      </span>
    </span>
  );
}
```

- [ ] **Step 4: tile.tsx**

```tsx
import * as React from 'react';

import { tintClass, tintForIndex, type TintName } from '@iziwellpass/ui/lib/tints';
import { cn } from '@iziwellpass/ui/lib/utils';

/**
 * A tinted block for glanceable content (sessions, plans, venues, steps).
 * 24px radius, 20px padding, dark ink on a pastel, no border, no shadow.
 * Never holds a form, a table or a dialog (The Tile Rule).
 */
function Tile({
  tint = 0,
  aspect = 'square',
  className,
  ...props
}: React.ComponentProps<'div'> & { tint?: TintName | number; aspect?: 'square' | 'tall' }) {
  const name = typeof tint === 'number' ? tintForIndex(tint) : tint;
  return (
    <div
      data-slot="tile"
      className={cn(
        'flex flex-col justify-between rounded-xl p-5 text-foreground',
        aspect === 'square' ? 'aspect-square' : 'min-h-[14rem]',
        tintClass(name),
        className,
      )}
      {...props}
    />
  );
}

function TileTop({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="tile-top"
      className={cn('flex items-start justify-between gap-3', className)}
      {...props}
    />
  );
}

function TileTime({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="tile-time"
      className={cn('font-numeric text-xl font-medium', className)}
      {...props}
    />
  );
}

function TileCount({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="tile-count"
      className={cn('font-numeric text-md font-medium text-muted-strong', className)}
      {...props}
    />
  );
}

function TileTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return (
    <h3 data-slot="tile-title" className={cn('text-lg font-semibold', className)} {...props} />
  );
}

function TileMeta({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="tile-meta"
      className={cn('mt-1 text-sm text-muted-strong', className)}
      {...props}
    />
  );
}

export { Tile, TileTop, TileTime, TileCount, TileTitle, TileMeta };
```

- [ ] **Step 5: command-bar.tsx**

```tsx
'use client';

import * as React from 'react';
import { ArrowUp } from 'lucide-react';

import { Button } from '@iziwellpass/ui/components/button';
import { cn } from '@iziwellpass/ui/lib/utils';

export interface CommandBarProps {
  /** Leading icon, rendered at 20px in ink (e.g. `<QrCode />`). */
  icon?: React.ReactNode;
  placeholder: string;
  value?: string;
  onChange?: (value: string) => void;
  /** Called with the trimmed input value on submit; the form never reloads. */
  onSubmit?: (value: string) => void;
  /** Optional mode selector (a 36px ghost pill, e.g. a DropdownMenu trigger). */
  mode?: React.ReactNode;
  /** Accessible name of the dark round submit. */
  submitLabel: string;
  inputProps?: Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'placeholder'>;
  className?: string;
}

/**
 * The hub's single central control: a 60px white pill with a hairline (56px
 * below md), a leading icon, the input, an optional mode selector and the one
 * dark round submit. The only place a hairline outline and a dark pill meet.
 */
export function CommandBar({
  icon,
  placeholder,
  value,
  onChange,
  onSubmit,
  mode,
  submitLabel,
  inputProps,
  className,
}: CommandBarProps) {
  const [internal, setInternal] = React.useState('');
  const current = value ?? internal;

  return (
    <form
      data-slot="command-bar"
      className={cn(
        'flex h-14 w-full max-w-[45rem] items-center gap-2.5 rounded-full border border-input bg-card pr-2 pl-[18px] md:h-[60px] md:gap-3.5 md:pr-2.5 md:pl-[22px]',
        className,
      )}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.(current.trim());
      }}
    >
      {icon ? (
        <span aria-hidden="true" className="shrink-0 text-foreground [&_svg]:size-5">
          {icon}
        </span>
      ) : null}
      <input
        {...inputProps}
        value={current}
        onChange={(event) => {
          setInternal(event.target.value);
          onChange?.(event.target.value);
        }}
        placeholder={placeholder}
        aria-label={inputProps?.['aria-label'] ?? placeholder}
        className={cn(
          'h-full min-w-0 flex-1 bg-transparent text-lg text-foreground placeholder:text-muted-foreground focus-visible:outline-offset-[-3px]',
          inputProps?.className,
        )}
      />
      {mode ? <div className="shrink-0 text-md font-medium">{mode}</div> : null}
      <Button type="submit" size="icon-md" aria-label={submitLabel} className="shrink-0">
        <ArrowUp />
      </Button>
    </form>
  );
}
```

- [ ] **Step 6: chip.tsx**

```tsx
import * as React from 'react';
import { X } from 'lucide-react';

import { cn } from '@iziwellpass/ui/lib/utils';

/** A pilule label with an optional dismiss (filters, selected values). */
export function Chip({
  children,
  onRemove,
  removeLabel,
  className,
  ...props
}: React.ComponentProps<'span'> & { onRemove?: () => void; removeLabel?: string }) {
  return (
    <span
      data-slot="chip"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-secondary py-1.5 pl-3.5 text-md font-medium text-foreground',
        onRemove ? 'pr-1.5' : 'pr-3.5',
        className,
      )}
      {...props}
    >
      {children}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="grid size-5 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </span>
  );
}
```

- [ ] **Step 7: Run, then commit**

Run: `pnpm --filter @iziwellpass/ui exec vitest run && pnpm --filter @iziwellpass/ui typecheck && pnpm --filter @iziwellpass/ui lint`
Expected: the four new test files PASS; `focus.test.ts` and `weights.test.ts` sweep the new files and PASS for them; only `app-shell.tsx` still fails weights (Task 5).

```bash
git add packages/ui/src/lib/tints.ts packages/ui/src/lib/tints.test.ts packages/ui/src/components/{wordmark,tile,command-bar,chip}.tsx packages/ui/src/components/{tile,command-bar,chip}.test.tsx
git commit -m "feat(ui): Tile, CommandBar, Chip, Wordmark and the tint rotation"
```

---

### Task 5: The side-column shell

**Files:**
- Modify: `packages/ui/src/app-shell.tsx` (whole file)
- Modify: `packages/ui/src/app-shell.test.tsx`

**Interfaces:**
- Consumes: `Wordmark` (Task 4), `Button`, `Sheet`, tokens.
- Produces: `AppShellProps` gains `navFooter?: ReactNode`. `leading` and `actions` render only in the mobile top bar. `navHeader` renders under the brand row in both the column and the drawer. Everything else keeps its name and type.

- [ ] **Step 1: Add the failing tests**

Append to `app-shell.test.tsx` inside `describe('AppShell')`:

```tsx
  it('renders the navFooter slot in the sidebar column', () => {
    render(
      <AppShell nav={nav} title="IziWellPass" navFooter={<span>venue-and-user</span>}>
        <p>x</p>
      </AppShell>,
    );
    expect(screen.getByText('venue-and-user')).toBeTruthy();
  });

  it('marks the active item with the pill classes and keeps the rest bare', () => {
    render(
      <AppShell nav={nav} title="IziWellPass" currentPath="/members">
        <p>x</p>
      </AppShell>,
    );
    const active = screen.getByRole('link', { name: 'Members' });
    const idle = screen.getByRole('link', { name: 'Dashboard' });
    expect(active.className).toContain('bg-secondary');
    expect(active.className).toContain('font-semibold');
    expect(idle.className).not.toContain('bg-secondary');
  });
```

Run: `pnpm --filter @iziwellpass/ui exec vitest run src/app-shell.test.tsx`
Expected: the two new tests FAIL (no `navFooter` prop; active classes differ).

- [ ] **Step 2: Rewrite app-shell.tsx**

```tsx
'use client';

import { Menu } from 'lucide-react';
import { useState, type AnchorHTMLAttributes, type ComponentType, type ReactNode } from 'react';

import { Button } from '@iziwellpass/ui/components/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@iziwellpass/ui/components/sheet';
import { Wordmark } from '@iziwellpass/ui/components/wordmark';
import { cn } from '@iziwellpass/ui/lib/utils';

export interface NavItem {
  title: string;
  href: string;
  icon?: ReactNode;
}

export interface NavGroup {
  /** Optional section label (13/500 atténué, sentence case). */
  label?: string;
  items: NavItem[];
}

export interface AppShellProps {
  /** App name shown in the wordmark (side column and drawer). */
  title: string;
  nav?: NavItem[];
  /** Grouped nav; takes precedence over `nav`. */
  navGroups?: NavGroup[];
  /** Column slot rendered under the brand row, above the nav. */
  navHeader?: ReactNode;
  /** Column slot pinned at the bottom (venue switcher, user menu). */
  navFooter?: ReactNode;
  /** Mobile top bar, left of the actions (e.g. the compact venue switcher). Desktop has no top bar. */
  leading?: ReactNode;
  /** Mobile top bar, right-aligned (e.g. the avatar menu). Desktop has no top bar. */
  actions?: ReactNode;
  /** Current pathname for active-item highlighting (pass from usePathname()). */
  currentPath?: string;
  /**
   * Component used to render nav links (e.g. pass next/link's Link).
   * Defaults to a plain <a>, which causes full page reloads.
   */
  linkComponent?: ComponentType<AnchorHTMLAttributes<HTMLAnchorElement>>;
  /** Called after any nav link is clicked (AppShell also closes the drawer). */
  onNavigate?: () => void;
  /** Accessible label for the mobile menu trigger. Defaults to "Open menu". */
  openMenuLabel?: string;
  children: ReactNode;
}

function DefaultLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} />;
}

/** Active when the path exactly matches `/`, or is a prefix match for any other href. */
function isActivePath(href: string, currentPath?: string): boolean {
  if (!currentPath) return false;
  if (href === '/') return currentPath === '/';
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

function NavGroupList({
  groups,
  currentPath,
  linkComponent: LinkComponent = DefaultLink,
  onNavigate,
}: {
  groups: NavGroup[];
  currentPath?: string;
  linkComponent?: ComponentType<AnchorHTMLAttributes<HTMLAnchorElement>>;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-0.5">
      {groups.map((group, i) => (
        <div key={group.label ?? `group-${i}`} className="flex flex-col gap-0.5">
          {group.label ? (
            <p className="px-3.5 pt-5 pb-1.5 text-sm font-medium text-muted-foreground">
              {group.label}
            </p>
          ) : null}
          {group.items.map((item) => {
            const active = isActivePath(item.href, currentPath);
            return (
              <LinkComponent
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                data-active={active || undefined}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-[42px] items-center gap-3 rounded-full px-3.5 text-base text-foreground transition-colors duration-200 [&_svg]:size-[18px] [&_svg]:shrink-0',
                  active ? 'bg-secondary font-semibold' : 'font-normal hover:bg-accent/60',
                )}
              >
                {item.icon}
                {item.title}
              </LinkComponent>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function toGroups(navGroups?: NavGroup[], nav?: NavItem[]): NavGroup[] {
  if (navGroups && navGroups.length > 0) return navGroups;
  return nav ? [{ items: nav }] : [];
}

function Column({
  title,
  navHeader,
  navFooter,
  groups,
  currentPath,
  linkComponent,
  onNavigate,
}: {
  title: string;
  navHeader?: ReactNode;
  navFooter?: ReactNode;
  groups: NavGroup[];
  currentPath?: string;
  linkComponent?: ComponentType<AnchorHTMLAttributes<HTMLAnchorElement>>;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-0.5 px-3 py-4">
      <div className="px-2.5 pt-2 pb-5">
        <Wordmark name={title} />
      </div>
      {navHeader ? <div className="pb-2">{navHeader}</div> : null}
      <NavGroupList
        groups={groups}
        currentPath={currentPath}
        linkComponent={linkComponent}
        onNavigate={onNavigate}
      />
      <div className="flex-1" />
      {navFooter ? <div className="flex flex-col gap-0.5">{navFooter}</div> : null}
    </div>
  );
}

export function AppShell({
  title,
  nav,
  navGroups,
  navHeader,
  navFooter,
  actions,
  leading,
  currentPath,
  linkComponent,
  onNavigate,
  openMenuLabel = 'Open menu',
  children,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const groups = toGroups(navGroups, nav);

  const handleNavigate = () => {
    setMobileOpen(false);
    onNavigate?.();
  };

  const column = (
    <Column
      title={title}
      navHeader={navHeader}
      navFooter={navFooter}
      groups={groups}
      currentPath={currentPath}
      linkComponent={linkComponent}
      onNavigate={handleNavigate}
    />
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop: the côté column is the only frame — a tone, not a border */}
      <aside className="hidden w-[260px] shrink-0 bg-side md:block">{column}</aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar; there is no desktop header */}
        <header className="flex h-14 shrink-0 items-center gap-2.5 px-3 md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={openMenuLabel}>
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] bg-side p-0" aria-describedby={undefined}>
              <SheetTitle className="sr-only">{title}</SheetTitle>
              {column}
            </SheetContent>
          </Sheet>
          {leading}
          <div className="ml-auto flex items-center gap-2">{actions}</div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update the existing test names**

In `app-shell.test.tsx` rename `'renders topbar actions slot'` → `'renders the actions slot in the mobile top bar'` and `'renders the leading slot in the topbar'` → `'renders the leading slot in the mobile top bar'` (bodies unchanged: jsdom does not apply `md:hidden`, so the slots render).

- [ ] **Step 4: Run all package tests and commit**

Run: `pnpm --filter @iziwellpass/ui exec vitest run && pnpm --filter @iziwellpass/ui typecheck && pnpm --filter @iziwellpass/ui lint`
Expected: ALL PASS including `weights.test.ts` and `focus.test.ts` (the package is now clean).

```bash
git add packages/ui/src/app-shell.tsx packages/ui/src/app-shell.test.tsx
git commit -m "feat(ui): side-column shell — côté column, pill nav, navFooter, no desktop top bar"
```

---

### Task 6: Owner app wiring and sweep

**Files:**
- Modify: `apps/owner/app/(app)/layout.tsx`, `apps/owner/components/venue-switcher.tsx`, `apps/owner/components/auth-card.tsx`, `apps/owner/app/(onboarding)/layout.tsx`
- Delete: `apps/owner/components/wordmark.tsx`
- Modify (mechanical): every file under `apps/owner/app`, `apps/owner/components`, `apps/owner/lib` matching the sweep greps

**Interfaces:**
- Consumes: `AppShell` `navFooter` (Task 5), `Wordmark` (Task 4), `Avatar` (Task 3), tokens.

- [ ] **Step 1: Layout — footer slot and the user menu row**

In `apps/owner/app/(app)/layout.tsx`:

Add imports:
```tsx
import { Avatar, AvatarFallback } from '@iziwellpass/ui/components/avatar';
```

Replace `UserMenu` with:

```tsx
function initials(nameOrEmail: string): string {
  const local = nameOrEmail.split('@')[0] ?? '';
  const parts = local.split(/[\s._+-]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const second = parts[1]?.[0] ?? '';
  return (first + second).toUpperCase() || '?';
}

function UserMenu({ variant = 'avatar' }: { variant?: 'avatar' | 'row' }) {
  const router = useRouter();
  const { signOut } = useAuth();
  const session = useSession();
  const t = useTranslations('shell');
  const email = session.status === 'signed-in' ? session.claims.email : null;
  const name = session.status === 'signed-in' ? (session.claims.name ?? email) : null;
  const role = session.status === 'signed-in' ? session.claims.role : null;

  const handleSignOut = () => {
    signOut();
    router.replace('/login');
  };

  const avatar = (
    <Avatar size={variant === 'row' ? 'default' : 'sm'}>
      <AvatarFallback>{initials(name ?? t('account'))}</AvatarFallback>
    </Avatar>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === 'row' ? (
          <button
            type="button"
            aria-label={t('account')}
            className="flex h-12 w-full items-center gap-2.5 rounded-xl py-1.5 pr-3.5 pl-2 text-left transition-colors hover:bg-accent/60"
          >
            {avatar}
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-md font-medium">{name ?? t('account')}</span>
              {role ? <span className="truncate text-xs text-muted-foreground">{role}</span> : null}
            </span>
          </button>
        ) : (
          <button type="button" aria-label={t('account')} className="rounded-full">
            {avatar}
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={handleSignOut}>{t('signOut')}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

`SessionClaims.name` (packages/auth/src/claims.ts) already carries the given name or null; `role` is a `Role | null` string such as `owner`, rendered as-is in SP-A (a translated role label is SP-B's concern).

Replace the `AppShell` JSX with:

```tsx
      <AppShell
        title="IziWellPass"
        navGroups={navGroups}
        navFooter={
          <>
            <VenueSwitcher className="w-full" />
            <UserMenu variant="row" />
          </>
        }
        linkComponent={NavLink}
        currentPath={pathname}
        openMenuLabel={tShell('openMenu')}
        leading={<VenueSwitcher compact className="max-w-[200px]" />}
        actions={<UserMenu />}
      >
```

Also change `icon: <Icon className="size-4 shrink-0" />` to `icon: <Icon aria-hidden />` (the shell sizes icons to 18px).

- [ ] **Step 2: Venue switcher pill**

In `venue-switcher.tsx`: signature → `export function VenueSwitcher({ className, compact = false }: { className?: string; compact?: boolean } = {})`. Skeleton → `<Skeleton className={cn(compact ? 'h-10 w-40' : 'h-11 w-full', 'rounded-full', className)} />`. The trigger `Button`: `variant="outline" size={compact ? 'sm' : 'default'}` and `className={cn('justify-start gap-2.5', compact ? 'max-w-full' : 'w-full', className)}`; the name span → `<span className="truncate text-md font-medium">{triggerLabel}</span>`; the chevrons icon → `<ChevronsUpDownIcon aria-hidden className="ml-auto size-4 shrink-0 text-muted-foreground" />`; the building icon → `<Building2Icon aria-hidden className="shrink-0 text-muted-foreground" />`. The empty-state "add venue" button keeps `variant="outline"` with the same `size`/`className` rule. Menu content: `className="min-w-[236px]"`.

- [ ] **Step 3: Flat AuthCard and the Wordmark move**

Replace `apps/owner/components/auth-card.tsx` with:

```tsx
import type { ReactNode } from 'react';

import { Wordmark } from '@iziwellpass/ui/components/wordmark';

/**
 * The auth surface: wordmark, a light 32px title and an atténué subtitle over
 * the form, on the white page. No card, no band, no border (The No-Box Rule).
 * The lavis wash and the 400px centred layout arrive with SP-B.
 */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-7">
      <Wordmark name="IziWellPass" />
      <div className="flex flex-col gap-2.5">
        <h1 className="text-2xl font-normal">{title}</h1>
        {subtitle ? <p className="text-base text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div>{children}</div>
      {footer ? <div className="text-center text-md text-muted-foreground">{footer}</div> : null}
    </div>
  );
}
```

Delete `apps/owner/components/wordmark.tsx`. In `apps/owner/app/(onboarding)/layout.tsx` replace the import with `import { Wordmark } from '@iziwellpass/ui/components/wordmark';` and the usage `<Wordmark />` with `<Wordmark name="IziWellPass" />` (keep any wrapping element that centred it). Also update `apps/owner/components/auth-card-skeleton.tsx` to mirror the flat layout (a `Skeleton` `h-6 w-32`, then `h-9 w-48`, then the existing field skeletons; no Card).

- [ ] **Step 4: Mechanical sweep**

From the repo root, with the file list written to a temp file and every path quoted:

```bash
grep -rlE 'font-\[650\]|font-\[750\]|font-\[800\]|eyebrow|rounded-2xl|bg-argile|bg-foret|text-foret|text-argile|tracking-\[-0\.035em\]' apps/owner/app apps/owner/components apps/owner/lib --include='*.tsx' --include='*.ts' > /tmp/owner-sweep.txt
while IFS= read -r f; do
  perl -0pi -e '
    s/text-2xl font-\[750\] tracking-\[-0\.035em\]/text-2xl font-normal/g;
    s/\bfont-\[750\]\b/font-medium/g;
    s/\bfont-\[800\]\b/font-semibold/g;
    s/\bfont-\[650\]\b/font-semibold/g;
    s/\btracking-\[-0\.035em\]\b//g;
    s/\beyebrow\b/text-sm font-medium/g;
    s/\s?\brounded-2xl\b//g;
  ' -- "$f"
done < /tmp/owner-sweep.txt
```

Then hand-check every file in `/tmp/owner-sweep.txt`: an `eyebrow` that carried `text-muted-foreground` keeps it; a `bg-argile`/`bg-foret` container (grep them) becomes plain (remove the class; if the text on it was `text-primary-foreground` or `text-card`, change to `text-foreground`); the dashboard greeting `h1` (`apps/owner/app/(app)/page.tsx:141`) becomes `text-3xl font-normal` (the hub display step). Run Prettier: `pnpm exec prettier --write $(tr '\n' ' ' < /tmp/owner-sweep.txt)`.

- [ ] **Step 5: Verify and run the owner gates**

Run: `grep -rnE 'eyebrow|font-\[|rounded-2xl|argile|foret|ocre|sauge|eucalyptus|uppercase|tracking-wide|components/wordmark'"'"'|@/components/wordmark' apps/owner/app apps/owner/components apps/owner/lib --include='*.tsx' --include='*.ts'`
Expected: no output.
Run: `pnpm --filter @iziwellpass/owner typecheck && pnpm --filter @iziwellpass/owner lint && pnpm --filter @iziwellpass/owner test`
Expected: green (42 tests). Then, with no dev server on this checkout, `pnpm --filter @iziwellpass/owner build` → 14/14 pages.

- [ ] **Step 6: Commit**

```bash
git add -A apps/owner
git commit -m "feat(owner): comptoir clair wiring — side-column footer, pill venue switcher, flat auth, weight and eyebrow sweep"
```

---

### Task 7: Admin app wiring, sweep, and the `/design` reference

**Files:**
- Modify: `apps/admin/app/(app)/layout.tsx`, `apps/admin/components/auth-card.tsx`, `apps/admin/app/design/**` (16 files; mainly `foundations/page.tsx`, `page.tsx`, `primitives/display.tsx`, `primitives/controls.tsx`, `primitives/sections.ts`, `shell/page.tsx`, `compositions/page.tsx`)
- Modify (mechanical): every file under `apps/admin/app`, `apps/admin/components` matching the sweep greps

- [ ] **Step 1: Layout**

In `apps/admin/app/(app)/layout.tsx` replace `UserMenu` with:

```tsx
function UserMenu() {
  const router = useRouter();
  const { signOut } = useAuth();
  const session = useSession();
  const t = useTranslations('shell');
  const email = session.status === 'signed-in' ? session.claims.email : null;

  return (
    <div className="flex w-full flex-col gap-1 px-2">
      {email ? <span className="truncate text-sm text-muted-foreground">{email}</span> : null}
      <Button
        variant="ghost"
        size="sm"
        className="justify-start px-2"
        onClick={() => {
          signOut();
          router.replace('/login');
        }}
      >
        {t('signOut')}
      </Button>
    </div>
  );
}
```

and the `AppShell` call: `actions={<UserMenu />}` → `navFooter={<UserMenu />}` plus `actions={<UserMenu />}` kept for the mobile bar; `icon: <Building2 className="size-4" />` → `icon: <Building2 aria-hidden />`.

- [ ] **Step 2: Flat AuthCard**

Replace `apps/admin/components/auth-card.tsx` with the same file as Task 6 Step 3 (identical content; admin has no separate wordmark).

- [ ] **Step 3: Mechanical sweep**

Same perl loop as Task 6 Step 4 with roots `apps/admin/app apps/admin/components` and `/tmp/admin-sweep.txt`; same hand-checks; Prettier on the touched files.

- [ ] **Step 4: `/design` reference rewrite**

The route documents the live system; update its data and copy, keeping its structure:

- `foundations/page.tsx`: colour swatches → the §3.1 table of the spec (fond, côté, encre, atténué, atténué fort, pilule, pilule survol, filet, scrim, danger, the four status tint/text pairs, the five tints, lavis) with contrast rows for the pairs in Task 1's test; type steps → `[display 44/400, page title 32/400, section 22/500, title 16/600, body 15/400, label 13/500, numeric 32/500 tnum]` using `text-3xl font-normal`, `text-2xl font-normal`, `text-xl font-medium`, `text-lg font-semibold`, `text-base`, `text-sm font-medium`, `font-numeric text-2xl font-medium`; radii → `sm 6 · md 8 · lg 20 · xl 24 · 2xl 28 · pill`; the "Élévation" section becomes a single note « Aucune élévation : tons, espace, filet entre les lignes, scrim pour les overlays. »; motion → `200ms ease-out`; the focus specimen uses the ink outline.
- `page.tsx`: eyebrow label text « Le comptoir clair »; hard rules → the eight rules of `DESIGN.md` §2–4 (One Dark, Pill, Tile, Light Heading, Sentence Case, Tabular, No-Elevation, No-Box), sentence case; any `text-sm font-medium` label that came from the sweep keeps `text-muted-foreground`.
- `primitives/display.tsx` (or `controls.tsx`, whichever holds data specimens): add a « Tuiles, barre de commande, puces » section with `Tile` (five tints in a row), `CommandBar` (placeholder « Scanner un QR ou rechercher un membre », `submitLabel="Valider"`, `icon={<QrCode />}`), and `Chip` (with and without `onRemove`); register the section in `primitives/sections.ts` if that file lists sections.
- `shell/page.tsx`: the mock shell shows the côté column and no top bar; copy mentions « colonne côté 260 px, pilule active, pied de colonne ».
- Remove every `uppercase`, `tracking-wide`, `eyebrow`, `font-[…]` in the route's chrome (`_chrome/*`, `route-bar.tsx`, `layout.tsx`).

- [ ] **Step 5: Verify and run the admin gates**

Run: `grep -rnE 'eyebrow|font-\[|rounded-2xl|argile|foret|ocre|sauge|eucalyptus|uppercase|tracking-wide|studio documentaire|comptoir calme' apps/admin/app apps/admin/components --include='*.tsx' --include='*.ts'`
Expected: no output (a mention of the previous system inside a prose sentence on `/design` is allowed only as « remplace le studio documentaire »; if kept, exclude that one line by wording, not by grep).
Run: `pnpm --filter @iziwellpass/admin typecheck && pnpm --filter @iziwellpass/admin lint && pnpm --filter @iziwellpass/admin test`
Expected: green (51 tests). Then `pnpm --filter @iziwellpass/admin build`.

- [ ] **Step 6: Commit**

```bash
git add -A apps/admin
git commit -m "feat(admin): comptoir clair wiring, sweep, and /design reference refresh"
```

---

### Task 8: Full gates and visual check

**Files:** none new.

- [ ] **Step 1: Guard**

Run: `pnpm check:design`
Expected: `design-system guard: clean`, exit 0. Any hit is fixed in the file that carries it (mechanically, per the sweep rules above), then re-run.

- [ ] **Step 2: Four gates**

Run from the repo root, with no dev server on this checkout: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`
Expected: build 3/3, typecheck 6/6, lint 7/7, test 7/7 packages (ui ≥ 75 tests, owner 42, admin 51). Report the per-gate summary lines verbatim.

- [ ] **Step 3: Visual check (controller)**

Start the owner dev server with the mock API (`pnpm --filter @iziwellpass/owner dev:mock` on 8090 and `API_PROXY_TARGET=http://localhost:8090 NEXT_PUBLIC_API_BASE_URL=/api/backend NEXT_PUBLIC_AUTH_MOCK=1 pnpm --filter @iziwellpass/owner exec next dev --port 3021`) and the admin dev server on 3022. Compare against `docs/design-refs/comptoir-clair/`: owner login (`T9KwQ.png`: wordmark, light title, pill fields, one dark pill), dashboard and members (`ssgpT.png`, `xLxJY.png`: côté column, pill nav with the active pilule, venue switcher and user row at the bottom, no top bar, hairline table, tint badges, stat strip), front desk; a dialog (`TmgT0.png`: 28px white panel on the scrim, no border); mobile width 390 (`oHqxA.png`, `F8fDM.png`: 56px bar, 300px côté drawer); admin login and `/design`. Record findings in the ledger; anything off goes to the fix round of the whole-branch review.

- [ ] **Step 4: No commit** (nothing changes in this task unless Step 1 found a hit, in which case: `git commit -am "chore: design guard cleanup"`).
