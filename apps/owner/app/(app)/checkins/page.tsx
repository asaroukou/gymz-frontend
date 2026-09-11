'use client';

import { useTranslations } from 'next-intl';

import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Card, CardContent } from '@iziwellpass/ui/components/card';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';

import { RequirePageAccess } from '@/components/page-access';
import { apiErrorMessage } from '@/lib/api-error';
import { useVenueContext } from '@/lib/venue-context';

import { DayStats } from './day-stats';
import { RecentCheckins } from './recent-checkins';
import { RegisterPanel } from './register-panel';
import { useFrontdeskData } from './use-frontdesk-data';

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="gap-0 py-4">
            <CardContent className="space-y-2 px-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-10" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    </div>
  );
}

/**
 * The desk once a venue is selected. `useFrontdeskData` fans out the attendance,
 * check-in, member and staff queries in parallel; the stats strip, register
 * panel and live feed render from that shared data. A successful check-in in the
 * panel invalidates the check-in + attendance query keys, so the feed and stats
 * update live.
 */
function FrontdeskBody({ venueId, timeZone }: { venueId: string; timeZone: string | undefined }) {
  const { attendance, checkIns, members, staff } = useFrontdeskData(venueId, timeZone);

  // Front-desk-first ordering: on a phone the capture panel comes before the
  // stats so the receptionist reaches the QR field without scrolling; the
  // day-stats strip drops just below it. On a wide screen the stats span the
  // top and the capture panel + live feed sit side by side.
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="order-2 lg:order-1 lg:col-span-2">
        <DayStats attendance={attendance} />
      </div>
      <div className="order-1 lg:order-2">
        <RegisterPanel venueId={venueId} members={members} />
      </div>
      <div className="order-3">
        <RecentCheckins checkIns={checkIns} members={members} staff={staff} timeZone={timeZone} />
      </div>
    </div>
  );
}

function FrontdeskContent() {
  const t = useTranslations('frontdesk');
  const { venues, isLoading, isError, error, selectedVenueId, selectedVenue } = useVenueContext();
  const timeZone = selectedVenue?.timezone;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <Alert variant="destructive">
          <AlertTitle>{t('errorTitle')}</AlertTitle>
          <AlertDescription>{apiErrorMessage(error, t('venuesError'))}</AlertDescription>
        </Alert>
      ) : venues.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">{t('venueNone')}</p>
      ) : !selectedVenueId ? (
        <p className="py-12 text-center text-sm text-muted-foreground">{t('venuePrompt')}</p>
      ) : (
        <FrontdeskBody venueId={selectedVenueId} timeZone={timeZone} />
      )}
    </div>
  );
}

export default function CheckinsPage() {
  return (
    <RequirePageAccess href="/checkins">
      <FrontdeskContent />
    </RequirePageAccess>
  );
}
