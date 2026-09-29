import { describe, expect, it } from 'vitest';

import { canAccessPath, navForRole, navGroupsForRole } from './nav';

describe('plans nav entry', () => {
  it('is visible to owner and admin', () => {
    for (const role of ['owner', 'admin'] as const) {
      expect(navForRole(role).some((i) => i.href === '/plans')).toBe(true);
    }
  });

  it('is hidden from trainer and receptionist', () => {
    for (const role of ['trainer', 'receptionist'] as const) {
      expect(navForRole(role).some((i) => i.href === '/plans')).toBe(false);
    }
  });

  it('gates /plans by role', () => {
    expect(canAccessPath('owner', '/plans')).toBe(true);
    expect(canAccessPath('trainer', '/plans')).toBe(false);
    expect(canAccessPath(null, '/plans')).toBe(false);
    expect(canAccessPath('platform_admin', '/plans')).toBe(true);
  });

  it('places plans in the venue-scoped group, after planning', () => {
    const groups = navGroupsForRole('owner');
    const venueGroup = groups.find((g) => g.scope === 'venue');
    expect(venueGroup).toBeDefined();
    const hrefs = venueGroup!.items.map((i) => i.href);
    expect(hrefs).toEqual(['/', '/checkins', '/schedules', '/plans']);
  });
});

describe('nav capabilities', () => {
  it('tags plan-gated entries with their capability', () => {
    const items = navGroupsForRole('owner').flatMap((g) => g.items);
    expect(items.find((i) => i.href === '/staff')?.capability).toBe('staff_accounts');
    expect(items.find((i) => i.href === '/plans')?.capability).toBe('activity_pricing');
    expect(items.find((i) => i.href === '/')?.capability).toBeUndefined();
  });
});

describe('settings nav entry', () => {
  it('shows Réglages to owners and admins only', () => {
    const hrefs = (role: Parameters<typeof navForRole>[0]) => navForRole(role).map((i) => i.href);
    expect(hrefs('owner')).toContain('/settings');
    expect(hrefs('admin')).toContain('/settings');
    expect(hrefs('receptionist')).not.toContain('/settings');
    expect(hrefs('trainer')).not.toContain('/settings');
  });
});

describe('hidden routes', () => {
  it('gates /plan to owner and admin without a nav entry', () => {
    expect(navForRole('owner').some((i) => i.href === '/plan')).toBe(false);
    expect(canAccessPath('owner', '/plan')).toBe(true);
    expect(canAccessPath('admin', '/plan')).toBe(true);
    expect(canAccessPath('platform_admin', '/plan')).toBe(true);
    expect(canAccessPath('receptionist', '/plan')).toBe(false);
    expect(canAccessPath('trainer', '/plan')).toBe(false);
  });
});
