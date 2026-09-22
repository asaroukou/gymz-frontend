'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { unwrap } from '@iziwellpass/api/client';
import { useGetVenue } from '@iziwellpass/api/generated';
import { useRole } from '@iziwellpass/auth/provider';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { BackLink, WorkingHeader, WorkingPage } from '@iziwellpass/ui/components/working-page';

import { useActivityTypeLabel } from '@/lib/activity-type';
import { VenueGallery } from '@/components/gallery/venue-gallery';
import { RequirePageAccess } from '@/components/page-access';
import { apiErrorMessage } from '@/lib/api-error';
import { useVenueContext } from '@/lib/venue-context';

import { ActivitiesSection } from './activities-section';
import { ProfileSection } from './profile-section';
import { ResourcesSection } from './resources-section';

function VenueDetailContent() {
  const t = useTranslations('venues');
  const activityLabel = useActivityTypeLabel();
  const params = useParams<{ id: string }>();
  const venueId = params.id;
  const role = useRole();
  const canEdit = role === 'owner' || role === 'admin';
  const { setSelectedVenueId } = useVenueContext();

  // Unified venue context: opening a venue's detail page makes it the current
  // venue, so the shell switcher reflects the route (route -> context).
  useEffect(() => {
    if (venueId) {
      setSelectedVenueId(venueId);
    }
  }, [venueId, setSelectedVenueId]);

  const venueQuery = useGetVenue(venueId, { query: { select: unwrap } });

  const backLink = (
    <BackLink href="/venues" linkComponent={Link}>
      {t('detail.back')}
    </BackLink>
  );

  if (venueQuery.isLoading) {
    return (
      <WorkingPage>
        {backLink}
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-10 md:grid-cols-2 md:gap-16">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </WorkingPage>
    );
  }

  if (venueQuery.isError) {
    return (
      <WorkingPage>
        {backLink}
        <Alert variant="destructive">
          <AlertTitle>{t('errorTitle')}</AlertTitle>
          <AlertDescription>
            {apiErrorMessage(venueQuery.error, t('detail.loadError'))}
          </AlertDescription>
        </Alert>
      </WorkingPage>
    );
  }

  const venue = venueQuery.data;
  if (!venue) {
    return (
      <WorkingPage>
        {backLink}
        <p className="text-base text-muted-foreground">{t('detail.notFound')}</p>
      </WorkingPage>
    );
  }

  const subtitle = [venue.address_line, venue.city].filter(Boolean).join(' · ') || t('noAddress');

  return (
    <WorkingPage>
      {backLink}
      <WorkingHeader
        title={venue.name}
        subtitle={subtitle}
        badges={
          <>
            <Badge variant={venue.is_active ? 'success' : 'default'}>
              {venue.is_active ? t('status.active') : t('status.inactive')}
            </Badge>
            <Badge>{activityLabel(venue.venue_type)}</Badge>
          </>
        }
      />
      <div className="grid gap-10 md:grid-cols-2 md:gap-16">
        <ProfileSection venue={venue} canEdit={canEdit} />
        <div className="flex flex-col gap-10">
          <div className="hidden md:block">
            <VenueGallery venueId={venue.id} canEdit={canEdit} variant="section" />
          </div>
          <ActivitiesSection venueId={venue.id} canEdit={canEdit} />
          <ResourcesSection venueId={venue.id} canEdit={canEdit} />
        </div>
      </div>
    </WorkingPage>
  );
}

export default function VenueDetailPage() {
  return (
    <RequirePageAccess href="/venues">
      <VenueDetailContent />
    </RequirePageAccess>
  );
}
