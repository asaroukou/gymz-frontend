import { cn } from '@iziwellpass/ui/lib/utils';

/** The brand mark: an ink square beside the name, 18/600. No colour, no icon. */
export function Wordmark({
  name,
  size = 'md',
  className,
}: {
  name: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        aria-hidden="true"
        className={cn('block rounded-md bg-primary', size === 'md' ? 'size-6' : 'size-5')}
      />
      <span
        className={cn('font-semibold tracking-[-0.02em]', size === 'md' ? 'text-lg' : 'text-base')}
      >
        {name}
      </span>
    </span>
  );
}
