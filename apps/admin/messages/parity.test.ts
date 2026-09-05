import { describe, expect, it } from 'vitest';

import en from './en.json';
import fr from './fr.json';

function flattenKeys(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) {
    return [prefix];
  }
  return Object.entries(obj).flatMap(([k, v]) => flattenKeys(v, prefix ? `${prefix}.${k}` : k));
}

describe('message parity', () => {
  it('fr and en expose exactly the same keys', () => {
    expect(flattenKeys(fr).sort()).toEqual(flattenKeys(en).sort());
  });

  it('no empty values in fr', () => {
    const empties = flattenKeys(fr).filter(
      (k) => k.split('.').reduce<unknown>((o, p) => (o as Record<string, unknown>)[p], fr) === '',
    );
    expect(empties).toEqual([]);
  });
});
