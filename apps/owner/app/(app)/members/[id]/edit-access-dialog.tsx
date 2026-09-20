'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  getGetMemberQueryKey,
  getListMembersQueryKey,
  useSetMemberAccess,
  useSetMemberVenues,
} from '@iziwellpass/api/generated';
import type { Member } from '@iziwellpass/api/schemas';
import { Button } from '@iziwellpass/ui/components/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@iziwellpass/ui/components/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@iziwellpass/ui/components/select';

import { VenueChecklist } from '@/components/venue-checklist';
import { ACCESS_SCOPE_VALUES } from '@/lib/access-scope';
import { apiErrorMessage } from '@/lib/api-error';

// ---------------------------------------------------------------------------
// Edit access dialog
// ---------------------------------------------------------------------------

export function EditAccessDialog({
  member,
  open,
  onOpenChange,
}: {
  member: Member;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('members');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const setAccess = useSetMemberAccess();
  const setVenues = useSetMemberVenues();
  const [scope, setScope] = useState<(typeof ACCESS_SCOPE_VALUES)[number]>(member.access_scope);
  const [venueIds, setVenueIds] = useState<string[]>([]);
  const [venuesError, setVenuesError] = useState(false);

  // Reset local edit state whenever the dialog (re)opens for a member.
  useEffect(() => {
    if (open) {
      setScope(member.access_scope);
      setVenueIds([]);
      setVenuesError(false);
    }
  }, [open, member.access_scope]);

  const pending = setAccess.isPending || setVenues.isPending;

  const onDone = () => {
    void queryClient.invalidateQueries({ queryKey: getGetMemberQueryKey(member.id) });
    void queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
    toast.success(t('detail.access.success'));
    onOpenChange(false);
  };
  const onErr = (err: unknown) => toast.error(apiErrorMessage(err, t('detail.access.error')));

  const handleSave = () => {
    if (scope === 'venue_scoped') {
      if (venueIds.length === 0) {
        setVenuesError(true);
        return;
      }
      setVenues.mutate(
        { mid: member.id, data: { venue_ids: venueIds } },
        { onSuccess: onDone, onError: onErr },
      );
    } else {
      setAccess.mutate(
        { mid: member.id, data: { scope: 'chain_wide' } },
        { onSuccess: onDone, onError: onErr },
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('detail.access.title')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-[18px]">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">{t('detail.access.scopeLabel')}</span>
            <Select value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chain_wide">{t('detail.access.scopeChainWide')}</SelectItem>
                <SelectItem value="venue_scoped">{t('detail.access.scopeVenueScoped')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {scope === 'venue_scoped' ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">{t('detail.access.replaceWarning')}</p>
              <VenueChecklist
                value={venueIds}
                onChange={(next) => {
                  setVenueIds(next);
                  if (next.length > 0) setVenuesError(false);
                }}
              />
              {venuesError ? (
                <p className="text-sm text-destructive-foreground">
                  {t('detail.access.venuesRequired')}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{tCommon('cancel')}</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={pending}>
            {pending ? t('detail.access.submitting') : t('detail.access.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
