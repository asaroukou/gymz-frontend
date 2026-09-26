/** Upload failure of the direct-to-storage PUT (network, abort, or non-2xx). `status` is 0 when no response arrived. */
export class PutError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'PutError';
    this.status = status;
  }
}

/** The slice of XMLHttpRequest this module uses; injectable for tests. */
export interface XhrLike {
  open(method: string, url: string): void;
  setRequestHeader(name: string, value: string): void;
  send(body: Blob): void;
  abort(): void;
  status: number;
  upload: {
    onprogress:
      ((event: { loaded: number; total: number; lengthComputable: boolean }) => void) | null;
  };
  onload: (() => void) | null;
  onerror: (() => void) | null;
  onabort: (() => void) | null;
}

/**
 * PUT to a presigned URL with upload progress (fetch has none). Sends only
 * `Content-Type` — the URL carries the signature; an `Authorization` header
 * would break it. Progress caps at 99 until the response lands.
 */
export function putPresigned({
  url,
  file,
  contentType,
  onProgress,
  signal,
  createXhr = () => new XMLHttpRequest() as unknown as XhrLike,
}: {
  url: string;
  file: Blob;
  contentType: string;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
  createXhr?: () => XhrLike;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new PutError(0, 'Upload aborted'));
      return;
    }
    const xhr = createXhr();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress?.(Math.min(99, Math.round((event.loaded / event.total) * 100)));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new PutError(xhr.status, `Upload failed with status ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new PutError(0, 'Upload network error'));
    xhr.onabort = () => reject(new PutError(0, 'Upload aborted'));
    signal?.addEventListener('abort', () => xhr.abort(), { once: true });
    xhr.send(file);
  });
}
