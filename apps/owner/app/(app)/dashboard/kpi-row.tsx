'use client';

import type { ReactNode } from 'react';
import { GaugeIcon, ScanLineIcon, UserCheckIcon, UsersIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { AttendanceStats, Member } from '@iziwellpass/api/schemas';
import { MembershipStatus } from '@iziwellpass/api/schemas';
import { Card, CardContent } from '@iziwellpass/ui/components/card';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';

import type { QueryLike } from './use-dashboard-data';

function KpiCard({
  label,
  icon,
  value,
  isLoading,
}: {
  label: string;
  icon: ReactNode;
  value: string | null;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="text-muted-foreground" aria-hidden="true">
            {icon}
          </span>
        </div>
        {isLoading ? (
          <Skeleton className="mt-3 h-8 w-16" />
        ) : (
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums tracking-tight">
            {/* `—` (no data) covers a brand-new venue with no attendance yet
                and any load error — KPIs degrade to a dash rather than a
                heavy alert in the glanceable strip. */}
            {value ?? '—'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * KPI strip, scoped to the selected venue. Three metrics come from the
 * venue attendance endpoint (`getAttendance` — today's check-ins, unique
 * members, occupancy %); "active members" is derived from the org member
 * list (`listMembers`, counting `membership_status === active`). Both queries
 * are lifted to `useDashboardData` so they run in parallel with the rest of
 * the dashboard; the API has no cross-venue aggregation, so this reflects
 * exactly the selected venue.
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

  const iconClass = 'size-[18px]';

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label={t('kpi.checkins')}
        icon={<ScanLineIcon className={iconClass} />}
        isLoading={attendance.isLoading}
        value={stats ? String(stats.total_check_ins) : null}
      />
      <KpiCard
        label={t('kpi.uniqueMembers')}
        icon={<UsersIcon className={iconClass} />}
        isLoading={attendance.isLoading}
        value={stats ? String(stats.unique_members) : null}
      />
      <KpiCard
        label={t('kpi.occupancy')}
        icon={<GaugeIcon className={iconClass} />}
        isLoading={attendance.isLoading}
        value={stats ? `${Math.round(stats.occupancy_pct)} %` : null}
      />
      <KpiCard
        label={t('kpi.activeMembers')}
        icon={<UserCheckIcon className={iconClass} />}
        isLoading={members.isLoading}
        value={activeCount === null ? null : String(activeCount)}
      />
    </div>
  );
}
