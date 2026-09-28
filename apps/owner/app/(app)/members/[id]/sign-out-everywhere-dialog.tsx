'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleAlertIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { getGetMemberQueryKey, revokeSessions } from '@iziwellpass/api/generated';
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
 * « Déconnecter de tous les appareils » (canvas `eLtfl`, phone `s3tkfq`):
 * `POST /members/{mid}/sessions/revoke`. The body is the gender-neutral line
 * (spec §9), not the canvas « Il devra… ». The phone keeps the centred
 * dialog; its footer already stacks full-width buttons (spec §3).
 */
export function SignOutEverywhereDialog({
  member,
  open,
  onOpenChange,
  onStarted,
}: {
  member: StaffMemberProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStarted: (operationId: string) => void;
}) {
  const t = useTranslations('members');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => revokeSessions(member.id),
    onSuccess: (res) => {
      onStarted(res.data.id);
      void queryClient.invalidateQueries({ queryKey: getGetMemberQueryKey(member.id) });
      onOpenChange(false);
    },
    onError: (err) => {
      const kind = classifyMemberError(err).kind;
      if (kind === 'identityShared') setError(t('account.result.signOutShared'));
      else if (kind === 'loginNotProvisioned') setError(t('account.result.signOutNotProvisioned'));
      else if (isForbidden(err)) setError(t('account.refusal.forbidden'));
      else setError(t('account.result.signOutFailed'));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t('account.signOut.title', { name: member.first_name })}</DialogTitle>
          <DialogDescription>{t('account.signOut.body')}</DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive">
            <CircleAlertIcon strokeWidth={1.5} />
            <AlertDescription>
              <p>{error}</p>
            </AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{tCommon('cancel')}</Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {t('account.signOut.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
