'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { unwrap } from '@iziwellpass/api/client';
import { addVenueImage, presignVenueImage } from '@iziwellpass/api/generated';

import { acceptFiles, galleryErrorKind, MAX_IMAGES, type GalleryErrorKind } from '@/lib/gallery';
import { putPresigned } from '@/lib/put-presigned';

import { invalidateGallery } from './gallery-queries';

export type UploadStatus = 'queued' | 'uploading' | 'registering' | 'failed';

export interface UploadItem {
  key: string;
  name: string;
  status: UploadStatus;
  progress: number;
  error?: GalleryErrorKind;
}

/**
 * Sequential presign → PUT → register queue (spec G3). Rejected files become
 * failed items with no retry; « Réessayer » restarts from presign (G4). The
 * PUT in flight is aborted on unmount and nothing is patched afterwards (G11).
 */
export function useGalleryUploads(venueId: string, storedCount: number) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<UploadItem[]>([]);
  const itemsRef = useRef<UploadItem[]>([]);
  const files = useRef(new Map<string, File>());
  const queue = useRef<string[]>([]);
  const running = useRef(false);
  const mounted = useRef(true);
  const controller = useRef<AbortController | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      queue.current = [];
      controller.current?.abort();
    };
  }, []);

  const patch = useCallback((key: string, next: Partial<UploadItem>) => {
    if (!mounted.current) return;
    setItems((list) => list.map((item) => (item.key === key ? { ...item, ...next } : item)));
  }, []);

  const pump = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      while (queue.current.length > 0 && mounted.current) {
        const key = queue.current.shift();
        const file = key ? files.current.get(key) : undefined;
        if (!key || !file) continue;
        const ctrl = new AbortController();
        controller.current = ctrl;
        try {
          patch(key, { status: 'uploading', progress: 0, error: undefined });
          const presigned = unwrap(await presignVenueImage(venueId, { content_type: file.type }));
          await putPresigned({
            url: presigned.upload_url,
            file,
            contentType: file.type,
            signal: ctrl.signal,
            onProgress: (progress) => patch(key, { progress }),
          });
          patch(key, { status: 'registering', progress: 100 });
          await addVenueImage(venueId, { object_key: presigned.object_key });
          await invalidateGallery(queryClient, venueId);
          files.current.delete(key);
          if (mounted.current) setItems((list) => list.filter((item) => item.key !== key));
        } catch (err) {
          if (ctrl.signal.aborted || !mounted.current) return;
          patch(key, { status: 'failed', error: galleryErrorKind(err) });
        }
      }
    } finally {
      running.current = false;
      controller.current = null;
    }
  }, [patch, queryClient, venueId]);

  const pending = items.filter((item) => item.status !== 'failed').length;
  const freeSlots = Math.max(0, MAX_IMAGES - storedCount - pending);

  const add = useCallback(
    (picked: FileList | readonly File[]) => {
      const inFlight = itemsRef.current.filter((item) => item.status !== 'failed').length;
      const { accepted, rejected } = acceptFiles(
        Array.from(picked),
        MAX_IMAGES - storedCount - inFlight,
      );
      // Uploads first, then the error tiles (canvas `G1SDT`).
      const next: UploadItem[] = [];
      for (const file of accepted) {
        const key = `u${++seq.current}`;
        files.current.set(key, file);
        queue.current.push(key);
        next.push({ key, name: file.name, status: 'queued', progress: 0 });
      }
      for (const { file, reason } of rejected) {
        next.push({
          key: `u${++seq.current}`,
          name: file.name,
          status: 'failed',
          progress: 0,
          error: reason,
        });
      }
      itemsRef.current = [...itemsRef.current, ...next];
      setItems((list) => [...list, ...next]);
      void pump();
    },
    [pump, storedCount],
  );

  const retry = useCallback(
    (key: string) => {
      if (!files.current.has(key)) return;
      patch(key, { status: 'queued', progress: 0, error: undefined });
      queue.current.push(key);
      void pump();
    },
    [patch, pump],
  );

  const dismiss = useCallback((key: string) => {
    files.current.delete(key);
    setItems((list) => list.filter((item) => item.key !== key));
  }, []);

  return { items, freeSlots, add, retry, dismiss };
}
