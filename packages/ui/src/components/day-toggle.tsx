'use client';

import * as React from 'react';

import { cn } from '@iziwellpass/ui/lib/utils';

export interface DayToggleDay<T extends string> {
  value: T;
  /** One letter, shown in the pill. */
  short: string;
  /** Full name, the accessible label. */
  long: string;
}

export interface DayToggleProps<T extends string> extends Omit<
  React.ComponentProps<'div'>,
  'onChange' | 'value'
> {
  days: ReadonlyArray<DayToggleDay<T>>;
  value: ReadonlyArray<T>;
  /** Receives the selected days in the order of `days`, so a stored rule stays stable. */
  onChange: (next: T[]) => void;
  disabled?: boolean;
}

/** 44px round day pills: ink when pressed, grey pill when idle. */
export function DayToggle<T extends string>({
  days,
  value,
  onChange,
  disabled,
  className,
  ...props
}: DayToggleProps<T>) {
  const toggle = (day: T) => {
    const pressed = value.includes(day);
    onChange(days.map((d) => d.value).filter((d) => (d === day ? !pressed : value.includes(d))));
  };
  return (
    <div
      role="group"
      data-slot="day-toggle"
      className={cn('flex flex-wrap gap-2', className)}
      {...props}
    >
      {days.map((day) => {
        const pressed = value.includes(day.value);
        return (
          <button
            key={day.value}
            type="button"
            aria-pressed={pressed}
            aria-label={day.long}
            disabled={disabled}
            className={cn(
              'size-11 rounded-full text-md font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50',
              pressed
                ? 'bg-primary text-primary-foreground hover:bg-primary-hover'
                : 'bg-secondary text-foreground hover:bg-accent',
            )}
            onClick={() => toggle(day.value)}
          >
            {day.short}
          </button>
        );
      })}
    </div>
  );
}
