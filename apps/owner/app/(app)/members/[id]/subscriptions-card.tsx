'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { unwrap } from '@iziwellpass/api/client';
import { useListPlans, useListSubscriptions } from '@iziwellpass/api/generated';
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
}: {
  subscription: MemberSubscription;
  planName: string;
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
      <span className="font-medium">
        {formatMoney(subscription.price_amount_minor, subscription.price_currency, locale)}
      </span>
    </div>
  );
}

/**
 * Plan names live on the venue's plan list, not on the subscription, so each
 * venue represented in the list needs its own query. Archived plans are
 * included: a member can hold a subscription to a plan that was later archived.
 */
function VenuePlanNames({
  venueId,
  onLoaded,
}: {
  venueId: string;
  onLoaded: (names: Record<string, string>) => void;
}) {
  const plansQuery = useListPlans(
    venueId,
    { include_archived: true },
    { query: { select: unwrap } },
  );
  const plans = plansQuery.data;

  useEffect(() => {
    if (!plans) return;
    onLoaded(Object.fromEntries(plans.map((p) => [p.id, p.name])));
  }, [plans, onLoaded]);

  return null;
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
  const subscriptions = subscriptionsQuery.data ?? [];

  const [planNames, setPlanNames] = useState<Record<string, string>>({});
  const mergeNames = useCallback(
    (names: Record<string, string>) => setPlanNames((prev) => ({ ...prev, ...names })),
    [],
  );
  const venueIds = [...new Set(subscriptions.map((s) => s.venue_id))];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('detail.subscriptions.title')}</CardTitle>
        <CardDescription>{t('detail.subscriptions.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {venueIds.map((id) => (
          <VenuePlanNames key={id} venueId={id} onLoaded={mergeNames} />
        ))}
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
                  planName={
                    planNames[subscription.plan_id] ?? t('detail.subscriptions.unknownPlan')
                  }
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
