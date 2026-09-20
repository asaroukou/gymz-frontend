// Fails when a forbidden pattern from DESIGN.md reappears in the web layer.
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const patterns = [
  'shadow-xs',
  'shadow-sm',
  'shadow-md',
  'shadow-popover',
  'shadow-lg',
  'box-shadow',
  'font-mono',
  'dark:',
  'next-themes',
  'Hanken',
  'Geist',
  // The OKLCH neutral ramp is gone; a reference to it paints transparent.
  '--neutral-',
  // Focus is one global `:focus-visible` outline, never a per-component ring.
  'focus-visible:ring',
  // « Le comptoir clair »: no uppercase, no tracked labels, no heavy weights,
  // none of the retired studio documentaire surfaces.
  'eyebrow',
  'font-[650]',
  'font-[750]',
  'font-[800]',
  'font-bold',
  // 'uppercase' is not listed: the word is the password-rule vocabulary; uppercase-as-a-class is caught in review.
  'tracking-wide',
  'bg-argile',
  'bg-foret',
  'text-foret',
  'text-argile',
  'ocre',
  'sauge',
  'eucalyptus',
];
const roots = [
  'packages/ui/src',
  'apps/owner/app',
  'apps/owner/components',
  'apps/owner/lib',
  'apps/admin/app',
  'apps/admin/components',
];
for (const r of roots)
  if (!existsSync(r)) {
    console.error(`missing root: ${r}`);
    process.exit(2);
  }
let failed = false;
for (const p of patterns) {
  let out = '';
  try {
    out = execSync(
      // `-e` (not a positional pattern): `--neutral-` would otherwise be read
      // as an option.
      `grep -rn --include='*.ts' --include='*.tsx' --include='*.css' -F -e ${JSON.stringify(p)} ${roots.join(' ')}`,
      { encoding: 'utf8' },
    );
  } catch (err) {
    // grep exit 1 = no match = good. Anything else (2 = bad usage or an
    // unreadable path, 127 = no grep, a signal) means the sweep never ran, so
    // failing loud beats reporting a clean tree we did not actually search.
    if (err.status !== 1) {
      console.error(`grep failed for pattern "${p}" (status ${err.status ?? '?'}):`);
      console.error(err.stderr?.toString() || err.message);
      process.exit(2);
    }
  }
  if (out.trim()) {
    failed = true;
    console.error(`forbidden pattern "${p}":\n${out}`);
  }
}
if (failed) process.exit(1);
console.log('design-system guard: clean');
