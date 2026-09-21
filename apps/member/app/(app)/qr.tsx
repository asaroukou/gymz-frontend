import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Brightness from 'expo-brightness';
import QRCode from 'react-native-qrcode-svg';
import { QrCode, RefreshCw, ScanLine, TriangleAlert } from 'lucide-react-native';
import { useMeVenues, useMintMemberQr } from '@iziwellpass/api/generated';
import { unwrap, ApiError } from '@iziwellpass/api/client';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { Button, IconButton, IconMedallion } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { secondsUntil } from '@/lib/countdown';
import { colors } from '@/lib/theme';

const QR_TTL_SECONDS = 300;

export default function QrScreen() {
  // `POST /gms/v1/me/qr` requires `venue_id`; there is no all-venues form and no
  // venue picker yet, so we mint for the first venue the member is entitled to.
  const venues = useMeVenues(undefined, { query: { select: unwrap } });
  const venueId = venues.data?.[0];

  const mint = useMintMemberQr({ mutation: {} });
  const [now, setNow] = useState(Date.now());
  const data = mint.data ? unwrap(mint.data) : null;
  const remaining = data ? secondsUntil(data.expires_at, now) : 0;
  const expired = !!data && remaining <= 0;

  // 403 = the venue's plan does not include the member QR: an honest "not
  // available" state, not a transient error to retry.
  const unavailable = mint.error instanceof ApiError && mint.error.status === 403;
  const hardError =
    (mint.isError && !unavailable) || venues.isError || (venues.isSuccess && !venueId);

  const doMint = useCallback(() => {
    if (venueId) mint.mutate({ data: { venue_id: venueId } });
  }, [venueId, mint]);

  // Boost screen brightness while the code is visible so it scans at a dim front
  // desk; restore on blur. Mint a fresh code on focus when none is live.
  const prevBrightness = useRef<number | null>(null);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        try {
          prevBrightness.current = await Brightness.getBrightnessAsync();
          if (!cancelled) await Brightness.setBrightnessAsync(1);
        } catch {
          // brightness control unavailable (e.g. web) — the QR still shows
        }
      })();
      if (venueId && !mint.data) doMint();
      return () => {
        cancelled = true;
        void (async () => {
          try {
            if (prevBrightness.current !== null) {
              await Brightness.setBrightnessAsync(prevBrightness.current);
            }
          } catch {
            // ignore
          }
        })();
      };
      // `doMint`/`mint.data` intentionally excluded: this fires per focus keyed
      // on venueId. No react-hooks lint plugin is registered in this project.
    }, [venueId]),
  );

  useEffect(() => {
    if (!data || expired) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [data, expired]);

  const fraction = Math.max(0, Math.min(1, remaining / QR_TTL_SECONDS));
  const minting = venues.isLoading || (mint.isPending && !data);

  return (
    <Screen scroll={false} contentClassName="items-stretch">
      <AppText variant="title" className="mt-1">
        {t('qr.title')}
      </AppText>
      <AppText variant="body" className="mt-1 text-neutral-500">
        {t('qr.subtitle')}
      </AppText>

      <View className="flex-1 items-center justify-center gap-6">
        {unavailable ? (
          <View className="items-center gap-4">
            <IconMedallion icon={QrCode} />
            <AppText variant="section">{t('qr.unavailable')}</AppText>
            <AppText variant="body" className="max-w-[280px] text-center text-neutral-500">
              {t('qr.unavailableHint')}
            </AppText>
          </View>
        ) : hardError ? (
          <View className="items-center gap-4">
            <IconMedallion
              icon={TriangleAlert}
              tint={colors.destructive.foreground}
              wash="bg-destructive/10"
            />
            <AppText variant="body" className="text-center text-neutral-500">
              {t('qr.error')}
            </AppText>
            <Button
              label={t('qr.generate')}
              onPress={venueId ? doMint : () => void venues.refetch()}
              loading={mint.isPending}
              fullWidth={false}
            />
          </View>
        ) : data && !expired ? (
          <>
            <View className="rounded-xl border border-border bg-neutral-50 p-6">
              <QRCode
                value={data.token}
                size={240}
                color={colors.foreground}
                backgroundColor={colors.neutral[50]}
              />
            </View>
            <View className="w-full max-w-[288px] items-center gap-2">
              <View className="h-2 w-full overflow-hidden rounded-pill bg-neutral-100">
                <View
                  className="h-2 rounded-pill bg-primary"
                  style={{ width: `${fraction * 100}%` }}
                />
              </View>
              <AppText variant="mono" className="text-neutral-500">
                {t('qr.expiresIn', { seconds: remaining })}
              </AppText>
            </View>
          </>
        ) : data && expired ? (
          <View className="items-center gap-4">
            <IconMedallion icon={RefreshCw} />
            <AppText variant="section">{t('qr.expired')}</AppText>
            <AppText variant="body" className="text-neutral-500">
              {t('qr.expiredHint')}
            </AppText>
            <Button
              label={t('qr.refresh')}
              icon={RefreshCw}
              onPress={doMint}
              loading={mint.isPending}
              fullWidth={false}
            />
          </View>
        ) : minting ? (
          <View className="items-center gap-4">
            <View className="h-[288px] w-[288px] items-center justify-center rounded-xl bg-neutral-100">
              <ScanLine color={colors.neutral[400]} size={48} strokeWidth={1.5} />
            </View>
          </View>
        ) : (
          <Button label={t('qr.generate')} icon={QrCode} onPress={doMint} fullWidth={false} />
        )}
      </View>

      {data && !expired ? (
        <View className="items-center pb-2">
          <IconButton
            icon={RefreshCw}
            label={t('qr.refresh')}
            onPress={doMint}
            loading={mint.isPending}
          />
        </View>
      ) : null}
    </Screen>
  );
}
