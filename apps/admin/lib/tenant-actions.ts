import type { TenantStatus } from '@iziwellpass/api/schemas';

export interface StatusAction {
  action: 'suspend' | 'reactivate' | 'offboard';
  target: 'suspended' | 'active' | 'offboarding';
  destructive: boolean;
}

const SUSPEND: StatusAction = { action: 'suspend', target: 'suspended', destructive: false };
const REACTIVATE: StatusAction = { action: 'reactivate', target: 'active', destructive: false };
const OFFBOARD: StatusAction = { action: 'offboard', target: 'offboarding', destructive: true };

/** The backend rejects 'purged' as a PATCH target; it never appears here. */
export function actionsForStatus(status: TenantStatus): StatusAction[] {
  switch (status) {
    case 'active':
      return [SUSPEND, OFFBOARD];
    case 'suspended':
      return [REACTIVATE, OFFBOARD];
    case 'offboarding':
      return [REACTIVATE];
    case 'purged':
      return [];
  }
}
