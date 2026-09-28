'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CircleAlertIcon, TriangleAlertIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { unwrap } from '@iziwellpass/api/client';
import {
  getGetMemberQueryKey,
  getListMembersQueryKey,
  useListVenues,
  useSetMemberAccess,
  useSetMemberVenues,
} from '@iziwellpass/api/generated';
import type { StaffMemberProfile } from '@iziwellpass/api/schemas';
import { Alert, AlertDescription } from '@iziwellpass/ui/components/alert';
import { Button } from '@iziwellpass/ui/components/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@iziwellpass/ui/components/dialog';
import { Label } from '@iziwellpass/ui/components/label';
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
import { classifyMemberError, downscopeLines, type DownscopeLine } from '@/lib/member-errors';
import { isForbidden } from '@/lib/plan-errors';

// ---------------------------------------------------------------------------
// Edit access dialog
// ---------------------------------------------------------------------------

export function EditAccessDialog({
  member,
  open,
  onOpenChange,
}: {
  member: StaffMemberProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('members');
  const tCommon = useTranslations('common');
  const tCap = useTranslations('capabilities');
  const queryClient = useQueryClient();
  const setAccess = useSetMemberAccess();
  const setVenues = useSetMemberVenues();
  const [scope, setScope] = useState<(typeof ACCESS_SCOPE_VALUES)[number]>(member.access_scope);
  const [venueIds, setVenueIds] = useState<string[]>([]);
  const [venuesError, setVenuesError] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [blocked, setBlocked] = useState<DownscopeLine[] | null>(null);
  const venuesQuery = useListVenues({ query: { select: unwrap } });

  // Reset local edit state only on the closed -> open transition (P4): the
  // dialog also stays open after a conflict, when member.access_scope may
  // have just been refetched, and resetting then would wipe the selection.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      setScope(member.access_scope);
      setVenueIds(member.access.venue_ids);
      setVenuesError(false);
      setConflict(false);
      setBlocked(null);
    }
    wasOpen.current = open;
  }, [open, member.access_scope, member.access.venue_ids]);

  const pending = setAccess.isPending || setVenues.isPending;

  const onDone = () => {
    void queryClient.invalidateQueries({ queryKey: getGetMemberQueryKey(member.id) });
    void queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
    toast.success(t('detail.access.success'));
    onOpenChange(false);
  };
  const onErr = (err: unknown) => {
    const error = classifyMemberError(err);
    if (error.kind === 'versionMismatch') {
      setBlocked(null);
      setConflict(true);
      void queryClient.invalidateQueries({ queryKey: getGetMemberQueryKey(member.id) });
      return;
    }
    if (error.kind === 'downscopeBlocked') {
      setConflict(false);
      setBlocked(
        downscopeLines(error.affected, venuesQuery.data ?? [], t('detail.access.unknownVenue')),
      );
      return;
    }
    if (isForbidden(err)) {
      toast.error(tCap('toast.forbidden'));
      return;
    }
    toast.error(apiErrorMessage(err, t('detail.access.error')));
  };

  const handleSave = () => {
    setConflict(false);
    setBlocked(null);
    const params = { expected_version: member.version };
    if (scope === 'venue_scoped') {
      if (venueIds.length === 0) {
        setVenuesError(true);
        return;
      }
      setVenues.mutate(
        { mid: member.id, data: { venue_ids: venueIds }, params },
        { onSuccess: onDone, onError: onErr },
      );
    } else {
      setAccess.mutate(
        { mid: member.id, data: { scope: 'chain_wide' }, params },
        { onSuccess: onDone, onError: onErr },
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t('detail.access.title')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-[18px]">
          {conflict ? (
            <Alert variant="warning">
              <TriangleAlertIcon />
              <AlertDescription>{t('detail.versionConflict')}</AlertDescription>
            </Alert>
          ) : null}
          {blocked ? (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertDescription>
                <p>{t('detail.access.downscopeBlocked')}</p>
                {blocked.length > 0 ? (
                  <ul className="mt-1.5 flex flex-col gap-0.5">
                    {blocked.map((line) => (
                      <li key={line.venueId}>
                        {t('detail.access.downscopeVenue', { venue: line.name, count: line.count })}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}
          <div className="flex flex-col gap-2">
            <Label htmlFor="access-scope">{t('detail.access.scopeLabel')}</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
              <SelectTrigger id="access-scope" className="w-full">
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
              <Label id="access-venues-label" className="sr-only">
                {t('detail.access.title')}
              </Label>
              <p className="text-sm text-muted-foreground">{t('detail.access.replaceWarning')}</p>
              <VenueChecklist
                value={venueIds}
                onChange={(next) => {
                  setVenueIds(next);
                  if (next.length > 0) setVenuesError(false);
                }}
                aria-labelledby="access-venues-label"
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
