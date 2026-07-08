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
 * WORKAROUND — backend contract gap (tracked for the backend team in
 * `docs/backend-issues.md`).
 *
 * The live GMS API REQUIRES a `date=YYYY-MM-DD` query parameter on three
 * venue-scoped GET endpoints:
 *   - GET /gms/v1/venues/{vid}/slots
 *   - GET /gms/v1/venues/{vid}/attendance
 *   - GET /gms/v1/venues/{vid}/checkins
 * Omitting it returns 400 VALIDATION_ERROR ("Missing required query
 * parameter: date"). BUT the OpenAPI spec (openapi.json, generated from the
 * Rust `iziwellpass-openapi` annotations) declares these operations with only
 * the `vid` path parameter — so the Orval-generated hooks physically cannot
 * send `date`, and every call 400s.
 *
 * We are NOT regenerating the client here (the fix belongs in the backend's
 * OpenAPI annotations). Instead we call the same endpoints through the shared
 * `customFetch` mutator — preserving auth-token injection, ApiError mapping,
 * and 401 handling — with `date` appended manually. The query keys reuse the
 * generated key factories as a prefix, so existing invalidations
 * (`getListSlotsQueryKey` / `getGetAttendanceQueryKey` /
 * `getListCheckInsQueryKey`) still match these entries.
 *
 * Once the backend adds `date` to those operations in its OpenAPI, delete this
 * file and switch the call sites back to the generated `useListSlots` /
 * `useGetAttendance` / `useListCheckIns` hooks passing the param normally.
 *
 * `date` MUST be the venue-local calendar day — use `venueToday(timeZone)`
 * from `lib/datetime.ts`, never the browser's date.
 */

interface DatedQueryOptions {
  /** Additional gate on top of the built-in venueId/date presence check. */
  enabled?: boolean;
}

function withDate(url: string, date: string): string {
  return `${url}?date=${encodeURIComponent(date)}`;
}

/** Slots for a venue on a single calendar day (venue tz). */
export function useSlotsByDate(venueId: string, date: string, options?: DatedQueryOptions) {
  return useQuery({
    queryKey: [...getListSlotsQueryKey(venueId), { date }],
    queryFn: () =>
      customFetch<ApiResponseVecScheduleSlot>(withDate(getListSlotsUrl(venueId), date), {
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
      customFetch<ApiResponseAttendanceStats>(withDate(getGetAttendanceUrl(venueId), date), {
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
      customFetch<ApiResponseVecCheckIn>(withDate(getListCheckInsUrl(venueId), date), {
        method: 'GET',
      }),
    select: unwrap,
    enabled: (options?.enabled ?? true) && Boolean(venueId) && Boolean(date),
  });
}
