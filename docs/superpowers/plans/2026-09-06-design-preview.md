# Design-system preview surface (`/design`) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public `/design` route group in the admin app that renders the IziWellPass design system as curated specimens, every one shown simultaneously in light and dark, with measured contrast ratios.

**Architecture:** Five Next.js App Router pages under `apps/admin/app/design/`. A client layout strips `.dark` from `<html>` so light is the ambient truth, and each specimen renders two panes: a bare one and one wrapped in `<div className="dark">`, which re-declares the token custom properties for its subtree. A small chrome kit built from raw elements (never from `packages/ui`) frames the specimens so chrome decisions can never be mistaken for system decisions. Two pure-logic modules live in `apps/admin/lib/` so the existing vitest config picks them up.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind CSS v4 (`@theme inline`, class-based dark variant), TypeScript 5.8, vitest 3 (node environment), pnpm workspaces + turbo.

**Spec:** `docs/superpowers/specs/2026-09-06-design-preview-design.md`

## Global Constraints

- **Working directory** is `web/` (the monorepo root). All paths in this plan are relative to it. Branch: `redesign/design-preview`.
- **Chrome carries no color of its own.** The chrome uses only `--backdrop`, `--backdrop-foreground`, `--foreground`, `--border` and `--ring` (the last two for hairlines and focus rings, which are structure and accessibility, not accent). No status color, and `--primary` never as a fill. Any color visible on the page must have come out of a specimen.
- **Never use Tailwind's stock `neutral-*` / `gray-*` / `stone-*` utilities.** They resolve to Tailwind's own cool ramp, not the project's warm stone ramp, which breaks the Warm Neutral Rule invisibly. Only semantic utilities (`bg-muted`, `text-muted-foreground`, `border-border`) or an explicit `var(--neutral-N)` are allowed.
- **Chrome is built from raw HTML elements + Tailwind utilities.** Never import from `@iziwellpass/ui` inside `app/design/_chrome/`. Specimen *content* imports from `@iziwellpass/ui` freely; that is the point.
- **No cards around specimens.** No `rounded-*` containers with `shadow-*` wrapping a specimen block. Hairlines (`border-t border-border`) and whitespace only. Nested cards are always wrong.
- **Chrome labels are hardcoded French.** No `next-intl`, no `messages/*.json` entries. Specimen sample copy is French at realistic lengths (e.g. « Abonnement mensuel illimité », « Aucun membre ne correspond à cette recherche »).
- **Mono for all identifiers and numerals.** Token names, prop signatures, OKLCH values, and contrast ratios are `font-mono`. This is the DESIGN.md Mono Numbers rule.
- **No em dashes** in any copy or comment. Use commas, colons, semicolons, periods, or parentheses.
- **Chrome text sizing:** annotation is `text-xs`, section titles `text-sm font-medium uppercase tracking-wide`, section numbers `font-mono text-xs`.
- **Verification commands** (run from `web/`): `pnpm --filter @iziwellpass/admin test`, `pnpm --filter @iziwellpass/admin typecheck`, `pnpm --filter @iziwellpass/admin lint`, `pnpm --filter @iziwellpass/admin build`.
- **Commit after every task.** Co-author trailer: `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.

## File Structure

| File | Responsibility |
| --- | --- |
| `apps/admin/lib/contrast.ts` | Pure color math: parse any CSS color the browser reports, composite alpha, compute WCAG ratio and level. No React. |
| `apps/admin/lib/contrast.test.ts` | Unit tests for the above. |
| `apps/admin/lib/design-registry.ts` | The list of primitives the preview must cover, as plain data. No React, so a node-env test can import it. |
| `apps/admin/lib/design-registry.test.ts` | Asserts registry parity with `packages/ui/src/components/*.tsx`. |
| `apps/admin/app/design/layout.tsx` | Client layout: forces light, paints the greige desk, renders the route bar. |
| `apps/admin/app/design/force-light.tsx` | The `.dark` strip effect, isolated so it is obvious and reversible. |
| `apps/admin/app/design/_chrome/page-frame.tsx` | Per-page title + sticky in-page TOC rail. |
| `apps/admin/app/design/_chrome/section.tsx` | Numbered, hairline-ruled, anchor-linkable section. |
| `apps/admin/app/design/_chrome/specimen.tsx` | One specimen: name + signature on the left, paired `clair` / `sombre` panes on the right. |
| `apps/admin/app/design/_chrome/matrix.tsx` | Variant x size grid with mono axis labels. |
| `apps/admin/app/design/_chrome/swatch.tsx` | A color chip that measures its own rendered contrast. |
| `apps/admin/app/design/page.tsx` | Index: what this is, the sections, DESIGN.md hard rules. |
| `apps/admin/app/design/foundations/page.tsx` | Sections 01 to 07. |
| `apps/admin/app/design/primitives/controls.tsx` | Specimens for the 13 form/control primitives. |
| `apps/admin/app/design/primitives/display.tsx` | Specimens for the 15 display/feedback/overlay primitives. |
| `apps/admin/app/design/primitives/page.tsx` | Composes the two specimen modules into one page. |
| `apps/admin/app/design/compositions/page.tsx` | Realistic assembled fragments. |
| `apps/admin/app/design/shell/page.tsx` | AppShell chrome at breakpoints. |
| `apps/admin/middleware.ts` | Modified: `'/design'` added to `publicPaths`. |
| `packages/ui/src/styles/globals.css` | Modified: `:root` becomes `:root, .light`. |

The primitives page is split into two source modules because a single file covering 28 components would be too large to edit reliably. They are two files with one responsibility each (controls, display), not two technical layers.

---

### Task 1: Contrast utility

The only real logic in this feature. Built test-first. It parses whatever `getComputedStyle` reports (Chrome returns `oklch(...)` for oklch-authored colors, other engines return `rgb(...)` or `color(srgb ...)`), so the swatches measure what actually rendered rather than what we think we authored.

**Files:**
- Create: `apps/admin/lib/contrast.ts`
- Test: `apps/admin/lib/contrast.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Rgb = readonly [number, number, number]` (gamma-encoded sRGB, each 0..1, clamped)
  - `interface ParsedColor { rgb: Rgb; alpha: number }`
  - `function parseCssColor(input: string): ParsedColor | null`
  - `function relativeLuminance(rgb: Rgb): number`
  - `function contrastRatio(a: Rgb, b: Rgb): number`
  - `function compositeOver(fg: Rgb, fgAlpha: number, bg: Rgb): Rgb`
  - `type WcagLevel = 'AAA' | 'AA' | 'AA-large' | 'fail'`
  - `function wcagLevel(ratio: number): WcagLevel`
  - `function measureContrast(foreground: string, background: string): { ratio: number; level: WcagLevel } | null`
  - `function toHex(rgb: Rgb): string`

- [ ] **Step 1: Write the failing test**

Create `apps/admin/lib/contrast.test.ts`. The expected values below are not invented: they were computed from the real tokens in `packages/ui/src/styles/globals.css` and round-trip to the hex values DESIGN.md documents.

```ts
import { describe, expect, it } from 'vitest';

import {
  compositeOver,
  contrastRatio,
  measureContrast,
  parseCssColor,
  relativeLuminance,
  toHex,
  wcagLevel,
} from './contrast';

const WHITE = [1, 1, 1] as const;
const BLACK = [0, 0, 0] as const;

describe('parseCssColor', () => {
  it('parses hex, short hex and hex with alpha', () => {
    expect(parseCssColor('#ffffff')).toEqual({ rgb: [1, 1, 1], alpha: 1 });
    expect(parseCssColor('#000')).toEqual({ rgb: [0, 0, 0], alpha: 1 });
    expect(parseCssColor('#00000080')?.alpha).toBeCloseTo(0.502, 2);
  });

  it('parses the rgb/rgba forms getComputedStyle returns', () => {
    expect(parseCssColor('rgb(255, 255, 255)')).toEqual({ rgb: [1, 1, 1], alpha: 1 });
    expect(parseCssColor('rgba(0, 0, 0, 0.5)')).toEqual({ rgb: [0, 0, 0], alpha: 0.5 });
    expect(parseCssColor('rgb(0 0 0 / 50%)')?.alpha).toBeCloseTo(0.5, 5);
  });

  it('parses color(srgb ...)', () => {
    const parsed = parseCssColor('color(srgb 1 1 1)');
    expect(parsed?.rgb[0]).toBeCloseTo(1, 5);
    expect(parsed?.alpha).toBe(1);
  });

  it('converts the ink token to its documented hex', () => {
    // --neutral-900, the warm ink DESIGN.md documents as #1c1917
    expect(toHex(parseCssColor('oklch(0.2161 0.0061 56)')!.rgb)).toBe('#1c1917');
  });

  it('converts the greige desk token to its documented hex', () => {
    // --backdrop, documented as #d6d2cc
    expect(toHex(parseCssColor('oklch(0.8653 0.0093 78)')!.rgb)).toBe('#d6d2cc');
  });

  it('reads the slash-alpha oklch form used by --overlay', () => {
    const parsed = parseCssColor('oklch(0.2161 0.0061 56 / 0.5)');
    expect(parsed?.alpha).toBeCloseTo(0.5, 5);
    expect(toHex(parsed!.rgb)).toBe('#1c1917');
  });

  it('clamps out-of-gamut oklch into sRGB rather than returning null', () => {
    const parsed = parseCssColor('oklch(0.7 0.4 150)');
    expect(parsed).not.toBeNull();
    for (const channel of parsed!.rgb) {
      expect(channel).toBeGreaterThanOrEqual(0);
      expect(channel).toBeLessThanOrEqual(1);
    }
  });

  it('returns null for anything it cannot read', () => {
    expect(parseCssColor('rebeccapurple')).toBeNull();
    expect(parseCssColor('')).toBeNull();
  });
});

describe('relativeLuminance', () => {
  it('anchors at the sRGB extremes', () => {
    expect(relativeLuminance(WHITE)).toBeCloseTo(1, 5);
    expect(relativeLuminance(BLACK)).toBeCloseTo(0, 5);
  });
});

describe('contrastRatio', () => {
  it('is 21:1 between the extremes, in either order', () => {
    expect(contrastRatio(WHITE, BLACK)).toBeCloseTo(21, 4);
    expect(contrastRatio(BLACK, WHITE)).toBeCloseTo(21, 4);
  });

  it('is 1:1 for a color against itself', () => {
    expect(contrastRatio(WHITE, WHITE)).toBeCloseTo(1, 5);
  });
});

describe('compositeOver', () => {
  it('returns the background at zero alpha and the foreground at full', () => {
    expect(compositeOver(BLACK, 0, WHITE)).toEqual([1, 1, 1]);
    expect(compositeOver(BLACK, 1, WHITE)).toEqual([0, 0, 0]);
  });

  it('mixes linearly in gamma-encoded space at half alpha', () => {
    expect(compositeOver(BLACK, 0.5, WHITE)[0]).toBeCloseTo(0.5, 5);
  });
});

describe('wcagLevel', () => {
  it('bands at the WCAG thresholds', () => {
    expect(wcagLevel(7.5)).toBe('AAA');
    expect(wcagLevel(7)).toBe('AAA');
    expect(wcagLevel(4.6)).toBe('AA');
    expect(wcagLevel(4.5)).toBe('AA');
    expect(wcagLevel(3.2)).toBe('AA-large');
    expect(wcagLevel(3)).toBe('AA-large');
    expect(wcagLevel(2.9)).toBe('fail');
  });
});

describe('measureContrast', () => {
  it('measures body text on the paper surface', () => {
    // --foreground (neutral-900) on --background
    const result = measureContrast('oklch(0.2161 0.0061 56)', 'oklch(0.9971 0.0018 78)');
    expect(result!.ratio).toBeCloseTo(17.34, 1);
    expect(result!.level).toBe('AAA');
  });

  it('measures muted text on the paper surface', () => {
    // --muted-foreground (neutral-500) on --background
    const result = measureContrast('oklch(0.5534 0.0116 58)', 'oklch(0.9971 0.0018 78)');
    expect(result!.ratio).toBeCloseTo(4.76, 1);
    expect(result!.level).toBe('AA');
  });

  it('reproduces the globals.css note that neutral-500 fails on the greige desk', () => {
    const result = measureContrast('oklch(0.5534 0.0116 58)', 'oklch(0.8653 0.0093 78)');
    expect(result!.ratio).toBeCloseTo(3.19, 1);
    expect(result!.level).toBe('AA-large');
  });

  it('reproduces the globals.css note that neutral-600 clears AA on the greige desk', () => {
    const result = measureContrast('oklch(0.4444 0.0096 74)', 'oklch(0.8653 0.0093 78)');
    expect(result!.ratio).toBeCloseTo(5.07, 1);
    expect(result!.level).toBe('AA');
  });

  it('composites a translucent foreground over its background before measuring', () => {
    // A half-alpha ink over paper must read as far weaker than solid ink.
    const solid = measureContrast('oklch(0.2161 0.0061 56)', 'oklch(0.9971 0.0018 78)');
    const faded = measureContrast('oklch(0.2161 0.0061 56 / 0.5)', 'oklch(0.9971 0.0018 78)');
    expect(faded!.ratio).toBeLessThan(solid!.ratio);
    expect(faded!.ratio).toBeGreaterThan(1);
  });

  it('returns null when either color is unreadable', () => {
    expect(measureContrast('rebeccapurple', '#fff')).toBeNull();
    expect(measureContrast('#fff', 'not-a-color')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm --filter @iziwellpass/admin test -- contrast
```

Expected: FAIL, `Failed to resolve import "./contrast"`.

- [ ] **Step 3: Write the implementation**

Create `apps/admin/lib/contrast.ts`:

```ts
/**
 * Color math for the /design preview surface. Everything here takes the string
 * form a browser's getComputedStyle actually reports, so the swatches measure
 * what rendered rather than what we believe we authored. Chrome reports
 * oklch-authored colors back as oklch(); other engines return rgb() or
 * color(srgb ...), so all three are supported.
 *
 * Rgb values are gamma-encoded sRGB in 0..1, clamped into gamut.
 */

export type Rgb = readonly [number, number, number];

export interface ParsedColor {
  rgb: Rgb;
  alpha: number;
}

export type WcagLevel = 'AAA' | 'AA' | 'AA-large' | 'fail';

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** sRGB transfer function, linear-light to gamma-encoded. */
function encodeGamma(channel: number): number {
  const c = clamp01(channel);
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

/** sRGB transfer function, gamma-encoded to linear-light. */
function decodeGamma(channel: number): number {
  const c = clamp01(channel);
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** OKLCH to linear-light sRGB (Bjorn Ottosson's matrices). May be out of gamut. */
function oklchToLinearSrgb(lightness: number, chroma: number, hueDeg: number): Rgb {
  const hue = (hueDeg * Math.PI) / 180;
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);

  const lRoot = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const mRoot = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const sRoot = lightness - 0.0894841775 * a - 1.291485548 * b;

  const l = lRoot ** 3;
  const m = mRoot ** 3;
  const s = sRoot ** 3;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** Reads a number that may be written as a percentage. */
function readAlpha(raw: string | undefined): number {
  if (raw === undefined) return 1;
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed === 'none') return 1;
  const value = Number.parseFloat(trimmed);
  if (Number.isNaN(value)) return 1;
  return clamp01(trimmed.endsWith('%') ? value / 100 : value);
}

/** Splits the inside of a functional color into components and an optional alpha. */
function splitComponents(body: string): { parts: string[]; alpha: number } {
  const [head, tail] = body.split('/');
  const parts = head.trim().split(/[\s,]+/).filter(Boolean);
  return { parts, alpha: readAlpha(tail) };
}

function parseHex(input: string): ParsedColor | null {
  const hex = input.slice(1);
  const expand = (value: string) => Number.parseInt(value.repeat(2), 16) / 255;

  if (/^[0-9a-f]{3,4}$/i.test(hex)) {
    return {
      rgb: [expand(hex[0]), expand(hex[1]), expand(hex[2])],
      alpha: hex.length === 4 ? expand(hex[3]) : 1,
    };
  }
  if (/^[0-9a-f]{6,8}$/i.test(hex)) {
    const byte = (index: number) => Number.parseInt(hex.slice(index, index + 2), 16) / 255;
    return {
      rgb: [byte(0), byte(2), byte(4)],
      alpha: hex.length === 8 ? byte(6) : 1,
    };
  }
  return null;
}

/**
 * Parses hex, rgb()/rgba() (comma or space separated), color(srgb ...) and
 * oklch(). Returns null for anything else, including named colors: the preview
 * would rather show nothing than a wrong ratio.
 */
export function parseCssColor(input: string): ParsedColor | null {
  const value = input.trim().toLowerCase();
  if (value === '') return null;
  if (value.startsWith('#')) return parseHex(value);

  const match = /^(rgba?|oklch|color)\((.*)\)$/.exec(value);
  if (!match) return null;

  const [, fn, body] = match;

  if (fn === 'color') {
    const { parts, alpha } = splitComponents(body);
    if (parts[0] !== 'srgb' || parts.length < 4) return null;
    const channels = parts.slice(1, 4).map((part) => clamp01(Number.parseFloat(part)));
    if (channels.some(Number.isNaN)) return null;
    return { rgb: [channels[0], channels[1], channels[2]], alpha };
  }

  const { parts, alpha: slashAlpha } = splitComponents(body);

  if (fn === 'rgb' || fn === 'rgba') {
    if (parts.length < 3) return null;
    const channels = parts.slice(0, 3).map((part) =>
      part.endsWith('%')
        ? clamp01(Number.parseFloat(part) / 100)
        : clamp01(Number.parseFloat(part) / 255),
    );
    if (channels.some(Number.isNaN)) return null;
    // rgba(r, g, b, a) puts alpha in the fourth comma-separated slot.
    const alpha = parts.length > 3 ? readAlpha(parts[3]) : slashAlpha;
    return { rgb: [channels[0], channels[1], channels[2]], alpha };
  }

  // oklch(L C H)
  if (parts.length < 3) return null;
  const lightness = parts[0].endsWith('%')
    ? Number.parseFloat(parts[0]) / 100
    : Number.parseFloat(parts[0]);
  const chroma = Number.parseFloat(parts[1]);
  const hue = Number.parseFloat(parts[2]);
  if ([lightness, chroma, hue].some(Number.isNaN)) return null;

  const linear = oklchToLinearSrgb(lightness, chroma, hue);
  return {
    rgb: [encodeGamma(linear[0]), encodeGamma(linear[1]), encodeGamma(linear[2])],
    alpha: parts.length > 3 ? readAlpha(parts[3]) : slashAlpha,
  };
}

/** WCAG 2.1 relative luminance. */
export function relativeLuminance(rgb: Rgb): number {
  return 0.2126 * decodeGamma(rgb[0]) + 0.7152 * decodeGamma(rgb[1]) + 0.0722 * decodeGamma(rgb[2]);
}

/** WCAG 2.1 contrast ratio. Order-independent. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Source-over compositing, done in gamma-encoded space as browsers do it. */
export function compositeOver(fg: Rgb, fgAlpha: number, bg: Rgb): Rgb {
  const a = clamp01(fgAlpha);
  return [
    fg[0] * a + bg[0] * (1 - a),
    fg[1] * a + bg[1] * (1 - a),
    fg[2] * a + bg[2] * (1 - a),
  ];
}

export function wcagLevel(ratio: number): WcagLevel {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA-large';
  return 'fail';
}

export function toHex(rgb: Rgb): string {
  const byte = (channel: number) =>
    Math.round(clamp01(channel) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${byte(rgb[0])}${byte(rgb[1])}${byte(rgb[2])}`;
}

/**
 * The one function the swatches call: composite a possibly-translucent
 * foreground over its background, then measure. Returns null if either color
 * could not be read, so the caller can render nothing instead of a lie.
 */
export function measureContrast(
  foreground: string,
  background: string,
): { ratio: number; level: WcagLevel } | null {
  const fg = parseCssColor(foreground);
  const bg = parseCssColor(background);
  if (!fg || !bg) return null;

  const flattened = compositeOver(fg.rgb, fg.alpha, bg.rgb);
  const ratio = contrastRatio(flattened, bg.rgb);
  return { ratio, level: wcagLevel(ratio) };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm --filter @iziwellpass/admin test -- contrast
```

Expected: PASS, all cases green. If the two hex round-trip cases fail by one in the last byte, do NOT loosen them to `toBeCloseTo`: the matrices above are the standard ones and reproduce `#1c1917` / `#d6d2cc` exactly. A mismatch means a transcription error in `oklchToLinearSrgb`.

- [ ] **Step 5: Typecheck and lint**

```bash
pnpm --filter @iziwellpass/admin typecheck && pnpm --filter @iziwellpass/admin lint
```

Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/lib/contrast.ts apps/admin/lib/contrast.test.ts
git commit -m "feat(admin): OKLCH-aware contrast measurement for the design preview

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Primitive registry and coverage test

Plain data plus a test that fails when a new primitive lands in `packages/ui` without a specimen. This is what keeps the preview from rotting. It lives in `lib/` as `.ts` (not `.tsx`) so the node-environment vitest config can import it without a JSX transform.

**Files:**
- Create: `apps/admin/lib/design-registry.ts`
- Test: `apps/admin/lib/design-registry.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface PrimitiveEntry { id: string; title: string; group: 'controls' | 'display' }`
  - `const PRIMITIVES: readonly PrimitiveEntry[]`
  - `function primitivesInGroup(group: PrimitiveEntry['group']): readonly PrimitiveEntry[]`

The `id` is the component filename without extension, which is also its anchor id on `/design/primitives`. `group` decides which of the two specimen modules owns it.

- [ ] **Step 1: Write the failing test**

Create `apps/admin/lib/design-registry.test.ts`:

```ts
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { PRIMITIVES, primitivesInGroup } from './design-registry';

const COMPONENTS_DIR = fileURLToPath(
  new URL('../../../packages/ui/src/components', import.meta.url),
);

function componentIdsOnDisk(): string[] {
  return readdirSync(COMPONENTS_DIR)
    .filter((name) => name.endsWith('.tsx') && !name.endsWith('.test.tsx'))
    .map((name) => name.replace(/\.tsx$/, ''))
    .sort();
}

describe('design registry', () => {
  it('covers every primitive in packages/ui, and invents none', () => {
    const onDisk = componentIdsOnDisk();
    const registered = PRIMITIVES.map((entry) => entry.id).sort();

    // Read the diff both ways: a new primitive needs a specimen, and a deleted
    // one must not leave a dead entry behind.
    expect(registered).toEqual(onDisk);
  });

  it('has unique ids', () => {
    const ids = PRIMITIVES.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every entry a non-empty French title', () => {
    for (const entry of PRIMITIVES) {
      expect(entry.title.trim().length).toBeGreaterThan(0);
    }
  });

  it('partitions cleanly into the two specimen modules', () => {
    const controls = primitivesInGroup('controls');
    const display = primitivesInGroup('display');
    expect(controls.length + display.length).toBe(PRIMITIVES.length);
    expect(controls.length).toBeGreaterThan(0);
    expect(display.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm --filter @iziwellpass/admin test -- design-registry
```

Expected: FAIL, `Failed to resolve import "./design-registry"`.

- [ ] **Step 3: Write the implementation**

Create `apps/admin/lib/design-registry.ts`. The 28 ids below are the current contents of `packages/ui/src/components/`; the test above is what keeps this list honest.

```ts
/**
 * The primitives the /design preview must cover. `id` is both the component
 * filename in packages/ui/src/components and the anchor id on the primitives
 * page. design-registry.test.ts asserts this list matches the directory, so a
 * new primitive cannot land without a specimen.
 */

export interface PrimitiveEntry {
  id: string;
  /** French label shown in the TOC and the section header. */
  title: string;
  group: 'controls' | 'display';
}

export const PRIMITIVES: readonly PrimitiveEntry[] = [
  // Controls and forms
  { id: 'button', title: 'Bouton', group: 'controls' },
  { id: 'input', title: 'Champ de saisie', group: 'controls' },
  { id: 'textarea', title: 'Zone de texte', group: 'controls' },
  { id: 'label', title: 'Étiquette', group: 'controls' },
  { id: 'form', title: 'Formulaire', group: 'controls' },
  { id: 'select', title: 'Liste déroulante', group: 'controls' },
  { id: 'combobox', title: 'Sélecteur avec recherche', group: 'controls' },
  { id: 'checkbox', title: 'Case à cocher', group: 'controls' },
  { id: 'switch', title: 'Interrupteur', group: 'controls' },
  { id: 'input-otp', title: 'Code à usage unique', group: 'controls' },
  { id: 'tabs', title: 'Onglets', group: 'controls' },
  { id: 'dropdown-menu', title: 'Menu déroulant', group: 'controls' },

  // Display, feedback and overlays
  { id: 'badge', title: 'Badge', group: 'display' },
  { id: 'alert', title: 'Alerte', group: 'display' },
  { id: 'capacity', title: 'Capacité', group: 'display' },
  { id: 'progress', title: 'Barre de progression', group: 'display' },
  { id: 'stat', title: 'Chiffres clés', group: 'display' },
  { id: 'table', title: 'Tableau', group: 'display' },
  { id: 'card', title: 'Carte', group: 'display' },
  { id: 'empty', title: 'État vide', group: 'display' },
  { id: 'skeleton', title: 'Squelette de chargement', group: 'display' },
  { id: 'avatar', title: 'Avatar', group: 'display' },
  { id: 'separator', title: 'Séparateur', group: 'display' },
  { id: 'dialog', title: 'Boîte de dialogue', group: 'display' },
  { id: 'sheet', title: 'Panneau latéral', group: 'display' },
  { id: 'popover', title: 'Popover', group: 'display' },
  { id: 'tooltip', title: 'Infobulle', group: 'display' },
  { id: 'sonner', title: 'Notification', group: 'display' },
];

export function primitivesInGroup(group: PrimitiveEntry['group']): readonly PrimitiveEntry[] {
  return PRIMITIVES.filter((entry) => entry.group === group);
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
pnpm --filter @iziwellpass/admin test -- design-registry
```

Expected: PASS. If the first case fails, the fix is to edit `PRIMITIVES` to match the directory, never to weaken the assertion.

- [ ] **Step 5: Run the whole admin suite**

```bash
pnpm --filter @iziwellpass/admin test
```

Expected: PASS, including the pre-existing `lib/` and `messages/` tests.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/lib/design-registry.ts apps/admin/lib/design-registry.test.ts
git commit -m "feat(admin): primitive registry with directory-parity coverage test

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Route scaffold, forced-light mechanism, and index page

Stands the route group up, makes it publicly reachable, and solves the theme problem the whole surface depends on. After this task `/design` renders and is navigable, with the other four routes still to come.

**Files:**
- Modify: `packages/ui/src/styles/globals.css` (the `:root` selector, line ~22)
- Modify: `apps/admin/middleware.ts` (the `publicPaths` array)
- Create: `apps/admin/app/design/force-light.tsx`
- Create: `apps/admin/app/design/route-bar.tsx`
- Create: `apps/admin/app/design/layout.tsx`
- Create: `apps/admin/app/design/page.tsx`

**Interfaces:**
- Consumes: nothing from Tasks 1 to 2.
- Produces:
  - `function ForceLight(): null` (client)
  - `function RouteBar(): JSX.Element` (client)
  - `const DESIGN_ROUTES: readonly { href: string; label: string }[]`, exported from `route-bar.tsx` so later pages can link between sections without redeclaring the list.

There is no unit test in this task: it is routing, a CSS selector, and a DOM class effect, none of which the node-environment vitest can meaningfully assert. Verification is `build` plus a browser check, both scripted below.

- [ ] **Step 1: Widen the light selector in the token layer**

In `packages/ui/src/styles/globals.css`, change the light-theme block's opening selector from `:root {` to `:root,\n.light {`. Leave everything inside it untouched.

```css
:root,
.light {
  /* Warm "stone" neutral ramp. The two lightest steps carry
```

This is zero duplication: one selector list, one set of declarations. It makes a light island inside a dark ancestor possible app-wide. It is deliberately NOT what the preview relies on for correctness, because it cannot fix `dark:` utility leakage; that is what Step 2 is for.

- [ ] **Step 2: Write the forced-light effect**

Create `apps/admin/app/design/force-light.tsx`:

```tsx
'use client';

import { useEffect } from 'react';

/**
 * The preview shows light and dark side by side, so the page itself needs a
 * fixed ambient theme. Without this, a visitor whose OS is dark gets `.dark` on
 * <html>, every `dark:` utility inside the "light" pane matches `.dark *` too,
 * and that pane is a lie. CSS cannot resolve the dark variant by nearest
 * ancestor, so the fix is to make light ambient for this route and let the
 * `.dark` wrappers be the only dark context on the page.
 *
 * Restores whatever was there on unmount, so navigating back to the admin app
 * returns the visitor to their own theme.
 */
export function ForceLight() {
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    const previousColorScheme = root.style.colorScheme;

    root.classList.remove('dark');
    root.style.colorScheme = 'light';

    // next-themes re-applies the class if the OS preference flips while the
    // page is open. Keep light pinned for as long as we are on this route.
    const observer = new MutationObserver(() => {
      if (root.classList.contains('dark')) {
        root.classList.remove('dark');
      }
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });

    return () => {
      observer.disconnect();
      if (wasDark) {
        root.classList.add('dark');
      }
      root.style.colorScheme = previousColorScheme;
    };
  }, []);

  return null;
}
```

- [ ] **Step 3: Write the route bar**

Create `apps/admin/app/design/route-bar.tsx`. Note the colour discipline: `bg-backdrop`, `border-border`, `text-foreground`, and nothing else. No blur (the glassmorphism ban), no fill.

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const DESIGN_ROUTES = [
  { href: '/design', label: 'Index' },
  { href: '/design/foundations', label: 'Fondations' },
  { href: '/design/primitives', label: 'Primitives' },
  { href: '/design/compositions', label: 'Compositions' },
  { href: '/design/shell', label: 'Coque' },
] as const;

export function RouteBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sections du système de design"
      className="sticky top-0 z-30 border-b border-border bg-backdrop"
    >
      <ul className="mx-auto flex max-w-[1600px] items-stretch px-4 sm:px-8">
        {DESIGN_ROUTES.map((route) => {
          const isActive =
            route.href === '/design' ? pathname === '/design' : pathname.startsWith(route.href);

          return (
            <li key={route.href}>
              <Link
                href={route.href}
                aria-current={isActive ? 'page' : undefined}
                className={`-mb-px inline-flex h-11 items-center rounded-sm border-b px-3 font-mono text-xs tracking-wider uppercase outline-none focus-visible:ring-[3px] focus-visible:ring-ring/15 ${
                  isActive
                    ? 'border-foreground text-foreground'
                    : 'border-transparent hover:text-foreground'
                }`}
              >
                {route.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 4: Write the layout**

Create `apps/admin/app/design/layout.tsx`. It stays a server component so it can export `metadata`; the two interactive pieces are the client components above.

```tsx
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { ForceLight } from './force-light';
import { RouteBar } from './route-bar';

export const metadata: Metadata = {
  title: 'Système de design — IziWellPass',
  description: 'Référence visuelle des jetons, primitives et compositions IziWellPass.',
  robots: { index: false, follow: false },
};

export default function DesignLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-backdrop text-backdrop-foreground">
      <ForceLight />
      <RouteBar />
      {children}
    </div>
  );
}
```

- [ ] **Step 5: Write the index page**

Create `apps/admin/app/design/page.tsx`. The hard rules listed are copied from `AGENTS.md`; they are the checklist the rest of the surface exists to verify.

```tsx
import Link from 'next/link';

import { DESIGN_ROUTES } from './route-bar';

const SECTION_SUMMARIES: Record<string, string> = {
  '/design/foundations':
    'Jetons de couleur avec leur ratio de contraste mesuré, échelle typographique, espacement, rayons, élévation, focus, mouvement, icônes.',
  '/design/primitives':
    'Chaque composant de packages/ui, avec toutes ses variantes, ses tailles et ses états pilotés par props.',
  '/design/compositions':
    'Fragments réalistes assemblés à partir des primitives : ligne de membre, bande de capacité, section de formulaire, liste vide, en chargement, en erreur.',
  '/design/shell':
    'La coque applicative : navigation, en-tête, comportement aux points de rupture.',
};

const HARD_RULES = [
  'Une seule encre comme accent.',
  'La couleur ne sert qu’au sens : badges de statut, capacité.',
  'Ni dégradé, ni glassmorphisme, ni emoji.',
  'Chiffres en Geist Mono : 06:30, 14/18.',
  'Filets de 1px avant toute ombre.',
  'Cibles tactiles d’au moins 44px sur les écrans d’accueil.',
  'Contraste AA dans les deux thèmes.',
];

export default function DesignIndexPage() {
  const sections = DESIGN_ROUTES.filter((route) => route.href !== '/design');

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-8">
      <header className="max-w-[70ch]">
        <p className="font-mono text-xs tracking-wider uppercase">Le comptoir calme</p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight text-foreground">
          Système de design
        </h1>
        <p className="mt-3 text-sm">
          Chaque spécimen est rendu deux fois, en clair et en sombre, côte à côte. La page
          elle-même reste en clair et n’utilise aucune couleur : toute couleur visible ici sort
          d’un spécimen. Les états pilotés par props sont réels ; le survol et le focus clavier
          sont annotés, pas simulés.
        </p>
      </header>

      <nav aria-label="Sections" className="mt-12 border-t border-border">
        <ul>
          {sections.map((section) => (
            <li key={section.href} className="border-b border-border">
              <Link
                href={section.href}
                className="grid gap-1 rounded-sm py-5 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/15 sm:grid-cols-[14rem_1fr] sm:gap-8"
              >
                <span className="font-mono text-xs tracking-wider text-foreground uppercase">
                  {section.label}
                </span>
                <span className="max-w-[70ch] text-xs">{SECTION_SUMMARIES[section.href]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section className="mt-16 max-w-[70ch]">
        <h2 className="text-sm font-medium tracking-wide text-foreground uppercase">
          Règles non négociables
        </h2>
        <ul className="mt-4 space-y-2">
          {HARD_RULES.map((rule, index) => (
            <li key={rule} className="flex gap-3 text-xs">
              <span className="font-mono text-[10px] leading-5">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="leading-5">{rule}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
```

- [ ] **Step 6: Open the route in the middleware**

In `apps/admin/middleware.ts`, add `'/design'` to `publicPaths`. The middleware matches by prefix (`pathname === p || pathname.startsWith(\`${p}/\`)`), so this one entry covers the whole group.

```ts
export const middleware = createAuthMiddleware({
  loginPath: '/login',
  // '/design' is the design-system preview: components only, never data, and
  // marked noindex. Prefix match, so this covers the whole group.
  publicPaths: ['/login', '/design'],
});
```

- [ ] **Step 7: Verify it builds and typechecks**

```bash
pnpm --filter @iziwellpass/admin typecheck && pnpm --filter @iziwellpass/admin lint && pnpm --filter @iziwellpass/admin build
```

Expected: all three clean, and the build output lists `/design` among the routes.

- [ ] **Step 8: Verify the forced-light mechanism in a browser**

```bash
pnpm --filter @iziwellpass/admin dev
```

Then, at `http://localhost:3012/design`, confirm all four:

1. The page loads without a login redirect.
2. With the OS set to dark mode, the page is still light and `<html>` has no `dark` class (check in devtools).
3. Navigating to `/` (which redirects to `/login`) restores the dark class.
4. The route bar's active item is underlined by its bottom border.

- [ ] **Step 9: Commit**

```bash
git add packages/ui/src/styles/globals.css apps/admin/middleware.ts apps/admin/app/design
git commit -m "feat(admin): /design route group with a forced-light preview context

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Chrome kit

The measuring instrument. Built from raw elements only: no import from `@iziwellpass/ui` may appear in any file under `_chrome/`. Nothing here casts a shadow; hairlines only.

**Files:**
- Create: `apps/admin/app/design/_chrome/page-frame.tsx`
- Create: `apps/admin/app/design/_chrome/section.tsx`
- Create: `apps/admin/app/design/_chrome/specimen.tsx`
- Create: `apps/admin/app/design/_chrome/matrix.tsx`
- Create: `apps/admin/app/design/_chrome/swatch.tsx`

**Interfaces:**
- Consumes: `measureContrast`, `parseCssColor`, `toHex`, `WcagLevel` from `@/lib/contrast` (Task 1).
- Produces:
  - `interface TocEntry { id: string; label: string }`
  - `function PageFrame(props: { title: string; intro?: string; entries: readonly TocEntry[]; children: ReactNode }): JSX.Element`
  - `function sectionNumber(entries: readonly TocEntry[], id: string): string`
  - `function Section(props: { id: string; number: string; title: string; note?: string; children: ReactNode }): JSX.Element`
  - `function Specimen(props: { name: string; signature?: string; note?: string; children: ReactNode }): JSX.Element`
  - `function Matrix<R extends string, C extends string>(props: { rows: readonly R[]; columns: readonly C[]; rowAxis?: string; columnAxis?: string; render: (row: R, column: C) => ReactNode }): JSX.Element`
  - `function Swatch(props: { token: string; label?: string }): JSX.Element`
  - `function ContrastRow(props: { foreground: string; background: string; label?: string; sample?: string }): JSX.Element` — `foreground` and `background` are full CSS colour values, not token names, so tinted pairs such as `color-mix(in oklab, var(--success) 15%, var(--background))` can be measured too

Every later task consumes these exact names.

- [ ] **Step 1: Write the page frame**

Create `apps/admin/app/design/_chrome/page-frame.tsx`. A server component: the TOC is plain anchors, with no scroll-spy, because a highlighted current section is not worth an IntersectionObserver here.

```tsx
import type { ReactNode } from 'react';

export interface TocEntry {
  id: string;
  label: string;
}

/** Section numbers come from TOC position, so reordering can never desync them. */
export function sectionNumber(entries: readonly TocEntry[], id: string): string {
  const index = entries.findIndex((entry) => entry.id === id);
  return String(index + 1).padStart(2, '0');
}

export function PageFrame({
  title,
  intro,
  entries,
  children,
}: {
  title: string;
  intro?: string;
  entries: readonly TocEntry[];
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-8">
      <header className="mb-10 max-w-[70ch]">
        <h1 className="text-2xl font-medium tracking-tight text-foreground">{title}</h1>
        {intro ? <p className="mt-2 text-sm">{intro}</p> : null}
      </header>

      <div className="grid gap-10 lg:grid-cols-[13rem_1fr] lg:gap-14">
        <nav aria-label="Sommaire" className="lg:sticky lg:top-20 lg:self-start">
          <ol className="space-y-1.5">
            {entries.map((entry) => (
              <li key={entry.id} className="flex gap-2">
                <span className="font-mono text-[10px] leading-5">
                  {sectionNumber(entries, entry.id)}
                </span>
                <a
                  href={`#${entry.id}`}
                  className="rounded-sm text-xs leading-5 underline-offset-2 outline-none hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/15"
                >
                  {entry.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write the section**

Create `apps/admin/app/design/_chrome/section.tsx`:

```tsx
import type { ReactNode } from 'react';

export function Section({
  id,
  number,
  title,
  note,
  children,
}: {
  id: string;
  number: string;
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border pt-6 pb-16">
      <header className="mb-8 flex flex-wrap items-baseline gap-x-3 gap-y-2">
        <span className="font-mono text-xs">{number}</span>
        <h2 className="text-sm font-medium tracking-wide text-foreground uppercase">{title}</h2>
        {note ? <p className="w-full max-w-[70ch] text-xs leading-5">{note}</p> : null}
      </header>
      <div className="space-y-12">{children}</div>
    </section>
  );
}
```

- [ ] **Step 3: Write the specimen (the core of the surface)**

Create `apps/admin/app/design/_chrome/specimen.tsx`:

```tsx
import type { ReactNode } from 'react';

/**
 * One pane. The dark pane is a `.dark` wrapper: the class re-declares the token
 * custom properties for its subtree, and because the ambient page is light
 * (see force-light.tsx) it is also the only place where `dark:` utilities match.
 * The inner div paints `bg-background` so each pane shows its own surface
 * rather than the greige desk behind the chrome.
 */
function Pane({ label, dark, children }: { label: string; dark?: boolean; children: ReactNode }) {
  return (
    <div className={dark ? 'dark' : undefined}>
      <div className="flex h-full flex-col bg-background">
        <p className="border-b border-border px-3 py-1.5 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
          {label}
        </p>
        <div className="flex flex-1 flex-wrap items-center gap-3 p-4">{children}</div>
      </div>
    </div>
  );
}

/**
 * Identification on the left, the same children rendered twice on the right.
 * `signature` is the prop combination being shown, in mono, so a reader can go
 * straight from the specimen to the call site.
 */
export function Specimen({
  name,
  signature,
  note,
  children,
}: {
  name: string;
  signature?: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[15rem_1fr] lg:gap-8">
      <div className="lg:pt-8">
        <p className="font-mono text-xs text-foreground">{name}</p>
        {signature ? <p className="mt-1 font-mono text-[10px] break-words">{signature}</p> : null}
        {note ? <p className="mt-2 max-w-[42ch] text-xs leading-5">{note}</p> : null}
      </div>

      <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
        <Pane label="clair">{children}</Pane>
        <Pane label="sombre" dark>
          {children}
        </Pane>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write the matrix**

Create `apps/admin/app/design/_chrome/matrix.tsx`:

```tsx
import { Fragment, type ReactNode } from 'react';

/**
 * A variant x size grid with mono axis labels. Used inside a Specimen pane, so
 * it inherits that pane's theme and needs no colour of its own.
 */
export function Matrix<R extends string, C extends string>({
  rows,
  columns,
  rowAxis,
  columnAxis,
  render,
}: {
  rows: readonly R[];
  columns: readonly C[];
  rowAxis?: string;
  columnAxis?: string;
  render: (row: R, column: C) => ReactNode;
}) {
  return (
    <div
      className="grid w-full items-center gap-x-4 gap-y-3"
      style={{ gridTemplateColumns: `auto repeat(${columns.length}, minmax(0, 1fr))` }}
    >
      <span className="font-mono text-[10px] text-muted-foreground">
        {rowAxis && columnAxis ? `${rowAxis} / ${columnAxis}` : (rowAxis ?? columnAxis ?? '')}
      </span>
      {columns.map((column) => (
        <span key={column} className="font-mono text-[10px] text-muted-foreground">
          {column}
        </span>
      ))}

      {rows.map((row) => (
        <Fragment key={row}>
          <span className="font-mono text-[10px] text-muted-foreground">{row}</span>
          {columns.map((column) => (
            <div key={`${row}-${column}`} className="min-w-0">
              {render(row, column)}
            </div>
          ))}
        </Fragment>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Write the swatches**

Create `apps/admin/app/design/_chrome/swatch.tsx`. These are the audit instruments: they read back through `getComputedStyle` rather than re-deriving from the token source, so the number accounts for `var()` indirection, alpha, and whichever pane theme they are sitting in.

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';

import { measureContrast, parseCssColor, toHex, type WcagLevel } from '@/lib/contrast';

/** A colour chip that reports the hex it actually painted. */
export function Swatch({ token, label }: { token: string; label?: string }) {
  const chipRef = useRef<HTMLDivElement>(null);
  const [hex, setHex] = useState<string | null>(null);

  useEffect(() => {
    const chip = chipRef.current;
    if (!chip) return;
    const parsed = parseCssColor(getComputedStyle(chip).backgroundColor);
    setHex(parsed ? toHex(parsed.rgb) : null);
  }, [token]);

  return (
    <div className="min-w-24 flex-1">
      <div
        ref={chipRef}
        className="h-14 w-full rounded-md border border-border"
        style={{ backgroundColor: `var(${token})` }}
      />
      <p className="mt-1.5 font-mono text-[10px] text-foreground">{label ?? token}</p>
      <p className="font-mono text-[10px] text-muted-foreground">{hex ?? '—'}</p>
    </div>
  );
}

/**
 * A foreground colour on a background colour, with the measured ratio and its
 * WCAG band. Both take full CSS values (`var(--foreground)`, or a `color-mix()`
 * standing in for a Tailwind tint such as `bg-success/15`) rather than bare
 * token names, so tinted status pairs can be audited too. A failure is marked
 * with a wavy underline rather than a colour, because the chrome adds no colour
 * to what it measures.
 *
 * Known limit: a translucent foreground is composited over the background, but
 * a translucent *background* is not composited over the pane behind it. No
 * current token pair needs that.
 */
export function ContrastRow({
  foreground,
  background,
  label,
  sample = 'Abonnement mensuel',
}: {
  foreground: string;
  background: string;
  label?: string;
  sample?: string;
}) {
  const sampleRef = useRef<HTMLParagraphElement>(null);
  const [reading, setReading] = useState<{ ratio: number; level: WcagLevel } | null>(null);

  useEffect(() => {
    const element = sampleRef.current;
    if (!element) return;
    const styles = getComputedStyle(element);
    setReading(measureContrast(styles.color, styles.backgroundColor));
  }, [foreground, background]);

  return (
    <div className="flex w-full items-center justify-between gap-4 border-b border-border py-2 last:border-b-0">
      <div className="min-w-0">
        <p
          ref={sampleRef}
          className="inline-block rounded-md px-2 py-1 text-sm"
          style={{ color: foreground, backgroundColor: background }}
        >
          {sample}
        </p>
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">
          {label ?? `${foreground} sur ${background}`}
        </p>
      </div>

      <p className="shrink-0 text-right font-mono text-[10px]">
        <span className="block text-foreground">
          {reading ? `${reading.ratio.toFixed(2)}:1` : '—'}
        </span>
        <span
          className={
            reading?.level === 'fail'
              ? 'block underline decoration-wavy underline-offset-2'
              : 'block text-muted-foreground'
          }
        >
          {reading?.level ?? ''}
        </span>
      </p>
    </div>
  );
}
```

- [ ] **Step 6: Verify no chrome file imports the UI package**

```bash
grep -rn "@iziwellpass/ui" apps/admin/app/design/_chrome/ || echo "clean: chrome imports nothing from the system it measures"
```

Expected: `clean: ...`. If anything matches, rewrite that file with raw elements.

- [ ] **Step 7: Verify nothing in the chrome casts a shadow**

```bash
grep -rn "shadow-" apps/admin/app/design/_chrome/ apps/admin/app/design/*.tsx || echo "clean: hairlines only"
```

Expected: `clean: hairlines only`.

- [ ] **Step 8: Typecheck, lint, build**

```bash
pnpm --filter @iziwellpass/admin typecheck && pnpm --filter @iziwellpass/admin lint && pnpm --filter @iziwellpass/admin build
```

Expected: all clean. Nothing renders these components yet; this proves they compile.

- [ ] **Step 9: Commit**

```bash
git add apps/admin/app/design/_chrome
git commit -m "feat(admin): design preview chrome kit with measured contrast readouts

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Foundations page

Seven sections covering the presets layer. This is the page that turns the token file into something you can check by eye, and the contrast rows are the reason it is an audit tool rather than a catalogue.

**Files:**
- Create: `apps/admin/app/design/foundations/page.tsx`

**Interfaces:**
- Consumes: `PageFrame`, `sectionNumber`, `TocEntry` from `../_chrome/page-frame`; `Section` from `../_chrome/section`; `Specimen` from `../_chrome/specimen`; `Swatch`, `ContrastRow` from `../_chrome/swatch`.
- Produces: the route `/design/foundations`. Nothing importable.

- [ ] **Step 1: Write the page**

Create `apps/admin/app/design/foundations/page.tsx`. All values below come from `packages/ui/src/styles/globals.css` and `DESIGN.json`; where a number is asserted (`14px`, `120ms`) it is the documented value, so a mismatch on screen is a real finding.

```tsx
import { CalendarClockIcon, UsersIcon } from 'lucide-react';

import { PageFrame, sectionNumber, type TocEntry } from '../_chrome/page-frame';
import { Section } from '../_chrome/section';
import { Specimen } from '../_chrome/specimen';
import { ContrastRow, Swatch } from '../_chrome/swatch';

const SECTIONS: readonly TocEntry[] = [
  { id: 'couleur', label: 'Couleur' },
  { id: 'typographie', label: 'Typographie' },
  { id: 'espacement', label: 'Espacement et rayons' },
  { id: 'elevation', label: 'Élévation' },
  { id: 'focus', label: 'Focus et états' },
  { id: 'mouvement', label: 'Mouvement' },
  { id: 'icones', label: 'Icônes' },
];

const NEUTRAL_RAMP = [
  '--neutral-50',
  '--neutral-100',
  '--neutral-200',
  '--neutral-300',
  '--neutral-400',
  '--neutral-500',
  '--neutral-600',
  '--neutral-700',
  '--neutral-800',
  '--neutral-900',
  '--neutral-950',
];

const SURFACE_TOKENS = [
  '--backdrop',
  '--background',
  '--card',
  '--popover',
  '--muted',
  '--secondary',
  '--accent',
];

const INK_TOKENS = [
  '--foreground',
  '--muted-foreground',
  '--backdrop-foreground',
  '--primary',
  '--primary-foreground',
];

const LINE_TOKENS = ['--border', '--input', '--ring'];

const STATUS_TOKENS = ['--destructive', '--success', '--warning', '--info'];

const CHART_TOKENS = [
  '--chart-1',
  '--chart-2',
  '--chart-3',
  '--chart-4',
  '--chart-5',
  '--chart-grid',
  '--chart-track',
];

/** A Tailwind `/15` tint expressed as a measurable CSS value. */
const tint = (token: string) => `color-mix(in oklab, var(${token}) 15%, var(--background))`;

const TYPE_STEPS = [
  { name: 'display', spec: '24px / 600 / 1.2 / -0.6px', className: 'text-2xl font-semibold tracking-tight', sample: 'Planning de la semaine' },
  { name: 'title', spec: '16px / 600 / 1.4', className: 'text-base font-semibold', sample: 'Abonnements actifs' },
  { name: 'body', spec: '14px / 400 / 1.5', className: 'text-sm', sample: 'Le membre a été enregistré. Sa carte est active jusqu’au 31 décembre.' },
  { name: 'label', spec: '14px / 500 / 1.3', className: 'text-sm font-medium', sample: 'Moyen de paiement' },
  { name: 'mono', spec: '14px / 400 / 1.4, tabular-nums', className: 'font-mono text-sm tabular-nums', sample: '06:30 · 14/18 · 25 000 FCFA' },
];

const SPACING_STEPS = ['1', '2', '3', '4', '6', '8', '12', '16'];

const RADII = [
  { name: '--radius-sm', spec: '6px', className: 'rounded-sm' },
  { name: '--radius-md', spec: '8px', className: 'rounded-md' },
  { name: '--radius-lg', spec: '10px', className: 'rounded-lg' },
  { name: '--radius-xl', spec: '16px', className: 'rounded-xl' },
  { name: '--radius-pill', spec: '9999px', className: 'rounded-full' },
];

const SHADOWS = [
  { name: 'shadow-xs', purpose: 'Cartes, boutons, champs au repos.', className: 'shadow-xs' },
  { name: 'shadow-popover', purpose: 'Menus, listes déroulantes, infobulles.', className: 'shadow-popover' },
  { name: 'shadow-lg', purpose: 'Boîtes de dialogue, panneaux, toasts.', className: 'shadow-lg' },
];

const ICONS = [
  'ArrowLeftIcon', 'ArrowRightIcon', 'BanIcon', 'Building2Icon', 'CalendarClockIcon',
  'CalendarPlusIcon', 'CameraIcon', 'CheckIcon', 'ChevronDownIcon', 'ChevronRightIcon',
  'ChevronUpIcon', 'ChevronsUpDownIcon', 'CircleIcon', 'CompassIcon', 'EyeIcon',
  'EyeOffIcon', 'LockIcon', 'MapPinIcon', 'Menu', 'MinusIcon', 'MoreHorizontalIcon',
  'PlusIcon', 'QrCodeIcon', 'RepeatIcon', 'ScanLineIcon', 'SearchIcon',
  'TriangleAlertIcon', 'UserPlusIcon', 'UsersIcon', 'XIcon',
];

export default function FoundationsPage() {
  const number = (id: string) => sectionNumber(SECTIONS, id);

  return (
    <PageFrame
      title="Fondations"
      intro="Les jetons avant les composants. Chaque nuancier affiche l’hexadécimal réellement peint, chaque paire texte/fond affiche son ratio de contraste mesuré dans le thème du volet."
      entries={SECTIONS}
    >
      <Section
        id="couleur"
        number={number('couleur')}
        title="Couleur"
        note="Une seule encre, une échelle de gris chaude, quatre couleurs de statut réservées au sens. Les ratios sont mesurés après composition de l’alpha, pas déduits de la source."
      >
        <Specimen name="Échelle stone" signature="--neutral-50 → --neutral-950" note="Les deux pas les plus clairs portent une chroma imperceptible, épinglée sur la famille chaude pour que l’échelle ne dérive jamais vers le froid.">
          <div className="flex w-full flex-wrap gap-2">
            {NEUTRAL_RAMP.map((token) => (
              <Swatch key={token} token={token} label={token.replace('--neutral-', '')} />
            ))}
          </div>
        </Specimen>

        <Specimen name="Surfaces" signature="--backdrop, --background, --card, --popover, --muted, --secondary, --accent">
          <div className="flex w-full flex-wrap gap-2">
            {SURFACE_TOKENS.map((token) => (
              <Swatch key={token} token={token} />
            ))}
          </div>
        </Specimen>

        <Specimen name="Encres" signature="--foreground, --muted-foreground, --backdrop-foreground, --primary…">
          <div className="flex w-full flex-wrap gap-2">
            {INK_TOKENS.map((token) => (
              <Swatch key={token} token={token} />
            ))}
          </div>
        </Specimen>

        <Specimen name="Filets" signature="--border, --input, --ring">
          <div className="flex w-full flex-wrap gap-2">
            {LINE_TOKENS.map((token) => (
              <Swatch key={token} token={token} />
            ))}
          </div>
        </Specimen>

        <Specimen name="Statuts" signature="--destructive, --success, --warning, --info" note="Jamais décoratives : elles n’apparaissent que sur un badge, une alerte ou une barre de capacité.">
          <div className="flex w-full flex-wrap gap-2">
            {STATUS_TOKENS.map((token) => (
              <Swatch key={token} token={token} />
            ))}
          </div>
        </Specimen>

        <Specimen name="Données" signature="--chart-1 → --chart-5, --chart-grid, --chart-track">
          <div className="flex w-full flex-wrap gap-2">
            {CHART_TOKENS.map((token) => (
              <Swatch key={token} token={token} />
            ))}
          </div>
        </Specimen>

        <Specimen
          name="Contraste du texte"
          signature="ratio mesuré, niveau WCAG"
          note="Un niveau « fail » est souligné en ondulé, sans couleur : le chrome n’ajoute aucune couleur à ce qu’il mesure."
        >
          <div className="w-full">
            <ContrastRow foreground="var(--foreground)" background="var(--background)" label="--foreground sur --background" />
            <ContrastRow foreground="var(--muted-foreground)" background="var(--background)" label="--muted-foreground sur --background" />
            <ContrastRow foreground="var(--backdrop-foreground)" background="var(--backdrop)" label="--backdrop-foreground sur --backdrop" />
            <ContrastRow foreground="var(--primary-foreground)" background="var(--primary)" label="--primary-foreground sur --primary" />
            <ContrastRow foreground="var(--secondary-foreground)" background="var(--secondary)" label="--secondary-foreground sur --secondary" />
            <ContrastRow foreground="var(--success-foreground)" background={tint('--success')} label="--success-foreground sur --success/15" sample="Payé" />
            <ContrastRow foreground="var(--warning-foreground)" background={tint('--warning')} label="--warning-foreground sur --warning/15" sample="En attente" />
            <ContrastRow foreground="var(--info-foreground)" background={tint('--info')} label="--info-foreground sur --info/15" sample="Invité" />
            <ContrastRow foreground="var(--destructive-foreground)" background="var(--destructive)" label="--destructive-foreground sur --destructive" sample="Annulé" />
          </div>
        </Specimen>
      </Section>

      <Section
        id="typographie"
        number={number('typographie')}
        title="Typographie"
        note="Hanken Grotesk pour le texte, Geist Mono pour tout ce qui se compte. Prose limitée à 65–75 caractères par ligne."
      >
        {TYPE_STEPS.map((step) => (
          <Specimen key={step.name} name={step.name} signature={step.spec}>
            <p className={`${step.className} text-foreground`}>{step.sample}</p>
          </Specimen>
        ))}

        <Specimen
          name="Chiffres tabulaires"
          signature="font-mono tabular-nums"
          note="Les colonnes de chiffres doivent s’aligner verticalement. Si les unités dansent d’une ligne à l’autre, tabular-nums manque quelque part."
        >
          <table className="w-full text-sm">
            <tbody className="text-foreground">
              {[
                ['06:30', '14/18', '25 000'],
                ['11:00', '9/18', '110 000'],
                ['18:45', '18/18', '7 500'],
              ].map((row) => (
                <tr key={row[0]}>
                  {row.map((cell) => (
                    <td key={cell} className="py-0.5 pr-6 text-right font-mono tabular-nums">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Specimen>
      </Section>

      <Section
        id="espacement"
        number={number('espacement')}
        title="Espacement et rayons"
        note="Le rythme vient de la variation : un espacement identique partout est de la monotonie, pas un système."
      >
        <Specimen name="Échelle d’espacement" signature="0.25rem par pas">
          <div className="flex w-full flex-col gap-1.5">
            {SPACING_STEPS.map((step) => (
              <div key={step} className="flex items-center gap-3">
                <span className="w-8 font-mono text-[10px] text-muted-foreground">{step}</span>
                <div className="h-2 bg-foreground" style={{ width: `${Number(step) * 0.25}rem` }} />
                <span className="font-mono text-[10px] text-muted-foreground">
                  {Number(step) * 4}px
                </span>
              </div>
            ))}
          </div>
        </Specimen>

        <Specimen name="Rayons" signature="--radius: 10px, --radius-xl: 16px, --radius-pill: 9999px">
          <div className="flex w-full flex-wrap gap-4">
            {RADII.map((radius) => (
              <div key={radius.name} className="text-center">
                <div className={`size-16 border border-border bg-muted ${radius.className}`} />
                <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">{radius.spec}</p>
              </div>
            ))}
          </div>
        </Specimen>
      </Section>

      <Section
        id="elevation"
        number={number('elevation')}
        title="Élévation"
        note="Le filet de 1px vient toujours en premier ; l’ombre n’intervient que si l’élément flotte vraiment. Toutes les ombres sont teintées d’encre, jamais d’un noir froid."
      >
        <Specimen name="Filet seul" signature="border border-border" note="Le niveau par défaut. La plupart des séparations s’arrêtent ici.">
          <div className="size-24 rounded-xl border border-border bg-card" />
        </Specimen>

        {SHADOWS.map((shadow) => (
          <Specimen key={shadow.name} name={shadow.name} signature={shadow.className} note={shadow.purpose}>
            <div className={`size-24 rounded-xl border border-border bg-card ${shadow.className}`} />
          </Specimen>
        ))}
      </Section>

      <Section
        id="focus"
        number={number('focus')}
        title="Focus et états"
        note="Une seule convention d’anneau dans toute l’application. Le survol et le focus clavier ne peuvent pas être simulés honnêtement : tabulez dans les volets ci-dessous pour les voir."
      >
        <Specimen
          name="Anneau de focus"
          signature="focus-visible:ring-[3px] focus-visible:ring-ring/15 focus-visible:border-ring"
          note="Tabulez jusqu’au champ pour déclencher l’état réel."
        >
          <input
            className="h-11 rounded-full border border-input bg-background px-4 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/15 lg:h-9"
            placeholder="Rechercher un membre"
            aria-label="Rechercher un membre"
          />
        </Specimen>

        <Specimen name="Anneau, forcé" signature="ring-[3px] ring-ring/15 border-ring" note="Le même anneau, appliqué en permanence, pour le comparer entre les deux thèmes sans avoir à tabuler dans chaque volet.">
          <div className="h-11 w-56 rounded-full border border-ring bg-background px-4 text-sm leading-11 text-muted-foreground ring-[3px] ring-ring/15 lg:h-9 lg:leading-9">
            Rechercher un membre
          </div>
        </Specimen>

        <Specimen name="Désactivé" signature="disabled:opacity-50 disabled:pointer-events-none">
          <button
            type="button"
            disabled
            className="h-11 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground opacity-50 lg:h-9"
          >
            Valider
          </button>
        </Specimen>
      </Section>

      <Section
        id="mouvement"
        number={number('mouvement')}
        title="Mouvement"
        note="Deux durées, toutes deux en ease-out. Le mouvement est fonctionnel, jamais décoratif, et prefers-reduced-motion le neutralise dans toute l’application."
      >
        <Specimen name="state-change" signature="120ms ease-out" note="Changements de couleur, de fond et d’ombre au survol ou au basculement. Survolez le bloc.">
          <div className="size-24 rounded-xl border border-border bg-card transition-colors duration-150 ease-out hover:bg-accent" />
        </Specimen>

        <Specimen name="progress" signature="250ms ease-out" note="Largeur de la barre de capacité, chevrons d’accordéon. Survolez la piste.">
          <div className="group h-2 w-full rounded-full bg-chart-track">
            <div className="h-2 w-1/4 rounded-full bg-chart-1 transition-[width] duration-[250ms] ease-out group-hover:w-3/4" />
          </div>
        </Specimen>
      </Section>

      <Section
        id="icones"
        number={number('icones')}
        title="Icônes"
        note="Lucide uniquement, trait de 2px, taille 4 (16px) par défaut. Le sens est porté par l’icône et la couleur du badge, jamais par un emoji."
      >
        <Specimen name="Jeu en usage" signature={`${ICONS.length} icônes`} note="Liste régénérée depuis les imports lucide-react du dépôt.">
          <ul className="flex w-full flex-wrap gap-x-4 gap-y-3">
            {ICONS.map((name) => (
              <li key={name} className="w-28 text-center">
                <span className="font-mono text-[10px] break-words text-muted-foreground">{name}</span>
              </li>
            ))}
          </ul>
        </Specimen>

        <Specimen name="Taille et alignement" signature="size-4 avec un texte 14px">
          <p className="inline-flex items-center gap-2 text-sm text-foreground">
            <CalendarClockIcon className="size-4" aria-hidden />
            06:30
          </p>
          <p className="inline-flex items-center gap-2 text-sm text-foreground">
            <UsersIcon className="size-4" aria-hidden />
            14/18
          </p>
        </Specimen>
      </Section>
    </PageFrame>
  );
}
```

To regenerate the `ICONS` array when it drifts, run this from `web/`:

```bash
grep -rh --include="*.tsx" -oE "\{[^}]*\} from 'lucide-react'" apps packages \
  | sed "s/[{}]//g;s/ from 'lucide-react'//" | tr ',' '\n' \
  | sed 's/^ *//;s/ *$//' | grep -v '^$' | sort -u
```

The icon section lists names rather than rendering all 30 glyphs, because rendering them would require 30 named imports whose only purpose is decoration. The two icons that are imported are shown at their real size against real 14px text, which is the thing worth checking.

- [ ] **Step 2: Typecheck, lint, build**

```bash
pnpm --filter @iziwellpass/admin typecheck && pnpm --filter @iziwellpass/admin lint && pnpm --filter @iziwellpass/admin build
```

Expected: all clean.

- [ ] **Step 3: Verify in a browser**

```bash
pnpm --filter @iziwellpass/admin dev
```

At `http://localhost:3012/design/foundations`, confirm:

1. Every swatch shows a hex, not `—`. A `—` means `parseCssColor` could not read what the engine reported; note the raw value and extend the parser.
2. `--foreground` on `--background` reads about `17.34:1 AAA` in the light pane, and the dark pane reads its own, different number.
3. `--backdrop-foreground` on `--backdrop` clears AA in both panes. `globals.css` claims about 4.9:1; the measured value is nearer 5.07, which is a doc drift worth noting but not a failure.
4. No `fail` band appears anywhere. If one does, that is a real finding: record it, do not silence it.
5. The TOC anchors jump to the right sections and the headings are not hidden under the sticky route bar.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/app/design/foundations
git commit -m "feat(admin): foundations page with measured contrast for every token pair

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### A note on portalled overlays (applies to Tasks 6 and 7)

`DialogContent`, `SheetContent`, `PopoverContent`, `TooltipContent`, `DropdownMenuContent`, `SelectContent` and the Sonner `Toaster` all mount into `document.body` through a Radix portal. A portal escapes the `.dark` pane wrapper, so an overlay opened from the dark pane still renders in the page's ambient light theme.

Three options were considered. Adding a `portalContainer` passthrough to six components in `packages/ui` was rejected as scope creep the spec explicitly ruled out. Putting `.dark` on `document.body` was rejected because `dark:` utilities inside the light pane would then match `.dark *` and that pane would be a lie, which is the exact bug `force-light.tsx` exists to prevent.

The adopted approach, used consistently in both tasks:

1. **A live trigger in each pane.** Opening it exercises the real thing: portal, scrim, focus trap, animation, close button, dismiss guard. It renders in light, and the specimen note says so.
2. **An inline content specimen in both panes.** The non-portalled sub-components (`DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, and their Sheet equivalents) rendered inside a plain bordered box labelled « contenu, hors portail ». This is what shows overlay typography and spacing in dark.

The box deliberately does not restate the real surface's radius or shadow, because a copy of those classes would drift. Radius, shadow and scrim are checked live, in light, through the trigger. Say this in the specimen note rather than leaving a reader to assume the inline box is the real surface.

---

### Task 6: Primitives, part 1 (controls and forms)

The twelve `group: 'controls'` entries in the registry. Split from part 2 so neither file grows past what can be edited reliably.

**Files:**
- Create: `apps/admin/app/design/primitives/controls.tsx`

**Interfaces:**
- Consumes: `Section` from `../_chrome/section`; `Specimen` from `../_chrome/specimen`; `Matrix` from `../_chrome/matrix`; `sectionNumber`, `TocEntry` from `../_chrome/page-frame`; `primitivesInGroup` from `@/lib/design-registry`.
- Produces:
  - `const CONTROL_SECTIONS: readonly TocEntry[]` (derived from the registry, so the TOC cannot drift from the coverage test)
  - `function ControlSpecimens({ entries }: { entries: readonly TocEntry[] }): JSX.Element`

`entries` is passed in rather than read from the module so `page.tsx` can number sections across both modules continuously.

- [ ] **Step 1: Write the module**

Create `apps/admin/app/design/primitives/controls.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { MoreHorizontalIcon, PlusIcon, SearchIcon } from 'lucide-react';

import { Button } from '@iziwellpass/ui/components/button';
import { Checkbox } from '@iziwellpass/ui/components/checkbox';
import { Combobox } from '@iziwellpass/ui/components/combobox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@iziwellpass/ui/components/dropdown-menu';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@iziwellpass/ui/components/form';
import { Input } from '@iziwellpass/ui/components/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@iziwellpass/ui/components/input-otp';
import { Label } from '@iziwellpass/ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@iziwellpass/ui/components/select';
import { Switch } from '@iziwellpass/ui/components/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@iziwellpass/ui/components/tabs';
import { Textarea } from '@iziwellpass/ui/components/textarea';

import { primitivesInGroup } from '@/lib/design-registry';
import { Matrix } from '../_chrome/matrix';
import { sectionNumber, type TocEntry } from '../_chrome/page-frame';
import { Section } from '../_chrome/section';
import { Specimen } from '../_chrome/specimen';

export const CONTROL_SECTIONS: readonly TocEntry[] = primitivesInGroup('controls').map((entry) => ({
  id: entry.id,
  label: entry.title,
}));

const BUTTON_VARIANTS = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] as const;
const BUTTON_SIZES = ['default', 'xs', 'sm', 'lg'] as const;

const VENUE_OPTIONS = [
  { value: 'plateau', label: 'Salle du Plateau' },
  { value: 'cocody', label: 'Studio Cocody' },
  { value: 'marcory', label: 'Piscine Marcory', disabled: true, hint: 'Fermée pour travaux' },
];

/** A form specimen needs a live react-hook-form instance to show a real error. */
function FormSpecimen() {
  const form = useForm<{ email: string }>({
    defaultValues: { email: 'pas-une-adresse' },
    mode: 'onChange',
  });

  return (
    <Form {...form}>
      <form className="w-full space-y-3" onSubmit={(event) => event.preventDefault()}>
        <FormField
          control={form.control}
          name="email"
          rules={{ pattern: { value: /.+@.+\..+/, message: 'Adresse e-mail invalide.' } }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adresse e-mail</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>Utilisée pour l’invitation du membre.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="button" size="sm" onClick={() => void form.trigger()}>
          Vérifier
        </Button>
      </form>
    </Form>
  );
}

function ComboboxSpecimen() {
  const [value, setValue] = useState('plateau');
  return (
    <Combobox
      options={VENUE_OPTIONS}
      value={value}
      onValueChange={setValue}
      placeholder="Choisir une salle"
      searchPlaceholder="Rechercher une salle"
      emptyText="Aucune salle."
    />
  );
}

export function ControlSpecimens({ entries }: { entries: readonly TocEntry[] }) {
  const number = (id: string) => sectionNumber(entries, id);

  return (
    <>
      <Section
        id="button"
        number={number('button')}
        title="Bouton"
        note="Pilule pleine. La taille par défaut fait 44px sur téléphone et redescend à 36px à partir de lg : la règle « comptoir d’abord » est encodée dans la primitive, pas laissée aux appelants."
      >
        <Specimen name="Button" signature="variant x size" note="Le survol et le focus clavier ne sont pas simulés : survolez et tabulez dans chaque volet.">
          <Matrix
            rows={BUTTON_VARIANTS}
            columns={BUTTON_SIZES}
            rowAxis="variant"
            columnAxis="size"
            render={(variant, size) => (
              <Button variant={variant} size={size}>
                Valider
              </Button>
            )}
          />
        </Specimen>

        <Specimen name="Button" signature="size=icon | icon-xs | icon-sm | icon-lg">
          {(['icon-xs', 'icon-sm', 'icon', 'icon-lg'] as const).map((size) => (
            <Button key={size} size={size} variant="outline" aria-label="Ajouter">
              <PlusIcon />
            </Button>
          ))}
        </Specimen>

        <Specimen name="Button" signature="disabled">
          {BUTTON_VARIANTS.map((variant) => (
            <Button key={variant} variant={variant} disabled>
              Valider
            </Button>
          ))}
        </Specimen>
      </Section>

      <Section id="input" number={number('input')} title="Champ de saisie" note="Les champs numériques passent en Geist Mono automatiquement (règle des chiffres mono).">
        <Specimen name="Input" signature="défaut, avec valeur, désactivé, aria-invalid">
          <div className="grid w-full gap-3">
            <Input placeholder="Nom du membre" aria-label="Nom du membre" />
            <Input defaultValue="Aminata Diallo" aria-label="Nom renseigné" />
            <Input placeholder="Non modifiable" disabled aria-label="Champ désactivé" />
            <Input defaultValue="pas-une-adresse" aria-invalid aria-label="Champ en erreur" />
          </div>
        </Specimen>

        <Specimen name="Input" signature="type=number" note="Doit s’afficher en mono tabulaire : les colonnes de chiffres s’alignent.">
          <Input type="number" defaultValue={25000} aria-label="Montant en FCFA" />
        </Specimen>
      </Section>

      <Section id="textarea" number={number('textarea')} title="Zone de texte">
        <Specimen name="Textarea" signature="défaut, avec valeur, désactivé">
          <div className="grid w-full gap-3">
            <Textarea placeholder="Note interne sur le membre" aria-label="Note vide" />
            <Textarea
              defaultValue="Préfère les cours du matin. A réglé en espèces le 3 septembre."
              aria-label="Note remplie"
            />
            <Textarea placeholder="Non modifiable" disabled aria-label="Note désactivée" />
          </div>
        </Specimen>
      </Section>

      <Section id="label" number={number('label')} title="Étiquette" note="14px, poids 500, casse phrase. Jamais en majuscules dans le produit ; les majuscules de cette page appartiennent au chrome.">
        <Specimen name="Label" signature="associé à un champ">
          <div className="grid w-full gap-1.5">
            <Label htmlFor="specimen-venue">Salle de rattachement</Label>
            <Input id="specimen-venue" defaultValue="Salle du Plateau" />
          </div>
        </Specimen>
      </Section>

      <Section id="form" number={number('form')} title="Formulaire" note="FormMessage porte l’erreur ; le champ reçoit aria-invalid. L’erreur ci-dessous est réelle : cliquez sur « Vérifier ».">
        <Specimen name="Form" signature="FormItem, FormLabel, FormControl, FormDescription, FormMessage">
          <FormSpecimen />
        </Specimen>
      </Section>

      <Section id="select" number={number('select')} title="Liste déroulante" note="Le contenu s’ouvre dans un portail : il se rend dans le thème ambiant de la page, donc en clair. Voir la note sur les portails.">
        <Specimen name="Select" signature="défaut, avec valeur, désactivé">
          <div className="grid w-full gap-3">
            <Select>
              <SelectTrigger aria-label="Choisir une salle">
                <SelectValue placeholder="Choisir une salle" />
              </SelectTrigger>
              <SelectContent>
                {VENUE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select disabled>
              <SelectTrigger aria-label="Sélecteur désactivé">
                <SelectValue placeholder="Non modifiable" />
              </SelectTrigger>
              <SelectContent />
            </Select>
          </div>
        </Specimen>
      </Section>

      <Section id="combobox" number={number('combobox')} title="Sélecteur avec recherche" note="Textes par défaut en français. Une option désactivée affiche son motif.">
        <Specimen name="Combobox" signature="options, value, onValueChange">
          <ComboboxSpecimen />
        </Specimen>
        <Specimen name="Combobox" signature="disabled">
          <Combobox options={VENUE_OPTIONS} disabled placeholder="Choisir une salle" />
        </Specimen>
      </Section>

      <Section id="checkbox" number={number('checkbox')} title="Case à cocher">
        <Specimen name="Checkbox" signature="décochée, cochée, désactivée">
          <div className="flex w-full flex-col gap-3">
            <div className="flex items-center gap-2">
              <Checkbox id="specimen-cb-1" />
              <Label htmlFor="specimen-cb-1">Envoyer l’invitation par e-mail</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="specimen-cb-2" defaultChecked />
              <Label htmlFor="specimen-cb-2">Renouvellement automatique</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="specimen-cb-3" disabled />
              <Label htmlFor="specimen-cb-3">Accès multi-salles</Label>
            </div>
          </div>
        </Specimen>
      </Section>

      <Section id="switch" number={number('switch')} title="Interrupteur">
        <Specimen name="Switch" signature="off, on, désactivé">
          <Switch aria-label="Inactif" />
          <Switch defaultChecked aria-label="Actif" />
          <Switch disabled aria-label="Désactivé" />
        </Specimen>
      </Section>

      <Section id="input-otp" number={number('input-otp')} title="Code à usage unique" note="Chiffres en mono. Utilisé à la connexion et à la validation d’un passage.">
        <Specimen name="InputOTP" signature="maxLength=6, vide et rempli">
          <div className="grid w-full gap-4">
            <InputOTP maxLength={6}>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <InputOTPSlot key={index} index={index} />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <InputOTP maxLength={6} value="0630" onChange={() => undefined}>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <InputOTPSlot key={index} index={index} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
        </Specimen>
      </Section>

      <Section id="tabs" number={number('tabs')} title="Onglets">
        <Specimen name="Tabs" signature="TabsList, TabsTrigger, TabsContent">
          <Tabs defaultValue="presents" className="w-full">
            <TabsList>
              <TabsTrigger value="presents">Présents</TabsTrigger>
              <TabsTrigger value="attendus">Attendus</TabsTrigger>
              <TabsTrigger value="absents" disabled>
                Absents
              </TabsTrigger>
            </TabsList>
            <TabsContent value="presents" className="pt-3 text-sm">
              14 membres présents à 06:30.
            </TabsContent>
            <TabsContent value="attendus" className="pt-3 text-sm">
              4 membres attendus.
            </TabsContent>
          </Tabs>
        </Specimen>
      </Section>

      <Section id="dropdown-menu" number={number('dropdown-menu')} title="Menu déroulant" note="Ouvre dans un portail, donc en clair. Voir la note sur les portails.">
        <Specimen name="DropdownMenu" signature="Trigger, Label, Item, Separator">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Actions">
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Membre</DropdownMenuLabel>
              <DropdownMenuItem>
                <SearchIcon />
                Voir la fiche
              </DropdownMenuItem>
              <DropdownMenuItem>Modifier l’abonnement</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">Suspendre l’accès</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Specimen>
      </Section>
    </>
  );
}
```

- [ ] **Step 2: Reconcile with the real component APIs**

Before typechecking, open each imported component and confirm the props used above exist. Two known risks: `DropdownMenuItem` may not accept `variant="destructive"`, and `Textarea` may not be exported from the path used. Where a prop does not exist, drop it from the specimen rather than adding it to the component: this task documents the system, it does not change it.

```bash
grep -n "variant" packages/ui/src/components/dropdown-menu.tsx | head
grep -n "export" packages/ui/src/components/textarea.tsx
```

- [ ] **Step 3: Typecheck and lint**

```bash
pnpm --filter @iziwellpass/admin typecheck && pnpm --filter @iziwellpass/admin lint
```

Expected: clean. The module is not rendered yet; Task 7's page wires it up.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/app/design/primitives/controls.tsx
git commit -m "feat(admin): control and form primitive specimens

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Primitives, part 2 (display, feedback, overlays) and the page

The sixteen `group: 'display'` entries, plus the page that composes both modules into one continuously numbered TOC.

**Files:**
- Create: `apps/admin/app/design/primitives/display.tsx`
- Create: `apps/admin/app/design/primitives/page.tsx`

**Interfaces:**
- Consumes: everything Task 6 consumes, plus `CONTROL_SECTIONS` and `ControlSpecimens` from `./controls`.
- Produces:
  - `const DISPLAY_SECTIONS: readonly TocEntry[]`
  - `function DisplaySpecimens({ entries }: { entries: readonly TocEntry[] }): JSX.Element`
  - the route `/design/primitives`

- [ ] **Step 1: Write the display module**

Create `apps/admin/app/design/primitives/display.tsx`:

```tsx
'use client';

import type { ReactNode } from 'react';
import { CalendarClockIcon, TriangleAlertIcon, UsersIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertReference, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Avatar, AvatarFallback, AvatarGroup } from '@iziwellpass/ui/components/avatar';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Button } from '@iziwellpass/ui/components/button';
import { Capacity } from '@iziwellpass/ui/components/capacity';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@iziwellpass/ui/components/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@iziwellpass/ui/components/dialog';
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '@iziwellpass/ui/components/empty';
import { Popover, PopoverContent, PopoverTrigger } from '@iziwellpass/ui/components/popover';
import { Progress } from '@iziwellpass/ui/components/progress';
import { Separator } from '@iziwellpass/ui/components/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@iziwellpass/ui/components/sheet';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { Stat, StatPanel } from '@iziwellpass/ui/components/stat';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@iziwellpass/ui/components/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@iziwellpass/ui/components/tooltip';

import { primitivesInGroup } from '@/lib/design-registry';
import { sectionNumber, type TocEntry } from '../_chrome/page-frame';
import { Section } from '../_chrome/section';
import { Specimen } from '../_chrome/specimen';

export const DISPLAY_SECTIONS: readonly TocEntry[] = primitivesInGroup('display').map((entry) => ({
  id: entry.id,
  label: entry.title,
}));

const BADGE_VARIANTS = [
  'default', 'secondary', 'destructive', 'success', 'warning', 'info', 'outline', 'ghost',
] as const;

const BADGE_LABELS: Record<string, string> = {
  default: 'Actif',
  secondary: 'Brouillon',
  destructive: 'Suspendu',
  success: 'Payé',
  warning: 'En attente',
  info: 'Invité',
  outline: 'Archivé',
  ghost: 'Aucun',
};

const ALERT_VARIANTS = ['default', 'destructive', 'success', 'warning', 'info'] as const;

/** The inline box that stands in for a portalled surface. See the portal note. */
function OffPortal({ children }: { children: ReactNode }) {
  return (
    <div className="w-full">
      <p className="mb-2 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
        contenu, hors portail
      </p>
      <div className="grid gap-4 border border-border p-4">{children}</div>
    </div>
  );
}

export function DisplaySpecimens({ entries }: { entries: readonly TocEntry[] }) {
  const number = (id: string) => sectionNumber(entries, id);

  return (
    <>
      <Section
        id="badge"
        number={number('badge')}
        title="Badge"
        note="La couleur porte le sens, jamais la décoration. Les variantes de statut posent un texte sombre sur une teinte à 15% ; leurs ratios sont mesurés dans la page Fondations."
      >
        <Specimen name="Badge" signature="variant">
          {BADGE_VARIANTS.map((variant) => (
            <Badge key={variant} variant={variant}>
              {BADGE_LABELS[variant]}
            </Badge>
          ))}
        </Specimen>
      </Section>

      <Section id="alert" number={number('alert')} title="Alerte" note="Factuelle, jamais alarmante. AlertReference porte une référence support en mono.">
        <Specimen name="Alert" signature="variant">
          <div className="grid w-full gap-3">
            {ALERT_VARIANTS.map((variant) => (
              <Alert key={variant} variant={variant}>
                <TriangleAlertIcon />
                <AlertTitle>Trois paiements en attente</AlertTitle>
                <AlertDescription>
                  Les abonnements concernés restent actifs jusqu’au 30 septembre.
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </Specimen>

        <Specimen name="Alert" signature="avec AlertReference">
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertTitle>Impossible de charger les membres</AlertTitle>
            <AlertDescription>Vérifiez la connexion, puis réessayez.</AlertDescription>
            <AlertReference>REQ-4F2A91</AlertReference>
          </Alert>
        </Specimen>
      </Section>

      <Section
        id="capacity"
        number={number('capacity')}
        title="Capacité"
        note="L’instrument expressif du système. Le compte est en mono, le seuil colore la barre à partir de 85% et au complet, et le badge et la barre disent toujours la même chose."
      >
        <Specimen name="Capacity" signature="booked / capacity, des trois niveaux">
          <div className="grid w-full gap-4">
            <Capacity booked={9} capacity={18} label="09:00 Pilates" />
            <Capacity booked={16} capacity={18} label="06:30 CrossFit" />
            <Capacity booked={18} capacity={18} label="18:45 Yoga" />
            <Capacity booked={0} capacity={18} label="12:00 Aquagym" />
          </div>
        </Specimen>

        <Specimen name="Capacity" signature="hideCount">
          <Capacity booked={16} capacity={18} label="06:30 CrossFit" hideCount />
        </Specimen>
      </Section>

      <Section id="progress" number={number('progress')} title="Barre de progression" note="La primitive brute. Pour une jauge de salle, préférer Capacity, qui encode les seuils.">
        <Specimen name="Progress" signature="value">
          <div className="grid w-full gap-3">
            {[0, 35, 85, 100].map((value) => (
              <Progress key={value} value={value} />
            ))}
          </div>
        </Specimen>
      </Section>

      <Section id="stat" number={number('stat')} title="Chiffres clés" note="Une seule surface découpée par des filets, à la place d’une grille de cartes métriques identiques (le gabarit interdit).">
        <Specimen name="StatPanel + Stat" signature="label, value, isLoading">
          <StatPanel className="w-full grid-cols-2 xl:grid-cols-4">
            <Stat label="Membres actifs" value="248" />
            <Stat label="Présents aujourd’hui" value="41" />
            <Stat label="Paiements en attente" value="3" />
            <Stat label="Revenus du mois" value="1 240 000" />
          </StatPanel>
        </Specimen>

        <Specimen name="StatPanel + Stat" signature="isLoading, valeur nulle">
          <StatPanel className="w-full grid-cols-2">
            <Stat label="Membres actifs" value={null} isLoading />
            <Stat label="Présents aujourd’hui" value={null} />
          </StatPanel>
        </Specimen>
      </Section>

      <Section id="table" number={number('table')} title="Tableau" note="Les cellules numériques passent en mono tabulaire via la variante numeric, pour que les colonnes de chiffres s’alignent.">
        <Specimen name="Table" signature="TableHead/TableCell numeric">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membre</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead numeric>Séances</TableHead>
                <TableHead numeric>Solde</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                ['Aminata Diallo', 'success', 'Payé', '12', '0'],
                ['Koffi N’Guessan', 'warning', 'En attente', '3', '25 000'],
                ['Fatou Traoré', 'destructive', 'Suspendu', '0', '110 000'],
              ].map(([name, variant, status, sessions, balance]) => (
                <TableRow key={name}>
                  <TableCell>{name}</TableCell>
                  <TableCell>
                    <Badge variant={variant as (typeof BADGE_VARIANTS)[number]}>{status}</Badge>
                  </TableCell>
                  <TableCell numeric>{sessions}</TableCell>
                  <TableCell numeric>{balance}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Specimen>
      </Section>

      <Section id="card" number={number('card')} title="Carte" note="À réserver aux cas où la carte est vraiment la bonne affordance. Jamais imbriquée.">
        <Specimen name="Card" signature="Header, Title, Description, Content">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Salle du Plateau</CardTitle>
              <CardDescription>Ouverte de 06:00 à 21:00, du lundi au samedi.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm">18 places, 4 encadrants.</CardContent>
          </Card>
        </Specimen>
      </Section>

      <Section id="empty" number={number('empty')} title="État vide" note="Jamais un cul-de-sac : l’état vide dit toujours quoi faire ensuite.">
        <Specimen name="Empty" signature="Media, Title, Description">
          <Empty className="w-full">
            <EmptyMedia>
              <UsersIcon className="size-6" aria-hidden />
            </EmptyMedia>
            <EmptyTitle>Aucun membre pour l’instant</EmptyTitle>
            <EmptyDescription>
              Ajoutez un premier membre pour commencer à enregistrer les passages.
            </EmptyDescription>
          </Empty>
        </Specimen>
      </Section>

      <Section id="skeleton" number={number('skeleton')} title="Squelette de chargement" note="Même rayon que la surface qu’il remplace. L’animation s’arrête si prefers-reduced-motion est actif.">
        <Specimen name="Skeleton" signature="tailles usuelles">
          <div className="grid w-full gap-2">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </Specimen>
      </Section>

      <Section id="avatar" number={number('avatar')} title="Avatar">
        <Specimen name="Avatar" signature="Fallback, AvatarGroup">
          <Avatar>
            <AvatarFallback>AD</AvatarFallback>
          </Avatar>
          <AvatarGroup>
            <Avatar>
              <AvatarFallback>AD</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>KN</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>FT</AvatarFallback>
            </Avatar>
          </AvatarGroup>
        </Specimen>
      </Section>

      <Section id="separator" number={number('separator')} title="Séparateur">
        <Specimen name="Separator" signature="horizontal, vertical">
          <div className="grid w-full gap-3">
            <Separator />
            <div className="flex h-8 items-center gap-3 text-sm">
              <span>06:30</span>
              <Separator orientation="vertical" />
              <span>Salle du Plateau</span>
            </div>
          </div>
        </Specimen>
      </Section>

      <Section id="dialog" number={number('dialog')} title="Boîte de dialogue" note="Le déclencheur ouvre la vraie boîte, dans un portail, donc en clair. La boîte ci-dessous montre le contenu dans les deux thèmes, sans revendiquer le rayon ni l’ombre réels.">
        <Specimen name="Dialog" signature="déclencheur réel">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Supprimer le membre</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Supprimer ce membre ?</DialogTitle>
                <DialogDescription>
                  Son historique de passages sera conservé, mais son accès sera révoqué
                  immédiatement.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost">Annuler</Button>
                <Button variant="destructive">Supprimer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Specimen>

        <Specimen name="Dialog" signature="Header, Title, Description, Footer">
          <OffPortal>
            <DialogHeader>
              <DialogTitle>Supprimer ce membre ?</DialogTitle>
              <DialogDescription>
                Son historique de passages sera conservé, mais son accès sera révoqué
                immédiatement.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost">Annuler</Button>
              <Button variant="destructive">Supprimer</Button>
            </DialogFooter>
          </OffPortal>
        </Specimen>
      </Section>

      <Section id="sheet" number={number('sheet')} title="Panneau latéral" note="Même limite de portail que la boîte de dialogue.">
        <Specimen name="Sheet" signature="déclencheur réel">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Ouvrir la fiche</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Aminata Diallo</SheetTitle>
                <SheetDescription>Abonnement mensuel illimité, actif jusqu’au 31 décembre.</SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>
        </Specimen>

        <Specimen name="Sheet" signature="Header, Title, Description">
          <OffPortal>
            <SheetHeader>
              <SheetTitle>Aminata Diallo</SheetTitle>
              <SheetDescription>Abonnement mensuel illimité, actif jusqu’au 31 décembre.</SheetDescription>
            </SheetHeader>
          </OffPortal>
        </Specimen>
      </Section>

      <Section id="popover" number={number('popover')} title="Popover" note="Ouvre dans un portail, donc en clair.">
        <Specimen name="Popover" signature="Trigger, Content">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <CalendarClockIcon />
                Choisir une date
              </Button>
            </PopoverTrigger>
            <PopoverContent className="text-sm">
              Les créneaux du 6 septembre sont complets.
            </PopoverContent>
          </Popover>
        </Specimen>
      </Section>

      <Section id="tooltip" number={number('tooltip')} title="Infobulle" note="Ombre popover, jamais l’ombre des vrais calques flottants.">
        <Specimen name="Tooltip" signature="Provider, Trigger, Content">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Capacité">
                  <UsersIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent>14 présents sur 18 places</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Specimen>
      </Section>

      <Section id="sonner" number={number('sonner')} title="Notification" note="Le Toaster est monté une seule fois par application, au niveau des providers. Le déclencheur ci-dessous n’affiche une notification que si un Toaster est présent : ouvrez-le depuis l’application, pas depuis cette page.">
        <Specimen name="toast" signature="déclencheur">
          <Button variant="outline" onClick={() => toast('Passage enregistré à 06:32.')}>
            Déclencher une notification
          </Button>
        </Specimen>
      </Section>
    </>
  );
}
```

- [ ] **Step 2: Write the page**

Create `apps/admin/app/design/primitives/page.tsx`. The two modules' entries are concatenated once, so section numbers run continuously from 01 to 28 and the TOC cannot drift from the registry.

```tsx
import { PageFrame, type TocEntry } from '../_chrome/page-frame';
import { CONTROL_SECTIONS, ControlSpecimens } from './controls';
import { DISPLAY_SECTIONS, DisplaySpecimens } from './display';

const SECTIONS: readonly TocEntry[] = [...CONTROL_SECTIONS, ...DISPLAY_SECTIONS];

export default function PrimitivesPage() {
  return (
    <PageFrame
      title="Primitives"
      intro="Chaque composant de packages/ui, avec ses variantes, ses tailles et ses états pilotés par props. Le survol et le focus clavier sont annotés plutôt que simulés : une classe ne peut pas mentir sur un état qu’elle ne peut pas déclencher."
      entries={SECTIONS}
    >
      <ControlSpecimens entries={SECTIONS} />
      <DisplaySpecimens entries={SECTIONS} />
    </PageFrame>
  );
}
```

- [ ] **Step 3: Reconcile with the real component APIs**

Before typechecking, open each imported component and confirm the props used above exist. Where a prop does not exist, drop it from the specimen rather than adding it to the component: this task documents the system, it does not change it. Known risks here: `TableHead`/`TableCell` may spell the numeric variant differently, `Capacity` may not accept `hideCount`, `Empty` may require `EmptyContent`, `AvatarGroup` may require `AvatarGroupCount`. Check each and adapt the specimen, never the component.

```bash
grep -n "numeric" packages/ui/src/components/table.tsx
grep -n "hideCount\|CapacityProps" packages/ui/src/components/capacity.tsx
grep -n "function Empty\|function Avatar" packages/ui/src/components/empty.tsx packages/ui/src/components/avatar.tsx
```

- [ ] **Step 4: Typecheck, lint, build**

```bash
pnpm --filter @iziwellpass/admin typecheck && pnpm --filter @iziwellpass/admin lint && pnpm --filter @iziwellpass/admin build
```

Expected: all clean.

- [ ] **Step 5: Verify in a browser**

At `http://localhost:3012/design/primitives`, confirm:

1. All 28 sections are present and numbered 01 to 28 without a gap.
2. Every specimen's dark pane is genuinely dark. A light-looking dark pane means the `.dark` wrapper is not re-declaring the tokens; check that `force-light.tsx` actually removed the class from `<html>`.
3. Badge status variants are legible in both panes. This is the B2 fix from `docs/app-design-baseline.md`; if any of them looks washed out, record it.
4. `Capacity` at 18/18 shows the same "complet" reading on both the badge and the bar. Disagreement between the two is the exact bug the component exists to prevent.
5. Buttons measure 44px tall below the `lg` breakpoint and 36px above it. Narrow the window to check.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/app/design/primitives
git commit -m "feat(admin): display primitive specimens and the primitives page

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Compositions page

Primitives passing their own tests individually and still failing together is the failure mode this page exists to catch. Realistic fragments, French copy at realistic lengths, and every list state.

**Files:**
- Create: `apps/admin/app/design/compositions/page.tsx`

**Interfaces:**
- Consumes: the chrome kit from Task 4; primitives from `@iziwellpass/ui`.
- Produces: the route `/design/compositions`. Nothing importable.

- [ ] **Step 1: Write the page**

Create `apps/admin/app/design/compositions/page.tsx`:

```tsx
'use client';

import { PlusIcon, SearchIcon, TriangleAlertIcon, UsersIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertReference, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Avatar, AvatarFallback } from '@iziwellpass/ui/components/avatar';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Button } from '@iziwellpass/ui/components/button';
import { Capacity } from '@iziwellpass/ui/components/capacity';
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '@iziwellpass/ui/components/empty';
import { Input } from '@iziwellpass/ui/components/input';
import { Label } from '@iziwellpass/ui/components/label';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { Stat, StatPanel } from '@iziwellpass/ui/components/stat';
import { Switch } from '@iziwellpass/ui/components/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@iziwellpass/ui/components/table';

import { PageFrame, sectionNumber, type TocEntry } from '../_chrome/page-frame';
import { Section } from '../_chrome/section';
import { Specimen } from '../_chrome/specimen';

const SECTIONS: readonly TocEntry[] = [
  { id: 'entete', label: 'En-tête de page' },
  { id: 'chiffres', label: 'Bande de chiffres' },
  { id: 'ligne-membre', label: 'Ligne de membre' },
  { id: 'creneau', label: 'Créneau et capacité' },
  { id: 'formulaire', label: 'Section de formulaire' },
  { id: 'liste', label: 'États d’une liste' },
];

const MEMBERS = [
  { name: 'Aminata Diallo', initials: 'AD', status: 'success', label: 'Payé', plan: 'Mensuel illimité', due: '0' },
  { name: 'Koffi N’Guessan', initials: 'KN', status: 'warning', label: 'En attente', plan: '10 séances', due: '25 000' },
  { name: 'Fatou Traoré', initials: 'FT', status: 'destructive', label: 'Suspendu', plan: 'Mensuel illimité', due: '110 000' },
] as const;

const SLOTS = [
  { time: '06:30', name: 'CrossFit', booked: 16, capacity: 18 },
  { time: '09:00', name: 'Pilates', booked: 9, capacity: 18 },
  { time: '18:45', name: 'Yoga', booked: 18, capacity: 18 },
] as const;

export default function CompositionsPage() {
  const number = (id: string) => sectionNumber(SECTIONS, id);

  return (
    <PageFrame
      title="Compositions"
      intro="Des fragments réels, assemblés à partir des primitives. Une primitive peut être correcte isolément et fausse en contexte : c’est ce que cette page cherche."
      entries={SECTIONS}
    >
      <Section id="entete" number={number('entete')} title="En-tête de page" note="Titre, compte en mono, action principale. Un seul titre display par écran.">
        <Specimen name="En-tête de liste" signature="titre + compte + action">
          <div className="flex w-full flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">Membres</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="font-mono tabular-nums">248</span> membres, dont{' '}
                <span className="font-mono tabular-nums">3</span> en attente de paiement
              </p>
            </div>
            <Button>
              <PlusIcon />
              Ajouter un membre
            </Button>
          </div>
        </Specimen>
      </Section>

      <Section id="chiffres" number={number('chiffres')} title="Bande de chiffres" note="Une surface unique découpée par des filets. Ce n’est pas une grille de cartes métriques, et la différence est le sujet.">
        <Specimen name="StatPanel" signature="4 colonnes, chargées et en chargement">
          <div className="grid w-full gap-4">
            <StatPanel className="grid-cols-2 xl:grid-cols-4">
              <Stat label="Membres actifs" value="248" />
              <Stat label="Présents aujourd’hui" value="41" />
              <Stat label="Paiements en attente" value="3" />
              <Stat label="Revenus du mois" value="1 240 000" />
            </StatPanel>
            <StatPanel className="grid-cols-2 xl:grid-cols-4">
              {['Membres actifs', 'Présents aujourd’hui', 'Paiements en attente', 'Revenus du mois'].map(
                (label) => (
                  <Stat key={label} label={label} value={null} isLoading />
                ),
              )}
            </StatPanel>
          </div>
        </Specimen>
      </Section>

      <Section id="ligne-membre" number={number('ligne-membre')} title="Ligne de membre" note="La même donnée en tableau et en carte. Le tableau est la vue bureau ; en dessous de sm, la liste doit se replier en cartes plutôt que défiler latéralement.">
        <Specimen name="Tableau" signature="avatar, badge de statut, montant numeric">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membre</TableHead>
                <TableHead>Abonnement</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead numeric>Solde (FCFA)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MEMBERS.map((member) => (
                <TableRow key={member.name}>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <Avatar className="size-7">
                        <AvatarFallback>{member.initials}</AvatarFallback>
                      </Avatar>
                      {member.name}
                    </span>
                  </TableCell>
                  <TableCell>{member.plan}</TableCell>
                  <TableCell>
                    <Badge variant={member.status}>{member.label}</Badge>
                  </TableCell>
                  <TableCell numeric>{member.due}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Specimen>

        <Specimen name="Carte" signature="repli mobile de la même ligne">
          <div className="grid w-full gap-px bg-border">
            {MEMBERS.map((member) => (
              <div key={member.name} className="flex items-center gap-3 bg-background py-3">
                <Avatar className="size-9">
                  <AvatarFallback>{member.initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{member.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{member.plan}</p>
                </div>
                <div className="text-right">
                  <Badge variant={member.status}>{member.label}</Badge>
                  <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
                    {member.due} FCFA
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Specimen>
      </Section>

      <Section id="creneau" number={number('creneau')} title="Créneau et capacité" note="Heure en mono, capacité au seuil. Le badge et la barre doivent toujours dire la même chose : un créneau complet est rouge des deux côtés.">
        <Specimen name="Liste de créneaux" signature="Capacity par ligne">
          <div className="grid w-full gap-px bg-border">
            {SLOTS.map((slot) => (
              <div key={slot.time} className="bg-background py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="flex items-baseline gap-2 text-sm text-foreground">
                    <span className="font-mono tabular-nums">{slot.time}</span>
                    {slot.name}
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <UsersIcon className="size-3.5" aria-hidden />
                    <span className="font-mono tabular-nums">
                      {slot.booked}/{slot.capacity}
                    </span>
                  </span>
                </div>
                <Capacity
                  className="mt-2"
                  booked={slot.booked}
                  capacity={slot.capacity}
                  label={`${slot.time} ${slot.name}`}
                  hideCount
                />
              </div>
            ))}
          </div>
        </Specimen>
      </Section>

      <Section id="formulaire" number={number('formulaire')} title="Section de formulaire" note="Étiquette au-dessus, aide en dessous, un seul bouton principal. Les cibles font 44px sur téléphone.">
        <Specimen name="Formulaire" signature="Label + Input + Switch + actions">
          <form className="w-full max-w-md space-y-4" onSubmit={(event) => event.preventDefault()}>
            <div className="grid gap-1.5">
              <Label htmlFor="composition-name">Nom du membre</Label>
              <Input id="composition-name" defaultValue="Aminata Diallo" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="composition-amount">Montant (FCFA)</Label>
              <Input id="composition-amount" type="number" defaultValue={25000} />
              <p className="text-xs text-muted-foreground">Réglable par Wave, Orange Money ou espèces.</p>
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="composition-renew">Renouvellement automatique</Label>
              <Switch id="composition-renew" defaultChecked />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit">Enregistrer</Button>
              <Button type="button" variant="ghost">
                Annuler
              </Button>
            </div>
          </form>
        </Specimen>
      </Section>

      <Section id="liste" number={number('liste')} title="États d’une liste" note="Les quatre états qu’une liste doit savoir montrer. L’état d’erreur porte une référence support et une action de reprise ; il ne laisse jamais l’utilisateur sans issue.">
        <Specimen name="Liste" signature="chargement">
          <div className="grid w-full gap-px bg-border">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-3 bg-background py-3">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        </Specimen>

        <Specimen name="Liste" signature="vide">
          <Empty className="w-full">
            <EmptyMedia>
              <UsersIcon className="size-6" aria-hidden />
            </EmptyMedia>
            <EmptyTitle>Aucun membre pour l’instant</EmptyTitle>
            <EmptyDescription>
              Ajoutez un premier membre pour commencer à enregistrer les passages.
            </EmptyDescription>
            <Button className="mt-4">
              <PlusIcon />
              Ajouter un membre
            </Button>
          </Empty>
        </Specimen>

        <Specimen name="Liste" signature="aucun résultat de recherche">
          <div className="w-full">
            <div className="relative">
              <SearchIcon
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input className="pl-9" defaultValue="zzz" aria-label="Rechercher un membre" />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Aucun membre ne correspond à « zzz ».
            </p>
          </div>
        </Specimen>

        <Specimen name="Liste" signature="erreur avec reprise">
          <Alert variant="destructive" className="w-full">
            <TriangleAlertIcon />
            <AlertTitle>Impossible de charger les membres</AlertTitle>
            <AlertDescription>Vérifiez la connexion, puis réessayez.</AlertDescription>
            <AlertReference>REQ-4F2A91</AlertReference>
            <Button variant="outline" size="sm" className="mt-3 w-fit">
              Réessayer
            </Button>
          </Alert>
        </Specimen>
      </Section>
    </PageFrame>
  );
}
```


- [ ] **Step 2: Typecheck, lint, build**

```bash
pnpm --filter @iziwellpass/admin typecheck && pnpm --filter @iziwellpass/admin lint && pnpm --filter @iziwellpass/admin build
```

Expected: all clean.

- [ ] **Step 3: Verify in a browser**

At `http://localhost:3012/design/compositions`, confirm:

1. Numerals align vertically in the solde column and in the créneau list. A number set in Hanken rather than Geist Mono is a real finding.
2. The 18:45 créneau reads as complete on both the badge and the bar.
3. The card-reflow specimen truncates rather than overflowing at the narrowest pane width.
4. Nothing in these fragments nests a card inside a card.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/app/design/compositions
git commit -m "feat(admin): composition specimens for realistic screen fragments

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Shell page, and the final verification pass

The last route, then the checks that only make sense once everything is standing.

**Files:**
- Create: `apps/admin/app/design/shell/page.tsx`

**Interfaces:**
- Consumes: `AppShell`, `NavItem` from `@iziwellpass/ui/app-shell`; the chrome kit.
- Produces: the route `/design/shell`.

`AppShell`'s props, confirmed from `packages/ui/src/app-shell.tsx`: `title: string`, `nav?: NavItem[]`, `navGroups?: NavGroup[]`, `navHeader?: ReactNode`, `actions?: ReactNode`, `leading?: ReactNode`, `currentPath?: string`, `linkComponent?`, `onNavigate?`, `openMenuLabel?: string`, `children: ReactNode`. `NavItem` is `{ title: string; href: string; icon?: ReactNode }`.

- [ ] **Step 1: Write the page**

Create `apps/admin/app/design/shell/page.tsx`. The shell is rendered inside a fixed-width frame rather than full-bleed, so both themes fit side by side and the breakpoint behaviour can be seen without resizing the window.

```tsx
'use client';

import type { AnchorHTMLAttributes } from 'react';
import { Building2Icon, CalendarClockIcon, UsersIcon } from 'lucide-react';

import { AppShell, type NavItem } from '@iziwellpass/ui/app-shell';
import { Button } from '@iziwellpass/ui/components/button';

import { PageFrame, sectionNumber, type TocEntry } from '../_chrome/page-frame';
import { Section } from '../_chrome/section';
import { Specimen } from '../_chrome/specimen';

const SECTIONS: readonly TocEntry[] = [
  { id: 'coque', label: 'Coque complète' },
  { id: 'navigation', label: 'États de navigation' },
];

const NAV: NavItem[] = [
  { title: 'Membres', href: '/members', icon: <UsersIcon className="size-4" /> },
  { title: 'Planning', href: '/schedules', icon: <CalendarClockIcon className="size-4" /> },
  { title: 'Salles', href: '/venues', icon: <Building2Icon className="size-4" /> },
];

/** AppShell's linkComponent takes an optional href; anchors here go nowhere. */
function InertLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} href="#" onClick={(event) => event.preventDefault()} />;
}

function ShellFrame({ currentPath }: { currentPath: string }) {
  return (
    <div className="h-[28rem] w-full overflow-auto">
      <AppShell
        title="IziWellPass"
        nav={NAV}
        currentPath={currentPath}
        linkComponent={InertLink}
        openMenuLabel="Ouvrir le menu"
        actions={
          <Button variant="ghost" size="sm">
            Se déconnecter
          </Button>
        }
      >
        <div className="p-4">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Membres</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-mono tabular-nums">248</span> membres
          </p>
        </div>
      </AppShell>
    </div>
  );
}

export default function ShellPage() {
  const number = (id: string) => sectionNumber(SECTIONS, id);

  return (
    <PageFrame
      title="Coque"
      intro="La coque applicative dans les deux thèmes. Les liens sont inertes. Les points de rupture réels se vérifient en redimensionnant la fenêtre : les volets côte à côte montrent le thème, pas la largeur."
      entries={SECTIONS}
    >
      <Section id="coque" number={number('coque')} title="Coque complète" note="En dessous de lg, la navigation passe derrière un déclencheur de menu de 44px.">
        <Specimen name="AppShell" signature="title, nav, actions, currentPath, linkComponent">
          <ShellFrame currentPath="/members" />
        </Specimen>
      </Section>

      <Section id="navigation" number={number('navigation')} title="États de navigation" note="L’élément courant porte aria-current. Tabulez dans la navigation pour voir l’anneau de focus : la coque avait un manquement AA sur ce point, corrigé en lot A.">
        <Specimen name="AppShell" signature="currentPath=/schedules">
          <ShellFrame currentPath="/schedules" />
        </Specimen>
      </Section>
    </PageFrame>
  );
}
```

- [ ] **Step 2: Reconcile with the real AppShell API**

```bash
sed -n '1,60p' packages/ui/src/app-shell.tsx
```

If `AppShell` assumes it owns the viewport (for example `min-h-screen` on its root), the `h-[28rem]` frame will not clip it. In that case, drop the height cap and let each pane render the shell at its natural height; do not add a prop to `AppShell` to make the preview neater.

- [ ] **Step 3: Run every check**

```bash
pnpm --filter @iziwellpass/admin test
pnpm --filter @iziwellpass/admin typecheck
pnpm --filter @iziwellpass/admin lint
pnpm --filter @iziwellpass/admin build
```

Expected: four clean runs. Then, from the monorepo root, confirm nothing elsewhere regressed from the `globals.css` selector change:

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

Expected: clean across `owner`, `admin`, and `packages/ui`.

- [ ] **Step 4: Re-check the chrome discipline now that every page exists**

```bash
grep -rn "@iziwellpass/ui" apps/admin/app/design/_chrome/ || echo "clean: chrome imports nothing from the system it measures"
grep -rn "shadow-" apps/admin/app/design/_chrome/ || echo "clean: hairlines only"
grep -rnE "bg-(slate|gray|zinc|stone|neutral)-[0-9]" apps/admin/app/design/ || echo "clean: no stock Tailwind ramps"
grep -rn "—" apps/admin/app/design/ | grep -v "'—'" || echo "clean: no em dashes in copy"
```

Expected: four clean lines. The third check matters most: Tailwind's stock `neutral-*` utilities are the cool ramp, not the project's warm stone ramp, and using one would break the Warm Neutral Rule invisibly. The em-dash check excludes the literal `'—'` placeholder, which is the no-data glyph, not punctuation.

- [ ] **Step 5: Walk all five routes in both OS themes**

```bash
pnpm --filter @iziwellpass/admin dev
```

With the OS in light mode and again in dark mode, visit `/design`, `/design/foundations`, `/design/primitives`, `/design/compositions`, `/design/shell` and confirm:

1. The page chrome is light both times, and `<html>` carries no `dark` class.
2. Every dark pane is dark and every light pane is light, on every page.
3. Navigating away to `/login` restores the visitor's own theme.
4. No `fail` contrast band anywhere. Any that appears is a real finding: write it down, do not silence it.
5. At a 375px viewport, the specimen panes stack instead of side-scrolling, and the TOC moves above the content.

- [ ] **Step 6: Record what the surface found**

The preview's whole purpose is to surface drift. Append a short findings section to `docs/app-design-baseline.md` under a `## Phase 3 findings (from /design)` heading, listing what the walkthrough actually turned up, with the route and specimen name for each. If it turned up nothing, write that: an empty result is a real result and worth dating.

Do not fix any of the findings in this task. They are separate work, scoped separately.

- [ ] **Step 7: Commit**

```bash
git add apps/admin/app/design/shell docs/app-design-baseline.md
git commit -m "feat(admin): shell specimens and design-preview findings

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Notes for the executor

**On reconciling with real APIs.** Tasks 6, 7 and 9 each include a reconciliation step, because this plan was written from reading the components rather than from compiling against them. Where a prop in a specimen does not exist, the fix is always to change the specimen. Changing a component to satisfy its own preview would defeat the point of the preview: the surface documents the system as it is, and a gap it reveals is a finding, not a bug in the specimen.

**On what is not in scope.** Improving the design system itself. The two decisions still open in `docs/app-design-baseline.md` (the 44px sizing strategy, and stat tile versus hero card) stay open. This surface makes them observable, which is what the user asked for first.
