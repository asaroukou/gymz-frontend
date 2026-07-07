'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@iziwellpass/ui/components/button';
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
 * `serializeRecurrenceRule`, so the encoded wire value is unchanged — this
 * only restyles/translates the control (frequency select, 7 weekday toggle
 * pills, interval input).
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

  const toggleDay = (day: Weekday) => {
    const has = value.byDay.includes(day);
    onChange({
      ...value,
      byDay: has ? value.byDay.filter((d) => d !== day) : [...value.byDay, day],
    });
  };

  return (
    <div className="space-y-4 rounded-2xl border p-4">
      <div className="space-y-1.5">
        <Label>{t('form.repeats')}</Label>
        <Select
          value={value.frequency}
          onValueChange={(frequency) =>
            onChange({ ...value, frequency: frequency as RecurrenceEditorState['frequency'] })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t('form.repeatNone')}</SelectItem>
            <SelectItem value="daily">{t('form.repeatDaily')}</SelectItem>
            <SelectItem value="weekly">{t('form.repeatWeekly')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {value.frequency === 'weekly' ? (
        <div className="space-y-1.5">
          <Label id="recurrence-days-label">{t('form.onDays')}</Label>
          <div
            role="group"
            aria-labelledby="recurrence-days-label"
            className="flex flex-wrap gap-1.5"
          >
            {WEEKDAYS.map((day) => {
              const active = value.byDay.includes(day);
              return (
                <Button
                  key={day}
                  type="button"
                  size="icon"
                  variant={active ? 'default' : 'outline'}
                  aria-pressed={active}
                  aria-label={weekdayLong(day)}
                  onClick={() => toggleDay(day)}
                >
                  {weekdayShort(day)}
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}

      {value.frequency !== 'none' ? (
        <div className="space-y-1.5">
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
            className="w-24"
          />
        </div>
      ) : null}
    </div>
  );
}
