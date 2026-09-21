'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRightIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { Resource, Schedule, ScheduleSlot, Staff } from '@iziwellpass/api/schemas';
import { useRole } from '@iziwellpass/auth/provider';
import { Button } from '@iziwellpass/ui/components/button';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import {
  Tile,
  TileCount,
  TileMeta,
  TileTime,
  TileTitle,
  TileTop,
} from '@iziwellpass/ui/components/tile';

import { formatTime } from '@/lib/datetime';
import { canAccessPath } from '@/lib/nav';
import { isSlotFull, pickTodayTiles, tileTone } from '@/lib/today-tiles';

import { SectionError } from './section-error';
import type { QueryLike } from './use-dashboard-data';

/**
 * Today's sessions as four square tiles — time and « booked/capacity » on
 * top, title and « Salle · Instructeur · Complet » at the bottom — then the
 * « Voir les N séances du jour » link to the planning. Tints rotate by
 * position; a full session takes sable, a cancelled one the côté tone.
 */
export function TodayTiles({
  slots,
  schedules,
  resources,
  staff,
  timeZone,
}: {
  slots: QueryLike<ScheduleSlot[]>;
  schedules: QueryLike<Schedule[]>;
  resources: QueryLike<Resource[]>;
  staff: QueryLike<Staff[]>;
  timeZone: string | undefined;
}) {
  const t = useTranslations('dashboard');
  const role = useRole();
  const canCreateSchedule =
    (role === 'owner' || role === 'admin') && canAccessPath(role, '/schedules');

  const scheduleById = useMemo(
    () => new Map((schedules.data ?? []).map((s) => [s.id, s])),
    [schedules.data],
  );
  const resourceNameById = useMemo(
    () => new Map((resources.data ?? []).map((r) => [r.id, r.name])),
    [resources.data],
  );
  const staffNameById = useMemo(
    () => new Map((staff.data ?? []).map((s) => [s.id, `${s.first_name} ${s.last_name}`.trim()])),
    [staff.data],
  );
  const { tiles, total } = useMemo(
    () => pickTodayTiles(slots.data, timeZone),
    [slots.data, timeZone],
  );

  if (slots.isLoading) {
    return (
      <div className="grid w-full grid-cols-2 gap-4 lg:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (slots.isError) {
    return <SectionError error={slots.error} fallback={t('errors.slots')} />;
  }
  if (tiles.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="flex flex-col gap-1">
          <p className="text-base">{t('schedule.emptyTitle')}</p>
          <p className="text-base text-muted-foreground">{t('schedule.emptyBody')}</p>
        </div>
        {canCreateSchedule ? (
          <Button asChild variant="secondary">
            <Link href="/schedules">{t('schedule.emptyCta')}</Link>
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-12">
      <ul className="grid w-full grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((slot, index) => {
          const tone = tileTone(slot, index);
          const isCancelled = slot.status === 'cancelled';
          const schedule = scheduleById.get(slot.schedule_id);
          const instructor = schedule?.instructor_staff_id
            ? staffNameById.get(schedule.instructor_staff_id)
            : undefined;
          const meta = isCancelled
            ? t('schedule.cancelled')
            : [
                resourceNameById.get(slot.resource_id) ?? '—',
                instructor,
                isSlotFull(slot) ? t('schedule.full') : undefined,
              ]
                .filter(Boolean)
                .join(' · ');
          return (
            <li key={slot.id} className="contents">
              <Tile
                tint={tone === 'side' ? index : tone}
                className={tone === 'side' ? 'bg-side' : undefined}
              >
                <TileTop>
                  <TileTime>{formatTime(slot.start_time, timeZone)}</TileTime>
                  {isCancelled ? null : (
                    <TileCount>
                      {slot.booked_count}/{slot.capacity}
                    </TileCount>
                  )}
                </TileTop>
                <div>
                  <TileTitle>{schedule?.title ?? '—'}</TileTitle>
                  <TileMeta>{meta}</TileMeta>
                </div>
              </Tile>
            </li>
          );
        })}
      </ul>
      <Link
        href="/schedules"
        className="inline-flex items-center gap-2 text-md font-medium text-muted-foreground hover:text-foreground"
      >
        {t('schedule.seeAll', { count: total })}
        <ArrowRightIcon aria-hidden="true" className="size-4" />
      </Link>
    </div>
  );
}
