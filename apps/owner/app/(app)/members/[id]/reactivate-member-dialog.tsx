'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  getGetMemberQueryKey,
  getListMembersQueryKey,
  useReactivateMember,
} from '@iziwellpass/api/generated';
import type { StaffMemberView } from '@iziwellpass/api/schemas';
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

import { apiErrorMessage } from '@/lib/api-error';
import { classifyMemberError } from '@/lib/member-errors';
import { memberName } from '@/lib/member-search';

/** Confirm « Réactiver » (danger zone, canvas `L6sMyP`): `PUT /members/{mid}/reactivate`, 204. */
export function ReactivateMemberDialog({
  member,
  open,
  onOpenChange,
}: {
  member: StaffMemberView;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('members');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const reactivate = useReactivateMember();

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: getGetMemberQueryKey(member.id) });
    void queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
  };

  const handleReactivate = () => {
    reactivate.mutate(
      { mid: member.id },
      {
        onSuccess: () => {
          toast.success(t('detail.reactivateDialog.success'));
          refresh();
          onOpenChange(false);
        },
        onError: (err) => {
          if (classifyMemberError(err).kind === 'invalidLifecycle') {
            toast.error(t('detail.reactivateDialog.notSuspended'));
            refresh();
            onOpenChange(false);
            return;
          }
          toast.error(apiErrorMessage(err, t('detail.reactivateDialog.error')));
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t('detail.reactivateDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('detail.reactivateDialog.description', { name: memberName(member) })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{tCommon('cancel')}</Button>
          </DialogClose>
          <Button onClick={handleReactivate} disabled={reactivate.isPending}>
            {reactivate.isPending
              ? t('detail.reactivateDialog.confirming')
              : t('detail.reactivateDialog.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
