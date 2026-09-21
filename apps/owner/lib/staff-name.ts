import type { Staff } from '@iziwellpass/api/schemas';

export function staffName(staff: Pick<Staff, 'first_name' | 'last_name'>): string {
  return `${staff.first_name} ${staff.last_name}`.trim();
}

export function staffInitials(staff: Pick<Staff, 'first_name' | 'last_name'>): string {
  const first = staff.first_name.charAt(0);
  const last = staff.last_name.charAt(0);
  return `${first}${last}`.toUpperCase() || '?';
}
