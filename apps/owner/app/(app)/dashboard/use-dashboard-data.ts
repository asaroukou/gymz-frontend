'use client';

import { unwrap } from '@iziwellpass/api/client';
import { useListMembers, useListResources, useListSchedules } from '@iziwellpass/api/generated';

import { useAttendanceByDate, useCheckInsByDate, useSlotsByDate } from '@/lib/dated-api';
import { venueToday } from '@/lib/datetime';

/**
 * Structural subset of a react-query result that the dashboard sections
 * consume. Decouples the child components from the exact generated hook
 * return types while staying assignable from `UseQueryResult`.
 */
export interface QueryLike<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}

/**
 * Initiates every venue-scoped dashboard query in one place so they fan out
 * in parallel on the first render of `DashboardBody` — rather than serially
 * waterfalling behind the starter-vs-grid decision. The results are threaded
 * down to the KPI / schedule / check-ins sections as props; the shared member
 * list is fetched once here and reused by both the KPI row and the feed.
 */
export function useDashboardData(venueId: string, timeZone: string | undefined) {
  // slots / attendance / checkins require a `date` param the generated client
  // can't send — see lib/dated-api.ts. "Today" is the venue-local day.
  const date = venueToday(timeZone);

  const attendance = useAttendanceByDate(venueId, date);
  const members = useListMembers({ query: { select: unwrap } });
  const slots = useSlotsByDate(venueId, date);
  const schedules = useListSchedules(venueId, { query: { select: unwrap } });
  const resources = useListResources(venueId, { query: { select: unwrap } });
  const checkIns = useCheckInsByDate(venueId, date);

  return { attendance, members, slots, schedules, resources, checkIns };
}
