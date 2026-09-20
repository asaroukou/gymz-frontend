'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarClockIcon, MoreHorizontalIcon } from 'lucide-react';
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
import { Capacity } from '@iziwellpass/ui/components/capacity';
import {
  Dialog,
  DialogClose,
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
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { cn } from '@iziwellpass/ui/lib/utils';

import { RowsSkeleton } from '@/components/rows-skeleton';
import { useAllMembers } from '@/lib/all-members';
import { apiErrorMessage } from '@/lib/api-error';
import { useSlotsByDate } from '@/lib/dated-api';
import { formatTime, venueDateKey, venueToday } from '@/lib/datetime';
import { slotBadgeVariant } from '@/lib/slot-status';

import { BookingsSheet } from './bookings-sheet';
import { usePlanningLabels } from './planning-utils';

/**
 * Friendly, venue-local day heading for a slot group: "Aujourd'hui" /
 * "Demain" / "Lundi 21 septembre". `dateKey` is the venue-local `YYYY-MM-DD`
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
      <DialogContent className="sm:max-w-[480px]">
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
          <DialogClose asChild>
            <Button variant="ghost">{tCommon('cancel')}</Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleCancel} disabled={cancelSlot.isPending}>
            {cancelSlot.isPending ? t('cancelSlot.confirming') : t('cancelSlot.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * One session (canvas `s8ABF`): 18px time, title over the room, a 120px
 * capacity bar with its count, the status badge, « Participants » and « ··· ».
 * 64px tall between hairlines; the row whose sheet is open becomes a grey pill.
 */
function SlotRow({
  slot,
  title,
  resourceName,
  timeZone,
  canManageSlots,
  selected,
  onOpenParticipants,
}: {
  slot: ScheduleSlot;
  title: string;
  resourceName: string;
  timeZone: string | undefined;
  canManageSlots: boolean;
  selected: boolean;
  onOpenParticipants: (slot: ScheduleSlot) => void;
}) {
  const t = useTranslations('planning');
  const { slotStatusLabel } = usePlanningLabels();
  const [cancelling, setCancelling] = useState(false);

  const isCancelled = slot.status === 'cancelled';

  return (
    <div
      data-state={selected ? 'selected' : undefined}
      className={cn(
        'grid grid-cols-[64px_1fr_auto] items-center gap-x-4 gap-y-2 border-b border-border py-[14px] last:border-0 md:grid-cols-[64px_1fr_120px_48px_auto_auto]',
        selected && 'rounded-lg border-transparent bg-secondary',
        isCancelled && 'text-muted-foreground',
      )}
    >
      <span className="font-numeric text-[1.125rem] font-medium">
        {formatTime(slot.start_time, timeZone)}
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-base font-medium">{title}</p>
        <p className="truncate text-sm text-muted-foreground">{resourceName}</p>
      </div>
      <div className="col-start-2 flex items-center gap-3 md:contents">
        {isCancelled ? (
          <div className="hidden md:block" />
        ) : (
          <Capacity
            hideCount
            booked={slot.booked_count}
            capacity={slot.capacity}
            className="w-[120px]"
            label={t('slots.capacityLabel', { booked: slot.booked_count, cap: slot.capacity })}
          />
        )}
        {isCancelled ? (
          <span className="hidden md:block" />
        ) : (
          <span className="font-numeric text-md font-medium text-muted-foreground">{`${slot.booked_count}/${slot.capacity}`}</span>
        )}
        <Badge variant={slotBadgeVariant(slot.status)}>{slotStatusLabel(slot.status)}</Badge>
      </div>
      <div className="col-start-3 row-start-1 flex items-center gap-1 md:col-start-auto md:row-start-auto">
        {/* 44px touch targets below md, the canvas 36px from md up. */}
        <Button
          variant="outline"
          size="sm"
          className="h-11 md:h-9"
          onClick={() => onOpenParticipants(slot)}
        >
          {t('slots.participants')}
        </Button>
        {canManageSlots && !isCancelled ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-11 md:size-9"
                aria-label={t('slots.rowMenu')}
              >
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
      <CancelSlotDialog
        slot={slot}
        venueId={slot.venue_id}
        timeZone={timeZone}
        open={cancelling}
        onOpenChange={setCancelling}
      />
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

  const [sheetSlot, setSheetSlot] = useState<ScheduleSlot | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

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
      <div className="flex flex-col gap-1">
        <Skeleton className="h-7 w-32" />
        <RowsSkeleton />
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
      <Empty>
        <EmptyMedia>
          <CalendarClockIcon />
        </EmptyMedia>
        <EmptyTitle>{t('slots.emptyTitle')}</EmptyTitle>
        <EmptyDescription>{t('slots.emptyBody')}</EmptyDescription>
      </Empty>
    );
  }

  const titleOf = (slot: ScheduleSlot) =>
    scheduleTitleById.get(slot.schedule_id) ?? t('slots.untitled');
  const roomOf = (slot: ScheduleSlot) =>
    resourceNameById.get(slot.resource_id) ?? t('slots.unknownResource');

  return (
    <>
      <div className="flex flex-col gap-8">
        {slotsByDate.map(({ key, slots }) => {
          const first = slots[0];
          const heading = first ? dayHeading(key, first.start_time) : key;
          return (
            <section key={key} className="flex flex-col gap-1">
              <h2 className="text-xl font-medium">{heading}</h2>
              <div className="flex flex-col">
                {slots.map((slot) => (
                  <SlotRow
                    key={slot.id}
                    slot={slot}
                    title={titleOf(slot)}
                    resourceName={roomOf(slot)}
                    timeZone={timeZone}
                    canManageSlots={canManageSlots}
                    selected={sheetOpen && sheetSlot?.id === slot.id}
                    onOpenParticipants={(opened) => {
                      setSheetSlot(opened);
                      setSheetOpen(true);
                    }}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {sheetSlot ? (
        <BookingsSheet
          slot={sheetSlot}
          venueId={venueId}
          timeZone={timeZone}
          title={titleOf(sheetSlot)}
          dayLabel={dayHeading(venueDateKey(sheetSlot.start_time, timeZone), sheetSlot.start_time)}
          resourceName={roomOf(sheetSlot)}
          members={members}
          canManageBookings={canManageBookings}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
        />
      ) : null}
    </>
  );
}
