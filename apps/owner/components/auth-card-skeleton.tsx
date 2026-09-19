import { Card } from '@iziwellpass/ui/components/card';
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
 * search params, so it can't render on the server). Mirrors the AuthCard shape
 * (argile masthead, form body) so the layout doesn't jump when the form takes
 * over, instead of a blank void.
 */
export function AuthCardSkeleton() {
  return (
    <Card className="gap-0 overflow-hidden py-0" aria-hidden>
      <div className="bg-argile px-6 pt-6 pb-5">
        <Skeleton className="h-4 w-24 bg-foreground/15" />
        <Skeleton className="mt-2 h-7 w-32 bg-foreground/15" />
        <Skeleton className="mt-2 h-4 w-3/4 bg-foreground/15" />
      </div>
      <div className="px-6 py-6">
        <AuthFormSkeleton />
      </div>
    </Card>
  );
}
