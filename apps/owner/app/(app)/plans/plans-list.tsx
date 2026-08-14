'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { unwrap } from '@iziwellpass/api/client';
import { useListPlans, useListVenueActivities } from '@iziwellpass/api/generated';
import type { ActivityPlan } from '@iziwellpass/api/schemas';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Card, CardContent } from '@iziwellpass/ui/components/card';
import { Label } from '@iziwellpass/ui/components/label';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { Switch } from '@iziwellpass/ui/components/switch';

import { useActivityTypeLabel } from '@/lib/activity-type';
import { apiErrorMessage } from '@/lib/api-error';
import { formatMoney } from '@/lib/money';

import { PlanDialog } from './plan-dialog';

/** One plan, rendered as a row: name + badges above, price + terms below. */
function PlanRow({
  plan,
  venueId,
  venueActivities,
  canManage,
}: {
  plan: ActivityPlan;
  venueId: string;
  venueActivities: string[];
  canManage: boolean;
}) {
  const t = useTranslations('plans');
  const locale = useLocale();
  const activityLabel = useActivityTypeLabel();

  // A plan is either time-based (duration_days) or count-based (entry_count);
  // an entry_pack may also carry duration_days as an expiry, so show both.
  const terms = [
    plan.entry_count != null ? t('entryCount', { count: plan.entry_count }) : null,
    plan.duration_days != null ? t('durationDays', { count: plan.duration_days }) : null,
  ].filter((x): x is string => x !== null);

  return (
    <Card>
      <CardContent className="flex flex-wrap items-start justify-between gap-4 py-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{plan.name}</span>
            <Badge variant="secondary">{t(`kind.${plan.kind}`)}</Badge>
            {plan.is_active ? null : <Badge variant="outline">{t('archivedBadge')}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {plan.all_activities
              ? t('allActivities')
              : plan.activities.map(activityLabel).join(' · ')}
          </p>
        </div>
        <div className="text-right">
          <p className="font-medium">
            {formatMoney(plan.price_amount_minor, plan.price_currency, locale)}
          </p>
          {terms.length > 0 ? (
            <p className="text-sm text-muted-foreground">{terms.join(' · ')}</p>
          ) : null}
          {canManage ? (
            <div className="mt-2 flex justify-end gap-2">
              <PlanDialog venueId={venueId} venueActivities={venueActivities} plan={plan} />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function PlansList({ venueId, canManage }: { venueId: string; canManage: boolean }) {
  const t = useTranslations('plans');
  const [showArchived, setShowArchived] = useState(false);

  const plansQuery = useListPlans(
    venueId,
    { include_archived: showArchived },
    { query: { select: unwrap } },
  );
  const plans = plansQuery.data ?? [];

  const activitiesQuery = useListVenueActivities(venueId, { query: { select: unwrap } });
  const venueActivities = (activitiesQuery.data ?? []).map((a) => a.activity_type);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Switch id="show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
          <Label htmlFor="show-archived">{t('showArchived')}</Label>
        </div>
        {canManage ? <PlanDialog venueId={venueId} venueActivities={venueActivities} /> : null}
      </div>

      {plansQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : plansQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>{t('errorTitle')}</AlertTitle>
          <AlertDescription>{apiErrorMessage(plansQuery.error, t('loadError'))}</AlertDescription>
        </Alert>
      ) : plans.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <PlanRow
              key={plan.id}
              plan={plan}
              venueId={venueId}
              venueActivities={venueActivities}
              canManage={canManage}
            />
          ))}
        </div>
      )}
    </div>
  );
}
