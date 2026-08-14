'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { getListSubscriptionsQueryKey, useUpdateSubscription } from '@iziwellpass/api/generated';
import type { MemberSubscription } from '@iziwellpass/api/schemas';
import { Button } from '@iziwellpass/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@iziwellpass/ui/components/dialog';

import { apiErrorMessage } from '@/lib/api-error';

/**
 * PUT .../subscriptions/{sid} serves both "mark paid" and "cancel"; the owner
 * app uses it only for cancellation, since payment is decided at assign time.
 */
export function CancelSubscriptionDialog({
  memberId,
  subscription,
  planName,
}: {
  memberId: string;
  subscription: MemberSubscription;
  planName: string;
}) {
  const t = useTranslations('members');
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const updateSubscription = useUpdateSubscription();

  const onConfirm = () => {
    updateSubscription.mutate(
      { mid: memberId, sid: subscription.id, data: { cancel: true } },
      {
        onSuccess: () => {
          toast.success(t('detail.subscriptions.cancelDialog.success'));
          void queryClient.invalidateQueries({
            queryKey: getListSubscriptionsQueryKey(memberId),
          });
          setOpen(false);
        },
        onError: (err) =>
          toast.error(apiErrorMessage(err, t('detail.subscriptions.cancelDialog.error'))),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {t('detail.subscriptions.cancel')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('detail.subscriptions.cancelDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('detail.subscriptions.cancelDialog.description', { name: planName })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="destructive" onClick={onConfirm} disabled={updateSubscription.isPending}>
            {updateSubscription.isPending
              ? t('detail.subscriptions.cancelDialog.submitting')
              : t('detail.subscriptions.cancelDialog.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
