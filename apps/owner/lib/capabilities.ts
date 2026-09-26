import type { Capability, Plan, TenantCapabilitiesResponse } from '@iziwellpass/api/schemas';
import type { Role } from '@iziwellpass/auth/claims';

export const PLAN_ORDER: readonly Plan[] = ['free', 'starter', 'pro', 'enterprise'];

export const ALL_CAPABILITIES: readonly Capability[] = [
  'activity_pricing',
  'qr_checkin',
  'staff_accounts',
  'multi_venue',
  'analytics',
  'member_self_service',
  'member_qr',
];

/**
 * Display copy of the backend `capabilities_for` matrix — used ONLY to label
 * locks (« Pro », « Passer au plan Starter ») and draw `/plan`. What is
 * locked always comes from the server's `capabilities` list (spec T8).
 */
export const PLAN_CAPABILITIES: Record<Plan, readonly Capability[]> = {
  free: [],
  starter: ['activity_pricing', 'qr_checkin', 'staff_accounts', 'member_self_service'],
  pro: ALL_CAPABILITIES,
  enterprise: ALL_CAPABILITIES,
};

/** The six rows of the locked page's list, in canvas order (`zCLZV`). */
export const CONSOLE_CAPABILITIES: readonly Capability[] = [
  'staff_accounts',
  'multi_venue',
  'analytics',
  'activity_pricing',
  'qr_checkin',
  'member_self_service',
];

/** Capabilities that own a benefit sentence (`capabilities.benefit.*`). */
export const BENEFIT_CAPABILITIES: readonly Capability[] = [
  'staff_accounts',
  'multi_venue',
  'activity_pricing',
  'qr_checkin',
];

export function minPlanFor(cap: Capability): Plan {
  return PLAN_ORDER.find((plan) => PLAN_CAPABILITIES[plan].includes(cap)) ?? 'pro';
}

export function isKnownPlan(plan: string): plan is Plan {
  return (PLAN_ORDER as readonly string[]).includes(plan);
}

export type CapabilitiesStatus = 'loading' | 'ready' | 'unknown';

export interface CapabilitiesValue {
  status: CapabilitiesStatus;
  plan: string | undefined;
  has(cap: Capability): boolean;
  isLocked(cap: Capability): boolean;
}

/**
 * Fail open (spec T7): until the server has answered — or when it could not —
 * every capability reads as granted. The backend still refuses gated calls
 * and the toast explains it.
 */
export function capabilitiesValue(
  data: TenantCapabilitiesResponse | undefined,
  isLoading: boolean,
): CapabilitiesValue {
  if (!data) {
    return {
      status: isLoading ? 'loading' : 'unknown',
      plan: undefined,
      has: () => true,
      isLocked: () => false,
    };
  }
  const granted = new Set<string>(data.capabilities);
  return {
    status: 'ready',
    plan: data.plan,
    has: (cap) => granted.has(cap),
    isLocked: (cap) => !granted.has(cap),
  };
}

/** Who sees upgrade actions, the plan row and `/plan` (spec T10). */
export function canManagePlan(role: Role | null): boolean {
  return role === 'owner' || role === 'admin';
}

/** « Passer au plan … » target (spec T12). */
export function upgradeHref(salesEmail: string | undefined, subject: string): string {
  const email = salesEmail?.trim();
  if (!email) return '/plan';
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}
