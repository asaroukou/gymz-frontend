import { useTranslations } from 'next-intl';

import { AccessScope } from '@iziwellpass/api/schemas';

/** Both scope values as a tuple for `z.enum(...)`. */
export const ACCESS_SCOPE_VALUES = Object.values(AccessScope) as [AccessScope, ...AccessScope[]];

function humanizeScope(value: string): string {
  const spaced = value.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Fallback-safe label for an access scope, read from the `accessScope.*` namespace. */
export function useAccessScopeLabel(): (value: string) => string {
  const t = useTranslations();
  return (value: string) =>
    t.has(`accessScope.${value}`) ? t(`accessScope.${value}`) : humanizeScope(value);
}

/** Quiet badge variant — scope is descriptive metadata, not a status. */
export function accessScopeBadgeVariant(scope: string): 'secondary' | 'outline' {
  return scope === 'chain_wide' ? 'secondary' : 'outline';
}
