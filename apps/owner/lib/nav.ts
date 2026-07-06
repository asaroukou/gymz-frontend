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

/**
 * True when `role` may access the page at `href`. Platform admins always
 * pass; an `href` with no matching NAV_ITEMS entry defaults to true (nothing
 * to gate). Used as a belt-and-braces inline guard for role-holders who
 * navigate to a page outside their own nav (e.g. a trainer opening
 * `/venues` directly) — role-less sessions never reach these pages at all
 * (the (app) layout redirects them to `/onboarding` first).
 */
export function canAccessPath(role: Role | null, href: string): boolean {
  if (role === 'platform_admin') {
    return true;
  }
  const item = NAV_ITEMS.find((i) => i.href === href);
  if (!item) {
    return true;
  }
  return role !== null && item.roles.includes(role);
}
