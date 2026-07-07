'use client';

import { unwrap } from '@iziwellpass/api/client';
import {
  useGetAttendance,
  useListCheckIns,
  useListMembers,
  useListResources,
  useListSchedules,
  useListSlots,
} from '@iziwellpass/api/generated';

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
export function useDashboardData(venueId: string) {
  const attendance = useGetAttendance(venueId, { query: { select: unwrap } });
  const members = useListMembers({ query: { select: unwrap } });
  const slots = useListSlots(venueId, { query: { select: unwrap } });
  const schedules = useListSchedules(venueId, { query: { select: unwrap } });
  const resources = useListResources(venueId, { query: { select: unwrap } });
  const checkIns = useListCheckIns(venueId, { query: { select: unwrap } });

  return { attendance, members, slots, schedules, resources, checkIns };
}
