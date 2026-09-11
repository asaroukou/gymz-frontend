'use client';

import { useTranslations } from 'next-intl';

import type { AttendanceStats } from '@iziwellpass/api/schemas';
import { Stat, StatPanel } from '@iziwellpass/ui/components/stat';

import { useCountUp } from '@/lib/use-count-up';

import type { QueryLike } from './use-frontdesk-data';

/**
 * Compact day-stats strip for the front desk: today's passages, unique
 * members, and occupancy, from the venue attendance endpoint. One
 * hairline-divided panel (not metric cards); reflows to 2-up on a phone so the
 * mono figures don't cram at 375px, then 3-across from `sm`.
 */
export function DayStats({ attendance }: { attendance: QueryLike<AttendanceStats> }) {
  const t = useTranslations('frontdesk');
  const stats = attendance.isError ? undefined : attendance.data;
  // Occupancy eases up when a check-in lands (see useCountUp); the other two
  // figures snap. Tabular mono numerals keep the digits from jittering.
  const occupancy = useCountUp(stats ? Math.round(stats.occupancy_pct) : 0);

  return (
    <StatPanel className="grid-cols-2 sm:grid-cols-3">
      <Stat
        label={t('stats.checkins')}
        value={stats ? String(stats.total_check_ins) : null}
        isLoading={attendance.isLoading}
      />
      <Stat
        label={t('stats.uniqueMembers')}
        value={stats ? String(stats.unique_members) : null}
        isLoading={attendance.isLoading}
      />
      <Stat
        label={t('stats.occupancy')}
        value={stats ? `${occupancy} %` : null}
        isLoading={attendance.isLoading}
        className="col-span-2 sm:col-span-1"
      />
    </StatPanel>
  );
}
