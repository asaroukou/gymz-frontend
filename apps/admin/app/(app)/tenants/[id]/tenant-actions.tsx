'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  getGetTenantQueryKey,
  getListTenantsQueryKey,
  useSetTenantPlan,
  useSetTenantStatus,
} from '@iziwellpass/api/generated';
import type { Plan, TenantSummary } from '@iziwellpass/api/schemas';
import { Button } from '@iziwellpass/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@iziwellpass/ui/components/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@iziwellpass/ui/components/select';

import { apiErrorMessage } from '@/lib/api-error';
import { actionsForStatus, type StatusAction } from '@/lib/tenant-actions';

const PLANS: readonly Plan[] = ['free', 'starter', 'pro', 'enterprise'];

export function TenantActions({ tenant }: { tenant: TenantSummary }) {
  const t = useTranslations('tenantActions');
  const queryClient = useQueryClient();
  const [planDraft, setPlanDraft] = useState<Plan | null>(null);
  const [confirmPlan, setConfirmPlan] = useState(false);
  const [confirmAction, setConfirmAction] = useState<StatusAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The plan-confirm dialog closes two ways: the operator dismisses it (Cancel
  // button, Escape, overlay click — all funnel through Dialog's onOpenChange)
  // or the mutation succeeds. Either path must drop the same transient state
  // (the draft plan, the pending confirmation, any stale error) so reopening
  // never shows a leftover draft or an error from an attempt that's over.
  const closePlanDialog = () => {
    setConfirmPlan(false);
    setPlanDraft(null);
    setError(null);
  };

  // Same reasoning for the status-confirm dialog: dismissal and mutation
  // success both must clear the pending action and any stale error.
  const closeStatusDialog = () => {
    setConfirmAction(null);
    setError(null);
  };

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: getListTenantsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetTenantQueryKey(tenant.id) }),
    ]);

  const planMutation = useSetTenantPlan({
    mutation: {
      onSuccess: async () => {
        await invalidate();
        closePlanDialog();
        toast.success(t('planChanged'));
      },
      onError: (err) => setError(apiErrorMessage(err, t('genericError'))),
    },
  });

  const statusMutation = useSetTenantStatus({
    mutation: {
      onSuccess: async () => {
        await invalidate();
        closeStatusDialog();
        toast.success(t('statusChanged'));
      },
      onError: (err) => setError(apiErrorMessage(err, t('genericError'))),
    },
  });

  const actions = actionsForStatus(tenant.status);
  if (tenant.status === 'purged') {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <Select value={planDraft ?? tenant.plan} onValueChange={(v) => setPlanDraft(v as Plan)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLANS.map((p) => (
              <SelectItem key={p} value={p}>
                {t(`plan.${p}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          disabled={!planDraft || planDraft === tenant.plan}
          onClick={() => {
            setError(null);
            setConfirmPlan(true);
          }}
        >
          {t('changePlan')}
        </Button>
      </div>

      {actions.map((a) => (
        <Button
          key={a.action}
          size="sm"
          variant={a.destructive ? 'destructive' : 'outline'}
          onClick={() => {
            setError(null);
            setConfirmAction(a);
          }}
        >
          {t(`action.${a.action}`)}
        </Button>
      ))}

      <Dialog open={confirmPlan} onOpenChange={(open) => !open && closePlanDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmPlanTitle')}</DialogTitle>
            <DialogDescription>
              {t('confirmPlanBody', {
                name: tenant.name,
                from: t(`plan.${tenant.plan}`),
                to: planDraft ? t(`plan.${planDraft}`) : '',
              })}
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={closePlanDialog}>
              {t('cancel')}
            </Button>
            <Button
              disabled={planMutation.isPending || !planDraft}
              onClick={() =>
                planDraft && planMutation.mutate({ id: tenant.id, data: { plan: planDraft } })
              }
            >
              {t('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmAction !== null} onOpenChange={(open) => !open && closeStatusDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction ? t(`confirmStatusTitle.${confirmAction.action}`) : ''}
            </DialogTitle>
            <DialogDescription>
              {confirmAction
                ? t(`confirmStatusBody.${confirmAction.action}`, { name: tenant.name })
                : ''}
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={closeStatusDialog}>
              {t('cancel')}
            </Button>
            <Button
              variant={confirmAction?.destructive ? 'destructive' : 'default'}
              disabled={statusMutation.isPending}
              onClick={() =>
                confirmAction &&
                statusMutation.mutate({ id: tenant.id, data: { status: confirmAction.target } })
              }
            >
              {t('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
