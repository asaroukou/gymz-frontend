import type { ReactNode } from 'react';

import { Wordmark } from '@iziwellpass/ui/components/wordmark';

/**
 * The auth surface: wordmark, a light 32px title and an atténué subtitle over
 * the form, on the white page. No card, no band, no border (The No-Box Rule).
 * The lavis wash and the 400px centred layout arrive with SP-B.
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
    <div className="flex flex-col gap-7">
      <Wordmark name="IziWellPass" />
      <div className="flex flex-col gap-2.5">
        <h1 className="text-2xl font-normal">{title}</h1>
        {subtitle ? <p className="text-base text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div>{children}</div>
      {footer ? <div className="text-center text-md text-muted-foreground">{footer}</div> : null}
    </div>
  );
}
