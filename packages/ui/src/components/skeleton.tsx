import { cn } from '@iziwellpass/ui/lib/utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="skeleton" className={cn('rounded-lg bg-secondary', className)} {...props} />
  );
}

export { Skeleton };
