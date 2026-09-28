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
      if (op.state === 'pending_verification' || op.state === 'verified') {
        return 'account.last.emailRequested';
      }
      return ok ? 'account.last.emailChanged' : 'account.last.emailFailed';
    default:
      return 'account.last.resent';
  }
}
