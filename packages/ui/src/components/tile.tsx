import * as React from 'react';

import { tintClass, tintForIndex, type TintName } from '@iziwellpass/ui/lib/tints';
import { cn } from '@iziwellpass/ui/lib/utils';

/**
 * A tinted block for glanceable content (sessions, plans, venues, steps).
 * 24px radius, 20px padding, dark ink on a pastel, no border, no shadow.
 * Never holds a form, a table or a dialog (The Tile Rule).
 */
function Tile({
  tint = 0,
  aspect = 'square',
  className,
  ...props
}: React.ComponentProps<'div'> & { tint?: TintName | number; aspect?: 'square' | 'tall' }) {
  const name = typeof tint === 'number' ? tintForIndex(tint) : tint;
  return (
    <div
      data-slot="tile"
      className={cn(
        'flex flex-col justify-between rounded-xl p-5 text-foreground',
        aspect === 'square' ? 'aspect-square' : 'min-h-[14rem]',
        tintClass(name),
        className,
      )}
      {...props}
    />
  );
}

function TileTop({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="tile-top"
      className={cn('flex items-start justify-between gap-3', className)}
      {...props}
    />
  );
}

function TileTime({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="tile-time"
      className={cn('font-numeric text-xl font-medium', className)}
      {...props}
    />
  );
}

function TileCount({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="tile-count"
      className={cn('font-numeric text-md font-medium text-muted-strong', className)}
      {...props}
    />
  );
}

function TileTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return (
    <h3 data-slot="tile-title" className={cn('text-lg font-semibold', className)} {...props} />
  );
}

function TileMeta({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="tile-meta"
      className={cn('mt-1 text-sm text-muted-strong', className)}
      {...props}
    />
  );
}

export { Tile, TileTop, TileTime, TileCount, TileTitle, TileMeta };
