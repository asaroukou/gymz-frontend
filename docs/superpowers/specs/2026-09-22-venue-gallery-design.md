# SP-D — Venue gallery (« Photos de l'établissement »)

**Date:** 2026-09-22
**Status:** approved design, ready for one plan
**Builds on:** SP-C working screens (2dcbef7), SP-D0 API sync (24f1c6b), SP-E planning contract (29157bd).
**Brief:** `docs/design-briefs/2026-09-21-console-flows-and-actions.md` §1.
**Backend contract:** iziwellpass `origin/main` (unchanged since c2c5876 for these routes): `docs/client-integration.md` « Galerie d'images de salle », `crates/iziwellpass-domain/src/venue/image_service.rs`.
**Canvas frames (source of truth, `screens.pen`):** `a37vbD` Photos · Galerie, `T518CJ` Photos · Vide, `G1SDT` Téléversement et erreurs, `l8Ww0` Galerie pleine et menu, `d4nlC8` Supprimer la couverture, `p96Uq` Établissements · Tuiles avec couverture, `keCrj` Établissement · Photos · Mobile. PNGs and verbatim copy in `docs/design-refs/comptoir-clair/wave-2/` (`INVENTORY.md`).

## 1. Purpose

Owners and admins can show their venue to members and on the marketplace with up to ten photos. The first photo is the cover: the backend copies its URL into `venues.cover_image_url` (and the marketplace catalog) on every add, delete and reorder. SP-D adds the « Photos » section to the venue detail page, a dedicated phone screen, and cover bands on the venue list tiles.

## 2. Decisions

- **G1 — Canvas copy and geometry win over the brief** (same rule as SP-E E1).
- **G2 — Upload machinery lives in the owner app**, not `packages/ui`: a queue hook plus pure helpers. No new dependency.
- **G3 — Sequential uploads.** Accepted files queue and upload one at a time (presign → PUT → register). Progress comes from `XMLHttpRequest.upload.onprogress`; `fetch` has no upload progress.
- **G4 — Retry restarts from presign.** Presigned URLs live ~5 minutes; « Réessayer » on an interrupted tile runs all three steps again.
- **G5 — Browser checks before any request:** type ∈ {`image/jpeg`, `image/png`, `image/webp`}, size ≤ 5 MiB (5 × 1024 × 1024), and at most `10 − current − queued` files accepted per pick; the overflow files become « Galerie pleine » error tiles.
- **G6 — Reorder is optimistic.** The new id list is written into the `listVenueImages` cache, then `PUT …/images/order` sends the full list; on error the previous list is restored and a toast shows. Cover = index 0.
- **G7 — No drag-and-drop.** The « ··· » menu is the only way to reorder (brief marks DnD optional).
- **G8 — Phone gets a dedicated screen.** Below `md` the venue detail page replaces the section with a compact « Photos » row linking to `/venues/[id]/photos`, which renders `keCrj`. The route works at every width (same gallery component).
- **G9 — Roles.** `canEdit` (owner, admin — the detail page's existing flag) gets the add control, upload tiles and menus. Other roles see photos read-only; with zero photos they see the empty title and description without the button.
- **G10 — Images render with `next/image` `unoptimized` and `fill`**, so no `remotePatterns` config is needed and the lint rule `no-img-element` stays clean.
- **G11 — Leaving the page aborts in-flight uploads** (XHR `abort()` on unmount). Queued files are dropped. No cross-route upload state.
- **G12 — After every successful mutation** (register, reorder, delete) invalidate `getListVenueImagesQueryKey(venueId)`, `getGetVenueQueryKey(venueId)` and `getListVenuesQueryKey()` so the cover on the tiles follows.
- **G13 — Mock mirrors the backend** (§8); the app never depends on a mock-only string.

## 3. Units

| File | Responsibility |
| --- | --- |
| `apps/owner/lib/gallery.ts` | Constants (`MAX_IMAGES = 10`, `MAX_IMAGE_BYTES`, `ACCEPTED_TYPES`), `checkFile(file) → 'type' \| 'size' \| null`, `acceptFiles(files, freeSlots) → { accepted: File[]; rejected: { file: File; reason: 'type' \| 'size' \| 'full' }[] }`, `moveImage(ids, id, move: 'left' \| 'right' \| 'cover') → string[]`, `galleryErrorKind(err) → 'full' \| 'size' \| 'type' \| 'interrupted'` |
| `apps/owner/lib/put-presigned.ts` | `putPresigned({ url, file, contentType, onProgress, signal, createXhr? }) → Promise<void>`: XHR PUT, `Content-Type` only (never `Authorization`), resolves on 2xx, rejects `PutError` otherwise or on network error/abort |
| `apps/owner/components/gallery/use-gallery-uploads.ts` | Queue hook: `{ items: UploadItem[]; add(files: FileList \| File[]): void; retry(key: string): void; dismiss(key: string): void }` |
| `apps/owner/components/gallery/venue-gallery.tsx` | The section body: header (title, count/rules line, add button), grid, empty panel, full notice, hidden file input; `variant: 'section' \| 'screen'` |
| `apps/owner/components/gallery/photo-tile.tsx` | One stored photo: image, « Couverture » badge on index 0, « ··· » menu |
| `apps/owner/components/gallery/upload-tile.tsx` | One queue item: progress (« 62 % » + bar) or error (icon + copy + optional « Réessayer ») |
| `apps/owner/components/gallery/delete-photo-dialog.tsx` | 480px confirm with thumbnail, cover sentence when index 0 |
| `apps/owner/components/gallery/photos-summary-row.tsx` | Phone-only compact row on the venue page linking to the Photos screen |
| `apps/owner/app/(app)/venues/[id]/photos/page.tsx` | Phone Photos screen (`keCrj`) |

`UploadItem = { key: string; name: string; status: 'queued' | 'uploading' | 'registering' | 'failed'; progress: number; error?: 'type' | 'size' | 'full' | 'interrupted' }`. Rejected files enter the list directly as `failed` with their reason. `retry` is offered only for `interrupted`. `dismiss` removes a failed item (the error tile carries a small close control on hover/focus, 44px below `md`).

## 4. Section (desktop, `a37vbD` / `T518CJ` / `G1SDT` / `l8Ww0`)

Placement: right column of `/venues/[id]`, first section, above « Activités » (`page.tsx` inserts it before `ActivitiesSection`), hidden below `md` (the summary row takes its place).

- **Header:** `SectionHeading` title « Photos »; description « {n} photos sur 10 · La première est la couverture » when n ≥ 1, « Jusqu'à 10 photos · JPEG, PNG ou WebP · 5 Mo max » when n = 0; action (`canEdit`) outline small « + Ajouter des photos », disabled when n + in-flight items = 10. The action is hidden when n = 0 (the empty panel carries the dark button).
- **Grid:** `grid grid-cols-6 gap-3`; tiles 1–2 `col-span-3 h-[170px]`, the rest `col-span-2 h-28`; radius `rounded-[20px]`; order = stored photos, then upload items, then the « Ajouter » tile (`canEdit` and total < 10: dashed-free outline tile, `+` 18px and « Ajouter » 13px, button).
- **Photo tile:** `next/image` `fill` `object-cover` over `bg-secondary`; alt « Photo {i} sur {n} ». Cover badge: dark pill `bg-foreground text-background text-sm px-2.5 py-0.5` at `top-3 left-3`, « Couverture ». Menu button `top-3 right-3`, `size-9` round on `bg-background/80` (44px on the phone screen), `aria-label` « Actions de la photo {i} ».
- **Menu** (`l8Ww0`, 250px wide, icons `Star`, `ArrowLeft`, `ArrowRight`, `Trash2`): « Définir comme couverture » (disabled on index 0), « Déplacer à gauche » (disabled on index 0), « Déplacer à droite » (disabled on the last), separator, « Supprimer » destructive. Disabled while a reorder is pending.
- **Upload tile** (`G1SDT`): queued/uploading → `bg-secondary`, bottom-left « {p} % » 13px and a 4px bar (`Progress`); registering → same at 100 %. Failed → `bg-destructive text-destructive-foreground`, `CircleAlert` 18px, copy per reason (§7), « Réessayer » as a text-style button for `interrupted` only, and a small « Retirer » close control (`X` icon, `aria-label`) top-right so failed tiles can be cleared. The canvas does not draw the close control; without it a failed tile would stay until the page reloads.
- **Empty panel** (`T518CJ`): `rounded-2xl bg-side p-8`, centered icon chip 48px (`ImageIcon` on `bg-info`), title « Aucune photo pour l'instant » 16/500, description, dark « + Ajouter des photos » (`canEdit`), rules line below. The panel shows only when there are zero stored photos and zero upload items; as soon as one upload item exists, the grid replaces it.
- **Full notice** (`l8Ww0`): under the grid, `Info` 16px + « Galerie pleine (10/10). Supprimez une photo pour en ajouter une autre. » 13px muted; the header button disabled; no « Ajouter » tile.
- **Loading:** grid skeleton (2 large + 3 small `Skeleton` tiles). **Load error:** destructive `Alert` with the existing pattern.

## 5. Phone

- **Summary row** (venue page, `md:hidden`, before « Activités »): a `Link` row 64px — cover thumbnail 48px `rounded-xl` (or tinted `ImageIcon` chip when none), « Photos » 16/500 and « {n} photos sur 10 » / « Aucune photo » 13 muted, `ChevronRight`. Hairline below.
- **Photos screen** `/venues/[id]/photos` (`keCrj`): `WorkingPage` with `BackLink` « {venue name} » to `/venues/[id]`, title « Photos » (`text-2xl`), subtitle as the section description, `canEdit` dark full-width `h-12` « + Ajouter des photos », grid `grid-cols-2 gap-3` with every tile `h-[130px]`, menu buttons `size-11` on `bg-background/80`, no « Ajouter » tile (the button covers it), same full notice and empty panel. Uses `RequirePageAccess href="/venues"` like the detail page.

## 6. Delete (`d4nlC8`)

`DeletePhotoDialog({ image, isCover, venueId, open, onOpenChange, restoreFocusTo })`: `DialogContent className="sm:max-w-[480px]"`, title « Supprimer cette photo », description « Elle sera retirée de la galerie et du marketplace. » plus « La photo suivante deviendra la couverture. » when `isCover`; a 120×84 `rounded-xl` thumbnail (with the cover badge when `isCover`); footer ghost « Annuler » + destructive « Supprimer » (« Suppression… » while pending). Success: toast « Photo supprimée », invalidations (G12), close. Error: toast « Impossible de supprimer la photo ». Stays mounted, one instance per gallery driven by `deleting` state, `restoreFocusTo` via the focus registry (SP-C D12).

## 7. Errors and copy

`galleryErrorKind(err)`: non-`ApiError` or `PutError` → `interrupted`; `ApiError` 400 whose message contains `at most` → `full`; containing `exceeds` → `size`; equal to `Unsupported image type` → `type`; any other → `interrupted`. These are the backend's own messages (`image_service.rs`): `A venue may have at most 10 images`, `Image exceeds 5242880 bytes`, `Unsupported image type`.

| kind | tile copy | retry |
| --- | --- | --- |
| `type` | « Format non accepté » | no |
| `size` | « Fichier trop lourd (max 5 Mo) » | no |
| `full` | « Galerie pleine (10/10) » | no |
| `interrupted` | « Téléversement interrompu » | « Réessayer » |

Reorder error: toast « Impossible de réordonner les photos ». Load error: « Impossible de charger les photos ».

## 8. Mock server

- Store `venueImages: Map<venueId, VenueImage[]>` and `media: Map<objectKey, { contentType, bytes: Buffer }>`; seed three small generated PNGs (solid pastel colours) on `VENUE_1`, none on `VENUE_2`; keep `venue.cover_image_url` = first image url (or null).
- `POST /gms/v1/venues/{id}/images/presign` `{ content_type }` → 400 `VALIDATION_ERROR` if not in the allowlist (message as the backend) or if the venue already has 10 images (`A venue may have at most 10 images`); else 201 `{ upload_url: '/api/backend/__media/<key>', object_key: 'venues/<tenant>/<venue>/<uuid>.<ext>', url: '/api/backend/__media/<key>', expires_at }`.
- `PUT /__media/<key>`: no auth required, stores the raw body with its `content-type`, 200. `GET /__media/<key>`: no auth, serves the bytes with the stored type, 404 otherwise. The auth gate skips `/__media/`.
- `POST /gms/v1/venues/{id}/images` `{ object_key }` → 400 if the key is outside `venues/<tenant>/<venue>/`, if no object was PUT, if it exceeds 5 MiB (`Image exceeds 5242880 bytes`) or if the venue already has 10; else 201 with the `VenueImage` appended, cover synced.
- `GET …/images` → ordered list. `PUT …/images/order` `{ image_ids }` → 400 unless it is exactly the current set; reorders, syncs cover, 200 list. `DELETE …/images/{imageId}` → 404 or 204, deletes media, syncs cover.
- Progress on localhost is near-instant; the final review makes it visible with Chrome network throttling (CDP `Network.emulateNetworkConditions`), not with a mock hook.

## 9. Venue tiles (`p96Uq`)

`VenueTile` becomes a bordered card link (`rounded-xl border border-border overflow-hidden`): a 130px band — `next/image` cover (`object-cover`) when `cover_image_url` is set, else a tinted band (`tint={index}`, `bg-side` when inactive) with `ImageOff` 22px muted centered; the status `Badge` over the band at `top-3 left-3`; body `p-5` with name 20/500 and « {type} · {ville} » 14 muted. Grid and skeleton heights follow (`h-[232px]`). The bordered venue card is a sanctioned exception to DESIGN.md's No-Box rule: the canvas `p96Uq` draws it, since the cover band needs a frame.

## 10. Messages (fr, en mirrored)

```
venues.detail.photos.title            Photos
venues.detail.photos.count            {count} photos sur 10 · La première est la couverture
venues.detail.photos.rules            Jusqu'à 10 photos · JPEG, PNG ou WebP · 5 Mo max
venues.detail.photos.add              Ajouter des photos
venues.detail.photos.addTile          Ajouter
venues.detail.photos.cover            Couverture
venues.detail.photos.alt              Photo {index} sur {count}
venues.detail.photos.menu             Actions de la photo {index}
venues.detail.photos.setCover         Définir comme couverture
venues.detail.photos.moveLeft         Déplacer à gauche
venues.detail.photos.moveRight        Déplacer à droite
venues.detail.photos.delete           Supprimer
venues.detail.photos.emptyTitle       Aucune photo pour l'instant
venues.detail.photos.emptyBody        Montrez votre établissement aux membres et sur le marketplace. La première photo devient la couverture.
venues.detail.photos.full             Galerie pleine (10/10). Supprimez une photo pour en ajouter une autre.
venues.detail.photos.progress         {percent} %
venues.detail.photos.errors.type      Format non accepté
venues.detail.photos.errors.size      Fichier trop lourd (max 5 Mo)
venues.detail.photos.errors.full      Galerie pleine (10/10)
venues.detail.photos.errors.interrupted Téléversement interrompu
venues.detail.photos.retry            Réessayer
venues.detail.photos.dismiss          Retirer
venues.detail.photos.loadError        Impossible de charger les photos
venues.detail.photos.reorderError     Impossible de réordonner les photos
venues.detail.photos.summaryNone      Aucune photo
venues.detail.photos.summaryCount     {count} photos sur 10
venues.detail.photos.deleteDialog.title       Supprimer cette photo
venues.detail.photos.deleteDialog.description Elle sera retirée de la galerie et du marketplace.
venues.detail.photos.deleteDialog.coverNote   La photo suivante deviendra la couverture.
venues.detail.photos.deleteDialog.confirm     Supprimer
venues.detail.photos.deleteDialog.confirming  Suppression…
venues.detail.photos.deleteDialog.success     Photo supprimée
venues.detail.photos.deleteDialog.error       Impossible de supprimer la photo
```

`count` and `summaryCount` use ICU plural in both locales: fr `{count, plural, one {# photo} other {# photos}} sur 10 · La première est la couverture` / `{count, plural, one {# photo} other {# photos}} sur 10`; en `{count, plural, one {# photo} other {# photos}} of 10 · The first one is the cover` / `{count, plural, one {# photo} other {# photos}} of 10`. The table above shows the plural-free canvas text.

## 11. Testing

- Node tests: `checkFile`, `acceptFiles` (mixed types/sizes, free-slot overflow → `full`), `moveImage` (left/right at edges are no-ops, cover moves to index 0), `galleryErrorKind` (each backend message, `PutError`, non-ApiError), `putPresigned` with a fake XHR (progress events, 2xx resolve, 403 reject, network error reject, abort via signal, no `Authorization` header set).
- Gates: `pnpm check:design && pnpm typecheck && pnpm lint && pnpm test`, fr/en parity, prettier on changed files, `pnpm build` in a worktree.
- Final review: live CDP screenshots on the mock at 1440 and 390 against the seven frames, including a real multi-file upload with progress, a rejected type, an oversize file, a full gallery, reorder, cover change and delete.

## 12. Out of scope

Drag-and-drop reorder, captions, image cropping or resizing, a marketplace preview, upload resume across navigations, SP-E follow-ups, today snapshot (SP-G), MFA (SP-F).
