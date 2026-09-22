import { describe, expect, it, vi } from 'vitest';
import { putPresigned, PutError, type XhrLike } from './put-presigned';

class FakeXhr implements XhrLike {
  method = '';
  url = '';
  headers: Record<string, string> = {};
  body: Blob | null = null;
  status = 0;
  aborted = false;
  upload: XhrLike['upload'] = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  send(body: Blob) {
    this.body = body;
  }
  abort() {
    this.aborted = true;
    this.onabort?.();
  }
  progress(loaded: number, total: number) {
    this.upload.onprogress?.({ loaded, total, lengthComputable: true });
  }
  finish(status: number) {
    this.status = status;
    this.onload?.();
  }
}

const file = new Blob(['x'.repeat(10)], { type: 'image/png' });

describe('putPresigned', () => {
  it('PUTs the file with only a Content-Type header and reports progress', async () => {
    const xhr = new FakeXhr();
    const onProgress = vi.fn();
    const done = putPresigned({
      url: '/up',
      file,
      contentType: 'image/png',
      onProgress,
      createXhr: () => xhr,
    });
    expect(xhr.method).toBe('PUT');
    expect(xhr.url).toBe('/up');
    expect(xhr.headers).toEqual({ 'Content-Type': 'image/png' });
    expect(xhr.body).toBe(file);
    xhr.progress(5, 10);
    xhr.progress(10, 10);
    xhr.finish(200);
    await done;
    expect(onProgress.mock.calls.map((c) => c[0])).toEqual([50, 99, 100]);
  });
  it('rejects with PutError on a non-2xx status', async () => {
    const xhr = new FakeXhr();
    const done = putPresigned({ url: '/up', file, contentType: 'image/png', createXhr: () => xhr });
    xhr.finish(403);
    await expect(done).rejects.toMatchObject({ name: 'PutError', status: 403 });
  });
  it('rejects on a network error', async () => {
    const xhr = new FakeXhr();
    const done = putPresigned({ url: '/up', file, contentType: 'image/png', createXhr: () => xhr });
    xhr.onerror?.();
    await expect(done).rejects.toBeInstanceOf(PutError);
  });
  it('aborts when the signal fires, and refuses an already-aborted signal', async () => {
    const xhr = new FakeXhr();
    const controller = new AbortController();
    const done = putPresigned({
      url: '/up',
      file,
      contentType: 'image/png',
      signal: controller.signal,
      createXhr: () => xhr,
    });
    controller.abort();
    await expect(done).rejects.toBeInstanceOf(PutError);
    expect(xhr.aborted).toBe(true);

    const second = new FakeXhr();
    await expect(
      putPresigned({
        url: '/up',
        file,
        contentType: 'image/png',
        signal: controller.signal,
        createXhr: () => second,
      }),
    ).rejects.toBeInstanceOf(PutError);
    expect(second.method).toBe('');
  });
});
