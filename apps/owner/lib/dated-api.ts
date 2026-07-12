'use client';

import { useQuery } from '@tanstack/react-query';

import { customFetch, unwrap } from '@iziwellpass/api/client';
import {
  getGetAttendanceQueryKey,
  getGetAttendanceUrl,
  getListCheckInsQueryKey,
  getListCheckInsUrl,
  getListSlotsQueryKey,
  getListSlotsUrl,
} from '@iziwellpass/api/generated';
import type {
  ApiResponseAttendanceStats,
  ApiResponseVecCheckIn,
  ApiResponseVecScheduleSlot,
} from '@iziwellpass/api/schemas';

/**
 * Venue-scoped GETs scoped to a single calendar day. The slots, attendance, and
 * check-ins endpoints all take a `date=YYYY-MM-DD` query parameter, now modelled
 * in the OpenAPI spec, so `date` is passed through the generated URL builders.
 *
 * These stay thin wrappers (rather than the raw generated hooks) so every call
 * site shares one `{ date }` query-key suffix — register/check-in mutations
 * invalidate `getListSlotsQueryKey` / `getGetAttendanceQueryKey` /
 * `getListCheckInsQueryKey` and still match these entries — and one
 * venueId/date `enabled` gate.
 *
 * `date` MUST be the venue-local calendar day — use `venueToday(timeZone)` from
 * `lib/datetime.ts`, never the browser's date.
 */

interface DatedQueryOptions {
  /** Additional gate on top of the built-in venueId/date presence check. */
  enabled?: boolean;
}

/** Slots for a venue on a single calendar day (venue tz). */
export function useSlotsByDate(venueId: string, date: string, options?: DatedQueryOptions) {
  return useQuery({
    queryKey: [...getListSlotsQueryKey(venueId), { date }],
    queryFn: () =>
      customFetch<ApiResponseVecScheduleSlot>(getListSlotsUrl(venueId, { date }), {
        method: 'GET',
      }),
    select: unwrap,
    enabled: (options?.enabled ?? true) && Boolean(venueId) && Boolean(date),
  });
}

/** Attendance statistics for a venue on a single calendar day (venue tz). */
export function useAttendanceByDate(venueId: string, date: string, options?: DatedQueryOptions) {
  return useQuery({
    queryKey: [...getGetAttendanceQueryKey(venueId), { date }],
    queryFn: () =>
      customFetch<ApiResponseAttendanceStats>(getGetAttendanceUrl(venueId, { date }), {
        method: 'GET',
      }),
    select: unwrap,
    enabled: (options?.enabled ?? true) && Boolean(venueId) && Boolean(date),
  });
}

/** Recent check-ins for a venue on a single calendar day (venue tz). */
export function useCheckInsByDate(venueId: string, date: string, options?: DatedQueryOptions) {
  return useQuery({
    queryKey: [...getListCheckInsQueryKey(venueId), { date }],
    queryFn: () =>
      customFetch<ApiResponseVecCheckIn>(getListCheckInsUrl(venueId, { date }), {
        method: 'GET',
      }),
    select: unwrap,
    enabled: (options?.enabled ?? true) && Boolean(venueId) && Boolean(date),
  });
}
