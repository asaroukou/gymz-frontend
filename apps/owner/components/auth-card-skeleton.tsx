import { Skeleton } from '@iziwellpass/ui/components/skeleton';

/** Two labelled pill fields plus a submit pill, matching an auth form body. */
export function AuthFormSkeleton() {
  return (
    <div className="grid gap-[18px]" aria-hidden>
      <div className="grid gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
      <div className="grid gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
      <Skeleton className="h-11 w-full rounded-full" />
    </div>
  );
}

/**
 * Placeholder shown while an auth screen's client component resolves (it reads
 * search params, so it can't render on the server). Mirrors the AuthCard shape
 * — centred title and subtitle, then the form body — so the layout doesn't jump.
 */
export function AuthCardSkeleton() {
  return (
    <div className="flex w-full flex-col gap-7" aria-hidden>
      <div className="flex flex-col items-center gap-2.5">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-5 w-72" />
      </div>
      <AuthFormSkeleton />
    </div>
  );
}
