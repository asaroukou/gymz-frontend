import type { ReactNode } from 'react';
import { Alert, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarX2 } from 'lucide-react-native';
import {
  useMeListBookings,
  useMeCancelBooking,
  getMeListBookingsQueryKey,
} from '@iziwellpass/api/generated';
import { unwrap, ApiError } from '@iziwellpass/api/client';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { Button, IconMedallion } from '@/components/ui/button';
import { StatusBadge, statusBadgeVariant } from '@/components/ui/status-badge';
import { QueryBoundary } from '@/components/ui/query-boundary';
import { t } from '@/lib/i18n';
import { bookingStatusLabelKey, isCancellable, splitBookings } from '@/lib/bookings';

type Booking = { id: string; status: string; booked_at: string };

function parts(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const f = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('fr-FR', opts).format(d);
  return {
    day: f({ day: '2-digit' }),
    month: f({ month: 'short' }).replace('.', ''),
    time: f({ hour: '2-digit', minute: '2-digit' }),
    long: f({ weekday: 'long', day: 'numeric', month: 'long' }),
  };
}

function DateChip({ iso }: { iso: string }) {
  const p = parts(iso);
  return (
    <View className="h-14 w-14 items-center justify-center rounded-xl bg-neutral-100">
      <AppText variant="mono" className="text-[18px] leading-[20px]">
        {p?.day ?? '—'}
      </AppText>
      {p ? <AppText variant="label">{p.month}</AppText> : null}
    </View>
  );
}

function BookingRow({
  booking,
  muted,
  onCancel,
  canceling,
}: {
  booking: Booking;
  muted?: boolean;
  onCancel: (id: string) => void;
  canceling: boolean;
}) {
  const p = parts(booking.booked_at);
  return (
    <View className={`border-b border-border py-4 ${muted ? 'opacity-60' : ''}`}>
      <View className="flex-row items-center gap-4">
        <DateChip iso={booking.booked_at} />
        <View className="flex-1">
          <AppText variant="mono" className="text-[17px]">
            {p?.time ?? '—'}
          </AppText>
          {p ? <AppText variant="label">{p.long}</AppText> : null}
        </View>
        <StatusBadge
          label={t(bookingStatusLabelKey(booking.status))}
          variant={statusBadgeVariant(booking.status)}
        />
      </View>
      {isCancellable(booking.status) ? (
        <View className="mt-1 items-end">
          <Button
            label={t('bookings.cancel')}
            variant="ghost"
            fullWidth={false}
            onPress={() => onCancel(booking.id)}
            loading={canceling}
          />
        </View>
      ) : null}
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mt-6">
      <AppText variant="label" className="mb-1">
        {title}
      </AppText>
      {children}
    </View>
  );
}

function ListSkeleton() {
  return (
    <View className="mt-6 gap-4">
      {[0, 1, 2].map((i) => (
        <View key={i} className="h-16 rounded-xl bg-neutral-100" />
      ))}
    </View>
  );
}

export default function BookingsScreen() {
  const qc = useQueryClient();
  const list = useMeListBookings(undefined, { query: { select: unwrap } });
  const cancel = useMeCancelBooking({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getMeListBookingsQueryKey() }),
      onError: (err) => {
        if (err instanceof ApiError && err.status === 409) {
          Alert.alert(t('bookings.cancelWindowClosedTitle'), t('bookings.cancelWindowClosed'));
          return;
        }
        const ref =
          err instanceof ApiError && err.requestId
            ? `ref: ${err.requestId.slice(0, 8)}`
            : undefined;
        Alert.alert(t('bookings.cancelError'), ref);
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

  const { upcoming, past } = splitBookings((list.data ?? []) as Booking[]);
  const isEmpty = list.data && list.data.length === 0;
  const cancelingId = cancel.isPending ? cancel.variables?.bid : undefined;

  return (
    <Screen>
      <AppText variant="title" className="mt-1">
        {t('bookings.title')}
      </AppText>

      <QueryBoundary
        isLoading={list.isLoading}
        isError={list.isError}
        errorText={t('bookings.error')}
        onRetry={() => void list.refetch()}
        loadingFallback={<ListSkeleton />}
      >
        {isEmpty ? (
          <View className="items-center gap-4 py-16">
            <IconMedallion icon={CalendarX2} />
            <AppText variant="section">{t('bookings.empty')}</AppText>
            <AppText variant="body" className="text-center text-neutral-500">
              {t('bookings.emptyHint')}
            </AppText>
          </View>
        ) : (
          <>
            {upcoming.length > 0 ? (
              <Section title={t('bookings.upcoming')}>
                {upcoming.map((b) => (
                  <BookingRow
                    key={b.id}
                    booking={b}
                    onCancel={confirmCancel}
                    canceling={cancelingId === b.id}
                  />
                ))}
              </Section>
            ) : null}
            {past.length > 0 ? (
              <Section title={t('bookings.past')}>
                {past.map((b) => (
                  <BookingRow
                    key={b.id}
                    booking={b}
                    muted
                    onCancel={confirmCancel}
                    canceling={cancelingId === b.id}
                  />
                ))}
              </Section>
            ) : null}
          </>
        )}
      </QueryBoundary>
    </Screen>
  );
}
