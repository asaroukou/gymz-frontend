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
