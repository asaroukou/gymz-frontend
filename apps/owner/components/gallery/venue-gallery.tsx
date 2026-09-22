'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ImageIcon, InfoIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { unwrap } from '@iziwellpass/api/client';
import {
  getListVenueImagesQueryKey,
  useListVenueImages,
  useReorderVenueImages,
} from '@iziwellpass/api/generated';
import type { ApiResponseVecVenueImage, VenueImage } from '@iziwellpass/api/schemas';
import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { SectionHeading } from '@iziwellpass/ui/components/working-page';
import { cn } from '@iziwellpass/ui/lib/utils';

import { useFocusRegistry } from '@/components/focus-registry';
import { apiErrorMessage } from '@/lib/api-error';
import { MAX_IMAGES, moveImage, type ImageMove } from '@/lib/gallery';

import { DeletePhotoDialog } from './delete-photo-dialog';
import { invalidateGallery } from './gallery-queries';
import { PhotoTile, TILE_CLASS, type TileSize } from './photo-tile';

export type GalleryVariant = 'section' | 'screen';

/** Desktop: tiles 1–2 large, then small (canvas `a37vbD`). Screen: two equal columns (`keCrj`). */
export function tileSizeAt(index: number, variant: GalleryVariant): TileSize {
  if (variant === 'screen') return 'screen';
  return index < 2 ? 'large' : 'small';
}

export function VenueGallery({
  venueId,
  canEdit,
  variant,
}: {
  venueId: string;
  canEdit: boolean;
  variant: GalleryVariant;
}) {
  const t = useTranslations('venues.detail.photos');
  const tVenues = useTranslations('venues');
  const queryClient = useQueryClient();
  const focus = useFocusRegistry();
  const imagesQuery = useListVenueImages(venueId, { query: { select: unwrap } });
  const images = useMemo(() => imagesQuery.data ?? [], [imagesQuery.data]);
  const reorder = useReorderVenueImages();
  const [deleting, setDeleting] = useState<{
    image: VenueImage;
    index: number;
    neighbourId: string | null;
  } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  // Set once the delete succeeds: the deleted tile is about to unmount, so focus
  // goes to the photo that takes its place (or the previous one, or the section).
  const deletedRef = useRef(false);
  const sectionRef = useRef<HTMLElement>(null);

  const restoreDeleteFocus = () => {
    if (!deleting) return null;
    if (!deletedRef.current) return focus.get(`photo-${deleting.image.id}`);
    return (
      (deleting.neighbourId && focus.get(`photo-${deleting.neighbourId}`)) || sectionRef.current
    );
  };

  const handleMove = (image: VenueImage, move: ImageMove) => {
    const key = getListVenueImagesQueryKey(venueId);
    const previous = queryClient.getQueryData<ApiResponseVecVenueImage>(key);
    if (!previous) return;
    const ids = moveImage(
      previous.data.map((i) => i.id),
      image.id,
      move,
    );
    if (ids.every((id, i) => id === previous.data[i]?.id)) return;
    const byId = new Map(previous.data.map((i) => [i.id, i]));
    void queryClient.cancelQueries({ queryKey: key });
    queryClient.setQueryData<ApiResponseVecVenueImage>(key, {
      ...previous,
      data: ids.flatMap((id) => {
        const found = byId.get(id);
        return found ? [found] : [];
      }),
    });
    reorder.mutate(
      { id: venueId, data: { image_ids: ids } },
      {
        onError: (err) => {
          queryClient.setQueryData(key, previous);
          toast.error(apiErrorMessage(err, t('reorderError')));
        },
        onSettled: () => void invalidateGallery(queryClient, venueId),
      },
    );
  };

  const count = images.length;
  const description = count > 0 ? t('count', { count }) : t('rules');
  const gridClass = variant === 'section' ? 'grid grid-cols-6 gap-3' : 'grid grid-cols-2 gap-3';

  const heading =
    variant === 'section' ? <SectionHeading title={t('title')} description={description} /> : null;

  /** The single place the grid is assembled; Task 4 appends upload cells and the add tile here. */
  const galleryCells = () =>
    images.map((image, index) => (
      <PhotoTile
        key={image.id}
        image={image}
        index={index}
        count={count}
        canEdit={canEdit}
        size={tileSizeAt(index, variant)}
        busy={reorder.isPending}
        menuRef={focus.register(`photo-${image.id}`)}
        onMove={handleMove}
        onDelete={(target, targetIndex) => {
          deletedRef.current = false;
          setDeleting({
            image: target,
            index: targetIndex,
            neighbourId: images[targetIndex + 1]?.id ?? images[targetIndex - 1]?.id ?? null,
          });
          setDeleteOpen(true);
        }}
      />
    ));

  let body: ReactNode;
  if (imagesQuery.isLoading) {
    body = (
      <div className={gridClass} aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className={cn('rounded-[20px]', TILE_CLASS[tileSizeAt(i, variant)])} />
        ))}
      </div>
    );
  } else if (imagesQuery.isError) {
    body = (
      <Alert variant="destructive">
        <AlertTitle>{tVenues('errorTitle')}</AlertTitle>
        <AlertDescription>{apiErrorMessage(imagesQuery.error, t('loadError'))}</AlertDescription>
      </Alert>
    );
  } else if (count === 0) {
    body = (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-side p-8 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-info text-info-foreground">
          <ImageIcon className="size-5" aria-hidden="true" />
        </span>
        <p className="text-lg font-medium">{t('emptyTitle')}</p>
        <p className="max-w-[26rem] text-md text-muted-foreground">{t('emptyBody')}</p>
      </div>
    );
  } else {
    body = (
      <>
        <div className={gridClass}>{galleryCells()}</div>
        {count >= MAX_IMAGES ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <InfoIcon className="size-4 shrink-0" aria-hidden="true" />
            {t('full')}
          </p>
        ) : null}
      </>
    );
  }

  return (
    <section ref={sectionRef} tabIndex={-1} className="flex flex-col gap-4 outline-none">
      {heading}
      {body}
      {deleting ? (
        <DeletePhotoDialog
          venueId={venueId}
          image={deleting.image}
          isCover={deleting.index === 0}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          restoreFocusTo={restoreDeleteFocus}
          onDeleted={() => {
            deletedRef.current = true;
          }}
        />
      ) : null}
    </section>
  );
}
