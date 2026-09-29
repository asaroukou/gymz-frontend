import { describe, expect, it } from 'vitest';

import type { MemberLoginPolicy } from '@iziwellpass/api/schemas';

import { settingsView } from './settings-view';

const policy = (over: Partial<MemberLoginPolicy> = {}): MemberLoginPolicy => ({
  configured_mode: 'login',
  effective_mode: 'login',
  required_capability: 'member_self_service',
  capability_available: true,
  downgrade_reason: null,
  ...over,
});

describe('settingsView', () => {
  it('is plain when login is active', () => {
    expect(settingsView(policy(), 'login')).toEqual({ locked: false, downgraded: false, dirty: false });
  });
  it('is dirty when the selection differs', () => {
    expect(settingsView(policy(), 'roster').dirty).toBe(true);
  });
  it('is downgraded when login is configured but the plan lacks it', () => {
    expect(
      settingsView(
        policy({ effective_mode: 'roster', capability_available: false, downgrade_reason: 'plan_lacks_member_self_service' }),
        'login',
      ),
    ).toEqual({ locked: false, downgraded: true, dirty: false });
  });
  it('is locked when roster is configured and the plan lacks login', () => {
    expect(
      settingsView(policy({ configured_mode: 'roster', effective_mode: 'roster', capability_available: false }), 'roster'),
    ).toEqual({ locked: true, downgraded: false, dirty: false });
  });
});
