'use client';

import { useTranslations } from 'next-intl';

import type { AttendanceStats, Member } from '@iziwellpass/api/schemas';
import { MembershipStatus } from '@iziwellpass/api/schemas';
import { Stat, StatPanel } from '@iziwellpass/ui/components/stat';

import type { QueryLike } from './use-dashboard-data';

/**
 * KPI strip, scoped to the selected venue. Three metrics come from the venue
 * attendance endpoint (`getAttendance` — today's check-ins, unique members,
 * occupancy %); "active members" is derived from the org member list
 * (`listMembers`, counting `membership_status === active`). Both queries are
 * lifted to `useDashboardData` so they run in parallel with the rest of the
 * dashboard; the API has no cross-venue aggregation, so this reflects exactly
 * the selected venue. Rendered as one hairline-divided panel (not a grid of
 * metric cards) to stay quiet and off the hero-metric template.
 */
export function KpiRow({
  attendance,
  members,
}: {
  attendance: QueryLike<AttendanceStats>;
  members: QueryLike<Member[]>;
}) {
  const t = useTranslations('dashboard');

  const stats = attendance.isError ? undefined : attendance.data;
  const activeCount = members.isError
    ? null
    : (members.data ?? []).filter((m) => m.membership_status === MembershipStatus.active).length;

  return (
    <StatPanel className="grid-cols-2 xl:grid-cols-4">
      <Stat
        label={t('kpi.checkins')}
        isLoading={attendance.isLoading}
        value={stats ? String(stats.total_check_ins) : null}
      />
      <Stat
        label={t('kpi.uniqueMembers')}
        isLoading={attendance.isLoading}
        value={stats ? String(stats.unique_members) : null}
      />
      <Stat
        label={t('kpi.occupancy')}
        isLoading={attendance.isLoading}
        value={stats ? `${Math.round(stats.occupancy_pct)} %` : null}
      />
      <Stat
        label={t('kpi.activeMembers')}
        isLoading={members.isLoading}
        value={activeCount === null ? null : String(activeCount)}
      />
    </StatPanel>
  );
}
