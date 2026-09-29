'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleAlertIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { getGetMemberQueryKey, resendInvitation } from '@iziwellpass/api/generated';
import type { StaffMemberProfile } from '@iziwellpass/api/schemas';
import { Alert, AlertDescription } from '@iziwellpass/ui/components/alert';
import { Button } from '@iziwellpass/ui/components/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@iziwellpass/ui/components/dialog';

import { classifyMemberError } from '@/lib/member-errors';
import { isForbidden } from '@/lib/plan-errors';

/**
 * « Renvoyer l'invitation » (canvas `f4Mtn`) and « Relancer la création de
 * l'accès » (`w6dqTN`, refused `L8mxU`): both `POST /members/{mid}/invitation-resend`,
 * the backend deciding between a resend and a provisioning retry. A refusal
 * stays in the dialog with the confirm disabled; reopening clears it. While
 * the request runs the dialog cannot be closed.
 */
export function ResendInvitationDialog({
  member,
  mode,
  open,
  onOpenChange,
  onStarted,
  restoreFocusTo,
}: {
  member: StaffMemberProfile;
  mode: 'resend' | 'relaunch';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStarted: (operationId: string) => void;
  restoreFocusTo?: () => HTMLElement | null | undefined;
}) {
  const t = useTranslations('members');
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [errorAction, setErrorAction] = useState<'settings' | undefined>(undefined);

  // Review Focus 1: a refusal must not outlive the dialog, or the confirm
  // would stay disabled on the next open.
  useEffect(() => {
    if (open) {
      setError(null);
      setErrorAction(undefined);
    }
  }, [open]);

  const invalidateMember = () =>
    void queryClient.invalidateQueries({ queryKey: getGetMemberQueryKey(member.id) });

  const mutation = useMutation({
    mutationFn: () => resendInvitation(member.id),
    onSuccess: (res) => {
      onStarted(res.data.id);
      invalidateMember();
      onOpenChange(false);
    },
    onError: (err) => {
      const kind = classifyMemberError(err).kind;
      if (kind === 'loginNotAvailable') {
        setError(t('account.refusal.loginNotAvailable'));
        setErrorAction('settings');
        return;
      }
      setErrorAction(undefined);
      if (kind === 'duplicate') setError(t('account.result.emailConflict'));
      else if (kind === 'accountAlreadyActive') {
        setError(t('account.result.alreadyActive'));
        invalidateMember();
      } else if (kind === 'identityShared') setError(t('account.result.identityShared'));
      else if (isForbidden(err)) setError(t('account.refusal.forbidden'));
      else setError(t('account.result.resendFailed'));
    },
  });

  const copy =
    mode === 'relaunch'
      ? {
          title: t('account.relaunchDialog.title'),
          body: t('account.relaunchDialog.body', { email: member.email ?? '' }),
          confirm: t('account.relaunchDialog.confirm'),
        }
      : {
          title: t('account.resendDialog.title'),
          body: t('account.resendDialog.body', { name: member.first_name }),
          confirm: t('account.resendDialog.confirm'),
        };

  const pending = mutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && pending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="sm:max-w-[480px]"
        closeDisabled={pending}
        restoreFocusTo={restoreFocusTo}
      >
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription className="break-words">{copy.body}</DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive">
            <CircleAlertIcon strokeWidth={1.5} />
            <AlertDescription>
              <p>{error}</p>
              {errorAction === 'settings' ? (
                <Link
                  href="/settings"
                  className="inline-flex min-h-11 items-center font-medium underline underline-offset-4 md:min-h-0"
                >
                  {t('account.refusal.openSettings')}
                </Link>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={pending}>
              {t('account.resendDialog.cancel')}
            </Button>
          </DialogClose>
          <Button onClick={() => mutation.mutate()} disabled={error !== null || pending}>
            {copy.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
