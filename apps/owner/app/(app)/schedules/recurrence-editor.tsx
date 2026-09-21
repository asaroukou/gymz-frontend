'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { DayToggle } from '@iziwellpass/ui/components/day-toggle';
import { Input } from '@iziwellpass/ui/components/input';
import { Label } from '@iziwellpass/ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@iziwellpass/ui/components/select';

import { WEEKDAYS, type RecurrenceEditorState, type Weekday } from '@/lib/recurrence';

import { usePlanningLabels } from './planning-utils';

/**
 * Editor for the `recurrence_rule` iCal-subset string. State maps 1:1 to
 * `serializeRecurrenceRule`, so the encoded wire value is unchanged. Canvas
 * `jFogY`: a Répétition · Intervalle row, then « Les jours » as 44px round
 * toggles. No box around it.
 */
export function RecurrenceEditor({
  value,
  onChange,
}: {
  value: RecurrenceEditorState;
  onChange: (next: RecurrenceEditorState) => void;
}) {
  const t = useTranslations('planning');
  const { weekdayShort, weekdayLong } = usePlanningLabels();

  const days = useMemo(
    () => WEEKDAYS.map((day) => ({ value: day, short: weekdayShort(day), long: weekdayLong(day) })),
    [weekdayShort, weekdayLong],
  );

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="recurrence-frequency">{t('form.repeats')}</Label>
          <Select
            value={value.frequency}
            onValueChange={(frequency) =>
              onChange({ ...value, frequency: frequency as RecurrenceEditorState['frequency'] })
            }
          >
            <SelectTrigger id="recurrence-frequency" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('form.repeatNone')}</SelectItem>
              <SelectItem value="daily">{t('form.repeatDaily')}</SelectItem>
              <SelectItem value="weekly">{t('form.repeatWeekly')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {value.frequency !== 'none' ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="recurrence-interval">
              {value.frequency === 'daily' ? t('form.intervalDays') : t('form.intervalWeeks')}
            </Label>
            <Input
              id="recurrence-interval"
              type="number"
              min={1}
              step={1}
              value={value.interval}
              onChange={(e) =>
                onChange({
                  ...value,
                  interval: Math.max(1, Math.floor(e.target.valueAsNumber) || 1),
                })
              }
            />
          </div>
        ) : null}
      </div>

      {value.frequency === 'weekly' ? (
        <div className="flex flex-col gap-2">
          <Label id="recurrence-days-label">{t('form.onDays')}</Label>
          <DayToggle<Weekday>
            aria-labelledby="recurrence-days-label"
            days={days}
            value={value.byDay}
            onChange={(byDay) => onChange({ ...value, byDay })}
          />
        </div>
      ) : null}
    </>
  );
}
