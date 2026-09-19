import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Tailwind v4 emits `outline-none` / `outline-hidden` in `@layer utilities`,
// which beats the global `:focus-visible` outline declared in `@layer base`
// (globals.css) regardless of specificity. Any focusable element carrying
// either class token loses its keyboard focus ring entirely. The guard sweeps
// every component in the package rather than a hand-kept list, so a new
// primitive is covered the day it lands.
const SRC_ROOT = join(__dirname, '..');

// input-otp.tsx is the one legitimate carrier: its `outline-none` sits on the
// decorative slot div, the library's real `<input>` is visually hidden with
// inline styles that already include `outline: 0`, and the focus affordance is
// the active slot's own indicator (`data-[active=true]` border + ring).
const EXEMPT = new Set(['input-otp.tsx']);

const FILES = [
  ...readdirSync(join(SRC_ROOT, 'components'))
    .filter((name) => name.endsWith('.tsx') && !EXEMPT.has(name))
    .sort()
    .map((name) => join('components', name)),
  'app-shell.tsx',
];

describe('focus outline regression guard', () => {
  it('sweeps every component in the package', () => {
    // A glob that silently matches nothing would make the whole suite vacuous.
    expect(FILES.length).toBeGreaterThan(20);
  });
  it.each(FILES)('%s has no outline-none / outline-hidden tokens', (relativePath) => {
    const contents = readFileSync(join(SRC_ROOT, relativePath), 'utf-8');
    expect(contents).not.toMatch(/\boutline-(none|hidden)\b/);
  });
});
