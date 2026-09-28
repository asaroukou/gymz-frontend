import { describe, expect, it } from 'vitest';
import css from '../../../packages/ui/src/styles/globals.css?raw';
import { colors, fonts, radius } from './theme';

const root = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));
function webVar(name: string): string {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`).exec(root);
  if (!match?.[1]) throw new Error(`--${name} not found in globals.css :root`);
  return match[1].toLowerCase();
}

describe('theme is pinned to the web tokens (spec M3)', () => {
  const pairs: [string, string][] = [
    [colors.ink, 'primary'],
    [colors.inkHover, 'primary-hover'],
    [colors.background, 'background'],
    [colors.side, 'side'],
    [colors.secondary, 'secondary'],
    [colors.muted, 'muted-foreground'],
    [colors.mutedStrong, 'muted-strong'],
    [colors.border, 'border'],
    [colors.danger, 'danger'],
    [colors.wash, 'wash'],
    [colors.success.DEFAULT, 'success'],
    [colors.success.foreground, 'success-foreground'],
    [colors.warning.DEFAULT, 'warning'],
    [colors.warning.foreground, 'warning-foreground'],
    [colors.destructive.DEFAULT, 'destructive'],
    [colors.destructive.foreground, 'destructive-foreground'],
    [colors.info.DEFAULT, 'info'],
    [colors.info.foreground, 'info-foreground'],
    [colors.tint.bleu, 'tint-bleu'],
    [colors.tint.vert, 'tint-vert'],
    [colors.tint.sable, 'tint-sable'],
    [colors.tint.rose, 'tint-rose'],
    [colors.tint.lavande, 'tint-lavande'],
  ];
  it.each(pairs)('%s equals --%s', (value, name) => {
    expect(value.toLowerCase()).toBe(webVar(name));
  });
});

describe('radius and fonts', () => {
  it('uses the canvas radii', () => {
    expect(radius).toEqual({ field: 12, card: 16, panel: 24, pill: 999 });
  });
  it('uses Inter only', () => {
    expect(Object.values(fonts)).toEqual(['Inter_400Regular', 'Inter_500Medium', 'Inter_600SemiBold']);
  });
});
