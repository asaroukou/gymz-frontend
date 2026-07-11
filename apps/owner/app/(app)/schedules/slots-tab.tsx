'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarClockIcon, MoreHorizontalIcon, UsersIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { unwrap } from '@iziwellpass/api/client';
import {
  getListSlotsQueryKey,
  useCancelSlot,
  useListResources,
  useListSchedules,
} from '@iziwellpass/api/generated';
import type { Resource, Schedule, ScheduleSlot } from '@iziwellpass/api/schemas';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Button } from '@iziwellpass/ui/components/button';
import { Card } from '@iziwellpass/ui/components/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@iziwellpass/ui/components/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@iziwellpass/ui/components/dropdown-menu';
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '@iziwellpass/ui/components/empty';
import { Capacity } from '@iziwellpass/ui/components/capacity';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';

import { useAllMembers } from '@/lib/all-members';
import { apiErrorMessage } from '@/lib/api-error';
import { useSlotsByDate } from '@/lib/dated-api';
import { formatTime, venueDateKey, venueToday } from '@/lib/datetime';

import { BookingsSheet } from './bookings-sheet';
import { usePlanningLabels } from './planning-utils';

/**
 * Friendly, venue-local day heading for a slot group: "Aujourd'hui" /
 * "Demain" / "lundi 13 juillet". `dateKey` is the venue-local `YYYY-MM-DD`
 * group key (from `venueDateKey`); relative labels compare against today's
 * and tomorrow's venue-local keys. The weekday/day/month text is formatted in
 * the venue timezone off the slot's real UTC instant, sentence-cased.
 */
function useDayHeading(timeZone: string | undefined) {
  const locale = useLocale();
  const t = useTranslations('planning');

  return useMemo(() => {
    const now = Date.now();
    const todayKey = venueDateKey(new Date(now).toISOString(), timeZone);
    const tomorrowKey = venueDateKey(new Date(now + 24 * 60 * 60 * 1000).toISOString(), timeZone);

    return (dateKey: string, iso: string): string => {
      if (dateKey === todayKey) return t('slots.today');
      if (dateKey === tomorrowKey) return t('slots.tomorrow');
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return dateKey;
      let text: string;
      try {
        text = new Intl.DateTimeFormat(locale, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          timeZone: timeZone && timeZone.trim().length > 0 ? timeZone : undefined,
        }).format(date);
      } catch {
        text = new Intl.DateTimeFormat(locale, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        }).format(date);
      }
      return text.charAt(0).toUpperCase() + text.slice(1);
    };
  }, [locale, t, timeZone]);
}

function CancelSlotDialog({
  slot,
  venueId,
  timeZone,
  open,
  onOpenChange,
}: {
  slot: ScheduleSlot;
  venueId: string;
  timeZone: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('planning');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const cancelSlot = useCancelSlot();

  const handleCancel = () => {
    cancelSlot.mutate(
      { sid: slot.id },
      {
        onSuccess: () => {
          toast.success(t('cancelSlot.success'));
          void queryClient.invalidateQueries({ queryKey: getListSlotsQueryKey(venueId) });
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(apiErrorMessage(err, t('cancelSlot.error')));
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('cancelSlot.title')}</DialogTitle>
          <DialogDescription>
            {t('cancelSlot.description', {
              start: formatTime(slot.start_time, timeZone),
              end: formatTime(slot.end_time, timeZone),
            })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon('cancel')}
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={cancelSlot.isPending}>
            {cancelSlot.isPending ? t('cancelSlot.confirming') : t('cancelSlot.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SlotRow({
  slot,
  title,
  resourceName,
  timeZone,
  canManageSlots,
  onOpenParticipants,
}: {
  slot: ScheduleSlot;
  title: string;
  resourceName: string;
  timeZone: string | undefined;
  canManageSlots: boolean;
  onOpenParticipants: (slot: ScheduleSlot) => void;
}) {
  const t = useTranslations('planning');
  const { slotStatusBadge } = usePlanningLabels();
  const [cancelling, setCancelling] = useState(false);

  const isCancelled = slot.status === 'cancelled';
  const badge = slotStatusBadge(slot.status);
  const venueId = slot.venue_id;

  return (
    <div className="flex items-center gap-4 border-t px-4 py-3 first:border-t-0">
      <span className="w-11 shrink-0 font-mono text-sm tabular-nums">
        {formatTime(slot.start_time, timeZone)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{resourceName}</p>
      </div>
      {isCancelled ? (
        <div className="w-16 shrink-0 sm:w-24" />
      ) : (
        <Capacity
          booked={slot.booked_count}
          capacity={slot.capacity}
          className="w-16 shrink-0 sm:w-24"
          label={t('slots.capacityLabel', {
            booked: slot.booked_count,
            cap: slot.capacity,
          })}
        />
      )}
      <Badge variant={badge.variant} className="shrink-0">
        {badge.label}
      </Badge>
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="outline" onClick={() => onOpenParticipants(slot)}>
          <UsersIcon />
          <span className="hidden sm:inline">{t('slots.participants')}</span>
        </Button>
        {canManageSlots && !isCancelled ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t('slots.rowMenu')}>
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem variant="destructive" onSelect={() => setCancelling(true)}>
                {t('slots.cancel')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      {cancelling ? (
        <CancelSlotDialog
          slot={slot}
          venueId={venueId}
          timeZone={timeZone}
          open={cancelling}
          onOpenChange={setCancelling}
        />
      ) : null}
    </div>
  );
}

export function SlotsTab({
  venueId,
  timeZone,
  canManageSlots,
  canManageBookings,
}: {
  venueId: string;
  timeZone: string | undefined;
  canManageSlots: boolean;
  canManageBookings: boolean;
}) {
  const t = useTranslations('planning');
  const dayHeading = useDayHeading(timeZone);

  // The slots endpoint requires a `date` param the generated client can't send
  // (see lib/dated-api.ts) and returns ONE day of slots. Until the backend
  // supports a range, the Séances tab shows the venue's current day; the
  // group-by-day layout below therefore renders a single "Aujourd'hui" group.
  const slotsQuery = useSlotsByDate(venueId, venueToday(timeZone));
  const schedulesQuery = useListSchedules(venueId, { query: { select: unwrap } });
  const resourcesQuery = useListResources(venueId, { query: { select: unwrap } });
  const membersQuery = useAllMembers();

  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data]);
  const scheduleTitleById = useMemo(
    () => new Map((schedulesQuery.data ?? []).map((s: Schedule) => [s.id, s.title])),
    [schedulesQuery.data],
  );
  const resourceNameById = useMemo(
    () => new Map((resourcesQuery.data ?? []).map((r: Resource) => [r.id, r.name])),
    [resourcesQuery.data],
  );

  const [participantsSlot, setParticipantsSlot] = useState<ScheduleSlot | null>(null);

  const slotsByDate = useMemo(() => {
    const groups = new Map<string, ScheduleSlot[]>();
    for (const slot of slotsQuery.data ?? []) {
      // Group by the venue-local calendar date derived from the slot's real
      // UTC `start_time`, not the raw `date` field — `date` is the slot's UTC
      // calendar date and can disagree with the venue's local date near
      // midnight for non-UTC venues.
      const key = venueDateKey(slot.start_time, timeZone);
      const list = groups.get(key) ?? [];
      list.push(slot);
      groups.set(key, list);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, slots]) => ({
        key,
        slots: slots.sort((a, b) => a.start_time.localeCompare(b.start_time)),
      }));
  }, [slotsQuery.data, timeZone]);

  // Gate on the label-feeding queries too (schedule titles + resource names)
  // so rows never render fallback labels that then flash to real names once
  // the secondary queries resolve. The slots query stays the primary driver.
  if (slotsQuery.isLoading || schedulesQuery.isLoading || resourcesQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Card className="gap-0 py-0">
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (slotsQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{t('errorTitle')}</AlertTitle>
        <AlertDescription>
          {apiErrorMessage(slotsQuery.error, t('slots.loadError'))}
        </AlertDescription>
      </Alert>
    );
  }

  if (slotsByDate.length === 0) {
    return (
      <Card>
        <Empty>
          <EmptyMedia>
            <CalendarClockIcon />
          </EmptyMedia>
          <EmptyTitle>{t('slots.emptyTitle')}</EmptyTitle>
          <EmptyDescription>{t('slots.emptyBody')}</EmptyDescription>
        </Empty>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {slotsByDate.map(({ key, slots }) => {
          const first = slots[0];
          const heading = first ? dayHeading(key, first.start_time) : key;
          return (
            <section key={key} className="space-y-2">
              <h2 className="sticky top-0 z-10 -mx-1 bg-background/95 px-1 py-1 text-sm font-semibold backdrop-blur supports-[backdrop-filter]:bg-background/80">
                {heading}
              </h2>
              <Card className="gap-0 py-0">
                {slots.map((slot) => (
                  <SlotRow
                    key={slot.id}
                    slot={slot}
                    title={scheduleTitleById.get(slot.schedule_id) ?? t('slots.untitled')}
                    resourceName={
                      resourceNameById.get(slot.resource_id) ?? t('slots.unknownResource')
                    }
                    timeZone={timeZone}
                    canManageSlots={canManageSlots}
                    onOpenParticipants={setParticipantsSlot}
                  />
                ))}
              </Card>
            </section>
          );
        })}
      </div>

      {participantsSlot ? (
        <BookingsSheet
          slot={participantsSlot}
          venueId={venueId}
          timeZone={timeZone}
          title={scheduleTitleById.get(participantsSlot.schedule_id) ?? t('slots.untitled')}
          members={members}
          canManageBookings={canManageBookings}
          open={participantsSlot !== null}
          onOpenChange={(next) => {
            if (!next) setParticipantsSlot(null);
          }}
        />
      ) : null}
    </>
  );
}
