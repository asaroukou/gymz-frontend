'use client';

import Link from 'next/link';
import { Building2Icon, PlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { unwrap } from '@iziwellpass/api/client';
import { useListVenues } from '@iziwellpass/api/generated';
import type { Venue } from '@iziwellpass/api/schemas';
import { useRole } from '@iziwellpass/auth/provider';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Button } from '@iziwellpass/ui/components/button';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { Tile, TileMeta, TileTitle, TileTop } from '@iziwellpass/ui/components/tile';
import { cn } from '@iziwellpass/ui/lib/utils';

import { RequirePageAccess } from '@/components/page-access';
import { useActivityTypeLabel } from '@/lib/activity-type';
import { apiErrorMessage } from '@/lib/api-error';

/**
 * One venue as a tall tinted tile that links to its page: the building mark
 * and the status badge on top, the name and « type · ville » at the bottom.
 * An inactive venue takes the côté tone (canvas `EjThs`).
 */
function VenueTile({ venue, index }: { venue: Venue; index: number }) {
  const t = useTranslations('venues');
  const activityLabel = useActivityTypeLabel();

  return (
    <li className="contents">
      <Link href={`/venues/${venue.id}`} className="block rounded-xl">
        <Tile
          aspect="tall"
          tint={index}
          className={cn('min-h-[13.75rem] gap-8 p-6', !venue.is_active && 'bg-side')}
        >
          <TileTop className="items-center">
            <Building2Icon className="size-[22px] text-muted-strong" aria-hidden="true" />
            <Badge variant={venue.is_active ? 'success' : 'default'}>
              {venue.is_active ? t('status.active') : t('status.inactive')}
            </Badge>
          </TileTop>
          <div>
            <TileTitle className="text-[1.25rem]">{venue.name}</TileTitle>
            <TileMeta className="text-md">
              {activityLabel(venue.venue_type)} · {venue.city || t('noAddress')}
            </TileMeta>
          </div>
        </Tile>
      </Link>
    </li>
  );
}

function VenuesGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-[13.75rem] w-full rounded-xl" />
      ))}
    </div>
  );
}

function VenuesContent() {
  const t = useTranslations('venues');
  const role = useRole();
  const canManage = role === 'owner' || role === 'admin';
  const venuesQuery = useListVenues({ query: { select: unwrap } });
  const venues = venuesQuery.data ?? [];

  const createAction = canManage ? (
    <Button asChild>
      <Link href="/venues/new">
        <PlusIcon aria-hidden="true" />
        {t('create.cta')}
      </Link>
    </Button>
  ) : null;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-normal">{t('title')}</h1>
          {venuesQuery.isLoading ? (
            <Skeleton className="h-5 w-32" />
          ) : venuesQuery.isError ? null : (
            <p className="text-base text-muted-foreground">
              {t('subtitle', { count: venues.length })}
            </p>
          )}
        </div>
        {venuesQuery.isError || venues.length > 0 ? (
          <div className="pt-1">{createAction}</div>
        ) : null}
      </div>

      {venuesQuery.isLoading ? (
        <VenuesGridSkeleton />
      ) : venuesQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>{t('errorTitle')}</AlertTitle>
          <AlertDescription>{apiErrorMessage(venuesQuery.error, t('loadError'))}</AlertDescription>
        </Alert>
      ) : venues.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="flex flex-col gap-1">
            <p className="text-base">{t('empty.title')}</p>
            <p className="max-w-[28rem] text-base text-muted-foreground">{t('empty.body')}</p>
          </div>
          {createAction}
        </div>
      ) : (
        <ul className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((venue, index) => (
            <VenueTile key={venue.id} venue={venue} index={index} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default function VenuesPage() {
  return (
    <RequirePageAccess href="/venues">
      <VenuesContent />
    </RequirePageAccess>
  );
}
