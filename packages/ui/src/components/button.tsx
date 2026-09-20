import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@iziwellpass/ui/lib/utils';

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full text-base font-medium whitespace-nowrap transition-colors duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-danger [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        secondary: 'bg-secondary text-foreground hover:bg-accent',
        outline: 'border border-border bg-transparent text-foreground hover:bg-side',
        ghost: 'text-foreground hover:bg-side',
        destructive: 'bg-destructive text-destructive-foreground hover:brightness-95',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        // Front-desk first: 44px pills everywhere, no desktop step-down.
        default: 'h-11 px-5 has-[>svg]:px-4',
        lg: 'h-11 px-5 has-[>svg]:px-4',
        sm: 'h-9 gap-2 px-4 text-md has-[>svg]:px-3',
        xs: "h-7 gap-1 px-3 text-sm [&_svg:not([class*='size-'])]:size-3.5",
        icon: 'size-11',
        'icon-md': 'size-10',
        'icon-sm': 'size-9',
        'icon-xs': "size-7 [&_svg:not([class*='size-'])]:size-3.5",
        'icon-lg': 'size-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
