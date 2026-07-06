/**
 * Venue-timezone datetime formatting helpers.
 *
 * These only apply to wire values that are real UTC instants (OpenAPI
 * `format: date-time`, e.g. `ScheduleSlot.start_time`/`end_time`/`date` and
 * `CheckIn.checked_in_at`). `Schedule.start_time`/`end_time` (the recurring
 * template) are plain `NaiveTime` clock strings ("09:00:00") with no date or
 * timezone component — they are already venue-local by definition and must
 * NOT be run through `Intl.DateTimeFormat` with a `timeZone` option, since
 * there's no instant to convert.
 *
 * All formatters are defensive: an invalid/unknown IANA timezone identifier
 * (or an unparsable ISO string) falls back to UTC / a raw passthrough rather
 * than throwing, since these are rendered directly in tables and dialogs.
 */

const FALLBACK_TIME_ZONE = 'UTC';

function safeTimeZone(timeZone: string | undefined): string {
  const tz = timeZone && timeZone.trim().length > 0 ? timeZone : FALLBACK_TIME_ZONE;
  try {
    // Throws RangeError for unknown/invalid IANA identifiers.
    Intl.DateTimeFormat('en-GB', { timeZone: tz });
    return tz;
  } catch {
    return FALLBACK_TIME_ZONE;
  }
}

function formatWith(
  iso: string,
  timeZone: string | undefined,
  options: Intl.DateTimeFormatOptions,
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  try {
    return new Intl.DateTimeFormat('en-GB', {
      ...options,
      timeZone: safeTimeZone(timeZone),
    }).format(date);
  } catch {
    return iso;
  }
}

/** e.g. "08:00" */
export function formatTime(iso: string, timeZone: string | undefined): string {
  return formatWith(iso, timeZone, { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** e.g. "6 Jul 2026, 08:00" */
export function formatDateTime(iso: string, timeZone: string | undefined): string {
  return formatWith(iso, timeZone, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** e.g. "Mon 6 Jul 2026" */
export function formatDateHeading(iso: string, timeZone: string | undefined): string {
  return formatWith(iso, timeZone, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * The venue-local calendar date (YYYY-MM-DD) for a UTC instant — used as a
 * stable group key so date grouping reflects the venue's timezone rather
 * than a UTC date substring. Uses `en-CA` for its `YYYY-MM-DD` formatting.
 */
export function venueDateKey(iso: string, timeZone: string | undefined): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: safeTimeZone(timeZone),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return iso;
  }
}
