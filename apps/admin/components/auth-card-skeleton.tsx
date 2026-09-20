import { Skeleton } from '@iziwellpass/ui/components/skeleton';

/** Two labelled pill fields plus a submit pill, matching an auth form body. */
export function AuthFormSkeleton() {
  return (
    <div className="grid gap-4" aria-hidden>
      <div className="grid gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-11 w-full rounded-full" />
      </div>
      <div className="grid gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-11 w-full rounded-full" />
      </div>
      <Skeleton className="h-11 w-full rounded-full" />
    </div>
  );
}

/**
 * Placeholder shown while an auth screen's client component resolves (it reads
 * search params, so it can't render on the server). Mirrors the flat AuthCard
 * shape (wordmark, title, form body) so the layout doesn't jump when the form
 * takes over, instead of a blank void.
 */
export function AuthCardSkeleton() {
  return (
    <div className="flex flex-col gap-7" aria-hidden>
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-9 w-48" />
      <AuthFormSkeleton />
    </div>
  );
}
