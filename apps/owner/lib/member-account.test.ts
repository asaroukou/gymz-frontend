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

describe('members.account copy', () => {
  it('every key the mapper can emit exists in fr.json', async () => {
    const { readFileSync } = await import('node:fs');
    const fr = JSON.parse(readFileSync(new URL('../messages/fr.json', import.meta.url), 'utf-8'));
    const get = (path: string) =>
      path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], fr.members);
    const keys = [
      ...['none', 'pending', 'sent', 'linkedExisting', 'accepted', 'untracked', 'failed'].map((k) => `account.badge.${k}`),
      ...['none', 'pending', 'sent', 'linkedExisting', 'accepted', 'untracked', 'failedFix'].map((k) => `account.explain.${k}`),
      ...['invalid_email', 'missing_email', 'identity_already_linked', 'provider_unavailable'].map((k) => `account.provisioningFailure.${k}`),
      ...['sending', 'creating', 'sendingCode', 'signingOut', 'stillRunning', 'waiting'].map((k) => `account.status.${k}`),
      ...Object.keys(fr.members.account.result).map((k) => `account.result.${k}`),
      ...Object.keys(fr.members.account.last).map((k) => `account.last.${k}`),
    ];
    for (const key of keys) expect(typeof get(key), key).toBe('string');
  });
});
