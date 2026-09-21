import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarClock, LogOut, Mail, Phone, QrCode } from 'lucide-react-native';
import { useMeProfile, useMeSubscription } from '@iziwellpass/api/generated';
import type {
  ApiResponseMyProfileResponseData,
  ApiResponseVecMySubscriptionResponseDataItem,
} from '@iziwellpass/api/schemas';
import { unwrap } from '@iziwellpass/api/client';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { StatusBadge, statusBadgeVariant } from '@/components/ui/status-badge';
import { QueryBoundary } from '@/components/ui/query-boundary';
import { useAuth } from '@/lib/auth/context';
import { t } from '@/lib/i18n';
import { formatDate } from '@/lib/format';
import {
  membershipStatusLabelKey,
  membershipTypeLabelKey,
  subscriptionStatusLabelKey,
} from '@/lib/card-status';
import { colors } from '@/lib/theme';

type Profile = ApiResponseMyProfileResponseData;
type Subscription = ApiResponseVecMySubscriptionResponseDataItem;

/** A chip that reads on the encre-verte pass face (papier text on a light wash). */
function PassChip({ label }: { label: string }) {
  return (
    <View className="self-start rounded-pill bg-neutral-50/15 px-3 py-1">
      <AppText variant="label" className="text-neutral-50">
        {label}
      </AppText>
    </View>
  );
}

/** The membership pass: the one committed-color surface, the member's object. */
function PassFace({ profile, subscription }: { profile: Profile; subscription?: Subscription }) {
  const typeKey = membershipTypeLabelKey(profile.membership_type);
  const entries =
    typeof subscription?.entries_remaining === 'number' ? subscription.entries_remaining : null;
  const validDate = subscription?.expires_on ?? profile.membership_end ?? null;
  const memberNo = profile.id.slice(0, 8).toUpperCase();

  return (
    <View className="min-h-[224px] justify-between rounded-xl bg-primary p-6">
      <View className="flex-row items-start justify-between">
        <AppText variant="label" className="text-neutral-50/70">
          IziWellPass
        </AppText>
        {typeKey ? <PassChip label={t(typeKey)} /> : null}
      </View>

      <View className="mt-6 gap-3">
        <AppText variant="display" className="text-neutral-50">
          {`${profile.first_name} ${profile.last_name}`.trim()}
        </AppText>

        {entries !== null ? (
          <View>
            <AppText variant="monoLarge" className="text-neutral-50">
              {String(entries)}
            </AppText>
            <AppText variant="label" className="text-neutral-50/70">
              {t('card.entriesUnit', { count: entries })}
            </AppText>
          </View>
        ) : validDate ? (
          <View>
            <AppText variant="label" className="text-neutral-50/70">
              {t('card.validLabel')}
            </AppText>
            <AppText variant="mono" className="text-[18px] text-neutral-50">
              {formatDate(validDate)}
            </AppText>
          </View>
        ) : null}
      </View>

      <View className="mt-6 flex-row items-end justify-between">
        <AppText variant="label" className="text-neutral-50/60">
          {t('card.memberNo')}
        </AppText>
        <AppText variant="mono" className="text-neutral-50/90">
          {memberNo}
        </AppText>
      </View>
    </View>
  );
}

/** A quiet hairline detail row: leading icon, label, trailing value. */
function DetailRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <View className="flex-row items-center gap-3 border-b border-border py-3.5">
      <View className="h-9 w-9 items-center justify-center rounded-pill bg-neutral-100">
        {icon}
      </View>
      <View className="flex-1">{children}</View>
    </View>
  );
}

function PassSkeleton() {
  return (
    <View className="mt-4">
      <View className="min-h-[224px] rounded-xl bg-neutral-100" />
      <View className="mt-5 h-12 rounded-pill bg-neutral-100" />
    </View>
  );
}

export default function CardScreen() {
  const router = useRouter();
  const { claims, signOut } = useAuth();
  const profileQ = useMeProfile(undefined, { query: { select: unwrap } });
  const subQ = useMeSubscription(undefined, { query: { select: unwrap } });
  const name = claims?.name ?? null;
  // A member may hold more than one active subscription; the pass reflects the first.
  const subscription = subQ.data?.[0];
  const profile = profileQ.data;

  return (
    <Screen>
      <AppText variant="label" className="mt-1">
        {name ? t('card.greeting', { name }) : t('card.greetingNoName')}
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
            <View className="mt-4">
              <PassFace profile={profile} subscription={subscription} />
            </View>

            <View className="mt-4 flex-row flex-wrap items-center gap-x-3 gap-y-2">
              <StatusBadge
                label={t(
                  subscription
                    ? subscriptionStatusLabelKey(subscription.status)
                    : membershipStatusLabelKey(profile.membership_status),
                )}
                variant={statusBadgeVariant(
                  subscription ? subscription.status : profile.membership_status,
                )}
              />
              {!subscription ? <AppText variant="label">{t('card.noSubscription')}</AppText> : null}
            </View>

            <View className="mt-5">
              <Button
                label={t('card.showQr')}
                icon={QrCode}
                onPress={() => router.navigate('/qr')}
              />
            </View>

            <View className="mt-8">
              <AppText variant="label" className="mb-1">
                {t('card.detailsTitle')}
              </AppText>
              <DetailRow icon={<CalendarClock color={colors.neutral[500]} size={18} />}>
                <AppText variant="body">
                  {t('card.memberSince', { date: formatDate(profile.membership_start) })}
                </AppText>
              </DetailRow>
              {profile.email ? (
                <DetailRow icon={<Mail color={colors.neutral[500]} size={18} />}>
                  <AppText variant="body">{profile.email}</AppText>
                </DetailRow>
              ) : null}
              {profile.phone ? (
                <DetailRow icon={<Phone color={colors.neutral[500]} size={18} />}>
                  <AppText variant="mono">{profile.phone}</AppText>
                </DetailRow>
              ) : null}
            </View>

            <View className="mt-8">
              <Button label={t('card.signOut')} variant="outline" icon={LogOut} onPress={signOut} />
            </View>
          </>
        ) : null}
      </QueryBoundary>
    </Screen>
  );
}
