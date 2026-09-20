import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The Light Heading Rule: Inter at 400, 500 or 600 only. Arbitrary weights
// (`font-[750]`) and Tailwind's bold tiers are design errors in this system.
const SRC_ROOT = join(__dirname, '..');
const FILES = [
  ...readdirSync(join(SRC_ROOT, 'components'))
    .filter((name) => name.endsWith('.tsx'))
    .sort()
    .map((name) => join('components', name)),
  'app-shell.tsx',
  'styles/globals.css',
];

describe('font weight guard', () => {
  it('sweeps every component in the package', () => {
    expect(FILES.length).toBeGreaterThan(20);
  });
  it.each(FILES)('%s uses only 400/500/600', (relativePath) => {
    const contents = readFileSync(join(SRC_ROOT, relativePath), 'utf-8');
    expect(contents).not.toMatch(/\bfont-\[\d+\]|\bfont-(bold|extrabold|black)\b/);
    expect(contents).not.toMatch(/font-weight:\s*(?!400|500|600)\d+/);
  });
});
