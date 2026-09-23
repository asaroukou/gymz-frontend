'use client';

import Image from 'next/image';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { useDeleteVenueImage } from '@iziwellpass/api/generated';
import type { VenueImage } from '@iziwellpass/api/schemas';
import { Button } from '@iziwellpass/ui/components/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@iziwellpass/ui/components/dialog';

import { apiErrorMessage } from '@/lib/api-error';

import { invalidateGallery } from './gallery-queries';

export function DeletePhotoDialog({
  venueId,
  image,
  isCover,
  hasNextCover,
  open,
  onOpenChange,
  restoreFocusTo,
  onDeleted,
}: {
  venueId: string;
  image: VenueImage;
  /** Shows the « Couverture » badge on the thumbnail. */
  isCover: boolean;
  /** Deleting the cover while another photo remains: that photo becomes the cover. */
  hasNextCover: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restoreFocusTo?: () => HTMLElement | null | undefined;
  /** Runs before the close, so `restoreFocusTo` can pick a surviving target. */
  onDeleted?: () => void;
}) {
  const t = useTranslations('venues.detail.photos');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const remove = useDeleteVenueImage();

  const handleDelete = () => {
    remove.mutate(
      { id: venueId, imageId: image.id },
      {
        onSuccess: () => {
          toast.success(t('deleteDialog.success'));
          void invalidateGallery(queryClient, venueId);
          onDeleted?.();
          onOpenChange(false);
        },
        onError: (err) => toast.error(apiErrorMessage(err, t('deleteDialog.error'))),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]" restoreFocusTo={restoreFocusTo}>
        <DialogHeader>
          <DialogTitle>{t('deleteDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('deleteDialog.description')}
            {hasNextCover ? ` ${t('deleteDialog.coverNote')}` : null}
          </DialogDescription>
        </DialogHeader>
        <div className="relative h-[84px] w-[120px] overflow-hidden rounded-xl bg-secondary">
          <Image src={image.url} alt="" fill unoptimized sizes="120px" className="object-cover" />
          {isCover ? (
            <span className="absolute top-2 left-2 rounded-full bg-foreground px-2 py-0.5 text-xs text-background">
              {t('cover')}
            </span>
          ) : null}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={remove.isPending}>
              {tCommon('cancel')}
            </Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleDelete} disabled={remove.isPending}>
            {remove.isPending ? t('deleteDialog.confirming') : t('deleteDialog.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
