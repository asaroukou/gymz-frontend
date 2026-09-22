import { describe, expect, it } from 'vitest';
import { ApiError } from '@iziwellpass/api/client';
import { acceptFiles, checkFile, galleryErrorKind, MAX_IMAGE_BYTES, moveImage } from './gallery';

const f = (name: string, type: string, size = 1000) => ({ name, type, size });

describe('checkFile', () => {
  it('accepts jpeg, png and webp up to 5 MiB', () => {
    expect(checkFile(f('a.jpg', 'image/jpeg'))).toBeNull();
    expect(checkFile(f('a.png', 'image/png', MAX_IMAGE_BYTES))).toBeNull();
    expect(checkFile(f('a.webp', 'image/webp'))).toBeNull();
  });
  it('rejects other types, including an empty type', () => {
    expect(checkFile(f('a.gif', 'image/gif'))).toBe('type');
    expect(checkFile(f('a.heic', ''))).toBe('type');
  });
  it('rejects files over 5 MiB', () => {
    expect(checkFile(f('big.jpg', 'image/jpeg', MAX_IMAGE_BYTES + 1))).toBe('size');
  });
});

describe('acceptFiles', () => {
  it('keeps valid files up to the free slots and marks the overflow as full', () => {
    const files = [
      f('1.jpg', 'image/jpeg'),
      f('2.gif', 'image/gif'),
      f('3.png', 'image/png'),
      f('4.png', 'image/png'),
    ];
    const out = acceptFiles(files, 2);
    expect(out.accepted.map((x) => x.name)).toEqual(['1.jpg', '3.png']);
    expect(out.rejected.map((r) => [r.file.name, r.reason])).toEqual([
      ['2.gif', 'type'],
      ['4.png', 'full'],
    ]);
  });
  it('checks type and size before counting slots', () => {
    const out = acceptFiles(
      [f('big.jpg', 'image/jpeg', MAX_IMAGE_BYTES + 1), f('ok.jpg', 'image/jpeg')],
      1,
    );
    expect(out.accepted.map((x) => x.name)).toEqual(['ok.jpg']);
    expect(out.rejected).toEqual([
      { file: f('big.jpg', 'image/jpeg', MAX_IMAGE_BYTES + 1), reason: 'size' },
    ]);
  });
  it('treats zero or negative free slots as full', () => {
    expect(acceptFiles([f('1.jpg', 'image/jpeg')], 0).rejected[0]?.reason).toBe('full');
    expect(acceptFiles([f('1.jpg', 'image/jpeg')], -2).accepted).toEqual([]);
  });
});

describe('moveImage', () => {
  const ids = ['a', 'b', 'c'];
  it('moves left and right', () => {
    expect(moveImage(ids, 'b', 'left')).toEqual(['b', 'a', 'c']);
    expect(moveImage(ids, 'b', 'right')).toEqual(['a', 'c', 'b']);
  });
  it('makes an image the cover by moving it to index 0', () => {
    expect(moveImage(ids, 'c', 'cover')).toEqual(['c', 'a', 'b']);
  });
  it('is a no-op at the edges and for unknown ids, returning a copy', () => {
    expect(moveImage(ids, 'a', 'left')).toEqual(ids);
    expect(moveImage(ids, 'c', 'right')).toEqual(ids);
    expect(moveImage(ids, 'a', 'cover')).toEqual(ids);
    expect(moveImage(ids, 'z', 'left')).toEqual(ids);
    expect(moveImage(ids, 'a', 'left')).not.toBe(ids);
  });
});

describe('galleryErrorKind', () => {
  const bad = (message: string) => new ApiError(400, { code: 'VALIDATION_ERROR', message });
  it('maps the backend messages', () => {
    expect(galleryErrorKind(bad('A venue may have at most 10 images'))).toBe('full');
    expect(galleryErrorKind(bad('Image exceeds 5242880 bytes'))).toBe('size');
    expect(galleryErrorKind(bad('Unsupported image type'))).toBe('type');
  });
  it('falls back to interrupted', () => {
    expect(galleryErrorKind(bad('Uploaded object not found'))).toBe('interrupted');
    expect(galleryErrorKind(new ApiError(500, { code: 'INTERNAL', message: 'x' }))).toBe(
      'interrupted',
    );
    expect(galleryErrorKind(new Error('network'))).toBe('interrupted');
  });
});
