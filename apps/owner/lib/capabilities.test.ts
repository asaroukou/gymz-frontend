import { describe, expect, it } from 'vitest';

import {
  ALL_CAPABILITIES,
  capabilitiesValue,
  canManagePlan,
  CONSOLE_CAPABILITIES,
  isKnownPlan,
  minPlanFor,
  PLAN_CAPABILITIES,
  upgradeHref,
} from './capabilities';

describe('PLAN_CAPABILITIES', () => {
  // Pinned to iziwellpass origin/main crates/iziwellpass-common/src/types/capability.rs
  // `capabilities_for`. Update both together.
  it('matches the backend matrix', () => {
    expect(PLAN_CAPABILITIES.free).toEqual([]);
    expect(PLAN_CAPABILITIES.starter).toEqual([
      'activity_pricing',
      'qr_checkin',
      'staff_accounts',
      'member_self_service',
    ]);
    const all = [
      'activity_pricing',
      'qr_checkin',
      'staff_accounts',
      'multi_venue',
      'analytics',
      'member_self_service',
      'member_qr',
    ];
    expect(PLAN_CAPABILITIES.pro).toEqual(all);
    expect(PLAN_CAPABILITIES.enterprise).toEqual(all);
    expect(ALL_CAPABILITIES).toEqual(all);
  });
});

describe('minPlanFor', () => {
  it('names the cheapest plan that grants each capability', () => {
    expect(minPlanFor('activity_pricing')).toBe('starter');
    expect(minPlanFor('qr_checkin')).toBe('starter');
    expect(minPlanFor('staff_accounts')).toBe('starter');
    expect(minPlanFor('member_self_service')).toBe('starter');
    expect(minPlanFor('multi_venue')).toBe('pro');
    expect(minPlanFor('analytics')).toBe('pro');
    expect(minPlanFor('member_qr')).toBe('pro');
  });
});

describe('CONSOLE_CAPABILITIES', () => {
  it('lists the six rows of the locked page in canvas order', () => {
    expect(CONSOLE_CAPABILITIES).toEqual([
      'staff_accounts',
      'multi_venue',
      'analytics',
      'activity_pricing',
      'qr_checkin',
      'member_self_service',
    ]);
  });
});

describe('capabilitiesValue', () => {
  it('locks nothing while loading', () => {
    const value = capabilitiesValue(undefined, true);
    expect(value.status).toBe('loading');
    expect(value.isLocked('staff_accounts')).toBe(false);
    expect(value.has('multi_venue')).toBe(true);
  });

  it('locks nothing when the call failed', () => {
    const value = capabilitiesValue(undefined, false);
    expect(value.status).toBe('unknown');
    expect(value.plan).toBeUndefined();
    expect(value.isLocked('multi_venue')).toBe(false);
  });

  it('locks what the server did not grant', () => {
    const value = capabilitiesValue(
      { plan: 'starter', capabilities: ['activity_pricing', 'qr_checkin', 'staff_accounts'] },
      false,
    );
    expect(value.status).toBe('ready');
    expect(value.plan).toBe('starter');
    expect(value.isLocked('multi_venue')).toBe(true);
    expect(value.isLocked('staff_accounts')).toBe(false);
  });

  it('trusts the server list for a plan the console does not know', () => {
    const value = capabilitiesValue(
      { plan: 'business' as never, capabilities: ['multi_venue'] },
      false,
    );
    expect(value.plan).toBe('business');
    expect(value.isLocked('multi_venue')).toBe(false);
    expect(value.isLocked('staff_accounts')).toBe(true);
    expect(isKnownPlan('business')).toBe(false);
    expect(isKnownPlan('pro')).toBe(true);
  });
});

describe('canManagePlan', () => {
  it('is owner and admin only', () => {
    expect(canManagePlan('owner')).toBe(true);
    expect(canManagePlan('admin')).toBe(true);
    expect(canManagePlan('trainer')).toBe(false);
    expect(canManagePlan('receptionist')).toBe(false);
    expect(canManagePlan(null)).toBe(false);
  });
});

describe('upgradeHref', () => {
  it('opens a mail to sales with the subject when an address is configured', () => {
    expect(upgradeHref('ventes@iziwellpass.com', 'Passer au plan Pro')).toBe(
      'mailto:ventes@iziwellpass.com?subject=Passer%20au%20plan%20Pro',
    );
  });

  it('falls back to the plans page', () => {
    expect(upgradeHref(undefined, 'x')).toBe('/plan');
    expect(upgradeHref('  ', 'x')).toBe('/plan');
  });
});
