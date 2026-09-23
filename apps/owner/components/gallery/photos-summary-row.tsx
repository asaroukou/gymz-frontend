'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ChevronRightIcon, ImageIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { unwrap } from '@iziwellpass/api/client';
import { useListVenueImages } from '@iziwellpass/api/generated';
import { cn } from '@iziwellpass/ui/lib/utils';

/** Phone-only entry to the Photos screen on the venue page (spec §5; not drawn on the canvas). */
export function PhotosSummaryRow({ venueId, className }: { venueId: string; className?: string }) {
  const t = useTranslations('venues.detail.photos');
  const imagesQuery = useListVenueImages(venueId, { query: { select: unwrap } });
  const images = imagesQuery.data ?? [];
  const cover = images[0];
  return (
    <Link
      href={`/venues/${venueId}/photos`}
      className={cn('flex min-h-16 items-center gap-3 border-b border-border py-2', className)}
    >
      <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-info text-info-foreground">
        {cover ? (
          <Image src={cover.url} alt="" fill unoptimized sizes="48px" className="object-cover" />
        ) : (
          <ImageIcon className="size-5" aria-hidden="true" />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-lg font-medium">{t('title')}</span>
        <span className="text-sm text-muted-foreground">
          {images.length > 0 ? t('summaryCount', { count: images.length }) : t('summaryNone')}
        </span>
      </span>
      <ChevronRightIcon className="size-5 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}
