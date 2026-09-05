# Platform Admin App — Design

**Date:** 2026-09-05
**Status:** Approved in brainstorming (approach A, full API surface, fr/en i18n)

## Goal

A new `apps/admin` Next.js app for IziWellPass platform operators: list tenant
organizations, inspect one tenant's usage and billing, and change a tenant's
SaaS plan or lifecycle status. It covers the full admin API surface — nothing
more. This closes today's operational gap: upgrading a tenant off the `free`
tier (required before paid features like plan creation work) currently means
hand-crafting curl calls against the control plane.

## Context

The platform is segmented into three planes/apps:

- **Owner app** (`apps/owner`) — staff, main Cognito pool, app plane.
- **Consumer app** — future, consumer pool, marketplace.
- **Admin app** (this spec) — platform operators, **operator Cognito pool**,
  **control plane only**.

### API surface (all on the control plane, served by the onboarding lambda)

| Operation | Method/path | Notes |
|---|---|---|
| `list_tenants` | `GET /platform/v1/admin/tenants` | `?status=active\|suspended\|offboarding`, `?limit=1..500` (default 50), `?offset` (default 0) |
| `get_tenant` | `GET /platform/v1/admin/tenants/{id}` | → `TenantSummary` |
| `tenant_usage` | `GET /platform/v1/admin/tenants/{id}/usage?from&to` | `from`/`to` **required**, `YYYY-MM-DD`, inclusive |
| `tenant_billing` | `GET /platform/v1/admin/tenants/{id}/billing` | billing row may be absent |
| `set_tenant_plan` | `PATCH /platform/v1/admin/tenants/{id}/plan` | body `{plan}`, enum `free\|starter\|pro\|enterprise` |
| `set_tenant_status` | `PATCH /platform/v1/admin/tenants/{id}/status` | body `{status}`; backend **rejects `purged`** as a target (validation error) — only the purge sweep sets it |

Key shapes (already in the generated client `@iziwellpass/api`):

- `TenantSummary { id, name, slug, plan, status, created_at, deleted_at }`
- `TenantStatus`: `active | suspended | offboarding | purged`
- `TenantUsage { tenant_id, from, to, active_venues, checkins, bookings_created, bookings_cancelled, pass_bookings, credits_earned }`
- `TenantBilling { tenant_id, provider, status, external_customer_id, external_subscription_id, current_period_start, current_period_end, grace_deadline }`

No API generation work is needed: the admin operations and the control-plane
routing rule (`/platform/v1/admin/` is in `CONTROL_PLANE_PREFIXES` in
`packages/api/src/client.ts`) already shipped.

## Architecture (approach A)

New workspace `apps/admin`, package name `@iziwellpass/admin`, Next 15 App
Router, dev port **3012** (`next dev -p 3012`). Mirrors `apps/owner`'s
skeleton and conventions; consumes `@iziwellpass/{ui,api,auth,config}`.

- **Middleware** (`apps/admin/middleware.ts`): session-cookie check exactly
  like owner's; public paths: `['/login']` only (no signup — operator accounts
  are created out-of-band via `AdminCreateUser`). Matcher excludes
  `api/control`.
- **Auth**: `@iziwellpass/auth` configured with the **operator pool** via this
  app's env (`NEXT_PUBLIC_COGNITO_USER_POOL_ID` / `NEXT_PUBLIC_COGNITO_CLIENT_ID`
  carry operator values). Login page reuses the owner login pattern **including
  the `newPasswordRequired` challenge** (how a freshly created operator first
  signs in). 5-minute ID token + refresh-once-on-401 interceptor inherited from
  the shared client.
- **API wiring** (`app/providers.tsx`): `configureApi({ baseUrl: '',
  controlPlaneBaseUrl: process.env.NEXT_PUBLIC_CONTROL_PLANE_BASE_URL ?? '' })`.
  The app-plane `baseUrl` stays empty on purpose: every admin path routes to the
  control plane, and an accidental gms call fails loudly with `resolveBaseUrl`'s
  descriptive error.
- **Dev proxy** (`apps/admin/next.config.ts`): single rewrite
  `/api/control/:path*` → `CONTROL_PLANE_PROXY_TARGET` (gateway allows no
  localhost origins, same CORS story as owner).
- **i18n**: next-intl, French-first, `messages/fr.json` + `messages/en.json`
  with the same exact-key-parity test as owner.
- **Shell**: `@iziwellpass/ui` AppShell with a single nav entry «Clients»
  (subpath imports only, per monorepo constraint).

## Screens

### Tenant list — route `/`

- Table of `TenantSummary`: name, slug, plan badge, status badge, created date.
- Status filter driving `?status=`: Tous (no param) / Actifs / Suspendus /
  Résiliation. Purged tenants appear only in «Tous» (no filter value exists for
  them) and render with a muted row style.
- Prev/next pagination on `limit`/`offset`, 50 per page.
- Row click → `/tenants/[id]`. Loading = `skeleton`, empty = `empty` component.

### Tenant detail — route `/tenants/[id]`

1. **Header**: name, slug, copyable tenant id, created date, plan + status
   badges.
2. **Actions** (contextual on current status):
   - «Changer d'offre»: select of `free|starter|pro|enterprise` + confirmation
     dialog naming old → new plan.
   - Status: `active` → «Suspendre», «Résilier»; `suspended` → «Réactiver»,
     «Résilier»; `offboarding` → «Réactiver»; `purged` → **no actions**, a
     read-only banner instead. Every status change confirms in a dialog;
     «Résilier» (→ `offboarding`) carries a stronger warning: the purge sweep
     will eventually erase the tenant's data.
3. **Usage**: `from`/`to` date inputs (API requires both), default = last 30
   days; stat tiles for active venues, check-ins, bookings created/cancelled,
   pass bookings, credits earned.
4. **Billing**: provider, status, external customer/subscription ids, current
   period, grace deadline; empty state «Aucune facturation» when no row.

Mutations: plain (no optimistic updates) → invalidate tenant list + detail
queries → success toast. Owner-app conventions throughout (`ApiError`,
`applyFieldErrors`, sonner toasts).

## Error handling

- 401 → refresh-once → redirect `/login` (inherited).
- 403 → full-page «Accès réservé aux opérateurs de la plateforme» (a main-pool
  user gets a clear answer, not a broken table).
- Tenant 404 → not-found state with back link to the list.
- `set_tenant_status` validation rejections (e.g. → `purged`) → root error
  inside the dialog.

## Testing

Unit tests on pure logic, per owner convention (vitest):

- status → available-actions matrix (the contextual buttons above),
- usage date-range defaulting (last 30 days, `YYYY-MM-DD` formatting),
- fr/en message key parity.

Plus the four monorepo gates: `pnpm build && pnpm typecheck && pnpm lint &&
pnpm test`.

## Configuration

`apps/admin/.env.local` (gitignored) + documented block in root
`.env.example`. Staging values (2026-08-30 deploy, AWS account 905609278405,
verified live 2026-09-05 — they rotate on every stack rebuild;
`iziwellpass/docs/client-integration.md` is truth):

```
NEXT_PUBLIC_COGNITO_USER_POOL_ID=eu-west-1_UleNyUcPM
NEXT_PUBLIC_COGNITO_CLIENT_ID=2466and6nmtilcr6qnq6be0gum
NEXT_PUBLIC_CONTROL_PLANE_BASE_URL=/api/control
CONTROL_PLANE_PROXY_TARGET=https://o03tlcsz58.execute-api.eu-west-1.amazonaws.com/v1
```

**Ops footnote — creating an operator account** (out-of-band, needed once to
log in at all):

```
aws cognito-idp admin-create-user \
  --user-pool-id eu-west-1_UleNyUcPM \
  --username <email> \
  --user-attributes Name=email,Value=<email> Name=email_verified,Value=true \
  --region eu-west-1
```

Cognito emails a temporary password; the login page's `newPasswordRequired`
flow completes the account.

## Out of scope (v1)

- Operator user management UI (accounts stay CLI-managed).
- Register-owner-on-behalf or any convenience not backed by the admin API.
- Dashboards beyond the usage numbers the API returns.
- Tier-gating UX in the **owner** app (separate slice; its two open questions —
  tier source and upgrade CTA — remain undecided).

## Global constraints (inherited from the monorepo)

- Never hand-edit `packages/api/src/generated/**`.
- French-first i18n, exact fr/en key parity.
- `verbatimModuleSyntax`, `noUncheckedIndexedAccess`.
- `@iziwellpass/ui` subpath imports only.
- Prettier on touched files; quote paths containing `()`/`[]` in single quotes.
- Only `.env.example` is committed; `.env.local` stays gitignored.
