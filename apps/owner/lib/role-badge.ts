import type { Staff } from '@iziwellpass/api/schemas';

/** Canvas `e0TehM`: Propriétaire and Admin read as info; every other role is neutral. */
export function roleBadgeVariant(role: Staff['role']): 'info' | 'default' {
  return role === 'owner' || role === 'admin' ? 'info' : 'default';
}
