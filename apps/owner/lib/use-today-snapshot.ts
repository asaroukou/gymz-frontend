'use client';

import { unwrap } from '@iziwellpass/api/client';
import { useVenueToday } from '@iziwellpass/api/generated';
import type { TodayAttendance, TodaySnapshot } from '@iziwellpass/api/schemas';

import type { QueryLike } from '@/components/checkin/query-like';

/**
 * The venue-day snapshot (`GET /venues/{id}/today`). `date` is always sent as
 * the venue-local `YYYY-MM-DD` so the dashboard, the Accueil strip and the
 * check-in invalidation share one cache entry per day (spec T3). A null date
 * disables the query (the tiles' second day when it equals today).
 */
export function useTodaySnapshot(venueId: string, date: string | null) {
  return useVenueToday(
    venueId,
    { date: date ?? '' },
    { query: { select: unwrap, enabled: Boolean(venueId && date) } },
  );
}

/** The day's attendance rollup as its own query-like, for the stat strips. */
export function attendanceOf(query: QueryLike<TodaySnapshot>): QueryLike<TodayAttendance> {
  return {
    data: query.data?.attendance,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
