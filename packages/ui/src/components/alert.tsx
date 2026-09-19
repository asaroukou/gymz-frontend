import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@iziwellpass/ui/lib/utils';

const alertVariants = cva(
  'relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-xl border bg-background px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*5)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current',
  {
    variants: {
      variant: {
        default: 'text-foreground',
        destructive:
          'border-destructive/50 bg-destructive/5 text-destructive [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90',
        success: 'border-success/40 bg-success/5 text-success-foreground [&>svg]:text-current',
        warning: 'border-warning/40 bg-warning/5 text-warning-foreground [&>svg]:text-current',
        info: 'border-info/40 bg-info/5 text-info-foreground [&>svg]:text-current',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Alert({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-title"
      className={cn('col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight', className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        'col-start-2 grid justify-items-start gap-1 text-sm text-muted-foreground [&_p]:leading-relaxed',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Support reference line for error alerts (a request/trace id), set in Inter
 * via `font-numeric` per the DESIGN "calm error carries a numeric support
 * reference" rule so an operator can quote it. Renders in the description
 * column, quiet.
 */
function AlertReference({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-reference"
      className={cn('col-start-2 mt-1 font-numeric text-xs text-muted-foreground', className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription, AlertReference };
