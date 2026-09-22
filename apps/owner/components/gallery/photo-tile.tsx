'use client';

import Image from 'next/image';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  MoreHorizontalIcon,
  StarIcon,
  Trash2Icon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { VenueImage } from '@iziwellpass/api/schemas';
import { Button } from '@iziwellpass/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@iziwellpass/ui/components/dropdown-menu';
import { cn } from '@iziwellpass/ui/lib/utils';

import type { ImageMove } from '@/lib/gallery';

export type TileSize = 'large' | 'small' | 'screen';

export const TILE_CLASS: Record<TileSize, string> = {
  large: 'col-span-3 h-[170px]',
  small: 'col-span-2 h-28',
  screen: 'h-[130px]',
};

export function PhotoTile({
  image,
  index,
  count,
  canEdit,
  size,
  busy,
  menuRef,
  onMove,
  onDelete,
}: {
  image: VenueImage;
  index: number;
  count: number;
  canEdit: boolean;
  size: TileSize;
  busy: boolean;
  menuRef?: (el: HTMLButtonElement | null) => void;
  onMove: (image: VenueImage, move: ImageMove) => void;
  onDelete: (image: VenueImage, index: number) => void;
}) {
  const t = useTranslations('venues.detail.photos');
  const position = index + 1;
  return (
    <div className={cn('relative overflow-hidden rounded-[20px] bg-secondary', TILE_CLASS[size])}>
      <Image
        src={image.url}
        alt={t('alt', { index: position, count })}
        fill
        unoptimized
        sizes="(min-width: 768px) 250px, 50vw"
        className="object-cover"
      />
      {index === 0 ? (
        <span className="absolute top-3 left-3 rounded-full bg-foreground px-2.5 py-0.5 text-sm text-background">
          {t('cover')}
        </span>
      ) : null}
      {canEdit ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              ref={menuRef}
              variant="ghost"
              size="icon-sm"
              className={cn(
                'absolute top-3 right-3 rounded-full bg-background/80 hover:bg-background',
                size === 'screen' && 'size-11',
              )}
              aria-label={t('menu', { index: position })}
            >
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[250px]">
            <DropdownMenuItem
              disabled={busy || index === 0}
              onSelect={() => onMove(image, 'cover')}
            >
              <StarIcon /> {t('setCover')}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={busy || index === 0} onSelect={() => onMove(image, 'left')}>
              <ArrowLeftIcon /> {t('moveLeft')}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={busy || index === count - 1}
              onSelect={() => onMove(image, 'right')}
            >
              <ArrowRightIcon /> {t('moveRight')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={busy}
              onSelect={() => onDelete(image, index)}
            >
              <Trash2Icon /> {t('delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
