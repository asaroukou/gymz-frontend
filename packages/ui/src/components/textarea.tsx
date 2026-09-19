import * as React from 'react';

import { cn } from '@iziwellpass/ui/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex field-sizing-content min-h-[72px] w-full rounded-lg border border-input bg-card px-4 py-2 text-base transition-[color,box-shadow] placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
