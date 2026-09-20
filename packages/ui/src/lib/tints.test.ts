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
