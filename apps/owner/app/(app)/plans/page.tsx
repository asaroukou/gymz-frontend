'use client';

import { useTranslations } from 'next-intl';

import { useRole } from '@iziwellpass/auth/provider';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';

import { RequirePageAccess } from '@/components/page-access';
import { apiErrorMessage } from '@/lib/api-error';
import { useVenueContext } from '@/lib/venue-context';

import { PlansHeader, PlansList } from './plans-list';

function PlansContent() {
  const t = useTranslations('plans');
  const role = useRole();
  const canManage = role === 'owner' || role === 'admin';

  const { venues, isLoading, isError, error, selectedVenueId } = useVenueContext();

  // The list owns the header once a venue is selected (the create action
  // needs the venue's activities); the other states draw it themselves.
  if (selectedVenueId && !isLoading && !isError) {
    return <PlansList venueId={selectedVenueId} canManage={canManage} />;
  }

  return (
    <div className="flex flex-col gap-8">
      <PlansHeader />
      {isLoading ? (
        <div className="flex flex-col gap-8" aria-hidden="true">
          <Skeleton className="h-6 w-56" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[14.75rem] w-full rounded-xl" />
            ))}
          </div>
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertTitle>{t('errorTitle')}</AlertTitle>
          <AlertDescription>{apiErrorMessage(error, t('venuesError'))}</AlertDescription>
        </Alert>
      ) : (
        <p className="py-12 text-center text-base text-muted-foreground">
          {venues.length === 0 ? t('venueNone') : t('venuePrompt')}
        </p>
      )}
    </div>
  );
}

export default function PlansPage() {
  return (
    <RequirePageAccess href="/plans">
      <PlansContent />
    </RequirePageAccess>
  );
}
