# Signup/Onboarding Rework & Control-Plane Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore owner signup → onboarding against the Aug 22 contract: passwordless register-owner on the control plane, Idempotency-Key on onboarding, and two-plane base-URL routing — absorbing the contract-sync fallout on the way.

**Architecture:** One contract sync task absorbs the Aug 22 delta (nullable `CheckIn.member_id`, optional member email). Then `packages/api` learns a pure prefix rule (`resolveBaseUrl`) so control-plane routes hit a second base URL with zero changes to the generated client. Then the signup/confirm screens are reworked/deleted, and onboarding gains its required header.

**Tech Stack:** Next.js App Router, Orval-generated client + TanStack Query, react-hook-form + zod v4, Cognito SRP via `packages/auth`, next-intl (French-first), vitest.

**Spec:** `docs/superpowers/specs/2026-08-22-signup-onboarding-control-plane-design.md`

## Global Constraints

- Never hand-edit `packages/api/src/generated/**` (Orval output; `pnpm test` fails on drift).
- French-first i18n: `apps/owner/messages/fr.json` and `en.json` keep **exact key parity** — same keys, same nesting, same order. Parity check:
  `cd apps/owner && node -e "const a=require('./messages/fr.json'),b=require('./messages/en.json');const k=(o,p='')=>Object.entries(o).flatMap(([x,v])=>typeof v==='object'&&v?k(v,p+x+'.'):[p+x]);const fr=k(a).sort(),en=k(b).sort();const m=fr.filter(x=>!en.includes(x)),e=en.filter(x=>!fr.includes(x));console.log(m.length||e.length?JSON.stringify({m,e}):'parity OK ('+fr.length+')');"`
- `verbatimModuleSyntax: true` (`import type` for type-only imports); `noUncheckedIndexedAccess: true`; `@iziwellpass/ui` subpath exports only.
- Errors: `apiErrorMessage(err, fallback)`; react-hook-form surfaces call `applyFieldErrors(form, err)` first. Auth screens use `form.setError('root', …)` + `useAuthError` — keep that pattern there.
- **Enumeration safety:** the signup success copy must be identical whether the email is new or already registered. Never add an "email already exists" message.
- The `Idempotency-Key` is a fresh `crypto.randomUUID()` **per submit attempt** — a reused key replays the stored response.
- Prettier on every touched file (quote paths containing `()`/`[]` in single quotes — never backslash-escape inside double quotes).
- Gates before every commit: `pnpm build && pnpm typecheck && pnpm lint && pnpm test` from the repo root.
- Staging e2e (real inbox needed) is the user's final pass — implementers do not attempt it and do not claim it.

## File Structure

| Path                                                                                                       | Change                                      |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `openapi.json`, `packages/api/src/generated/**`                                                            | Task 1: sync + regen (mechanical)           |
| `apps/owner/app/(app)/dashboard/recent-checkins.tsx`                                                       | Task 1: null-safe `member_id`               |
| `apps/owner/app/(app)/checkins/recent-checkins.tsx`                                                        | Task 1: null-safe `member_id`               |
| `apps/owner/app/(app)/checkins/register-panel.tsx`                                                         | Task 1: toast helper accepts nullable id    |
| `apps/owner/app/(app)/members/page.tsx`                                                                    | Task 1: email back to optional              |
| `apps/owner/messages/{fr,en}.json`                                                                         | Tasks 1 & 3: keys per task                  |
| `packages/api/src/client.ts` + `client.test.ts`                                                            | Task 2: `resolveBaseUrl`, empty-202, config |
| `apps/owner/app/providers.tsx`, `next.config.ts`, `middleware.ts`, `.env.example`                          | Task 2: wiring                              |
| `apps/owner/app/(auth)/signup/page.tsx`                                                                    | Task 3: rewrite                             |
| `apps/owner/app/(auth)/confirm/page.tsx`, `pending-credentials.tsx`, `(auth)/layout.tsx`, `login/page.tsx` | Task 3: delete / prune                      |
| `apps/owner/app/(onboarding)/onboarding/page.tsx`                                                          | Task 4: Idempotency-Key                     |
| `docs/backend-issues.md`                                                                                   | Task 4: two asks                            |

---

### Task 1: Contract sync and delta absorption

**Files:**

- Modify: `openapi.json` (via `pnpm sync:openapi`), `packages/api/src/generated/*` (via `pnpm --filter @iziwellpass/api generate`)
- Modify: `apps/owner/app/(app)/dashboard/recent-checkins.tsx:41,106`
- Modify: `apps/owner/app/(app)/checkins/recent-checkins.tsx:150`
- Modify: `apps/owner/app/(app)/checkins/register-panel.tsx` (checkinSuccessToast + its two call sites, lines ~101, ~234)
- Modify: `apps/owner/app/(app)/members/page.tsx` (email schema + payload)
- Modify: `apps/owner/messages/fr.json`, `apps/owner/messages/en.json`

**Interfaces:**

- Consumes: the Aug 22 spec at `../iziwellpass/docs/openapi.json` (87 operations).
- Produces: generated `useRegisterOwner` (mutation vars `{ data: RegisterOwnerRequest }`, from operationId `register_owner`; `RegisterOwnerRequest` = `{ email, first_name, last_name }`, all required) and `onboardVenue(data, options?)` — consumed by Tasks 3 and 4. `CheckIn.member_id` becomes `string | null`-ish (`MemberId`-ref oneOf null); new `pass_holder_id`.

- [ ] **Step 1: Sync and regenerate**

```bash
pnpm sync:openapi
pnpm --filter @iziwellpass/api generate
```

Expected: `openapi.json` jumps to 87 operations; generated diff is large. (A pre-existing `⚠️ SyntaxError: Swagger schema validation failed` warning about `info.license` is known noise — ignore it.)

- [ ] **Step 2: Run typecheck to enumerate the breakage**

Run: `pnpm typecheck 2>&1 | grep "error TS"`
Expected: errors ONLY at the three `member_id` read sites listed above (Map.get / assignment of a now-nullable value). If anything else breaks, stop and report it — the delta analysis missed something.

- [ ] **Step 3: Add the neutral pass-holder label to i18n**

In `messages/fr.json`, inside the `common` namespace after `"retry"`:

```json
"passVisitor": "Visiteur pass"
```

In `messages/en.json`, same position:

```json
"passVisitor": "Pass visitor"
```

- [ ] **Step 4: Guard the three read sites**

A check-in whose `member_id` is null is a marketplace pass-holder (new `pass_holder_id` field); the owner app renders a neutral label and does NOT fetch pass-holder identity (spec: fallout A).

`apps/owner/app/(app)/dashboard/recent-checkins.tsx` — line 41 currently:

```tsx
const name = member ? memberName(member) : checkIn.member_id;
```

becomes (add `const tCommon = useTranslations('common');` beside the existing `useTranslations` call in that component):

```tsx
// member_id is null for marketplace pass-holder check-ins (pass_holder_id
// carries the actor); show a neutral label until pass UX exists.
const name = member ? memberName(member) : (checkIn.member_id ?? tCommon('passVisitor'));
```

and line 106:

```tsx
member={checkIn.member_id ? memberById.get(checkIn.member_id) : undefined}
```

`apps/owner/app/(app)/checkins/recent-checkins.tsx:150` — same `member={…}` guard, same shape.

`apps/owner/app/(app)/checkins/register-panel.tsx` — widen the toast helper's id parameter to `string | null | undefined`; inside, resolve the display name as: id present → existing member-map lookup (fallback to the raw id as today); id absent → `t('common.passVisitor')` via a `useTranslations('common')` handle threaded the same way the existing `t` is. Update both call sites (`res.data.member_id` stays as-is — the widened signature absorbs the nullable type).

- [ ] **Step 5: Revert member email to optional**

In `apps/owner/app/(app)/members/page.tsx`, the schema field (added in b505faa):

```tsx
email: z
  .string()
  .min(1, t('validation.emailRequired'))
  .pipe(z.email(t('validation.emailInvalid'))),
```

becomes:

```tsx
// Optional again per the Aug 22 contract: roster-mode members have no login
// and may omit email. The tenant's login mode is write-only (no read side),
// so the server enforces per mode; a login-mode 400 maps onto this field
// via applyFieldErrors.
email: z.email(t('validation.emailInvalid')).or(z.literal('')),
```

and the payload line `email: values.email,` becomes `email: values.email || null,`.

Remove the now-unused `"emailRequired"` key from `members.validation` in BOTH message files (it sits between `lastNameRequired` and `emailInvalid`).

- [ ] **Step 6: Gates + parity**

Run the four gates and the parity script. Expected: all green, parity OK.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(api): sync the Aug 22 contract and absorb its owner-app fallout

The regenerated client adds 16 endpoints (register-owner, tenant admin,
QR/self-checkin, marketplace toggle) and changes two things we consume:
CheckIn.member_id is now nullable with a new pass_holder_id (a check-in can
be a marketplace pass-holder), and CreateMemberRequest.email is optional
again (roster-mode members have no login; the server enforces email in
login mode and the 400 maps onto the field inline).

Pass-holder check-ins render a neutral 'Visiteur pass' label at the three
member_id read sites — no identity lookup until marketplace UX is scoped."
```

---

### Task 2: Control-plane routing in packages/api + wiring

**Files:**

- Modify: `packages/api/src/client.ts`
- Test: `packages/api/src/client.test.ts`
- Modify: `apps/owner/app/providers.tsx:38` (configureApi call)
- Modify: `apps/owner/next.config.ts` (second rewrite)
- Modify: `apps/owner/middleware.ts` (matcher exclusion)
- Modify: `.env.example` (and mirror into `.env.local` + `apps/owner/.env.local`, which are gitignored)

**Interfaces:**

- Produces: `configureApi({ baseUrl, controlPlaneBaseUrl?, getToken, onUnauthorized? })`; `export const CONTROL_PLANE_PREFIXES`; `export function resolveBaseUrl(url: string, cfg: { baseUrl: string; controlPlaneBaseUrl?: string }): string`; `customFetch` returns `undefined` for empty 202/204 bodies. Tasks 3–4 rely on all of this implicitly through the generated client.

- [ ] **Step 1: Write the failing tests**

Append to `packages/api/src/client.test.ts` (inside the file, new describes; the existing `jsonResponse` helper and `configureApi` beforeEach are in scope):

```ts
import { resolveBaseUrl, CONTROL_PLANE_PREFIXES } from './client';

describe('resolveBaseUrl', () => {
  const cfg = { baseUrl: 'https://app.test/v1', controlPlaneBaseUrl: 'https://ctrl.test/v1' };

  it('routes app-plane paths to baseUrl', () => {
    expect(resolveBaseUrl('/gms/v1/staff', cfg)).toBe('https://app.test/v1');
    expect(resolveBaseUrl('/platform/v1/pass/credits', cfg)).toBe('https://app.test/v1');
    expect(resolveBaseUrl('/platform/v1/marketplace/venues', cfg)).toBe('https://app.test/v1');
  });

  it('routes every control-plane prefix to controlPlaneBaseUrl', () => {
    expect(resolveBaseUrl('/platform/v1/auth/register-owner', cfg)).toBe('https://ctrl.test/v1');
    expect(resolveBaseUrl('/platform/v1/onboarding/venue', cfg)).toBe('https://ctrl.test/v1');
    expect(resolveBaseUrl('/platform/v1/admin/tenants', cfg)).toBe('https://ctrl.test/v1');
    expect(resolveBaseUrl('/platform/v1/billing/webhook', cfg)).toBe('https://ctrl.test/v1');
  });

  it('throws a descriptive error when a control-plane path has no configured base', () => {
    expect(() =>
      resolveBaseUrl('/platform/v1/onboarding/venue', { baseUrl: 'https://app.test/v1' }),
    ).toThrowError(/controlPlaneBaseUrl/);
  });

  it('covers exactly the four documented prefixes', () => {
    expect(CONTROL_PLANE_PREFIXES).toEqual([
      '/platform/v1/auth/',
      '/platform/v1/onboarding/',
      '/platform/v1/admin/',
      '/platform/v1/billing/',
    ]);
  });
});

describe('customFetch plane routing and empty bodies', () => {
  it('sends control-plane requests to the control-plane base', async () => {
    configureApi({
      baseUrl: 'https://app.test/v1',
      controlPlaneBaseUrl: 'https://ctrl.test/v1',
      getToken: () => Promise.resolve(null),
    });
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 202 }));
    await customFetch('/platform/v1/auth/register-owner', { method: 'POST', body: '{}' });
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe(
      'https://ctrl.test/v1/platform/v1/auth/register-owner',
    );
  });

  it('resolves undefined for a success response with no body (202)', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 202 }));
    const res = await customFetch('/gms/v1/whatever', { method: 'POST', body: '{}' });
    expect(res).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @iziwellpass/api test 2>&1 | tail -15`
Expected: FAIL — `resolveBaseUrl` is not exported; the 202 test throws a JSON parse error.

- [ ] **Step 3: Implement in `packages/api/src/client.ts`**

Extend the config interface and add the rule:

```ts
interface ApiConfig {
  baseUrl: string;
  /** Base URL for control-plane routes (onboarding, register-owner, admin, billing). */
  controlPlaneBaseUrl?: string;
  getToken: TokenGetter;
  onUnauthorized?: UnauthorizedHandler;
}

/**
 * Route prefixes served by the control-plane gateway (ControlPlaneApiUrl)
 * rather than the app plane (ApiUrl). Mirrors the route table in
 * iziwellpass/docs/client-integration.md; a drift from the backend's split
 * fails loudly (403 from the wrong gateway), never silently.
 */
export const CONTROL_PLANE_PREFIXES = [
  '/platform/v1/auth/',
  '/platform/v1/onboarding/',
  '/platform/v1/admin/',
  '/platform/v1/billing/',
] as const;

/** Pick the base URL for a generated-client path. Pure; unit-tested. */
export function resolveBaseUrl(
  url: string,
  cfg: { baseUrl: string; controlPlaneBaseUrl?: string },
): string {
  if (!CONTROL_PLANE_PREFIXES.some((p) => url.startsWith(p))) {
    return cfg.baseUrl;
  }
  if (!cfg.controlPlaneBaseUrl) {
    throw new Error(
      `[api] ${url} is a control-plane route but controlPlaneBaseUrl is not configured — ` +
        'set NEXT_PUBLIC_CONTROL_PLANE_BASE_URL and pass it to configureApi()',
    );
  }
  return cfg.controlPlaneBaseUrl;
}
```

In `doFetch`, replace ``fetch(`${config.baseUrl}${url}`, …)`` with ``fetch(`${resolveBaseUrl(url, config)}${url}`, …)``.

In `customFetch`, replace the 204 short-circuit with an empty-body-safe parse (register-owner returns a bodyless 202, and `.json()` on an empty body throws):

```ts
if (response.status === 204) {
  return undefined as T;
}
const text = await response.text();
return (text ? JSON.parse(text) : undefined) as T;
```

- [ ] **Step 4: Run tests to verify pass**

Run: `pnpm --filter @iziwellpass/api test 2>&1 | tail -8`
Expected: PASS (existing 17 + new).

- [ ] **Step 5: Wire the app**

`apps/owner/app/providers.tsx` — in the `configureApi({ … })` call, after `baseUrl`:

```tsx
      controlPlaneBaseUrl: process.env.NEXT_PUBLIC_CONTROL_PLANE_BASE_URL ?? '',
```

(Empty string is falsy, so an unconfigured env throws the descriptive error at first control-plane call — intended.)

`apps/owner/next.config.ts` — extend `rewrites()`; both proxies follow the same pattern:

```ts
  async rewrites() {
    const rules = [];
    const target = process.env.API_PROXY_TARGET;
    if (target) {
      rules.push({
        source: '/api/backend/:path*',
        destination: `${target.replace(/\/$/, '')}/:path*`,
      });
    }
    const controlTarget = process.env.CONTROL_PLANE_PROXY_TARGET;
    if (controlTarget) {
      rules.push({
        source: '/api/control/:path*',
        destination: `${controlTarget.replace(/\/$/, '')}/:path*`,
      });
    }
    return rules;
  },
```

`apps/owner/middleware.ts` — the matcher currently excludes only `api/backend`; without this, the auth middleware 307s `/api/control/*` fetches to the login page, handing HTML to the API client:

```ts
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/backend|api/control).*)'],
```

- [ ] **Step 6: Refresh env files**

Replace the stale block in `.env.example` (keep its explanatory comments, update values, append the control plane):

```
API_PROXY_TARGET=https://fvj231z5k1.execute-api.eu-west-1.amazonaws.com/v1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=eu-west-1_wFqcvwlfq
NEXT_PUBLIC_COGNITO_CLIENT_ID=1ig7qvoa48ko3h9jddpitqe90o

# CONTROL PLANE — onboarding, register-owner, admin, billing webhook.
# Same-origin proxy in dev (next.config.ts), same CORS story as the app plane.
NEXT_PUBLIC_CONTROL_PLANE_BASE_URL=/api/control
CONTROL_PLANE_PROXY_TARGET=https://56mp264jf6.execute-api.eu-west-1.amazonaws.com/v1
```

Add a note beside the values: staging, account `872792314599`, verified 2026-08-19, CloudFormation outputs are truth. Mirror the full set into `.env.local` and `apps/owner/.env.local` (gitignored — sync them so the dev server works, but only `.env.example` is committed).

- [ ] **Step 7: Gates, then commit**

Run the four gates. Expected: green.

```bash
git add packages/api/src/client.ts packages/api/src/client.test.ts apps/owner/app/providers.tsx apps/owner/next.config.ts apps/owner/middleware.ts .env.example
git commit -m "feat(api): route control-plane paths to a second base URL

The backend split onto two gateways: onboarding, register-owner, admin and
the billing webhook moved to a control-plane API with its own host. A pure
prefix rule (resolveBaseUrl, unit-tested) picks the base inside customFetch,
so the generated client stays untouched and auth/401-retry apply uniformly
to both planes. A control-plane path with no configured base throws a
descriptive error rather than hitting the wrong gateway.

customFetch now tolerates bodyless success responses: register-owner
returns an empty 202, which .json() would have thrown on. The dev proxy
gains an /api/control rewrite, excluded from the auth middleware matcher
for the same reason /api/backend is."
```

---

### Task 3: Passwordless signup; delete the confirm flow

**Files:**

- Modify: `apps/owner/app/(auth)/signup/page.tsx` (rewrite)
- Delete: `apps/owner/app/(auth)/confirm/page.tsx`, `apps/owner/app/(auth)/pending-credentials.tsx`
- Modify: `apps/owner/app/(auth)/layout.tsx` (drop `PendingSignupProvider`)
- Modify: `apps/owner/app/(auth)/login/page.tsx` (~line 209: remove the confirm redirect)
- Modify: `apps/owner/middleware.ts` (drop `/confirm` from publicPaths)
- Modify: `apps/owner/messages/fr.json`, `en.json`

**Interfaces:**

- Consumes: `useRegisterOwner` from `@iziwellpass/api/generated` (Task 1) — mutation vars `{ data: { email, first_name, last_name } }`, resolves `undefined` (bodyless 202, Task 2). Routing to the control plane is automatic (Task 2).
- Produces: nothing later tasks consume.

- [ ] **Step 1: Update i18n**

In BOTH message files, inside `auth`:

- **Delete** the entire `confirm` block.
- In `signup`: **delete** `password`, `confirmPassword`; **update** `subtitle`; **add** `firstName`, `lastName`, `sentTitle`, `sentBody`.

`fr.json` `auth.signup` becomes:

```json
"signup": {
  "title": "Créer un compte",
  "subtitle": "Indiquez vos coordonnées — vous recevrez un mot de passe provisoire par e-mail.",
  "email": "E-mail",
  "firstName": "Prénom",
  "lastName": "Nom",
  "submit": "Créer un compte",
  "submitting": "Création du compte…",
  "sentTitle": "Vérifiez votre boîte mail",
  "sentBody": "Si un compte peut être créé pour {email}, un e-mail avec un mot de passe provisoire vient d'être envoyé. Connectez-vous avec ce mot de passe pour continuer.",
  "haveAccount": "Vous avez déjà un compte ?",
  "signin": "Se connecter",
  "error": "Impossible de créer le compte"
}
```

`en.json` mirror:

```json
"signup": {
  "title": "Create an account",
  "subtitle": "Enter your details — you'll receive a temporary password by email.",
  "email": "Email",
  "firstName": "First name",
  "lastName": "Last name",
  "submit": "Create an account",
  "submitting": "Creating account…",
  "sentTitle": "Check your inbox",
  "sentBody": "If an account can be created for {email}, an email with a temporary password has just been sent. Sign in with that password to continue.",
  "haveAccount": "Already have an account?",
  "signin": "Sign in",
  "error": "Could not create account"
}
```

Leave `auth.errors.*` untouched (some keys become unused; parity holds and the login error mapper still references several).

- [ ] **Step 2: Rewrite the signup page**

Replace `apps/owner/app/(auth)/signup/page.tsx` wholesale:

```tsx
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useRegisterOwner } from '@iziwellpass/api/generated';
import { Button } from '@iziwellpass/ui/components/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@iziwellpass/ui/components/form';
import { Input } from '@iziwellpass/ui/components/input';

import { AuthCard } from '@/components/auth-card';
import { apiErrorMessage } from '@/lib/api-error';

type SignupValues = { email: string; first_name: string; last_name: string };

/**
 * Owner self-signup, reworked for the control-plane flow: the server creates
 * the Cognito identity (AdminCreateUser) and emails a temporary password;
 * the owner's real password is set at first login via the newPasswordRequired
 * challenge. No password is collected here, and there is no confirm-code step.
 */
export default function SignupPage() {
  const t = useTranslations('auth');
  const registerOwner = useRegisterOwner();
  // Held locally (not derived from the mutation) so the sent state survives
  // the mutation object identity changing across renders.
  const [sentTo, setSentTo] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      z.object({
        email: z.email(t('errors.emailInvalid')),
        first_name: z.string().min(1, t('signup.firstName')),
        last_name: z.string().min(1, t('signup.lastName')),
      }),
    [t],
  );

  const form = useForm<SignupValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', first_name: '', last_name: '' },
  });

  const onSubmit = (values: SignupValues) => {
    registerOwner.mutate(
      { data: values },
      {
        // ENUMERATION SAFETY: the API returns 202 whether or not the email
        // already exists, and this UI must not undo that — the sent state and
        // its copy are identical in both cases. Never branch on "already
        // registered" here.
        onSuccess: () => setSentTo(values.email),
        onError: (err) => {
          form.setError('root', { message: apiErrorMessage(err, t('signup.error')) });
        },
      },
    );
  };

  const footer = (
    <p className="text-sm text-muted-foreground">
      {t('signup.haveAccount')}{' '}
      <Link
        href="/login"
        className="font-medium text-foreground underline-offset-4 hover:underline"
      >
        {t('signup.signin')}
      </Link>
    </p>
  );

  if (sentTo) {
    return (
      <AuthCard
        title={t('signup.sentTitle')}
        subtitle={t('signup.sentBody', { email: sentTo })}
        footer={footer}
      >
        <Button asChild className="w-full">
          <Link href="/login">{t('signup.signin')}</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t('signup.title')} subtitle={t('signup.subtitle')} footer={footer}>
      <Form {...form}>
        <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('signup.firstName')}</FormLabel>
                  <FormControl>
                    <Input autoComplete="given-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('signup.lastName')}</FormLabel>
                  <FormControl>
                    <Input autoComplete="family-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('signup.email')}</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {form.formState.errors.root ? (
            <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
          ) : null}
          <Button type="submit" className="w-full" disabled={registerOwner.isPending}>
            {registerOwner.isPending ? t('signup.submitting') : t('signup.submit')}
          </Button>
        </form>
      </Form>
    </AuthCard>
  );
}
```

The `AuthCard` import path (`@/components/auth-card`) matches the current page's import — verified. Mirror the login page's root-error rendering if it differs from the `<p>` above.

- [ ] **Step 3: Delete the confirm flow**

```bash
git rm 'apps/owner/app/(auth)/confirm/page.tsx' 'apps/owner/app/(auth)/pending-credentials.tsx'
```

- `(auth)/layout.tsx`: remove the `PendingSignupProvider` import and unwrap its JSX (children stay).
- `login/page.tsx` ~line 209: delete the branch that does `router.push('/confirm?email=…')` (fires on the Cognito user-not-confirmed error). The generic root-error path already covers that (now unreachable) state. Remove any now-unused imports.
- `middleware.ts`: `publicPaths: ['/login', '/signup']`.

- [ ] **Step 4: Gates + parity**

Run the four gates and the parity script. Expected: green; grep for leftovers must be empty:

```bash
grep -rn "pendingSignup\|/confirm\|auth.confirm\|'confirm\." apps/owner --include='*.ts*' | grep -v node_modules | grep -v .next
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(owner): passwordless owner signup via control-plane register-owner

The main Cognito pool no longer allows self-signup — every identity is
admin-created server-side, owners included. Signup becomes three fields
(email, first, last name) posting to the public register-owner endpoint;
Cognito emails a temporary password and the real one is set at first login
through the existing newPasswordRequired challenge.

The confirm-code flow is deleted (AdminCreateUser yields
FORCE_CHANGE_PASSWORD, never UNCONFIRMED), taking pending-credentials with
it. The success copy is identical whether the email is new or already
registered — the 202 is enumeration-safe and the UI must not undo that."
```

---

### Task 4: Onboarding Idempotency-Key + backend asks

**Files:**

- Modify: `apps/owner/app/(onboarding)/onboarding/page.tsx`
- Modify: `docs/backend-issues.md`

**Interfaces:**

- Consumes: generated `onboardVenue(data: OnboardVenueRequest, options?: RequestInit)` function export and `useMutation` from `@tanstack/react-query`. Control-plane routing is automatic (Task 2).

- [ ] **Step 1: Replace the hook with a per-attempt-keyed mutation**

In `apps/owner/app/(onboarding)/onboarding/page.tsx`, replace the `useOnboardVenue` import with the plain function + `useMutation`:

```tsx
import { useMutation } from '@tanstack/react-query';

import { onboardVenue } from '@iziwellpass/api/generated';
import type { OnboardVenueRequest } from '@iziwellpass/api/schemas';
```

and replace `const onboardVenue = useOnboardVenue();` with:

```tsx
// The generated hook fixes request options at render time, but the API
// requires a FRESH Idempotency-Key per attempt (a reused key replays the
// stored response — a failed first attempt would replay forever). Keying
// inside mutationFn generates one per call by construction.
const onboard = useMutation({
  mutationFn: (data: OnboardVenueRequest) =>
    onboardVenue(data, { headers: { 'Idempotency-Key': crypto.randomUUID() } }),
});
```

Update the submit call from `onboardVenue.mutate({ data: {…} }, {…})` to `onboard.mutate({…}, {…})` — the payload loses its `{ data: … }` wrapper, everything inside and the onSuccess/onError handlers stay identical. Update the `isPending` reference (`onboardVenue.isPending` → `onboard.isPending`) and any other renamed references.

- [ ] **Step 2: File the asks**

Append to `docs/backend-issues.md`, following its existing format:

```markdown
## Signup/onboarding rework (2026-08-22, owner app)

1. **Doc bug — register-owner body.** The client-integration guide's prose
   example sends `{ "email", "full_name" }`, but `RegisterOwnerRequest` in the
   OpenAPI schema requires `email`, `first_name`, `last_name` (no `full_name`).
   An integrator following the prose gets a 400. The schema is authoritative;
   please fix the prose.
2. **Read side for `member_login_mode`.** `PATCH /gms/v1/tenant/settings` is
   write-only and the field appears in no response schema, so the app cannot
   know whether the tenant is in login or roster mode. The add-member form now
   leaves email optional and defers to the server's per-mode 400; with a read
   side it could adapt upfront (require email in login mode, hide the hint in
   roster mode).
```

- [ ] **Step 3: Gates + commit**

Run the four gates. Expected: green.

```bash
git add 'apps/owner/app/(onboarding)/onboarding/page.tsx' docs/backend-issues.md
git commit -m "feat(owner): send a fresh Idempotency-Key on each onboarding attempt

The control plane rejects onboarding without an Idempotency-Key (400), and
a reused key replays the stored response — so the key must be new per
attempt, not per mount. Generating it inside mutationFn guarantees that by
construction; the generated hook fixes request options at render time,
which is the wrong lifetime.

Also files the register-owner doc bug (prose says full_name, schema says
first_name/last_name) and re-asks for a member_login_mode read side."
```

---

## Definition of Done

- [ ] Four gates green; fr/en parity script reports OK.
- [ ] `grep -rn "signUp(" apps/owner --include='*.ts*' | grep -v node_modules` → no owner-screen callers left (the `packages/auth` wrapper itself stays, for the future consumer app).
- [ ] **Live staging pass (user-run; needs a real inbox):** `/signup` with a deliverable address → 202 state renders → temp password arrives → `/login` triggers the new-password challenge → set password → redirected to `/onboarding` → submit venue (no 400 about Idempotency-Key) → dashboard as `role: owner`. Then repeat `/signup` with the SAME email and confirm the screen reads identically (enumeration safety).
- [ ] Dev-server sanity: `curl -s localhost:3011/api/control/health` returns the health JSON through the new proxy.

## Known Deferrals

- Pass-holder identity/UX on check-in surfaces (label only, per spec).
- All unconsumed new endpoints (`/me/*`, marketplace toggle, tenant settings, admin).
- Any tenant login-mode UI (blocked on the read side, asked again above).
