'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Building2Icon, ChevronsUpDownIcon, PlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useRole } from '@iziwellpass/auth/provider';
import { Button } from '@iziwellpass/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@iziwellpass/ui/components/dropdown-menu';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { cn } from '@iziwellpass/ui/lib/utils';

import { useVenueContext } from '@/lib/venue-context';

/** Matches `/venues/<id>` but not `/venues`, `/venues/new`. Captures the id. */
const VENUE_DETAIL = /^\/venues\/([^/]+)$/;

function venueDetailId(pathname: string): string | null {
  const m = VENUE_DETAIL.exec(pathname);
  const id = m?.[1];
  if (!id || id === 'new') {
    return null;
  }
  return id;
}

export function VenueSwitcher({ className }: { className?: string } = {}) {
  const t = useTranslations('venueSwitcher');
  const router = useRouter();
  const pathname = usePathname();
  const role = useRole();
  const canAddVenue = role === 'owner' || role === 'admin';
  const { venues, isLoading, isError, selectedVenueId, selectedVenue, setSelectedVenueId } =
    useVenueContext();

  if (isLoading) {
    return <Skeleton className={cn('h-9 w-44 rounded-full', className)} />;
  }

  // No venues yet: offer creation to owner/admin, otherwise show nothing.
  if (!isError && venues.length === 0) {
    return canAddVenue ? (
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push('/venues/new')}
        className={cn('justify-start', className)}
      >
        <PlusIcon aria-hidden />
        {t('addVenue')}
      </Button>
    ) : null;
  }

  const onSelect = (id: string) => {
    // Unified model: on a venue-detail route the switcher drives navigation;
    // everywhere else it just updates the shared context.
    setSelectedVenueId(id);
    if (venueDetailId(pathname) !== null) {
      router.push(`/venues/${id}`);
    }
  };

  const triggerLabel = isError ? t('loadError') : (selectedVenue?.name ?? t('placeholder'));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isError}
          aria-label={t('label')}
          className={cn('gap-2', className)}
        >
          <Building2Icon aria-hidden className="shrink-0" />
          <span className="truncate">{triggerLabel}</span>
          <ChevronsUpDownIcon aria-hidden className="ml-auto shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[220px]">
        <DropdownMenuRadioGroup value={selectedVenueId ?? undefined} onValueChange={onSelect}>
          {venues.map((venue) => (
            <DropdownMenuRadioItem key={venue.id} value={venue.id}>
              {venue.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        {canAddVenue ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push('/venues/new')}>
              <PlusIcon aria-hidden />
              {t('addVenue')}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
