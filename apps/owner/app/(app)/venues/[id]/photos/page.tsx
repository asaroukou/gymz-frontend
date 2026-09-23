'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { unwrap } from '@iziwellpass/api/client';
import { useGetVenue } from '@iziwellpass/api/generated';
import { useRole } from '@iziwellpass/auth/provider';
import { BackLink, WorkingPage } from '@iziwellpass/ui/components/working-page';

import { VenueGallery } from '@/components/gallery/venue-gallery';
import { RequirePageAccess } from '@/components/page-access';

/** Canvas `keCrj`: the phone Photos screen (works at every width, spec G8). */
function VenuePhotosContent() {
  const t = useTranslations('venues');
  const { id: venueId } = useParams<{ id: string }>();
  const role = useRole();
  const canEdit = role === 'owner' || role === 'admin';
  const venueQuery = useGetVenue(venueId, { query: { select: unwrap } });
  return (
    <WorkingPage>
      <BackLink href={`/venues/${venueId}`} linkComponent={Link}>
        {venueQuery.data?.name ?? t('detail.back')}
      </BackLink>
      <VenueGallery venueId={venueId} canEdit={canEdit} variant="screen" />
    </WorkingPage>
  );
}

export default function VenuePhotosPage() {
  return (
    <RequirePageAccess href="/venues">
      <VenuePhotosContent />
    </RequirePageAccess>
  );
}
