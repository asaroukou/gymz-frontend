import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@iziwellpass/ui/lib/utils';

const alertVariants = cva(
  'relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg bg-secondary px-4 py-3 text-base text-foreground has-[>svg]:grid-cols-[calc(var(--spacing)*5)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-[18px] [&>svg]:translate-y-0.5 [&>svg]:text-current',
  {
    variants: {
      variant: {
        default: '',
        destructive: 'bg-destructive text-destructive-foreground',
        success: 'bg-success text-success-foreground',
        warning: 'bg-warning text-warning-foreground',
        info: 'bg-info text-info-foreground',
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
      className={cn('col-start-2 line-clamp-1 min-h-4 font-medium', className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        'col-start-2 grid justify-items-start gap-1 text-base text-current [&_p]:leading-relaxed',
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
      className={cn('col-start-2 mt-1 font-numeric text-sm text-current', className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription, AlertReference };
