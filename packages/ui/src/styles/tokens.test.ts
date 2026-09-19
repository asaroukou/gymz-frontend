import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// Spec values (hex canonical, from DESIGN.md and the design spec). The test
// reads globals.css from disk and checks the *parsed* values against this
// table, so a token edited in CSS can no longer drift away from the spec
// silently — and every contrast assertion below is measured on what the
// stylesheet actually declares, not on a hand-copied duplicate.
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

/** Every `--token: #hex` the spec pins, by name. */
const EXPECTED_HEX: Record<string, string> = {
  '--background': OS,
  '--foreground': ENCRE,
  '--card': BLANC,
  '--card-foreground': ENCRE,
  '--popover': BLANC,
  '--popover-foreground': ENCRE,
  '--primary': ENCRE,
  '--primary-foreground': BLANC,
  '--secondary-foreground': ENCRE,
  '--accent-foreground': ENCRE,
  '--ring': ENCRE,
  '--destructive': '#b23a2a',
  '--destructive-foreground': '#8f2f22',
  '--success': '#257a4e',
  '--success-foreground': '#1d5c3c',
  '--warning': '#d9b84b',
  '--warning-foreground': '#7a5c10',
  '--info': '#8ebbd2',
  '--info-foreground': '#2c6a8a',
  '--foret': FORET,
  '--argile': ARGILE,
  '--ocre': '#d9b84b',
  '--sauge': '#b9c9a4',
  '--eucalyptus': '#9fc0bb',
  '--eau': '#8ebbd2',
};

type RGB = [number, number, number];
/** A color plus its alpha, so `color-mix(…, transparent)` tokens stay honest. */
type Color = { rgb: RGB; alpha: number };

// Resolved through `fileURLToPath`, not `new URL('./globals.css',
// import.meta.url)`: Vite rewrites that exact expression into an asset URL
// (`http://localhost:3000/...`), which `readFileSync` cannot open.
const CSS = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'globals.css'), 'utf-8');

/** The `:root { … }` declaration block, as `--name` → raw value. */
function parseRootBlock(css: string): Map<string, string> {
  const start = css.indexOf(':root {');
  if (start === -1) throw new Error('globals.css: no `:root {` block');
  const end = css.indexOf('\n}', start);
  if (end === -1) throw new Error('globals.css: unterminated `:root {` block');
  const body = css
    .slice(start + ':root {'.length, end)
    // Strip trailing `/* … */` annotations so values parse cleanly.
    .replace(/\/\*[^*]*\*\//g, '');
  const tokens = new Map<string, string>();
  for (const line of body.split(';')) {
    const match = /^\s*(--[\w-]+)\s*:\s*(.+?)\s*$/s.exec(line);
    if (match) tokens.set(match[1]!, match[2]!);
  }
  return tokens;
}

const TOKENS = parseRootBlock(CSS);

function rgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const HEX = /^#[0-9a-f]{6}$/i;
/** `color-mix(in srgb, <color> N%, <color>)` — the only mix shape globals.css uses. */
const MIX = /^color-mix\(in srgb,\s*(.+?)\s+([\d.]+)%,\s*(.+?)\)$/;

/**
 * Resolve a token's declared value the way a browser would: hex, `transparent`,
 * `var(--other)`, and `color-mix(in srgb, …)` with premultiplied alpha (so
 * `color-mix(in srgb, encre 62%, transparent)` is encre at 0.62, exactly like
 * the CSS).
 */
function resolveValue(value: string): Color {
  if (HEX.test(value)) return { rgb: rgb(value), alpha: 1 };
  if (value === 'transparent') return { rgb: [0, 0, 0], alpha: 0 };
  const variable = /^var\((--[\w-]+)\)$/.exec(value);
  if (variable) return resolveToken(variable[1]!);
  const mix = MIX.exec(value);
  if (mix) {
    const a = resolveValue(mix[1]!);
    const b = resolveValue(mix[3]!);
    const p = Number(mix[2]) / 100;
    const alpha = p * a.alpha + (1 - p) * b.alpha;
    if (alpha === 0) return { rgb: [0, 0, 0], alpha: 0 };
    const channels = [0, 1, 2].map(
      (i) => (p * a.alpha * a.rgb[i]! + (1 - p) * b.alpha * b.rgb[i]!) / alpha,
    ) as RGB;
    return { rgb: channels, alpha };
  }
  throw new Error(`globals.css: cannot resolve value \`${value}\``);
}
function resolveToken(name: string): Color {
  const value = TOKENS.get(name);
  if (value === undefined) throw new Error(`globals.css: missing token \`${name}\``);
  return resolveValue(value);
}
/** An opaque token's painted channels. */
function opaque(name: string): RGB {
  const color = resolveToken(name);
  if (color.alpha !== 1) throw new Error(`globals.css: \`${name}\` is not opaque`);
  return color.rgb;
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
/** Composite `top` at `alpha` over `base` (sRGB, like an 18% tint badge). */
function tint(top: RGB, alpha: number, base: RGB): RGB {
  return [0, 1, 2].map((i) => top[i]! * alpha + base[i]! * (1 - alpha)) as RGB;
}
/** Composite a (possibly translucent) token over an opaque background. */
function over(top: Color, base: RGB): RGB {
  return tint(top.rgb, top.alpha, base);
}

describe('studio documentaire tokens (globals.css is the source of truth)', () => {
  it('every hex token matches the spec value', () => {
    const parsed = Object.fromEntries(
      [...TOKENS].filter(([, value]) => HEX.test(value)).map(([name, value]) => [name, value]),
    );
    expect(parsed).toEqual(EXPECTED_HEX);
  });
});

describe('studio documentaire contrast (WCAG AA ≥ 4.5)', () => {
  it.each(STATUS)('text stop on 18%% tint of %s over os and blanc', (base, stop) => {
    const os = opaque('--background');
    const blanc = opaque('--card');
    expect(contrast(rgb(stop), tint(rgb(base), 0.18, os))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(rgb(stop), tint(rgb(base), 0.18, blanc))).toBeGreaterThanOrEqual(4.5);
  });
  it('ink pairings', () => {
    expect(contrast(opaque('--primary-foreground'), opaque('--primary'))).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(contrast(opaque('--foreground'), opaque('--background'))).toBeGreaterThanOrEqual(4.5);
    // The auth masthead: encre on argile is the ceiling, so no opacity
    // reduction is allowed on that band.
    expect(contrast(opaque('--foreground'), opaque('--argile'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(opaque('--card'), opaque('--foret'))).toBeGreaterThanOrEqual(4.5);
  });
  it.each(['--muted', '--secondary'])('muted-foreground on %s', (surface) => {
    const wash = opaque(surface);
    // Inactive tab labels, table headers, hints: the translucent ink has to
    // hold AA once composited over the wash, not just over os.
    expect(contrast(over(resolveToken('--muted-foreground'), wash), wash)).toBeGreaterThanOrEqual(
      4.5,
    );
  });
});
