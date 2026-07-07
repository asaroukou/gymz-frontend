'use client';

import { useLocale, useTranslations } from 'next-intl';

import { useSession } from '@iziwellpass/auth/provider';
import { Card, CardContent, CardHeader } from '@iziwellpass/ui/components/card';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';

import { useVenueSelection } from '@/lib/use-venue-selection';

import { KpiRow } from './dashboard/kpi-row';
import { RecentCheckins } from './dashboard/recent-checkins';
import { SectionError } from './dashboard/section-error';
import { Starter } from './dashboard/starter';
import { TodaySchedule } from './dashboard/today-schedule';
import { useDashboardData } from './dashboard/use-dashboard-data';
import { VenueSelect } from './dashboard/venue-select';

/**
 * Today's date formatted in the active next-intl locale and the venue's
 * timezone (falls back to the runtime zone if the venue tz is
 * missing/invalid). First letter is capitalised for the header — French
 * weekday names are otherwise lowercase.
 */
function todayLabel(locale: string, timeZone: string | undefined): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  };
  let text: string;
  try {
    text = new Intl.DateTimeFormat(locale, {
      ...options,
      timeZone: timeZone && timeZone.trim().length > 0 ? timeZone : undefined,
    }).format(new Date());
  } catch {
    text = new Intl.DateTimeFormat(locale, options).format(new Date());
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function LoadingGrid() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * The body once a venue is selected. `useDashboardData` initiates every
 * venue-scoped query up front so they fan out in parallel — the KPI /
 * schedule / check-ins sections render optimistically from that shared data.
 * Only the starter-vs-grid decision waits, gated on the schedules + members
 * `isLoading` (so the first-week starter never flashes over the grid).
 */
function DashboardBody({ venueId, timeZone }: { venueId: string; timeZone: string | undefined }) {
  const data = useDashboardData(venueId);
  const { attendance, members, slots, schedules, resources, checkIns } = data;

  if (schedules.isLoading || members.isLoading) {
    return <LoadingGrid />;
  }

  const hasNoSchedules = !schedules.isError && (schedules.data ?? []).length === 0;
  const hasNoMembers = !members.isError && (members.data ?? []).length === 0;

  if (hasNoSchedules && hasNoMembers) {
    return <Starter />;
  }

  return (
    <div className="space-y-6">
      <KpiRow attendance={attendance} members={members} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TodaySchedule
            slots={slots}
            schedules={schedules}
            resources={resources}
            timeZone={timeZone}
          />
        </div>
        <RecentCheckins checkIns={checkIns} members={members} timeZone={timeZone} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const session = useSession();
  const selection = useVenueSelection();

  const email = session.status === 'signed-in' ? session.claims.email : null;
  const name = email ? (email.split('@')[0] ?? email) : null;
  const greeting = name ? t('greeting', { name }) : t('greetingNoName');

  const { venues, isLoading, isError, error, selectedVenueId, selectedVenue } = selection;
  const timeZone = selectedVenue?.timezone;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{greeting}</h1>
          <p className="text-sm text-muted-foreground">{todayLabel(locale, timeZone)}</p>
        </div>
        <VenueSelect selection={selection} />
      </div>

      {isLoading ? (
        <LoadingGrid />
      ) : isError ? (
        <SectionError error={error} fallback={t('errors.venues')} />
      ) : venues.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">{t('venueNone')}</p>
      ) : !selectedVenueId ? (
        <p className="py-12 text-center text-sm text-muted-foreground">{t('venuePrompt')}</p>
      ) : (
        <DashboardBody venueId={selectedVenueId} timeZone={timeZone} />
      )}
    </div>
  );
}
