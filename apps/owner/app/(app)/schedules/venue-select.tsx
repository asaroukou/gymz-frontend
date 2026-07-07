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
 * Venue switcher for the planning screen. Auto-hidden for single-venue owners
 * (the shared hook auto-selects the only venue); shown when the owner runs
 * more than one venue so planning can be scoped to one at a time.
 */
export function VenueSelect({ selection }: { selection: UseVenueSelectionResult }) {
  const t = useTranslations('planning');
  const { venues, isLoading, selectedVenueId, setSelectedVenueId } = selection;

  if (isLoading) {
    return <Skeleton className="h-9 w-56 rounded-full" />;
  }

  if (venues.length <= 1) {
    return null;
  }

  return (
    <Select value={selectedVenueId ?? undefined} onValueChange={setSelectedVenueId}>
      <SelectTrigger className="w-56">
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
