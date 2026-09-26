'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRightIcon, CircleAlertIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { TodaySlot, TodaySnapshot } from '@iziwellpass/api/schemas';
import { useRole } from '@iziwellpass/auth/provider';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Button } from '@iziwellpass/ui/components/button';
import { Capacity } from '@iziwellpass/ui/components/capacity';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { Tile, TileMeta, TileTime, TileTitle, TileTop } from '@iziwellpass/ui/components/tile';

import { canAccessPath } from '@/lib/nav';
import { isForbidden } from '@/lib/plan-errors';
import {
  pickTiles,
  resolveDay,
  slotTime,
  tileState,
  type DaySelection,
  type TileBadge,
  type TileTone,
} from '@/lib/today';
import { useTodaySnapshot } from '@/lib/use-today-snapshot';

import { DayControl } from './day-control';
import { SectionError } from './section-error';
import type { QueryLike } from './use-dashboard-data';

// Lifecycle tints on this surface only (spec §4.2, `s8LRy3`); other tile
// surfaces keep the positional Tile Rule.
const TONE_TINT: Record<TileTone, 'bleu' | 'vert'> = {
  upcoming: 'bleu',
  active: 'vert',
  completed: 'bleu',
  cancelled: 'bleu',
};
const TONE_CLASS: Partial<Record<TileTone, string>> = {
  completed: 'bg-side',
  cancelled: 'bg-side',
};
const BADGE_VARIANT: Record<TileBadge, 'warning' | 'success' | 'default'> = {
  attention: 'warning',
  active: 'success',
  completed: 'default',
  cancelled: 'default',
};

function SessionTile({ slot, timeZone }: { slot: TodaySlot; timeZone: string | undefined }) {
  const t = useTranslations('dashboard');
  const state = tileState(slot);
  const isCancelled = state.tone === 'cancelled';
  const meta = `${slot.resource_name ?? '—'} · ${slot.instructor_name ?? t('tile.noInstructor')}`;
  return (
    <Tile tint={TONE_TINT[state.tone]} className={TONE_CLASS[state.tone]}>
      <TileTop>
        <TileTime>{slotTime(slot, timeZone)}</TileTime>
        {state.badge ? (
          <Badge variant={BADGE_VARIANT[state.badge]}>{t(`tile.${state.badge}`)}</Badge>
        ) : null}
      </TileTop>
      <div className="flex flex-col gap-2">
        <div>
          <TileTitle>{slot.title ?? '—'}</TileTitle>
          <TileMeta>{meta}</TileMeta>
        </div>
        {isCancelled ? null : (
          <>
            <Capacity
              booked={slot.booked_count}
              capacity={slot.capacity}
              hideCount
              label={t('tile.capacityLabel', {
                booked: slot.booked_count,
                capacity: slot.capacity,
              })}
            />
            <p className="font-numeric text-sm text-muted-strong">
              {t('tile.stats', {
                arrived: slot.checked_in_count,
                booked: slot.booked_count,
                capacity: slot.capacity,
              })}
            </p>
          </>
        )}
        {state.reason && state.reason !== 'unknown' ? (
          <p className="flex items-center gap-1.5 text-sm font-medium text-warning-foreground">
            <CircleAlertIcon aria-hidden="true" className="size-3.5" />
            {t(`attention.reason.${state.reason}`, {
              booked: slot.booked_count,
              capacity: slot.capacity,
            })}
          </p>
        ) : null}
      </div>
    </Tile>
  );
}

/**
 * « Planning du jour »: the date control, « Voir les N séances du jour → »,
 * then up to four lifecycle tiles (`s8LRy3`). Today's tiles read the shared
 * snapshot; another day runs its own snapshot query (spec T4).
 */
export function TodayTiles({
  venueId,
  timeZone,
  todayKey,
  today,
}: {
  venueId: string;
  timeZone: string | undefined;
  todayKey: string;
  today: QueryLike<TodaySnapshot>;
}) {
  const t = useTranslations('dashboard');
  const role = useRole();
  const canCreateSchedule =
    (role === 'owner' || role === 'admin') && canAccessPath(role, '/schedules');

  const [selection, setSelection] = useState<DaySelection>({ kind: 'today' });
  const day = resolveDay(selection, todayKey);
  const isToday = day === todayKey;
  const other = useTodaySnapshot(venueId, isToday ? null : day);
  const query: QueryLike<TodaySnapshot> = isToday ? today : other;

  const { tiles, total } = useMemo(() => pickTiles(query.data?.slots ?? []), [query.data]);

  let body: ReactNode;
  if (query.isLoading) {
    body = (
      <div className="grid w-full grid-cols-2 gap-4 lg:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full rounded-xl" />
        ))}
      </div>
    );
  } else if (query.isError) {
    body = (
      <SectionError
        error={query.error}
        fallback={isForbidden(query.error) ? t('errors.forbidden') : t('errors.today')}
      />
    );
  } else if (tiles.length === 0) {
    body = isToday ? (
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
    ) : (
      <p className="py-6 text-center text-base text-muted-foreground">{t('day.emptyOther')}</p>
    );
  } else {
    body = (
      <>
        <Link
          href="/schedules"
          className="inline-flex items-center gap-2 text-md font-medium text-muted-foreground hover:text-foreground"
        >
          {t('schedule.seeAll', { count: total })}
          <ArrowRightIcon aria-hidden="true" className="size-4" />
        </Link>
        <ul className="grid w-full grid-cols-2 gap-4 lg:grid-cols-4">
          {tiles.map((slot) => (
            <li key={slot.slot_id} className="contents">
              <SessionTile slot={slot} timeZone={timeZone} />
            </li>
          ))}
        </ul>
      </>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-10">
      <DayControl selection={selection} onChange={setSelection} todayKey={todayKey} />
      {body}
    </div>
  );
}
