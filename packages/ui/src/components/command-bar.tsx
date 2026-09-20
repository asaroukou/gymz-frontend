'use client';

import * as React from 'react';
import { ArrowUp } from 'lucide-react';

import { Button } from '@iziwellpass/ui/components/button';
import { cn } from '@iziwellpass/ui/lib/utils';

export interface CommandBarProps {
  /** Leading icon, rendered at 20px in ink (e.g. `<QrCode />`). */
  icon?: React.ReactNode;
  placeholder: string;
  value?: string;
  onChange?: (value: string) => void;
  /** Called with the trimmed input value on submit; the form never reloads. */
  onSubmit?: (value: string) => void;
  /** Optional mode selector (a 36px ghost pill, e.g. a DropdownMenu trigger). */
  mode?: React.ReactNode;
  /** Accessible name of the dark round submit. */
  submitLabel: string;
  inputProps?: Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'placeholder'>;
  className?: string;
}

/**
 * The hub's single central control: a 60px white pill with a hairline (56px
 * below md), a leading icon, the input, an optional mode selector and the one
 * dark round submit. The only place a hairline outline and a dark pill meet.
 */
export function CommandBar({
  icon,
  placeholder,
  value,
  onChange,
  onSubmit,
  mode,
  submitLabel,
  inputProps,
  className,
}: CommandBarProps) {
  const [internal, setInternal] = React.useState('');
  const current = value ?? internal;

  return (
    <form
      data-slot="command-bar"
      className={cn(
        'flex h-14 w-full max-w-[45rem] items-center gap-2.5 rounded-full border border-input bg-card pr-2 pl-[18px] md:h-[60px] md:gap-3.5 md:pr-2.5 md:pl-[22px]',
        className,
      )}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.(current.trim());
      }}
    >
      {icon ? (
        <span aria-hidden="true" className="shrink-0 text-foreground [&_svg]:size-5">
          {icon}
        </span>
      ) : null}
      <input
        {...inputProps}
        value={current}
        onChange={(event) => {
          setInternal(event.target.value);
          onChange?.(event.target.value);
        }}
        placeholder={placeholder}
        aria-label={inputProps?.['aria-label'] ?? placeholder}
        className={cn(
          'h-full min-w-0 flex-1 bg-transparent text-lg text-foreground placeholder:text-muted-foreground focus-visible:outline-offset-[-3px]',
          inputProps?.className,
        )}
      />
      {mode ? <div className="shrink-0 text-md font-medium">{mode}</div> : null}
      <Button type="submit" size="icon-md" aria-label={submitLabel} className="shrink-0">
        <ArrowUp />
      </Button>
    </form>
  );
}
