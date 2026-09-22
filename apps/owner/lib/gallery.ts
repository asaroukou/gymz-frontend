import { ApiError } from '@iziwellpass/api/client';

export const MAX_IMAGES = 10;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const ACCEPT_ATTRIBUTE = ACCEPTED_TYPES.join(',');

export type GalleryErrorKind = 'type' | 'size' | 'full' | 'interrupted';

export interface FileLike {
  name: string;
  type: string;
  size: number;
}

/** Browser-side check before any request (spec G5). An empty `type` is rejected. */
export function checkFile(file: FileLike): 'type' | 'size' | null {
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) return 'type';
  if (file.size > MAX_IMAGE_BYTES) return 'size';
  return null;
}

/** Splits a pick into files to upload and error tiles; `freeSlots` already excludes queued uploads. */
export function acceptFiles<F extends FileLike>(
  files: readonly F[],
  freeSlots: number,
): { accepted: F[]; rejected: { file: F; reason: 'type' | 'size' | 'full' }[] } {
  const accepted: F[] = [];
  const rejected: { file: F; reason: 'type' | 'size' | 'full' }[] = [];
  let slots = Math.max(0, freeSlots);
  for (const file of files) {
    const problem = checkFile(file);
    if (problem) {
      rejected.push({ file, reason: problem });
    } else if (slots === 0) {
      rejected.push({ file, reason: 'full' });
    } else {
      accepted.push(file);
      slots -= 1;
    }
  }
  return { accepted, rejected };
}

export type ImageMove = 'left' | 'right' | 'cover';

/** New id order for a menu action; the cover is index 0 (backend contract). Always returns a copy. */
export function moveImage(ids: readonly string[], id: string, move: ImageMove): string[] {
  const next = [...ids];
  const from = next.indexOf(id);
  if (from === -1) return next;
  const to = move === 'cover' ? 0 : move === 'left' ? from - 1 : from + 1;
  if (to < 0 || to >= next.length || to === from) return next;
  next.splice(from, 1);
  next.splice(to, 0, id);
  return next;
}

/** Maps presign/register failures to a tile error (backend `image_service.rs` messages). */
export function galleryErrorKind(err: unknown): GalleryErrorKind {
  if (!(err instanceof ApiError) || err.status !== 400) return 'interrupted';
  if (err.message.includes('at most')) return 'full';
  if (err.message.includes('exceeds')) return 'size';
  if (err.message === 'Unsupported image type') return 'type';
  return 'interrupted';
}
