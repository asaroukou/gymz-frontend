'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { unwrap } from '@iziwellpass/api/client';
import { useListSubscriptions } from '@iziwellpass/api/generated';
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
        <p className="text-sm text-muted-strong">
          {[subscription.venue_name, terms, price].filter(Boolean).join(' · ')}
        </p>
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
              planName={subscription.plan_name}
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
