# IziWellPass Web

Frontend monorepo for IziWellPass: the venue-owner GMS app and the (deferred)
platform-admin app. See the design doc in the API repo:
`gymz/docs/superpowers/specs/2026-07-06-web-frontend-monorepo-design.md`.

## Layout

| Path              | What                                                       |
| ----------------- | ---------------------------------------------------------- |
| `apps/owner`      | Venue-owner GMS app (Next.js App Router, port 3000)        |
| `apps/admin`      | Platform-admin app — **empty shell, deferred** (port 3001) |
| `packages/config` | Shared tsconfig / eslint presets                           |
| `packages/ui`     | (SP1) shadcn components, Tailwind preset, app-shell        |
| `packages/api`    | (SP2) Orval-generated client + React Query hooks           |
| `packages/auth`   | (SP3) Cognito SRP auth, session, route guard               |
| `openapi.json`    | Committed API contract copy (source: Rust repo)            |

## Commands

```bash
pnpm install
pnpm build          # turbo: build all apps/packages
pnpm lint           # turbo: eslint everywhere
pnpm typecheck      # turbo: tsc --noEmit everywhere
pnpm dev            # run app dev servers
pnpm sync:openapi   # refresh openapi.json from ../gymz/docs/openapi.json
```

## API contract

`openapi.json` is a committed copy of `gymz/docs/openapi.json` (OpenAPI 3.1,
generated from the Rust types). Refresh it with `pnpm sync:openapi` after the
API changes; `packages/api` codegen (SP2) reads this file. The frontend never
needs the Rust toolchain.
