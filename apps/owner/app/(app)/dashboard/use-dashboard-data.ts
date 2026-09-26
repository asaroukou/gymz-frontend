'use client';

import { unwrap } from '@iziwellpass/api/client';
import { useListResources, useListSchedules, useListStaff } from '@iziwellpass/api/generated';

import { useAllMembers } from '@/lib/all-members';
import { useCheckInsByDate } from '@/lib/dated-api';
import { venueToday } from '@/lib/datetime';
import { useNow } from '@/lib/use-now';
import { useTodaySnapshot } from '@/lib/use-today-snapshot';

export type { QueryLike } from '@/components/checkin/query-like';

/**
 * Initiates every venue-scoped dashboard query in one place so they fan out
 * in parallel on the first render of `DashboardBody`. `today` is the venue-day
 * snapshot (tiles, « À régler », stats); schedules, resources and staff feed
 * the in-place « Modifier le cours » dialog and the feed; the member list is
 * shared by the KPI row, the command bar, the feed and the participants sheet.
 */
export function useDashboardData(venueId: string, timeZone: string | undefined) {
  // Re-render at least once a minute so `todayKey` follows the clock — a
  // dashboard left open across midnight otherwise keeps yesterday's day key
  // until some unrelated state change forces a render (spec: « Aujourd'hui »
  // must mean the new day on the next render).
  useNow(60_000);
  const todayKey = venueToday(timeZone);

  const today = useTodaySnapshot(venueId, todayKey);
  const members = useAllMembers();
  const schedules = useListSchedules(venueId, { query: { select: unwrap } });
  const resources = useListResources(venueId, { query: { select: unwrap } });
  const checkIns = useCheckInsByDate(venueId, todayKey);
  const staff = useListStaff({ query: { select: unwrap } });

  return { today, todayKey, members, schedules, resources, checkIns, staff };
}
