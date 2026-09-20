'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { unwrap } from '@iziwellpass/api/client';
import { useListResources, useListStaff } from '@iziwellpass/api/generated';
import { useRole } from '@iziwellpass/auth/provider';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@iziwellpass/ui/components/tabs';
import { WorkingHeader, WorkingPage } from '@iziwellpass/ui/components/working-page';

import { RequirePageAccess } from '@/components/page-access';
import { RowsSkeleton } from '@/components/rows-skeleton';
import { apiErrorMessage } from '@/lib/api-error';
import { useVenueContext } from '@/lib/venue-context';

import { AddScheduleDialog } from './schedule-dialogs';
import { SchedulesTab } from './schedules-tab';
import { SlotsTab } from './slots-tab';

type PlanningTab = 'courses' | 'slots';

function PlanningContent() {
  const t = useTranslations('planning');
  const role = useRole();
  const canManageSchedules = role === 'owner' || role === 'admin';
  const canManageBookings = role === 'owner' || role === 'admin' || role === 'receptionist';

  const { venues, isLoading, isError, error, selectedVenueId, selectedVenue } = useVenueContext();
  const timeZone = selectedVenue?.timezone;

  // The header's « Ajouter un cours » needs the venue's rooms and the staff
  // list; the tabs query the same keys, so react-query serves one fetch.
  const resourcesQuery = useListResources(selectedVenueId ?? '', {
    query: { select: unwrap, enabled: selectedVenueId != null },
  });
  const staffQuery = useListStaff({ query: { select: unwrap } });
  const resources = useMemo(() => resourcesQuery.data ?? [], [resourcesQuery.data]);
  const staff = useMemo(() => staffQuery.data ?? [], [staffQuery.data]);

  const [tab, setTab] = useState<PlanningTab>('courses');

  const action =
    canManageSchedules && selectedVenueId ? (
      <AddScheduleDialog venueId={selectedVenueId} resources={resources} staff={staff} />
    ) : null;

  return (
    <WorkingPage>
      <WorkingHeader title={t('title')} subtitle={t('subtitle')} action={action} />

      {isLoading ? (
        <div className="flex flex-col gap-8">
          <Skeleton className="h-10 w-64 rounded-full" />
          <RowsSkeleton />
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertTitle>{t('errorTitle')}</AlertTitle>
          <AlertDescription>{apiErrorMessage(error, t('venuesError'))}</AlertDescription>
        </Alert>
      ) : venues.length === 0 ? (
        <p className="py-12 text-center text-base text-muted-foreground">{t('venueNone')}</p>
      ) : !selectedVenueId ? (
        <p className="py-12 text-center text-base text-muted-foreground">{t('venuePrompt')}</p>
      ) : (
        <Tabs value={tab} onValueChange={(value) => setTab(value as PlanningTab)} className="gap-8">
          <TabsList aria-label={t('tabsLabel')}>
            <TabsTrigger value="courses">{t('tabs.courses')}</TabsTrigger>
            <TabsTrigger value="slots">{t('tabs.slots')}</TabsTrigger>
          </TabsList>
          <TabsContent value="courses">
            <SchedulesTab venueId={selectedVenueId} canManage={canManageSchedules} />
          </TabsContent>
          <TabsContent value="slots">
            <SlotsTab
              venueId={selectedVenueId}
              timeZone={timeZone}
              canManageSlots={canManageSchedules}
              canManageBookings={canManageBookings}
            />
          </TabsContent>
        </Tabs>
      )}
    </WorkingPage>
  );
}

export default function SchedulesPage() {
  return (
    <RequirePageAccess href="/schedules">
      <PlanningContent />
    </RequirePageAccess>
  );
}
