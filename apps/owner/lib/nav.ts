import type { Role } from '@iziwellpass/auth/claims';

export interface OwnerNavItem {
  title: string;
  href: string;
  roles: readonly Role[];
}

const STAFF_ROLES = ['owner', 'admin', 'trainer', 'receptionist'] as const;

export const NAV_ITEMS: readonly OwnerNavItem[] = [
  { title: 'Dashboard', href: '/', roles: STAFF_ROLES },
  { title: 'Venues', href: '/venues', roles: ['owner', 'admin'] },
  { title: 'Members', href: '/members', roles: ['owner', 'admin', 'receptionist'] },
  { title: 'Schedules', href: '/schedules', roles: STAFF_ROLES },
  { title: 'Staff', href: '/staff', roles: ['owner', 'admin'] },
  { title: 'Check-ins', href: '/checkins', roles: STAFF_ROLES },
];

export function navForRole(role: Role | null): { title: string; href: string }[] {
  if (role === 'platform_admin') {
    return NAV_ITEMS.map(({ title, href }) => ({ title, href }));
  }
  if (!role) {
    return [];
  }
  return NAV_ITEMS.filter((i) => i.roles.includes(role)).map(({ title, href }) => ({
    title,
    href,
  }));
}
