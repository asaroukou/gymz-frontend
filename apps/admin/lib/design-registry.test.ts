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
