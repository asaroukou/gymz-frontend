import type { ReactNode } from 'react';

import { Card } from '@iziwellpass/ui/components/card';

/**
 * The auth surface's signature: an argile masthead band carrying the
 * wordmark and the page title in ink, over a calm bone form body. This is
 * the one committed color moment that lifts the auth screens out of the
 * stock centered-shadcn block without adding drama.
 *
 * The card zeros its own padding (gap-0 py-0) and clips to its radius
 * (overflow-hidden) so the band bleeds edge to edge; each section owns its
 * padding instead.
 */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="bg-argile px-6 pt-6 pb-5 text-foreground">
        <p className="text-sm font-[800] tracking-tight text-foreground">IziWellPass</p>
        <h1 className="mt-1.5 text-2xl font-[750] tracking-[-0.035em]">{title}</h1>
        {subtitle ? <p className="mt-1.5 text-sm text-foreground">{subtitle}</p> : null}
      </div>
      <div className="px-6 py-6">{children}</div>
      {footer ? <div className="px-6 pb-6 text-center">{footer}</div> : null}
    </Card>
  );
}
