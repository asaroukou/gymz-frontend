'use client';

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { CircleCheckIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';

import { getVenueTodayQueryKey } from '@iziwellpass/api/generated';
import type {
  Member,
  Resource,
  Schedule,
  Staff,
  TodaySlot,
  TodaySnapshot,
} from '@iziwellpass/api/schemas';
import { useRole } from '@iziwellpass/auth/provider';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Button } from '@iziwellpass/ui/components/button';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';

import { useFocusRegistry } from '@/components/focus-registry';
import { isForbidden } from '@/lib/plan-errors';
import { attentionReason, attentionRows, slotTime } from '@/lib/today';

import { BookingsSheet, type SheetSlot } from '../schedules/bookings-sheet';
import { EditScheduleDialog } from '../schedules/schedule-dialogs';
import { SectionError } from './section-error';
import type { QueryLike } from './use-dashboard-data';

function toSheetSlot(slot: TodaySlot): SheetSlot {
  return {
    id: slot.slot_id,
    booked_count: slot.booked_count,
    capacity: slot.capacity,
    start_time: slot.start_utc,
    end_time: slot.end_utc,
  };
}

/**
 * « À régler » (`D2YWBH`, `r5BGk`): today's flagged sessions with one quick
 * fix each, opened in place (spec T5). Closing the sheet or the dialog
 * refetches the snapshot so a fixed row leaves the list.
 */
export function AttentionList({
  venueId,
  timeZone,
  today,
  schedules,
  resources,
  staff,
  members,
  fallbackFocus,
}: {
  venueId: string;
  timeZone: string | undefined;
  today: QueryLike<TodaySnapshot>;
  schedules: Schedule[];
  resources: Resource[];
  staff: Staff[];
  members: Member[];
  /** D12 fallback: the « À régler » tab trigger, focused when the resolved
   * row's own button is already gone from the DOM by the time a sheet or
   * dialog closes (the refetch removed it before focus could be restored). */
  fallbackFocus: RefObject<HTMLElement | null>;
}) {
  const t = useTranslations('dashboard');
  const role = useRole();
  const canEditCourses = role === 'owner' || role === 'admin';
  const canManageBookings = canEditCourses || role === 'receptionist';
  const queryClient = useQueryClient();
  const focus = useFocusRegistry();

  const [sheetSlot, setSheetSlot] = useState<TodaySlot | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<{ schedule: Schedule; slotId: string } | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const scheduleById = useMemo(() => new Map(schedules.map((s) => [s.id, s])), [schedules]);
  const rows = useMemo(() => (today.data ? attentionRows(today.data) : []), [today.data]);

  // D12 fallback, second stage: `restoreFocusTo` below already prefers the
  // fallback when the row's button is already gone by the time a sheet/dialog
  // closes. But the refetch this triggers (`refresh`) can also land *after*
  // Radix has already restored focus onto that same button — the button then
  // unmounts a beat later, and the browser drops focus to <body> on its own.
  // Catch that here, but only for a close *this component* just triggered:
  // the today snapshot also refetches on window focus and on its own 60s
  // interval, and those unrelated refetches must never yank focus into the
  // page just because it happens to be sitting on <body> (e.g. the user is in
  // the browser chrome, or on another tab entirely). `armPendingRestore`
  // records which row's resolution we're watching for and the snapshot in
  // flight when we started watching; the effect below only acts once a *new*
  // snapshot has actually landed, then disarms itself either way so it never
  // stays armed for some unrelated later refetch.
  const pendingRestoreRef = useRef<{ slotId: string; dataAtClose: TodaySnapshot | undefined } | null>(
    null,
  );
  const armPendingRestore = (slotId: string | undefined) => {
    if (slotId) pendingRestoreRef.current = { slotId, dataAtClose: today.data };
  };
  useEffect(() => {
    const pending = pendingRestoreRef.current;
    if (!pending || today.data === pending.dataAtClose) return;
    const stillFlagged = rows.some((row) => row.slot_id === pending.slotId);
    if (!stillFlagged && document.activeElement === document.body) {
      fallbackFocus.current?.focus();
    }
    pendingRestoreRef.current = null;
  }, [today.data, rows, fallbackFocus]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: getVenueTodayQueryKey(venueId) });
  };

  if (today.isLoading) {
    return (
      <div className="flex w-full max-w-[720px] flex-col gap-3" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }
  if (today.isError) {
    return (
      <SectionError
        error={today.error}
        fallback={isForbidden(today.error) ? t('errors.forbidden') : t('errors.today')}
      />
    );
  }
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="grid size-12 place-items-center rounded-full bg-success text-success-foreground">
          <CircleCheckIcon aria-hidden="true" className="size-5" />
        </div>
        <div className="flex max-w-sm flex-col gap-1">
          <p className="text-base font-medium">{t('attention.emptyTitle')}</p>
          <p className="text-base text-muted-foreground">{t('attention.emptyBody')}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ul className="flex w-full max-w-[720px] flex-col divide-y divide-border">
        {rows.map((slot) => {
          const reason = attentionReason(slot) ?? 'unknown';
          const schedule = scheduleById.get(slot.schedule_id);
          // The schedule to edit, or null when the row opens the participants sheet.
          const editable = reason === 'no_instructor' && canEditCourses ? schedule : undefined;
          return (
            <li
              key={slot.slot_id}
              className="flex min-h-16 flex-wrap items-center gap-x-6 gap-y-2 py-3"
            >
              <span className="w-20 font-numeric text-lg">{slotTime(slot, timeZone)}</span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-2 text-base font-medium">
                  <span className="truncate">{slot.title ?? '—'}</span>
                  {slot.lifecycle === 'active' ? (
                    <Badge variant="success">{t('tile.active')}</Badge>
                  ) : null}
                </span>
                <span className="text-sm text-muted-foreground">{slot.resource_name ?? '—'}</span>
              </div>
              <div className="flex w-full flex-wrap items-center justify-end gap-3 md:w-auto">
                <Badge variant="warning">
                  {t(`attention.reason.${reason}`, {
                    booked: slot.booked_count,
                    capacity: slot.capacity,
                  })}
                </Badge>
                <Button
                  ref={focus.register(slot.slot_id)}
                  variant="outline"
                  size="sm"
                  className="max-md:h-11"
                  onClick={() => {
                    if (editable) {
                      setEditing({ schedule: editable, slotId: slot.slot_id });
                      setEditOpen(true);
                    } else {
                      setSheetSlot(slot);
                      setSheetOpen(true);
                    }
                  }}
                >
                  {editable ? t('attention.editCourse') : t('attention.seeRoster')}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {sheetSlot ? (
        <BookingsSheet
          slot={toSheetSlot(sheetSlot)}
          venueId={venueId}
          timeZone={timeZone}
          title={sheetSlot.title ?? '—'}
          dayLabel={t('day.today')}
          resourceName={sheetSlot.resource_name ?? '—'}
          members={members}
          canManageBookings={canManageBookings}
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) {
              armPendingRestore(sheetSlot?.slot_id);
              refresh();
            }
          }}
          restoreFocusTo={() => focus.get(sheetSlot?.slot_id) ?? fallbackFocus.current}
        />
      ) : null}
      {editing ? (
        <EditScheduleDialog
          key={editing.schedule.id}
          venueId={venueId}
          schedule={editing.schedule}
          resources={resources}
          staff={staff}
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) {
              armPendingRestore(editing?.slotId);
              refresh();
            }
          }}
          restoreFocusTo={() => focus.get(editing?.slotId) ?? fallbackFocus.current}
        />
      ) : null}
    </>
  );
}
