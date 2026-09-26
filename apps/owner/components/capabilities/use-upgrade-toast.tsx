'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LockIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import type { Capability } from '@iziwellpass/api/schemas';
import { useRole } from '@iziwellpass/auth/provider';

import { apiErrorMessage } from '@/lib/api-error';
import { canManagePlan, minPlanFor } from '@/lib/capabilities';
import { isFeatureNotAvailable, isForbidden } from '@/lib/plan-errors';

import { usePlanLabel } from './capabilities-provider';

/**
 * « Passez au plan Pro pour ajouter un établissement. » (`p6hCM`). One toast
 * per capability at a time (sonner `id`), so repeated taps on a locked
 * control do not stack. « Voir les plans » only for owner/admin (spec T10).
 */
export function useUpgradeToast() {
  const t = useTranslations('capabilities.toast');
  const router = useRouter();
  const role = useRole();
  const planLabel = usePlanLabel();
  return useCallback(
    (capability: Capability, action: string) => {
      toast(t('upgrade', { plan: planLabel(minPlanFor(capability)), action }), {
        id: `upgrade-${capability}`,
        icon: <LockIcon className="size-4" aria-hidden="true" />,
        action: canManagePlan(role)
          ? { label: t('seePlans'), onClick: () => router.push('/plan') }
          : undefined,
      });
    },
    [planLabel, role, router, t],
  );
}

/**
 * Error toast for the plan-gated call sites (spec T9): upgrade copy for
 * `FEATURE_NOT_AVAILABLE`, « Accès refusé. » for any other permission 403,
 * the call site's own copy otherwise.
 */
export function useToastApiError() {
  const t = useTranslations('capabilities.toast');
  const showUpgrade = useUpgradeToast();
  return useCallback(
    (err: unknown, opts: { fallback: string; capability: Capability; action: string }) => {
      if (isFeatureNotAvailable(err)) {
        showUpgrade(opts.capability, opts.action);
        return;
      }
      toast.error(apiErrorMessage(err, isForbidden(err) ? t('forbidden') : opts.fallback));
    },
    [showUpgrade, t],
  );
}
