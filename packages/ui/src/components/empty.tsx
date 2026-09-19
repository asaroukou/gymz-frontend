import * as React from 'react';

import { cn } from '@iziwellpass/ui/lib/utils';

function Empty({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty"
      className={cn(
        'flex flex-col items-center justify-center gap-2 px-6 py-10 text-center',
        className,
      )}
      {...props}
    />
  );
}

function EmptyMedia({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-media"
      className={cn(
        "mb-1 grid size-12 place-items-center rounded-full bg-secondary text-muted-foreground [&_svg:not([class*='size-'])]:size-6",
        className,
      )}
      {...props}
    />
  );
}

function EmptyTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-title"
      className={cn('text-base font-[650] text-foreground', className)}
      {...props}
    />
  );
}

function EmptyDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="empty-description"
      className={cn('max-w-sm text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

function EmptyContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-content"
      className={cn('mt-2 flex items-center justify-center gap-2', className)}
      {...props}
    />
  );
}

export { Empty, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent };
