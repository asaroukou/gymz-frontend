'use client';

import { unwrap } from '@iziwellpass/api/client';
import { useListResources, useListSchedules, useListStaff } from '@iziwellpass/api/generated';

import { useAllMembers } from '@/lib/all-members';
import { useAttendanceByDate, useCheckInsByDate, useSlotsByDate } from '@/lib/dated-api';
import { venueToday } from '@/lib/datetime';

export type { QueryLike } from '@/components/checkin/query-like';

/**
 * Initiates every venue-scoped dashboard query in one place so they fan out
 * in parallel on the first render of `DashboardBody`. The shared member list
 * is fetched once and reused by the KPI row, the command bar and the feed;
 * staff resolves instructors on the tiles and « par … » in the feed.
 */
export function useDashboardData(venueId: string, timeZone: string | undefined) {
  // slots / attendance / checkins require a `date` param the generated client
  // can't send — see lib/dated-api.ts. "Today" is the venue-local day.
  const date = venueToday(timeZone);

  const attendance = useAttendanceByDate(venueId, date);
  const members = useAllMembers();
  const slots = useSlotsByDate(venueId, date);
  const schedules = useListSchedules(venueId, { query: { select: unwrap } });
  const resources = useListResources(venueId, { query: { select: unwrap } });
  const checkIns = useCheckInsByDate(venueId, date);
  const staff = useListStaff({ query: { select: unwrap } });

  return { attendance, members, slots, schedules, resources, checkIns, staff };
}
