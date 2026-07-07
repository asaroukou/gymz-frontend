'use client';

import { unwrap } from '@iziwellpass/api/client';
import {
  useGetAttendance,
  useListCheckIns,
  useListMembers,
  useListStaff,
} from '@iziwellpass/api/generated';

/**
 * Structural subset of a react-query result consumed by the front-desk
 * sections — decouples the child components from the exact generated hook
 * return types while staying assignable from `UseQueryResult`.
 */
export interface QueryLike<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}

/**
 * Initiates every venue-scoped front-desk query in one place so they fan out
 * in parallel on the first render of the check-in screen. The shared member
 * list is fetched once and reused by the manual-check-in lookup and the live
 * feed (name resolution); staff resolves the "recorded by" label. All four are
 * threaded down as props; a successful check-in invalidates the check-in +
 * attendance query keys so the feed and stats refresh live.
 */
export function useFrontdeskData(venueId: string) {
  const attendance = useGetAttendance(venueId, { query: { select: unwrap } });
  const checkIns = useListCheckIns(venueId, { query: { select: unwrap } });
  const members = useListMembers({ query: { select: unwrap } });
  const staff = useListStaff({ query: { select: unwrap } });

  return { attendance, checkIns, members, staff };
}
