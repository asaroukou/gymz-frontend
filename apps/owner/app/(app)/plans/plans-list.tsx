'use client';

import { useState, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { unwrap } from '@iziwellpass/api/client';
import { useListPlans, useListVenueActivities } from '@iziwellpass/api/generated';
import type { ActivityPlan } from '@iziwellpass/api/schemas';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Label } from '@iziwellpass/ui/components/label';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { Switch } from '@iziwellpass/ui/components/switch';
import { Tile, TileMeta, TileTitle, TileTop } from '@iziwellpass/ui/components/tile';
import { cn } from '@iziwellpass/ui/lib/utils';

import { useActivityTypeLabel } from '@/lib/activity-type';
import { apiErrorMessage } from '@/lib/api-error';
import { formatMoney } from '@/lib/money';

import { ArchivePlanDialog } from './archive-plan-dialog';
import { PlanDialog } from './plan-dialog';

/** 32px title, subtitle, and the page's one dark action on the right (canvas `prPsB`). */
export function PlansHeader({ action }: { action?: ReactNode }) {
  const t = useTranslations('plans');
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-normal">{t('title')}</h1>
        <p className="text-base text-muted-foreground">{t('subtitle')}</p>
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}

/**
 * One plan as a tall tinted tile: name and « Abonnement · 30 jours » on top,
 * the price large in the middle, the activities line and the two ghost
 * actions at the bottom. An archived plan takes the côté tone, shows the
 * outline badge and no actions (The Tile Rule; canvas `prPsB`).
 */
function PlanTile({
  plan,
  index,
  venueId,
  venueActivities,
  canManage,
}: {
  plan: ActivityPlan;
  index: number;
  venueId: string;
  venueActivities: string[];
  canManage: boolean;
}) {
  const t = useTranslations('plans');
  const locale = useLocale();
  const activityLabel = useActivityTypeLabel();
  const archived = !plan.is_active;

  // A plan is either time-based (duration_days) or count-based (entry_count);
  // an entry_pack may also carry duration_days as an expiry, so show both.
  const terms = [
    t(`kind.${plan.kind}`),
    plan.entry_count != null ? t('entryCount', { count: plan.entry_count }) : null,
    plan.duration_days != null ? t('durationDays', { count: plan.duration_days }) : null,
  ].filter((x): x is string => x !== null);

  return (
    <li className="contents">
      <Tile
        aspect="tall"
        tint={index}
        className={cn('gap-6 p-6', archived ? 'min-h-0 bg-side' : 'min-h-[14.75rem]')}
      >
        <TileTop>
          <div className="min-w-0">
            <TileTitle className="text-[1.125rem]">{plan.name}</TileTitle>
            <TileMeta className="text-sm">{terms.join(' · ')}</TileMeta>
          </div>
          {archived ? <Badge variant="outline">{t('archivedBadge')}</Badge> : null}
        </TileTop>
        <p className="font-numeric text-[1.75rem] leading-none font-medium">
          {formatMoney(plan.price_amount_minor, plan.price_currency, locale)}
        </p>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-strong">
            {plan.all_activities
              ? t('allActivities')
              : plan.activities.map(activityLabel).join(' · ')}
          </p>
          {canManage && !archived ? (
            <div className="-ml-3 flex gap-1">
              <PlanDialog venueId={venueId} venueActivities={venueActivities} plan={plan} />
              <ArchivePlanDialog venueId={venueId} plan={plan} />
            </div>
          ) : null}
        </div>
      </Tile>
    </li>
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
    <div className="flex flex-col gap-8">
      <PlansHeader
        action={
          canManage ? <PlanDialog venueId={venueId} venueActivities={venueActivities} /> : null
        }
      />

      <div className="flex items-center gap-3">
        <Switch id="show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
        <Label htmlFor="show-archived" className="text-base font-normal">
          {t('showArchived')}
        </Label>
      </div>

      {plansQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[14.75rem] w-full rounded-xl" />
          ))}
        </div>
      ) : plansQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>{t('errorTitle')}</AlertTitle>
          <AlertDescription>{apiErrorMessage(plansQuery.error, t('loadError'))}</AlertDescription>
        </Alert>
      ) : plans.length === 0 ? (
        <p className="py-12 text-center text-base text-muted-foreground">{t('empty')}</p>
      ) : (
        <ul className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <PlanTile
              key={plan.id}
              plan={plan}
              index={index}
              venueId={venueId}
              venueActivities={venueActivities}
              canManage={canManage}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
