import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Brightness from 'expo-brightness';
import QRCode from 'react-native-qrcode-svg';
import { QrCode, RefreshCw } from 'lucide-react-native';
import {
  useMeMemberships,
  useMeProfile,
  useMeSubscription,
  useMeVenues,
  useMintMemberQr,
} from '@iziwellpass/api/generated';
import { unwrap, ApiError } from '@iziwellpass/api/client';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Avatar } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/ui/status-badge';
import { t } from '@/lib/i18n';
import { secondsUntil } from '@/lib/countdown';
import { formatCountdown } from '@/lib/format';
import { cardView, planLabel } from '@/lib/card-view';
import { pickMembership } from '@/lib/venue';
import { colors } from '@/lib/theme';

const QR_BOX = 'h-[288px] w-[288px] items-center justify-center rounded-panel border border-border bg-background';

/** Raise brightness while `live`; restore when not live or when leaving (spec M6). */
function useBrightnessWhile(live: boolean) {
  const previous = useRef<number | null>(null);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (live) {
        void (async () => {
          try {
            previous.current = await Brightness.getBrightnessAsync();
            if (!cancelled) await Brightness.setBrightnessAsync(1);
          } catch {
            // brightness control unavailable (e.g. web) — the QR still shows
          }
        })();
      }
      return () => {
        cancelled = true;
        const restore = previous.current;
        previous.current = null;
        if (restore !== null) void Brightness.setBrightnessAsync(restore).catch(() => undefined);
      };
    }, [live]),
  );
}

export default function QrScreen() {
  // POST /me/qr requires venue_id; mint for the first entitled venue (no picker yet).
  const venues = useMeVenues(undefined, { query: { select: unwrap } });
  const venueId = venues.data?.[0];
  const memberships = useMeMemberships({ query: { select: unwrap } });
  const profile = useMeProfile(undefined, { query: { select: unwrap } });
  const subs = useMeSubscription(undefined, { query: { select: unwrap } });

  const mint = useMintMemberQr({ mutation: {} });
  const [mintedAt, setMintedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const data = mint.data ? unwrap(mint.data) : null;
  const remaining = data ? secondsUntil(data.expires_at, now) : 0;
  const lifetime = data && mintedAt ? Math.max(1, data.expires_at - Math.floor(mintedAt / 1000)) : 1;
  const expired = !!data && remaining <= 0;
  const live = !!data && !expired;
  const unavailable = mint.error instanceof ApiError && mint.error.status === 403;
  const hardError = (mint.isError && !unavailable) || venues.isError || (venues.isSuccess && !venueId);

  const doMint = useCallback(() => {
    if (!venueId || mint.isPending) return;
    mint.mutate({ data: { venue_id: venueId } }, { onSuccess: () => { setMintedAt(Date.now()); setNow(Date.now()); } });
  }, [venueId, mint]);

  useBrightnessWhile(live);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [live]);

  const venue = pickMembership(memberships.data, venues.data)?.gym_name ?? '';
  const view = profile.data ? cardView(profile.data, subs.data?.[0]) : null;
  // Packs show no plan line on the strip either (Carte ruling), and the plan
  // label never carries the renewal suffix here — the strip already reads
  // `[plan, venue].join(' · ')`, so a trailing « · Renouvelé … » would push
  // the venue past view before it ever renders.
  const plan = view && view.state !== 'pack' ? planLabel(view.planLine, (key) => t(key)) : null;
  const name = profile.data ? `${profile.data.first_name} ${profile.data.last_name}`.trim() : '';

  return (
    <Screen scroll={false}>
      <AppText variant="title" className="mt-1 text-center">
        {t('qr.title')}
      </AppText>
      <AppText variant="body" tone="muted" className="mt-1 text-center">
        {t('qr.subtitle')}
      </AppText>

      <View className="flex-1 items-center justify-center gap-6">
        {unavailable ? (
          <View className="w-full">
            <Notice variant="warning" title={t('qr.unavailable')} message={t('qr.unavailableHint')} />
          </View>
        ) : hardError ? (
          <View className="w-full">
            <Notice
              variant="destructive"
              message={t('qr.error')}
              action={{ label: t('common.retry'), onPress: venueId ? doMint : () => void venues.refetch() }}
            />
          </View>
        ) : live && data ? (
          <>
            <View className={QR_BOX}>
              <QRCode value={data.token} size={240} color={colors.ink} backgroundColor={colors.background} />
            </View>
            <View className="w-full max-w-[288px] gap-2">
              <ProgressBar value={remaining / lifetime} label={t('qr.expiresIn', { time: formatCountdown(remaining) })} />
              <AppText variant="numeric" tone="muted" className="text-center">
                {t('qr.expiresIn', { time: formatCountdown(remaining) })}
              </AppText>
            </View>
          </>
        ) : expired ? (
          <>
            <View className={`${QR_BOX} gap-2 bg-side`}>
              <AppText variant="heading">{t('qr.expired')}</AppText>
              <AppText variant="body" tone="muted">
                {t('qr.expiredHint')}
              </AppText>
            </View>
            <View className="w-full max-w-[288px]">
              <Button label={t('qr.refresh')} icon={RefreshCw} onPress={doMint} loading={mint.isPending} />
            </View>
          </>
        ) : (
          <>
            <View className={QR_BOX}>
              <QrCode color={colors.border} size={120} strokeWidth={1} />
            </View>
            <AppText variant="label" className="max-w-[288px] text-center">
              {t('qr.beforeHint')}
            </AppText>
            <View className="w-full max-w-[288px]">
              <Button
                label={t('qr.generate')}
                icon={QrCode}
                onPress={doMint}
                loading={mint.isPending || venues.isLoading}
              />
            </View>
          </>
        )}
      </View>

      {live && name ? (
        <View className="flex-row items-center gap-3 border-t border-border py-3">
          <Avatar name={name} />
          <View className="flex-1">
            <AppText variant="bodyStrong" numberOfLines={1}>
              {name}
            </AppText>
            <AppText variant="label" numberOfLines={1}>
              {[plan, venue].filter(Boolean).join(' · ')}
            </AppText>
          </View>
          <StatusBadge
            label={view ? t(view.badgeKey) : t('qr.active')}
            variant={view ? view.badgeVariant : 'success'}
          />
        </View>
      ) : null}
    </Screen>
  );
}
