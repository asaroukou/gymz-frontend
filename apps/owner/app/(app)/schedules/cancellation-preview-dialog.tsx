'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CircleAlertIcon, CircleCheckIcon, TriangleAlertIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { unwrap } from '@iziwellpass/api/client';
import {
  getListSchedulesQueryKey,
  getListSlotsQueryKey,
  useCancelSchedule,
  useCancelSlot,
  useScheduleCancellationPreview,
  useSlotCancellationPreview,
} from '@iziwellpass/api/generated';
import type {
  ApiResponseCancellationPreview,
  Schedule,
  ScheduleSlot,
} from '@iziwellpass/api/schemas';
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
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { cn } from '@iziwellpass/ui/lib/utils';

import { apiErrorMessage } from '@/lib/api-error';
import { isStalePreviewConflict, previewRows, type PreviewRow } from '@/lib/cancellation-preview';

export type CancellationTarget =
  | { kind: 'slot'; slot: ScheduleSlot; description: string }
  | { kind: 'schedule'; schedule: Schedule; description: string };

// `staleTime`/`gcTime` 0 keeps the preview honest: every open refetches the
// counts, and the `version` we confirm with is never a cached one. `retry`
// off so the load-error state shows immediately instead of after 3 attempts.
// `select` names its envelope type instead of passing the generic `unwrap`
// directly: spread into the options object, a bare generic function stops
// react-query from inferring `TData` and `data` collapses to `unknown`.
const PREVIEW_QUERY = {
  select: (response: ApiResponseCancellationPreview) => unwrap(response),
  staleTime: 0,
  gcTime: 0,
  retry: false,
} as const;

/** Canvas `TeQNq`/`o9VUa3` (loaded), `UKoGk` (loading), `zvJSN` (409), `dAnIL` (blocked, load error). */
export function CancellationPreviewDialog({
  target,
  venueId,
  open,
  onOpenChange,
  restoreFocusTo,
}: {
  target: CancellationTarget;
  venueId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restoreFocusTo?: () => HTMLElement | null | undefined;
}) {
  const t = useTranslations('planning');
  const queryClient = useQueryClient();
  const [conflict, setConflict] = useState(false);
  const targetId = target.kind === 'slot' ? target.slot.id : target.schedule.id;

  const slotPreview = useSlotCancellationPreview(targetId, {
    query: { ...PREVIEW_QUERY, enabled: open && target.kind === 'slot' },
  });
  const schedulePreview = useScheduleCancellationPreview(targetId, {
    query: { ...PREVIEW_QUERY, enabled: open && target.kind === 'schedule' },
  });
  const preview = target.kind === 'slot' ? slotPreview : schedulePreview;

  const cancelSlot = useCancelSlot();
  const cancelSchedule = useCancelSchedule();
  const confirming = cancelSlot.isPending || cancelSchedule.isPending;

  useEffect(() => {
    if (!open) setConflict(false);
  }, [open]);

  const labels =
    target.kind === 'slot'
      ? {
          title: t('cancelSlot.title'),
          confirm: t('cancelSlot.confirm'),
          confirming: t('cancelSlot.confirming'),
          success: t('cancelSlot.success'),
          error: t('cancelSlot.error'),
          blocked: t('cancelPreview.blocked.slot'),
        }
      : {
          title: t('deleteCourse.title'),
          confirm: t('deleteCourse.confirm'),
          confirming: t('deleteCourse.confirming'),
          success: t('deleteCourse.success'),
          error: t('deleteCourse.error'),
          blocked: t('cancelPreview.blocked.schedule'),
        };

  const handleConfirm = () => {
    // Clear first: without this a second stale confirm would leave the notice
    // already on screen and read as "nothing happened".
    setConflict(false);
    // Echo the previewed `version` back so the backend rejects (409) a confirm
    // whose counts went stale between the preview and the click.
    const version = preview.data?.version ?? undefined;
    const params = version ? { expected_version: version } : undefined;
    const options = {
      onSuccess: () => {
        toast.success(labels.success);
        void queryClient.invalidateQueries({ queryKey: getListSlotsQueryKey(venueId) });
        if (target.kind === 'schedule')
          void queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey(venueId) });
        onOpenChange(false);
      },
      onError: (err: unknown) => {
        if (isStalePreviewConflict(err)) {
          setConflict(true);
          void preview.refetch();
          return;
        }
        toast.error(apiErrorMessage(err, labels.error));
      },
    };
    if (target.kind === 'slot') cancelSlot.mutate({ sid: targetId, params }, options);
    else cancelSchedule.mutate({ sid: targetId, params }, options);
  };

  const blocked = preview.data?.blocking_condition != null;
  const rows = preview.data ? previewRows(preview.data, target.kind) : [];
  const canConfirm = preview.isSuccess && !preview.isFetching && !blocked && !confirming;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent restoreFocusTo={restoreFocusTo}>
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{target.description}</DialogDescription>
        </DialogHeader>

        {blocked ? (
          <Alert variant="default">
            <CircleCheckIcon />
            <AlertDescription>{labels.blocked}</AlertDescription>
          </Alert>
        ) : (
          <div className="flex flex-col gap-[18px]">
            {conflict ? (
              <Alert variant="warning">
                <TriangleAlertIcon />
                <AlertDescription>{t('cancelPreview.conflict')}</AlertDescription>
              </Alert>
            ) : null}
            {preview.isError ? (
              <Alert variant="destructive">
                <CircleAlertIcon />
                <AlertDescription>
                  <span>{t('cancelPreview.loadError')}</span>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0"
                    onClick={() => void preview.refetch()}
                  >
                    {t('cancelPreview.retry')}
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{t('cancelPreview.caption')}</p>
                {preview.isSuccess ? <PreviewList rows={rows} /> : <PreviewSkeleton />}
              </>
            )}
          </div>
        )}

        <DialogFooter>
          {blocked ? (
            <DialogClose asChild>
              <Button variant="outline">{t('cancelPreview.close')}</Button>
            </DialogClose>
          ) : (
            <>
              <DialogClose asChild>
                <Button variant="ghost" disabled={confirming}>
                  {t('cancelPreview.back')}
                </Button>
              </DialogClose>
              <Button variant="destructive" onClick={handleConfirm} disabled={!canConfirm}>
                {confirming ? labels.confirming : labels.confirm}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The consequence rows: label over its hint on the left, the count right in tabular numerals, hairlines between. */
function PreviewList({ rows }: { rows: PreviewRow[] }) {
  const t = useTranslations('planning.cancelPreview.rows');
  return (
    <dl className="flex flex-col [&>*+*]:border-t [&>*+*]:border-border">
      {rows.map((row) => (
        <div
          key={row.key}
          className={cn(
            'flex items-start justify-between gap-4 py-3',
            row.muted && 'text-muted-foreground',
          )}
        >
          <dt className="min-w-0 text-base">
            {t(row.key)}
            {row.hint ? (
              <span className="block text-sm text-muted-foreground">
                {t(`${row.hint}Hint`, row.hintValues)}
              </span>
            ) : null}
          </dt>
          <dd className="shrink-0 font-numeric text-base font-medium">
            {row.value === null ? '—' : row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function PreviewSkeleton() {
  return (
    <div className="flex flex-col [&>*+*]:border-t [&>*+*]:border-border" aria-busy>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex h-[42px] items-center justify-between">
          <Skeleton className="h-3.5 w-[220px]" />
          <Skeleton className="h-3.5 w-8" />
        </div>
      ))}
    </div>
  );
}
