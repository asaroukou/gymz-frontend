'use client';

import { useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { unwrap } from '@iziwellpass/api/client';
import {
  getListResourcesQueryKey,
  getListResourceTypesQueryKey,
  getListVenueActivitiesQueryKey,
  useAddVenueActivity,
  useListVenueActivities,
  useRemoveVenueActivity,
} from '@iziwellpass/api/generated';
import type { VenueActivity } from '@iziwellpass/api/schemas';
import { Alert, AlertDescription } from '@iziwellpass/ui/components/alert';
import { Button } from '@iziwellpass/ui/components/button';
import { Chip } from '@iziwellpass/ui/components/chip';
import { Combobox } from '@iziwellpass/ui/components/combobox';
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
import { SectionHeading } from '@iziwellpass/ui/components/working-page';

import {
  ACTIVITY_TYPE_VALUES,
  useActivityTypeLabel,
  useActivityTypeOptions,
} from '@/lib/activity-type';
import { apiErrorMessage } from '@/lib/api-error';

// ---------------------------------------------------------------------------
// Activities section
// ---------------------------------------------------------------------------

export function ActivitiesSection({ venueId, canEdit }: { venueId: string; canEdit: boolean }) {
  const t = useTranslations('venues');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const activityLabel = useActivityTypeLabel();
  const allOptions = useActivityTypeOptions();

  const activitiesQuery = useListVenueActivities(venueId, { query: { select: unwrap } });
  const activities = useMemo(() => activitiesQuery.data ?? [], [activitiesQuery.data]);
  const present = useMemo(
    () => new Set(activities.map((a: VenueActivity) => a.activity_type)),
    [activities],
  );
  const options = useMemo(
    () => allOptions.filter((o) => !present.has(o.value as (typeof ACTIVITY_TYPE_VALUES)[number])),
    [allOptions, present],
  );

  const addActivity = useAddVenueActivity();
  const removeActivity = useRemoveVenueActivity();
  const [removing, setRemoving] = useState<VenueActivity | null>(null);

  // Adding/removing an activity seeds/deactivates resource types on the backend.
  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: getListVenueActivitiesQueryKey(venueId) });
    void queryClient.invalidateQueries({ queryKey: getListResourcesQueryKey(venueId) });
    void queryClient.invalidateQueries({ queryKey: getListResourceTypesQueryKey() });
  };

  const handleAdd = (value: string) => {
    addActivity.mutate(
      { id: venueId, data: { activity_type: value as (typeof ACTIVITY_TYPE_VALUES)[number] } },
      {
        onSuccess: invalidateAll,
        onError: (err) => toast.error(apiErrorMessage(err, t('detail.activities.addError'))),
      },
    );
  };

  const handleRemove = () => {
    if (!removing) return;
    removeActivity.mutate(
      { id: venueId, activity: removing.activity_type },
      {
        onSuccess: () => {
          invalidateAll();
          setRemoving(null);
        },
        onError: (err) =>
          toast.error(apiErrorMessage(err, t('detail.activities.removeConfirm.error'))),
      },
    );
  };

  const [pending, setPending] = useState('');
  const addRef = useRef<HTMLButtonElement>(null);

  return (
    <section className="flex flex-col gap-4">
      <SectionHeading
        title={t('detail.activities.title')}
        description={t('detail.activities.subtitle')}
      />
      {activitiesQuery.isLoading ? (
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
      ) : activitiesQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {apiErrorMessage(activitiesQuery.error, t('detail.activities.loadError'))}
          </AlertDescription>
        </Alert>
      ) : activities.length === 0 ? (
        <p className="text-base text-muted-foreground">{t('detail.activities.empty')}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {activities.map((activity: VenueActivity) =>
            canEdit ? (
              <Chip
                key={activity.id}
                onRemove={() => setRemoving(activity)}
                removeLabel={t('detail.activities.removeConfirm.title')}
              >
                {activityLabel(activity.activity_type)}
              </Chip>
            ) : (
              <Chip key={activity.id}>{activityLabel(activity.activity_type)}</Chip>
            ),
          )}
        </div>
      )}

      {canEdit && !activitiesQuery.isLoading && !activitiesQuery.isError ? (
        options.length > 0 ? (
          <div className="flex items-center gap-2">
            <Combobox
              options={options}
              value={pending}
              onValueChange={setPending}
              placeholder={t('detail.activities.add')}
              searchPlaceholder={t('detail.activities.searchPlaceholder')}
              className="flex-1"
            />
            <Button
              ref={addRef}
              type="button"
              variant="outline"
              disabled={!pending || addActivity.isPending}
              onClick={() => {
                handleAdd(pending);
                setPending('');
              }}
            >
              {tCommon('add')}
            </Button>
          </div>
        ) : (
          <p className="text-base text-muted-foreground">{t('detail.activities.allAdded')}</p>
        )
      ) : null}

      <Dialog open={removing !== null} onOpenChange={(next) => !next && setRemoving(null)}>
        <DialogContent className="sm:max-w-[480px]" restoreFocusTo={() => addRef.current}>
          <DialogHeader>
            <DialogTitle>{t('detail.activities.removeConfirm.title')}</DialogTitle>
            <DialogDescription>
              {t('detail.activities.removeConfirm.description', {
                activity: removing ? activityLabel(removing.activity_type) : '',
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">{tCommon('cancel')}</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={removeActivity.isPending}
            >
              {removeActivity.isPending
                ? t('detail.activities.removeConfirm.confirming')
                : t('detail.activities.removeConfirm.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
