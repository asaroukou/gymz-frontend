import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { cn } from '@iziwellpass/ui/lib/utils';

/** Loading rows at the hairline-table height (64px): avatar, a name, a right-hand value. */
export function RowsSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col', className)} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex h-16 items-center gap-4 border-b border-border last:border-0">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="ml-auto h-4 w-24" />
        </div>
      ))}
    </div>
  );
}
