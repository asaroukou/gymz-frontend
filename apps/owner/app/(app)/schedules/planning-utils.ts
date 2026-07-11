'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';

import type {
  Booking,
  BookingSource,
  BookingStatus,
  Member,
  SlotStatus,
} from '@iziwellpass/api/schemas';

import { summarizeRecurrenceRule, type Weekday } from '@/lib/recurrence';

export type BadgeVariant =
  'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info' | 'outline';

export interface BadgeSpec {
  variant: BadgeVariant;
  label: string;
}

// ---------------------------------------------------------------------------
// Pure helpers (no i18n)
// ---------------------------------------------------------------------------

export function memberName(member: Member): string {
  return `${member.first_name} ${member.last_name}`.trim();
}

export function memberInitials(member: Member): string {
  const first = member.first_name.charAt(0);
  const last = member.last_name.charAt(0);
  return `${first}${last}`.toUpperCase() || '?';
}

/**
 * Resolve the display label for a booking's actor. `CreateBookingRequest`
 * allows exactly one of `member_id`/`pass_holder_id`; marketplace pass-holder
 * bookings are out of scope for this slice, so we resolve member bookings by
 * name via the members lookup map and fall back to a raw id otherwise.
 */
export function resolveBookingActorLabel(
  booking: Booking,
  memberById: Map<string, Member>,
): string {
  if (booking.member_id) {
    const member = memberById.get(booking.member_id);
    return member ? memberName(member) : booking.member_id;
  }
  return booking.pass_holder_id ?? '—';
}

// Capacity bar colour now lives in the shared `Capacity` component
// (`@iziwellpass/ui/components/capacity`), which co-decides the bar fill and
// the badge level so they can't drift. A full slot reads as amber ("complet",
// no more room) rather than red; red is reserved for genuine overbooking.
const SLOT_STATUS_VARIANT: Record<SlotStatus, BadgeVariant> = {
  available: 'success',
  full: 'warning',
  cancelled: 'outline',
};

const BOOKING_STATUS_VARIANT: Record<BookingStatus, BadgeVariant> = {
  confirmed: 'success',
  checked_in: 'info',
  no_show: 'warning',
  cancelled: 'outline',
};

// ---------------------------------------------------------------------------
// i18n-bound label helpers
// ---------------------------------------------------------------------------

export interface PlanningLabels {
  weekdayAbbr: (day: Weekday) => string;
  weekdayShort: (day: Weekday) => string;
  weekdayLong: (day: Weekday) => string;
  formatRecurrence: (rule: string | null | undefined) => string;
  slotStatusBadge: (status: SlotStatus) => BadgeSpec;
  bookingStatusBadge: (status: BookingStatus) => BadgeSpec;
  bookingSourceLabel: (source: BookingSource) => string;
}

/**
 * Binds the `planning` message namespace into ready-to-render label helpers:
 * localized weekday names, the French recurrence humanization built from the
 * language-agnostic `RecurrenceSummary`, and status/source badge specs.
 */
export function usePlanningLabels(): PlanningLabels {
  const t = useTranslations('planning');

  const weekdayAbbr = useCallback((day: Weekday) => t(`weekday.${day}`), [t]);
  const weekdayShort = useCallback((day: Weekday) => t(`weekdayShort.${day}`), [t]);
  const weekdayLong = useCallback((day: Weekday) => t(`weekdayLong.${day}`), [t]);

  const formatRecurrence = useCallback(
    (rule: string | null | undefined) => {
      const summary = summarizeRecurrenceRule(rule);
      if (summary.kind === 'none') {
        return t('recurrence.once');
      }
      if (summary.kind === 'daily') {
        return summary.interval > 1
          ? t('recurrence.dailyEvery', { interval: summary.interval })
          : t('recurrence.daily');
      }
      const days =
        summary.days.length > 0
          ? summary.days.map((day) => weekdayAbbr(day)).join(', ')
          : t('recurrence.allDays');
      if (summary.interval > 1) {
        return t('recurrence.weeklyEvery', { interval: summary.interval, days });
      }
      return summary.days.length > 0 ? days : t('recurrence.weekly');
    },
    [t, weekdayAbbr],
  );

  const slotStatusBadge = useCallback(
    (status: SlotStatus): BadgeSpec => ({
      variant: SLOT_STATUS_VARIANT[status],
      label: t(`slotStatus.${status}`),
    }),
    [t],
  );

  const bookingStatusBadge = useCallback(
    (status: BookingStatus): BadgeSpec => ({
      variant: BOOKING_STATUS_VARIANT[status],
      label: t(`bookingStatus.${status}`),
    }),
    [t],
  );

  const bookingSourceLabel = useCallback(
    (source: BookingSource) => t(`bookingSource.${source}`),
    [t],
  );

  return {
    weekdayAbbr,
    weekdayShort,
    weekdayLong,
    formatRecurrence,
    slotStatusBadge,
    bookingStatusBadge,
    bookingSourceLabel,
  };
}
