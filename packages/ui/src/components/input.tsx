import * as React from 'react';

import { cn } from '@iziwellpass/ui/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-12 w-full min-w-0 rounded-full border border-input bg-card px-[18px] text-base text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-base file:font-medium [&[type=number]]:font-numeric',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
