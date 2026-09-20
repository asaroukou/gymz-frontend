'use client';

import * as React from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import { CheckIcon, ChevronsUpDownIcon, SearchIcon } from 'lucide-react';

import { cn } from '@iziwellpass/ui/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@iziwellpass/ui/components/popover';

export interface ComboboxOption {
  value: string;
  label: string;
  /** When true, the option is shown but greyed out and cannot be selected. */
  disabled?: boolean;
  /** Short trailing note explaining the option (e.g. why it is disabled). */
  hint?: string;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
}

function Combobox({
  options,
  value,
  onValueChange,
  placeholder = 'Sélectionner…',
  searchPlaceholder = 'Rechercher…',
  emptyText = 'Aucun résultat.',
  disabled = false,
  className,
  contentClassName,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const current = options.find((o) => o.value === value);

  return (
    // `modal`: inside a Dialog/Sheet the popover is portalled outside the modal's
    // scroll-lock shard, so wheel/touch scrolling of the list is blocked. A modal
    // popover gets its own scroll shard (like a Radix Select), restoring scroll,
    // and stays compatible with the modal's dropdown-aware dismiss guard.
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger
        data-slot="combobox-trigger"
        disabled={disabled}
        role="combobox"
        aria-expanded={open}
        className={cn(
          'flex h-12 w-full items-center justify-between gap-2 rounded-full border border-input bg-card px-[18px] text-base whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50',
          !current && 'text-muted-foreground',
          className,
        )}
      >
        <span className="truncate">{current ? current.label : placeholder}</span>
        <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn('w-(--radix-popover-trigger-width) p-0', contentClassName)}
      >
        <CommandPrimitive
          data-slot="combobox-command"
          className="flex flex-col overflow-hidden rounded-lg bg-side text-foreground"
        >
          <div className="flex items-center gap-2 px-3">
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
            <CommandPrimitive.Input
              placeholder={searchPlaceholder}
              className="flex h-11 w-full bg-transparent py-2 text-base placeholder:text-muted-foreground focus-visible:outline-offset-[-3px]"
            />
          </div>
          <CommandPrimitive.List className="max-h-56 overflow-y-auto p-1">
            <CommandPrimitive.Empty className="py-6 text-center text-sm text-muted-foreground">
              {emptyText}
            </CommandPrimitive.Empty>
            {options.map((option) => (
              <CommandPrimitive.Item
                key={option.value}
                value={option.label}
                disabled={option.disabled}
                onSelect={() => {
                  if (option.disabled) return;
                  onValueChange?.(option.value);
                  setOpen(false);
                }}
                className="flex h-10 cursor-default items-center justify-between gap-2 rounded-full px-3.5 text-base select-none data-[selected=true]:bg-secondary data-[selected=true]:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50"
              >
                <span className="truncate">{option.label}</span>
                {option.hint ? (
                  <span className="shrink-0 text-xs text-muted-foreground">{option.hint}</span>
                ) : (
                  <CheckIcon
                    className={cn(
                      'size-4 shrink-0',
                      option.value === value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                )}
              </CommandPrimitive.Item>
            ))}
          </CommandPrimitive.List>
        </CommandPrimitive>
      </PopoverContent>
    </Popover>
  );
}

export { Combobox };
