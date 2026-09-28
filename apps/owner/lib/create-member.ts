import type { Role } from '@iziwellpass/auth/claims';

/** Roles allowed to read the tenant's member-login policy; receptionists get 403. */
export const TENANT_SETTINGS_ROLES: readonly Role[] = ['owner', 'admin', 'platform_admin'];

/**
 * Builds the access part of the register-member payload. A receptionist never
 * sees the scope select or the venue checklist, so their submission must not
 * carry `chain_wide`: it always targets their own selected venue instead.
 * Owners/admins keep whatever the form collected.
 */
export function createAccessPayload(input: {
  canChooseScope: boolean;
  selectedVenueId: string | null;
  access_scope: 'chain_wide' | 'venue_scoped';
  venue_ids: string[];
}): { access_scope: 'chain_wide' | 'venue_scoped'; venue_ids?: string[] } {
  if (!input.canChooseScope) {
    return { access_scope: 'venue_scoped', venue_ids: input.selectedVenueId ? [input.selectedVenueId] : [] };
  }
  return input.access_scope === 'chain_wide'
    ? { access_scope: 'chain_wide' }
    : { access_scope: 'venue_scoped', venue_ids: input.venue_ids };
}

/** Picks the success toast: login members get told an invitation is on its way. */
export function createdToastKey(
  effectiveMode: 'login' | 'roster' | undefined,
): 'addDialog.success' | 'addDialog.successLogin' {
  return effectiveMode === 'login' ? 'addDialog.successLogin' : 'addDialog.success';
}
