import { View } from 'react-native';
import { useMeProfile, useMeSubscription } from '@iziwellpass/api/generated';
import { unwrap } from '@iziwellpass/api/client';
import { Screen } from '@/components/ui/screen';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { StatusBadge, statusBadgeVariant } from '@/components/ui/status-badge';
import { QueryBoundary } from '@/components/ui/query-boundary';
import { useAuth } from '@/lib/auth/context';
import { t } from '@/lib/i18n';
import { formatDate } from '@/lib/format';
import { membershipStatusLabelKey, subscriptionStatusLabelKey } from '@/lib/card-status';

export default function CardScreen() {
  const { claims, signOut } = useAuth();
  const profile = useMeProfile({ query: { select: unwrap } });
  const sub = useMeSubscription({ query: { select: unwrap } });
  const name = claims?.name ?? null;
  // `useMeSubscription` returns the caller's ACTIVE subscriptions as a list (a
  // member could hold more than one plan); the card shows the first one, if any.
  const subscription = sub.data?.[0];

  return (
    <Screen>
      <AppText variant="title">
        {name ? t('card.greeting', { name }) : t('card.greetingNoName')}
      </AppText>

      <QueryBoundary
        isLoading={profile.isLoading}
        isError={profile.isError}
        errorText={t('card.error')}
        onRetry={() => void profile.refetch()}
      >
        {profile.data ? (
          <Card>
            <AppText variant="section">{`${profile.data.first_name} ${profile.data.last_name}`}</AppText>
            <View className="mt-2 flex-row items-center gap-2">
              <AppText variant="label">{t('card.status')}</AppText>
              <StatusBadge
                label={t(membershipStatusLabelKey(profile.data.membership_status))}
                variant={statusBadgeVariant(profile.data.membership_status)}
              />
            </View>
            {profile.data.membership_end ? (
              <AppText variant="label" className="mt-2">
                {t('card.validUntil', { date: formatDate(profile.data.membership_end) })}
              </AppText>
            ) : null}
          </Card>
        ) : null}
      </QueryBoundary>

      <QueryBoundary
        isLoading={sub.isLoading}
        isError={sub.isError}
        errorText={t('card.error')}
        onRetry={() => void sub.refetch()}
      >
        <Card>
          <AppText variant="label">{t('card.plan')}</AppText>
          {subscription ? (
            <>
              <View className="mt-1 flex-row items-center gap-2">
                <StatusBadge
                  label={t(subscriptionStatusLabelKey(subscription.status))}
                  variant={statusBadgeVariant(subscription.status)}
                />
              </View>
              {typeof subscription.entries_remaining === 'number' ? (
                <AppText className="mt-2">
                  {t('card.entriesRemaining', { count: subscription.entries_remaining })}
                </AppText>
              ) : null}
              {subscription.expires_on ? (
                <AppText variant="label" className="mt-2">
                  {t('card.validUntil', { date: formatDate(subscription.expires_on) })}
                </AppText>
              ) : null}
            </>
          ) : (
            <AppText className="mt-1 text-neutral-500">{t('card.noSubscription')}</AppText>
          )}
        </Card>
      </QueryBoundary>

      <Button label={t('card.signOut')} variant="ghost" onPress={signOut} />
    </Screen>
  );
}
