'use client';

import Link from 'next/link';

import { ApiError, unwrap } from '@iziwellpass/api/client';
import { useListVenues } from '@iziwellpass/api/generated';
import type { Venue } from '@iziwellpass/api/schemas';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@iziwellpass/ui/components/card';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';

import { RequirePageAccess } from '@/components/page-access';

function addressSummary(venue: Venue): string {
  const parts = [venue.address_line, venue.city, venue.country].filter(
    (part): part is string => !!part,
  );
  return parts.length > 0 ? parts.join(', ') : 'No address on file';
}

function venueTypeLabel(venueType: Venue['venue_type']): string {
  return venueType.replace(/_/g, ' ');
}

function VenueCard({ venue }: { venue: Venue }) {
  return (
    <Link href={`/venues/${venue.id}`}>
      <Card className="h-full transition-colors hover:bg-accent/50">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle>{venue.name}</CardTitle>
            <Badge variant={venue.is_active ? 'default' : 'secondary'}>
              {venue.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <Badge variant="outline" className="capitalize">
            {venueTypeLabel(venue.venue_type)}
          </Badge>
          <p className="text-sm text-muted-foreground">{addressSummary(venue)}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function VenuesGrid() {
  const venuesQuery = useListVenues({ query: { select: unwrap } });

  if (venuesQuery.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (venuesQuery.isError) {
    const err = venuesQuery.error;
    const message =
      err instanceof ApiError ? `Failed to load venues (${err.code})` : 'Failed to load venues';
    return <p className="text-sm text-destructive">{message}</p>;
  }

  const venues = venuesQuery.data ?? [];

  if (venues.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 py-12 text-center">
        <p className="text-sm text-muted-foreground">No venues yet.</p>
        <p className="text-sm text-muted-foreground">
          Venues are created via platform onboarding — contact IziWellPass support to add one.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {venues.map((venue) => (
        <VenueCard key={venue.id} venue={venue} />
      ))}
    </div>
  );
}

export default function VenuesPage() {
  return (
    <RequirePageAccess href="/venues">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Venues</h1>
          <p className="text-sm text-muted-foreground">
            Your tenant&apos;s venues and their bookable resources.
          </p>
        </div>
        <VenuesGrid />
      </div>
    </RequirePageAccess>
  );
}
