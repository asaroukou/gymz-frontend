import * as React from 'react';

import { cn } from '@iziwellpass/ui/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex field-sizing-content min-h-[96px] w-full resize-none rounded-lg border border-input bg-card px-[18px] py-3.5 text-base leading-relaxed transition-colors placeholder:text-muted-foreground focus-visible:border-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-danger',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
