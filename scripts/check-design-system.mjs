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
  'font-extrabold',
  'font-black',
  'font-[600]',
  'font-[700]',
  // Le comptoir clair is opaque: no frosted surfaces.
  'backdrop-blur',
];
// Patterns that need a boundary a fixed string cannot express. `([^-]|$)` keeps
// the legitimate `-foreground` stops out of the match: the pale status tints are
// backgrounds, so using one as a text colour is invisible (~1.1:1).
const regexPatterns = ['text-(destructive|success|warning|info)([^-]|$)'];
// Fixed strings forbidden everywhere except one named file (and its test,
// which asserts on the class the component renders). The lavis wash is the
// single sanctioned gradient (DESIGN.md §4); it lives in wash.tsx only.
const excludedPatterns = [{ pattern: 'gradient', exclude: 'wash*.tsx' }];
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
for (const p of regexPatterns) {
  let out = '';
  try {
    out = execSync(
      `grep -rnE --include='*.ts' --include='*.tsx' --include='*.css' -e ${JSON.stringify(p)} ${roots.join(' ')}`,
      { encoding: 'utf8' },
    );
  } catch (err) {
    // Same exit-code handling as the fixed-string sweep: only 1 (no match) is good.
    if (err.status !== 1) {
      console.error(`grep failed for pattern (regex) "${p}" (status ${err.status ?? '?'}):`);
      console.error(err.stderr?.toString() || err.message);
      process.exit(2);
    }
  }
  if (out.trim()) {
    failed = true;
    console.error(`forbidden pattern (regex) "${p}":\n${out}`);
  }
}
for (const { pattern, exclude } of excludedPatterns) {
  let out = '';
  try {
    out = execSync(
      `grep -rn --include='*.ts' --include='*.tsx' --include='*.css' --exclude=${JSON.stringify(exclude)} -F -e ${JSON.stringify(pattern)} ${roots.join(' ')}`,
      { encoding: 'utf8' },
    );
  } catch (err) {
    // Same exit-code handling as the fixed-string sweep: only 1 (no match) is good.
    if (err.status !== 1) {
      console.error(`grep failed for pattern "${pattern}" (status ${err.status ?? '?'}):`);
      console.error(err.stderr?.toString() || err.message);
      process.exit(2);
    }
  }
  if (out.trim()) {
    failed = true;
    console.error(`forbidden pattern "${pattern}" (allowed only in ${exclude}):\n${out}`);
  }
}
if (failed) process.exit(1);
console.log('design-system guard: clean');
