import { useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarX2 } from 'lucide-react-native';
import {
  getMeListBookingsQueryKey,
  useMeCancelBooking,
  useMeListBookings,
  useMeSlots,
  useMeVenues,
} from '@iziwellpass/api/generated';
import { ApiError, unwrap } from '@iziwellpass/api/client';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { Button, IconMedallion } from '@/components/ui/button';
import { StatusBadge, statusBadgeVariant } from '@/components/ui/status-badge';
import { QueryBoundary } from '@/components/ui/query-boundary';
import { Sheet } from '@/components/ui/sheet';
import { useToast } from '@/components/ui/toast';
import { t } from '@/lib/i18n';
import { bookingStatusLabelKey, isCancellable } from '@/lib/bookings';
import { joinBookings, slotWindow, splitBookingViews, type BookingView } from '@/lib/booking-slots';
import { formatDayNumber, formatShortDate, formatTime, formatWeekdayShort } from '@/lib/format';

function DateBlock({ startsAt, upcoming }: { startsAt: string | null; upcoming: boolean }) {
  return (
    <View className={`h-14 w-12 items-center justify-center rounded-card ${upcoming ? 'bg-tint-bleu' : 'bg-side'}`}>
      <AppText variant="numeric" className="text-[20px] leading-[24px]">
        {startsAt ? formatDayNumber(startsAt) : '—'}
      </AppText>
      {startsAt ? <AppText variant="caption">{formatWeekdayShort(startsAt)}</AppText> : null}
    </View>
  );
}

function Row({
  view,
  upcoming,
  onCancel,
}: {
  view: BookingView;
  upcoming: boolean;
  onCancel: (v: BookingView) => void;
}) {
  return (
    <View className="min-h-[72px] flex-row items-start gap-4 border-b border-border py-3">
      <DateBlock startsAt={view.startsAt} upcoming={upcoming} />
      <View className="flex-1 gap-1">
        <View className="flex-row items-center justify-between gap-3">
          <AppText variant="bodyStrong">{t('bookings.session')}</AppText>
          <StatusBadge label={t(bookingStatusLabelKey(view.status))} variant={statusBadgeVariant(view.status)} />
        </View>
        <AppText variant={view.startsAt ? 'numeric' : 'label'} className="text-[13px] text-muted">
          {view.startsAt ? formatTime(view.startsAt) : t('bookings.dateUnknown')}
        </AppText>
        {isCancellable(view.status) && upcoming ? (
          <View className="-ml-4 self-start">
            <Button label={t('bookings.cancel')} variant="ghost" size="sm" fullWidth={false} onPress={() => onCancel(view)} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mt-6">
      <AppText variant="heading" className="mb-1">
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
        <View key={i} className="h-[72px] rounded-card bg-secondary" />
      ))}
    </View>
  );
}

function whenLabel(view: BookingView): string {
  if (!view.startsAt) return t('bookings.whenUnknown');
  return t('bookings.when', {
    weekday: formatWeekdayShort(view.startsAt),
    date: formatShortDate(view.startsAt),
    time: formatTime(view.startsAt),
  });
}

export default function BookingsScreen() {
  const qc = useQueryClient();
  const toast = useToast();
  const list = useMeListBookings(undefined, { query: { select: unwrap } });
  const venues = useMeVenues(undefined, { query: { select: unwrap } });
  const venueId = venues.data?.[0];
  const range = useMemo(() => slotWindow(), []);
  const slots = useMeSlots(
    { venue_id: venueId ?? '', from: range.from, to: range.to },
    { query: { select: unwrap, enabled: !!venueId } },
  );
  const [pending, setPending] = useState<BookingView | null>(null);

  const cancel = useMeCancelBooking({
    mutation: {
      onSuccess: () => {
        setPending(null);
        void qc.invalidateQueries({ queryKey: getMeListBookingsQueryKey() });
      },
      onError: (err) => {
        setPending(null);
        toast.show({
          title: t('bookings.cancelWindowClosedTitle'),
          description:
            err instanceof ApiError && err.status === 409 ? t('bookings.cancelWindowClosed') : t('bookings.cancelErrorHint'),
        });
      },
    },
  });

  const views = joinBookings(list.data ?? [], slots.data);
  const { upcoming, past } = splitBookingViews(views);
  const isEmpty = !!list.data && list.data.length === 0;

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
            <AppText variant="heading">{t('bookings.empty')}</AppText>
            <AppText variant="body" className="max-w-[300px] text-center text-muted">
              {t('bookings.emptyHint')}
            </AppText>
          </View>
        ) : (
          <>
            {upcoming.length > 0 ? (
              <Section title={t('bookings.upcoming')}>
                {upcoming.map((v) => (
                  <Row key={v.id} view={v} upcoming onCancel={setPending} />
                ))}
              </Section>
            ) : null}
            {past.length > 0 ? (
              <Section title={t('bookings.past')}>
                {past.map((v) => (
                  <Row key={v.id} view={v} upcoming={false} onCancel={setPending} />
                ))}
              </Section>
            ) : null}
          </>
        )}
      </QueryBoundary>

      <Sheet
        open={pending !== null}
        onClose={() => (cancel.isPending ? undefined : setPending(null))}
        title={t('bookings.cancelConfirmTitle')}
        description={pending ? t('bookings.cancelConfirmBody', { when: whenLabel(pending) }) : undefined}
      >
        <Button
          label={t('bookings.cancelConfirm')}
          variant="destructive"
          loading={cancel.isPending}
          onPress={() => pending && cancel.mutate({ bid: pending.id })}
        />
        <View className="flex-row justify-center">
          <Button
            label={t('bookings.keep')}
            variant="ghost"
            fullWidth={false}
            disabled={cancel.isPending}
            onPress={() => setPending(null)}
          />
        </View>
      </Sheet>
    </Screen>
  );
}
