'use client';

import { unwrap } from '@iziwellpass/api/client';
import { useListStaff } from '@iziwellpass/api/generated';

import { useAllMembers } from '@/lib/all-members';
import { useCheckInsByDate } from '@/lib/dated-api';
import { venueToday } from '@/lib/datetime';
import { useTodaySnapshot } from '@/lib/use-today-snapshot';

export type { QueryLike } from '@/components/checkin/query-like';

/**
 * Initiates every venue-scoped front-desk query in one place so it fans out
 * the day snapshot, check-ins, members and staff in parallel on the first
 * render of the check-in screen. The shared member list is fetched once and
 * reused by the manual-check-in lookup and the live feed (name resolution);
 * staff resolves the "recorded by" label. All four are threaded down as
 * props; a successful check-in invalidates the check-in, attendance and
 * today-snapshot query keys so the feed and stats refresh live.
 */
export function useFrontdeskData(venueId: string, timeZone: string | undefined) {
  // checkins require a `date` param the generated client can't send — see
  // lib/dated-api.ts. The front desk always shows the current day.
  const date = venueToday(timeZone);

  const today = useTodaySnapshot(venueId, date);
  const checkIns = useCheckInsByDate(venueId, date);
  const members = useAllMembers();
  const staff = useListStaff({ query: { select: unwrap } });

  return { today, checkIns, members, staff };
}
