'use client';

import { useTranslations } from 'next-intl';

import type { AttendanceStats } from '@iziwellpass/api/schemas';
import { Card, CardContent } from '@iziwellpass/ui/components/card';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';

import type { QueryLike } from './use-frontdesk-data';

function StatTile({
  label,
  value,
  isLoading,
}: {
  label: string;
  value: string | null;
  isLoading: boolean;
}) {
  return (
    <Card className="gap-0 py-4">
      <CardContent className="px-4">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        {isLoading ? (
          <Skeleton className="mt-2 h-6 w-10" />
        ) : (
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums tracking-tight sm:text-2xl">
            {/* Degrade to a dash on no data / error rather than a heavy alert in
                the glanceable strip — mirrors the dashboard KPI treatment. */}
            {value ?? '—'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact day-stats strip for the front desk: today's passages, unique
 * members, and occupancy — sourced from the venue attendance endpoint and
 * rendered as compact mono numbers. Three tiles fit side-by-side from the
 * 375px baseline up.
 */
export function DayStats({ attendance }: { attendance: QueryLike<AttendanceStats> }) {
  const t = useTranslations('frontdesk');
  const stats = attendance.isError ? undefined : attendance.data;

  return (
    <div className="grid grid-cols-3 gap-3">
      <StatTile
        label={t('stats.checkins')}
        value={stats ? String(stats.total_check_ins) : null}
        isLoading={attendance.isLoading}
      />
      <StatTile
        label={t('stats.uniqueMembers')}
        value={stats ? String(stats.unique_members) : null}
        isLoading={attendance.isLoading}
      />
      <StatTile
        label={t('stats.occupancy')}
        value={stats ? `${Math.round(stats.occupancy_pct)} %` : null}
        isLoading={attendance.isLoading}
      />
    </div>
  );
}
