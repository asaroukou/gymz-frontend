'use client';

import { ApiError, unwrap } from '@iziwellpass/api/client';
import { useListVenues } from '@iziwellpass/api/generated';
import { useSession } from '@iziwellpass/auth/provider';
import { Card, CardContent, CardHeader, CardTitle } from '@iziwellpass/ui/components/card';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';

function VenuesCard() {
  // SP2 unwrap-typing verification (see SP4 plan header) — verified via a
  // throwaway tsc probe, not guessed. Orval typed `listVenuesResponse` as a
  // `{data, status} & {headers}` envelope, but the mutator (`customFetch`)
  // actually resolves to the raw JSON body cast to `T` — it never builds
  // that wrapper at runtime. So the true runtime value is already
  // `ApiResponseVecVenue` (`{data: Venue[], request_id}`), one level
  // shallower than the TYPE claims. `select: unwrap` type-checks (`unwrap`'s
  // constraint is satisfied by the response union) and TData collapses to
  // `ApiResponseVecVenue | ErrorResponse | undefined` — i.e. TypeScript
  // believes `unwrap` peeled the outer envelope, leaving an object that
  // still has its own `.data`. But `unwrap` ran against the REAL runtime
  // value (already `ApiResponseVecVenue`), so at runtime it already
  // returned `Venue[]` directly — one hop shallower than the type says.
  // `venuesQuery.data.data` below type-checks against the (wrong) TYPE; see
  // the final report for the recommended SP5–SP9 pattern.
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

  // Matches the (mismatched, see above) TYPE: venuesQuery.data is typed as
  // ApiResponseVecVenue | ErrorResponse, both of which carry a `.data` field.
  const venues = venuesQuery.data && 'data' in venuesQuery.data ? venuesQuery.data.data : [];

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
