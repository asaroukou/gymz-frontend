import type { ReactNode } from 'react';

import { cn } from '@iziwellpass/ui/lib/utils';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';

/**
 * A single calm surface holding numeric stats split by 1px hairlines, instead
 * of a grid of identical metric cards (the banned hero-metric template). The
 * `gap-px` over a `bg-border` background reveals hairlines between cells and
 * reflows safely when the grid wraps. The caller sets the column count via
 * `className` (e.g. `grid-cols-2 xl:grid-cols-4`).
 */
export function StatPanel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('grid gap-px overflow-hidden rounded-xl border bg-border', className)}>
      {children}
    </div>
  );
}

/**
 * One stat cell: a quiet label over a big mono figure (Mono Numbers rule). Sits
 * inside a `StatPanel`. Degrades to `—` on no data / error rather than a heavy
 * alert in a glanceable strip. `className` allows column spans for odd counts.
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
    <div className={cn('bg-card px-4 py-5', className)}>
      <p className="eyebrow text-muted-foreground">{label}</p>
      {isLoading ? (
        <Skeleton className="mt-2.5 h-9 w-16" />
      ) : (
        <p className="mt-1.5 font-numeric text-3xl tracking-tight">{value ?? '—'}</p>
      )}
    </div>
  );
}
