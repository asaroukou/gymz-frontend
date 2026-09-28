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

  const lines: AccountLine[] = (() => {
    if (invitation !== 'failed') {
      return [{ key: EXPLAIN[invitation], tone: 'muted' as const }];
    }
    const failureKey = provisioningFailureKey(account.provisioning?.failure_code);
    return [
      ...(failureKey ? [{ key: failureKey, tone: 'danger' as const }] : []),
      { key: 'account.explain.failedFix', tone: 'muted' as const },
    ];
  })();

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
