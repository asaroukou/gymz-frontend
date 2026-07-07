'use client';

import { useTranslations } from 'next-intl';

import { unwrap } from '@iziwellpass/api/client';
import { useListMembers, useListSchedules } from '@iziwellpass/api/generated';
import { useSession } from '@iziwellpass/auth/provider';
import { Card, CardContent, CardHeader } from '@iziwellpass/ui/components/card';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';

import { useVenueSelection } from '@/lib/use-venue-selection';

import { KpiRow } from './dashboard/kpi-row';
import { RecentCheckins } from './dashboard/recent-checkins';
import { SectionError } from './dashboard/section-error';
import { Starter } from './dashboard/starter';
import { TodaySchedule } from './dashboard/today-schedule';
import { VenueSelect } from './dashboard/venue-select';

/**
 * Today's date in French, formatted in the venue's timezone (falls back to
 * the runtime zone if the venue tz is missing/invalid). First letter is
 * capitalised for the header — French weekday names are otherwise lowercase.
 */
function frenchToday(timeZone: string | undefined): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  };
  let text: string;
  try {
    text = new Intl.DateTimeFormat('fr-FR', {
      ...options,
      timeZone: timeZone && timeZone.trim().length > 0 ? timeZone : undefined,
    }).format(new Date());
  } catch {
    text = new Intl.DateTimeFormat('fr-FR', options).format(new Date());
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
 * The body once a venue is selected. Decides between the first-week starter
 * (venue has no schedules AND no members) and the normal KPI + schedule +
 * check-ins grid. The schedules/members queries here are shared (react-query
 * dedupes) with the KPI row and today's schedule below.
 */
function DashboardBody({ venueId, timeZone }: { venueId: string; timeZone: string | undefined }) {
  const schedulesQuery = useListSchedules(venueId, { query: { select: unwrap } });
  const membersQuery = useListMembers({ query: { select: unwrap } });

  if (schedulesQuery.isLoading || membersQuery.isLoading) {
    return <LoadingGrid />;
  }

  const hasNoSchedules = !schedulesQuery.isError && (schedulesQuery.data ?? []).length === 0;
  const hasNoMembers = !membersQuery.isError && (membersQuery.data ?? []).length === 0;

  if (hasNoSchedules && hasNoMembers) {
    return <Starter />;
  }

  return (
    <div className="space-y-6">
      <KpiRow venueId={venueId} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TodaySchedule venueId={venueId} timeZone={timeZone} />
        </div>
        <RecentCheckins venueId={venueId} timeZone={timeZone} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const t = useTranslations('dashboard');
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
          <p className="text-sm text-muted-foreground">{frenchToday(timeZone)}</p>
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
