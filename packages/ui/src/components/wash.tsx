import * as React from 'react';

import { cn } from '@iziwellpass/ui/lib/utils';

/**
 * The one sanctioned gradient (DESIGN.md §4, "the wash exception"): a soft
 * radial of lavis behind a hub heading, fading to transparent within ~640px.
 * Geometry is the canvas `Wash` node — 800×640, top −260, centred on the
 * column. Hidden below `md`: the mobile frames carry no wash. The word
 * "gradient" must not appear anywhere else in the web layer
 * (scripts/check-design-system.mjs excludes only this file).
 */
export function Wash({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      data-slot="wash"
      className={cn(
        'pointer-events-none absolute top-[-260px] left-1/2 hidden h-[640px] w-[800px] -translate-x-1/2 md:block',
        'bg-[radial-gradient(closest-side,var(--wash),transparent)]',
        className,
      )}
    />
  );
}
