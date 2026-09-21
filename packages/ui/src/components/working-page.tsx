import * as React from 'react';
import { ArrowLeftIcon } from 'lucide-react';

import { cn } from '@iziwellpass/ui/lib/utils';

/**
 * Working-screen chrome (DESIGN.md « working density »): a 32px vertical
 * rhythm, a light 32px title with one dark action, 14px back links, 22px
 * section titles and key/value hairline rows. No boxes anywhere.
 */
function WorkingPage({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="working-page"
      className={cn('flex w-full flex-col gap-8', className)}
      {...props}
    />
  );
}

function WorkingHeader({
  title,
  subtitle,
  action,
  badges,
  className,
  ...props
}: Omit<React.ComponentProps<'header'>, 'title'> & {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** The one dark 44px control of the page, bottom-aligned with the title block. */
  action?: React.ReactNode;
  /** Detail-page variant: status badges bottom-aligned on the right. */
  badges?: React.ReactNode;
}) {
  return (
    <header
      data-slot="working-header"
      className={cn('flex flex-wrap items-end justify-between gap-4', className)}
      {...props}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <h1 className="text-2xl font-normal">{title}</h1>
        {subtitle ? <div className="text-base text-muted-foreground">{subtitle}</div> : null}
      </div>
      {action || badges ? (
        <div
          data-slot="working-header-side"
          className="flex shrink-0 items-center gap-2 self-end"
        >
          {badges ? (
            <div data-slot="working-header-badges" className="flex items-center gap-2">
              {badges}
            </div>
          ) : null}
          {action ? (
            <div data-slot="working-header-action" className="flex items-center gap-2">
              {action}
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}

type LinkLike = React.ComponentType<{
  href: string;
  className?: string;
  children: React.ReactNode;
}>;

const DefaultLink: LinkLike = ({ href, className, children }) => (
  <a href={href} className={className}>
    {children}
  </a>
);

function BackLink({
  href,
  linkComponent,
  className,
  children,
}: {
  href: string;
  /** Pass Next's `Link` from an app; defaults to a plain anchor. */
  linkComponent?: LinkLike;
  className?: string;
  children: React.ReactNode;
}) {
  const Comp = linkComponent ?? DefaultLink;
  return (
    <Comp
      href={href}
      className={cn(
        'inline-flex w-fit items-center gap-1.5 text-md text-muted-foreground transition-colors hover:text-foreground',
        className,
      )}
    >
      <ArrowLeftIcon className="size-4" aria-hidden />
      {children}
    </Comp>
  );
}

function SectionHeading({
  title,
  description,
  action,
  className,
  ...props
}: Omit<React.ComponentProps<'div'>, 'title'> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      data-slot="section-heading"
      className={cn('flex items-start justify-between gap-4', className)}
      {...props}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="text-xl font-medium">{title}</h2>
        {description ? <p className="text-md text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function KeyValueList({ className, ...props }: React.ComponentProps<'dl'>) {
  return (
    <dl
      data-slot="key-value-list"
      className={cn('flex flex-col [&>*+*]:border-t [&>*+*]:border-border', className)}
      {...props}
    />
  );
}

function KeyValueRow({
  label,
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & { label: React.ReactNode }) {
  return (
    <div
      data-slot="key-value-row"
      className={cn('flex min-h-[42px] items-center justify-between gap-6 py-2', className)}
      {...props}
    >
      <dt className="shrink-0 text-base text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right text-base font-medium">{children}</dd>
    </div>
  );
}

export { WorkingPage, WorkingHeader, BackLink, SectionHeading, KeyValueList, KeyValueRow };
