import { describe, expect, it } from 'vitest';

import { actionsForStatus } from './tenant-actions';

describe('actionsForStatus', () => {
  it('active can be suspended or offboarded', () => {
    expect(actionsForStatus('active')).toEqual([
      { action: 'suspend', target: 'suspended', destructive: false },
      { action: 'offboard', target: 'offboarding', destructive: true },
    ]);
  });

  it('suspended can be reactivated or offboarded', () => {
    expect(actionsForStatus('suspended')).toEqual([
      { action: 'reactivate', target: 'active', destructive: false },
      { action: 'offboard', target: 'offboarding', destructive: true },
    ]);
  });

  it('offboarding can only be reactivated', () => {
    expect(actionsForStatus('offboarding')).toEqual([
      { action: 'reactivate', target: 'active', destructive: false },
    ]);
  });

  it('purged has no actions', () => {
    expect(actionsForStatus('purged')).toEqual([]);
  });
});
