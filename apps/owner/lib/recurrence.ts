/**
 * Helpers for the `RecurrenceRule` schema, which (per
 * `packages/api/src/generated/endpoints.schemas.ts`) is a plain iCal RRULE
 * string, not a structured object:
 *
 *   export type RecurrenceRule = string;
 *
 * The API's MVP only supports a narrow subset of RRULE:
 * - `FREQ=DAILY`
 * - `FREQ=WEEKLY;BYDAY=MO,WE,FR`
 * - `FREQ=WEEKLY;BYDAY=SA;INTERVAL=2`
 *
 * These helpers parse that subset into a small structured shape for a humane
 * editor (frequency select + weekday toggle buttons + interval), and
 * serialize the editor state back into an RRULE string for the wire. A
 * schedule with no `recurrence_rule` runs once, on `effective_from` only.
 */

export const WEEKDAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

const WEEKDAY_LABELS: Record<Weekday, string> = {
  MO: 'Mon',
  TU: 'Tue',
  WE: 'Wed',
  TH: 'Thu',
  FR: 'Fri',
  SA: 'Sat',
  SU: 'Sun',
};

export function weekdayLabel(day: Weekday): string {
  return WEEKDAY_LABELS[day];
}

export type RecurrenceFrequency = 'none' | 'daily' | 'weekly';

export interface RecurrenceEditorState {
  frequency: RecurrenceFrequency;
  byDay: Weekday[];
  interval: number;
}

export function defaultRecurrenceEditorState(): RecurrenceEditorState {
  return { frequency: 'none', byDay: [], interval: 1 };
}

function isWeekday(value: string): value is Weekday {
  return (WEEKDAYS as readonly string[]).includes(value);
}

/**
 * Parse an RRULE string (or null/undefined for a one-off schedule) into
 * editor state. Unrecognized parts are ignored rather than rejected — this
 * only needs to round-trip the MVP subset the API supports.
 */
export function parseRecurrenceRule(rule: string | null | undefined): RecurrenceEditorState {
  if (!rule) {
    return defaultRecurrenceEditorState();
  }

  const parts = new Map<string, string>();
  for (const segment of rule.split(';')) {
    const [key, value] = segment.split('=');
    if (key && value) {
      parts.set(key.trim().toUpperCase(), value.trim());
    }
  }

  const freq = parts.get('FREQ');
  const interval = Number(parts.get('INTERVAL') ?? '1');
  const byDay = (parts.get('BYDAY') ?? '')
    .split(',')
    .map((d) => d.trim().toUpperCase())
    .filter(isWeekday);

  if (freq === 'DAILY') {
    return { frequency: 'daily', byDay: [], interval: Number.isFinite(interval) ? interval : 1 };
  }
  if (freq === 'WEEKLY') {
    return {
      frequency: 'weekly',
      byDay,
      interval: Number.isFinite(interval) ? interval : 1,
    };
  }
  return defaultRecurrenceEditorState();
}

/**
 * Serialize editor state back into an RRULE string. Returns `null` for a
 * one-off schedule (no recurrence), matching `recurrence_rule?: string | null`
 * on `CreateScheduleRequest`/`UpdateScheduleRequest`.
 */
export function serializeRecurrenceRule(state: RecurrenceEditorState): string | null {
  if (state.frequency === 'none') {
    return null;
  }
  if (state.frequency === 'daily') {
    return state.interval > 1 ? `FREQ=DAILY;INTERVAL=${state.interval}` : 'FREQ=DAILY';
  }
  // weekly
  const byDay = state.byDay.length > 0 ? `;BYDAY=${state.byDay.join(',')}` : '';
  const interval = state.interval > 1 ? `;INTERVAL=${state.interval}` : '';
  return `FREQ=WEEKLY${byDay}${interval}`;
}

/** Human-readable one-line summary of a recurrence rule for table display. */
export function humanizeRecurrenceRule(rule: string | null | undefined): string {
  const state = parseRecurrenceRule(rule);
  if (state.frequency === 'none') {
    return 'Does not repeat';
  }
  if (state.frequency === 'daily') {
    return state.interval > 1 ? `Every ${state.interval} days` : 'Daily';
  }
  const days = state.byDay.length > 0 ? state.byDay.map(weekdayLabel).join(', ') : 'every day';
  return state.interval > 1 ? `Every ${state.interval} weeks on ${days}` : `Weekly on ${days}`;
}
