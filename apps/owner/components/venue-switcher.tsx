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
import { Tooltip, TooltipContent, TooltipTrigger } from '@iziwellpass/ui/components/tooltip';
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

export function VenueSwitcher({
  className,
  compact = false,
  iconOnly = false,
}: { className?: string; compact?: boolean; iconOnly?: boolean } = {}) {
  const t = useTranslations('venueSwitcher');
  const router = useRouter();
  const pathname = usePathname();
  const role = useRole();
  const canAddVenue = role === 'owner' || role === 'admin';
  const { venues, isLoading, isError, selectedVenueId, selectedVenue, setSelectedVenueId } =
    useVenueContext();

  if (isLoading) {
    return (
      <Skeleton
        className={cn(
          iconOnly ? 'size-11' : compact ? 'h-10 w-40' : 'h-11 w-full',
          'rounded-full',
          className,
        )}
      />
    );
  }

  // No venues yet: offer creation to owner/admin, otherwise show nothing.
  if (!isError && venues.length === 0) {
    if (iconOnly) {
      return canAddVenue ? (
        <Button
          variant="outline"
          size="icon"
          aria-label={t('addVenue')}
          onClick={() => router.push('/venues/new')}
          className={className}
        >
          <PlusIcon aria-hidden />
        </Button>
      ) : null;
    }
    return canAddVenue ? (
      <Button
        variant="outline"
        size={compact ? 'sm' : 'default'}
        onClick={() => router.push('/venues/new')}
        className={cn('justify-start gap-2.5', compact ? 'max-w-full' : 'w-full', className)}
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

  // The rail variant: a 44px round outline with the building mark; the venue
  // name lives in a tooltip and in the accessible name.
  const trigger = iconOnly ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            disabled={isError}
            aria-label={`${t('label')} · ${triggerLabel}`}
            className={className}
          >
            <Building2Icon aria-hidden className="text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
      </TooltipTrigger>
      <TooltipContent side="right">{triggerLabel}</TooltipContent>
    </Tooltip>
  ) : (
    <DropdownMenuTrigger asChild>
      <Button
        variant="outline"
        size={compact ? 'sm' : 'default'}
        disabled={isError}
        aria-label={t('label')}
        className={cn('justify-start gap-2.5', compact ? 'max-w-full' : 'w-full', className)}
      >
        <Building2Icon aria-hidden className="shrink-0 text-muted-foreground" />
        <span className="truncate text-md font-medium">{triggerLabel}</span>
        <ChevronsUpDownIcon aria-hidden className="ml-auto size-4 shrink-0 text-muted-foreground" />
      </Button>
    </DropdownMenuTrigger>
  );

  return (
    <DropdownMenu>
      {trigger}
      <DropdownMenuContent align="start" className="min-w-[236px]">
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
