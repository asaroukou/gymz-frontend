import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Tailwind v4 emits `outline-none` / `outline-hidden` in `@layer utilities`,
// which beats the global `:focus-visible` outline declared in `@layer base`
// (globals.css) regardless of specificity. Any focusable element carrying
// either class token loses its keyboard focus ring entirely. This guard
// keeps that regression from creeping back into the confirmed component
// list (input-otp.tsx is exempt: its `outline-none` sits on a decorative
// div, not the focusable input).
const COMPONENT_ROOT = join(__dirname, '..');
const FILES = [
  'components/button.tsx',
  'components/checkbox.tsx',
  'components/input.tsx',
  'components/textarea.tsx',
  'components/select.tsx',
  'components/combobox.tsx',
  'components/popover.tsx',
  'components/dialog.tsx',
  'components/sheet.tsx',
  'components/dropdown-menu.tsx',
  'components/switch.tsx',
  'components/tabs.tsx',
  'app-shell.tsx',
];

describe('focus outline regression guard', () => {
  it.each(FILES)('%s has no outline-none / outline-hidden tokens', (relativePath) => {
    const contents = readFileSync(join(COMPONENT_ROOT, relativePath), 'utf-8');
    expect(contents).not.toMatch(/\boutline-(none|hidden)\b/);
  });
});
