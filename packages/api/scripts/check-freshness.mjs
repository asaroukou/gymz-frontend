// Fails if src/generated is stale relative to openapi.json.
// Mirrors the Rust repo's spec-staleness test: regenerate, then require a clean diff.
import { execSync } from 'node:child_process';
import path from 'node:path';

const pkgRoot = path.resolve(import.meta.dirname, '..');

execSync('pnpm generate', { cwd: pkgRoot, stdio: 'inherit' });

try {
  execSync('git diff --quiet -- src/generated', { cwd: pkgRoot });
  console.log('check-freshness: generated client is up to date');
} catch {
  console.error('check-freshness: src/generated is STALE relative to openapi.json.');
  console.error('Run `pnpm --filter @iziwellpass/api generate` and commit the diff.');
  process.exit(1);
}
