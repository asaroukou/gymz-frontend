'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { CalendarPlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { Resource, Schedule, ScheduleSlot } from '@iziwellpass/api/schemas';
import { useRole } from '@iziwellpass/auth/provider';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Button } from '@iziwellpass/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@iziwellpass/ui/components/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@iziwellpass/ui/components/empty';
import { Progress } from '@iziwellpass/ui/components/progress';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';

import { canAccessPath } from '@/lib/nav';
import { formatTime, venueDateKey } from '@/lib/datetime';

import { SectionError } from './section-error';
import type { QueryLike } from './use-dashboard-data';

/**
 * Capacity bar colour: full/over → destructive, tight (>85%) → warning,
 * otherwise the default primary indicator. Mirrors the design system's
 * status colours (no gradients / tinted panels).
 */
function capacityIndicatorClass(booked: number, capacity: number, isFull: boolean): string {
  if (isFull) return 'bg-destructive';
  const pct = capacity > 0 ? (booked / capacity) * 100 : 0;
  if (pct > 85) return 'bg-warning';
  return '';
}

function SlotRow({
  slot,
  title,
  resourceName,
  timeZone,
}: {
  slot: ScheduleSlot;
  title: string;
  resourceName: string;
  timeZone: string | undefined;
}) {
  const t = useTranslations('dashboard');
  const isCancelled = slot.status === 'cancelled';
  const isFull = slot.status === 'full' || slot.booked_count >= slot.capacity;
  const pct = slot.capacity > 0 ? Math.min(100, (slot.booked_count / slot.capacity) * 100) : 0;
  const capacityText = `${slot.booked_count}/${slot.capacity}`;

  return (
    <div className="flex items-center gap-4 border-t py-3 first:border-t-0 first:pt-0">
      <span className="w-11 shrink-0 font-mono text-sm tabular-nums">
        {formatTime(slot.start_time, timeZone)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{resourceName}</p>
      </div>
      {isCancelled ? (
        <Badge variant="outline">{t('schedule.cancelled')}</Badge>
      ) : (
        <div className="w-24 shrink-0">
          <p className="mb-1 text-right font-mono text-xs tabular-nums text-muted-foreground">
            {capacityText}
          </p>
          <Progress
            value={pct}
            indicatorClassName={capacityIndicatorClass(slot.booked_count, slot.capacity, isFull)}
            aria-label={t('schedule.capacityLabel', {
              booked: slot.booked_count,
              cap: slot.capacity,
            })}
          />
        </div>
      )}
      {isFull && !isCancelled ? <Badge variant="destructive">{t('schedule.full')}</Badge> : null}
    </div>
  );
}

export function TodaySchedule({
  slots,
  schedules,
  resources,
  timeZone,
}: {
  slots: QueryLike<ScheduleSlot[]>;
  schedules: QueryLike<Schedule[]>;
  resources: QueryLike<Resource[]>;
  timeZone: string | undefined;
}) {
  const t = useTranslations('dashboard');
  const role = useRole();
  const canCreateSchedule = role === 'owner' || role === 'admin';

  const scheduleTitleById = useMemo(
    () => new Map((schedules.data ?? []).map((s) => [s.id, s.title])),
    [schedules.data],
  );
  const resourceNameById = useMemo(
    () => new Map((resources.data ?? []).map((r) => [r.id, r.name])),
    [resources.data],
  );

  const todaySlots = useMemo(() => {
    const todayKey = venueDateKey(new Date().toISOString(), timeZone);
    return (slots.data ?? [])
      .filter((slot) => venueDateKey(slot.start_time, timeZone) === todayKey)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [slots.data, timeZone]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('schedule.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {slots.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : slots.isError ? (
          <SectionError error={slots.error} fallback={t('errors.slots')} />
        ) : todaySlots.length === 0 ? (
          <Empty>
            <EmptyMedia>
              <CalendarPlusIcon />
            </EmptyMedia>
            <EmptyTitle>{t('schedule.emptyTitle')}</EmptyTitle>
            <EmptyDescription>{t('schedule.emptyBody')}</EmptyDescription>
            {canCreateSchedule && canAccessPath(role, '/schedules') ? (
              <EmptyContent>
                <Button asChild>
                  <Link href="/schedules">{t('schedule.emptyCta')}</Link>
                </Button>
              </EmptyContent>
            ) : null}
          </Empty>
        ) : (
          <div>
            {todaySlots.map((slot) => (
              <SlotRow
                key={slot.id}
                slot={slot}
                title={scheduleTitleById.get(slot.schedule_id) ?? '—'}
                resourceName={resourceNameById.get(slot.resource_id) ?? '—'}
                timeZone={timeZone}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
