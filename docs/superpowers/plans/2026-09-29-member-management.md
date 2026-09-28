# SP-MM Member Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the member-management frames: server search in the directory, sign-in mode at creation, the member page's app-access section with its four actions, the visit history, the Réglages page, and the member app's e-mail confirmation.

**Architecture:**
- Pure libraries in `apps/owner/lib/` decide everything that can be decided without React. Each is unit-tested in vitest's node environment:
  - `member-account` (badges, lines, actions, status row, last action);
  - `member-account-copy` (operation codes → copy keys);
  - `member-errors` (new 409 kinds);
  - `member-search-query`;
  - `attendance`;
  - `settings-view`.
- Screens render those outputs.
- Operation progress is followed by refetching the member profile (`useAccountTracking`).
- The owner and member mock servers mirror the contract so every state is reachable offline.

**Tech Stack:**
- Next 15 + next-intl + TanStack Query v5 + react-hook-form/zod (owner);
- Expo Router + NativeWind + i18n-js (member);
- orval-generated client (`@iziwellpass/api`);
- amazon-cognito-identity-js;
- vitest.

**Spec:** `docs/superpowers/specs/2026-09-28-member-management-design.md`. The copy source is `docs/design-refs/comptoir-clair/members/INVENTORY.md`; the frames are the `.png` files beside it. Read both before any UI task.

## Global Constraints

- **Copy:**
  - Every French string comes verbatim from `docs/design-refs/comptoir-clair/members/INVENTORY.md`, except the spec §9 deltas: the neutral sign-out text « Une nouvelle connexion avec le mot de passe sera nécessaire. L'effet peut prendre jusqu'à 10 minutes. », the member-app success text « Pour votre sécurité, votre session va se fermer. Reconnectez-vous avec votre nouvelle adresse. », the sign-out fallback « La déconnexion n'a pas abouti. », and the MM2 « Dernière action » labels.
  - No em dashes in UI copy.
  - Owner strings go in `apps/owner/messages/fr.json` **and** `en.json` (English mirrors French). Member strings go in `apps/member/messages/fr.json` **and** `en.json`.
- **Design system:** DESIGN.md « Le comptoir clair ».
  - One ink primary per surface; outline pills for secondary actions; hairlines between rows.
  - Lucide icons at `strokeWidth={1.5}`; mono numerals via the `font-numeric` class (owner) or `variant="numeric"` (member).
  - Targets ≥ 44px below `md`.
- **Radius tokens are non-standard in this repo:** `rounded-2xl` = 28px, `rounded-xl` / `rounded-3xl` = 24px, `rounded-lg` = 20px. Use arbitrary values (`rounded-[16px]`) for anything else.
- **Roles:**
  - Owner/admin-only controls are **hidden** (not disabled) for other roles.
  - Treat `platform_admin` like `admin` for gating (existing convention in `lib/nav.ts`).
- **The new address of an e-mail change** is shown only in the success toast right after sending. It is never stored or rendered elsewhere.
- **Member app:** never call `UpdateUserAttributes`.
- **Ports:** never use 8090, 3011 or 8082 (the user's dev servers); never stop processes you did not start.
- **Builds:** never run `next build` while a dev server of the same checkout is running.
- **Generated code:** `pnpm test --force` can regenerate `packages/api/src/generated`. If `git status` shows drift there, `git checkout -- packages/api/src/generated`. Never hand-edit generated files.
- **Gates** before every commit of code: `pnpm --filter <package> typecheck && pnpm --filter <package> lint && pnpm --filter <package> test` for each touched package (`@iziwellpass/owner`, `@iziwellpass/member`, `@iziwellpass/auth`).

## Review Focus

1. **Re-entering a dialog after a refusal.** A 409 alert in the resend dialog must clear when the dialog is closed and reopened. Otherwise the confirm stays disabled forever. Pinned in Task 7 by resetting error state on open.
2. **A member page left open while an operation finishes elsewhere.** An operation that is `requested`/`dispatched` when the page first loads must be followed and its result shown, not only operations started from this page. Pinned in Task 2 (`runningOperationIds` + `describeAccount` watched-terminal test).
3. **Typing fast in the directory search.** Out-of-order responses must not show results for an old query. The query key includes `q`, so TanStack discards stale keys, and the input is debounced. Pinned in Task 4 by the builder test that blank or space-only `q` is omitted (no request per keystroke of spaces).
4. **Changing the typed address after an in-progress refusal.** Retrying with a different address must use a new `Idempotency-Key`, or the backend answers 422 `IDEMPOTENCY_KEY_REUSED`. Pinned in Task 7 with the pure `idempotencyKeyFor` helper test.
5. **Receptionist on the add form.** The payload must never carry `chain_wide` and must carry the selected venue even though no checklist is shown. Pinned in Task 5 by the pure `createAccessPayload` test.

---

## File Structure

**Owner (`apps/owner/`)**

| File | Responsibility |
|---|---|
| `lib/member-errors.ts` (modify) | ApiError → `MemberError` kinds, incl. the new 409s and `validation` |
| `lib/member-account.ts` (create) | Pure mapper: `describeAccount`, `hasRunningOperation`, `runningOperationIds`, `formatOpMoment`, polling constants |
| `lib/member-account-copy.ts` (create) | Pure: operation → result copy key; provisioning/e-mail failure keys; last-action key |
| `lib/use-account-tracking.ts` (create) | Hook: watched ids, 2 s polling while running, 30 s stale window, `refresh()` |
| `lib/member-search-query.ts` (create) | Pure `buildSearchRequest` + hook `useMemberSearch` (infinite query) + `useDebouncedValue` |
| `lib/create-member.ts` (create) | Pure `createAccessPayload` + `createdToastKey` |
| `lib/attendance.ts` (create) | Pure summary, row date/time, method badge, kind label, range |
| `lib/settings-view.ts` (create) | Pure `settingsView` |
| `lib/nav.ts` (modify) | `settings` nav item |
| `app/(app)/layout.tsx` (modify) | Nav icon for `settings` |
| `app/(app)/members/page.tsx`, `members-directory.tsx` (modify) | Search-driven directory |
| `app/(app)/members/add-member-dialog.tsx` (modify) | Policy hint, required e-mail, receptionist venue |
| `app/(app)/members/[id]/page.tsx` (modify) | Wires tracking, account section, attendance |
| `app/(app)/members/[id]/member-header.tsx` (modify) | App badge, pending-change line |
| `app/(app)/members/[id]/edit-member-form.tsx` (modify) | Read-only login e-mail field + link |
| `app/(app)/members/[id]/danger-zone.tsx` (modify) | One lifecycle button + sign-out |
| `app/(app)/members/[id]/account-section.tsx` (create) | « Accès à l'app » |
| `app/(app)/members/[id]/resend-invitation-dialog.tsx` (create) | Resend / relaunch |
| `app/(app)/members/[id]/change-email-dialog.tsx` (create) | Secure e-mail change |
| `app/(app)/members/[id]/sign-out-everywhere-dialog.tsx` (create) | Global sign-out |
| `app/(app)/members/[id]/attendance-section.tsx` (create) | « Présences » |
| `app/(app)/settings/page.tsx` (create) | Réglages |
| `scripts/mock-server.mjs` (modify) | Search, attendance, operations, settings, demo members |
| `messages/fr.json`, `messages/en.json` (modify) | Copy |

**Auth (`packages/auth/`):** `src/claims.ts` (`mfaEnrolled`).

**Member (`apps/member/`)**

| File | Responsibility |
|---|---|
| `lib/auth/cognito.ts`, `lib/auth/member-mock.ts` (modify) | `verifyEmailCode`, `resendEmailCode` |
| `lib/auth/session.ts`, `lib/auth/context.tsx` (modify) | `reason: 'session-ended'` |
| `lib/email-change.ts` (create) | Pure `classifyCodeError`, `RESEND_COOLDOWN_S` |
| `components/ui/notice.tsx` (modify) | `neutral` variant |
| `components/form/code-input.tsx` (create) | 6-box code input |
| `app/(app)/email-change.tsx` (create) | Confirmation screen |
| `app/(app)/_layout.tsx`, `app/(app)/index.tsx`, `app/(auth)/login.tsx` (modify) | Hidden route, banner, notice |
| `scripts/mock-server.mjs` (modify) | `MOCK_EMAIL_CHANGE`, confirm route |
| `messages/fr.json`, `messages/en.json` (modify) | Copy |

---

### Task 1: Error kinds and the MFA claim

**Files:**
- Modify: `apps/owner/lib/member-errors.ts`
- Test: `apps/owner/lib/member-errors.test.ts`
- Modify: `packages/auth/src/claims.ts`
- Test: `packages/auth/src/claims.test.ts`

**Interfaces:**
- Produces: `MemberError` gains the kinds `accountAlreadyActive`, `loginNotAvailable`, `identityShared`, `notALoginMember`, `loginNotProvisioned`, `emailChangeInProgress`, `idempotencyInProgress`, `featureNotAvailable`, and `{ kind: 'validation'; fields: string[] }`.
- Produces: `SessionClaims.mfaEnrolled: boolean`.

- [ ] **Step 1: Write the failing tests** (append to `apps/owner/lib/member-errors.test.ts`, inside a new `describe`)

```ts
describe('classifyMemberError: account operations', () => {
  it.each([
    ['ACCOUNT_ALREADY_ACTIVE', 'accountAlreadyActive'],
    ['LOGIN_NOT_AVAILABLE', 'loginNotAvailable'],
    ['IDENTITY_SHARED', 'identityShared'],
    ['NOT_A_LOGIN_MEMBER', 'notALoginMember'],
    ['LOGIN_NOT_PROVISIONED', 'loginNotProvisioned'],
    ['EMAIL_CHANGE_IN_PROGRESS', 'emailChangeInProgress'],
    ['IDEMPOTENCY_KEY_IN_PROGRESS', 'idempotencyInProgress'],
  ])('maps 409 %s', (code, kind) => {
    expect(classifyMemberError(api(409, code))).toEqual({ kind });
  });

  it('maps a plan refusal', () => {
    expect(classifyMemberError(api(403, 'FEATURE_NOT_AVAILABLE'))).toEqual({
      kind: 'featureNotAvailable',
    });
  });

  it('lists the fields of a validation error', () => {
    expect(
      classifyMemberError(
        api(400, 'VALIDATION_ERROR', [
          { field: 'email', message: 'required' },
          { field: 'new_email', message: 'invalid' },
        ]),
      ),
    ).toEqual({ kind: 'validation', fields: ['email', 'new_email'] });
  });

  it('keeps the validation kind when details are malformed', () => {
    expect(classifyMemberError(api(400, 'VALIDATION_ERROR', 'oops'))).toEqual({
      kind: 'validation',
      fields: [],
    });
  });

  it('leaves a plain 403 as other (callers use isForbidden)', () => {
    expect(classifyMemberError(api(403, 'FORBIDDEN'))).toEqual({ kind: 'other' });
  });
});
```

Append to `packages/auth/src/claims.test.ts` (reuse the file's existing token-building helper; if it has none, add this one at the top of the new block):

```ts
describe('parseClaims: mfaEnrolled', () => {
  const token = (payload: Record<string, unknown>) =>
    `x.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.y`;

  it('is true when mfa_enrolled_at is a non-empty string', () => {
    expect(parseClaims(token({ mfa_enrolled_at: '2026-09-28T10:00:00Z' })).mfaEnrolled).toBe(true);
  });
  it('is true when mfa_enrolled_at is a number', () => {
    expect(parseClaims(token({ mfa_enrolled_at: 1790000000 })).mfaEnrolled).toBe(true);
  });
  it('is false when absent or empty', () => {
    expect(parseClaims(token({})).mfaEnrolled).toBe(false);
    expect(parseClaims(token({ mfa_enrolled_at: '' })).mfaEnrolled).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `pnpm --filter @iziwellpass/owner test -- member-errors && pnpm --filter @iziwellpass/auth test -- claims`
Expected: FAIL (unknown kinds map to `other`; `mfaEnrolled` is undefined).

- [ ] **Step 3: Implement**

In `apps/owner/lib/member-errors.ts`, extend the union and the switch:

```ts
export type MemberError =
  | { kind: 'versionMismatch' }
  | { kind: 'invalidLifecycle'; currentStatus?: string }
  | { kind: 'downscopeBlocked'; affected: AffectedVenue[] }
  | { kind: 'loginEmailLocked' }
  | { kind: 'duplicate' }
  | { kind: 'accountAlreadyActive' }
  | { kind: 'loginNotAvailable' }
  | { kind: 'identityShared' }
  | { kind: 'notALoginMember' }
  | { kind: 'loginNotProvisioned' }
  | { kind: 'emailChangeInProgress' }
  | { kind: 'idempotencyInProgress' }
  | { kind: 'featureNotAvailable' }
  | { kind: 'validation'; fields: string[] }
  | { kind: 'other' };

const SIMPLE_KINDS: Record<string, MemberError['kind']> = {
  ACCOUNT_ALREADY_ACTIVE: 'accountAlreadyActive',
  LOGIN_NOT_AVAILABLE: 'loginNotAvailable',
  IDENTITY_SHARED: 'identityShared',
  NOT_A_LOGIN_MEMBER: 'notALoginMember',
  LOGIN_NOT_PROVISIONED: 'loginNotProvisioned',
  EMAIL_CHANGE_IN_PROGRESS: 'emailChangeInProgress',
  IDEMPOTENCY_KEY_IN_PROGRESS: 'idempotencyInProgress',
  FEATURE_NOT_AVAILABLE: 'featureNotAvailable',
};

function parseFields(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => asRecord(entry)?.field)
    .filter((field): field is string => typeof field === 'string');
}
```

In `classifyMemberError`, before `switch`:

```ts
  if (err.code === 'VALIDATION_ERROR') return { kind: 'validation', fields: parseFields(err.details) };
  const simple = SIMPLE_KINDS[err.code];
  if (simple) return { kind: simple } as MemberError;
```

(`err.details` is the raw array for validation errors; `details` in the existing code is the record form. Keep both.)

In `packages/auth/src/claims.ts`, add to `SessionClaims`:

```ts
  /** True when the ID token carries `mfa_enrolled_at` (owner/admin finished TOTP enrolment). UI only. */
  mfaEnrolled: boolean;
```

and in `parseClaims`'s return object:

```ts
    mfaEnrolled:
      (typeof payload.mfa_enrolled_at === 'string' && payload.mfa_enrolled_at.length > 0) ||
      typeof payload.mfa_enrolled_at === 'number',
```

- [ ] **Step 4: Fix literal `SessionClaims` builders**

Run: `pnpm typecheck`. Every error "Property 'mfaEnrolled' is missing" is an object literal typed as `SessionClaims` (tests or mocks). Add `mfaEnrolled: false` to each. Casts such as `as SessionClaimsLike` compile and need no change.

- [ ] **Step 5: Run the tests and gates**

Run: `pnpm --filter @iziwellpass/owner test && pnpm --filter @iziwellpass/auth test && pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/owner/lib/member-errors.ts apps/owner/lib/member-errors.test.ts packages/auth/src/claims.ts packages/auth/src/claims.test.ts
git add -u   # any SessionClaims literals fixed in step 4
git commit -m "feat(owner,auth): member account error kinds and mfaEnrolled claim"
```

---

### Task 2: The account mapper

**Files:**
- Create: `apps/owner/lib/member-account-copy.ts`
- Create: `apps/owner/lib/member-account.ts`
- Test: `apps/owner/lib/member-account.test.ts`

**Interfaces:**
- Consumes: `MemberAccountSummary`, `OperationView` from `@iziwellpass/api/schemas`; `Role` from `@iziwellpass/auth/claims`.
- Produces (exact exports, used by Tasks 6–7):

```ts
// member-account-copy.ts
export function provisioningFailureKey(code: string | null | undefined): string | null;
export function emailChangeFailureKey(op: OperationView | null | undefined): string;
export function operationResult(op: OperationView): { kind: 'done' | 'failed'; key: string };
export function lastActionKey(op: OperationView): string;

// member-account.ts
export const POLL_INTERVAL_MS = 2000;
export const POLL_WINDOW_MS = 30000;
export type AccountTone = 'success' | 'info' | 'neutral' | 'outline' | 'danger' | 'warning';
export type AccountAction = 'resend' | 'relaunch' | 'changeEmail';
export type RunningAction = AccountAction | 'signOut';
export interface AccountBadge { labelKey: string; tone: AccountTone; spinner?: boolean }
export interface AccountLine { key: string; tone: 'muted' | 'danger' }
export interface EmailBadge { labelKey: string; tone: AccountTone; lineKeys: string[] }
export interface StatusRow { kind: 'progress' | 'waiting' | 'done' | 'failed'; key: string; at?: string; runningAction?: RunningAction }
export interface AccountView {
  badge: AccountBadge; lines: AccountLine[]; emailBadge: EmailBadge | null;
  actions: AccountAction[]; canSignOut: boolean; canManage: boolean;
  lastAction: { key: string; at: string } | null; status: StatusRow | null;
}
export function describeAccount(account: MemberAccountSummary, opts: { role: Role | null; watched: ReadonlySet<string>; stale: boolean }): AccountView;
export function hasRunningOperation(account: MemberAccountSummary): boolean;
export function runningOperationIds(account: MemberAccountSummary): string[];
export function formatOpMoment(iso: string, locale: string, now?: Date): { date: string; time: string };
```

All keys are relative to the owner `members` namespace (e.g. `'account.badge.sent'`). Result keys whose copy has `{time}` are rendered with `{ time }` from `formatOpMoment(status.at)`. Last-action keys are rendered with `{ date, time }`.

**Ruling recorded here:** the spec lists `status` in `describeAccount`'s options, but nothing in the mapping depends on the member's lifecycle status (the `WeVjb` Zone sensible rules live in `DangerZone`). The option is dropped (YAGNI). `stale` is added so the « Toujours en cours » key is decided in the pure layer.

- [ ] **Step 1: Write the failing tests** (`apps/owner/lib/member-account.test.ts`)

```ts
import { describe, expect, it } from 'vitest';

import type { MemberAccountSummary, OperationView } from '@iziwellpass/api/schemas';

import {
  describeAccount,
  formatOpMoment,
  hasRunningOperation,
  runningOperationIds,
} from './member-account';
import { lastActionKey, operationResult } from './member-account-copy';

const op = (over: Partial<OperationView> & Pick<OperationView, 'kind' | 'state'>): OperationView => ({
  id: over.id ?? `${over.kind}-1`,
  updated_at: over.updated_at ?? '2026-09-25T14:32:00Z',
  result_code: over.result_code ?? null,
  failure_code: over.failure_code ?? null,
  ...over,
});

const acc = (over: Partial<MemberAccountSummary> = {}): MemberAccountSummary => ({
  mode: 'login',
  invitation: 'accepted',
  email: 'verified',
  provisioning: null,
  invitation_resend: null,
  session_revocation: null,
  email_change: null,
  ...over,
});

const owner = { role: 'owner' as const, watched: new Set<string>(), stale: false };
const reception = { role: 'receptionist' as const, watched: new Set<string>(), stale: false };

describe('describeAccount: badges and actions (WeVjb)', () => {
  it.each([
    ['not_applicable', 'account.badge.none', 'outline', []],
    ['pending', 'account.badge.pending', 'neutral', []],
    ['sent', 'account.badge.sent', 'info', ['resend', 'changeEmail']],
    ['linked_existing', 'account.badge.linkedExisting', 'info', ['changeEmail']],
    ['accepted', 'account.badge.accepted', 'success', ['changeEmail']],
    ['untracked', 'account.badge.untracked', 'neutral', ['resend', 'changeEmail']],
    ['failed', 'account.badge.failed', 'danger', ['relaunch']],
  ] as const)('%s → %s', (invitation, labelKey, tone, actions) => {
    const view = describeAccount(
      acc({ invitation, mode: invitation === 'not_applicable' ? 'roster' : 'login' }),
      owner,
    );
    expect(view.badge.labelKey).toBe(labelKey);
    expect(view.badge.tone).toBe(tone);
    expect(view.actions).toEqual(actions);
  });

  it('spins on a pending creation', () => {
    expect(describeAccount(acc({ invitation: 'pending' }), owner).badge.spinner).toBe(true);
  });

  it('gives a receptionist no actions and no sign-out', () => {
    const view = describeAccount(acc({ invitation: 'sent' }), reception);
    expect(view.actions).toEqual([]);
    expect(view.canSignOut).toBe(false);
    expect(view.canManage).toBe(false);
  });

  it.each([
    ['sent', true],
    ['linked_existing', true],
    ['accepted', true],
    ['untracked', true],
    ['pending', false],
    ['failed', false],
    ['not_applicable', false],
  ] as const)('sign-out for %s is %s', (invitation, expected) => {
    expect(describeAccount(acc({ invitation }), owner).canSignOut).toBe(expected);
  });

  it('treats platform_admin like admin', () => {
    const view = describeAccount(acc({ invitation: 'sent' }), { ...owner, role: 'platform_admin' });
    expect(view.actions).toEqual(['resend', 'changeEmail']);
  });
});

describe('describeAccount: explanation lines', () => {
  it('explains an accepted account', () => {
    expect(describeAccount(acc(), owner).lines).toEqual([
      { key: 'account.explain.accepted', tone: 'muted' },
    ]);
  });

  it('gives a failed invitation its reason then the fix hint', () => {
    const view = describeAccount(
      acc({
        invitation: 'failed',
        email: 'not_applicable',
        provisioning: op({ kind: 'provisioning', state: 'failed', failure_code: 'identity_already_linked' }),
      }),
      owner,
    );
    expect(view.lines).toEqual([
      { key: 'account.provisioningFailure.identity_already_linked', tone: 'danger' },
      { key: 'account.explain.failedFix', tone: 'muted' },
    ]);
  });

  it('drops an unknown failure reason and keeps the fix hint', () => {
    const view = describeAccount(
      acc({
        invitation: 'failed',
        provisioning: op({ kind: 'provisioning', state: 'failed', failure_code: 'weird' }),
      }),
      owner,
    );
    expect(view.lines).toEqual([{ key: 'account.explain.failedFix', tone: 'muted' }]);
  });
});

describe('describeAccount: e-mail state', () => {
  it('shows nothing for a verified address', () => {
    expect(describeAccount(acc(), owner).emailBadge).toBeNull();
  });

  it('shows a pending change', () => {
    expect(describeAccount(acc({ email: 'change_pending' }), owner).emailBadge).toEqual({
      labelKey: 'account.emailState.changePending',
      tone: 'warning',
      lineKeys: ['account.emailState.changePendingLine'],
    });
  });

  it('shows a failed change with its reason', () => {
    const view = describeAccount(
      acc({
        email: 'change_failed',
        email_change: op({ kind: 'email_change', state: 'failed', failure_code: 'verification_expired' }),
      }),
      owner,
    );
    expect(view.emailBadge).toEqual({
      labelKey: 'account.emailState.changeFailed',
      tone: 'neutral',
      lineKeys: ['account.result.emailExpired', 'account.emailState.changeFailedKeep'],
    });
  });
});

describe('describeAccount: status row priority', () => {
  it('shows progress for a running resend and names the running action', () => {
    const view = describeAccount(
      acc({ invitation: 'sent', invitation_resend: op({ kind: 'invitation_resend', state: 'dispatched' }) }),
      owner,
    );
    expect(view.status).toEqual({
      kind: 'progress',
      key: 'account.status.sending',
      runningAction: 'resend',
    });
  });

  it('turns progress into « Toujours en cours » when stale', () => {
    const view = describeAccount(
      acc({ invitation: 'sent', invitation_resend: op({ kind: 'invitation_resend', state: 'requested' }) }),
      { ...owner, stale: true },
    );
    expect(view.status?.key).toBe('account.status.stillRunning');
  });

  it('maps a running relaunch (provisioning) to the relaunch button', () => {
    const view = describeAccount(
      acc({ invitation: 'pending', provisioning: op({ kind: 'provisioning', state: 'requested' }) }),
      owner,
    );
    expect(view.status).toEqual({
      kind: 'progress',
      key: 'account.status.creating',
      runningAction: 'relaunch',
    });
  });

  it('prefers progress over a waiting e-mail change', () => {
    const view = describeAccount(
      acc({
        email: 'change_pending',
        email_change: op({ kind: 'email_change', state: 'pending_verification', updated_at: '2026-09-28T09:15:00Z' }),
        session_revocation: op({ kind: 'session_revocation', state: 'dispatched', updated_at: '2026-09-28T09:00:00Z' }),
      }),
      owner,
    );
    expect(view.status?.kind).toBe('progress');
    expect(view.status?.runningAction).toBe('signOut');
  });

  it('shows the waiting line for a pending verification', () => {
    const view = describeAccount(
      acc({ email: 'change_pending', email_change: op({ kind: 'email_change', state: 'pending_verification' }) }),
      owner,
    );
    expect(view.status).toEqual({ kind: 'waiting', key: 'account.status.waiting' });
  });

  it('shows the result of a watched operation that finished', () => {
    const resend = op({ id: 'op-9', kind: 'invitation_resend', state: 'completed', result_code: 'invitation_sent' });
    const view = describeAccount(acc({ invitation: 'sent', invitation_resend: resend }), {
      ...owner,
      watched: new Set(['op-9']),
    });
    expect(view.status).toEqual({
      kind: 'done',
      key: 'account.result.invitationSentAt',
      at: resend.updated_at,
    });
  });

  it('ignores a finished operation nobody watched', () => {
    const resend = op({ id: 'op-9', kind: 'invitation_resend', state: 'completed' });
    expect(describeAccount(acc({ invitation: 'sent', invitation_resend: resend }), owner).status).toBeNull();
  });
});

describe('describeAccount: last action', () => {
  it('picks the newest finished or waiting operation', () => {
    const view = describeAccount(
      acc({
        provisioning: op({ kind: 'provisioning', state: 'completed', result_code: 'invitation_sent', updated_at: '2026-03-03T10:12:00Z' }),
        session_revocation: op({ kind: 'session_revocation', state: 'completed', updated_at: '2026-09-12T09:10:00Z' }),
        invitation_resend: op({ kind: 'invitation_resend', state: 'dispatched', updated_at: '2026-09-28T09:00:00Z' }),
      }),
      owner,
    );
    expect(view.lastAction).toEqual({ key: 'account.last.signedOut', at: '2026-09-12T09:10:00Z' });
  });

  it('is null for a roster member', () => {
    expect(describeAccount(acc({ mode: 'roster', invitation: 'not_applicable' }), owner).lastAction).toBeNull();
  });
});

describe('member-account-copy', () => {
  it.each([
    [op({ kind: 'provisioning', state: 'completed', result_code: 'invitation_sent' }), 'done', 'account.result.invitationSentAt'],
    [op({ kind: 'provisioning', state: 'completed', result_code: 'existing_identity_linked' }), 'done', 'account.result.linkedNoInvite'],
    [op({ kind: 'provisioning', state: 'failed', failure_code: 'invalid_email' }), 'failed', 'account.provisioningFailure.invalid_email'],
    [op({ kind: 'provisioning', state: 'failed', failure_code: 'weird' }), 'failed', 'account.result.resendFailed'],
    [op({ kind: 'invitation_resend', state: 'completed', result_code: 'invitation_sent' }), 'done', 'account.result.invitationSentAt'],
    [op({ kind: 'invitation_resend', state: 'failed', failure_code: 'account_already_active' }), 'done', 'account.result.alreadyActive'],
    [op({ kind: 'invitation_resend', state: 'failed', failure_code: 'identity_shared' }), 'failed', 'account.result.identityShared'],
    [op({ kind: 'invitation_resend', state: 'failed', failure_code: 'account_email_mismatch' }), 'failed', 'account.result.emailMismatch'],
    [op({ kind: 'invitation_resend', state: 'failed', failure_code: 'provider_unavailable' }), 'failed', 'account.result.providerUnavailable'],
    [op({ kind: 'invitation_resend', state: 'failed', failure_code: 'member_cancelled' }), 'failed', 'account.result.resendFailed'],
    [op({ kind: 'email_change', state: 'completed', result_code: 'email_changed' }), 'done', 'account.result.emailChangedSignedOut'],
    [op({ kind: 'email_change', state: 'completed', result_code: 'email_changed_sessions_kept' }), 'done', 'account.result.emailChanged'],
    [op({ kind: 'email_change', state: 'completed', result_code: 'email_changed_reinvited' }), 'done', 'account.result.emailReinvited'],
    [op({ kind: 'email_change', state: 'failed', failure_code: 'verification_expired' }), 'failed', 'account.result.emailExpired'],
    [op({ kind: 'email_change', state: 'expired' }), 'failed', 'account.result.emailExpired'],
    [op({ kind: 'email_change', state: 'failed', failure_code: 'email_unavailable' }), 'failed', 'account.result.emailUnavailable'],
    [op({ kind: 'email_change', state: 'failed', failure_code: 'weird' }), 'failed', 'account.result.emailFailed'],
    [op({ kind: 'session_revocation', state: 'completed', result_code: 'sessions_revoked' }), 'done', 'account.result.signedOutAt'],
    [op({ kind: 'session_revocation', state: 'failed', failure_code: 'identity_shared' }), 'failed', 'account.result.signOutShared'],
    [op({ kind: 'session_revocation', state: 'failed', failure_code: 'login_not_provisioned' }), 'failed', 'account.result.signOutNotProvisioned'],
    [op({ kind: 'session_revocation', state: 'failed', failure_code: 'weird' }), 'failed', 'account.result.signOutFailed'],
  ])('%o → %s %s', (operation, kind, key) => {
    expect(operationResult(operation)).toEqual({ kind, key });
  });

  it.each([
    [op({ kind: 'provisioning', state: 'completed', result_code: 'invitation_sent' }), 'account.last.invitationSent'],
    [op({ kind: 'provisioning', state: 'completed', result_code: 'existing_identity_linked' }), 'account.last.linkedExisting'],
    [op({ kind: 'provisioning', state: 'failed' }), 'account.last.provisioningFailed'],
    [op({ kind: 'invitation_resend', state: 'completed' }), 'account.last.resent'],
    [op({ kind: 'invitation_resend', state: 'failed' }), 'account.last.resendFailed'],
    [op({ kind: 'session_revocation', state: 'completed' }), 'account.last.signedOut'],
    [op({ kind: 'session_revocation', state: 'failed' }), 'account.last.signOutFailed'],
    [op({ kind: 'email_change', state: 'pending_verification' }), 'account.last.emailRequested'],
    [op({ kind: 'email_change', state: 'completed' }), 'account.last.emailChanged'],
    [op({ kind: 'email_change', state: 'expired' }), 'account.last.emailFailed'],
  ])('last action %o → %s', (operation, key) => {
    expect(lastActionKey(operation)).toBe(key);
  });
});

describe('running operations', () => {
  it('detects requested and dispatched only', () => {
    expect(hasRunningOperation(acc())).toBe(false);
    expect(hasRunningOperation(acc({ provisioning: op({ kind: 'provisioning', state: 'requested' }) }))).toBe(true);
    expect(hasRunningOperation(acc({ email_change: op({ kind: 'email_change', state: 'pending_verification' }) }))).toBe(false);
  });

  it('lists the running ids', () => {
    expect(
      runningOperationIds(
        acc({
          invitation_resend: op({ id: 'a', kind: 'invitation_resend', state: 'dispatched' }),
          session_revocation: op({ id: 'b', kind: 'session_revocation', state: 'completed' }),
        }),
      ),
    ).toEqual(['a']);
  });
});

describe('formatOpMoment', () => {
  it('omits the year when it is the current one', () => {
    const m = formatOpMoment('2026-09-25T14:32:00', 'fr', new Date('2026-09-29T10:00:00'));
    expect(m).toEqual({ date: '25 sept.', time: '14:32' });
  });
  it('keeps the year otherwise', () => {
    const m = formatOpMoment('2025-03-03T10:12:00', 'fr', new Date('2026-09-29T10:00:00'));
    expect(m.date).toBe('3 mars 2025');
  });
});
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `pnpm --filter @iziwellpass/owner test -- member-account`
Expected: FAIL (modules missing).

- [ ] **Step 3: Implement `apps/owner/lib/member-account-copy.ts`**

```ts
import type { OperationView } from '@iziwellpass/api/schemas';

const PROVISIONING_FAILURES = new Set([
  'invalid_email',
  'missing_email',
  'identity_already_linked',
  'provider_unavailable',
]);

/** « Motifs d'échec de création » (WeVjb), or null for an unknown code. */
export function provisioningFailureKey(code: string | null | undefined): string | null {
  return code && PROVISIONING_FAILURES.has(code) ? `account.provisioningFailure.${code}` : null;
}

/** The reason line of a failed or expired e-mail change. */
export function emailChangeFailureKey(op: OperationView | null | undefined): string {
  if (!op) return 'account.result.emailFailed';
  if (op.state === 'expired' || op.failure_code === 'verification_expired') {
    return 'account.result.emailExpired';
  }
  if (op.failure_code === 'email_unavailable') return 'account.result.emailUnavailable';
  return 'account.result.emailFailed';
}

/** « Résultats par action » (WeVjb) for an operation in a terminal state. */
export function operationResult(op: OperationView): { kind: 'done' | 'failed'; key: string } {
  const ok = op.state === 'completed';
  switch (op.kind) {
    case 'provisioning':
      if (ok) {
        return {
          kind: 'done',
          key:
            op.result_code === 'existing_identity_linked'
              ? 'account.result.linkedNoInvite'
              : 'account.result.invitationSentAt',
        };
      }
      return {
        kind: 'failed',
        key: provisioningFailureKey(op.failure_code) ?? 'account.result.resendFailed',
      };
    case 'invitation_resend':
      if (ok) return { kind: 'done', key: 'account.result.invitationSentAt' };
      switch (op.failure_code) {
        case 'account_already_active':
          return { kind: 'done', key: 'account.result.alreadyActive' };
        case 'identity_shared':
          return { kind: 'failed', key: 'account.result.identityShared' };
        case 'account_email_mismatch':
          return { kind: 'failed', key: 'account.result.emailMismatch' };
        case 'provider_unavailable':
          return { kind: 'failed', key: 'account.result.providerUnavailable' };
        default:
          return { kind: 'failed', key: 'account.result.resendFailed' };
      }
    case 'email_change':
      if (ok) {
        switch (op.result_code) {
          case 'email_changed':
            return { kind: 'done', key: 'account.result.emailChangedSignedOut' };
          case 'email_changed_reinvited':
            return { kind: 'done', key: 'account.result.emailReinvited' };
          default:
            return { kind: 'done', key: 'account.result.emailChanged' };
        }
      }
      return { kind: 'failed', key: emailChangeFailureKey(op) };
    case 'session_revocation':
      if (ok) return { kind: 'done', key: 'account.result.signedOutAt' };
      switch (op.failure_code) {
        case 'identity_shared':
          return { kind: 'failed', key: 'account.result.signOutShared' };
        case 'login_not_provisioned':
          return { kind: 'failed', key: 'account.result.signOutNotProvisioned' };
        default:
          return { kind: 'failed', key: 'account.result.signOutFailed' };
      }
    default:
      return { kind: 'failed', key: 'account.result.resendFailed' };
  }
}

/** « Dernière action » label (spec MM2); rendered with `{ date, time }`. */
export function lastActionKey(op: OperationView): string {
  const ok = op.state === 'completed';
  switch (op.kind) {
    case 'provisioning':
      if (!ok) return 'account.last.provisioningFailed';
      return op.result_code === 'existing_identity_linked'
        ? 'account.last.linkedExisting'
        : 'account.last.invitationSent';
    case 'invitation_resend':
      return ok ? 'account.last.resent' : 'account.last.resendFailed';
    case 'session_revocation':
      return ok ? 'account.last.signedOut' : 'account.last.signOutFailed';
    case 'email_change':
      if (op.state === 'pending_verification') return 'account.last.emailRequested';
      return ok ? 'account.last.emailChanged' : 'account.last.emailFailed';
    default:
      return 'account.last.resent';
  }
}
```

- [ ] **Step 4: Implement `apps/owner/lib/member-account.ts`**

```ts
import type { MemberAccountSummary, OperationView } from '@iziwellpass/api/schemas';
import type { Role } from '@iziwellpass/auth/claims';

import {
  emailChangeFailureKey,
  lastActionKey,
  operationResult,
  provisioningFailureKey,
} from './member-account-copy';

export const POLL_INTERVAL_MS = 2000;
export const POLL_WINDOW_MS = 30000;

export type AccountTone = 'success' | 'info' | 'neutral' | 'outline' | 'danger' | 'warning';
export type AccountAction = 'resend' | 'relaunch' | 'changeEmail';
export type RunningAction = AccountAction | 'signOut';

export interface AccountBadge {
  labelKey: string;
  tone: AccountTone;
  spinner?: boolean;
}
export interface AccountLine {
  key: string;
  tone: 'muted' | 'danger';
}
export interface EmailBadge {
  labelKey: string;
  tone: AccountTone;
  lineKeys: string[];
}
export interface StatusRow {
  kind: 'progress' | 'waiting' | 'done' | 'failed';
  key: string;
  at?: string;
  runningAction?: RunningAction;
}
export interface AccountView {
  badge: AccountBadge;
  lines: AccountLine[];
  emailBadge: EmailBadge | null;
  actions: AccountAction[];
  canSignOut: boolean;
  canManage: boolean;
  lastAction: { key: string; at: string } | null;
  status: StatusRow | null;
}

type Invitation = MemberAccountSummary['invitation'];

const BADGES: Record<Invitation, AccountBadge> = {
  not_applicable: { labelKey: 'account.badge.none', tone: 'outline' },
  pending: { labelKey: 'account.badge.pending', tone: 'neutral', spinner: true },
  sent: { labelKey: 'account.badge.sent', tone: 'info' },
  linked_existing: { labelKey: 'account.badge.linkedExisting', tone: 'info' },
  accepted: { labelKey: 'account.badge.accepted', tone: 'success' },
  untracked: { labelKey: 'account.badge.untracked', tone: 'neutral' },
  failed: { labelKey: 'account.badge.failed', tone: 'danger' },
};

const EXPLAIN: Record<Exclude<Invitation, 'failed'>, string> = {
  not_applicable: 'account.explain.none',
  pending: 'account.explain.pending',
  sent: 'account.explain.sent',
  linked_existing: 'account.explain.linkedExisting',
  accepted: 'account.explain.accepted',
  untracked: 'account.explain.untracked',
};

const ACTIONS: Record<Invitation, AccountAction[]> = {
  not_applicable: [],
  pending: [],
  sent: ['resend', 'changeEmail'],
  linked_existing: ['changeEmail'],
  accepted: ['changeEmail'],
  untracked: ['resend', 'changeEmail'],
  failed: ['relaunch'],
};

const HAS_IDENTITY: ReadonlySet<Invitation> = new Set([
  'sent',
  'linked_existing',
  'accepted',
  'untracked',
]);

const PROGRESS: Record<OperationView['kind'], { key: string; action: RunningAction }> = {
  provisioning: { key: 'account.status.creating', action: 'relaunch' },
  invitation_resend: { key: 'account.status.sending', action: 'resend' },
  email_change: { key: 'account.status.sendingCode', action: 'changeEmail' },
  session_revocation: { key: 'account.status.signingOut', action: 'signOut' },
};

const RUNNING = new Set(['requested', 'dispatched']);
const TERMINAL = new Set(['completed', 'failed', 'expired']);

function operations(account: MemberAccountSummary): OperationView[] {
  return [
    account.provisioning,
    account.invitation_resend,
    account.session_revocation,
    account.email_change,
  ].filter((op): op is OperationView => op != null);
}

function newest(ops: OperationView[]): OperationView | undefined {
  return [...ops].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
}

export function hasRunningOperation(account: MemberAccountSummary): boolean {
  return operations(account).some((op) => RUNNING.has(op.state));
}

export function runningOperationIds(account: MemberAccountSummary): string[] {
  return operations(account)
    .filter((op) => RUNNING.has(op.state))
    .map((op) => op.id);
}

function canManageAccount(role: Role | null): boolean {
  return role === 'owner' || role === 'admin' || role === 'platform_admin';
}

function statusRow(
  account: MemberAccountSummary,
  watched: ReadonlySet<string>,
  stale: boolean,
): StatusRow | null {
  const ops = operations(account);
  const running = newest(ops.filter((op) => RUNNING.has(op.state)));
  if (running) {
    const p = PROGRESS[running.kind];
    return { kind: 'progress', key: stale ? 'account.status.stillRunning' : p.key, runningAction: p.action };
  }
  if (account.email_change?.state === 'pending_verification') {
    return { kind: 'waiting', key: 'account.status.waiting' };
  }
  const finished = newest(ops.filter((op) => TERMINAL.has(op.state) && watched.has(op.id)));
  if (finished) {
    const result = operationResult(finished);
    return { kind: result.kind, key: result.key, at: finished.updated_at };
  }
  return null;
}

export function describeAccount(
  account: MemberAccountSummary,
  opts: { role: Role | null; watched: ReadonlySet<string>; stale: boolean },
): AccountView {
  const canManage = canManageAccount(opts.role);
  const invitation = account.invitation;

  const lines: AccountLine[] =
    invitation === 'failed'
      ? [
          ...(provisioningFailureKey(account.provisioning?.failure_code)
            ? [{ key: provisioningFailureKey(account.provisioning?.failure_code)!, tone: 'danger' as const }]
            : []),
          { key: 'account.explain.failedFix', tone: 'muted' },
        ]
      : [{ key: EXPLAIN[invitation], tone: 'muted' }];

  const emailBadge: EmailBadge | null =
    account.email === 'change_pending'
      ? {
          labelKey: 'account.emailState.changePending',
          tone: 'warning',
          lineKeys: ['account.emailState.changePendingLine'],
        }
      : account.email === 'change_failed'
        ? {
            labelKey: 'account.emailState.changeFailed',
            tone: 'neutral',
            lineKeys: [emailChangeFailureKey(account.email_change), 'account.emailState.changeFailedKeep'],
          }
        : null;

  const lastOp = newest(
    operations(account).filter((op) => TERMINAL.has(op.state) || op.state === 'pending_verification'),
  );

  return {
    badge: BADGES[invitation],
    lines,
    emailBadge,
    actions: canManage ? ACTIONS[invitation] : [],
    canSignOut: canManage && HAS_IDENTITY.has(invitation),
    canManage,
    lastAction: lastOp ? { key: lastActionKey(lastOp), at: lastOp.updated_at } : null,
    status: statusRow(account, opts.watched, opts.stale),
  };
}

/** `25 sept.` / `3 mars 2025` and `14:32`, in the browser's time zone. */
export function formatOpMoment(
  iso: string,
  locale: string,
  now: Date = new Date(),
): { date: string; time: string } {
  const d = new Date(iso);
  const sameYear = d.getFullYear() === now.getFullYear();
  const date = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(d);
  const time = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(d);
  return { date, time };
}
```

Replace the non-null assertion in `lines` with a local variable if lint forbids `!`:

```ts
  const failureKey = provisioningFailureKey(account.provisioning?.failure_code);
  // then: ...(failureKey ? [{ key: failureKey, tone: 'danger' as const }] : [])
```

- [ ] **Step 5: Run the tests and watch them pass**

Run: `pnpm --filter @iziwellpass/owner test -- member-account`
Expected: PASS. If `formatOpMoment` yields a different French abbreviation on this Node's ICU (e.g. `sept.`), adjust the **test expectation** to what `Intl` produces and keep the implementation. The format is Intl's, not hand-built.

- [ ] **Step 6: Add the copy**

In `apps/owner/messages/fr.json`, add under `members` a new `account` object with exactly these keys (copy verbatim from INVENTORY `WeVjb` / Flow 10, plus the spec §9 deltas):

```json
"account": {
  "title": "Accès à l'app",
  "subtitle": "Connexion du membre à l'app IziWellPass : carte, QR code, réservations.",
  "rows": { "access": "Accès", "email": "Adresse de connexion", "lastAction": "Dernière action" },
  "badge": {
    "none": "Sans app", "pending": "Création en cours", "sent": "Invitation envoyée",
    "linkedExisting": "Compte existant lié", "accepted": "App activée", "untracked": "Accès app",
    "failed": "Invitation échouée"
  },
  "explain": {
    "none": "Ce membre n'a pas d'accès à l'app.",
    "pending": "L'accès est en cours de création. L'invitation part dans quelques secondes.",
    "sent": "Le membre n'a pas encore choisi son mot de passe.",
    "linkedExisting": "Cette personne avait déjà un compte IziWellPass : aucune invitation n'a été envoyée.",
    "accepted": "Le membre se connecte à l'app.",
    "untracked": "Accès créé avant le suivi des invitations.",
    "failedFix": "Corrigez l'adresse si besoin, puis relancez."
  },
  "provisioningFailure": {
    "invalid_email": "L'adresse e-mail est invalide.",
    "missing_email": "Aucune adresse e-mail.",
    "identity_already_linked": "Cette adresse est déjà liée à un autre membre.",
    "provider_unavailable": "Le service de connexion n'a pas répondu pendant 24 h."
  },
  "emailState": {
    "changePending": "Changement en attente",
    "changePendingLine": "Le membre doit saisir le code reçu à sa nouvelle adresse (24 h). Il se connecte avec l'adresse actuelle d'ici là.",
    "changeFailed": "Changement échoué",
    "changeFailedKeep": "L'adresse actuelle reste l'adresse de connexion."
  },
  "actions": {
    "resend": "Renvoyer l'invitation", "relaunch": "Relancer la création de l'accès",
    "changeEmail": "Changer l'adresse"
  },
  "receptionistNote": "Seul un propriétaire ou un administrateur peut agir sur l'accès à l'app.",
  "last": {
    "invitationSent": "Invitation envoyée le {date} à {time}",
    "linkedExisting": "Compte existant lié le {date} à {time}",
    "provisioningFailed": "Échec de création le {date} à {time}",
    "resent": "Invitation renvoyée le {date} à {time}",
    "resendFailed": "Échec du renvoi le {date} à {time}",
    "signedOut": "Déconnecté de tous les appareils le {date} à {time}",
    "signOutFailed": "Échec de la déconnexion le {date} à {time}",
    "emailRequested": "Changement demandé le {date} à {time}",
    "emailChanged": "Adresse modifiée le {date} à {time}",
    "emailFailed": "Échec du changement d'adresse le {date} à {time}"
  },
  "status": {
    "sending": "Envoi de l'invitation…", "creating": "Création de l'accès…",
    "sendingCode": "Envoi du code à la nouvelle adresse…", "signingOut": "Déconnexion en cours…",
    "stillRunning": "Toujours en cours. Cela peut prendre quelques minutes.",
    "refresh": "Actualiser",
    "waiting": "Code envoyé à la nouvelle adresse. En attente de confirmation par le membre."
  },
  "result": {
    "invitationSentAt": "Invitation envoyée à {time}",
    "linkedNoInvite": "Compte existant lié : aucune invitation envoyée.",
    "alreadyActive": "Ce membre a déjà activé son compte : rien n'a été envoyé.",
    "identityShared": "Ce compte sert aussi dans une autre organisation ou pour un accès équipe. Un renvoi bloquerait ces accès : contactez le support.",
    "emailMismatch": "L'adresse du membre ne correspond plus à son compte. Contactez le support.",
    "providerUnavailable": "Le service d'envoi est indisponible. Réessayez plus tard.",
    "resendFailed": "L'invitation n'a pas pu être renvoyée.",
    "emailConflict": "Cette adresse est déjà utilisée par un autre membre.",
    "emailChangedSignedOut": "Adresse modifiée. Le membre a été déconnecté et se reconnecte avec sa nouvelle adresse.",
    "emailChanged": "Adresse modifiée.",
    "emailReinvited": "Adresse remplacée. Une nouvelle invitation a été envoyée.",
    "emailExpired": "Le membre n'a pas confirmé sous 24 h. L'adresse actuelle est conservée.",
    "emailUnavailable": "Cette adresse n'est pas disponible.",
    "emailFailed": "Le changement d'adresse n'a pas abouti.",
    "signedOutAt": "Membre déconnecté de tous ses appareils à {time}.",
    "signOutShared": "Ce compte sert aussi dans une autre organisation ou pour un accès équipe : une déconnexion les toucherait aussi. Contactez le support.",
    "signOutNotProvisioned": "L'accès du membre n'est pas encore créé : aucune session à fermer.",
    "signOutFailed": "La déconnexion n'a pas abouti."
  }
}
```

Add the same structure to `en.json` with English text (e.g. « App access », « No app », « Invitation sent », « Resend the invitation », « Sent the invitation at {time} », …).

Add a one-line test to `member-account.test.ts` that pins every key the mapper can return to a French message:

```ts
import fr from '../messages/fr.json';

it('every key the mapper can emit exists in fr.json', () => {
  const get = (path: string) =>
    path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], fr.members);
  const keys = [
    ...['none','pending','sent','linkedExisting','accepted','untracked','failed'].map((k) => `account.badge.${k}`),
    ...['none','pending','sent','linkedExisting','accepted','untracked','failedFix'].map((k) => `account.explain.${k}`),
    ...['invalid_email','missing_email','identity_already_linked','provider_unavailable'].map((k) => `account.provisioningFailure.${k}`),
    ...['sending','creating','sendingCode','signingOut','stillRunning','waiting'].map((k) => `account.status.${k}`),
    ...Object.keys(fr.members.account.result).map((k) => `account.result.${k}`),
    ...Object.keys(fr.members.account.last).map((k) => `account.last.${k}`),
  ];
  for (const key of keys) expect(typeof get(key), key).toBe('string');
});
```

(If `resolveJsonModule` is off for the owner vitest run, import with `import fr from '../messages/fr.json' with { type: 'json' };`, or read the file with `fs` and `JSON.parse`.)

- [ ] **Step 7: Gates and commit**

Run: `pnpm --filter @iziwellpass/owner test && pnpm --filter @iziwellpass/owner typecheck && pnpm --filter @iziwellpass/owner lint`

```bash
git add apps/owner/lib/member-account.ts apps/owner/lib/member-account-copy.ts apps/owner/lib/member-account.test.ts apps/owner/messages/fr.json apps/owner/messages/en.json
git commit -m "feat(owner): member account mapper and copy"
```

---

### Task 3: Owner mock server

**Files:**
- Modify: `apps/owner/scripts/mock-server.mjs`

**Interfaces:**
- Produces HTTP routes the later tasks call:
  - `POST /gms/v1/members/search`
  - `GET /gms/v1/members/{mid}/attendance`
  - `POST /gms/v1/members/{mid}/invitation-resend`
  - `POST /gms/v1/members/{mid}/session-revocation`
  - `POST /gms/v1/members/{mid}/email-change`
  - `GET` / `PATCH /gms/v1/tenant/settings`
  - full `account` objects on `GET /gms/v1/members/{mid}`
- Demo members, fixed ids:

  | Member | State |
  | --- | --- |
  | `mbr-01` | `sent` |
  | `mbr-02` | `accepted`, visits every period |
  | `mbr-03` | roster |
  | `mbr-04` | `linked_existing` |
  | `mbr-08` | `untracked` |
  | `mbr-10` | `change_pending` |
  | `mbr-12` | `failed` / `invalid_email` |
  | `mbr-13` | resend stuck in `dispatched` |
  | `mbr-14` | `IDENTITY_SHARED` |
  | `mbr-15` | only visits older than 30 days |
  | `mbr-16` | never visited |

  These are the ids later tasks' browser checks use.

- [ ] **Step 1: Pass request headers to handlers**

`dispatch(method, pathname, body, query)` becomes `dispatch(method, pathname, body, query, headers)`, and the loop calls `route.handler(match, body, query, headers)`. At the call site in the HTTP server, pass `req.headers`. Existing handlers ignore the extra argument.

- [ ] **Step 2: Seed 14 more members (`mbr-13` … `mbr-26`)**

Append to the `members` array, using `mkMember` with French names, mixed statuses (at least 10 `active`, 2 `expired`, 1 `suspended`, 1 `cancelled`), about half with e-mails (login) and half roster, and venues split between `[VENUE_1]`, `[VENUE_2]` and `[VENUE_1, VENUE_2]`. Give `mbr-13` and `mbr-14` e-mails (they must be login). Then there are ≥ 24 non-cancelled members, so « Tous » at 20/page shows « Afficher plus ». Ensure `mbr-01`, `mbr-02`, `mbr-04`, `mbr-08`, `mbr-10` have e-mails (login); if a seed row has none, add one.

- [ ] **Step 3: Account state store**

Replace `memberInvitation` and the `memberProfile` account block with an operations model:

```js
// ---- member identity operations (Phase 5A account controls) -------------------
// Operations are evaluated on read: requested → dispatched after 1 s, then
// terminal 4 s after creation (unless `stuck`). `finish(op)` decides the end state.
const memberInvitation = new Map([
  ['mbr-01', 'sent'],
  ['mbr-04', 'linked_existing'],
  ['mbr-08', 'untracked'],
  ['mbr-12', 'failed'],
  ['mbr-13', 'sent'],
  ['mbr-14', 'accepted'],
]); // everyone else with login: 'accepted'
const memberEmailState = new Map(); // id → 'verified' | 'change_pending' | 'change_failed'
const memberOps = new Map(); // id → { provisioning, invitation_resend, session_revocation, email_change }
const sharedIdentity = new Set(['mbr-14']);
const stuckResend = new Set(['mbr-13']);
const idempotency = new Map(); // `${mid}:${key}` → { body: string, response: [status, json] }

function opsOf(id) {
  if (!memberOps.has(id)) {
    memberOps.set(id, { provisioning: null, invitation_resend: null, session_revocation: null, email_change: null });
  }
  return memberOps.get(id);
}

function mkOp(kind, { state = 'requested', at = now(), finish, stuck = false, result_code = null, failure_code = null } = {}) {
  return { id: newId('op'), kind, state, result_code, failure_code, updated_at: iso(at), createdMs: at.getTime(), finish, stuck };
}

/** Advance a running op by wall-clock time; apply its end state once. */
function advance(memberId, op) {
  if (!op || !['requested', 'dispatched'].includes(op.state)) return;
  const age = Date.now() - op.createdMs;
  if (op.stuck) {
    if (age >= 1000 && op.state === 'requested') { op.state = 'dispatched'; op.updated_at = iso(now()); }
    return;
  }
  if (age >= 4000) {
    op.finish?.(op, memberId);
    op.updated_at = iso(now());
  } else if (age >= 1000 && op.state === 'requested') {
    op.state = 'dispatched';
    op.updated_at = iso(now());
  }
}

const publicOp = (op) =>
  op && { id: op.id, kind: op.kind, state: op.state, result_code: op.result_code, failure_code: op.failure_code, updated_at: op.updated_at };
```

Seed the historical operations once, right after the `members` array:

```js
// mbr-02: accepted long ago; signed out everywhere on 12 Sept.
opsOf('mbr-02').provisioning = mkOp('provisioning', { state: 'completed', result_code: 'invitation_sent', at: daysFromNow(-200) });
opsOf('mbr-02').session_revocation = mkOp('session_revocation', { state: 'completed', result_code: 'sessions_revoked', at: daysFromNow(-17) });
opsOf('mbr-01').provisioning = mkOp('provisioning', { state: 'completed', result_code: 'invitation_sent', at: daysFromNow(-4) });
opsOf('mbr-04').provisioning = mkOp('provisioning', { state: 'completed', result_code: 'existing_identity_linked', at: daysFromNow(-40) });
opsOf('mbr-12').provisioning = mkOp('provisioning', { state: 'failed', failure_code: 'invalid_email', at: daysFromNow(-4) });
opsOf('mbr-13').provisioning = mkOp('provisioning', { state: 'completed', result_code: 'invitation_sent', at: daysFromNow(-2) });
// mbr-12's failure reason must be true: give it a malformed address (no TLD),
// so a relaunch without correcting it fails again with invalid_email.
members.find((m) => m.id === 'mbr-12').email = 'serigne.mbaye@exemple';
memberEmailState.set('mbr-10', 'change_pending');
opsOf('mbr-10').email_change = mkOp('email_change', { state: 'pending_verification', at: new Date(Date.now() - 3600_000) });
```

Rewrite `memberProfile(member)`:

```js
function memberProfile(member) {
  const login = memberMode.get(member.id) === 'login';
  const ops = opsOf(member.id);
  for (const op of Object.values(ops)) advance(member.id, op);
  const invitation = login ? (memberInvitation.get(member.id) ?? 'accepted') : 'not_applicable';
  const hasIdentity = login && !['failed', 'pending'].includes(invitation);
  return {
    ...member,
    access: memberAccess(member),
    account: {
      mode: login ? 'login' : 'roster',
      invitation,
      email: hasIdentity ? (memberEmailState.get(member.id) ?? 'verified') : 'not_applicable',
      provisioning: publicOp(ops.provisioning),
      invitation_resend: publicOp(ops.invitation_resend),
      session_revocation: publicOp(ops.session_revocation),
      email_change: publicOp(ops.email_change),
    },
  };
}
```

`registerMemberHandler` (login branch) sets `memberInvitation.set(id, 'pending')` and stores the provisioning op with a `finish` that flips the invitation. It must also return that op (not a fresh one) in the 201:

```js
  const op = mkOp('provisioning', {
    finish: (o, mid) => { o.state = 'completed'; o.result_code = 'invitation_sent'; memberInvitation.set(mid, 'sent'); },
  });
  opsOf(id).provisioning = op;
  memberInvitation.set(id, 'pending');
```

- [ ] **Step 4: Tenant settings + policy-driven creation**

```js
let configuredLoginMode = process.env.MOCK_LOGIN_MODE === 'roster' ? 'roster' : 'login';
function loginPolicy() {
  const capability = PLAN_CAPABILITIES[MOCK_PLAN].includes('member_self_service');
  const effective = configuredLoginMode === 'login' && capability ? 'login' : 'roster';
  return {
    member_login_mode: configuredLoginMode,
    member_login: {
      configured_mode: configuredLoginMode,
      effective_mode: effective,
      required_capability: 'member_self_service',
      capability_available: capability,
      downgrade_reason: configuredLoginMode === 'login' && !capability ? 'plan_lacks_member_self_service' : null,
    },
  };
}
function getTenantSettingsHandler() { return [200, envelope(loginPolicy())]; }
function patchTenantSettingsHandler(body) {
  const mode = body?.member_login_mode;
  if (!['login', 'roster'].includes(mode) || Object.keys(body).length !== 1) {
    return badRequest('member_login_mode must be login or roster');
  }
  if (mode === 'login' && !PLAN_CAPABILITIES[MOCK_PLAN].includes('member_self_service')) {
    return [403, errorBody('FEATURE_NOT_AVAILABLE', 'Plan lacks member_self_service')];
  }
  configuredLoginMode = mode;
  return [200, envelope(loginPolicy())];
}
```

(Match the actual shape of `PLAN_CAPABILITIES` in this file. If it maps plan → array, the `includes` above is right.)

In `registerMemberHandler`:
- replace `memberMode.set(id, body.email ? 'login' : 'roster')` with `const effective = loginPolicy().member_login.effective_mode; memberMode.set(id, effective);`;
- validate before creating: `if (effective === 'login' && !body.email) details.push({ field: 'email', message: 'email is required for login members' });`;
- respond with `effective_mode: effective`.

- [ ] **Step 5: Account operation routes**

```js
function memberOr404(id) {
  return members.find((m) => m.id === id) ?? null;
}

function invitationResendHandler(mid) {
  const m = memberOr404(mid);
  if (!m) return notFound(`Member ${mid} not found`);
  if (memberMode.get(mid) !== 'login') return [409, errorBody('NOT_A_LOGIN_MEMBER', 'Roster member')];
  if (m.membership_status === 'cancelled') return lifecycleConflict(m, 'invitation_resend', 'active');
  if (sharedIdentity.has(mid)) return [409, errorBody('IDENTITY_SHARED', 'Identity is shared')];
  const ops = opsOf(mid);
  for (const op of Object.values(ops)) advance(mid, op);
  const running = [ops.provisioning, ops.invitation_resend].find((op) => op && ['requested', 'dispatched'].includes(op.state));
  if (running) return [202, envelope(publicOp(running))];
  const invitation = memberInvitation.get(mid) ?? 'accepted';
  if (invitation === 'accepted') return [409, errorBody('ACCOUNT_ALREADY_ACTIVE', 'Account already active')];
  if (invitation === 'failed') {
    if (loginPolicy().member_login.effective_mode !== 'login') {
      return [409, errorBody('LOGIN_NOT_AVAILABLE', 'Tenant no longer provisions logins')];
    }
    const taken = members.some((o) => o.id !== mid && o.email && m.email && o.email.toLowerCase() === m.email.toLowerCase());
    if (taken) return conflict('A member with this email already exists');
    memberInvitation.set(mid, 'pending');
    ops.provisioning = mkOp('provisioning', {
      finish: (o) => {
        if (!m.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m.email)) {
          o.state = 'failed'; o.failure_code = 'invalid_email'; memberInvitation.set(mid, 'failed');
        } else {
          o.state = 'completed'; o.result_code = 'invitation_sent'; memberInvitation.set(mid, 'sent');
        }
      },
    });
    return [202, envelope(publicOp(ops.provisioning))];
  }
  ops.invitation_resend = mkOp('invitation_resend', {
    stuck: stuckResend.has(mid),
    finish: (o) => { o.state = 'completed'; o.result_code = 'invitation_sent'; },
  });
  return [202, envelope(publicOp(ops.invitation_resend))];
}

function sessionRevocationHandler(mid) {
  const m = memberOr404(mid);
  if (!m) return notFound(`Member ${mid} not found`);
  if (memberMode.get(mid) !== 'login') return [409, errorBody('NOT_A_LOGIN_MEMBER', 'Roster member')];
  const invitation = memberInvitation.get(mid) ?? 'accepted';
  if (['pending', 'failed'].includes(invitation)) return [409, errorBody('LOGIN_NOT_PROVISIONED', 'No identity yet')];
  if (sharedIdentity.has(mid)) return [409, errorBody('IDENTITY_SHARED', 'Identity is shared')];
  const ops = opsOf(mid);
  advance(mid, ops.session_revocation);
  if (ops.session_revocation && ['requested', 'dispatched'].includes(ops.session_revocation.state)) {
    return [202, envelope(publicOp(ops.session_revocation))];
  }
  ops.session_revocation = mkOp('session_revocation', {
    finish: (o) => { o.state = 'completed'; o.result_code = 'sessions_revoked'; },
  });
  return [202, envelope(publicOp(ops.session_revocation))];
}

function emailChangeHandler(mid, body, headers) {
  const key = headers['idempotency-key'];
  if (!key) return badRequest('Idempotency-Key header is required');
  const bodyText = JSON.stringify(body ?? {});
  const stored = idempotency.get(`${mid}:${key}`);
  if (stored) {
    if (stored.body !== bodyText) return [422, errorBody('IDEMPOTENCY_KEY_REUSED', 'Key reused with another body')];
    return stored.response;
  }
  const m = memberOr404(mid);
  if (!m) return notFound(`Member ${mid} not found`);
  const unknown = Object.keys(body ?? {}).filter((k) => k !== 'new_email');
  if (unknown.length) return badRequest(`Unknown field: ${unknown[0]}`);
  const next = String(body?.new_email ?? '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(next)) return validationError([{ field: 'new_email', message: 'invalid email' }]);
  if (m.email && next.toLowerCase() === m.email.toLowerCase()) {
    return validationError([{ field: 'new_email', message: 'same as current email' }]);
  }
  if (memberMode.get(mid) !== 'login') return [409, errorBody('NOT_A_LOGIN_MEMBER', 'Roster member')];
  const invitation = memberInvitation.get(mid) ?? 'accepted';
  if (['pending', 'failed'].includes(invitation)) return [409, errorBody('LOGIN_NOT_PROVISIONED', 'No identity yet')];
  if (sharedIdentity.has(mid)) return [409, errorBody('IDENTITY_SHARED', 'Identity is shared')];
  if (m.membership_status === 'cancelled') return lifecycleConflict(m, 'email_change', 'active');
  if (members.some((o) => o.id !== mid && (o.email ?? '').toLowerCase() === next.toLowerCase())) {
    return conflict('Email already used');
  }
  const ops = opsOf(mid);
  const current = ops.email_change;
  if (current && ['requested', 'dispatched', 'pending_verification'].includes(current.state)) {
    if (current.target === next.toLowerCase()) return [202, envelope(publicOp(current))];
    return [409, errorBody('EMAIL_CHANGE_IN_PROGRESS', 'Another change is in progress')];
  }
  const reinvite = invitation === 'sent' || invitation === 'untracked';
  ops.email_change = mkOp('email_change', {
    finish: (o) => {
      if (next.toLowerCase().startsWith('pris@')) {
        o.state = 'failed'; o.failure_code = 'email_unavailable'; memberEmailState.set(mid, 'change_failed');
      } else if (reinvite) {
        o.state = 'completed'; o.result_code = 'email_changed_reinvited'; m.email = next; touch(m);
        memberEmailState.set(mid, 'verified');
      } else {
        o.state = 'pending_verification'; memberEmailState.set(mid, 'change_pending');
      }
    },
  });
  ops.email_change.target = next.toLowerCase();
  memberEmailState.set(mid, 'change_pending');
  const response = [202, envelope(publicOp(ops.email_change))];
  idempotency.set(`${mid}:${key}`, { body: bodyText, response });
  return response;
}
```

(`publicOp` never exposes `target`: it builds a fresh object.)

- [ ] **Step 6: Search**

```js
const SEARCH_FIELDS = new Set(['venue_id', 'all_venues', 'q', 'status', 'cursor', 'limit']);
function searchMembersHandler(body) {
  const b = body ?? {};
  const unknown = Object.keys(b).filter((k) => !SEARCH_FIELDS.has(k));
  if (unknown.length) return badRequest('Unknown field in search body');
  const byVenue = typeof b.venue_id === 'string' && b.venue_id;
  const all = b.all_venues === true;
  if (byVenue === all || (!byVenue && !all)) return badRequest('Provide exactly one of venue_id or all_venues');
  if (byVenue && !venues.some((v) => v.id === b.venue_id)) return notFound('Venue not found');
  const status = b.status ?? 'all';
  if (!['active', 'expired', 'suspended', 'all'].includes(status)) return badRequest('Invalid status');
  const q = typeof b.q === 'string' ? b.q.trim().toLowerCase() : '';
  if (typeof b.q === 'string' && (b.q.length < 1 || b.q.length > 100)) return badRequest('q must be 1 to 100 characters');
  let list = members.filter((m) => m.membership_status !== 'cancelled');
  if (status !== 'all') list = list.filter((m) => m.membership_status === status);
  if (byVenue) {
    list = list.filter((m) => m.access_scope === 'chain_wide' || (memberVenues.get(m.id) ?? []).includes(b.venue_id));
  }
  if (q) {
    list = list.filter((m) =>
      [m.first_name, m.last_name, `${m.first_name} ${m.last_name}`, m.email ?? '', m.phone ?? '']
        .some((field) => field.toLowerCase().includes(q)),
    );
  }
  list = [...list].sort((a, b2) => `${a.last_name} ${a.first_name}`.localeCompare(`${b2.last_name} ${b2.first_name}`, 'fr'));
  const limit = Number.isInteger(b.limit) && b.limit >= 1 && b.limit <= 100 ? b.limit : 20;
  let offset = 0;
  if (typeof b.cursor === 'string') {
    const parsed = Number(Buffer.from(b.cursor, 'base64url').toString('utf8'));
    offset = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }
  const page = list.slice(offset, offset + limit);
  const next = offset + limit < list.length ? Buffer.from(String(offset + limit)).toString('base64url') : null;
  return [200, paginatedEnvelope(page, { next_cursor: next })];
}
```

- [ ] **Step 7: Attendance**

Seed deterministic visits once:

```js
const METHODS = ['qr', 'qr', 'manual', 'wallet'];
const memberVisits = new Map(); // id → [{ id, venue_id, venue_name, checked_in_at, method, kind, booking_id }]
(function seedVisits() {
  for (const m of members) {
    if (m.id === 'mbr-16' || m.membership_status === 'cancelled') continue;
    const visits = [];
    const vids = m.access_scope === 'chain_wide' ? [VENUE_1, VENUE_2] : (memberVenues.get(m.id) ?? [VENUE_1]);
    const seed = Number(m.id.replace(/\D/g, '')) || 1;
    const startDay = m.id === 'mbr-15' ? 40 : 0;
    for (let day = startDay; day < 95; day += 1 + ((day * seed) % 3)) {
      const at = daysFromNow(-day);
      at.setHours(6 + ((day + seed) % 13), (day * 7 + seed * 11) % 60, 0, 0);
      const venueId = vids[(day + seed) % vids.length];
      const booked = (day + seed) % 2 === 0;
      visits.push({
        id: `vis-${m.id}-${day}`,
        venue_id: venueId,
        venue_name: venues.find((v) => v.id === venueId)?.name ?? venueId,
        checked_in_at: iso(at),
        method: METHODS[(day + seed) % METHODS.length],
        kind: booked ? 'booked' : 'walk_in',
        booking_id: booked ? `bkg-hist-${m.id}-${day}` : null,
      });
    }
    memberVisits.set(m.id, visits.sort((a, b) => b.checked_in_at.localeCompare(a.checked_in_at)));
  }
})();

function memberAttendanceHandler(mid, query) {
  if (!memberOr404(mid)) return notFound(`Member ${mid} not found`);
  const all = memberVisits.get(mid) ?? [];
  let from; let to; let venueId; let offset = 0;
  const cursor = query.get('cursor');
  if (cursor) {
    try {
      ({ from, to, venueId, offset } = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')));
    } catch {
      return badRequest('Invalid cursor');
    }
    for (const [param, value] of [['from', from], ['to', to], ['venue_id', venueId]]) {
      const sent = query.get(param);
      if (sent !== null && sent !== (value ?? '')) return badRequest(`${param} differs from the cursor`);
    }
  } else {
    to = query.get('to') ?? iso(now());
    from = query.get('from') ?? iso(new Date(new Date(to).getTime() - 30 * 86400_000));
    venueId = query.get('venue_id') ?? null;
  }
  const fromMs = Date.parse(from); const toMs = Date.parse(to);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) return validationError([{ field: 'from', message: 'invalid' }]);
  if (fromMs >= toMs) return validationError([{ field: 'from', message: 'from must be before to' }]);
  if (toMs - fromMs > 366 * 86400_000) return validationError([{ field: 'from', message: 'range over 366 days' }]);
  const scoped = venueId ? all.filter((v) => v.venue_id === venueId) : all;
  const inRange = scoped.filter((v) => { const t = Date.parse(v.checked_in_at); return t >= fromMs && t < toMs; });
  const rawLimit = Number(query.get('limit'));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 100) : 50;
  const items = inRange.slice(offset, offset + limit);
  const nextOffset = offset + limit;
  return [200, envelope({
    from, to,
    total_visits: inRange.length,
    last_visit_at: scoped[0]?.checked_in_at ?? null,
    items,
    next_cursor: nextOffset < inRange.length
      ? Buffer.from(JSON.stringify({ from, to, venueId, offset: nextOffset })).toString('base64url')
      : null,
  })];
}
```

- [ ] **Step 8: Register the routes** (in `routes`, **before** the generic `/members/([^/]+)$` entries)

```js
  { method: 'POST', pattern: /^\/gms\/v1\/members\/search$/, handler: (_m, b) => searchMembersHandler(b) },
  { method: 'GET', pattern: /^\/gms\/v1\/members\/([^/]+)\/attendance$/, handler: (m, _b, q) => memberAttendanceHandler(m[1], q) },
  { method: 'POST', pattern: /^\/gms\/v1\/members\/([^/]+)\/invitation-resend$/, handler: (m) => invitationResendHandler(m[1]) },
  { method: 'POST', pattern: /^\/gms\/v1\/members\/([^/]+)\/session-revocation$/, handler: (m) => sessionRevocationHandler(m[1]) },
  { method: 'POST', pattern: /^\/gms\/v1\/members\/([^/]+)\/email-change$/, handler: (m, b, _q, h) => emailChangeHandler(m[1], b, h) },
  { method: 'GET', pattern: /^\/gms\/v1\/tenant\/settings$/, handler: () => getTenantSettingsHandler() },
  { method: 'PATCH', pattern: /^\/gms\/v1\/tenant\/settings$/, handler: (_m, b) => patchTenantSettingsHandler(b) },
```

- [ ] **Step 9: Header comment**

Add a « Member management (SP-MM) » block to the header listing: `MOCK_LOGIN_MODE`, every demo member above with its state, the `pris@` rule, the 1 s / 4 s operation timing, `mbr-13` stuck, `mbr-14` shared, `mbr-15` / `mbr-16` attendance, and the search/attendance cursors. Remove the old `mbr-12` sentence if it now contradicts.

- [ ] **Step 10: Smoke test the routes with curl**

Start the mock on a free port you choose (e.g. 8191): `PORT=8191 node apps/owner/scripts/mock-server.mjs &` (check how the script reads its port; use its variable). Then:

```bash
H='-H authorization:x -H content-type:application/json'
curl -s $H -X POST localhost:8191/gms/v1/members/search -d '{"all_venues":true,"status":"all"}' | node -e 'const r=JSON.parse(require("fs").readFileSync(0));console.log(r.data.length, !!r.meta.next_cursor)'
# expect: 20 true
curl -s $H -X POST localhost:8191/gms/v1/members/search -d '{"venue_id":"venue-dakar-01","all_venues":true}'
# expect: 400
curl -s $H localhost:8191/gms/v1/members/mbr-02/attendance | head -c 300; echo
curl -s $H -X POST localhost:8191/gms/v1/members/mbr-01/invitation-resend; echo
sleep 5; curl -s $H localhost:8191/gms/v1/members/mbr-01 | node -e 'console.log(JSON.parse(require("fs").readFileSync(0)).data.account.invitation_resend)'
# expect: state completed, result_code invitation_sent
curl -s $H -X POST localhost:8191/gms/v1/members/mbr-02/email-change -d '{"new_email":"x@y.sn"}'; echo
# expect: 400 (missing Idempotency-Key)
curl -s $H -H 'idempotency-key: k1' -X POST localhost:8191/gms/v1/members/mbr-02/email-change -d '{"new_email":"awa.diop@gmail.com"}'; echo
curl -s $H localhost:8191/gms/v1/tenant/settings; echo
```

Stop only the process you started (`kill %1`).

- [ ] **Step 11: Commit**

```bash
git add apps/owner/scripts/mock-server.mjs
git commit -m "chore(owner): mock search, attendance, account operations and tenant settings"
```

---

### Task 4: Directory on server search

**Files:**
- Create: `apps/owner/lib/member-search-query.ts`
- Test: `apps/owner/lib/member-search-query.test.ts`
- Modify: `apps/owner/app/(app)/members/page.tsx`
- Modify: `apps/owner/app/(app)/members/members-directory.tsx`
- Modify: `apps/owner/app/(app)/members/suspend-member-dialog.tsx`, `[id]/reactivate-member-dialog.tsx`, `add-member-dialog.tsx` (invalidate `['members','search']`)
- Modify: `apps/owner/messages/fr.json`, `en.json`

**Interfaces:**
- Produces:

```ts
export type DirectoryScope = 'venue' | 'all';
export type DirectoryStatus = 'all' | 'active' | 'expired' | 'suspended';
export const MEMBER_SEARCH_KEY = ['members', 'search'] as const;
export const SEARCH_PAGE_SIZE = 20;
export function buildSearchRequest(input: { scope: DirectoryScope; venueId: string | null; status: DirectoryStatus; q: string; cursor?: string | null }): MemberSearchRequest | null;
export function useDebouncedValue<T>(value: T, ms: number): T;
export function useMemberSearch(input: { scope: DirectoryScope; venueId: string | null; status: DirectoryStatus; q: string }): UseInfiniteQueryResult<InfiniteData<PaginatedApiResponseVecStaffMemberView>>;
```

- [ ] **Step 1: Failing tests** (`apps/owner/lib/member-search-query.test.ts`)

```ts
import { describe, expect, it } from 'vitest';

import { buildSearchRequest } from './member-search-query';

describe('buildSearchRequest', () => {
  const base = { scope: 'venue' as const, venueId: 'v1', status: 'all' as const, q: '' };

  it('scopes to the selected venue', () => {
    expect(buildSearchRequest(base)).toEqual({ venue_id: 'v1', status: 'all', limit: 20 });
  });
  it('asks for every venue', () => {
    expect(buildSearchRequest({ ...base, scope: 'all' })).toEqual({ all_venues: true, status: 'all', limit: 20 });
  });
  it('is null without a selected venue in venue scope', () => {
    expect(buildSearchRequest({ ...base, venueId: null })).toBeNull();
  });
  it('trims q and omits it when blank', () => {
    expect(buildSearchRequest({ ...base, q: '  kofi ' })).toMatchObject({ q: 'kofi' });
    expect(buildSearchRequest({ ...base, q: '   ' })).not.toHaveProperty('q');
  });
  it('caps q at 100 characters', () => {
    expect(buildSearchRequest({ ...base, q: 'a'.repeat(120) })?.q).toHaveLength(100);
  });
  it('passes the exact status and the cursor', () => {
    expect(buildSearchRequest({ ...base, status: 'suspended', cursor: 'c2' })).toMatchObject({
      status: 'suspended',
      cursor: 'c2',
    });
  });
});
```

- [ ] **Step 2: Run the tests; expect FAIL** (`pnpm --filter @iziwellpass/owner test -- member-search-query`)

- [ ] **Step 3: Implement `apps/owner/lib/member-search-query.ts`**

```ts
'use client';

import { useEffect, useState } from 'react';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';

import { searchMembers } from '@iziwellpass/api/generated';
import type { MemberSearchRequest } from '@iziwellpass/api/schemas';

export type DirectoryScope = 'venue' | 'all';
export type DirectoryStatus = 'all' | 'active' | 'expired' | 'suspended';

export const MEMBER_SEARCH_KEY = ['members', 'search'] as const;
export const SEARCH_PAGE_SIZE = 20;
const Q_MAX = 100;

export function buildSearchRequest(input: {
  scope: DirectoryScope;
  venueId: string | null;
  status: DirectoryStatus;
  q: string;
  cursor?: string | null;
}): MemberSearchRequest | null {
  if (input.scope === 'venue' && !input.venueId) return null;
  const q = input.q.trim().slice(0, Q_MAX);
  return {
    ...(input.scope === 'all' ? { all_venues: true } : { venue_id: input.venueId }),
    status: input.status,
    ...(q ? { q } : {}),
    ...(input.cursor ? { cursor: input.cursor } : {}),
    limit: SEARCH_PAGE_SIZE,
  };
}

export function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/** Personal data (q) travels only in the POST body, never in the URL or the key's URL part. */
export function useMemberSearch(input: {
  scope: DirectoryScope;
  venueId: string | null;
  status: DirectoryStatus;
  q: string;
}) {
  const q = input.q.trim().slice(0, Q_MAX);
  const enabled = buildSearchRequest(input) !== null;
  return useInfiniteQuery({
    queryKey: [...MEMBER_SEARCH_KEY, input.scope, input.venueId, input.status, q],
    enabled,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      searchMembers(buildSearchRequest({ ...input, cursor: pageParam })!, { signal }),
    getNextPageParam: (last) => last.meta?.next_cursor ?? null,
    placeholderData: keepPreviousData,
  });
}
```

(Check `PaginatedApiResponseVecStaffMemberView.meta.next_cursor`'s generated type; if it is `string | null | undefined`, `?? null` covers it. If lint forbids `!`, guard with `const body = buildSearchRequest(...); if (!body) throw new Error('disabled');`.)

- [ ] **Step 4: Run the tests; expect PASS**

- [ ] **Step 5: Rewrite the directory** (`members-directory.tsx`, `page.tsx`)

`page.tsx`:
- Drop `useAllMembers`. It renders `WorkingHeader` with:
  - `title={t('title')}`;
  - `subtitle` = the selected venue name (`useVenueContext().selectedVenue?.name`), or `t('scope.all')` when the directory's scope is `'all'`;
  - the add action.
- Lift `scope` state into `page.tsx` so the subtitle follows it, and pass `scope`/`onScopeChange` to `MembersDirectory`.
- The `cKk1G` first-member empty state is decided **inside** the directory: `status === 'all'`, empty `q`, first page empty.

`members-directory.tsx` (canvas `bRCjD`):
- **State:** `query` (raw input), `status: DirectoryStatus` (default `'all'`), and `scope` from props. `const debounced = useDebouncedValue(query, 250);`. `const search = useMemberSearch({ scope, venueId: selectedVenueId, status, q: debounced });`. `const members = search.data?.pages.flatMap((p) => p.data) ?? [];`.
- **Toolbar** (one flex row, wraps on phone):
  - The search `Input` with `placeholder={t('search')}` (now « Rechercher par nom, e-mail ou téléphone »), `maxLength={100}`, `aria-label`, a left `SearchIcon`.
  - On the right inside the field: a `LoaderCircleIcon` with `animate-spin` while `search.isFetching && !search.isFetchingNextPage`, and a clear `Button variant="ghost" size="icon"` with `XIcon` and `aria-label={t('clearSearch')}` when `query`.
  - The scope `Select` (230px, `« Cet établissement »` / `« Tous les établissements »`) when `(role === 'owner' || role === 'admin' || role === 'platform_admin') && venues.length >= 2`.
  - The `Tabs` with the 4 statuses.
- **Body, in order:**
  - `search.isLoading` (no data yet) → the existing skeleton (`RowsSkeleton rows={8}` + toolbar skeleton), `Cl2bM`;
  - `search.isError && !members.length` → the `Alert` with `t('loadError')` + `Réessayer` (`b9IMGN`);
  - `!members.length && status === 'all' && !debounced.trim()` → the first-member `Empty` (`cKk1G`), toolbar hidden (return early, before the toolbar), header action hidden (`page.tsx` gets `isEmptyDirectory` via an `onEmptyChange` callback prop, or the directory renders its own CTA and `page.tsx` hides the header action when told);
  - `!members.length && debounced.trim()` → `F7kU0F`: `EmptyTitle` `t('noResults.query', { q: debounced.trim() })` + `Button variant="link"` `t('clearSearch')` which clears `query`;
  - `!members.length` otherwise → `rgAty`: one line `t(\`emptyTab.${status}\`)`;
  - else the table / stacks (unchanged components).
- **Footer:**
  - `search.hasNextPage` → full-width-on-phone outline `Button` `t('showMore')`, disabled with a spinner while `search.isFetchingNextPage` (`ab1dg`).
  - Delete the `Pagination` import, the `paginate` usage, `PAGE_SIZE` and the footer count. If `lib/paginate.ts` has no other importer, leave it (not ours to delete).

Messages (`members`):
- `search`: « Rechercher par nom, e-mail ou téléphone »
- `searchPhone`: « Nom, e-mail ou téléphone » (placeholder below `md`, `f0WPx`)
- `clearSearch`: « Effacer la recherche »
- `showMore`: « Afficher plus »
- `scope.venue`: « Cet établissement »
- `scope.all`: « Tous les établissements »
- `noResults.query`: « Aucun membre ne correspond à « {q} ». »
- `emptyTab.active`: « Aucun membre actif. »
- `emptyTab.expired`: « Aucun membre expiré. »
- `emptyTab.suspended`: « Aucun membre suspendu. »
- `empty.title`: « Ajoutez votre premier membre »
- `empty.body`: « Ses abonnements, ses passages et son accès à l'app se gèrent ensuite depuis sa fiche. »
- Remove `filters.cancelled` and `footer` (and `subtitle` if nothing else reads it: `grep -rn "members.subtitle\|t('subtitle'" apps/owner`).

Mirror all of these in `en.json`.

- [ ] **Step 6: Invalidate search after writes**

In the suspend, reactivate and add dialogs' `onSuccess`, add `void queryClient.invalidateQueries({ queryKey: MEMBER_SEARCH_KEY });` beside the existing invalidations.

- [ ] **Step 7: Gates, visual check, commit**

- Run the gates.
- Run the owner app on the Task 3 mock with offline auth, on ports of your choice (see the Global Constraints). Compare at 1440×900 and 390×844 against `bRCjD`, `ZInet`, `F7kU0F`, `rgAty`, `Cl2bM`, `b9IMGN`, `ab1dg`, `f0WPx`.
- Typing « ndi » shows spinner, then results.

```bash
git add apps/owner/lib/member-search-query.ts apps/owner/lib/member-search-query.test.ts "apps/owner/app/(app)/members" apps/owner/messages
git commit -m "feat(owner): members directory on server search"
```

---

### Task 5: Add member follows the sign-in policy

**Files:**
- Create: `apps/owner/lib/create-member.ts`
- Test: `apps/owner/lib/create-member.test.ts`
- Modify: `apps/owner/app/(app)/members/add-member-dialog.tsx`
- Modify: `apps/owner/messages/fr.json`, `en.json`

**Interfaces:**
- Produces:

```ts
export function createAccessPayload(input: { canChooseScope: boolean; selectedVenueId: string | null; access_scope: 'chain_wide' | 'venue_scoped'; venue_ids: string[] }): { access_scope: 'chain_wide' | 'venue_scoped'; venue_ids?: string[] };
export function createdToastKey(effectiveMode: 'login' | 'roster' | undefined): 'addDialog.success' | 'addDialog.successLogin';
export const TENANT_SETTINGS_ROLES: readonly Role[]; // ['owner','admin','platform_admin']
```

- [ ] **Step 1: Failing tests** (`apps/owner/lib/create-member.test.ts`)

```ts
import { describe, expect, it } from 'vitest';

import { createAccessPayload, createdToastKey } from './create-member';

describe('createAccessPayload', () => {
  it('forces the selected venue for a receptionist', () => {
    expect(
      createAccessPayload({ canChooseScope: false, selectedVenueId: 'v1', access_scope: 'chain_wide', venue_ids: [] }),
    ).toEqual({ access_scope: 'venue_scoped', venue_ids: ['v1'] });
  });
  it('keeps an owner chain-wide choice without venue ids', () => {
    expect(
      createAccessPayload({ canChooseScope: true, selectedVenueId: 'v1', access_scope: 'chain_wide', venue_ids: ['v2'] }),
    ).toEqual({ access_scope: 'chain_wide' });
  });
  it('keeps an owner venue list', () => {
    expect(
      createAccessPayload({ canChooseScope: true, selectedVenueId: 'v1', access_scope: 'venue_scoped', venue_ids: ['v2'] }),
    ).toEqual({ access_scope: 'venue_scoped', venue_ids: ['v2'] });
  });
});

describe('createdToastKey', () => {
  it('announces the invitation for login members', () => {
    expect(createdToastKey('login')).toBe('addDialog.successLogin');
  });
  it('stays plain for roster or unknown', () => {
    expect(createdToastKey('roster')).toBe('addDialog.success');
    expect(createdToastKey(undefined)).toBe('addDialog.success');
  });
});
```

- [ ] **Step 2: Run; expect FAIL.**

- [ ] **Step 3: Implement `apps/owner/lib/create-member.ts`**

```ts
import type { Role } from '@iziwellpass/auth/claims';

export const TENANT_SETTINGS_ROLES: readonly Role[] = ['owner', 'admin', 'platform_admin'];

export function createAccessPayload(input: {
  canChooseScope: boolean;
  selectedVenueId: string | null;
  access_scope: 'chain_wide' | 'venue_scoped';
  venue_ids: string[];
}): { access_scope: 'chain_wide' | 'venue_scoped'; venue_ids?: string[] } {
  if (!input.canChooseScope) {
    return { access_scope: 'venue_scoped', venue_ids: input.selectedVenueId ? [input.selectedVenueId] : [] };
  }
  return input.access_scope === 'chain_wide'
    ? { access_scope: 'chain_wide' }
    : { access_scope: 'venue_scoped', venue_ids: input.venue_ids };
}

export function createdToastKey(
  effectiveMode: 'login' | 'roster' | undefined,
): 'addDialog.success' | 'addDialog.successLogin' {
  return effectiveMode === 'login' ? 'addDialog.successLogin' : 'addDialog.success';
}
```

- [ ] **Step 4: Run; expect PASS.**

- [ ] **Step 5: Wire the dialog** (canvas `MPUpF`, `iYDIz`, `eRgU6`, `C5aey`, `Xvbmu`)

In `AddMemberDialog`:
- **Role and policy:**
  - `const role = useRole(); const canChooseScope = role === 'owner' || role === 'admin' || role === 'platform_admin';`
  - `const settings = useGetTenantSettings({ query: { select: unwrap, enabled: canChooseScope && open } });`
  - `const loginMode = settings.data?.member_login.effective_mode;` (undefined for receptionists or while loading).
- **Hint:** under `DialogDescription`, when `loginMode` is defined, a muted 14px row with a 16px icon:
  - `SmartphoneIcon` + `t('addDialog.hintLogin')` for `login`;
  - `FileTextIcon` + `t('addDialog.hintRoster')` for `roster`.
- **Schema:** make the zod schema depend on `loginMode`. In login mode the e-mail is required: `z.email(t('validation.emailInvalid'))` with an empty-string refinement giving `t('addDialog.emailRequired')`. Otherwise keep the current optional rule. Include `loginMode` in the `useMemo` deps.
- **E-mail label and helper:**
  - login → label `t('addDialog.email')` + `FormDescription` `t('addDialog.emailHelpLogin')`;
  - roster → label `t('addDialog.emailOptional')`;
  - receptionist → label `t('addDialog.email')`, no helper.
- **Access field:**
  - `canChooseScope` → the existing select + checklist.
  - Otherwise, in place of both, a read-only line styled like the read-only input (`bg-side`, muted text, `LockIcon` right, 44px+ tall, `aria-readonly`) showing `selectedVenue?.name` under the label `t('addDialog.accessScope')`.
  - Set the schema's `venue_ids` rule to skip validation when `!canChooseScope`.
- **Submit:** build the access part with `createAccessPayload({ canChooseScope, selectedVenueId, access_scope: values.access_scope, venue_ids: values.venue_ids })` and spread it into `data`.
- **`onSuccess(response)`:**
  - `toast.success(t(createdToastKey(response.data.effective_mode)))`;
  - invalidate `getListMembersQueryKey()` and `MEMBER_SEARCH_KEY`.
- **`onError(err)`, in order:**
  1. `classifyMemberError(err).kind === 'duplicate'` → `form.setError('email', { type: 'server', message: t('addDialog.emailTaken') })`.
  2. Else `applyFieldErrors(form, overrideFieldMessages(err, { email: t('addDialog.emailRequired') }))`.
  3. Else the existing toast.

Messages (`members.addDialog`):
- `hintLogin`: « Le membre recevra une invitation par e-mail pour utiliser l'app. »
- `hintRoster`: « Fiche sans accès à l'app. L'équipe gère tout depuis la console. »
- `emailHelpLogin`: « Obligatoire : il sert d'identifiant dans l'app. »
- `emailOptional`: « E-mail (facultatif) »
- `emailRequired`: « L'e-mail est obligatoire : ce club donne accès à l'app à ses membres. »
- `emailTaken`: « Un membre utilise déjà cette adresse. »
- `successLogin`: « Membre ajouté. Envoi de l'invitation… »

`success` stays « Membre ajouté ». Mirror in `en.json`.

- [ ] **Step 6: Gates, visual check, commit**

Browser checks on the mock:
- owner (`MOCK_PLAN=pro`) sees the login hint;
- restart the mock with `MOCK_LOGIN_MODE=roster` → the roster hint and « E-mail (facultatif) »;
- submitting in login mode without an e-mail → the required message;
- an existing member's e-mail → « Un membre utilise déjà cette adresse. » (the mock's create answers 409 `CONFLICT` for a duplicate e-mail; if it does not, add that check to `registerMemberHandler` in this task);
- a receptionist session (offline auth password `receptionist`) → the locked venue line, no hint;
- phone at 390×844 (`Xvbmu`).

```bash
git add apps/owner/lib/create-member.ts apps/owner/lib/create-member.test.ts "apps/owner/app/(app)/members/add-member-dialog.tsx" apps/owner/messages apps/owner/scripts/mock-server.mjs
git commit -m "feat(owner): add member follows the tenant sign-in policy"
```

---

### Task 6: Member page, « Accès à l'app » section, header, form, Zone sensible

**Files:**
- Create: `apps/owner/lib/use-account-tracking.ts`
- Create: `apps/owner/app/(app)/members/[id]/account-section.tsx`
- Modify: `apps/owner/app/(app)/members/[id]/page.tsx`
- Modify: `apps/owner/app/(app)/members/[id]/member-header.tsx`
- Modify: `apps/owner/app/(app)/members/[id]/edit-member-form.tsx`
- Modify: `apps/owner/app/(app)/members/[id]/danger-zone.tsx`
- Modify: `apps/owner/messages/fr.json`, `en.json`

**Interfaces:**
- Consumes: `describeAccount`, `formatOpMoment`, `hasRunningOperation`, `runningOperationIds`, `POLL_INTERVAL_MS`, `POLL_WINDOW_MS` (Task 2).
- Produces:

```ts
// lib/use-account-tracking.ts
export interface AccountTracking { watched: ReadonlySet<string>; watch(id: string): void; stale: boolean; refresh(): void }
export function useAccountTracking(account: MemberAccountSummary | undefined, refetch: () => unknown): AccountTracking;

// account-section.tsx
export function AccountSection(props: {
  member: StaffMemberProfile; view: AccountView; tracking: AccountTracking;
  onAction(action: AccountAction): void;
}): JSX.Element;
export function AccountBadge(props: { badge: AccountBadge }): JSX.Element; // header reuse
```

The dialogs arrive in Task 7. In this task `onAction` is a no-op stub owned by `page.tsx` (`const [dialog, setDialog] = useState<AccountAction | 'signOut' | null>(null)`), and the buttons render and set that state.

- [ ] **Step 1: `lib/use-account-tracking.ts`**

```ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { MemberAccountSummary } from '@iziwellpass/api/schemas';

import {
  POLL_INTERVAL_MS,
  POLL_WINDOW_MS,
  hasRunningOperation,
  runningOperationIds,
} from './member-account';

export interface AccountTracking {
  watched: ReadonlySet<string>;
  watch: (id: string) => void;
  stale: boolean;
  refresh: () => void;
}

/**
 * Spec MM3: follow identity operations by refetching the member. Polls every
 * 2 s while one runs, for at most 30 s per window; `refresh` refetches and
 * opens a new window. Operations already running when first seen are watched,
 * so their result shows even if another tab started them.
 */
export function useAccountTracking(
  account: MemberAccountSummary | undefined,
  refetch: () => unknown,
): AccountTracking {
  const [watched, setWatched] = useState<ReadonlySet<string>>(() => new Set());
  const [stale, setStale] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;
  const running = account ? hasRunningOperation(account) : false;
  const runningKey = account ? runningOperationIds(account).join(',') : '';

  useEffect(() => {
    if (!runningKey) return;
    setWatched((prev) => {
      const ids = runningKey.split(',');
      if (ids.every((id) => prev.has(id))) return prev;
      return new Set([...prev, ...ids]);
    });
  }, [runningKey]);

  useEffect(() => {
    setStale(false);
    if (!running) return;
    const poll = setInterval(() => void refetchRef.current(), POLL_INTERVAL_MS);
    const window = setTimeout(() => {
      clearInterval(poll);
      setStale(true);
    }, POLL_WINDOW_MS);
    return () => {
      clearInterval(poll);
      clearTimeout(window);
    };
  }, [running, epoch]);

  const watch = useCallback((id: string) => {
    setWatched((prev) => (prev.has(id) ? prev : new Set([...prev, id])));
  }, []);
  const refresh = useCallback(() => {
    void refetchRef.current();
    setEpoch((e) => e + 1);
  }, []);

  return { watched, watch, stale: running && stale, refresh };
}
```

- [ ] **Step 2: `AccountSection`** (canvas `caWdo`, `B50o8G`, `bvlFy`, `x7QjF`, `pb6r0`, `iWohO`; patterns in INVENTORY « Shared patterns »)

- **`AccountBadge`:** maps the tone to the `Badge` variant:

  | Tone | `Badge` variant |
  | --- | --- |
  | success | `success` |
  | info | `info` |
  | neutral | `default` |
  | outline | `outline` |
  | danger | `destructive` |
  | warning | `warning` |

  `spinner` adds a 14px `LoaderCircleIcon animate-spin` after the badge, with `aria-hidden`.
- **Layout:** `<section className="flex flex-col gap-4">` with `SectionHeading title={t('account.title')} description={t('account.subtitle')}`, then a key/value list. Rows are separated by `border-t border-border` after the first, `py-3`; key 15px `text-muted-foreground`, value 15/500 or a badge:
  - **« Accès »:** the badge on the right; under the row, each line of `view.lines` at 13px (`text-muted-foreground`, or `text-destructive-foreground` for `danger`).
  - **« Adresse de connexion »:** only when `member.account.mode === 'login'`. Shows `member.email`; when `view.emailBadge`, the badge under the address (right-aligned) and its `lineKeys` as 13px muted lines under the row.
  - **« Dernière action »:** when `view.lastAction`, `t(view.lastAction.key, formatOpMoment(view.lastAction.at, locale))` in `font-numeric`-friendly text.
- **Action pills:** `view.actions` as `Button variant="outline"` in a wrapping row:
  - `resend` → `t('account.actions.resend')`;
  - `relaunch` → `t('account.actions.relaunch')`;
  - `changeEmail` → `t('account.actions.changeEmail')`.

  A button whose action equals `view.status?.runningAction` gets `disabled` and `className="opacity-45"`.
- **Receptionist line:** when `!view.canManage && member.account.mode === 'login'`, a 14px muted line with `ShieldIcon`: `t('account.receptionistNote')`.
- **Status row:** when `view.status`, `<p role="status" aria-live="polite">` with a 16px icon + 14px text:

  | Kind | Icon | Text |
  | --- | --- | --- |
  | progress | `LoaderCircleIcon animate-spin`, `text-muted-strong` | regular weight |
  | waiting | `MailIcon`, `text-muted-strong` | regular weight |
  | done | `CircleCheckIcon`, success text | 500 weight |
  | failed | `CircleAlertIcon`, destructive text | 500 weight |

  Text is `t(view.status.key, { time: view.status.at ? formatOpMoment(view.status.at, locale).time : '' })`. When `view.status.key === 'account.status.stillRunning'`, add under it the text button `t('account.status.refresh')` (14/500 ink, underlined) calling `tracking.refresh()`.
- **Roster** (`pb6r0`): only the « Accès » row renders (no address row, no last action, no actions); that falls out of the mapper and the `mode` check.

- [ ] **Step 3: Page wiring** (`page.tsx`)

```tsx
const role = useRole();
const memberQuery = useGetMember(memberId, { query: { select: unwrap } });
const member = memberQuery.data;
const tracking = useAccountTracking(member?.account, memberQuery.refetch);
const view = member
  ? describeAccount(member.account, { role, watched: tracking.watched, stale: tracking.stale })
  : null;
const [dialog, setDialog] = useState<AccountAction | 'signOut' | null>(null);
```

(Hooks must run before the early returns: move the loading/error branches below these lines.)

Right column order: `EditMemberForm`, `AccountSection` (when `canEdit`, i.e. owner/admin/receptionist, which is every role that reaches this page), `DangerZone`. Pass `view` to `MemberHeader` and `DangerZone`, and `onChangeEmail={() => setDialog('changeEmail')}` to `EditMemberForm`.

- [ ] **Step 4: Header** (`member-header.tsx`)

- Add the prop `account: AccountView`. Render `<AccountBadge badge={account.badge} />` after the access badge, before « Gérer l'accès ».
- Under the top-right e-mail, when `member.account.email === 'change_pending'`, a `text-xs font-medium text-muted-foreground` line: `t('account.header.changePending')` (« Changement d'adresse en attente »).

- [ ] **Step 5: Edit form** (`edit-member-form.tsx`, canvas `caWdo` / `bvlFy`)

- **Props:** add `onChangeEmail?: () => void` and `canChangeEmail: boolean` (owner/admin).
- **When `emailLocked`:**
  - Render the e-mail as the read-only field: an `Input` with `readOnly` (not `disabled`, so it stays focusable and legible), `className="bg-side pr-11 text-muted-strong"`, and an absolutely positioned 16px `LockIcon` at the right inside a `relative` wrapper.
  - Replace the description with `t('detail.edit.emailLockedHint')`, whose value becomes « Adresse de connexion : elle se change par une procédure sécurisée. » (update both JSON files).
  - Under it, when `canChangeEmail && onChangeEmail`, a `button type="button"` styled 13/500 ink underlined: `t('account.header.changeLink')` (« Changer l'adresse de connexion »).
- **When `member.account.invitation === 'failed'`:** the field stays editable with the description `t('detail.edit.emailFailedHint')` (« Corrigez l'adresse si besoin, enregistrez, puis relancez la création de l'accès. »).

- [ ] **Step 6: Zone sensible** (`danger-zone.tsx`, `WeVjb` bottom)

- Props become `{ member: StaffMemberProfile; view: AccountView; onSignOut: () => void }`.
- **Layout:** `flex flex-col items-start gap-2.5` (stacked).
- **Lifecycle button:**
  - `active` → `Button variant="destructive"` « Suspendre le membre »;
  - `suspended` → `Button variant="outline"` « Réactiver »;
  - `expired` / `cancelled` → no lifecycle button.
- **Sign-out:** when `view.canSignOut`, `Button variant="outline" className="text-destructive-foreground"` with `LogOutIcon` and `t('account.signOut.open')` (« Déconnecter de tous les appareils »), calling `onSignOut`. Disabled at 45 % while `view.status?.runningAction === 'signOut'`.
- If neither button renders, the section still renders its heading? **No:** return `null` when there is nothing to show.

Messages (`members.account`):
- `header.changePending`: « Changement d'adresse en attente »
- `header.changeLink`: « Changer l'adresse de connexion »
- `signOut.open`: « Déconnecter de tous les appareils »

`detail.edit.emailLockedHint` gets the new text above; add `detail.edit.emailFailedHint`. Mirror all in `en.json`.

- [ ] **Step 7: Gates, visual check, commit**

On the mock, open each member and compare with its frame:

| Member | Frame |
| --- | --- |
| `mbr-02` | `caWdo` |
| `mbr-01` | `B50o8G` (after clicking « Renvoyer l'invitation » in Task 7; here, check the static `sent` state) |
| `mbr-12` | `bvlFy` |
| `mbr-10` | `x7QjF` |
| `mbr-03` | `pb6r0` |
| a receptionist session on `mbr-01` | `iWohO` |
| phone 390×844 on `mbr-02` | `TOqY8` (section order) |

Check that there is no « Statut du compte » field.

```bash
git add apps/owner/lib/use-account-tracking.ts "apps/owner/app/(app)/members/[id]" apps/owner/messages
git commit -m "feat(owner): app access section, account badge and zone sensible on the member page"
```

---

### Task 7: Account dialogs

**Files:**
- Create: `apps/owner/lib/idempotency.ts`
- Test: `apps/owner/lib/idempotency.test.ts`
- Create: `apps/owner/app/(app)/members/[id]/resend-invitation-dialog.tsx`
- Create: `apps/owner/app/(app)/members/[id]/change-email-dialog.tsx`
- Create: `apps/owner/app/(app)/members/[id]/sign-out-everywhere-dialog.tsx`
- Modify: `apps/owner/app/(app)/members/[id]/page.tsx`
- Modify: `apps/owner/messages/fr.json`, `en.json`

**Interfaces:**
- Consumes: `classifyMemberError` (Task 1), `AccountTracking.watch` (Task 6), `isForbidden` from `@/lib/plan-errors`.
- Produces:

```ts
// lib/idempotency.ts
export interface KeyState { key: string; email: string }
export function idempotencyKeyFor(prev: KeyState | null, email: string, newKey: () => string): KeyState;
export function normalizeEmail(value: string): string; // trim + lower-case
```

Dialog props (all three):
`{ member: StaffMemberProfile; open: boolean; onOpenChange(open: boolean): void; onStarted(operationId: string): void }`.
`ResendInvitationDialog` also takes `mode: 'resend' | 'relaunch'`.

- [ ] **Step 1: Failing tests** (`apps/owner/lib/idempotency.test.ts`)

```ts
import { describe, expect, it } from 'vitest';

import { idempotencyKeyFor, normalizeEmail } from './idempotency';

describe('idempotencyKeyFor', () => {
  let n = 0;
  const gen = () => `k${++n}`;

  it('creates a key the first time', () => {
    expect(idempotencyKeyFor(null, 'a@x.sn', gen)).toEqual({ key: 'k1', email: 'a@x.sn' });
  });
  it('reuses the key for the same address, ignoring case and spaces', () => {
    const first = { key: 'k7', email: 'a@x.sn' };
    expect(idempotencyKeyFor(first, ' A@X.sn ', gen)).toBe(first);
  });
  it('makes a new key when the address changes', () => {
    const first = { key: 'k7', email: 'a@x.sn' };
    expect(idempotencyKeyFor(first, 'b@x.sn', gen).key).not.toBe('k7');
  });
});

describe('normalizeEmail', () => {
  it('trims and lower-cases', () => {
    expect(normalizeEmail('  Awa.Diop@Gmail.com ')).toBe('awa.diop@gmail.com');
  });
});
```

- [ ] **Step 2: Run; expect FAIL.**

- [ ] **Step 3: Implement `apps/owner/lib/idempotency.ts`**

```ts
export interface KeyState {
  key: string;
  email: string;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** One Idempotency-Key per intended address: reuse on retry, renew when the address changes. */
export function idempotencyKeyFor(
  prev: KeyState | null,
  email: string,
  newKey: () => string,
): KeyState {
  const normalized = normalizeEmail(email);
  if (prev && prev.email === normalized) return prev;
  return { key: newKey(), email: normalized };
}
```

- [ ] **Step 4: Run; expect PASS.**

- [ ] **Step 5: `ResendInvitationDialog`** (`f4Mtn`, `w6dqTN`, `L8mxU`)

- **Copy:**
  - `mode === 'resend'`: title `t('account.resendDialog.title')` « Renvoyer l'invitation ? », text `t('account.resendDialog.body', { name: member.first_name })`, confirm `t('account.resendDialog.confirm')` « Renvoyer ».
  - `mode === 'relaunch'`: `t('account.relaunchDialog.title')` « Relancer la création de l'accès ? », `t('account.relaunchDialog.body', { email: member.email ?? '' })`, confirm « Relancer ».
- **State:** `error: string | null` and `errorAction?: 'settings'`, both reset in an effect when `open` becomes true (Review Focus 1).
- **Mutation:** `useMutation({ mutationFn: () => resendInvitation(member.id) })`.
  - **`onSuccess(res)`:** `onStarted(res.data.id)`; invalidate `getGetMemberQueryKey(member.id)`; close.
  - **`onError(err)`:** use `classifyMemberError(err).kind`:

    | Case | Result |
    | --- | --- |
    | `loginNotAvailable` | `error = t('account.refusal.loginNotAvailable')`, `errorAction = 'settings'` |
    | `duplicate` | `t('account.result.emailConflict')` |
    | `accountAlreadyActive` | `t('account.result.alreadyActive')` + invalidate the member |
    | `identityShared` | `t('account.result.identityShared')` |
    | `isForbidden(err)` | `t('account.refusal.forbidden')` |
    | else | `t('account.result.resendFailed')` |

- **Error display:** `Alert variant="destructive"` above the footer. With `errorAction === 'settings'`, add `Link href="/settings"` `t('account.refusal.openSettings')` « Ouvrir les réglages ». The confirm is disabled while `error` is set or the mutation is pending.
- **Footer:** ghost « Annuler » + primary confirm.

- [ ] **Step 6: `ChangeEmailDialog`** (`tbCt2`, `OXBVd`)

- **State:** `value`, `fieldError: string | null`, and `keyRef = useRef<KeyState | null>(null)`. All reset when the dialog opens. The key's generator is `() => crypto.randomUUID()`.
- **Body:**
  - A read-only row `t('account.emailDialog.current')` « Adresse actuelle » / `member.email`.
  - An `Input type="email"` labelled `t('account.emailDialog.new')` « Nouvelle adresse ». Errors show under it (`aria-invalid`, `aria-describedby`, and the danger stroke via `aria-invalid:border-destructive`, the existing input style).
  - The two explanation paragraphs `t('account.emailDialog.explain')` and `t('account.emailDialog.explainInvited')`, verbatim from `tbCt2`.
- **Submit:**
  1. `const next = value.trim()`.
  2. Checks, in order:
     - `normalizeEmail(next) === normalizeEmail(member.email ?? '')` → `fieldError = t('account.emailDialog.same')`;
     - `!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(next)` → `t('account.emailDialog.invalid')`.
  3. Otherwise `keyRef.current = idempotencyKeyFor(keyRef.current, next, () => crypto.randomUUID())`, then `changeLoginEmail(member.id, { new_email: next }, { headers: { 'Idempotency-Key': keyRef.current.key } })`.
- **`onSuccess(res)`:**
  - `toast.success(t('account.emailDialog.sent', { email: next }))` (the only place the address is ever shown);
  - `onStarted(res.data.id)`;
  - invalidate the member;
  - close;
  - clear `value`.
- **`onError(err)` → `fieldError`:**

  | Case | Message |
  | --- | --- |
  | `validation` | `t('account.emailDialog.invalid')` |
  | `duplicate` | `t('account.emailDialog.taken')` |
  | `emailChangeInProgress` | `t('account.emailDialog.inProgress')` |
  | `identityShared` | `t('account.emailDialog.shared')` |
  | `loginNotProvisioned` | `t('account.emailDialog.notProvisioned')` |
  | `idempotencyInProgress` | `t('account.emailDialog.processing')` |
  | `isForbidden` | `t('account.refusal.forbidden')` |
  | else | `t('account.result.emailFailed')` |

- **Footer:** ghost « Annuler » + primary « Envoyer le code » (`t('account.emailDialog.confirm')`), disabled while pending or while `value.trim()` is empty.

- [ ] **Step 7: `SignOutEverywhereDialog`** (`eLtfl`, `s3tkfq`)

- **Copy:** title `t('account.signOut.title', { name: member.first_name })` « Déconnecter {name} de tous ses appareils ? »; body `t('account.signOut.body')`, the **neutral** text from Global Constraints.
- **Mutation:** `revokeSessions(member.id)`.
  - **Success:** `onStarted(id)`, invalidate, close.
  - **Errors (inline `Alert`):**

    | Case | Message |
    | --- | --- |
    | `identityShared` | `t('account.result.signOutShared')` |
    | `loginNotProvisioned` | `t('account.result.signOutNotProvisioned')` |
    | `isForbidden` | forbidden |
    | else | `t('account.result.signOutFailed')` |

  - Error state is reset on open.
- **Footer:** ghost « Annuler » + `variant="destructive"` « Déconnecter » (`t('account.signOut.confirm')`). The phone uses the existing centred dialog; its footer already stacks full-width buttons (spec §3 ruling).

- [ ] **Step 8: Wire in `page.tsx`**

Replace the Task 6 stub:

```tsx
{member ? (
  <>
    <ResendInvitationDialog
      member={member}
      mode={dialog === 'relaunch' ? 'relaunch' : 'resend'}
      open={dialog === 'resend' || dialog === 'relaunch'}
      onOpenChange={(o) => !o && setDialog(null)}
      onStarted={tracking.watch}
    />
    <ChangeEmailDialog member={member} open={dialog === 'changeEmail'} onOpenChange={(o) => !o && setDialog(null)} onStarted={tracking.watch} />
    <SignOutEverywhereDialog member={member} open={dialog === 'signOut'} onOpenChange={(o) => !o && setDialog(null)} onStarted={tracking.watch} />
  </>
) : null}
```

Messages (`members.account`, verbatim from INVENTORY, with the neutral sign-out body):
- **`resendDialog`:**
  - `title`: « Renvoyer l'invitation ? »
  - `body`: « {name} recevra un nouvel e-mail avec un nouveau mot de passe temporaire. Le précédent ne fonctionnera plus. »
  - `confirm`: « Renvoyer »
  - `cancel`: « Annuler »
- **`relaunchDialog`:**
  - `title`: « Relancer la création de l'accès ? »
  - `body`: « Une invitation sera envoyée à {email}. »
  - `confirm`: « Relancer »
- **`refusal`:**
  - `loginNotAvailable`: « Votre club ne donne plus accès à l'app aux nouveaux membres. Modifiez ce réglage dans Réglages. »
  - `openSettings`: « Ouvrir les réglages »
  - `forbidden`: « Accès refusé »
- **`emailDialog`:**
  - `title`: « Changer l'adresse de connexion »
  - `current`: « Adresse actuelle »
  - `new`: « Nouvelle adresse »
  - `explain`: « Le membre recevra un code à la nouvelle adresse et devra le saisir dans l'app. D'ici là, il continue de se connecter avec l'adresse actuelle. Sans confirmation sous 24 h, le changement est annulé. »
  - `explainInvited`: « S'il ne s'est jamais connecté, l'adresse est remplacée tout de suite et une nouvelle invitation y est envoyée. »
  - `confirm`: « Envoyer le code »
  - `sent`: « Code envoyé à {email} »
  - `same`: « C'est déjà l'adresse actuelle. »
  - `invalid`: « Adresse e-mail invalide. »
  - `taken`: « Cette adresse est déjà utilisée. »
  - `inProgress`: « Un changement vers une autre adresse est déjà en cours. Attendez qu'il aboutisse ou expire (24 h). »
  - `shared`: « Ce compte sert aussi ailleurs sur IziWellPass : contactez le support. »
  - `notProvisioned`: « L'accès du membre n'est pas encore créé. »
  - `processing`: « Demande en cours de traitement. Réessayez dans un instant. »
- **`signOut`:**
  - `title`: « Déconnecter {name} de tous ses appareils ? »
  - `body`: « Une nouvelle connexion avec le mot de passe sera nécessaire. L'effet peut prendre jusqu'à 10 minutes. »
  - `confirm`: « Déconnecter »

Mirror in `en.json`.

- [ ] **Step 9: Gates, browser check, commit**

On the mock:

| Member | Action | Expected |
| --- | --- | --- |
| `mbr-01` | « Renvoyer l'invitation » | Progress row, button at 45 %, then « Invitation envoyée à HH:mm » (`B50o8G`) |
| `mbr-13` | Resend | After 30 s: « Toujours en cours… » + « Actualiser » |
| `mbr-14` | Resend | Shared refusal in the dialog |
| `mbr-02` | Change address to `awa.diop@gmail.com` | Toast, then « Changement en attente » + waiting row (`x7QjF`) |
| `mbr-02` | Change address to its own address | « C'est déjà l'adresse actuelle. » |
| `mbr-10` | Change address to another address | `EMAIL_CHANGE_IN_PROGRESS` (`OXBVd`) |
| any | Change address to `pris@x.sn` | Ends « Cette adresse n'est pas disponible. » |
| `mbr-02` | Sign out | Progress, then « Membre déconnecté de tous ses appareils à HH:mm. » |
| `mbr-12` | Relaunch without fixing the e-mail | Ends with « L'adresse e-mail est invalide. » |
| `mbr-12` | Fix the e-mail, save, relaunch | Ends « Invitation envoyée à HH:mm » |

Also restart the mock with `MOCK_PLAN=free`, then relaunch on `mbr-12`: the `LOGIN_NOT_AVAILABLE` alert with the settings link (`L8mxU`).

```bash
git add apps/owner/lib/idempotency.ts apps/owner/lib/idempotency.test.ts "apps/owner/app/(app)/members/[id]" apps/owner/messages
git commit -m "feat(owner): resend, relaunch, secure e-mail change and sign-out dialogs"
```

---

### Task 8: « Présences »

**Files:**
- Create: `apps/owner/lib/attendance.ts`
- Test: `apps/owner/lib/attendance.test.ts`
- Create: `apps/owner/app/(app)/members/[id]/attendance-section.tsx`
- Modify: `apps/owner/app/(app)/members/[id]/page.tsx`
- Modify: `apps/owner/messages/fr.json`, `en.json`

**Interfaces:**
- Produces:

```ts
export type AttendancePeriod = 7 | 30 | 90;
export const ATTENDANCE_PAGE_SIZE = 20;
export function attendanceRange(days: AttendancePeriod, now: Date): { from: string; to: string };
export type LastVisit = { kind: 'none' } | { kind: 'today' | 'yesterday'; time: string } | { kind: 'date'; date: string };
export function lastVisit(lastVisitAt: string | null | undefined, locale: string, now: Date): LastVisit;
export function visitMoment(iso: string, locale: string): { day: string; time: string };
export function methodBadge(method: string): { labelKey: 'attendance.method.qr' | 'attendance.method.manual' | 'attendance.method.wallet'; variant: 'info' | 'default' | 'outline' };
export function kindLabelKey(kind: string): 'attendance.kind.booked' | 'attendance.kind.walkIn';
```

- [ ] **Step 1: Failing tests** (`apps/owner/lib/attendance.test.ts`)

```ts
import { describe, expect, it } from 'vitest';

import { attendanceRange, kindLabelKey, lastVisit, methodBadge, visitMoment } from './attendance';

const now = new Date('2026-09-28T12:34:56');

describe('attendanceRange', () => {
  it('ends at the current minute and spans N days', () => {
    const r = attendanceRange(30, now);
    expect(new Date(r.to).getSeconds()).toBe(0);
    expect(Date.parse(r.to) - Date.parse(r.from)).toBe(30 * 86_400_000);
  });
});

describe('lastVisit', () => {
  it('is none without a visit', () => {
    expect(lastVisit(null, 'fr', now)).toEqual({ kind: 'none' });
  });
  it('says today', () => {
    expect(lastVisit('2026-09-28T07:12:00', 'fr', now)).toEqual({ kind: 'today', time: '07:12' });
  });
  it('says yesterday', () => {
    expect(lastVisit('2026-09-27T18:04:00', 'fr', now)).toEqual({ kind: 'yesterday', time: '18:04' });
  });
  it('gives a full date otherwise', () => {
    expect(lastVisit('2026-06-12T10:00:00', 'fr', now)).toEqual({ kind: 'date', date: '12 juin 2026' });
  });
});

describe('visitMoment', () => {
  it('formats weekday, day, short month and time', () => {
    expect(visitMoment('2026-09-27T18:04:00', 'fr')).toEqual({ day: 'dim. 27 sept.', time: '18:04' });
  });
});

describe('badges and kinds', () => {
  it('maps methods', () => {
    expect(methodBadge('qr')).toEqual({ labelKey: 'attendance.method.qr', variant: 'info' });
    expect(methodBadge('manual')).toEqual({ labelKey: 'attendance.method.manual', variant: 'default' });
    expect(methodBadge('wallet')).toEqual({ labelKey: 'attendance.method.wallet', variant: 'outline' });
  });
  it('maps kinds', () => {
    expect(kindLabelKey('booked')).toBe('attendance.kind.booked');
    expect(kindLabelKey('walk_in')).toBe('attendance.kind.walkIn');
  });
});
```

If this Node's ICU renders `visitMoment` differently (e.g. `dim. 27 sept.` vs `dim. 27 sept`), fix the **expectation** to Intl's output.

- [ ] **Step 2: Run; expect FAIL.**

- [ ] **Step 3: Implement `apps/owner/lib/attendance.ts`**

```ts
export type AttendancePeriod = 7 | 30 | 90;
export const ATTENDANCE_PERIODS: readonly AttendancePeriod[] = [7, 30, 90];
export const ATTENDANCE_PAGE_SIZE = 20;

const DAY_MS = 86_400_000;

export function attendanceRange(days: AttendancePeriod, now: Date): { from: string; to: string } {
  const to = new Date(now);
  to.setSeconds(0, 0);
  return { from: new Date(to.getTime() - days * DAY_MS).toISOString(), to: to.toISOString() };
}

function time(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export type LastVisit =
  | { kind: 'none' }
  | { kind: 'today' | 'yesterday'; time: string }
  | { kind: 'date'; date: string };

export function lastVisit(lastVisitAt: string | null | undefined, locale: string, now: Date): LastVisit {
  if (!lastVisitAt) return { kind: 'none' };
  const d = new Date(lastVisitAt);
  if (dayKey(d) === dayKey(now)) return { kind: 'today', time: time(d, locale) };
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dayKey(d) === dayKey(yesterday)) return { kind: 'yesterday', time: time(d, locale) };
  return {
    kind: 'date',
    date: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(d),
  };
}

export function visitMoment(iso: string, locale: string): { day: string; time: string } {
  const d = new Date(iso);
  return {
    day: new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(d),
    time: time(d, locale),
  };
}

export function methodBadge(method: string): {
  labelKey: 'attendance.method.qr' | 'attendance.method.manual' | 'attendance.method.wallet';
  variant: 'info' | 'default' | 'outline';
} {
  if (method === 'wallet') return { labelKey: 'attendance.method.wallet', variant: 'outline' };
  if (method === 'manual') return { labelKey: 'attendance.method.manual', variant: 'default' };
  return { labelKey: 'attendance.method.qr', variant: 'info' };
}

export function kindLabelKey(kind: string): 'attendance.kind.booked' | 'attendance.kind.walkIn' {
  return kind === 'booked' ? 'attendance.kind.booked' : 'attendance.kind.walkIn';
}
```

- [ ] **Step 4: Run; expect PASS.**

- [ ] **Step 5: `AttendanceSection`** (`caWdo` left column, `Z9CwGl`, `TOqY8`)

- **State:** `period: AttendancePeriod` (default 30), `venueId: string | 'all'` (default `'all'`), and `range` recomputed with `useMemo(() => attendanceRange(period, new Date()), [period, venueId])`.
- **Query:**

```ts
const query = useInfiniteQuery({
  queryKey: ['members', memberId, 'attendance', range.from, range.to, venueId],
  initialPageParam: null as string | null,
  queryFn: ({ pageParam, signal }) =>
    memberAttendance(
      memberId,
      pageParam
        ? { cursor: pageParam, limit: ATTENDANCE_PAGE_SIZE }
        : { from: range.from, to: range.to, limit: ATTENDANCE_PAGE_SIZE, ...(venueId !== 'all' ? { venue_id: venueId } : {}) },
      { signal },
    ),
  getNextPageParam: (last) => last.data.next_cursor ?? null,
});
const first = query.data?.pages[0]?.data;
const items = query.data?.pages.flatMap((p) => p.data.items) ?? [];
```

- **Venue list:** `const { venues } = useVenueContext(); const multi = venues.length >= 2;`
- **Header:** `SectionHeading title={t('attendance.title')}`. The summary line (muted 14px, `font-numeric` for numbers) joins with « · »:
  - `t('attendance.count', { count: first.total_visits, days: period })`;
  - the last-visit part: today → `t('attendance.lastToday', { time })`, yesterday → `lastYesterday`, date → `t('attendance.lastDate', { date })`, none → nothing.
- **Controls row:** `Tabs` pills 7/30/90 (`t('attendance.period', { days })`) and, when `multi`, a `Select` (`t('attendance.allVenues')` + each venue name).
- **Rows** (hairline-separated, `py-3`):
  - left column 140px: `day` over `time` (`font-numeric text-muted-foreground`);
  - middle: `multi ? item.venue_name : null` over `t(kindLabelKey(item.kind))` muted;
  - right: `<Badge variant={badge.variant}>{t(badge.labelKey)}</Badge>`.
- **Below:** `hasNextPage` → full-width outline « Afficher plus » (`t('showMore')`), spinner while fetching the next page.
- **States** (`Z9CwGl`):

  | State | What to show |
  | --- | --- |
  | Loading | skeleton summary + 5 skeleton rows |
  | Error | `t('attendance.error')` + `Réessayer` |
  | `total_visits === 0` and a last visit | `t('attendance.emptyPeriod', { days: period })` + `t('attendance.lastDateSentence', { date })` |
  | `total_visits === 0` and no last visit | `t('attendance.never')` |

- **Phone:** the controls row scrolls horizontally (`overflow-x-auto`, `flex-nowrap`); rows stack day/time over venue/kind + badge (`flex-col` below `sm`).

Mount it in `page.tsx`, left column, after `SubscriptionsSection`.

Messages (`members.attendance`):
- `title`: « Présences »
- `count`: « {count, plural, =0 {0 passage} one {# passage} other {# passages}} sur {days} jours »
- `lastToday`: « Dernier passage aujourd'hui à {time} »
- `lastYesterday`: « Dernier passage hier à {time} »
- `lastDate`: « Dernier passage le {date} »
- `period`: « {days} jours »
- `allVenues`: « Tous les établissements »
- `method.qr`: « QR »
- `method.manual`: « Manuel »
- `method.wallet`: « Wallet »
- `kind.booked`: « Réservation »
- `kind.walkIn`: « Sans réservation »
- `emptyPeriod`: « Aucun passage sur les {days} derniers jours. »
- `lastDateSentence`: « Dernier passage le {date}. »
- `never`: « Aucun passage enregistré pour ce membre. »
- `error`: « Impossible de charger les présences. »

`members.showMore` exists from Task 4. Mirror all in `en.json`.

- [ ] **Step 6: Gates, visual check, commit**

On the mock:
- `mbr-02` → `caWdo` Présences (5+ rows, « Afficher plus », venue select);
- `mbr-15` with 30 days → empty period with an older last visit;
- `mbr-16` → never;
- the receptionist session → no venue select, no venue names;
- 390×844 → `TOqY8`.

```bash
git add apps/owner/lib/attendance.ts apps/owner/lib/attendance.test.ts "apps/owner/app/(app)/members/[id]" apps/owner/messages
git commit -m "feat(owner): member visit history (Présences)"
```

---

### Task 9: Réglages page and nav

**Files:**
- Create: `apps/owner/lib/settings-view.ts`
- Test: `apps/owner/lib/settings-view.test.ts`
- Create: `apps/owner/app/(app)/settings/page.tsx`
- Modify: `apps/owner/lib/nav.ts`, `apps/owner/lib/nav.test.ts`
- Modify: `apps/owner/app/(app)/layout.tsx` (`NAV_ICONS`)
- Modify: `apps/owner/messages/fr.json`, `en.json`

**Interfaces:**
- Consumes: `SessionClaims.mfaEnrolled` (Task 1); `minPlanFor` from `@/lib/capabilities`; `usePlanLabel`.
- Produces:

```ts
export function settingsView(policy: MemberLoginPolicy, selection: MemberLoginMode): { locked: boolean; downgraded: boolean; dirty: boolean };
```

- [ ] **Step 1: Failing tests** (`apps/owner/lib/settings-view.test.ts`, plus a nav test)

```ts
import { describe, expect, it } from 'vitest';

import type { MemberLoginPolicy } from '@iziwellpass/api/schemas';

import { settingsView } from './settings-view';

const policy = (over: Partial<MemberLoginPolicy> = {}): MemberLoginPolicy => ({
  configured_mode: 'login',
  effective_mode: 'login',
  required_capability: 'member_self_service',
  capability_available: true,
  downgrade_reason: null,
  ...over,
});

describe('settingsView', () => {
  it('is plain when login is active', () => {
    expect(settingsView(policy(), 'login')).toEqual({ locked: false, downgraded: false, dirty: false });
  });
  it('is dirty when the selection differs', () => {
    expect(settingsView(policy(), 'roster').dirty).toBe(true);
  });
  it('is downgraded when login is configured but the plan lacks it', () => {
    expect(
      settingsView(
        policy({ effective_mode: 'roster', capability_available: false, downgrade_reason: 'plan_lacks_member_self_service' }),
        'login',
      ),
    ).toEqual({ locked: false, downgraded: true, dirty: false });
  });
  it('is locked when roster is configured and the plan lacks login', () => {
    expect(
      settingsView(policy({ configured_mode: 'roster', effective_mode: 'roster', capability_available: false }), 'roster'),
    ).toEqual({ locked: true, downgraded: false, dirty: false });
  });
});
```

In `lib/nav.test.ts` add:

```ts
it('shows Réglages to owners and admins only', () => {
  const hrefs = (role: Parameters<typeof navForRole>[0]) => navForRole(role).map((i) => i.href);
  expect(hrefs('owner')).toContain('/settings');
  expect(hrefs('admin')).toContain('/settings');
  expect(hrefs('receptionist')).not.toContain('/settings');
  expect(hrefs('trainer')).not.toContain('/settings');
});
```

- [ ] **Step 2: Run; expect FAIL.**

- [ ] **Step 3: Implement**

`apps/owner/lib/settings-view.ts`:

```ts
import type { MemberLoginMode, MemberLoginPolicy } from '@iziwellpass/api/schemas';

export function settingsView(
  policy: MemberLoginPolicy,
  selection: MemberLoginMode,
): { locked: boolean; downgraded: boolean; dirty: boolean } {
  return {
    locked: !policy.capability_available && policy.configured_mode === 'roster',
    downgraded: policy.configured_mode === 'login' && policy.downgrade_reason != null,
    dirty: selection !== policy.configured_mode,
  };
}
```

`lib/nav.ts`:
- add `'settings'` to `NavLabelKey`;
- append `{ labelKey: 'settings', href: '/settings', roles: ['owner', 'admin'], scope: 'org' }` as the last item.

`app/(app)/layout.tsx`: `NAV_ICONS.settings = Settings2Icon` (import from `lucide-react`).

- [ ] **Step 4: Run; expect PASS.**

- [ ] **Step 5: The page** (`yw4t9`, `L7nrt`, `I2dKEo`, `GD3ef`, `MGrdU`, `dkkTG`, `tJQXE`)

`app/(app)/settings/page.tsx`: `'use client'`, wrapped in `<RequirePageAccess href="/settings">`. `WorkingPage` + `WorkingHeader title={t('title')} subtitle={t('subtitle')}`, and a `max-w-[720px] flex flex-col gap-12` column.

**Connexion des membres:**
- `useGetTenantSettings({ query: { select: unwrap } })`;
- `const [selection, setSelection] = useState<MemberLoginMode | null>(null)`, initialized from `configured_mode` when data arrives (effect: `if (data && selection === null) setSelection(data.member_login.configured_mode)`);
- `view = settingsView(data.member_login, selection ?? configured)`.

The section contains, in order:
- `SectionHeading title={t('login.title')} description={t('login.description')}`.
- When `view.downgraded`: `Alert variant="warning"` (or the existing warning style) with `t('login.downgraded')` and a `Link href="/plan"` `t('login.seePlans')`.
- `<fieldset>` with `<legend className="sr-only">` and two `<label>` rows, each containing a visually styled native `<input type="radio" name="member-login" value=... className="size-5 accent-foreground">` + title 15/500 + description 13px muted. The selected row gets `bg-secondary rounded-[20px]`; rows are separated by a hairline. The `login` row:
  - when `view.locked`: `disabled`, muted, a `LockIcon`, `t('login.lockedHint', { plan: planLabel(minPlanFor('member_self_service')) })` « Disponible avec le plan Starter » and a `Link href="/plan"` « Voir les plans »;
  - when downgraded and `configured_mode === 'login'`: the outline tag `t('login.inactiveTag')` « Inactif avec votre plan ».
- The foot line `t('login.foot')`.
- `Button` « Enregistrer », `disabled={!view.dirty || patch.isPending}`.

The save uses `usePatchTenantSettings()`:
- `mutate({ data: { member_login_mode: selection } })`.
- **`onSuccess`:** `toast.success(t('login.saved'))`; `queryClient.setQueryData(getGetTenantSettingsQueryKey(), res)`, or invalidate; clear `saveError`.
- **`onError`:** `featureNotAvailable` → `saveError = t('login.refused')` shown inline under the button (`GD3ef`); `isForbidden` → « Accès refusé »; else `t('login.saveError')`.

States:
- Loading → skeleton of the two rows and the badge (`MGrdU`).
- Error → `t('loadError')` + `Réessayer` (`dkkTG`).

**Sécurité:** `SectionHeading title={t('security.title')}` then one hairline row: `t('security.mfa')` over `t('security.mfaDescription')`, and on the right:
- `session.claims.mfaEnrolled` → `Badge variant="success"` `t('security.enabled')`;
- otherwise `Badge` `t('security.disabled')` + `Button variant="outline" asChild` → `Link href="/mfa"` `t('security.enable')`.

Read the session via `useSession()` from `@iziwellpass/auth/provider`; `claims` exists when `status === 'signed-in'`. The phone (`tJQXE`) stacks the badge under the text and makes « Enregistrer » full width.

Messages: new top-level `settings` namespace:
- `title`: « Réglages »
- `subtitle`: « S'appliquent à toute l'organisation, dans tous les établissements. »
- `loadError`: « Impossible de charger les réglages. »
- **`login`:**
  - `title`: « Connexion des membres »
  - `description`: « Décide si les nouveaux membres reçoivent un accès à l'app. Ce réglage vaut pour toute l'organisation. »
  - `loginTitle`: « Avec l'app »
  - `loginDescription`: « Chaque nouveau membre reçoit une invitation par e-mail pour utiliser l'app IziWellPass : carte, QR code, réservations. L'e-mail devient obligatoire à la création. »
  - `rosterTitle`: « Fiche seule »
  - `rosterDescription`: « Les nouveaux membres sont enregistrés sans accès à l'app. L'équipe gère tout depuis la console. »
  - `foot`: « Ce réglage ne concerne que les nouveaux membres. Les accès existants sont conservés. »
  - `save`: « Enregistrer »
  - `saved`: « Réglage enregistré »
  - `downgraded`: « Votre plan n'inclut plus l'espace membre : les nouveaux membres sont créés sans accès à l'app. »
  - `seePlans`: « Voir les plans »
  - `inactiveTag`: « Inactif avec votre plan »
  - `lockedHint`: « Disponible avec le plan {plan} »
  - `refused`: « Votre plan ne permet pas l'accès des membres à l'app. »
  - `saveError`: « Impossible d'enregistrer le réglage. »
- **`security`:**
  - `title`: « Sécurité »
  - `mfa`: « Double authentification »
  - `mfaDescription`: « Un code de votre application d'authentification est demandé à chaque connexion. »
  - `enabled`: « Activée »
  - `disabled`: « Désactivée »
  - `enable`: « Activer »

Also `nav.settings`: « Réglages ». Mirror all in `en.json`.

- [ ] **Step 6: Gates, visual check, commit**

On the mock, check each state against its frame:

| Mock setup | Session | Frame |
| --- | --- | --- |
| `MOCK_PLAN=pro` | offline owner, password `totp` so the token carries the MFA claim | `yw4t9` |
| `MOCK_PLAN=free` | default mode | `L7nrt` (downgraded, since the mock configures `login`) |
| `MOCK_PLAN=free MOCK_LOGIN_MODE=roster` | | `I2dKEo` |
| Selecting « Avec l'app » in the free roster setup, then saving | | `GD3ef` |

- A receptionist session doesn't see the nav item, and `/settings` shows the existing access-denied state.
- Check the phone layout at 390×844 against `tJQXE`.

```bash
git add apps/owner/lib/settings-view.ts apps/owner/lib/settings-view.test.ts apps/owner/lib/nav.ts apps/owner/lib/nav.test.ts "apps/owner/app/(app)/settings" "apps/owner/app/(app)/layout.tsx" apps/owner/messages
git commit -m "feat(owner): Réglages page with member sign-in policy and security"
```

---

### Task 10: Member app auth: e-mail code calls and the session-ended notice

**Files:**
- Create: `apps/member/lib/email-change.ts`
- Test: `apps/member/lib/email-change.test.ts`
- Modify: `apps/member/lib/auth/cognito.ts`, `apps/member/lib/auth/member-mock.ts`, `apps/member/lib/auth/member-mock.test.ts`
- Modify: `apps/member/lib/auth/session.ts`, `apps/member/lib/auth/session.test.ts`, `apps/member/lib/auth/context.tsx`
- Modify: `apps/member/components/ui/notice.tsx`
- Modify: `apps/member/app/(auth)/login.tsx`
- Modify: `apps/member/messages/fr.json`, `en.json`

**Interfaces:**
- Produces:

```ts
// lib/email-change.ts
export type CodeErrorKind = 'mismatch' | 'expired' | 'tooMany' | 'aliasExists' | 'network' | 'other';
export function classifyCodeError(err: unknown): CodeErrorKind;
export const RESEND_COOLDOWN_S = 60;
export const CODE_LENGTH = 6;
export function codeErrorKey(kind: CodeErrorKind): string; // i18n key under emailChange.errors

// MemberAuthClient additions
verifyEmailCode(code: string): Promise<void>;
resendEmailCode(): Promise<void>;

// AuthContextValue additions
sessionEnded: boolean;
verifyEmailCode(code: string): Promise<void>;
resendEmailCode(): Promise<void>;

// session.ts
SessionState gains optional `reason?: 'session-ended'`
SessionAction `{ type: 'signed-out'; reason?: 'session-ended' }`
```

- [ ] **Step 1: Failing tests**

`apps/member/lib/email-change.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { classifyCodeError, codeErrorKey } from './email-change';

const named = (name: string) => Object.assign(new Error(name), { name });

describe('classifyCodeError', () => {
  it.each([
    ['CodeMismatchException', 'mismatch'],
    ['ExpiredCodeException', 'expired'],
    ['LimitExceededException', 'tooMany'],
    ['TooManyRequestsException', 'tooMany'],
    ['TooManyFailedAttemptsException', 'tooMany'],
    ['AliasExistsException', 'aliasExists'],
    ['NetworkError', 'network'],
  ])('%s → %s', (name, kind) => {
    expect(classifyCodeError(named(name))).toBe(kind);
  });
  it('reads a Cognito `code` field too', () => {
    expect(classifyCodeError({ code: 'CodeMismatchException', message: 'x' })).toBe('mismatch');
  });
  it('treats a fetch TypeError as network', () => {
    expect(classifyCodeError(new TypeError('Failed to fetch'))).toBe('network');
  });
  it('falls back to other', () => {
    expect(classifyCodeError('nope')).toBe('other');
  });
});

describe('codeErrorKey', () => {
  it('shows the network line for other', () => {
    expect(codeErrorKey('other')).toBe(codeErrorKey('network'));
  });
});
```

Append to `session.test.ts`:

```ts
  it('records why the session ended', () => {
    const inA = reduceSession(initialSession, { type: 'resolved', claims });
    expect(reduceSession(inA, { type: 'signed-out', reason: 'session-ended' })).toEqual({
      status: 'signed-out',
      claims: null,
      reason: 'session-ended',
    });
  });
  it('clears the reason on sign-in', () => {
    const ended = reduceSession(initialSession, { type: 'signed-out', reason: 'session-ended' });
    expect(reduceSession(ended, { type: 'signed-in', claims })).toEqual({ status: 'signed-in', claims });
  });
```

Append to `member-mock.test.ts` (follow its existing setup for a signed-in client):

```ts
  it('verifies the e-mail code 123456 and maps the demo codes', async () => {
    const client = createMemberMockClient();
    await expect(client.verifyEmailCode('123456')).resolves.toBeUndefined();
    await expect(client.verifyEmailCode('000000')).rejects.toMatchObject({ name: 'ExpiredCodeException' });
    await expect(client.verifyEmailCode('111111')).rejects.toMatchObject({ name: 'AliasExistsException' });
    await expect(client.verifyEmailCode('999999')).rejects.toMatchObject({ name: 'LimitExceededException' });
    await expect(client.verifyEmailCode('424242')).rejects.toMatchObject({ name: 'CodeMismatchException' });
    await expect(client.resendEmailCode()).resolves.toBeUndefined();
  });
```

- [ ] **Step 2: Run; expect FAIL** (`pnpm --filter @iziwellpass/member test`).

- [ ] **Step 3: Implement**

`apps/member/lib/email-change.ts`:

```ts
export type CodeErrorKind = 'mismatch' | 'expired' | 'tooMany' | 'aliasExists' | 'network' | 'other';

export const RESEND_COOLDOWN_S = 60;
export const CODE_LENGTH = 6;

const BY_NAME: Record<string, CodeErrorKind> = {
  CodeMismatchException: 'mismatch',
  ExpiredCodeException: 'expired',
  LimitExceededException: 'tooMany',
  TooManyRequestsException: 'tooMany',
  TooManyFailedAttemptsException: 'tooMany',
  AliasExistsException: 'aliasExists',
  NetworkError: 'network',
};

export function classifyCodeError(err: unknown): CodeErrorKind {
  if (typeof err !== 'object' || err === null) return 'other';
  const e = err as { name?: unknown; code?: unknown };
  const id = typeof e.code === 'string' ? e.code : typeof e.name === 'string' ? e.name : '';
  if (BY_NAME[id]) return BY_NAME[id];
  if (err instanceof TypeError) return 'network';
  return 'other';
}

export function codeErrorKey(kind: CodeErrorKind): string {
  switch (kind) {
    case 'mismatch':
      return 'emailChange.errors.mismatch';
    case 'expired':
      return 'emailChange.errors.expired';
    case 'tooMany':
      return 'emailChange.errors.tooMany';
    case 'aliasExists':
      return 'emailChange.errors.aliasExists';
    default:
      return 'emailChange.errors.network';
  }
}
```

`cognito.ts`: add to the interface and the returned object:

```ts
  verifyEmailCode(code: string): Promise<void>;
  resendEmailCode(): Promise<void>;
```

```ts
  function sessionUser(): Promise<CognitoUser> {
    return new Promise((resolve, reject) => {
      const current = pool.getCurrentUser();
      if (!current) {
        reject(Object.assign(new Error('Not signed in'), { name: 'NotAuthorizedException' }));
        return;
      }
      // getSession refreshes the tokens if needed and attaches them to `current`,
      // which verifyAttribute/getAttributeVerificationCode need (access token).
      current.getSession(((err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session) reject(err ?? new Error('No session'));
        else resolve(current);
      }) as Parameters<CognitoUser['getSession']>[0]);
    });
  }
```

```ts
    verifyEmailCode: async (code) => {
      const current = await sessionUser();
      await new Promise<void>((resolve, reject) => {
        current.verifyAttribute('email', code, {
          onSuccess: () => resolve(),
          onFailure: (err) => reject(err),
        });
      });
    },
    resendEmailCode: async () => {
      const current = await sessionUser();
      await new Promise<void>((resolve, reject) => {
        current.getAttributeVerificationCode('email', {
          onSuccess: () => resolve(),
          onFailure: (err) => reject(err),
          inputVerificationCode: () => resolve(),
        });
      });
    },
```

(`inputVerificationCode` is the SDK's "code sent" callback; resolving there is correct.)

`member-mock.ts`: add to the returned client:

```ts
    verifyEmailCode: async (code) => {
      const fail = (name: string) => {
        const err = new Error(name);
        err.name = name;
        throw err;
      };
      if (code === '123456') return;
      if (code === '000000') fail('ExpiredCodeException');
      if (code === '111111') fail('AliasExistsException');
      if (code === '999999') fail('LimitExceededException');
      fail('CodeMismatchException');
    },
    resendEmailCode: async () => {},
```

`session.ts`:

```ts
export interface SessionState {
  status: 'loading' | 'signed-in' | 'signed-out';
  claims: SessionClaims | null;
  /** Set when the session ended on its own (refresh failed), not when the member signed out. */
  reason?: 'session-ended';
}

export type SessionAction =
  | { type: 'resolved'; claims: SessionClaims | null }
  | { type: 'signed-in'; claims: SessionClaims }
  | { type: 'signed-out'; reason?: 'session-ended' };
```

and the `signed-out` case: `return action.reason ? { status: 'signed-out', claims: null, reason: action.reason } : { status: 'signed-out', claims: null };`.

`context.tsx`:
- in `onUnauthorized`, dispatch `{ type: 'signed-out', reason: 'session-ended' }`;
- add `sessionEnded: state.reason === 'session-ended'`, `verifyEmailCode: (code) => client.verifyEmailCode(code)` and `resendEmailCode: () => client.resendEmailCode()` to the value and the `AuthContextValue` interface.

`notice.tsx`: add the `'neutral'` variant: `BG.neutral = 'bg-secondary'`, `FG.neutral = colors.mutedStrong` (use the theme's muted-strong colour name; check `lib/theme.ts`), `ICON.neutral = Info`.

`login.tsx`: read `sessionEnded` from `useAuth()`. On the sign-in form (not the new-password step), render `<Notice variant="neutral" message={t('login.sessionEnded')} />` above the e-mail field when `sessionEnded && !formError`.

Messages (`login.sessionEnded`): « Votre session a pris fin. Reconnectez-vous. » (en: « Your session ended. Please sign in again. »).

- [ ] **Step 4: Run tests and gates; expect PASS.**

Run: `pnpm --filter @iziwellpass/member test && pnpm --filter @iziwellpass/member typecheck && pnpm --filter @iziwellpass/member lint`

- [ ] **Step 5: Commit**

```bash
git add apps/member/lib apps/member/components/ui/notice.tsx "apps/member/app/(auth)/login.tsx" apps/member/messages
git commit -m "feat(member): e-mail code calls and session-ended notice"
```

---

### Task 11: Member app, confirm the new address

**Files:**
- Create: `apps/member/components/form/code-input.tsx`
- Create: `apps/member/app/(app)/email-change.tsx`
- Modify: `apps/member/app/(app)/_layout.tsx`
- Modify: `apps/member/app/(app)/index.tsx`
- Modify: `apps/member/scripts/mock-server.mjs`
- Modify: `apps/member/messages/fr.json`, `en.json`

**Interfaces:**
- Consumes: `useAuth().verifyEmailCode / resendEmailCode / signOut` (Task 10); `classifyCodeError`, `codeErrorKey`, `RESEND_COOLDOWN_S`, `CODE_LENGTH`, `formatCountdown` (`lib/format.ts`); the generated `confirmMyEmailChange` and `useMeProfile`.
- Produces: the route `/email-change`; `CodeInput({ value, onChange, error, autoFocus })`.

- [ ] **Step 1: Member mock server**

In `apps/member/scripts/mock-server.mjs`:
- add `const MOCK_EMAIL_CHANGE = process.env.MOCK_EMAIL_CHANGE ?? '';` and a header-comment line;
- in the `GET /gms/v1/me` handler, return `{ ...profileFor(claims), pending_email_change: MOCK_EMAIL_CHANGE === 'pending' || MOCK_EMAIL_CHANGE === 'expired' }`;
- add:

```js
  if (req.method === 'POST' && pathname === '/gms/v1/me/email-change/confirm') {
    if (MOCK_EMAIL_CHANGE === 'pending') {
      return [200, envelope({ id: 'op-email-1', kind: 'email_change', state: 'verified', result_code: null, failure_code: null, updated_at: new Date().toISOString() })];
    }
    return [409, errorBody(409, 'NO_EMAIL_CHANGE_PENDING', 'No email change is pending')];
  }
```

(Match `errorBody`'s real signature in this file.)

- [ ] **Step 2: `CodeInput`** (`gTXh4`, `DurV4`, `iNJZZ`)

```tsx
import { useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/text';
import { CODE_LENGTH } from '@/lib/email-change';

/**
 * One hidden TextInput drives six 56px boxes: paste, SMS autofill
 * (`oneTimeCode`) and the number pad all work on native and web.
 */
export function CodeInput({
  value,
  onChange,
  error = false,
  autoFocus = true,
  accessibilityLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  error?: boolean;
  autoFocus?: boolean;
  accessibilityLabel: string;
}) {
  const input = useRef<TextInput>(null);
  const focusIndex = Math.min(value.length, CODE_LENGTH - 1);
  return (
    <Pressable onPress={() => input.current?.focus()} accessibilityRole="none">
      <View className="flex-row justify-between gap-2">
        {Array.from({ length: CODE_LENGTH }, (_, i) => {
          const focused = i === focusIndex;
          const border = error ? 'border-destructive-strong' : focused ? 'border-ink border-2' : 'border-border';
          return (
            <View key={i} className={`h-14 flex-1 items-center justify-center rounded-[16px] border bg-background ${border}`}>
              <AppText variant="numeric" style={{ fontSize: 24 }}>
                {value[i] ?? ''}
              </AppText>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={input}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, CODE_LENGTH))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={CODE_LENGTH}
        autoFocus={autoFocus}
        accessibilityLabel={accessibilityLabel}
        className="absolute inset-0 opacity-0"
        caretHidden
      />
    </Pressable>
  );
}
```

Use the theme's real class names for ink, border and destructive strokes (check `tailwind.config` / `lib/theme.ts`; e.g. `border-foreground` if `border-ink` doesn't exist).

- [ ] **Step 3: The screen** (`gTXh4`, `DurV4`, `iNJZZ`, `QR7n0`, `plDHB`, `F95Y7E`)

`apps/member/app/(app)/email-change.tsx`:

```tsx
type Phase = 'entry' | 'unavailable' | 'expired' | 'done';
```

- **State:**
  - `code`, `phase`, `errorKey: string | null`, `pending`;
  - `cooldownEnds` (ms timestamp), set to `Date.now() + RESEND_COOLDOWN_S * 1000` on mount and after each resend;
  - a 1 s interval tick to re-render the countdown.
- **`remaining = Math.max(0, Math.ceil((cooldownEnds - now) / 1000))`.**
- **Confirm** (enabled when `code.length === CODE_LENGTH && !pending`):
  1. `await verifyEmailCode(code)`. On error: `kind = classifyCodeError(err)`; `aliasExists` → `phase = 'unavailable'`; otherwise `errorKey = codeErrorKey(kind)`; stop.
  2. `await confirmMyEmailChange({ venue: selectedVenue })`, passing the same venue selector the other `/me` calls use (see how `useMeProfile(undefined, …)` is called: if `/me` calls pass no venue, pass `undefined`).
     - Success → `phase = 'done'`.
     - `ApiError` 409 `NO_EMAIL_CHANGE_PENDING` → `phase = 'expired'`.
     - Anything else (incl. `EMAIL_NOT_VERIFIED`) → `errorKey = 'emailChange.errors.network'`.
  3. On any outcome, invalidate `getMeProfileQueryKey()`.
- **Resend** (enabled when `remaining === 0`): `await resendEmailCode()` → reset `cooldownEnds`, clear `errorKey`; on error, `errorKey = codeErrorKey(classifyCodeError(err))`.
- **Layout (entry):**
  - `Screen` with a back affordance (« Plus tard » as the ghost button at the bottom);
  - title `t('emailChange.title')`, text `t('emailChange.body')`;
  - label `t('emailChange.codeLabel')`, `CodeInput` (`error={!!errorKey}`), error text (destructive, 14px);
  - primary `Button` `t('emailChange.confirm')`;
  - ghost `Button` `remaining > 0 ? t('emailChange.resendIn', { time: formatCountdown(remaining) }) : t('emailChange.resend')` (disabled while `remaining > 0`);
  - ghost `Button` `t('emailChange.later')` → `router.back()`;
  - foot `t('emailChange.foot')` caption muted.
- **`unavailable` (`QR7n0`):** the same header, the error line `t('emailChange.errors.aliasExists')`, no code input actions, only `Button` `t('emailChange.back')` → `router.back()`.
- **`expired` (`plDHB`):** text `t('emailChange.expired')` + `Button` « Retour ».
- **`done` (`F95Y7E`):** success tint medallion with a `Check` icon (`IconMedallion`), title `t('emailChange.doneTitle')`, text `t('emailChange.doneBody')` (neutral copy), primary `t('emailChange.relogin')` → `signOut()` (no reason) and `router.replace('/login')`. No back button: pass `headerShown: false` and don't render « Plus tard ».

`_layout.tsx`: add `<Tabs.Screen name="email-change" options={{ href: null }} />` so the route exists without a tab.

- [ ] **Step 4: The Carte banner** (`c4qkl7`)

In `CardScreen`, between the greeting and the pass, when `profile?.pending_email_change`: a `Pressable` row, `rounded-pill bg-secondary px-4 py-3 min-h-[52px]`, `accessibilityRole="button"`, containing:
- a `Mail` icon (18, stroke 1.5);
- a two-line text block `t('emailChange.bannerTitle')` (bodyStrong) / `t('emailChange.bannerBody')` (caption, mutedStrong);
- a `ChevronRight`.

It calls `router.navigate('/email-change')`. Place it inside the profile branch so it shows only once the profile loaded.

Messages (`emailChange`):
- `bannerTitle`: « Confirmez votre nouvelle adresse e-mail »
- `bannerBody`: « Saisissez le code reçu pour terminer le changement. »
- `title`: « Confirmer votre nouvelle adresse »
- `body`: « Votre club a demandé à changer votre adresse de connexion. Nous avons envoyé un code de vérification à la nouvelle adresse. »
- `codeLabel`: « Code de vérification »
- `confirm`: « Confirmer »
- `resend`: « Renvoyer le code »
- `resendIn`: « Renvoyer le code ({time}) »
- `later`: « Plus tard »
- `foot`: « Sans confirmation sous 24 h, votre adresse actuelle est conservée. »
- `back`: « Retour »
- `expired`: « Ce changement d'adresse a expiré. Demandez à votre club d'en relancer un. »
- `doneTitle`: « Adresse modifiée »
- `doneBody`: « Pour votre sécurité, votre session va se fermer. Reconnectez-vous avec votre nouvelle adresse. »
- `relogin`: « Se reconnecter »
- **`errors`:**
  - `mismatch`: « Code incorrect. »
  - `expired`: « Ce code a expiré. Demandez-en un nouveau. »
  - `tooMany`: « Trop d'essais. Réessayez dans quelques minutes. »
  - `aliasExists`: « Cette adresse n'est plus disponible. Contactez votre club. »
  - `network`: « Connexion impossible. Réessayez. »

Mirror in `en.json`.

If `formatCountdown(45)` does not produce `0:45`, add a local `m:ss` formatter in `lib/email-change.ts` with a test (`formatCooldown(45) === '0:45'`, `formatCooldown(60) === '1:00'`).

- [ ] **Step 5: Gates and browser check**

Run the member gates. Then run Expo web at 390×844 against the member mock with offline auth, on ports you choose (not 8082):
- `MOCK_EMAIL_CHANGE=pending` → banner (`c4qkl7`) → screen (`gTXh4`);
- type `123` → « Confirmer » disabled;
- `424242` → « Code incorrect. » (`iNJZZ`);
- `111111` → `QR7n0`;
- `123456` → `F95Y7E` → « Se reconnecter » → login without the session-ended notice;
- the countdown shows `0:45`-style text (`DurV4`);
- `MOCK_EMAIL_CHANGE=expired` with `123456` → `plDHB`.

For `o5BPGj`, stop the member mock while signed in and trigger a refetch, or make the offline mock's `forceRefreshSession` return null. The login notice must show.

Recall the CDP note: multi-character `Input.insertText` does nothing on some OTP inputs, so type one character per call.

- [ ] **Step 6: Commit**

```bash
git add apps/member/components/form/code-input.tsx "apps/member/app/(app)" apps/member/scripts/mock-server.mjs apps/member/messages apps/member/lib
git commit -m "feat(member): confirm a new sign-in address from the card screen"
```

---

## Self-review notes (for the executor)

**Spec coverage:**

| Spec item | Task |
| --- | --- |
| MM1–MM4 | 2, 6 |
| MM5 | 1 |
| MM6 | 7 |
| MM7 | 4 |
| MM8 | 5 |
| MM9 | 6 |
| MM10 | 8 |
| MM11 | 9 |
| MM12 | 1 |
| MM13 | 10–11 |
| MM14 | 10 |
| MM15 | 3 (+5 for the duplicate check) |
| MM16 | 11 |

The §3 rulings are applied in Tasks 2 and 7; the §9 copy in Tasks 2, 7 and 11.

**Ruling:** `describeAccount` drops the spec's `status` option (unused) and adds `stale`. This is recorded in Task 2.

**Cross-task names:** `MEMBER_SEARCH_KEY` (Task 4) is used by Task 5. `AccountView`, `AccountAction`, `AccountTracking` (Tasks 2, 6) are used by Task 7. `mfaEnrolled` (Task 1) is used by Task 9.
