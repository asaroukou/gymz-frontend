'use client';

import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';

import { unwrap } from '@iziwellpass/api/client';
import { getListPlansQueryOptions, useListSubscriptions } from '@iziwellpass/api/generated';
import type { StaffSubscriptionView } from '@iziwellpass/api/schemas';
import { Alert, AlertDescription } from '@iziwellpass/ui/components/alert';
import { Badge } from '@iziwellpass/ui/components/badge';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { SectionHeading } from '@iziwellpass/ui/components/working-page';
import { tintClass, tintForIndex } from '@iziwellpass/ui/lib/tints';
import { cn } from '@iziwellpass/ui/lib/utils';

import { useCapabilities } from '@/components/capabilities/capabilities-provider';
import { LockedButton } from '@/components/capabilities/locked-button';
import { apiErrorMessage } from '@/lib/api-error';
import { formatCalendarDate } from '@/lib/datetime';
import { formatMoney } from '@/lib/money';
import { subscriptionTone } from '@/lib/subscription-tone';

import { AssignSubscriptionDialog } from './assign-subscription-dialog';
import { CancelSubscriptionDialog } from './cancel-subscription-dialog';

/**
 * One subscription as a tinted tile (canvas `L6sMyP`): name (+ « Impayé »),
 * a 13px meta line, the status on the right in 14/500. Live tiles rotate the
 * pastels; expired, exhausted or cancelled ones take the grey pill tone (D10).
 */
function SubscriptionTile({
  subscription,
  planName,
  index,
  memberId,
  canManage,
}: {
  subscription: StaffSubscriptionView;
  planName: string;
  index: number;
  memberId: string;
  canManage: boolean;
}) {
  const t = useTranslations('members');
  const locale = useLocale();

  // A subscription is time-based or count-based; show whichever the plan uses.
  // When entries_total is known but entries_remaining isn't, show a
  // total-only label rather than coercing the remaining count to zero —
  // "0 / N left" would misread as exhausted when it's actually unknown.
  const terms =
    subscription.entries_total != null
      ? subscription.entries_remaining != null
        ? t('detail.subscriptions.entriesLeft', {
            remaining: subscription.entries_remaining,
            total: subscription.entries_total,
          })
        : t('detail.subscriptions.entriesTotal', { total: subscription.entries_total })
      : subscription.expires_on != null
        ? t('detail.subscriptions.expiresOn', {
            date: formatCalendarDate(subscription.expires_on, locale),
          })
        : null;
  const price = formatMoney(subscription.price_amount_minor, subscription.price_currency, locale);
  const tone = subscriptionTone(subscription.status, index);
  const live = subscription.status === 'active';

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-lg p-5',
        tone === 'side' ? 'bg-secondary' : tintClass(tintForIndex(tone)),
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-semibold">{planName}</span>
          {subscription.payment_status === 'unpaid' ? (
            <Badge variant="warning">{t('detail.subscriptions.unpaid')}</Badge>
          ) : null}
        </div>
        <p className="text-sm text-muted-strong">{terms ? `${terms} · ${price}` : price}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={cn(
            'text-md font-medium',
            live ? 'text-success-foreground' : 'text-muted-foreground',
          )}
        >
          {t(`detail.subscriptions.status.${subscription.status}`)}
        </span>
        {canManage && live ? (
          <CancelSubscriptionDialog
            memberId={memberId}
            subscription={subscription}
            planName={planName}
          />
        ) : null}
      </div>
    </div>
  );
}

/**
 * Plan names live on the venue's plan list, not on the subscription, so every
 * venue represented in the list needs its own plan query. `useQueries` runs
 * that variable-length set in parallel and `combine` folds it into one id→name
 * map plus one aggregate pending flag.
 *
 * Archived plans are included: a member can hold a subscription to a plan that
 * was archived afterwards. Callers must distinguish "still loading" from "no
 * such plan".
 */
function useVenuePlanNames(venueIds: string[]) {
  return useQueries({
    queries: venueIds.map((venueId) =>
      getListPlansQueryOptions(venueId, { include_archived: true }, { query: { select: unwrap } }),
    ),
    combine: (results) => ({
      names: Object.fromEntries(
        results.flatMap((result) => (result.data ?? []).map((plan) => [plan.id, plan.name])),
      ) as Record<string, string>,
      isPending: results.some((result) => result.isPending),
    }),
  });
}

export function SubscriptionsSection({
  memberId,
  canManage,
}: {
  memberId: string;
  canManage: boolean;
}) {
  const t = useTranslations('members');
  const tCap = useTranslations('capabilities');
  const { isLocked } = useCapabilities();

  const subscriptionsQuery = useListSubscriptions(memberId, undefined, {
    query: { select: unwrap },
  });
  const subscriptions = useMemo(() => subscriptionsQuery.data ?? [], [subscriptionsQuery.data]);

  // Memoised so the query list handed to useQueries keeps a stable identity.
  const venueIds = useMemo(
    () => [...new Set(subscriptions.map((s) => s.venue_id))],
    [subscriptions],
  );
  const planNames = useVenuePlanNames(venueIds);

  // Until the plan queries settle, a name we don't have yet is unknown to us,
  // not unknown to the system: show a neutral dash rather than claiming
  // « Offre inconnue ».
  const planNameFor = (planId: string) =>
    planNames.names[planId] ?? (planNames.isPending ? '—' : t('detail.subscriptions.unknownPlan'));

  return (
    <section className="flex flex-col gap-4">
      <SectionHeading
        title={t('detail.subscriptions.title')}
        description={t('detail.subscriptions.description')}
        action={
          canManage ? (
            isLocked('activity_pricing') ? (
              <LockedButton
                capability="activity_pricing"
                action={tCap('action.subscriptionAssign')}
                size="sm"
              >
                {t('detail.subscriptions.assign')}
              </LockedButton>
            ) : (
              <AssignSubscriptionDialog memberId={memberId} />
            )
          ) : undefined
        }
      />
      {subscriptionsQuery.isLoading ? (
        <Skeleton className="h-[78px] w-full rounded-lg" />
      ) : subscriptionsQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {apiErrorMessage(subscriptionsQuery.error, t('detail.subscriptions.loadError'))}
          </AlertDescription>
        </Alert>
      ) : subscriptions.length === 0 ? (
        <p className="text-base text-muted-foreground">{t('detail.subscriptions.empty')}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {subscriptions.map((subscription, index) => (
            <SubscriptionTile
              key={subscription.id}
              subscription={subscription}
              planName={planNameFor(subscription.plan_id)}
              index={index}
              memberId={memberId}
              canManage={canManage}
            />
          ))}
        </div>
      )}
    </section>
  );
}
