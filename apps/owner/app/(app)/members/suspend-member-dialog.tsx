'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  getGetMemberQueryKey,
  getListMembersQueryKey,
  useSuspendMember,
} from '@iziwellpass/api/generated';
import type { Member } from '@iziwellpass/api/schemas';
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
import { memberName } from '@/lib/member-search';

// ---------------------------------------------------------------------------
// Suspend confirm dialog (driven from the row menu)
// ---------------------------------------------------------------------------

export function SuspendMemberDialog({
  member,
  open,
  onOpenChange,
  restoreFocusTo,
}: {
  member: Member;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restoreFocusTo?: () => HTMLElement | null | undefined;
}) {
  const t = useTranslations('members');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const suspendMember = useSuspendMember();

  const handleSuspend = () => {
    suspendMember.mutate(
      { mid: member.id },
      {
        onSuccess: () => {
          toast.success(t('detail.suspendDialog.success'));
          void queryClient.invalidateQueries({ queryKey: getGetMemberQueryKey(member.id) });
          void queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(apiErrorMessage(err, t('detail.suspendDialog.error')));
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]" restoreFocusTo={restoreFocusTo}>
        <DialogHeader>
          <DialogTitle>{t('detail.suspendDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('detail.suspendDialog.description', { name: memberName(member) })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{tCommon('cancel')}</Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleSuspend} disabled={suspendMember.isPending}>
            {suspendMember.isPending
              ? t('detail.suspendDialog.confirming')
              : t('detail.suspendDialog.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
