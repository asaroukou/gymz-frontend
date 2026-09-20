'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { getListPlansQueryKey, useArchivePlan } from '@iziwellpass/api/generated';
import type { ActivityPlan } from '@iziwellpass/api/schemas';
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

/** Archive is a soft delete (is_active=false), so the copy avoids "supprimer". */
export function ArchivePlanDialog({ venueId, plan }: { venueId: string; plan: ActivityPlan }) {
  const t = useTranslations('plans');
  const tCommon = useTranslations('common');
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const archivePlan = useArchivePlan();

  const onConfirm = () => {
    archivePlan.mutate(
      { id: venueId, planId: plan.id },
      {
        onSuccess: () => {
          toast.success(t('archiveDialog.success'));
          void queryClient.invalidateQueries({ queryKey: getListPlansQueryKey(venueId) });
          setOpen(false);
        },
        onError: (err) => toast.error(apiErrorMessage(err, t('archiveDialog.error'))),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          {t('archive')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('archiveDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('archiveDialog.description', { name: plan.name })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {tCommon('cancel')}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={archivePlan.isPending}>
            {archivePlan.isPending ? t('archiveDialog.submitting') : t('archiveDialog.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
