'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { useRole } from '@iziwellpass/auth/provider';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@iziwellpass/ui/components/tabs';

import { RequirePageAccess } from '@/components/page-access';
import { apiErrorMessage } from '@/lib/api-error';
import { useVenueContext } from '@/lib/venue-context';

import { SchedulesTab } from './schedules-tab';
import { SlotsTab } from './slots-tab';

type PlanningTab = 'courses' | 'slots';

function PlanningContent() {
  const t = useTranslations('planning');
  const role = useRole();
  const canManageSchedules = role === 'owner' || role === 'admin';
  const canManageBookings = role === 'owner' || role === 'admin' || role === 'receptionist';

  const { venues, isLoading, isError, error, selectedVenueId, selectedVenue } =
    useVenueContext();
  const timeZone = selectedVenue?.timezone;

  const [tab, setTab] = useState<PlanningTab>('courses');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-9 w-64 rounded-full" />
          <Skeleton className="h-48 w-full" />
        </div>
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
        <Tabs value={tab} onValueChange={(value) => setTab(value as PlanningTab)}>
          <TabsList aria-label={t('tabsLabel')}>
            <TabsTrigger value="courses">{t('tabs.courses')}</TabsTrigger>
            <TabsTrigger value="slots">{t('tabs.slots')}</TabsTrigger>
          </TabsList>
          <TabsContent value="courses" className="mt-4">
            <SchedulesTab venueId={selectedVenueId} canManage={canManageSchedules} />
          </TabsContent>
          <TabsContent value="slots" className="mt-4">
            <SlotsTab
              venueId={selectedVenueId}
              timeZone={timeZone}
              canManageSlots={canManageSchedules}
              canManageBookings={canManageBookings}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

export default function SchedulesPage() {
  return (
    <RequirePageAccess href="/schedules">
      <PlanningContent />
    </RequirePageAccess>
  );
}
