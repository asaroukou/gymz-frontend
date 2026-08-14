'use client';

import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';

import { unwrap } from '@iziwellpass/api/client';
import { getListPlansQueryOptions, useListSubscriptions } from '@iziwellpass/api/generated';
import type { MemberSubscription, SubscriptionStatus } from '@iziwellpass/api/schemas';
import { Alert, AlertDescription } from '@iziwellpass/ui/components/alert';
import { Badge } from '@iziwellpass/ui/components/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@iziwellpass/ui/components/card';
import { Separator } from '@iziwellpass/ui/components/separator';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';

import { apiErrorMessage } from '@/lib/api-error';
import { formatCalendarDate } from '@/lib/datetime';
import { formatMoney } from '@/lib/money';

import { AssignSubscriptionDialog } from './assign-subscription-dialog';
import { CancelSubscriptionDialog } from './cancel-subscription-dialog';

/**
 * Status colour mirrors lib/member-status.ts: live reads as success, cancelled
 * as destructive, spent/lapsed as muted. Colour always pairs with a text label.
 */
function statusVariant(status: SubscriptionStatus): 'success' | 'destructive' | 'secondary' {
  if (status === 'active') return 'success';
  if (status === 'cancelled') return 'destructive';
  return 'secondary';
}

function SubscriptionRow({
  subscription,
  planName,
  memberId,
  canManage,
}: {
  subscription: MemberSubscription;
  planName: string;
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
        : t('detail.subscriptions.entriesTotal', {
            total: subscription.entries_total,
          })
      : subscription.expires_on != null
        ? t('detail.subscriptions.expiresOn', {
            date: formatCalendarDate(subscription.expires_on, locale),
          })
        : null;

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{planName}</span>
          <Badge variant={statusVariant(subscription.status)}>
            {t(`detail.subscriptions.status.${subscription.status}`)}
          </Badge>
          {subscription.payment_status === 'unpaid' ? (
            <Badge variant="outline">{t('detail.subscriptions.unpaid')}</Badge>
          ) : null}
        </div>
        {terms ? <p className="text-sm text-muted-foreground">{terms}</p> : null}
      </div>
      <div className="text-right">
        <span className="font-medium">
          {formatMoney(subscription.price_amount_minor, subscription.price_currency, locale)}
        </span>
        {canManage && subscription.status === 'active' ? (
          <div className="mt-2">
            <CancelSubscriptionDialog
              memberId={memberId}
              subscription={subscription}
              planName={planName}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Plan names live on the venue's plan list, not on the subscription, so every
 * venue represented in the list needs its own plan query. `useQueries` runs
 * that variable-length set in parallel and `combine` folds it into one id→name
 * map plus one aggregate pending flag — no per-venue child component and no
 * duplicated state to keep in sync.
 *
 * Archived plans are included: a member can hold a subscription to a plan that
 * was archived afterwards. That makes this a different cache entry from the
 * assign dialog's `include_archived: false` list, so a just-assigned plan's
 * name is genuinely unknown here until this query resolves — which is why
 * callers must distinguish "still loading" from "no such plan".
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

export function SubscriptionsCard({
  memberId,
  canManage,
}: {
  memberId: string;
  canManage: boolean;
}) {
  const t = useTranslations('members');

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
  // « Offre inconnue » — copy that would otherwise appear on every row for a
  // round trip, and on a row the owner had just successfully created.
  const planNameFor = (planId: string) =>
    planNames.names[planId] ?? (planNames.isPending ? '—' : t('detail.subscriptions.unknownPlan'));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('detail.subscriptions.title')}</CardTitle>
        <CardDescription>{t('detail.subscriptions.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {subscriptionsQuery.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : subscriptionsQuery.isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              {apiErrorMessage(subscriptionsQuery.error, t('detail.subscriptions.loadError'))}
            </AlertDescription>
          </Alert>
        ) : subscriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('detail.subscriptions.empty')}</p>
        ) : (
          <div className="space-y-4">
            {subscriptions.map((subscription, i) => (
              <div key={subscription.id} className="space-y-4">
                {i > 0 ? <Separator /> : null}
                <SubscriptionRow
                  subscription={subscription}
                  planName={planNameFor(subscription.plan_id)}
                  memberId={memberId}
                  canManage={canManage}
                />
              </div>
            ))}
          </div>
        )}
        {canManage ? <AssignSubscriptionDialog memberId={memberId} /> : null}
      </CardContent>
    </Card>
  );
}
