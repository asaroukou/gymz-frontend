'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ImageIcon, InfoIcon, PlusIcon } from 'lucide-react';
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
import { Button } from '@iziwellpass/ui/components/button';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';
import { SectionHeading } from '@iziwellpass/ui/components/working-page';
import { cn } from '@iziwellpass/ui/lib/utils';

import { useFocusRegistry } from '@/components/focus-registry';
import { apiErrorMessage } from '@/lib/api-error';
import { ACCEPT_ATTRIBUTE, MAX_IMAGES, moveImage, type ImageMove } from '@/lib/gallery';

import { DeletePhotoDialog } from './delete-photo-dialog';
import { invalidateGallery } from './gallery-queries';
import { PhotoTile, TILE_CLASS, type TileSize } from './photo-tile';
import { UploadTile } from './upload-tile';
import { useGalleryUploads } from './use-gallery-uploads';

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
  const uploads = useGalleryUploads(venueId, images.length);
  const inputRef = useRef<HTMLInputElement>(null);
  const [deleting, setDeleting] = useState<{
    image: VenueImage;
    index: number;
    neighbourId: string | null;
    /** Captured on open: the optimistic removal must not change the sentence mid-close. */
    hasNextCover: boolean;
  } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  // Set once the delete succeeds: the deleted tile is about to unmount, so focus
  // goes to the photo that takes its place (or the previous one). With no photo
  // left it goes to the empty panel's add button, or the heading when read-only.
  const deletedRef = useRef(false);
  const emptyAddRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLElement>(null);

  const restoreDeleteFocus = () => {
    if (!deleting) return null;
    if (!deletedRef.current) return focus.get(`photo-${deleting.image.id}`);
    return (
      (deleting.neighbourId && focus.get(`photo-${deleting.neighbourId}`)) ||
      emptyAddRef.current ||
      headingRef.current
    );
  };

  /** Drops the deleted photo from the cache now, so the empty panel exists when focus is restored. */
  const handleDeleted = () => {
    deletedRef.current = true;
    if (!deleting) return;
    const deletedId = deleting.image.id;
    queryClient.setQueryData<ApiResponseVecVenueImage>(
      getListVenueImagesQueryKey(venueId),
      (prev) => (prev ? { ...prev, data: prev.data.filter((i) => i.id !== deletedId) } : prev),
    );
  };

  const openPicker = () => inputRef.current?.click();
  const addTileRef = useRef<HTMLButtonElement>(null);
  const headerAddRef = useRef<HTMLButtonElement>(null);

  /**
   * Retry and dismiss remove the button that was clicked, so focus moves to the
   * next error tile (or the previous one), else to an add control, else the heading.
   */
  const leaveErrorTile = (key: string, action: (key: string) => void) => {
    const failed = uploads.items.filter((item) => item.status === 'failed');
    const at = failed.findIndex((item) => item.key === key);
    const neighbour = failed[at + 1] ?? failed[at - 1];
    flushSync(() => action(key));
    const headerAdd = headerAddRef.current?.disabled ? null : headerAddRef.current;
    const target =
      (neighbour && focus.get(`upload-${neighbour.key}`)) ||
      addTileRef.current ||
      headerAdd ||
      emptyAddRef.current ||
      headingRef.current;
    target?.focus();
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
  const canAdd = canEdit && uploads.freeSlots > 0;
  const hasCells = count > 0 || uploads.items.length > 0;
  const occupied = count + uploads.items.filter((item) => item.status !== 'failed').length;

  const input = canEdit ? (
    <input
      ref={inputRef}
      type="file"
      multiple
      accept={ACCEPT_ATTRIBUTE}
      className="sr-only"
      tabIndex={-1}
      aria-hidden="true"
      onChange={(e) => {
        if (e.target.files?.length) uploads.add(e.target.files);
        e.target.value = '';
      }}
    />
  ) : null;

  const heading =
    variant === 'section' ? (
      <SectionHeading
        title={
          <span
            ref={(el) => {
              headingRef.current = el;
            }}
            tabIndex={-1}
            className="outline-none"
          >
            {t('title')}
          </span>
        }
        description={description}
        action={
          canEdit && hasCells ? (
            <Button
              ref={headerAddRef}
              variant="outline"
              size="sm"
              onClick={openPicker}
              disabled={!canAdd}
            >
              <PlusIcon aria-hidden="true" />
              {t('add')}
            </Button>
          ) : null
        }
      />
    ) : (
      <>
        <div className="flex flex-col gap-1.5">
          <h1
            ref={(el) => {
              headingRef.current = el;
            }}
            tabIndex={-1}
            className="text-2xl font-normal outline-none"
          >
            {t('title')}
          </h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {/* The empty panel carries its own dark button, so the screen never shows two. */}
        {canEdit && hasCells ? (
          <Button
            ref={headerAddRef}
            className="h-12 w-full"
            onClick={openPicker}
            disabled={!canAdd}
          >
            <PlusIcon aria-hidden="true" />
            {t('add')}
          </Button>
        ) : null}
      </>
    );

  /** The single place the grid is assembled: photos, then uploads, then the add tile. */
  const galleryCells = () => [
    ...images.map((image, index) => (
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
            hasNextCover: targetIndex === 0 && images.length > 1,
          });
          setDeleteOpen(true);
        }}
      />
    )),
    ...uploads.items.map((item, i) => (
      <UploadTile
        key={item.key}
        item={item}
        size={tileSizeAt(count + i, variant)}
        dismissRef={focus.register(`upload-${item.key}`)}
        onRetry={() => leaveErrorTile(item.key, uploads.retry)}
        onDismiss={() => leaveErrorTile(item.key, uploads.dismiss)}
      />
    )),
    variant === 'section' && canAdd ? (
      <button
        key="add-tile"
        ref={addTileRef}
        type="button"
        onClick={openPicker}
        className={cn(
          'flex flex-col items-center justify-center gap-1.5 rounded-[20px] border border-border text-sm text-muted-foreground hover:bg-side',
          TILE_CLASS[tileSizeAt(count + uploads.items.length, variant)],
        )}
      >
        <PlusIcon className="size-[18px]" aria-hidden="true" />
        {t('addTile')}
      </button>
    ) : null,
  ];

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
  } else if (!hasCells) {
    body = (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-side p-8 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-info text-info-foreground">
          <ImageIcon className="size-5" aria-hidden="true" />
        </span>
        <p className="text-lg font-medium">{t('emptyTitle')}</p>
        <p className="max-w-[26rem] text-md text-muted-foreground">{t('emptyBody')}</p>
        {canEdit ? (
          <>
            <Button ref={emptyAddRef} onClick={openPicker}>
              <PlusIcon aria-hidden="true" />
              {t('add')}
            </Button>
            <p className="text-sm text-muted-foreground">{t('rules')}</p>
          </>
        ) : null}
      </div>
    );
  } else {
    body = (
      <>
        <div className={gridClass}>{galleryCells()}</div>
        {occupied >= MAX_IMAGES ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <InfoIcon className="size-4 shrink-0" aria-hidden="true" />
            {t('full')}
          </p>
        ) : null}
      </>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      {heading}
      {body}
      {input}
      {deleting ? (
        <DeletePhotoDialog
          venueId={venueId}
          image={deleting.image}
          isCover={deleting.index === 0}
          hasNextCover={deleting.hasNextCover}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          restoreFocusTo={restoreDeleteFocus}
          onDeleted={handleDeleted}
        />
      ) : null}
    </section>
  );
}
