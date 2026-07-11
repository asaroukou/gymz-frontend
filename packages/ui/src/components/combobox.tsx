'use client';

import * as React from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import { CheckIcon, ChevronsUpDownIcon, SearchIcon } from 'lucide-react';

import { cn } from '@iziwellpass/ui/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@iziwellpass/ui/components/popover';

export interface ComboboxOption {
  value: string;
  label: string;
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        data-slot="combobox-trigger"
        disabled={disabled}
        role="combobox"
        aria-expanded={open}
        className={cn(
          'flex h-11 w-full items-center justify-between gap-2 rounded-full border border-input bg-transparent px-4 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none hover:bg-accent focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-50 lg:h-9 dark:bg-input/30 dark:hover:bg-input/50',
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
          className="flex flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground"
        >
          <div className="flex items-center gap-2 border-b px-3">
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
            <CommandPrimitive.Input
              placeholder={searchPlaceholder}
              className="flex h-9 w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
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
                onSelect={() => {
                  onValueChange?.(option.value);
                  setOpen(false);
                }}
                className="flex cursor-default items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm outline-none select-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
              >
                <span className="truncate">{option.label}</span>
                <CheckIcon
                  className={cn(
                    'size-4 shrink-0',
                    option.value === value ? 'opacity-100' : 'opacity-0',
                  )}
                />
              </CommandPrimitive.Item>
            ))}
          </CommandPrimitive.List>
        </CommandPrimitive>
      </PopoverContent>
    </Popover>
  );
}

export { Combobox };
