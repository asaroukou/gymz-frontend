import { describe, expect, it } from 'vitest';
import { colors } from './theme';

describe('colors', () => {
  it('ports the green-ink primary and warm-stone neutrals as hex', () => {
    expect(colors.primary.DEFAULT).toBe('#0c3d22');
    expect(colors.primary.foreground).toBe('#fafaf9');
    expect(colors.neutral[900]).toBe('#1c1917');
    expect(colors.background).toBe('#fffefd');
  });

  it('exposes the four meaning colors with AA text-stop foregrounds', () => {
    expect(colors.success.DEFAULT).toBe('#16a34a');
    expect(colors.success.foreground).toBe('#166534');
    expect(colors.destructive.DEFAULT).toBe('#dc2626');
    expect(colors.destructive.foreground).toBe('#991b1b');
    expect(colors.warning.foreground).toBe('#92400e');
    expect(colors.info.foreground).toBe('#1d4ed8');
  });
});
