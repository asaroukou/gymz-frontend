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
 * Venue switcher scoped to the dashboard. Auto-hidden for single-venue owners
 * (the shared hook auto-selects the only venue), shown when the owner runs
 * more than one venue so the dashboard can be pointed at one at a time — the
 * API has no cross-venue aggregation, so the switcher owns the scope.
 */
export function VenueSelect({ selection }: { selection: UseVenueSelectionResult }) {
  const t = useTranslations('dashboard');
  const { venues, isLoading, selectedVenueId, setSelectedVenueId } = selection;

  if (isLoading) {
    return <Skeleton className="h-9 w-56" />;
  }

  // One (or zero) venue: nothing to switch between — keep the header clean.
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
