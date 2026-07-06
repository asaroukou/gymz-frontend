// Copies the OpenAPI contract from the Rust API repo into this monorepo.
// The committed copy (web/openapi.json) is the codegen source for packages/api (SP2)
// so the frontend never needs the Rust toolchain.
//
// Default source assumes the sibling checkout layout:
//   gymz-v1/gymz/docs/openapi.json  ->  gymz-v1/web/openapi.json
// Override with: OPENAPI_SRC=/path/to/openapi.json pnpm sync:openapi

import { copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const src = process.env.OPENAPI_SRC ?? path.resolve(repoRoot, '../gymz/docs/openapi.json');
const dest = path.join(repoRoot, 'openapi.json');

if (!existsSync(src)) {
  console.error(`sync:openapi: source not found: ${src}`);
  console.error('Set OPENAPI_SRC to the path of the Rust repo openapi.json.');
  process.exit(1);
}

copyFileSync(src, dest);
console.log(`sync:openapi: ${src} -> ${dest}`);
