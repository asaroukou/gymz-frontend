'use client';

import { CircleAlertIcon, XIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@iziwellpass/ui/components/button';
import { Progress } from '@iziwellpass/ui/components/progress';
import { cn } from '@iziwellpass/ui/lib/utils';

import { TILE_CLASS, type TileSize } from './photo-tile';
import type { UploadItem } from './use-gallery-uploads';

export function UploadTile({
  item,
  size,
  onRetry,
  onDismiss,
  dismissRef,
}: {
  item: UploadItem;
  size: TileSize;
  onRetry: () => void;
  onDismiss: () => void;
  dismissRef?: (el: HTMLButtonElement | null) => void;
}) {
  const t = useTranslations('venues.detail.photos');
  if (item.status !== 'failed') {
    return (
      <div
        className={cn(
          'flex flex-col justify-end gap-2 rounded-[20px] bg-secondary p-4',
          TILE_CLASS[size],
        )}
      >
        <span className="font-numeric text-sm">{t('progress', { percent: item.progress })}</span>
        <Progress value={item.progress} aria-label={item.name} className="h-1 bg-background" />
      </div>
    );
  }
  const kind = item.error ?? 'interrupted';
  return (
    <div
      role="alert"
      className={cn(
        'relative flex flex-col gap-1.5 rounded-[20px] bg-destructive p-4 text-destructive-foreground',
        TILE_CLASS[size],
      )}
    >
      <CircleAlertIcon className="size-[18px] shrink-0" aria-hidden="true" />
      <p className="pr-6 text-sm leading-snug">{t(`errors.${kind}`)}</p>
      {kind === 'interrupted' ? (
        <Button
          variant="link"
          size="sm"
          className="h-auto self-start p-0 text-current"
          onClick={onRetry}
        >
          {t('retry')}
        </Button>
      ) : null}
      <Button
        ref={dismissRef}
        variant="ghost"
        size="icon-sm"
        className={cn('absolute top-2 right-2 text-current', size === 'screen' && 'size-11')}
        aria-label={`${t('dismiss')} · ${item.name}`}
        onClick={onDismiss}
      >
        <XIcon />
      </Button>
    </div>
  );
}
