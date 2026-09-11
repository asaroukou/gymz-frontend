import { Alert, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import {
  useMeListBookings,
  useMeCancelBooking,
  getMeListBookingsQueryKey,
} from '@iziwellpass/api/generated';
import { unwrap, ApiError } from '@iziwellpass/api/client';
import { Screen } from '@/components/ui/screen';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { StatusBadge, statusBadgeVariant } from '@/components/ui/status-badge';
import { QueryBoundary } from '@/components/ui/query-boundary';
import { t } from '@/lib/i18n';
import { formatDate } from '@/lib/format';
import { bookingStatusLabelKey, isCancellable } from '@/lib/bookings';

export default function BookingsScreen() {
  const qc = useQueryClient();
  const list = useMeListBookings({ query: { select: unwrap } });
  const cancel = useMeCancelBooking({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getMeListBookingsQueryKey() }),
      onError: (err) => {
        const ref =
          err instanceof ApiError && err.requestId ? ` · ref: ${err.requestId.slice(0, 8)}` : '';
        Alert.alert(t('bookings.cancelError') + ref);
      },
    },
  });

  const confirmCancel = (bid: string) =>
    Alert.alert(t('bookings.cancelConfirmTitle'), t('bookings.cancelConfirmBody'), [
      { text: t('bookings.keep'), style: 'cancel' },
      {
        text: t('bookings.cancelConfirm'),
        style: 'destructive',
        onPress: () => cancel.mutate({ bid }),
      },
    ]);

  return (
    <Screen>
      <AppText variant="title">{t('bookings.title')}</AppText>
      <QueryBoundary
        isLoading={list.isLoading}
        isError={list.isError}
        errorText={t('bookings.error')}
        onRetry={() => void list.refetch()}
      >
        {list.data && list.data.length === 0 ? (
          <AppText className="py-8 text-center text-neutral-500">{t('bookings.empty')}</AppText>
        ) : (
          (list.data ?? []).map((b) => (
            <Card key={b.id}>
              <View className="flex-row items-center justify-between">
                <AppText>{formatDate(b.booked_at)}</AppText>
                <StatusBadge
                  label={t(bookingStatusLabelKey(b.status))}
                  variant={statusBadgeVariant(b.status)}
                />
              </View>
              {isCancellable(b.status) ? (
                <View className="mt-3 self-start">
                  <Button
                    label={t('bookings.cancel')}
                    variant="ghost"
                    onPress={() => confirmCancel(b.id)}
                    loading={cancel.isPending && cancel.variables?.bid === b.id}
                  />
                </View>
              ) : null}
            </Card>
          ))
        )}
      </QueryBoundary>
    </Screen>
  );
}
