import type { Role } from '@iziwellpass/auth/claims';

/** Key into the `nav` i18n namespace; the app resolves it to a display label. */
export type NavLabelKey = 'dashboard' | 'frontdesk' | 'members' | 'planning' | 'venues' | 'staff';

export interface OwnerNavItem {
  labelKey: NavLabelKey;
  href: string;
  roles: readonly Role[];
}

const STAFF_ROLES = ['owner', 'admin', 'trainer', 'receptionist'] as const;

export const NAV_ITEMS: readonly OwnerNavItem[] = [
  { labelKey: 'dashboard', href: '/', roles: STAFF_ROLES },
  { labelKey: 'frontdesk', href: '/checkins', roles: STAFF_ROLES },
  { labelKey: 'members', href: '/members', roles: ['owner', 'admin', 'receptionist'] },
  { labelKey: 'planning', href: '/schedules', roles: STAFF_ROLES },
  { labelKey: 'venues', href: '/venues', roles: ['owner', 'admin'] },
  { labelKey: 'staff', href: '/staff', roles: ['owner', 'admin'] },
];

export function navForRole(role: Role | null): { labelKey: NavLabelKey; href: string }[] {
  if (role === 'platform_admin') {
    return NAV_ITEMS.map(({ labelKey, href }) => ({ labelKey, href }));
  }
  if (!role) {
    return [];
  }
  return NAV_ITEMS.filter((i) => i.roles.includes(role)).map(({ labelKey, href }) => ({
    labelKey,
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
