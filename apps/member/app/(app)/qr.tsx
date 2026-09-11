import { useEffect, useState } from 'react';
import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useMeVenues, useMintMemberQr } from '@iziwellpass/api/generated';
import { unwrap } from '@iziwellpass/api/client';
import { Screen } from '@/components/ui/screen';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { secondsUntil } from '@/lib/countdown';

export default function QrScreen() {
  // `POST /gms/v1/me/qr` requires `venue_id` (MeQrRequest) — there is no
  // all-venues form and no venue-selection UI yet in this app, so we mint
  // for the first venue the member is entitled to (`GET /gms/v1/me/venues`).
  const venues = useMeVenues({ query: { select: unwrap } });
  const venueId = venues.data?.[0];

  const mint = useMintMemberQr({ mutation: {} });
  const [now, setNow] = useState(Date.now());
  const data = mint.data ? unwrap(mint.data) : null;
  const remaining = data ? secondsUntil(data.expires_at, now) : 0;
  const expired = !!data && remaining <= 0;
  const noVenue = venues.isSuccess && !venueId;
  const hasError = mint.isError || venues.isError || noVenue;

  const regenerate = () => {
    if (venueId) {
      mint.mutate({ data: { venue_id: venueId } });
    } else {
      // No venue id means the venues fetch failed (or returned nothing):
      // retry THAT, and the mount-mint effect re-mints once venueId resolves.
      void venues.refetch();
    }
  };

  useEffect(() => {
    if (venueId) {
      mint.mutate({ data: { venue_id: venueId } });
    }
    // Fires once venueId resolves from useMeVenues (mount-mint); intentionally
    // excludes `mint` — this project's eslint config has no react-hooks plugin
    // registered, so there is no exhaustive-deps rule to satisfy or suppress.
  }, [venueId]);

  useEffect(() => {
    if (!data || expired) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [data, expired]);

  return (
    <Screen>
      <AppText variant="title">{t('qr.title')}</AppText>
      <AppText variant="label">{t('qr.subtitle')}</AppText>

      <Card className="items-center gap-4 py-8">
        {hasError ? (
          <>
            <AppText className="text-neutral-500">{t('qr.error')}</AppText>
            <Button label={t('qr.generate')} onPress={regenerate} loading={mint.isPending} />
          </>
        ) : data && !expired ? (
          <>
            <View className="rounded-xl bg-neutral-50 p-4">
              <QRCode value={data.token} size={220} color="#1c1917" backgroundColor="#fffefd" />
            </View>
            <AppText variant="mono">{t('qr.expiresIn', { seconds: remaining })}</AppText>
          </>
        ) : data && expired ? (
          <>
            <AppText className="text-neutral-500">{t('qr.expired')}</AppText>
            <Button label={t('qr.refresh')} onPress={regenerate} loading={mint.isPending} />
          </>
        ) : (
          <Button
            label={t('qr.generate')}
            onPress={regenerate}
            loading={venues.isLoading || mint.isPending}
          />
        )}
      </Card>
    </Screen>
  );
}
