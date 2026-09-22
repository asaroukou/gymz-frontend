# SP-D — Venue gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Owners and admins manage up to ten venue photos (upload with progress, cover, reorder, delete) on the venue detail page and a phone Photos screen, and the venue list tiles show the cover.

**Architecture:** Pure helpers (`lib/gallery.ts`, `lib/put-presigned.ts`) are tested in node. A queue hook runs presign → XHR PUT → register one file at a time. Gallery components under `apps/owner/components/gallery/` render the section (desktop) and the screen (phone route) from the same `VenueGallery`. The mock server serves the whole flow locally, uploads included, through a same-origin `/api/backend/__media/<key>` path.

**Tech Stack:** Next 15 / React 19, Tailwind v4, Radix, react-query v5, next-intl, sonner, `next/image` (unoptimized), vitest (node), node `http` mock.

**Spec:** `docs/superpowers/specs/2026-09-22-venue-gallery-design.md` (decisions G1–G13).

## Global Constraints

- The canvas `screens.pen` is the source of truth; frames `a37vbD`, `T518CJ`, `G1SDT`, `l8Ww0`, `d4nlC8`, `p96Uq`, `keCrj`; PNGs and verbatim copy in `docs/design-refs/comptoir-clair/wave-2/` (`INVENTORY.md`). Where a frame shows « Voir tout » on an interrupted tile, the copy is « Réessayer ».
- Limits: `MAX_IMAGES = 10`, `MAX_IMAGE_BYTES = 5 * 1024 * 1024`, accepted types `image/jpeg`, `image/png`, `image/webp`.
- The presigned PUT sends `Content-Type` equal to the presign `content_type` and never an `Authorization` header.
- Backend 400 messages keyed on (verbatim): `A venue may have at most 10 images`, `Image exceeds 5242880 bytes`, `Unsupported image type`.
- After every successful register, reorder or delete, invalidate `getListVenueImagesQueryKey(venueId)`, `getGetVenueQueryKey(venueId)` and `getListVenuesQueryKey()`.
- Canvas « Button/Secondary » = ui `variant="outline"`. One dark 44px control per surface. Ghost cancels use `DialogClose asChild` + `variant="ghost"`.
- Desktop tile menu buttons 36px (`size-9`); on the phone screen 44px (`size-11`).
- Dialogs opened from a menu stay mounted, are driven by an `open` boolean, and pass `restoreFocusTo` (focus registry `apps/owner/components/focus-registry.ts`).
- Font weights `font-normal`/`font-medium`/`font-semibold` only; sentence case; no `font-bold`, `shadow-*`, `backdrop-blur`, `tracking-wide`, gradients, or the literal `eyebrow`. Status tints never as text colour except `text-destructive-foreground` on tinted error surfaces.
- Type scale: `text-xs` 12, `text-sm` 13, `text-md` 14, `text-base` 15, `text-lg` 16, `text-xl` 22, `text-2xl` 32.
- Images render with `next/image` `fill unoptimized` (no `remotePatterns`, no `<img>`).
- `apps/owner/messages/fr.json` and `en.json` change together with targeted text edits (never re-serialize); parity one-liner must print `parity ok`:
  `node -e 'const f=require("./apps/owner/messages/fr.json"),e=require("./apps/owner/messages/en.json");const k=(o,p="")=>Object.entries(o).flatMap(([a,b])=>typeof b==="string"?[p+a]:k(b,p+a+"."));const F=new Set(k(f)),E=new Set(k(e));const d=[...F].filter(x=>!E.has(x)).concat([...E].filter(x=>!F.has(x)));if(d.length){console.error(d);process.exit(1)}console.log("parity ok")'`
- No new dependencies; no `@testing-library/jest-dom`; owner unit tests are `apps/owner/lib/**/*.test.ts` (node). No `any`.
- Gates before every commit, from the repo root: `pnpm check:design && pnpm typecheck && pnpm lint && pnpm test`. `pnpm build` only in Task 6 and never while a dev server of the same checkout runs.
- Prettier on changed files only (never on the message JSON). Commits use explicit pathspecs; quote paths with parentheses/brackets.
- Driving the app: mock `pnpm --filter @iziwellpass/owner dev:mock` (8090) + app `pnpm --filter @iziwellpass/owner dev` (3011), owner login `abdelsaroukou@gmail.com` / `Varnish+58__` for local verification only (never written into files or sent to another host). Chrome for Testing over CDP from a script in `/tmp`. Stop both servers before finishing a task.

## Review Focus

1. **A file whose `type` is empty** (some phone pickers report `''` for HEIC or unknown files) must be rejected as « Format non accepté » before any request — pinned in Task 1 (`checkFile` test).
2. **Picking files while uploads are already queued** must count queued and in-flight items against the ten-photo limit, so the eleventh file becomes a « Galerie pleine » tile instead of a server 400 — pinned in Task 1 (`acceptFiles` free-slot test) and driven in Task 4.
3. **A reorder against a stale list** (another admin deleted a photo meanwhile, backend 400 because `image_ids` is not the current set) must restore the previous order, toast, and refetch — pinned in Task 3 (`onError` + `onSettled` invalidate) and driven in Task 3 via the mock.
4. **Leaving the page mid-upload** must abort the PUT without leaving an error tile or a React state update on an unmounted component — pinned in Task 4 (abort path in the hook returns before `patch`) and in Task 1 (`putPresigned` abort test).
5. **Deleting the last photo** must bring back the empty panel on the detail page and the tinted no-cover band on the venue tile — driven in Task 5 and the final review.

---

### Task 1: Pure helpers — file checks, moves, error kinds, presigned PUT

**Files:**
- Create: `apps/owner/lib/gallery.ts`, `apps/owner/lib/gallery.test.ts`
- Create: `apps/owner/lib/put-presigned.ts`, `apps/owner/lib/put-presigned.test.ts`

**Interfaces (produced):**

```ts
// gallery.ts
export const MAX_IMAGES = 10;
export const MAX_IMAGE_BYTES: number; // 5 * 1024 * 1024
export const ACCEPTED_TYPES: readonly ['image/jpeg', 'image/png', 'image/webp'];
export const ACCEPT_ATTRIBUTE: string; // 'image/jpeg,image/png,image/webp'
export type GalleryErrorKind = 'type' | 'size' | 'full' | 'interrupted';
export interface FileLike { name: string; type: string; size: number }
export function checkFile(file: FileLike): 'type' | 'size' | null;
export function acceptFiles<F extends FileLike>(files: readonly F[], freeSlots: number): { accepted: F[]; rejected: { file: F; reason: 'type' | 'size' | 'full' }[] };
export type ImageMove = 'left' | 'right' | 'cover';
export function moveImage(ids: readonly string[], id: string, move: ImageMove): string[];
export function galleryErrorKind(err: unknown): GalleryErrorKind;
// put-presigned.ts
export class PutError extends Error { readonly status: number }
export interface XhrLike { … } // minimal XMLHttpRequest surface, see Step 3
export function putPresigned(opts: { url: string; file: Blob; contentType: string; onProgress?: (percent: number) => void; signal?: AbortSignal; createXhr?: () => XhrLike }): Promise<void>;
```

- [ ] **Step 1: Write the failing tests**

`apps/owner/lib/gallery.test.ts`:

```ts
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
    const files = [f('1.jpg', 'image/jpeg'), f('2.gif', 'image/gif'), f('3.png', 'image/png'), f('4.png', 'image/png')];
    const out = acceptFiles(files, 2);
    expect(out.accepted.map((x) => x.name)).toEqual(['1.jpg', '3.png']);
    expect(out.rejected.map((r) => [r.file.name, r.reason])).toEqual([['2.gif', 'type'], ['4.png', 'full']]);
  });
  it('checks type and size before counting slots', () => {
    const out = acceptFiles([f('big.jpg', 'image/jpeg', MAX_IMAGE_BYTES + 1), f('ok.jpg', 'image/jpeg')], 1);
    expect(out.accepted.map((x) => x.name)).toEqual(['ok.jpg']);
    expect(out.rejected).toEqual([{ file: f('big.jpg', 'image/jpeg', MAX_IMAGE_BYTES + 1), reason: 'size' }]);
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
    expect(galleryErrorKind(new ApiError(500, { code: 'INTERNAL', message: 'x' }))).toBe('interrupted');
    expect(galleryErrorKind(new Error('network'))).toBe('interrupted');
  });
});
```

`apps/owner/lib/put-presigned.test.ts`:

```ts
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
  open(method: string, url: string) { this.method = method; this.url = url; }
  setRequestHeader(name: string, value: string) { this.headers[name] = value; }
  send(body: Blob) { this.body = body; }
  abort() { this.aborted = true; this.onabort?.(); }
  progress(loaded: number, total: number) { this.upload.onprogress?.({ loaded, total, lengthComputable: true }); }
  finish(status: number) { this.status = status; this.onload?.(); }
}

const file = new Blob(['x'.repeat(10)], { type: 'image/png' });

describe('putPresigned', () => {
  it('PUTs the file with only a Content-Type header and reports progress', async () => {
    const xhr = new FakeXhr();
    const onProgress = vi.fn();
    const done = putPresigned({ url: '/up', file, contentType: 'image/png', onProgress, createXhr: () => xhr });
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
    const done = putPresigned({ url: '/up', file, contentType: 'image/png', signal: controller.signal, createXhr: () => xhr });
    controller.abort();
    await expect(done).rejects.toBeInstanceOf(PutError);
    expect(xhr.aborted).toBe(true);

    const second = new FakeXhr();
    await expect(
      putPresigned({ url: '/up', file, contentType: 'image/png', signal: controller.signal, createXhr: () => second }),
    ).rejects.toBeInstanceOf(PutError);
    expect(second.method).toBe('');
  });
});
```

- [ ] **Step 2: Run the tests, expect failures on missing modules**

Run: `pnpm --filter @iziwellpass/owner test -- lib/gallery lib/put-presigned`
Expected: FAIL (cannot find module).

- [ ] **Step 3: Implement**

`apps/owner/lib/gallery.ts`:

```ts
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
```

`apps/owner/lib/put-presigned.ts`:

```ts
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
    onprogress: ((event: { loaded: number; total: number; lengthComputable: boolean }) => void) | null;
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
```

- [ ] **Step 4: Run the tests, expect PASS**

Run: `pnpm --filter @iziwellpass/owner test`
Expected: all green, output pristine.

- [ ] **Step 5: Gates and commit**

```bash
pnpm check:design && pnpm typecheck && pnpm lint && pnpm test
pnpm exec prettier --write apps/owner/lib/gallery.ts apps/owner/lib/gallery.test.ts apps/owner/lib/put-presigned.ts apps/owner/lib/put-presigned.test.ts
git add apps/owner/lib/gallery.ts apps/owner/lib/gallery.test.ts apps/owner/lib/put-presigned.ts apps/owner/lib/put-presigned.test.ts
git commit -m "feat(owner): gallery helpers (file checks, moves, error kinds) and presigned PUT with progress"
```

---

### Task 2: Messages and mock server

**Files:**
- Modify: `apps/owner/messages/fr.json`, `apps/owner/messages/en.json` (targeted edits)
- Modify: `apps/owner/scripts/mock-server.mjs`

**Interfaces (produced):** message keys under `venues.detail.photos.*` (Step 1); mock routes `POST/GET /gms/v1/venues/{id}/images`, `POST …/images/presign`, `PUT …/images/order`, `DELETE …/images/{imageId}`, `PUT/GET /__media/<key>`; `VENUE_1` seeded with three images and a `cover_image_url`.

- [ ] **Step 1: French keys** — add a `photos` object at the end of `venues.detail` (after `resources`) with exactly:

```json
"photos": {
  "title": "Photos",
  "count": "{count, plural, one {# photo} other {# photos}} sur 10 · La première est la couverture",
  "rules": "Jusqu'à 10 photos · JPEG, PNG ou WebP · 5 Mo max",
  "add": "Ajouter des photos",
  "addTile": "Ajouter",
  "cover": "Couverture",
  "alt": "Photo {index} sur {count}",
  "menu": "Actions de la photo {index}",
  "setCover": "Définir comme couverture",
  "moveLeft": "Déplacer à gauche",
  "moveRight": "Déplacer à droite",
  "delete": "Supprimer",
  "emptyTitle": "Aucune photo pour l'instant",
  "emptyBody": "Montrez votre établissement aux membres et sur le marketplace. La première photo devient la couverture.",
  "full": "Galerie pleine (10/10). Supprimez une photo pour en ajouter une autre.",
  "progress": "{percent} %",
  "errors": {
    "type": "Format non accepté",
    "size": "Fichier trop lourd (max 5 Mo)",
    "full": "Galerie pleine (10/10)",
    "interrupted": "Téléversement interrompu"
  },
  "retry": "Réessayer",
  "dismiss": "Retirer",
  "loadError": "Impossible de charger les photos",
  "reorderError": "Impossible de réordonner les photos",
  "summaryNone": "Aucune photo",
  "summaryCount": "{count, plural, one {# photo} other {# photos}} sur 10",
  "deleteDialog": {
    "title": "Supprimer cette photo",
    "description": "Elle sera retirée de la galerie et du marketplace.",
    "coverNote": "La photo suivante deviendra la couverture.",
    "confirm": "Supprimer",
    "confirming": "Suppression…",
    "success": "Photo supprimée",
    "error": "Impossible de supprimer la photo"
  }
}
```

- [ ] **Step 2: English keys** — same structure: title "Photos"; count "{count, plural, one {# photo} other {# photos}} of 10 · The first one is the cover"; rules "Up to 10 photos · JPEG, PNG or WebP · 5 MB max"; add "Add photos"; addTile "Add"; cover "Cover"; alt "Photo {index} of {count}"; menu "Photo {index} actions"; setCover "Set as cover"; moveLeft "Move left"; moveRight "Move right"; delete "Delete"; emptyTitle "No photos yet"; emptyBody "Show your venue to members and on the marketplace. The first photo becomes the cover."; full "Gallery full (10/10). Delete a photo to add another."; progress "{percent}%"; errors.type "Format not accepted", errors.size "File too large (max 5 MB)", errors.full "Gallery full (10/10)", errors.interrupted "Upload interrupted"; retry "Retry"; dismiss "Remove"; loadError "Could not load photos"; reorderError "Could not reorder photos"; summaryNone "No photos"; summaryCount "{count, plural, one {# photo} other {# photos}} of 10"; deleteDialog.title "Delete this photo", description "It will be removed from the gallery and the marketplace.", coverNote "The next photo will become the cover.", confirm "Delete", confirming "Deleting…", success "Photo deleted", error "Could not delete photo".

Run the parity one-liner → `parity ok`.

- [ ] **Step 3: Mock — media store and raw-body handling**

In `apps/owner/scripts/mock-server.mjs`:
- Add `import { crc32, deflateSync } from 'node:zlib';` next to the existing imports.
- In the `http.createServer` handler, keep the raw `Buffer` (`const raw = Buffer.concat(chunks);`) and derive `rawBody = raw.toString('utf8')` only for JSON. Before the authorization gate, handle media (no auth, as S3 and the CDN need none):

```js
if (url.pathname.startsWith('/__media/')) {
  const key = decodeURIComponent(url.pathname.slice('/__media/'.length));
  if (req.method === 'PUT') {
    media.set(key, { contentType: req.headers['content-type'] ?? 'application/octet-stream', bytes: raw });
    console.log(`[mock] PUT /__media/${key} (${raw.length} bytes) -> 200`);
    res.writeHead(200);
    res.end();
    return;
  }
  if (req.method === 'GET') {
    const stored = media.get(key);
    res.writeHead(stored ? 200 : 404, stored ? { 'content-type': stored.contentType, 'cache-control': 'no-store' } : {});
    res.end(stored ? stored.bytes : undefined);
    return;
  }
}
```

- Add the store, a PNG generator for seeds, and helpers near the other seeds (after `venues`):

```js
// --- seed: venue images (gallery, SP-D) ---------------------------------------
const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_IMAGES = 10;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const media = new Map(); // object_key -> { contentType, bytes }
const venueImages = new Map(); // venue id -> VenueImage[] in cover-first order
const mediaUrl = (key) => `/api/backend/__media/${key}`;

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}
/** A small solid-colour PNG so seeded photos render without fixtures on disk. */
function solidPng([r, g, b], width = 64, height = 48) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour RGB
  const row = Buffer.alloc(1 + width * 3);
  for (let x = 0; x < width; x++) row.set([r, g, b], 1 + x * 3);
  const pixels = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(pixels)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}
function imagesOf(venueId) {
  if (!venueImages.has(venueId)) venueImages.set(venueId, []);
  return venueImages.get(venueId);
}
/** Mirrors the backend: sort_order follows the list, the first url is the venue cover. */
function syncCover(venueId) {
  const list = imagesOf(venueId);
  list.forEach((image, index) => {
    image.sort_order = index;
  });
  const venue = venues.find((v) => v.id === venueId);
  if (venue) venue.cover_image_url = list[0]?.url ?? null;
}
function storeImage(venueId, key, contentType) {
  const image = {
    id: randomUUID(),
    tenant_id: TENANT_ID,
    venue_id: venueId,
    object_key: key,
    url: mediaUrl(key),
    content_type: contentType,
    sort_order: imagesOf(venueId).length,
    created_at: iso(now()),
  };
  imagesOf(venueId).push(image);
  syncCover(venueId);
  return image;
}
for (const rgb of [[233, 243, 238], [232, 238, 251], [245, 236, 220]]) {
  const key = `venues/${TENANT_ID}/${VENUE_1}/${randomUUID()}.png`;
  media.set(key, { contentType: 'image/png', bytes: solidPng(rgb) });
  storeImage(VENUE_1, key, 'image/png');
}
```

If `iso`/`now` are declared after `venues`, place this block after them (it must run after both `venues` and the time helpers exist).

- [ ] **Step 4: Mock — gallery handlers and routes**

```js
// ---- venue images (gallery) ---------------------------------------------------
const unsupportedType = () => [
  400,
  errorBody('VALIDATION_ERROR', 'Unsupported image type', [
    { field: 'content_type', message: 'Must be image/jpeg, image/png, or image/webp' },
  ]),
];
const galleryFull = () => [400, errorBody('VALIDATION_ERROR', `A venue may have at most ${MAX_IMAGES} images`)];

function presignImageHandler(venueId, body) {
  if (!venues.some((v) => v.id === venueId)) return notFound(`Venue ${venueId} not found`);
  const ext = IMAGE_TYPES[body?.content_type];
  if (!ext) return unsupportedType();
  if (imagesOf(venueId).length >= MAX_IMAGES) return galleryFull();
  const key = `venues/${TENANT_ID}/${venueId}/${randomUUID()}.${ext}`;
  return [
    201,
    envelope({ upload_url: mediaUrl(key), object_key: key, url: mediaUrl(key), expires_at: Math.floor(Date.now() / 1000) + 300 }),
  ];
}
function registerImageHandler(venueId, body) {
  if (!venues.some((v) => v.id === venueId)) return notFound(`Venue ${venueId} not found`);
  const key = body?.object_key ?? '';
  if (!key.startsWith(`venues/${TENANT_ID}/${venueId}/`)) {
    return [400, errorBody('VALIDATION_ERROR', "object_key is outside this venue's upload prefix", [
      { field: 'object_key', message: 'must be an object uploaded for this venue' },
    ])];
  }
  const stored = media.get(key);
  if (!stored) {
    return [400, errorBody('VALIDATION_ERROR', 'Uploaded object not found', [{ field: 'object_key', message: 'No object at this key' }])];
  }
  if (!IMAGE_TYPES[stored.contentType]) return unsupportedType();
  if (stored.bytes.length > MAX_IMAGE_BYTES) {
    return [400, errorBody('VALIDATION_ERROR', `Image exceeds ${MAX_IMAGE_BYTES} bytes`)];
  }
  if (imagesOf(venueId).length >= MAX_IMAGES) return galleryFull();
  return [201, envelope(storeImage(venueId, key, stored.contentType))];
}
function listImagesHandler(venueId) {
  if (!venues.some((v) => v.id === venueId)) return notFound(`Venue ${venueId} not found`);
  return [200, envelope(imagesOf(venueId))];
}
function reorderImagesHandler(venueId, body) {
  const list = imagesOf(venueId);
  const ids = Array.isArray(body?.image_ids) ? body.image_ids : [];
  const sameSet = ids.length === list.length && new Set(ids).size === ids.length && ids.every((id) => list.some((i) => i.id === id));
  if (!sameSet) return [400, errorBody('VALIDATION_ERROR', 'image_ids must be exactly the current set of images')];
  venueImages.set(venueId, ids.map((id) => list.find((i) => i.id === id)));
  syncCover(venueId);
  return [200, envelope(imagesOf(venueId))];
}
function deleteImageHandler(venueId, imageId) {
  const list = imagesOf(venueId);
  const index = list.findIndex((i) => i.id === imageId);
  if (index === -1) return notFound(`Image ${imageId} not found`);
  const [removed] = list.splice(index, 1);
  media.delete(removed.object_key);
  syncCover(venueId);
  return [204, ''];
}
```

Routes (add to the `routes` array; the `/order` and `/presign` entries must come before any generic `images/{id}` pattern of the same method — they use distinct methods here, but keep them first for clarity):

```js
{ method: 'POST', pattern: /^\/gms\/v1\/venues\/([^/]+)\/images\/presign$/, handler: (m, body) => presignImageHandler(m[1], body) },
{ method: 'PUT', pattern: /^\/gms\/v1\/venues\/([^/]+)\/images\/order$/, handler: (m, body) => reorderImagesHandler(m[1], body) },
{ method: 'GET', pattern: /^\/gms\/v1\/venues\/([^/]+)\/images$/, handler: (m) => listImagesHandler(m[1]) },
{ method: 'POST', pattern: /^\/gms\/v1\/venues\/([^/]+)\/images$/, handler: (m, body) => registerImageHandler(m[1], body) },
{ method: 'DELETE', pattern: /^\/gms\/v1\/venues\/([^/]+)\/images\/([^/]+)$/, handler: (m) => deleteImageHandler(m[1], m[2]) },
```

Add to the header comment block: "Venue gallery: `venue-dakar-01` starts with three seeded photos; uploads go to the same-origin `/api/backend/__media/<key>` (no auth), mirroring the presigned S3 PUT; state resets on restart."

- [ ] **Step 5: Smoke the mock**

```bash
node apps/owner/scripts/mock-server.mjs & sleep 1
H='authorization: Bearer x'
curl -s -H "$H" localhost:8090/gms/v1/venues/venue-dakar-01/images | head -c 300; echo
P=$(curl -s -H "$H" -H 'content-type: application/json' -d '{"content_type":"image/png"}' localhost:8090/gms/v1/venues/venue-dakar-01/images/presign)
echo "$P" | head -c 300; echo
K=$(echo "$P" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).data.object_key))')
printf '\x89PNG\r\n\x1a\nfake' > /tmp/sp-d-smoke.png
curl -s -o /dev/null -w 'put %{http_code}\n' -X PUT -H 'content-type: image/png' --data-binary @/tmp/sp-d-smoke.png "localhost:8090/__media/$K"
curl -s -o /dev/null -w 'register %{http_code}\n' -H "$H" -H 'content-type: application/json' -d "{\"object_key\":\"$K\"}" localhost:8090/gms/v1/venues/venue-dakar-01/images
curl -s -o /dev/null -w 'gif presign %{http_code}\n' -H "$H" -H 'content-type: application/json' -d '{"content_type":"image/gif"}' localhost:8090/gms/v1/venues/venue-dakar-01/images/presign
curl -s -H "$H" localhost:8090/gms/v1/venues/venue-dakar-01 | grep -o '"cover_image_url":"[^"]*"'
kill %1
```

Expected: list with 3 items; presign 201 body; put 200; register 201; gif presign 400; a non-null `cover_image_url`.

- [ ] **Step 6: Gates and commit**

```bash
pnpm check:design && pnpm typecheck && pnpm lint && pnpm test
pnpm exec prettier --write apps/owner/scripts/mock-server.mjs
git add apps/owner/messages/fr.json apps/owner/messages/en.json apps/owner/scripts/mock-server.mjs
git commit -m "feat(owner): gallery messages and mock (presign, media PUT, register, reorder, delete, cover sync)"
```

---

### Task 3: Gallery view — photo tiles, menu, reorder, delete, empty and full states (desktop section)

**Files:**
- Create: `apps/owner/components/gallery/gallery-queries.ts`
- Create: `apps/owner/components/gallery/photo-tile.tsx`
- Create: `apps/owner/components/gallery/delete-photo-dialog.tsx`
- Create: `apps/owner/components/gallery/venue-gallery.tsx`
- Modify: `apps/owner/app/(app)/venues/[id]/page.tsx` (section in the right column, `md` and up)

**Interfaces:**
- Consumes: `moveImage`, `MAX_IMAGES` (Task 1); keys `venues.detail.photos.*` (Task 2); generated `useListVenueImages`, `useReorderVenueImages`, `useDeleteVenueImage`, `getListVenueImagesQueryKey`, `getGetVenueQueryKey`, `getListVenuesQueryKey`; type `ApiResponseVecVenueImage`, `VenueImage`.
- Produces:
  - `invalidateGallery(queryClient: QueryClient, venueId: string): Promise<void>` (awaits all three invalidations).
  - `PhotoTile({ image, index, count, canEdit, size, menuRef, busy, onMove, onDelete })` with `size: 'large' | 'small' | 'screen'`.
  - `DeletePhotoDialog({ venueId, image, isCover, open, onOpenChange, restoreFocusTo })`.
  - `VenueGallery({ venueId, canEdit, variant })` with `variant: 'section' | 'screen'`; exported `tileSizeAt(index, variant)`.
  - `TILE_CLASS: Record<TileSize, string>` exported from `photo-tile.tsx`.
  - This task renders no add controls; Task 4 adds the upload queue, the add button, the add tile and the empty-panel button. Keep the grid assembly in one function `galleryCells()` so Task 4 appends upload cells and the add tile there.

- [ ] **Step 1: Queries helper**

```ts
// apps/owner/components/gallery/gallery-queries.ts
import type { QueryClient } from '@tanstack/react-query';

import {
  getGetVenueQueryKey,
  getListVenueImagesQueryKey,
  getListVenuesQueryKey,
} from '@iziwellpass/api/generated';

/** Every gallery mutation moves the cover, so the venue and the venue list refresh too (spec G12). */
export async function invalidateGallery(queryClient: QueryClient, venueId: string): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: getListVenueImagesQueryKey(venueId) }),
    queryClient.invalidateQueries({ queryKey: getGetVenueQueryKey(venueId) }),
    queryClient.invalidateQueries({ queryKey: getListVenuesQueryKey() }),
  ]);
}
```

- [ ] **Step 2: Photo tile** (canvas `a37vbD`, menu `l8Ww0`, phone `keCrj`)

```tsx
'use client';

import Image from 'next/image';
import { ArrowLeftIcon, ArrowRightIcon, MoreHorizontalIcon, StarIcon, Trash2Icon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { VenueImage } from '@iziwellpass/api/schemas';
import { Button } from '@iziwellpass/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@iziwellpass/ui/components/dropdown-menu';
import { cn } from '@iziwellpass/ui/lib/utils';

import type { ImageMove } from '@/lib/gallery';

export type TileSize = 'large' | 'small' | 'screen';

export const TILE_CLASS: Record<TileSize, string> = {
  large: 'col-span-3 h-[170px]',
  small: 'col-span-2 h-28',
  screen: 'h-[130px]',
};

export function PhotoTile({
  image,
  index,
  count,
  canEdit,
  size,
  busy,
  menuRef,
  onMove,
  onDelete,
}: {
  image: VenueImage;
  index: number;
  count: number;
  canEdit: boolean;
  size: TileSize;
  busy: boolean;
  menuRef?: (el: HTMLButtonElement | null) => void;
  onMove: (image: VenueImage, move: ImageMove) => void;
  onDelete: (image: VenueImage, index: number) => void;
}) {
  const t = useTranslations('venues.detail.photos');
  const position = index + 1;
  return (
    <div className={cn('relative overflow-hidden rounded-[20px] bg-secondary', TILE_CLASS[size])}>
      <Image
        src={image.url}
        alt={t('alt', { index: position, count })}
        fill
        unoptimized
        sizes="(min-width: 768px) 250px, 50vw"
        className="object-cover"
      />
      {index === 0 ? (
        <span className="absolute top-3 left-3 rounded-full bg-foreground px-2.5 py-0.5 text-sm text-background">
          {t('cover')}
        </span>
      ) : null}
      {canEdit ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              ref={menuRef}
              variant="ghost"
              size="icon-sm"
              className={cn(
                'absolute top-3 right-3 rounded-full bg-background/80 hover:bg-background',
                size === 'screen' && 'size-11',
              )}
              aria-label={t('menu', { index: position })}
            >
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[250px]">
            <DropdownMenuItem disabled={busy || index === 0} onSelect={() => onMove(image, 'cover')}>
              <StarIcon /> {t('setCover')}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={busy || index === 0} onSelect={() => onMove(image, 'left')}>
              <ArrowLeftIcon /> {t('moveLeft')}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={busy || index === count - 1} onSelect={() => onMove(image, 'right')}>
              <ArrowRightIcon /> {t('moveRight')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" disabled={busy} onSelect={() => onDelete(image, index)}>
              <Trash2Icon /> {t('delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: Delete dialog** (canvas `d4nlC8`)

```tsx
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
  open,
  onOpenChange,
  restoreFocusTo,
}: {
  venueId: string;
  image: VenueImage;
  isCover: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restoreFocusTo?: () => HTMLElement | null | undefined;
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
            {isCover ? ` ${t('deleteDialog.coverNote')}` : null}
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
```

(`common.cancel` exists and reads « Annuler ».)

- [ ] **Step 4: `VenueGallery`** (section variant now; the screen variant heading lands in Task 5 but the prop exists from the start)

```tsx
'use client';

import { useMemo, useState } from 'react';
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
  const [deleting, setDeleting] = useState<{ image: VenueImage; index: number } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleMove = (image: VenueImage, move: ImageMove) => {
    const key = getListVenueImagesQueryKey(venueId);
    const previous = queryClient.getQueryData<ApiResponseVecVenueImage>(key);
    if (!previous) return;
    const ids = moveImage(previous.data.map((i) => i.id), image.id, move);
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

  const heading =
    variant === 'section' ? <SectionHeading title={t('title')} description={description} /> : null;

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
          setDeleting({ image: target, index: targetIndex });
          setDeleteOpen(true);
        }}
      />
    ));

  let body: React.ReactNode;
  if (imagesQuery.isLoading) {
    body = (
      <div className={variant === 'section' ? 'grid grid-cols-6 gap-3' : 'grid grid-cols-2 gap-3'} aria-hidden="true">
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
        <div className={variant === 'section' ? 'grid grid-cols-6 gap-3' : 'grid grid-cols-2 gap-3'}>
          {galleryCells()}
        </div>
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
    <section className="flex flex-col gap-4">
      {heading}
      {body}
      {deleting ? (
        <DeletePhotoDialog
          venueId={venueId}
          image={deleting.image}
          isCover={deleting.index === 0}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          restoreFocusTo={() => focus.get(`photo-${deleting.image.id}`)}
        />
      ) : null}
    </section>
  );
}
```

(`venues.errorTitle` exists: « Une erreur est survenue ».)

- [ ] **Step 5: Place the section on the venue page.** In `apps/owner/app/(app)/venues/[id]/page.tsx`, the right column becomes:

```tsx
<div className="flex flex-col gap-10">
  <div className="hidden md:block">
    <VenueGallery venueId={venue.id} canEdit={canEdit} variant="section" />
  </div>
  <ActivitiesSection venueId={venue.id} canEdit={canEdit} />
  <ResourcesSection venueId={venue.id} canEdit={canEdit} />
</div>
```

with `import { VenueGallery } from '@/components/gallery/venue-gallery';`.

- [ ] **Step 6: Drive it on the mock** (servers per Global Constraints): `/venues/venue-dakar-01` at 1440×1300 shows three seeded photos (two large, one small), « Couverture » on the first, « 3 photos sur 10 · La première est la couverture ». Menu on photo 2 → « Définir comme couverture » → the order flips immediately and survives a reload. « Déplacer à gauche » is disabled on photo 1, « Déplacer à droite » on the last. Stale-list check (Review Focus 3): in a second tab delete photo 3 through the dialog, then in the first tab (not reloaded) move photo 2 left → toast « Impossible de réordonner les photos », order restores, then the list refreshes to two photos. Delete the cover → dialog shows the cover sentence and thumbnail; after confirm the next photo carries « Couverture » and focus is sane. Delete all → empty panel. Screenshot each to `.superpowers/sdd/2026-09-22-venue-gallery/task-3-shots/`. Compare with `a37vbD`, `l8Ww0`, `d4nlC8`, `T518CJ`. Stop the servers.

- [ ] **Step 7: Gates and commit**

```bash
pnpm check:design && pnpm typecheck && pnpm lint && pnpm test
pnpm exec prettier --write apps/owner/components/gallery/gallery-queries.ts apps/owner/components/gallery/photo-tile.tsx apps/owner/components/gallery/delete-photo-dialog.tsx apps/owner/components/gallery/venue-gallery.tsx 'apps/owner/app/(app)/venues/[id]/page.tsx'
git add apps/owner/components/gallery/gallery-queries.ts apps/owner/components/gallery/photo-tile.tsx apps/owner/components/gallery/delete-photo-dialog.tsx apps/owner/components/gallery/venue-gallery.tsx 'apps/owner/app/(app)/venues/[id]/page.tsx'
git commit -m "feat(owner): venue gallery section — photo tiles, cover, optimistic reorder, delete"
```

---

### Task 4: Uploads — queue hook, upload tiles, add controls

**Files:**
- Create: `apps/owner/components/gallery/use-gallery-uploads.ts`
- Create: `apps/owner/components/gallery/upload-tile.tsx`
- Modify: `apps/owner/components/gallery/venue-gallery.tsx`

**Interfaces:**
- Consumes: `acceptFiles`, `galleryErrorKind`, `GalleryErrorKind`, `MAX_IMAGES`, `ACCEPT_ATTRIBUTE` (Task 1); `putPresigned` (Task 1); `invalidateGallery`, `TILE_CLASS`, `tileSizeAt` (Task 3); generated raw functions `presignVenueImage(id, { content_type })` and `addVenueImage(id, { object_key })`, `unwrap`.
- Produces:
  ```ts
  export type UploadStatus = 'queued' | 'uploading' | 'registering' | 'failed';
  export interface UploadItem { key: string; name: string; status: UploadStatus; progress: number; error?: GalleryErrorKind }
  export function useGalleryUploads(venueId: string, storedCount: number): {
    items: UploadItem[];
    freeSlots: number;
    add: (files: FileList | readonly File[]) => void;
    retry: (key: string) => void;
    dismiss: (key: string) => void;
  };
  export function UploadTile({ item, size, onRetry, onDismiss }: { item: UploadItem; size: TileSize; onRetry: () => void; onDismiss: () => void }): JSX.Element;
  ```

- [ ] **Step 1: Queue hook**

```ts
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
      const { accepted, rejected } = acceptFiles(Array.from(picked), MAX_IMAGES - storedCount - inFlight);
      const next: UploadItem[] = [];
      for (const { file, reason } of rejected) {
        next.push({ key: `u${++seq.current}`, name: file.name, status: 'failed', progress: 0, error: reason });
      }
      for (const file of accepted) {
        const key = `u${++seq.current}`;
        files.current.set(key, file);
        queue.current.push(key);
        next.push({ key, name: file.name, status: 'queued', progress: 0 });
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
```

`presignVenueImage` / `addVenueImage` are the raw generated functions (not hooks); check their exact exported names and argument order in `packages/api/src/generated/endpoints.ts` (`presignVenueImage(id, presignImageRequest, options?)`, `addVenueImage(id, registerImageRequest, options?)`). Retry is only reachable for `interrupted` items (the tile hides the button otherwise) and the file is kept in `files` until success or dismiss.

- [ ] **Step 2: Upload tile** (canvas `G1SDT`)

```tsx
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
}: {
  item: UploadItem;
  size: TileSize;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  const t = useTranslations('venues.detail.photos');
  if (item.status !== 'failed') {
    return (
      <div
        className={cn('flex flex-col justify-end gap-2 rounded-[20px] bg-secondary p-4', TILE_CLASS[size])}
        aria-label={item.name}
      >
        <span className="font-numeric text-sm">{t('progress', { percent: item.progress })}</span>
        <Progress value={item.progress} className="h-1 bg-background" />
      </div>
    );
  }
  const kind = item.error ?? 'interrupted';
  return (
    <div
      role="alert"
      className={cn(
        'relative flex flex-col gap-2 rounded-[20px] bg-destructive p-4 text-destructive-foreground',
        TILE_CLASS[size],
      )}
    >
      <CircleAlertIcon className="size-[18px]" aria-hidden="true" />
      <p className="pr-6 text-sm leading-snug">{t(`errors.${kind}`)}</p>
      {kind === 'interrupted' ? (
        <Button variant="link" size="sm" className="h-auto self-start p-0 text-current" onClick={onRetry}>
          {t('retry')}
        </Button>
      ) : null}
      <Button
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
```

- [ ] **Step 3: Wire uploads into `VenueGallery`**

- Call `const uploads = useGalleryUploads(venueId, images.length);` and keep a hidden input:
  ```tsx
  const inputRef = useRef<HTMLInputElement>(null);
  const openPicker = () => inputRef.current?.click();
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
  const canAdd = canEdit && uploads.freeSlots > 0;
  ```
- **Section heading action** (only when `count > 0 || uploads.items.length > 0`): `<Button variant="outline" size="sm" onClick={openPicker} disabled={!canAdd}><PlusIcon aria-hidden="true" />{t('add')}</Button>` when `canEdit`.
- **Empty panel** (`count === 0 && uploads.items.length === 0`): add, under the description, when `canEdit`, `<Button onClick={openPicker}><PlusIcon aria-hidden="true" />{t('add')}</Button>` and the rules line `<p className="text-sm text-muted-foreground">{t('rules')}</p>`. When there are upload items but no stored photos, render the grid, not the panel.
- **Grid cells:** after the photo tiles, append `uploads.items.map((item, i) => <UploadTile key={item.key} item={item} size={tileSizeAt(count + i, variant)} onRetry={() => uploads.retry(item.key)} onDismiss={() => uploads.dismiss(item.key)} />)`, then, for `variant === 'section' && canAdd`, the add tile:
  ```tsx
  <button
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
  ```
- **Full notice:** show when `count + uploads.items.filter((i) => i.status !== 'failed').length >= MAX_IMAGES` (a full gallery also hides the add tile via `canAdd`).
- Render `{input}` once inside the section.

- [ ] **Step 4: Drive it on the mock** at 1440×1300 with Chrome network throttling (CDP `Network.emulateNetworkConditions`, upload throughput ~200 KB/s) so progress is visible: pick three valid images (2 MB PNG/JPEG files generated in `/tmp`), one `.gif`, and one 6 MB JPEG in one selection → two error tiles (« Format non accepté », « Fichier trop lourd (max 5 Mo) ») without retry, three progress tiles advancing one at a time, then real photos; header count updates; venue list tile cover updates on `/venues` after reload. Fill the gallery to 10 → header button disabled, no add tile, full notice. Pick more files when at 9 with one uploading (Review Focus 2) → the extra file becomes « Galerie pleine (10/10) ». Stop the mock mid-upload → « Téléversement interrompu » + « Réessayer »; restart the mock and retry → it completes (note: restart resets state; retry must presign again). Navigate away mid-upload (Review Focus 4) → no console error about state updates on unmounted components. Dismiss an error tile. Screenshots to `.superpowers/sdd/2026-09-22-venue-gallery/task-4-shots/`, compared with `G1SDT`, `l8Ww0`, `T518CJ`. Stop the servers.

- [ ] **Step 5: Gates and commit**

```bash
pnpm check:design && pnpm typecheck && pnpm lint && pnpm test
pnpm exec prettier --write apps/owner/components/gallery/use-gallery-uploads.ts apps/owner/components/gallery/upload-tile.tsx apps/owner/components/gallery/venue-gallery.tsx
git add apps/owner/components/gallery/use-gallery-uploads.ts apps/owner/components/gallery/upload-tile.tsx apps/owner/components/gallery/venue-gallery.tsx
git commit -m "feat(owner): gallery uploads — sequential presign/PUT/register queue with progress and error tiles"
```

---

### Task 5: Phone Photos screen, summary row, venue tiles with cover

**Files:**
- Create: `apps/owner/components/gallery/photos-summary-row.tsx`
- Create: `apps/owner/app/(app)/venues/[id]/photos/page.tsx`
- Modify: `apps/owner/components/gallery/venue-gallery.tsx` (screen variant header and dark add button)
- Modify: `apps/owner/app/(app)/venues/[id]/page.tsx` (summary row below `md`)
- Modify: `apps/owner/app/(app)/venues/page.tsx` (`VenueTile` with cover band, skeleton height)

**Interfaces:**
- Consumes: `VenueGallery` (Tasks 3–4), keys `venues.detail.photos.{title,summaryNone,summaryCount,count,rules,add}`, `useListVenueImages`, `useGetVenue`, `tintClass`, `tintForIndex` from `@iziwellpass/ui/lib/tints`.
- Produces: route `/venues/[id]/photos`; `PhotosSummaryRow({ venueId, className })`.

- [ ] **Step 1: Screen variant in `VenueGallery`.** When `variant === 'screen'`, render before the body:
  ```tsx
  <div className="flex flex-col gap-1.5">
    <h1 className="text-2xl font-normal">{t('title')}</h1>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
  {canEdit && (count > 0 || uploads.items.length > 0) ? (
    <Button className="h-12 w-full" onClick={openPicker} disabled={!canAdd}>
      <PlusIcon aria-hidden="true" />
      {t('add')}
    </Button>
  ) : null}
  ```
  The empty panel keeps its own dark button (so the screen never shows two). The screen variant never renders the add tile. Grid: `grid grid-cols-2 gap-3`, tiles `screen` size (menu buttons 44px, set in Task 3).

- [ ] **Step 2: Photos screen route**

```tsx
'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { unwrap } from '@iziwellpass/api/client';
import { useGetVenue } from '@iziwellpass/api/generated';
import { useRole } from '@iziwellpass/auth/provider';
import { BackLink, WorkingPage } from '@iziwellpass/ui/components/working-page';

import { VenueGallery } from '@/components/gallery/venue-gallery';
import { RequirePageAccess } from '@/components/page-access';

/** Canvas `keCrj`: the phone Photos screen (works at every width, spec G8). */
function VenuePhotosContent() {
  const t = useTranslations('venues');
  const { id: venueId } = useParams<{ id: string }>();
  const role = useRole();
  const canEdit = role === 'owner' || role === 'admin';
  const venueQuery = useGetVenue(venueId, { query: { select: unwrap } });
  return (
    <WorkingPage>
      <BackLink href={`/venues/${venueId}`} linkComponent={Link}>
        {venueQuery.data?.name ?? t('detail.back')}
      </BackLink>
      <VenueGallery venueId={venueId} canEdit={canEdit} variant="screen" />
    </WorkingPage>
  );
}

export default function VenuePhotosPage() {
  return (
    <RequirePageAccess href="/venues">
      <VenuePhotosContent />
    </RequirePageAccess>
  );
}
```

- [ ] **Step 3: Summary row**

```tsx
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
```

In `page.tsx` add `<PhotosSummaryRow venueId={venue.id} className="md:hidden" />` right after the `hidden md:block` gallery wrapper.

- [ ] **Step 4: Venue tile with cover band** (canvas `p96Uq`). Replace `VenueTile` in `apps/owner/app/(app)/venues/page.tsx`:

```tsx
function VenueTile({ venue, index }: { venue: Venue; index: number }) {
  const t = useTranslations('venues');
  const activityLabel = useActivityTypeLabel();
  return (
    <li className="contents">
      <Link
        href={`/venues/${venue.id}`}
        className="flex flex-col overflow-hidden rounded-xl border border-border hover:bg-side/60"
      >
        <div
          className={cn(
            'relative flex h-[130px] items-center justify-center',
            venue.cover_image_url ? 'bg-secondary' : venue.is_active ? tintClass(tintForIndex(index)) : 'bg-secondary',
          )}
        >
          {venue.cover_image_url ? (
            <Image src={venue.cover_image_url} alt="" fill unoptimized sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover" />
          ) : (
            <ImageOffIcon className="size-[22px] text-muted-strong" aria-hidden="true" />
          )}
          <Badge variant={venue.is_active ? 'success' : 'default'} className="absolute top-3 left-3">
            {venue.is_active ? t('status.active') : t('status.inactive')}
          </Badge>
        </div>
        <div className="flex flex-col gap-1.5 p-5">
          <p className="text-[1.25rem] font-medium">{venue.name}</p>
          <p className="text-md text-muted-foreground">
            {activityLabel(venue.venue_type)} · {venue.city || t('noAddress')}
          </p>
        </div>
      </Link>
    </li>
  );
}
```

Imports: `Image` from `next/image`, `ImageOffIcon` from `lucide-react` (drop `Building2Icon` if unused), `tintClass`, `tintForIndex` from `@iziwellpass/ui/lib/tints`; remove now-unused `Tile*` imports. Skeleton height `h-[232px]`. Update the component's doc comment to cite `p96Uq`.

- [ ] **Step 5: Drive it on the mock**: 390×844 `/venues/venue-dakar-01` shows the summary row (cover thumbnail, « 3 photos sur 10 ») and no desktop section; tap → `/venues/venue-dakar-01/photos` matches `keCrj` (back link with the venue name, dark full-width button, two columns, 44px menus); upload one file there; delete every photo → empty panel with its dark button only. 1440 `/venues`: tiles with the cover band for `venue-dakar-01`, tinted band with the crossed-out icon for `venue-dakar-02`, inactive venue grey. After deleting every photo of venue 1 the tile falls back to the tinted band (Review Focus 5). Screenshots to `.superpowers/sdd/2026-09-22-venue-gallery/task-5-shots/`, compared with `keCrj` and `p96Uq`. Stop the servers.

- [ ] **Step 6: Gates and commit**

```bash
pnpm check:design && pnpm typecheck && pnpm lint && pnpm test
pnpm exec prettier --write apps/owner/components/gallery/photos-summary-row.tsx apps/owner/components/gallery/venue-gallery.tsx 'apps/owner/app/(app)/venues/[id]/photos/page.tsx' 'apps/owner/app/(app)/venues/[id]/page.tsx' 'apps/owner/app/(app)/venues/page.tsx'
git add apps/owner/components/gallery/photos-summary-row.tsx apps/owner/components/gallery/venue-gallery.tsx 'apps/owner/app/(app)/venues/[id]/photos/page.tsx' 'apps/owner/app/(app)/venues/[id]/page.tsx' 'apps/owner/app/(app)/venues/page.tsx'
git commit -m "feat(owner): phone Photos screen, summary row, venue tiles with cover band"
```

---

### Task 6: Full gates, parity, orphans, build

**Files:** none new.

- [ ] **Step 1:** `pnpm check:design && pnpm typecheck && pnpm lint && pnpm test` from the repo root; parity one-liner → `parity ok`.
- [ ] **Step 2:** Orphan scan of `venues.detail.photos.*` and of keys the venue tile stopped using: every added key is referenced from `apps/owner` (keys used through a template such as `errors.${kind}` count as used). Remove any key no longer referenced, in both files, with targeted edits.
- [ ] **Step 3:** `pnpm build --filter @iziwellpass/owner --filter @iziwellpass/admin` (in a throwaway worktree if a dev server of this checkout is running). Expect exit 0.
- [ ] **Step 4:** Commit any cleanup: `git commit -m "chore(owner): gallery message cleanup"` (skip when nothing changed).
