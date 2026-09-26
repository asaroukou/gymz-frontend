'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ImageOffIcon, PlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { unwrap } from '@iziwellpass/api/client';
import { useListVenues } from '@iziwellpass/api/generated';
import type { Venue } from '@iziwellpass/api/schemas';
import { useRole } from '@iziwellpass/auth/provider';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Button } from '@iziwellpass/ui/components/button';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { tintClass, tintForIndex } from '@iziwellpass/ui/lib/tints';
import { cn } from '@iziwellpass/ui/lib/utils';

import { useCapabilities } from '@/components/capabilities/capabilities-provider';
import { LockedButton } from '@/components/capabilities/locked-button';
import { RequirePageAccess } from '@/components/page-access';
import { useActivityTypeLabel } from '@/lib/activity-type';
import { apiErrorMessage } from '@/lib/api-error';

/**
 * One venue as a bordered tile that links to its page (canvas `p96Uq`): a
 * 130px band on top shows the cover photo, else the venue's tint with a
 * crossed-out image mark (grey when inactive), the status badge in its corner;
 * the name and « type · ville » sit below.
 */
function VenueTile({ venue, index }: { venue: Venue; index: number }) {
  const t = useTranslations('venues');
  const activityLabel = useActivityTypeLabel();
  return (
    <li className="contents">
      <Link
        href={`/venues/${venue.id}`}
        className="flex flex-col overflow-hidden rounded-xl border border-border hover:bg-side/60"
      >
        <div
          className={cn(
            'relative flex h-[130px] items-center justify-center',
            venue.cover_image_url
              ? 'bg-secondary'
              : venue.is_active
                ? tintClass(tintForIndex(index))
                : 'bg-side',
          )}
        >
          {venue.cover_image_url ? (
            <Image
              src={venue.cover_image_url}
              alt=""
              fill
              unoptimized
              sizes="(min-width: 1024px) 33vw, 100vw"
              className="object-cover"
            />
          ) : (
            <ImageOffIcon className="size-[22px] text-muted-strong" aria-hidden="true" />
          )}
          <Badge
            variant={venue.is_active ? 'success' : 'default'}
            className="absolute top-3 left-3"
          >
            {venue.is_active ? t('status.active') : t('status.inactive')}
          </Badge>
        </div>
        <div className="flex flex-col gap-1.5 p-5">
          <p className="text-[1.25rem] font-medium">{venue.name}</p>
          <p className="text-md text-muted-foreground">
            {activityLabel(venue.venue_type)} · {venue.city || t('noAddress')}
          </p>
        </div>
      </Link>
    </li>
  );
}

function VenuesGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-[232px] w-full rounded-xl" />
      ))}
    </div>
  );
}

function VenuesContent() {
  const t = useTranslations('venues');
  const tCap = useTranslations('capabilities');
  const role = useRole();
  const canManage = role === 'owner' || role === 'admin';
  const { isLocked } = useCapabilities();
  const venuesQuery = useListVenues({ query: { select: unwrap } });
  const venues = venuesQuery.data ?? [];

  const createAction = canManage ? (
    venues.length > 0 && isLocked('multi_venue') ? (
      <LockedButton capability="multi_venue" action={tCap('action.venueCreate')}>
        {t('create.cta')}
      </LockedButton>
    ) : (
      <Button asChild>
        <Link href="/venues/new">
          <PlusIcon aria-hidden="true" />
          {t('create.cta')}
        </Link>
      </Button>
    )
  ) : null;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
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
        {venuesQuery.isError || venues.length > 0 ? createAction : null}
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
