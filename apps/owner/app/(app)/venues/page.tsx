'use client';

import Link from 'next/link';
import { Building2Icon, MapPinIcon, PlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { unwrap } from '@iziwellpass/api/client';
import { useListVenues } from '@iziwellpass/api/generated';
import type { Venue } from '@iziwellpass/api/schemas';
import { useRole } from '@iziwellpass/auth/provider';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Button } from '@iziwellpass/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@iziwellpass/ui/components/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@iziwellpass/ui/components/empty';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';

import { RequirePageAccess } from '@/components/page-access';
import { useActivityTypeLabel } from '@/lib/activity-type';
import { apiErrorMessage } from '@/lib/api-error';

function VenueCard({ venue }: { venue: Venue }) {
  const t = useTranslations('venues');
  const activityLabel = useActivityTypeLabel();

  return (
    <Link href={`/venues/${venue.id}`}>
      <Card className="h-full transition-colors hover:bg-accent/40">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{venue.name}</CardTitle>
            <Badge variant={venue.is_active ? 'success' : 'secondary'}>
              {venue.is_active ? t('status.active') : t('status.inactive')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Badge variant="outline">{activityLabel(venue.venue_type)}</Badge>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPinIcon className="size-4 shrink-0" aria-hidden />
            <span>{venue.city || t('noAddress')}</span>
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function VenuesGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-40 w-full" />
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-normal">{t('title')}</h1>
          {venuesQuery.isLoading ? (
            <Skeleton className="h-4 w-32" />
          ) : venuesQuery.isError ? null : (
            <p className="text-sm text-muted-foreground">
              {t('subtitle', { count: venues.length })}
            </p>
          )}
        </div>
        {canManage ? (
          <Button asChild>
            <Link href="/venues/new">
              <PlusIcon aria-hidden />
              {t('create.cta')}
            </Link>
          </Button>
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
        <Card>
          <Empty>
            <EmptyMedia>
              <Building2Icon />
            </EmptyMedia>
            <EmptyTitle>{t('empty.title')}</EmptyTitle>
            <EmptyDescription>{t('empty.body')}</EmptyDescription>
            {canManage ? (
              <EmptyContent>
                <Button asChild>
                  <Link href="/venues/new">
                    <PlusIcon aria-hidden />
                    {t('create.cta')}
                  </Link>
                </Button>
              </EmptyContent>
            ) : null}
          </Empty>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((venue) => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </div>
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
