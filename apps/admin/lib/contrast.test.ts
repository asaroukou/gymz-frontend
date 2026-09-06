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

describe('parseCssColor, oklab', () => {
  it('parses the oklab form a browser reports for color-mix(in oklab, ...)', () => {
    // The --success/15 tint over --background, as Chrome resolves it.
    expect(toHex(parseCssColor('oklab(0.9416 -0.0215748 0.0145422)')!.rgb)).toBe('#e1f1e2');
  });

  it('reads a slash alpha on the oklab form', () => {
    expect(parseCssColor('oklab(0.9416 -0.0215748 0.0145422 / 0.5)')?.alpha).toBeCloseTo(0.5, 5);
  });

  it('agrees with the equivalent oklch value', () => {
    // oklch(0.2161 0.0061 56) is --neutral-900; the same colour in Cartesian form.
    const viaLch = parseCssColor('oklch(0.2161 0.0061 56)')!.rgb;
    const viaLab = parseCssColor('oklab(0.2161 0.003410 0.005057)')!.rgb;
    expect(toHex(viaLab)).toBe(toHex(viaLch));
  });

  it('returns null for a malformed oklab', () => {
    expect(parseCssColor('oklab(0.9416 -0.02)')).toBeNull();
  });
});

describe('measureContrast, status tints as the browser reports them', () => {
  // These assert the actual shipped utility: Tailwind v4 compiles a `/15`
  // opacity modifier to `color-mix(in oklab, <color> 15%, transparent)`, so
  // the tint is genuinely translucent and must be composited over the pane
  // it sits on (the surface argument) before it can be measured.
  const LIGHT_SURFACE = 'oklch(0.9971 0.0018 78)';
  const DARK_SURFACE = 'oklch(0.1469 0.0041 49)';

  const cases = [
    [
      'oklch(0.4479 0.1083 151.33)',
      'oklch(0.6271 0.1699 149.21 / 0.15)',
      LIGHT_SURFACE,
      5.99,
      'AA',
    ],
    ['oklch(0.4732 0.1247 46.2)', 'oklch(0.7686 0.1647 70.08 / 0.15)', LIGHT_SURFACE, 6.28, 'AA'],
    [
      'oklch(0.4882 0.2172 264.38)',
      'oklch(0.5461 0.2152 262.88 / 0.15)',
      LIGHT_SURFACE,
      5.39,
      'AA',
    ],
    [
      'oklch(0.8003 0.1821 151.71)',
      'oklch(0.8003 0.1821 151.71 / 0.15)',
      DARK_SURFACE,
      8.75,
      'AAA',
    ],
    ['oklch(0.8369 0.1644 84.43)', 'oklch(0.8369 0.1644 84.43 / 0.15)', DARK_SURFACE, 9.0, 'AAA'],
    ['oklch(0.7137 0.1434 254.62)', 'oklch(0.7137 0.1434 254.62 / 0.15)', DARK_SURFACE, 6.36, 'AA'],
  ] as const;

  it.each(cases)('measures %s on %s over %s', (fg, tint, surface, ratio, level) => {
    const result = measureContrast(fg, tint, surface);
    expect(result).not.toBeNull();
    expect(result!.ratio).toBeCloseTo(ratio, 1);
    expect(result!.level).toBe(level);
  });

  it('returns null for a translucent background with no surface given', () => {
    expect(
      measureContrast('oklch(0.4479 0.1083 151.33)', 'oklch(0.6271 0.1699 149.21 / 0.15)'),
    ).toBeNull();
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
