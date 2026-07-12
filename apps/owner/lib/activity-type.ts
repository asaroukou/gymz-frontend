import { useTranslations } from 'next-intl';

import { ActivityType } from '@iziwellpass/api/schemas';
import type { ComboboxOption } from '@iziwellpass/ui/components/combobox';

/** All 23 catalog values, as a tuple for `z.enum(...)`. Order = display order. */
export const ACTIVITY_TYPE_VALUES = Object.values(ActivityType) as [
  ActivityType,
  ...ActivityType[],
];

/** Humanize a raw enum value as a last-resort label (e.g. `yoga_studio` → "Yoga studio"). */
function humanizeActivityValue(value: string): string {
  const spaced = value.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Returns a labeller for a single `activity_type`/`venue_type` value. Reads the
 * shared `activityType.*` namespace and falls back to a humanized raw value so a
 * legacy/unknown stored value (e.g. the removed `yoga_studio`) never renders blank.
 */
export function useActivityTypeLabel(): (value: string) => string {
  const t = useTranslations();
  return (value: string) =>
    t.has(`activityType.${value}`) ? t(`activityType.${value}`) : humanizeActivityValue(value);
}

/** Combobox options for the full catalog, labelled + in catalog order. */
export function useActivityTypeOptions(): ComboboxOption[] {
  const label = useActivityTypeLabel();
  return ACTIVITY_TYPE_VALUES.map((value) => ({ value, label: label(value) }));
}
