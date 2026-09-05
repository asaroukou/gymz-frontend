# IziWellPass Web

Frontend monorepo for IziWellPass: the venue-owner GMS app. See the design doc
in the API repo:
`gymz/docs/superpowers/specs/2026-07-06-web-frontend-monorepo-design.md`.

## Layout

| Path              | What                                                                 |
| ----------------- | -------------------------------------------------------------------- |
| `apps/owner`      | Venue-owner GMS app (Next.js App Router, port 3011)                  |
| `apps/admin`      | Platform-operator app (Next.js App Router, port 3012, control plane) |
| `packages/config` | Shared tsconfig / eslint presets                                     |
| `packages/ui`     | (SP1) shadcn components, Tailwind preset, app-shell                  |
| `packages/api`    | (SP2) Orval-generated client + React Query hooks                     |
| `packages/auth`   | (SP3) Cognito SRP auth, session, route guard                         |
| `packages/ops`    | Operator tooling (AdminCreateUser script); owns the AWS SDK dep      |
| `openapi.json`    | Committed API contract copy (source: Rust repo)                      |

## Commands

```bash
pnpm install
pnpm build          # turbo: build all apps/packages
pnpm lint           # turbo: eslint everywhere
pnpm typecheck      # turbo: tsc --noEmit everywhere
pnpm dev            # run app dev servers
pnpm sync:openapi   # refresh openapi.json from ../iziwellpass/docs/openapi.json
pnpm create:operator --email <address>   # create a platform-operator account
```

`create:operator` calls Cognito AdminCreateUser against the **operator** pool
(the only way in: it has self-signup disabled) and mails a temporary password.
The admin app's login handles the resulting new-password challenge. Needs AWS
credentials for the staging account; `--dry-run` shows the call without making
it. See `packages/ops`.

## API contract

`openapi.json` is a committed copy of `iziwellpass/docs/openapi.json` (OpenAPI 3.1,
generated from the Rust types). Refresh it with `pnpm sync:openapi` after the
API changes; `packages/api` codegen (SP2) reads this file. The frontend never
needs the Rust toolchain.
