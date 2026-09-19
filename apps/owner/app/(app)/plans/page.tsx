'use client';

import { useTranslations } from 'next-intl';

import { useRole } from '@iziwellpass/auth/provider';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';

import { RequirePageAccess } from '@/components/page-access';
import { apiErrorMessage } from '@/lib/api-error';
import { useVenueContext } from '@/lib/venue-context';

import { PlansList } from './plans-list';

function PlansContent() {
  const t = useTranslations('plans');
  const role = useRole();
  const canManage = role === 'owner' || role === 'admin';

  const { venues, isLoading, isError, error, selectedVenueId } = useVenueContext();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-[750] tracking-[-0.035em]">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
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
        <PlansList venueId={selectedVenueId} canManage={canManage} />
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
