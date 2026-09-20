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
    expect(contrast(opaque('--primary-foreground'), opaque('--primary'))).toBeGreaterThanOrEqual(
      AA,
    );
  });
});

describe('comptoir clair text scale additions', () => {
  it('declares the 36px auth title step', () => {
    const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'globals.css'), 'utf8');
    expect(css).toMatch(/--text-display-sm:\s*2\.25rem;/);
    expect(css).toMatch(/--text-display-sm--line-height:\s*1\.15;/);
    expect(css).toMatch(/--text-display-sm--letter-spacing:\s*-0\.025em;/);
  });
});
