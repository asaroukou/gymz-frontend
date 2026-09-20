'use client';

import { useTranslations } from 'next-intl';

import type { AttendanceStats } from '@iziwellpass/api/schemas';
import { Stat, StatPanel } from '@iziwellpass/ui/components/stat';

import { useCountUp } from '@/lib/use-count-up';
import { useIsDesktop } from '@/lib/use-is-desktop';

import type { QueryLike } from './use-frontdesk-data';

/**
 * The front desk's three-stat hairline strip: passages, unique members (the
 * short « Uniques » on a phone, as drawn), occupancy. Occupancy eases up when
 * a check-in lands (useCountUp); the other two snap.
 */
export function DayStats({ attendance }: { attendance: QueryLike<AttendanceStats> }) {
  const t = useTranslations('frontdesk');
  const isDesktop = useIsDesktop();
  const stats = attendance.isError ? undefined : attendance.data;
  const occupancy = useCountUp(stats ? Math.round(stats.occupancy_pct) : 0);

  return (
    <StatPanel>
      <Stat
        label={t('stats.checkins')}
        value={stats ? String(stats.total_check_ins) : null}
        isLoading={attendance.isLoading}
      />
      <Stat
        label={isDesktop ? t('stats.uniqueMembers') : t('stats.uniqueMembersShort')}
        value={stats ? String(stats.unique_members) : null}
        isLoading={attendance.isLoading}
      />
      <Stat
        label={t('stats.occupancy')}
        value={stats ? `${occupancy} %` : null}
        isLoading={attendance.isLoading}
      />
    </StatPanel>
  );
}
