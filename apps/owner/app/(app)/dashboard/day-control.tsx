'use client';

import { useId, useState } from 'react';
import { CalendarDaysIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { Input } from '@iziwellpass/ui/components/input';
import { Label } from '@iziwellpass/ui/components/label';
import { Popover, PopoverContent, PopoverTrigger } from '@iziwellpass/ui/components/popover';
import { cn } from '@iziwellpass/ui/lib/utils';

import { dayLabel, parseDayInput, resolveDay, type DaySelection } from '@/lib/today';

const pill = (active: boolean) =>
  cn(
    'inline-flex h-11 items-center gap-2 rounded-full px-4 text-base transition-colors md:h-10',
    active ? 'bg-secondary font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
  );

/**
 * « Aujourd'hui / Demain / Choisir une date » above the tiles (`s8LRy3`).
 * Scopes the tiles only (spec T4). The picked day keeps the popover open while
 * the year is typed (plan R4); Enter or an outside click closes it.
 */
export function DayControl({
  selection,
  onChange,
  todayKey,
}: {
  selection: DaySelection;
  onChange: (selection: DaySelection) => void;
  todayKey: string;
}) {
  const t = useTranslations('dashboard.day');
  const locale = useLocale();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const picked = selection.kind === 'date';

  return (
    <div role="group" aria-label={t('label')} className="flex flex-wrap items-center justify-center gap-1">
      <button
        type="button"
        aria-pressed={selection.kind === 'today'}
        className={pill(selection.kind === 'today')}
        onClick={() => onChange({ kind: 'today' })}
      >
        {t('today')}
      </button>
      <button
        type="button"
        aria-pressed={selection.kind === 'tomorrow'}
        className={pill(selection.kind === 'tomorrow')}
        onClick={() => onChange({ kind: 'tomorrow' })}
      >
        {t('tomorrow')}
      </button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" aria-pressed={picked} className={pill(picked)}>
            <CalendarDaysIcon aria-hidden="true" className="size-4" />
            {picked ? dayLabel(selection.date, locale) : t('pick')}
          </button>
        </PopoverTrigger>
        <PopoverContent align="center" className="flex w-64 flex-col gap-2">
          <Label htmlFor={inputId}>{t('input')}</Label>
          <Input
            id={inputId}
            type="date"
            defaultValue={resolveDay(selection, todayKey)}
            onChange={(event) => {
              const day = parseDayInput(event.target.value);
              if (day) onChange({ kind: 'date', date: day });
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
