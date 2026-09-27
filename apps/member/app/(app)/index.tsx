import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { LogOut, QrCode } from 'lucide-react-native';
import { useMeMemberships, useMeProfile, useMeSubscription, useMeVenues } from '@iziwellpass/api/generated';
import type {
  ApiResponseMyProfileResponseData,
  ApiResponseVecMySubscriptionResponseDataItem,
} from '@iziwellpass/api/schemas';
import { unwrap } from '@iziwellpass/api/client';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { QueryBoundary } from '@/components/ui/query-boundary';
import { useAuth } from '@/lib/auth/context';
import { t } from '@/lib/i18n';
import { formatDate, formatDayLine, formatMonthYear } from '@/lib/format';
import { cardView, planLineText } from '@/lib/card-view';
import type { CardState } from '@/lib/card-view';
import { pickMembership } from '@/lib/venue';

type Profile = ApiResponseMyProfileResponseData;
type Subscription = ApiResponseVecMySubscriptionResponseDataItem;

// Canvas tints per state (NgWGe/Q3ohJw active+pack, HAIgO expired, bRIoW none):
// active/pack keep the vert pass, expired turns sable, none drops to the
// plain white + hairline surface (no tint).
const TINT_BY_STATE: Record<CardState, 'vert' | 'sable' | undefined> = {
  active: 'vert',
  pack: 'vert',
  expired: 'sable',
  none: undefined,
};

function Pass({ profile, subscription, venue }: { profile: Profile; subscription?: Subscription; venue: string | null }) {
  const view = cardView(profile, subscription);
  // The entry-pack total isn't in the API (Q3ohJw.png shows no plan line for it).
  const plan = view.state === 'pack' ? null : planLineText(view.planLine, (key) => t(key));
  const name = `${profile.first_name} ${profile.last_name}`.trim();
  return (
    <Card tint={TINT_BY_STATE[view.state]} className="gap-4">
      <View className="flex-row items-center justify-between gap-3">
        <AppText variant="label" className="flex-1 text-muted-strong" numberOfLines={1}>
          {venue ?? ''}
        </AppText>
        <StatusBadge label={t(view.badgeKey)} variant={view.badgeVariant} />
      </View>
      <AppText variant="heading" className="text-[22px] leading-[28px]">
        {name}
      </AppText>

      <View className="gap-1">
        {view.state === 'active' && view.validUntil ? (
          <AppText variant="bodyStrong" className="text-[17px]">
            {t('card.validUntil', { date: formatDate(view.validUntil) })}
          </AppText>
        ) : null}
        {view.state === 'pack' && view.entries !== null ? (
          <View className="flex-row items-baseline gap-2">
            <AppText variant="numericLarge">{String(view.entries)}</AppText>
            <AppText variant="label" className="text-muted-strong">
              {t('card.entriesUnit', { count: view.entries })}
            </AppText>
          </View>
        ) : null}
        {view.state === 'expired' ? (
          <AppText variant="bodyStrong" className="text-[17px]">
            {view.expiredOn ? t('card.expiredOn', { date: formatDate(view.expiredOn) }) : t(view.badgeKey)}
          </AppText>
        ) : null}
        {view.state === 'none' ? (
          <>
            <AppText variant="bodyStrong" className="text-[17px]">
              {t('card.noSubscription')}
            </AppText>
            <AppText variant="label" className="text-muted-strong">
              {t('card.noSubscriptionHint')}
            </AppText>
          </>
        ) : null}
        {plan ? (
          <AppText variant="label" className="text-muted-strong">
            {plan}
          </AppText>
        ) : null}
      </View>

      <View className="flex-row items-end justify-between">
        <View>
          <AppText variant="caption" className="text-muted-strong">
            {t('card.memberNo')}
          </AppText>
          <AppText variant="numeric">{profile.id.slice(0, 8).toUpperCase()}</AppText>
        </View>
        <AppText variant="caption" className="text-muted-strong">
          {t('card.memberSince', { date: formatMonthYear(profile.membership_start) })}
        </AppText>
      </View>
    </Card>
  );
}

function Row({
  label,
  value,
  numeric,
  hairline = true,
}: {
  label: string;
  value: string;
  numeric?: boolean;
  hairline?: boolean;
}) {
  return (
    <View
      className={`min-h-[52px] flex-row items-center justify-between gap-4 ${hairline ? 'border-b border-border' : ''}`}
    >
      <AppText variant="label">{label}</AppText>
      <AppText variant={numeric ? 'numeric' : 'body'} className="flex-1 text-right" numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
}

function PassSkeleton() {
  return (
    <View className="mt-6 gap-5">
      <View className="h-[232px] rounded-panel bg-secondary" />
      <View className="h-[52px] rounded-pill bg-secondary" />
    </View>
  );
}

export default function CardScreen() {
  const router = useRouter();
  const { claims, signOut } = useAuth();
  const profileQ = useMeProfile(undefined, { query: { select: unwrap } });
  const subQ = useMeSubscription(undefined, { query: { select: unwrap } });
  const venuesQ = useMeVenues(undefined, { query: { select: unwrap } });
  const membershipsQ = useMeMemberships({ query: { select: unwrap } });
  const subscription = subQ.data?.[0]; // the pass reflects the first subscription
  const venue = pickMembership(membershipsQ.data, venuesQ.data)?.gym_name ?? null;
  const firstName = claims?.name?.split(' ')[0] ?? profileQ.data?.first_name ?? null;
  const profile = profileQ.data;
  const rows = profile
    ? [
        profile.email ? { label: t('card.email'), value: profile.email } : null,
        profile.phone ? { label: t('card.phone'), value: profile.phone, numeric: true } : null,
        venue ? { label: t('card.venue'), value: venue } : null,
      ].filter((row): row is { label: string; value: string; numeric?: boolean } => row !== null)
    : [];

  return (
    <Screen>
      <AppText variant="label">{formatDayLine()}</AppText>
      <AppText variant="title" className="mt-1">
        {firstName ? t('card.greeting', { name: firstName }) : t('card.greetingNoName')}
      </AppText>

      <QueryBoundary
        isLoading={profileQ.isLoading}
        isError={profileQ.isError}
        errorText={t('card.error')}
        onRetry={() => void profileQ.refetch()}
        loadingFallback={<PassSkeleton />}
      >
        {profile ? (
          <>
            <View className="mt-6">
              <Pass profile={profile} subscription={subscription} venue={venue} />
            </View>
            {subscription ? (
              <View className="mt-5">
                <Button label={t('card.showQr')} icon={QrCode} onPress={() => router.navigate('/qr')} />
              </View>
            ) : null}
            <View className="mt-8">
              <AppText variant="heading" className="mb-1">
                {t('card.detailsTitle')}
              </AppText>
              {rows.map((row, i) => (
                <Row key={row.label} {...row} hairline={i < rows.length - 1} />
              ))}
            </View>
            <View className="mt-6 flex-row justify-center">
              <Button label={t('card.signOut')} variant="ghost" fullWidth={false} icon={LogOut} onPress={signOut} />
            </View>
          </>
        ) : null}
      </QueryBoundary>
    </Screen>
  );
}
