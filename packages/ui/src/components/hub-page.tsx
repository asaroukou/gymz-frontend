import * as React from 'react';

import { Wash } from '@iziwellpass/ui/components/wash';
import { cn } from '@iziwellpass/ui/lib/utils';

/**
 * The hub column: 940px centred inside the shell's `main` (which pads 24px,
 * so `md:pt-10` lands the drawn 64px top). Sections sit 48px apart on desktop
 * and 24px on a phone. `wash` draws the lavis behind the heading.
 */
function HubPage({
  wash = false,
  className,
  children,
  ...props
}: React.ComponentProps<'div'> & { wash?: boolean }) {
  return (
    <div
      data-slot="hub-page"
      className={cn('relative mx-auto w-full max-w-[940px] md:pt-10', className)}
      {...props}
    >
      {wash ? <Wash /> : null}
      <div className="relative flex flex-col gap-6 md:gap-12">{children}</div>
    </div>
  );
}

/** Eyebrow, title, lead and the command bar, centred. Canvas gap 20 / 12. */
function HubHero({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="hub-hero"
      className={cn('flex flex-col items-center gap-3 text-center md:gap-5', className)}
      {...props}
    />
  );
}

function HubEyebrow({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="hub-kicker"
      className={cn('text-sm text-muted-foreground md:text-md', className)}
      {...props}
    />
  );
}

/** The Display step: 44px on desktop, 32px on a phone. One per screen. */
function HubTitle({ className, ...props }: React.ComponentProps<'h1'>) {
  return (
    <h1
      data-slot="hub-title"
      className={cn('text-2xl font-normal md:text-3xl', className)}
      {...props}
    />
  );
}

function HubLead({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="hub-lead"
      className={cn('max-w-[36rem] text-lg text-muted-foreground', className)}
      {...props}
    />
  );
}

/** A centred block: the stat strip, the tab row, the feed. */
function HubSection({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="hub-section"
      className={cn('flex w-full flex-col items-center gap-4', className)}
      {...props}
    />
  );
}

export { HubPage, HubHero, HubEyebrow, HubTitle, HubLead, HubSection };
