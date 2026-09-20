import * as React from 'react';
import { X } from 'lucide-react';

import { cn } from '@iziwellpass/ui/lib/utils';

/** A pilule label with an optional dismiss (filters, selected values). */
export function Chip({
  children,
  onRemove,
  removeLabel,
  className,
  ...props
}: React.ComponentProps<'span'> & { onRemove?: () => void; removeLabel?: string }) {
  return (
    <span
      data-slot="chip"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-secondary py-1.5 pl-3.5 text-md font-medium text-foreground',
        onRemove ? 'pr-1.5' : 'pr-3.5',
        className,
      )}
      {...props}
    >
      {children}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="grid size-5 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </span>
  );
}
