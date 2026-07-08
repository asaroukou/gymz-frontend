/**
 * Supported countries and timezones for venue configuration, scoped to the
 * francophone West/Central-African market (plus France / UTC as fallbacks).
 *
 * Values match what the API stores today: ISO 3166-1 alpha-2 codes for
 * `country` (e.g. `TG`) and IANA zone names for `timezone` (e.g.
 * `Africa/Lome`). Labels are French proper nouns (reference data, not UI
 * chrome — intentionally not routed through next-intl).
 */

export interface LocationOption {
  value: string;
  label: string;
}

/** Country (ISO alpha-2 → French name). */
export const COUNTRIES: readonly LocationOption[] = [
  { value: 'SN', label: 'Sénégal' },
  { value: 'CI', label: "Côte d'Ivoire" },
  { value: 'ML', label: 'Mali' },
  { value: 'BF', label: 'Burkina Faso' },
  { value: 'BJ', label: 'Bénin' },
  { value: 'TG', label: 'Togo' },
  { value: 'NE', label: 'Niger' },
  { value: 'GN', label: 'Guinée' },
  { value: 'GA', label: 'Gabon' },
  { value: 'CM', label: 'Cameroun' },
  { value: 'CG', label: 'Congo' },
  { value: 'CD', label: 'RD Congo' },
  { value: 'CF', label: 'Centrafrique' },
  { value: 'TD', label: 'Tchad' },
  { value: 'MR', label: 'Mauritanie' },
  { value: 'MG', label: 'Madagascar' },
  { value: 'FR', label: 'France' },
];

/** Timezone (IANA zone → city + GMT offset label). */
export const TIMEZONES: readonly LocationOption[] = [
  { value: 'Africa/Dakar', label: 'Dakar (GMT)' },
  { value: 'Africa/Abidjan', label: 'Abidjan (GMT)' },
  { value: 'Africa/Bamako', label: 'Bamako (GMT)' },
  { value: 'Africa/Ouagadougou', label: 'Ouagadougou (GMT)' },
  { value: 'Africa/Conakry', label: 'Conakry (GMT)' },
  { value: 'Africa/Lome', label: 'Lomé (GMT)' },
  { value: 'Africa/Nouakchott', label: 'Nouakchott (GMT)' },
  { value: 'Africa/Porto-Novo', label: 'Porto-Novo (GMT+1)' },
  { value: 'Africa/Niamey', label: 'Niamey (GMT+1)' },
  { value: 'Africa/Libreville', label: 'Libreville (GMT+1)' },
  { value: 'Africa/Douala', label: 'Douala (GMT+1)' },
  { value: 'Africa/Brazzaville', label: 'Brazzaville (GMT+1)' },
  { value: 'Africa/Bangui', label: 'Bangui (GMT+1)' },
  { value: 'Africa/Ndjamena', label: "N'Djamena (GMT+1)" },
  { value: 'Africa/Kinshasa', label: 'Kinshasa (GMT+1)' },
  { value: 'Indian/Antananarivo', label: 'Antananarivo (GMT+3)' },
  { value: 'Europe/Paris', label: 'Paris (GMT+1/+2)' },
  { value: 'UTC', label: 'UTC' },
];

/**
 * Ensures the current stored `value` is selectable even if it isn't in the
 * curated list (avoids silently blanking an out-of-list value on edit).
 */
export function withCurrentValue(
  options: readonly LocationOption[],
  value: string | null | undefined,
): readonly LocationOption[] {
  if (!value || options.some((o) => o.value === value)) {
    return options;
  }
  return [{ value, label: value }, ...options];
}
