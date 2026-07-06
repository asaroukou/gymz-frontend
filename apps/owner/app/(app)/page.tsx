'use client';

import { ApiError, unwrap } from '@iziwellpass/api/client';
import { useListVenues } from '@iziwellpass/api/generated';
import { useSession } from '@iziwellpass/auth/provider';
import { Card, CardContent, CardHeader, CardTitle } from '@iziwellpass/ui/components/card';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';

function VenuesCard() {
  // Canonical SP5–SP9 hooks pattern: `select: unwrap` peels the
  // `{ data, request_id }` envelope that customFetch actually resolves to,
  // so `venuesQuery.data` is `Venue[] | undefined` — typed AND
  // runtime-correct (generated types now match the mutator's runtime shape;
  // see packages/api/orval.config.ts's includeHttpResponseReturnType: false).
  // Reuse this select-unwrap + `instanceof ApiError` shape for every
  // generated query hook rather than reaching into `.data.data` by hand.
  const venuesQuery = useListVenues({ query: { select: unwrap } });

  if (venuesQuery.isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
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
    return <p className="text-sm text-muted-foreground">No venues yet.</p>;
  }

  return (
    <ul className="space-y-1 text-sm">
      {venues.map((venue) => (
        <li key={venue.id}>{venue.name}</li>
      ))}
    </ul>
  );
}

export default function DashboardPage() {
  const session = useSession();
  const email = session.status === 'signed-in' ? session.claims.email : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Welcome{email ? `, ${email}` : ''}</h1>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Venues</CardTitle>
        </CardHeader>
        <CardContent>
          <VenuesCard />
        </CardContent>
      </Card>
    </div>
  );
}
