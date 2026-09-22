'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';

import type { BookingSource, BookingStatus, Member, SlotStatus } from '@iziwellpass/api/schemas';

import { summarizeRecurrenceRule, type Weekday } from '@/lib/recurrence';

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

// Badge colours live in lib/slot-status.ts (slotBadgeVariant, bookingBadgeVariant).

// ---------------------------------------------------------------------------
// i18n-bound label helpers
// ---------------------------------------------------------------------------

export interface PlanningLabels {
  weekdayAbbr: (day: Weekday) => string;
  weekdayShort: (day: Weekday) => string;
  weekdayLong: (day: Weekday) => string;
  formatRecurrence: (rule: string | null | undefined) => string;
  slotStatusLabel: (status: SlotStatus) => string;
  bookingStatusLabel: (status: BookingStatus) => string;
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
      return summary.days.length > 0
        ? `${t('recurrence.weekly')} · ${days}`
        : t('recurrence.weekly');
    },
    [t, weekdayAbbr],
  );

  const slotStatusLabel = useCallback((status: SlotStatus) => t(`slotStatus.${status}`), [t]);
  const bookingStatusLabel = useCallback(
    (status: BookingStatus) => t(`bookingStatus.${status}`),
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
    slotStatusLabel,
    bookingStatusLabel,
    bookingSourceLabel,
  };
}
