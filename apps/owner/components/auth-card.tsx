import type { ReactNode } from 'react';

import { cn } from '@iziwellpass/ui/lib/utils';

/**
 * One auth screen: an optional 56px medallion, a 36px light title and an
 * atténué subtitle centred over the form, then the footer link row. The
 * wordmark and the help line belong to the (auth) layout.
 */
export function AuthCard({
  title,
  subtitle,
  media,
  mediaTone = 'bleu',
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  media?: ReactNode;
  mediaTone?: 'bleu' | 'vert';
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-7">
      {media ? (
        <div className="flex justify-center">
          <div
            aria-hidden="true"
            className={cn(
              'flex size-14 items-center justify-center rounded-full [&_svg]:size-[22px]',
              mediaTone === 'vert' ? 'bg-success text-success-foreground' : 'bg-tint-bleu text-foreground',
            )}
          >
            {media}
          </div>
        </div>
      ) : null}
      <div className="flex flex-col items-center gap-2.5 text-center">
        <h1 className="text-display-sm font-normal">{title}</h1>
        {subtitle ? <p className="text-base text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div>{children}</div>
      {footer ? <div className="text-center text-md text-muted-foreground">{footer}</div> : null}
    </div>
  );
}
