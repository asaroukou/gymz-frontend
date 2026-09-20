import type { ReactNode } from 'react';

import { cn } from '@iziwellpass/ui/lib/utils';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';

/**
 * A hairline strip of numeric stats: no box, no border. Siblings are
 * separated by a thin vertical rule (`divide-x divide-border`) rather than
 * the banned hero-metric card grid. Wraps on narrow viewports since it is a
 * flex row, not a fixed grid.
 */
export function StatPanel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('flex flex-wrap justify-center divide-x divide-border', className)}>
      {children}
    </div>
  );
}

/**
 * One stat cell: a big number sitting over a quiet label, read left to right
 * inside a `StatPanel`. Degrades to `—` on no data / error rather than a
 * heavy alert in a glanceable strip. `className` allows spacing overrides.
 */
export function Stat({
  label,
  value,
  isLoading,
  className,
}: {
  label: string;
  value: string | null;
  isLoading?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center gap-1 px-5 md:px-10', className)}>
      {isLoading ? (
        <Skeleton className="h-9 w-16" />
      ) : (
        <p className="font-numeric text-2xl font-medium">{value ?? '—'}</p>
      )}
      <p className="text-center text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
