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
