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

/** OKLAB (Cartesian L, a, b) to linear-light sRGB (Bjorn Ottosson's matrices). May be out of gamut. */
function oklabToLinearSrgb(lightness: number, a: number, b: number): Rgb {
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

/** OKLCH (polar L, C, H) to linear-light sRGB, via OKLAB. May be out of gamut. */
function oklchToLinearSrgb(lightness: number, chroma: number, hueDeg: number): Rgb {
  const hue = (hueDeg * Math.PI) / 180;
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);
  return oklabToLinearSrgb(lightness, a, b);
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
  const split_result = body.split('/');
  const head = split_result[0]!;
  const tail = split_result[1];
  const parts = head
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean) as string[];
  return { parts, alpha: readAlpha(tail) };
}

function parseHex(input: string): ParsedColor | null {
  const hex = input.slice(1);
  const expand = (value: string) => Number.parseInt(value.repeat(2), 16) / 255;

  if (/^[0-9a-f]{3,4}$/i.test(hex)) {
    return {
      rgb: [expand(hex[0]!), expand(hex[1]!), expand(hex[2]!)],
      alpha: hex.length === 4 ? expand(hex[3]!) : 1,
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
 * Parses hex, rgb()/rgba() (comma or space separated), color(srgb ...),
 * oklch() and oklab(). Returns null for anything else, including named
 * colors: the preview would rather show nothing than a wrong ratio.
 */
export function parseCssColor(input: string): ParsedColor | null {
  const value = input.trim().toLowerCase();
  if (value === '') return null;
  if (value.startsWith('#')) return parseHex(value);

  const match = /^(rgba?|oklch|oklab|color)\((.*)\)$/.exec(value);
  if (!match) return null;

  const fn = match[1]!;
  const body = match[2]!;

  if (fn === 'color') {
    const { parts, alpha } = splitComponents(body);
    if (parts[0] !== 'srgb' || parts.length < 4) return null;
    const channels = parts.slice(1, 4).map((part) => clamp01(Number.parseFloat(part)));
    if (channels.some(Number.isNaN)) return null;
    return { rgb: [channels[0]!, channels[1]!, channels[2]!], alpha };
  }

  const { parts, alpha: slashAlpha } = splitComponents(body);

  if (fn === 'rgb' || fn === 'rgba') {
    if (parts.length < 3) return null;
    const channels = parts
      .slice(0, 3)
      .map((part) =>
        part.endsWith('%')
          ? clamp01(Number.parseFloat(part) / 100)
          : clamp01(Number.parseFloat(part) / 255),
      );
    if (channels.some(Number.isNaN)) return null;
    // rgba(r, g, b, a) puts alpha in the fourth comma-separated slot.
    const alpha = parts.length > 3 ? readAlpha(parts[3]) : slashAlpha;
    return { rgb: [channels[0]!, channels[1]!, channels[2]!], alpha };
  }

  if (parts.length < 3) return null;
  const part0 = parts[0]!;
  const part1 = parts[1]!;
  const part2 = parts[2]!;
  const lightness = part0.endsWith('%') ? Number.parseFloat(part0) / 100 : Number.parseFloat(part0);
  const alpha = parts.length > 3 ? readAlpha(parts[3]) : slashAlpha;

  if (fn === 'oklab') {
    // oklab(L a b)
    const a = Number.parseFloat(part1);
    const b = Number.parseFloat(part2);
    if ([lightness, a, b].some(Number.isNaN)) return null;

    const linear = oklabToLinearSrgb(lightness, a, b);
    return {
      rgb: [encodeGamma(linear[0]!), encodeGamma(linear[1]!), encodeGamma(linear[2]!)],
      alpha,
    };
  }

  // oklch(L C H)
  const chroma = Number.parseFloat(part1);
  const hue = Number.parseFloat(part2);
  if ([lightness, chroma, hue].some(Number.isNaN)) return null;

  const linear = oklchToLinearSrgb(lightness, chroma, hue);
  return {
    rgb: [encodeGamma(linear[0]!), encodeGamma(linear[1]!), encodeGamma(linear[2]!)],
    alpha,
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
  return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a)];
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
