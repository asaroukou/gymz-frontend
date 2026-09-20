'use client';

import { useTranslations } from 'next-intl';

import { Checkbox } from '@iziwellpass/ui/components/checkbox';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';

import { useVenueContext } from '@/lib/venue-context';

/**
 * Controlled checkbox list of the org's venues. `value` is the selected venue
 * ids; toggling a row adds/removes its id. Venues come from the shared context
 * (already loaded app-wide). Purely controlled — no internal selection state.
 */
export function VenueChecklist({
  value,
  onChange,
  disabled = false,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const t = useTranslations('venueChecklist');
  const { venues, isLoading, isError } = useVenueContext();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-40 rounded-full" />
        <Skeleton className="h-5 w-40 rounded-full" />
      </div>
    );
  }
  if (isError) {
    return <p className="text-sm text-destructive-foreground">{t('loadError')}</p>;
  }
  if (venues.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('empty')}</p>;
  }

  const toggle = (id: string, checked: boolean) => {
    onChange(checked ? [...value, id] : value.filter((v) => v !== id));
  };

  return (
    <div className="flex max-h-56 flex-col gap-3 overflow-y-auto">
      {venues.map((venue) => {
        const checked = value.includes(venue.id);
        return (
          <label key={venue.id} className="flex items-center gap-2.5 text-base">
            <Checkbox
              checked={checked}
              disabled={disabled}
              aria-label={venue.name}
              onCheckedChange={(next) => toggle(venue.id, next === true)}
            />
            <span className="truncate">{venue.name}</span>
          </label>
        );
      })}
    </div>
  );
}
