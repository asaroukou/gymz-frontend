// Fails when a forbidden pattern from DESIGN.md reappears in the web layer.
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const patterns = [
  'shadow-xs',
  'shadow-popover',
  'shadow-lg',
  'font-mono',
  'dark:',
  'next-themes',
  'Hanken',
  'Geist',
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
  try {
    const out = execSync(
      `grep -rn --include='*.ts' --include='*.tsx' --include='*.css' -F ${JSON.stringify(p)} ${roots.join(' ')}`,
      { encoding: 'utf8' },
    );
    if (out.trim()) {
      failed = true;
      console.error(`forbidden pattern "${p}":\n${out}`);
    }
  } catch {
    // grep exit 1 = no match = good
  }
}
if (failed) process.exit(1);
console.log('design-system guard: clean');
