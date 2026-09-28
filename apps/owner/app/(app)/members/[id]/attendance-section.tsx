'use client';

import { useMemo, useState } from 'react';
import { LoaderCircleIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useInfiniteQuery } from '@tanstack/react-query';

import { memberAttendance } from '@iziwellpass/api/generated';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Button } from '@iziwellpass/ui/components/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@iziwellpass/ui/components/select';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@iziwellpass/ui/components/tabs';
import { SectionHeading } from '@iziwellpass/ui/components/working-page';

import { apiErrorMessage } from '@/lib/api-error';
import {
  ATTENDANCE_PAGE_SIZE,
  ATTENDANCE_PERIODS,
  type AttendancePeriod,
  attendanceRange,
  kindLabelKey,
  lastVisit,
  methodBadge,
  visitMoment,
} from '@/lib/attendance';
import { useVenueContext } from '@/lib/venue-context';

/** One visit row (canvas `caWdo`): day/time at a fixed 140px, then venue/kind, then the method badge. */
function VisitRow({
  item,
  multi,
}: {
  item: { id: string; venue_name: string; checked_in_at: string; method: string; kind: string };
  multi: boolean;
}) {
  const t = useTranslations('members');
  const locale = useLocale();
  const moment = visitMoment(item.checked_in_at, locale);
  const badge = methodBadge(item.method);

  return (
    <div className="flex flex-col gap-2 border-b border-border py-3 last:border-0 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex flex-col font-numeric text-sm text-muted-foreground sm:w-[140px] sm:shrink-0">
        <span>{moment.day}</span>
        <span>{moment.time}</span>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          {multi ? <span className="truncate text-sm text-foreground">{item.venue_name}</span> : null}
          <span className="text-sm text-muted-foreground">{t(kindLabelKey(item.kind))}</span>
        </div>
        <Badge variant={badge.variant} className="shrink-0">
          {t(badge.labelKey)}
        </Badge>
      </div>
    </div>
  );
}

/**
 * « Présences » (canvas `caWdo` left column, states `Z9CwGl`, phone `TOqY8`):
 * a member's visit history over a rolling 7/30/90-day window, optionally
 * scoped to one venue. Text-only summary, no weekly strip (INVENTORY.md §9).
 */
export function AttendanceSection({ memberId }: { memberId: string }) {
  const t = useTranslations('members');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const { venues } = useVenueContext();
  const multi = venues.length >= 2;

  const [period, setPeriod] = useState<AttendancePeriod>(30);
  const [venueId, setVenueId] = useState<string | 'all'>('all');

  // Recomputed (not just memoized on `period`) when the venue changes too: a
  // fresh `now` snapshot keeps the window's `to` from drifting stale across a
  // quick period/venue switch.
  const range = useMemo(() => attendanceRange(period, new Date()), [period, venueId]);

  const query = useInfiniteQuery({
    queryKey: ['members', memberId, 'attendance', range.from, range.to, venueId],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      memberAttendance(
        memberId,
        pageParam
          ? { cursor: pageParam, limit: ATTENDANCE_PAGE_SIZE }
          : {
              from: range.from,
              to: range.to,
              limit: ATTENDANCE_PAGE_SIZE,
              ...(venueId !== 'all' ? { venue_id: venueId } : {}),
            },
        { signal },
      ),
    getNextPageParam: (last) => last.data.next_cursor ?? null,
  });

  const first = query.data?.pages[0]?.data;
  const items = query.data?.pages.flatMap((p) => p.data.items) ?? [];

  const controls = (
    <div className="flex flex-nowrap items-center gap-4 overflow-x-auto">
      <Tabs
        value={String(period)}
        onValueChange={(value) => setPeriod(Number(value) as AttendancePeriod)}
        className="shrink-0"
      >
        <TabsList>
          {ATTENDANCE_PERIODS.map((days) => (
            <TabsTrigger key={days} value={String(days)}>
              {t('attendance.period', { days })}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {multi ? (
        <Select value={venueId} onValueChange={setVenueId}>
          <SelectTrigger className="shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('attendance.allVenues')}</SelectItem>
            {venues.map((venue) => (
              <SelectItem key={venue.id} value={venue.id}>
                {venue.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );

  let summary: string | null = null;
  if (first) {
    const parts = [t('attendance.count', { count: first.total_visits, days: period })];
    const lv = lastVisit(first.last_visit_at, locale, new Date());
    if (lv.kind === 'today') parts.push(t('attendance.lastToday', { time: lv.time }));
    else if (lv.kind === 'yesterday') parts.push(t('attendance.lastYesterday', { time: lv.time }));
    else if (lv.kind === 'date') parts.push(t('attendance.lastDate', { date: lv.date }));
    summary = parts.join(' · ');
  }

  return (
    <section className="flex flex-col gap-4">
      <SectionHeading title={t('attendance.title')} />
      {query.isLoading ? (
        <>
          <Skeleton className="h-4 w-64" />
          {controls}
          <div className="flex flex-col">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-border py-3 last:border-0">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="ml-auto h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </>
      ) : query.isError && !first ? (
        <>
          {controls}
          <div className="flex flex-col items-start gap-3">
            <p className="text-base text-foreground">{apiErrorMessage(query.error, t('attendance.error'))}</p>
            <Button variant="outline" size="sm" onClick={() => void query.refetch()} disabled={query.isFetching}>
              {tCommon('retry')}
            </Button>
          </div>
        </>
      ) : first ? (
        <>
          <p className="font-numeric text-sm text-muted-foreground">{summary}</p>
          {controls}
          {first.total_visits === 0 ? (
            <div className="flex flex-col gap-1">
              {first.last_visit_at ? (
                <>
                  <p className="text-base text-foreground">{t('attendance.emptyPeriod', { days: period })}</p>
                  {(() => {
                    const lv = lastVisit(first.last_visit_at, locale, new Date());
                    return lv.kind === 'date' ? (
                      <p className="text-base text-foreground">
                        {t('attendance.lastDateSentence', { date: lv.date })}
                      </p>
                    ) : null;
                  })()}
                </>
              ) : (
                <p className="text-base text-foreground">{t('attendance.never')}</p>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-col">
                {items.map((item) => (
                  <VisitRow key={item.id} item={item} multi={multi} />
                ))}
              </div>
              {query.hasNextPage ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => void query.fetchNextPage()}
                  disabled={query.isFetchingNextPage}
                >
                  {query.isFetchingNextPage ? <LoaderCircleIcon aria-hidden className="animate-spin" /> : null}
                  {t('showMore')}
                </Button>
              ) : null}
            </>
          )}
        </>
      ) : null}
    </section>
  );
}
