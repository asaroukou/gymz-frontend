'use client';

import { useTranslations } from 'next-intl';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@iziwellpass/ui/components/select';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';

import type { UseVenueSelectionResult } from '@/lib/use-venue-selection';

/**
 * Venue switcher for the front-desk screen. Auto-hidden for single-venue
 * owners (the shared hook auto-selects the only venue); shown when the owner
 * runs more than one venue so the desk can be pointed at one at a time.
 */
export function VenueSelect({ selection }: { selection: UseVenueSelectionResult }) {
  const t = useTranslations('frontdesk');
  const { venues, isLoading, selectedVenueId, setSelectedVenueId } = selection;

  if (isLoading) {
    return <Skeleton className="h-11 w-full rounded-full sm:w-56 lg:h-9" />;
  }

  if (venues.length <= 1) {
    return null;
  }

  return (
    <Select value={selectedVenueId ?? undefined} onValueChange={setSelectedVenueId}>
      <SelectTrigger className="h-11 w-full sm:w-56 lg:h-9">
        <SelectValue placeholder={t('venuePlaceholder')} />
      </SelectTrigger>
      <SelectContent>
        {venues.map((venue) => (
          <SelectItem key={venue.id} value={venue.id}>
            {venue.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
