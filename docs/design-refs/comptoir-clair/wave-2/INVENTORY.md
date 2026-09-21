# Wave 2 — frame inventory

Written for engineers implementing the 34 frames without opening pen.dev. Source: `screens.pen` (canvas), PNG exports in this folder, and the brief `docs/design-briefs/2026-09-21-console-flows-and-actions.md`. All copy is verbatim French from the canvas text nodes.

## Table of contents

| Frame ID | Canvas name | Flow |
|---|---|---|
| TeQNq | Planning · Annuler la séance · Aperçu | 2 · Aperçu d'annulation |
| o9VUa3 | Planning · Annuler le cours · Aperçu | 2 · Aperçu d'annulation |
| UKoGk | Planning · Annuler la séance · Chargement | 2 · Aperçu d'annulation |
| zvJSN | Planning · Annuler la séance · Conflit 409 | 2 · Aperçu d'annulation |
| dAnIL | Planning · Annuler la séance · Déjà annulée et erreur | 2 · Aperçu d'annulation |
| a37vbD | Établissement · Fiche · Photos · Galerie | 1 · Photos (SP-D) |
| T518CJ | Établissement · Fiche · Photos · Vide | 1 · Photos (SP-D) |
| G1SDT | Établissement · Fiche · Photos · Téléversement et erreurs | 1 · Photos (SP-D) |
| l8Ww0 | Établissement · Fiche · Photos · Galerie pleine et menu | 1 · Photos (SP-D) |
| d4nlC8 | Établissement · Fiche · Photos · Supprimer la couverture | 1 · Photos (SP-D) |
| p96Uq | Établissements · Tuiles avec couverture | 1 · Photos (SP-D) |
| keCrj | Établissement · Photos · Mobile | 1 · Photos (SP-D) |
| e2wZj | MFA · Activer la double authentification | 3 · MFA |
| OKurh | MFA · Vérifier le code | 3 · MFA |
| PCsCv | MFA · Code invalide | 3 · MFA |
| S2ZUQo | MFA · Activée · Reconnexion | 3 · MFA |
| PmD8D | Auth · Connexion · Code de vérification | 3 · MFA |
| yuFyw | Auth · Connexion · Bannière MFA obligatoire | 3 · MFA |
| JAQ8S | Onboarding · Position sur la carte (facultatif) | 4 · Onboarding |
| S0vta | Onboarding · Erreurs (position, expiré, déjà staff) | 4 · Onboarding |
| m2ODiM | Auth · Créer un compte · Confirmation neutre | 4 · Onboarding |
| zwqdD | Membre · Ouvrir un établissement (conversion) | 4 · Onboarding |
| s8LRy3 | Tableau de bord · Planning du jour · états de séance | 5 · Aujourd'hui |
| D2YWBH | Tableau de bord · À régler | 5 · Aujourd'hui |
| r5BGk | Tableau de bord · À régler · Vide | 5 · Aujourd'hui |
| tMtOv | Participants · Membres et visiteurs pass | 6+7 · Participants / Intervenant |
| VM1jv | Participants · Vue coach (sans noms) | 6+7 · Participants / Intervenant |
| baN1L | Participants · Erreur d'ajout (complète) | 6+7 · Participants / Intervenant |
| kVC5I | Participants · Erreur d'ajout (déjà inscrit) | 6+7 · Participants / Intervenant |
| O4Q8d | Planning · Ajouter un cours · Intervenant non éligible | 6+7 · Participants / Intervenant |
| jmpCT | Établissement · Fiche · Position et règles | 8+9 · Établissement / Plans |
| gLNNi | Établissement · Ressource utilisée par des cours (409) | 8+9 · Établissement / Plans |
| zCLZV | Équipe · Verrouillée (plan Starter) | 8+9 · Établissement / Plans |
| p6hCM | Établissements · Ajout verrouillé + tooltip nav | 8+9 · Établissement / Plans |

---

## Flow 2 · Aperçu d'annulation

Baseline: `/schedules` (Planning), tabs « Séances » and « Cours récurrents ». All five frames update the existing plain confirm dialog for « Annuler la séance » / « Annuler le cours » with a preview-first flow (brief §2).

### TeQNq · Planning · Annuler la séance · Aperçu

**Scene**: `/schedules` → « Séances » tab, row menu « Annuler la séance » on the 06:30 Yoga session (today). Dialog shown loaded with preview data.
**New or changed surface**: Dialog, 520×642, radius 28, fill `#ffffff`, internal gap 24. Header (456×83, gap 8) + Body (456×403, gap 18: a caption then a key/value list `KV` 456×369) + Footer (456×44, gap 10). Each KV row is a 456-wide frame (63px tall for 1-line rows, 81px for 2-line rows), gap 16 between label block and value; label block itself has 3px gap between title and helper line.
**Copy**:
- Title: « Annuler la séance »
- Description: « Yoga du matin · Samedi 20 septembre · 06:30–07:30 · Salle A »
- Section caption: « Ce que l'annulation entraîne »
- Row 1 — « Réservations concernées » / helper « dont 11 membres · 3 visiteurs pass » / value « 14 »
- Row 2 — « E-mails envoyés automatiquement » / helper « Aux membres ayant une adresse ; un membre peut en recevoir plusieurs. » / value « 12 »
- Row 3 — « Crédits pass remboursés » / helper « Remboursés par la plateforme. » / value « 3 »
- Row 4 — « Crédits membres remboursés » / helper « Une annulation par l'équipe ne rembourse pas les crédits de séance des membres. » / value « 0 »
- Row 5 — « Inchangé » (helper-styled label, not ink) / helper « Les arrivées déjà enregistrées et les séances passées sont conservées. » / value « — »
- Footer buttons: ghost « Retour », destructive « Annuler la séance »
**Components used**: Dialog shell (28px radius, close `X` 36×36), ghost Button/Secondary (« Retour »), destructive Button (« Annuler la séance », pink/red tint), plain key/value row (no chip/badge component).
**States shown**: loaded/success preview (the default, fully-populated state).
**Notes**: the row title « Inchangé » and its value « — » are rendered in the muted grey (`#5f6368`) instead of ink `#1f1f1f`, unlike every other row — a deliberate "informational, non-actionable" treatment worth preserving in code.

### o9VUa3 · Planning · Annuler le cours · Aperçu

**Scene**: `/schedules` → « Cours récurrents » tab, row menu « Annuler le cours » on « Yoga du matin » (recurring course, Mon/Wed/Fri 06:30–07:30).
**New or changed surface**: Same dialog shell as TeQNq but shorter (520×604 vs 642 — one fewer helper-only row) and with an extra top row « Séances futures concernées » that TeQNq's session-level dialog doesn't have.
**Copy**:
- Title: « Annuler le cours »
- Description: « Yoga du matin · Toutes les semaines · Lun, Mer, Ven · 06:30–07:30 »
- Section caption: « Ce que l'annulation entraîne »
- Row 1 — « Séances futures concernées » / helper « À partir de demain. La séance d'aujourd'hui et les séances passées sont conservées. » / value « 23 »
- Row 2 — « Réservations concernées » / helper « dont 71 membres · 16 visiteurs pass » / value « 87 »
- Row 3 — « E-mails envoyés automatiquement » / value « 74 » (no helper line shown in this frame)
- Row 4 — « Crédits pass remboursés » / helper « Remboursés par la plateforme. » / value « 16 »
- Row 5 — « Crédits membres remboursés » / helper « Une annulation par l'équipe ne rembourse pas les crédits de séance des membres. » / value « 0 »
- Footer buttons: ghost « Retour », destructive « Annuler le cours »
**Components used**: same dialog shell, ghost + destructive buttons as TeQNq.
**States shown**: loaded/success preview for the course-level (cascading) cancellation.
**Notes**: this course-level preview has no final « Inchangé » row (unlike the session-level one) — likely intentional since "future sessions" already communicates scope, but confirm with design if the same reassurance line should appear here too. Also note row 3 (e-mails) has no helper text here while the equivalent row in TeQNq does — inconsistent, flag for copy pass.

### UKoGk · Planning · Annuler la séance · Chargement

**Scene**: `/schedules` → « Séances » tab, same dialog opening in its initial loading state, before the preview call resolves.
**New or changed surface**: Dialog 520×441 (shorter — no populated KV list yet). Body (456×202) = caption « Ce que l'annulation entraîne » + a 4-row skeleton block (456×168, each row 456×42: a `~220×14` bar for the label and a `32×14` bar for the value, both grey placeholder rectangles).
**Copy**: Title « Annuler la séance », description « Yoga du matin · Samedi 20 septembre · 06:30–07:30 · Salle A », caption « Ce que l'annulation entraîne ». Footer buttons present but visually disabled (ghost « Retour », destructive « Annuler la séance » at reduced opacity).
**Components used**: Dialog shell, skeleton/placeholder bars (no shimmer data available from canvas, static grey blocks), disabled destructive button.
**States shown**: loading (skeleton rows), confirm button disabled while loading.
**Notes**: none.

### zvJSN · Planning · Annuler la séance · Conflit 409

**Scene**: `/schedules` → « Séances » tab, same dialog after a confirm attempt returns 409 because bookings/arrivals changed since the preview was fetched.
**New or changed surface**: Adds a Notice banner at the top of the Body, 456×64, fill `#fbf1dc` (warm yellow tint), containing an icon + two-line message. Dialog grows to 520×604 to fit the notice above the refreshed KV list.
**Copy**:
- Notice: « Les réservations ont changé. Aperçu mis à jour — vérifiez avant de confirmer. »
- Title/description unchanged: « Annuler la séance » / « Yoga du matin · Samedi 20 septembre · 06:30–07:30 · Salle A »
- Caption: « Ce que l'annulation entraîne »
- Refreshed rows: « Réservations concernées » (helper « dont 12 membres · 3 visiteurs pass », value « 15 »), « E-mails envoyés automatiquement » (value « 13 »), « Crédits pass remboursés » (helper « Remboursés par la plateforme. », value « 3 »), « Crédits membres remboursés » (helper « Une annulation par l'équipe ne rembourse pas les crédits de séance des membres. », value « 0 »)
- Footer: ghost « Retour », destructive « Annuler la séance » (re-enabled, ready for a second confirm)
**Components used**: warning Notice banner (`#fbf1dc`), same dialog shell/buttons as TeQNq.
**States shown**: 409 conflict — preview auto-refreshed inline, user must re-confirm.
**Notes**: the brief (§2) calls this "inline notice", matching the yellow Notice component reused elsewhere (see Cross-frame observations). Numbers changed between the original preview (14/12/3/0) and the refreshed one (15/13/3/0), consistent with "réservations ont changé".

### dAnIL · Planning · Annuler la séance · Déjà annulée et erreur

**Scene**: `/schedules` → « Séances » tab. This single frame stacks two independent dialog variants for the same flow: (1) target already cancelled (19:30 Yoga du soir), and (2) preview failed to load (06:30 Yoga du matin).
**New or changed surface**:
- Dialog A "Déjà annulée": 480×281, Header 416×83, Body 416×42 (single info line, no icon banner tint visible — plain text), Footer with only one button.
- Dialog B "Erreur": 480×284, shorter Header 416×55 (title + compact one-line description, no full date/room), Err banner 416×73 fill `#fbe9e7` (red tint) containing an icon + message + inline « Réessayer » button (81×36), Footer 416×44 with ghost « Retour » + disabled destructive « Annuler la séance ».
**Copy**:
- Dialog A — Title « Annuler la séance », description « Yoga du soir · Samedi 20 septembre · 19:30–20:30 · Salle A », body « Cette séance est déjà annulée. », single button « Fermer ».
- Dialog B — Title « Annuler la séance », description « Yoga du matin · 06:30–07:30 », error line « Impossible de charger l'aperçu. », retry button « Réessayer », footer « Retour » + « Annuler la séance » (disabled).
**Components used**: Err banner (`#fbe9e7`, red/orange tint) with icon, ghost button, disabled destructive button, single-action dialog (Dialog A has no ghost/destructive pair, just « Fermer »).
**States shown**: blocking state (already cancelled, read-only single exit) and preview-load error (retry available, confirm disabled).
**Notes**: Dialog A's short description drops the room (« Yoga du soir · Samedi 20 septembre · 19:30–20:30 · Salle A » — actually room is included here) while Dialog B's description drops date and room entirely (« Yoga du matin · 06:30–07:30 » only) — inconsistent level of detail between the two error dialogs on the same frame, worth a copy pass. Also this frame packs two unrelated states into one canvas frame (unlike every other frame in this flow, which is one state each) — treat as two separate specs when implementing.

---

## Flow 1 · Photos de l'établissement (SP-D)

Baseline: `/venues/[id]` (Établissement · Fiche), new « Photos » section between « Profil » and « Activités »; cover also surfaces on `/venues` tiles. Brief §1. Max 10 photos, JPEG/PNG/WebP, 5 MB each, no captions, position 1 = cover.

### a37vbD · Établissement · Fiche · Photos · Galerie

**Scene**: `/venues/[id]`, right column, new « Photos » section populated with 7 of 10 photos.
**New or changed surface**: Section header (« Photos » + count line + « Ajouter des photos » button, 185×36) above a responsive grid: row 1 = 2 tiles at 242×170 (12px gap), rows 2–3 = 3 tiles at 159×112 (12px gap), all tiles radius 20, tinted placeholder fills (`#e9f3ee`, `#e8eefb`, pastel set). Cover tile carries a pill badge 85×23, radius 999, fill `#1f1f1f`, white text, positioned 12,12. Every tile has a 36×36 « ··· » menu button top-right. Empty add-tile (dashed look implied) is 159×112, radius 20, icon + « Ajouter » label, shown when fewer than 10 photos exist.
**Copy**:
- Section title « Photos », description « 7 photos sur 10 · La première est la couverture »
- Button « Ajouter des photos »
- Badge « Couverture »
- Add-tile label « Ajouter »
**Components used**: Button/Secondary or icon-button for « Ajouter des photos », per-tile overflow Menu (ref component, 36×36), Badge pill (dark, radius 999).
**States shown**: populated grid (7/10) with one add-tile remaining, cover badge on tile 1.
**Notes**: photo placeholders render as flat-icon/gradient tint rectangles (no real photography in the design file) — real thumbnails will replace the `Img` gradient rectangle fill.

### T518CJ · Établissement · Fiche · Photos · Vide

**Scene**: `/venues/[id]`, same section with zero photos uploaded.
**New or changed surface**: Empty-state panel replacing the grid, 502×297 (approx, within the 502×378 Photos block), centered: icon in a circular chip, title, description, primary button, and a repeated rules line below the button.
**Copy**:
- Section title « Photos », top description « Jusqu'à 10 photos · JPEG, PNG ou WebP · 5 Mo max »
- Empty title: « Aucune photo pour l'instant »
- Empty description: « Montrez votre établissement aux membres et sur le marketplace. La première photo devient la couverture. »
- Button: « Ajouter des photos » (larger, 202×44, primary/dark)
- Rules repeated below button: « Jusqu'à 10 photos · JPEG, PNG ou WebP · 5 Mo max »
**Components used**: primary dark Button (the one dark control on this state), circular icon chip, no menu/badges (nothing to act on yet).
**States shown**: empty state.
**Notes**: the rules line appears twice (top-of-section description and again under the empty-state button) — intentional redundancy per brief §1 ("empty (invitation + rules line …)").

### G1SDT · Établissement · Fiche · Photos · Téléversement et erreurs

**Scene**: `/venues/[id]`, Photos section mid-upload: 5 existing photos plus 3 tiles in transient/error states (8 tiles total across the 3-row grid).
**New or changed surface**: Two uploading tiles show a determinate progress bar (label « 62 % » / « 18 % » over a track, tile fill still pastel, no thumbnail yet). Three tiles show an inline error: icon + 1–2 line message inside the 159×112 tile, tinted `#fbe9e7` (red), plus a « Réessayer » button (81×36) on the tile with a recoverable error.
**Copy**:
- Progress tiles: « 62 % », « 18 % » (no other text — just percentage over a bar)
- Error tile 1: « Fichier trop lourd (max 5 Mo) » (no retry — this file was rejected client-side pre-upload)
- Error tile 2: « Format non accepté » (no retry — client-side rejection)
- Error tile 3: « Téléversement interrompu » + button « Réessayer » (server/network failure, recoverable)
**Components used**: Progress bar (determinate, in-tile), Err tile treatment (`#fbe9e7`, icon + text), Button (small, « Réessayer », 81×36).
**States shown**: uploading (2 tiles, different %), per-tile error — both client-rejected (no retry) and interrupted-upload (retry) variants.
**Notes**: brief §1 step 5 lists « Téléversement interrompu, réessayer » as the only retryable error; the two client-side rejections (« Format non accepté », « Fichier trop lourd ») correctly have no retry control here, matching "client-side check … before anything is sent."

### l8Ww0 · Établissement · Fiche · Photos · Galerie pleine et menu (1440×1500)

**Scene**: `/venues/[id]`, Photos section completely full (10/10), with the per-tile « ··· » menu open on tile 2 showing its actions.
**New or changed surface**: Dropdown menu, 250×173, 4 text items with icons (row height ~43px each, consistent with a standard menu component). Below the grid, a full-gallery notice line (no button box, just inline text with icon).
**Copy**:
- Section description: « 10 photos sur 10 · La première est la couverture »
- Menu items (top to bottom): « Définir comme couverture », « Déplacer à gauche », « Déplacer à droite », « Supprimer » (destructive/red styling implied for last item)
- Full-gallery notice: « Galerie pleine (10/10). Supprimez une photo pour en ajouter une autre. »
**Components used**: Dropdown/Menu component (250×173, 4 items), disabled/hidden « Ajouter des photos » button implied by brief (§1: "add control disabled").
**States shown**: full gallery (10/10), open contextual menu on a non-cover tile.
**Notes**: brief specifies the add control should show disabled + « 10 photos sur 10 » — the canvas frame shows the notice line under the grid instead of literally disabling the header button's label; the header "Ajouter des photos" button itself wasn't captured as disabled in this text/geometry pass — verify visually against the PNG (button appears present but should be treated as disabled per brief).

### d4nlC8 · Établissement · Fiche · Photos · Supprimer la couverture

**Scene**: `/venues/[id]`, Photos section (7/10), delete-confirmation dialog open for the cover tile specifically.
**New or changed surface**: Confirmation dialog, 480×323, radius 28. Includes a small 120×84 thumbnail preview of the photo being deleted, with its « Couverture » badge still shown, so the user sees exactly what they're removing. Footer: ghost « Annuler » + destructive « Supprimer ».
**Copy**:
- Title: « Supprimer cette photo »
- Description: « Elle sera retirée de la galerie et du marketplace. La photo suivante deviendra la couverture. »
- Preview badge: « Couverture »
- Footer: « Annuler » / « Supprimer »
**Components used**: Dialog shell (28px radius), destructive Button, ghost Button, thumbnail preview with badge.
**States shown**: delete confirmation for the cover photo (the "cover will move" variant called out in brief §1 Flow C).
**Notes**: brief specifies plain non-cover delete copy has no second sentence; this frame is the cover-specific variant (480×323, taller than the presumed ~480×281 plain variant used in Dialog A of dAnIL, which is a different flow's dialog of the same size — worth double-checking a plain "delete non-cover photo" dialog frame exists somewhere, since it's not separately called out among the 34).

### p96Uq · Établissements · Tuiles avec couverture

**Scene**: `/venues` (Établissements list), tile grid — verifies cover photo now surfaces on venue tiles.
**New or changed surface**: Each venue card's icon placeholder area is replaced by (or coexists with) the venue's cover-tinted background; no explicit "Couverture" badge here (that's gallery-only). Cards: « Studio Dakar Plateau » (Actif, tinted green), « Studio Almadies » (Actif, tinted blue), « Bassin de Ngor » (Inactif, grey/no-photo icon with a slashed-image icon).
**Copy**: card titles/subtitles unchanged from baseline (« Studio Dakar Plateau » / « Yoga · Dakar », etc.) — no new copy introduced, this frame is purely a visual-state check.
**Components used**: existing venue Tile/Card component, status Badge (« Actif » / « Inactif »).
**States shown**: tile with cover photo tint (active venues), tile with no photo — shown as a distinct "no image" icon (slashed picture) rather than the default building icon used elsewhere, on the inactive venue.
**Notes**: the "no photo" treatment on « Bassin de Ngor » uses a different icon (crossed-out image) than the generic building glyph seen on other baseline screens — confirm whether that's intentional (means "inactive, no cover") or an artifact of this being an Inactif card specifically rather than a "no photo yet" state.

### keCrj · Établissement · Photos · Mobile (390×844)

**Scene**: mobile viewport of the Photos section (own screen/route in the canvas, presumably a drill-in from `/venues/[id]` on small screens), 5 photos shown.
**New or changed surface**: Top bar with back chevron (36×36) + venue name. Full-bleed content: header (title « Photos » + description), full-width « Ajouter des photos » button (358×48), then a 2-column grid of 174×130 tiles (was 3-column on desktop), each with a 44×44 semi-transparent white menu button (`#ffffffcc`) — bigger than desktop's 36×36 to hit the 44px touch target rule.
**Copy**: « Photos », « 5 photos sur 10 · La première est la couverture », button « Ajouter des photos », badge « Couverture ».
**Components used**: full-width primary Button, 2-col tile grid, 44×44 touch-friendly Menu button (translucent white background over photo).
**States shown**: populated grid, two columns, cover badge on tile 1.
**Notes**: correctly follows DESIGN.md's "44px targets below `md`" rule — menu buttons are 44×44 here vs 36×36 on the desktop frame (a37vbD/l8Ww0/G1SDT). No add-tile shown in this crop (grid ends at 5 photos, page may scroll for the add tile — not fully visible in the frame's fixed height).

---

## Cross-frame observations

- **Shared dialog shell**: every confirm/preview dialog in Flow 2 (and the delete dialogs in Flow 1) uses the same shape language — radius 28, white fill, Header (title 24/500 + grey description 15) → Body → Footer with a ghost « Retour »/« Annuler » left and a destructive pill right. Implement this once as a `ConfirmDialog` primitive with slots for body content (KV list, skeleton, notice, or plain text) rather than one-off dialogs per frame.
- **Shared error-line style**: both the 409 conflict (zvJSN) and the two "already cancelled / load failed" dialogs (dAnIL) reuse a tinted banner-with-icon pattern — warning uses `#fbf1dc` (yellow), error uses `#fbe9e7` (red/pink). The same red tint (`#fbe9e7`) is reused for per-tile upload errors in G1SDT. This is one `Notice`/`Err` component family with a warning and a danger variant — keep them as one component with a `variant` prop, not two.
- **Shared "Réessayer" retry pattern**: appears identically in the per-tile upload error (G1SDT) and the preview-load error (dAnIL) — small inline button next to/under the error text, only shown for recoverable (server-side) errors, never for client-side validation rejections.
- **Cover badge**: identical dark pill (`#1f1f1f`, radius 999, white 13px text, ~85×23, inset 12px from the tile's top-left) reused unchanged across a37vbD, l8Ww0, d4nlC8's preview, and keCrj (mobile) — a single `Badge/Cover` component.
- **Menu button sizing inconsistency (by design)**: 36×36 on desktop tiles, 44×44 on the mobile tiles — intentional per DESIGN.md's 44px-below-`md` rule, not a bug, but flag it in the component so it isn't hardcoded to one size.
- **Copy inconsistency**: the "e-mails envoyés" row has a helper line in TeQNq/zvJSN but not in o9VUa3 (course-level); the "Inchangé" reassurance row exists in the session-level cancel (TeQNq) but not the course-level one (o9VUa3); dAnIL's two stacked error dialogs use different levels of description detail. All three are candidates for a copy-consistency pass before implementation.
- **Frame l8Ww0's disabled add-control**: brief §1 calls for the add button to visibly disable at 10/10, but the canvas capture didn't show an explicit disabled visual state on the header button — verify against design before treating the button as always-enabled.

---

## Flow 3 · Double authentification (TOTP)

Baseline: `/login` (auth column, 400px `AuthCard`) plus new standalone MFA screens outside the card system. Brief §3. Applies to owner/admin only. All six frames share the same page chrome: full-bleed white page with a radial `#dfe8fa` wash ellipse (800×640) top-of-viewport, centered `Wordmark` (129×24), and a form column.

### e2wZj · MFA · Activer la double authentification

**Scene**: new standalone screen, reached right after first login/password-set for an owner/admin without MFA (brief Flow A step 2, and the Flow C gate target).
**New or changed surface**: Wider form column than the login card — 440px (vs the 400px `AuthCard` used elsewhere in this flow). QR box 240×240, radius 24, white fill, containing a 200×200 QR image. Below it, a labeled secret-key field (440×72: label + a 440×48 monospace key input with a copy icon button). Primary button full-width (440×52).
**Copy**:
- Title: « Activer la double authentification »
- Description: « Obligatoire pour les propriétaires et administrateurs. Scannez ce code avec une application d'authentification (Google Authenticator, 1Password, Authy…). »
- Secret label: « Ou saisissez la clé manuellement »
- Secret value (sample): « JBSW Y3DP EHPK 3PXP  QMFR G3PZ 2ZKQ »
- Button: « Continuer »
- Footer: « Vous devrez saisir un code à 6 chiffres à chaque connexion. »
**Components used**: QR display box (24px radius), monospace secret Input with copy-icon Button, full-width primary Button, no OTP field yet on this screen.
**States shown**: default enrolment explainer (single state, no error/loading variant in this frame).
**Notes**: this is the only screen in the flow using a 440px form width instead of 400px — intentional to fit the QR box, but confirm the wider `AuthCard` variant is deliberate and not a stray override.

### OKurh · MFA · Vérifier le code

**Scene**: same standalone enrolment flow, step 2 (brief Flow A step 3) — 6-digit OTP entry after scanning the QR, mid-entry (2 of 6 digits filled: "4", "8").
**New or changed surface**: OTP input — 6 boxes, 352×56 total, each box 52×56, radius 16, white fill, filled boxes show a centered digit (22px/500), unfilled are empty with a subtle border (current box in this state, box 3, shows a focus ring). Below: full-width « Vérifier » (440×52) and a text-link back-affordance with a left chevron icon.
**Copy**:
- Title: « Vérifier le code »
- Description: « Entrez le code à 6 chiffres affiché par votre application. »
- Button: « Vérifier »
- Back link: « Revenir au code QR »
**Components used**: Input/OTP (6-cell), primary Button, icon+text ghost link.
**States shown**: mid-entry / default (no error).
**Notes**: none.

### PCsCv · MFA · Code invalide

**Scene**: same OTP screen, all 6 digits entered ("482913"), submitted and rejected.
**New or changed surface**: Same OTP component but every cell now has a red/error border (matches the code being fully entered and invalid), plus an inline error line under the OTP row with a warning icon. The back-link ("Revenir au code QR") present in OKurh is absent here in this state.
**Copy**:
- Title/description unchanged: « Vérifier le code » / « Entrez le code à 6 chiffres affiché par votre application. »
- Error line: « Code invalide. Vérifiez l'heure de votre téléphone et réessayez. »
- Button: « Vérifier » (still enabled, presumably to resubmit after correction)
**Components used**: Input/OTP in its error variant (red border on all 6 cells), inline error line with icon, primary Button.
**States shown**: invalid code / error.
**Notes**: brief §3 Flow A step 3 also calls for a distinct « Code expiré, entrez le suivant » message — no separate frame renders that copy; only "Code invalide" (with a time-sync hint) is drawn. Treat "expired" as the same error-line component with different copy, not a new layout.

### S2ZUQo · MFA · Activée · Reconnexion

**Scene**: interstitial after successful enrolment finalization (brief Flow A step 4) — informs the user that all sessions were revoked and a fresh login is required.
**New or changed surface**: Centered icon chip (circular, pale green, shield-check glyph) above a title/description pair, then a single full-width primary button. No form fields at all — purely informational.
**Copy**:
- Title: « Double authentification activée »
- Description: « Pour votre sécurité, toutes vos sessions ont été fermées. Reconnectez-vous avec votre mot de passe et un code de votre application. »
- Button: « Se reconnecter »
**Components used**: success icon chip (green tint), full-width primary Button — no ghost/secondary action (this sign-out is mandatory, matching brief: "not a bug").
**States shown**: single success/interstitial state.
**Notes**: none — matches brief exactly.

### PmD8D · Auth · Connexion · Code de vérification

**Scene**: `/login`, the new step inserted after password entry on every subsequent login for an MFA-enrolled owner/admin (brief Flow B).
**New or changed surface**: Form column back to 400px (the standard `AuthCard` width). New "Who" chip above the OTP row: 240×40, pill (radius 999), pale grey (`#fafafa`) fill, containing a 24×24 avatar + the account's e-mail — confirms which account is completing the challenge. Same 6-cell OTP component (352×56) as OKurh/PCsCv. Below the button, a support-escalation link plus a persistent helper line (both shown at once, not one-or-other).
**Copy**:
- Title: « Code de vérification »
- Description: « Entrez le code à 6 chiffres de votre application d'authentification. »
- Account chip: « moussa@studioplateau.sn » (with "MD" avatar initials)
- Button: « Vérifier »
- Link: « Je n'ai plus accès à mon application »
- Footer: « Sans accès à votre application, contactez le support : la réinitialisation n'est pas en libre-service. »
**Components used**: pill-shaped account/identity chip (`Who`), Input/OTP, primary Button, text link, footer helper line.
**States shown**: default challenge state (no error variant drawn for this specific frame — reuse PCsCv's error treatment).
**Notes**: brief §3 Flow B says the "no self-service reset" link goes to contact support — here it's rendered as both a clickable link ("Je n'ai plus accès à mon application") AND a static footer sentence repeating the same "contact support" idea; confirm the link should open a support channel (mailto/URL) versus the footer line just being static reassurance text, since both saying near-identical things below the button reads redundant.

### yuFyw · Auth · Connexion · Bannière MFA obligatoire

**Scene**: `/login`, gate variant (brief Flow C) — an owner/admin without MFA enrolled sees this banner above the normal login form before being routed to `e2wZj` after authenticating.
**New or changed surface**: New Banner block prepended above the existing login form, 400×104, radius 16, fill `#e8eefb` (light blue), icon + text both in a deep blue ink (`#2c4f8a`) rather than the usual grey/black — a distinct "informational" tint not used elsewhere in this set.
**Copy**:
- Banner: « La double authentification est désormais obligatoire pour les propriétaires et administrateurs. Vous l'activerez juste après la connexion. »
- Title: « Bon retour » (baseline, unchanged)
- Description: « Connectez-vous pour accéder à votre espace. » (baseline, unchanged)
- Footer: « Besoin d'aide ? Contactez la personne qui vous a donné accès. » (baseline, unchanged)
**Components used**: new info Banner (`#e8eefb` fill, `#2c4f8a` text/icon — distinct from the yellow/red Notice–Err family used in Flows 1–2), otherwise the standard login form (E-mail, Mot de passe, « Se connecter »).
**States shown**: gate/informational banner prepended to the standard login form.
**Notes**: this banner introduces a third tint (blue, informational) alongside the yellow (warning) and red (error) tints seen in Flow 1–2 — a three-tint Notice family should be planned as one component with `info`/`warning`/`danger` variants (see Cross-flow observations, updated below).

---

## Cross-flow observations (Flows 1–3)

- **Notice/Banner is a three-variant family, not two**: `info` (`#e8eefb` fill, `#2c4f8a` text — yuFyw's MFA gate banner) joins the `warning` (`#fbf1dc` — zvJSN's 409 conflict) and `danger` (`#fbe9e7` — dAnIL, G1SDT) tints already noted for Flow 1–2. Build one `Notice` component with three variants rather than bespoke banners per screen.
- **Input/OTP is fully shared**: identical 6×(52×56, radius 16) cell component appears unchanged across OKurh, PCsCv, and PmD8D, with only a border-color swap (default/focus/error) and an optional identity chip above it (PmD8D only). Build this once with `state: default | focus | error` rather than per-screen markup.
- **Auth column width inconsistency**: the enrolment explainer (e2wZj) uses a 440px form column while every other auth-flow screen in this set (OKurh, PCsCv, S2ZUQo, PmD8D, yuFyw) uses 400px, matching the brief's "reuse the auth column (400px) and `AuthCard`" instruction. Confirm whether e2wZj's wider column is an intentional one-off (to fit the 240px QR box comfortably) or should be reconciled to 400px.
- **"Code expiré" has no dedicated frame**: brief §3 asks for both « Code invalide » and « Code expiré, entrez le suivant » inline errors; only the former is drawn (PCsCv). Implement both as copy variants of the same error-state OTP component.

---

## Flow 4 · Onboarding gate and member conversion

Baseline: `/onboarding` (« Créer mon établissement », `tZ9zj`), plus a new member-facing entry point. Brief §4. Same auth-column chrome (wash ellipse, centered Wordmark) as Flow 3.

### JAQ8S · Onboarding · Position sur la carte (facultatif)

**Scene**: `/onboarding` form, existing fields (Nom, Type, Ville, Pays, Fuseau horaire, Téléphone, Adresse) plus the new optional map-position fields, default/happy-path state.
**New or changed surface**: Wider form column (620px, matching the existing onboarding card, not the 400/440px auth screens). New « Position sur la carte (facultatif) » row: two side-by-side inputs (Latitude, Longitude), 620×116 block including a helper line below.
**Copy**:
- Title: « Bienvenue sur IziWellPass », description « Créez votre établissement en une minute et commencez à gérer vos membres. »
- New field labels: « Position sur la carte (facultatif) », placeholders/values « Latitude · 14.6937 », « Longitude · −17.4441 »
- Helper: « Rend l'établissement trouvable dans la recherche « autour de moi ». Les deux valeurs vont ensemble. »
- Button: « Créer mon établissement »
- Footer: « Votre organisation et votre établissement sont créés instantanément. »
**Components used**: paired Input row (Latitude/Longitude), full-width primary Button, standard text Input/Select for the rest of the form (unchanged from baseline).
**States shown**: default, both position fields filled (happy path).
**Notes**: latitude/longitude are shown pre-filled with a middle-dot-separated label+value in the same field (« Latitude · 14.6937 ») rather than a separate floating label — confirm this is the intended input pattern (label baked into the value display) versus a placeholder that disappears on focus.

### S0vta · Onboarding · Erreurs (position, expiré, déjà staff) (1440×1000)

**Scene**: same onboarding form stacking three error/edge states at once: expired eligibility window, "already staff", and invalid lat/long pairing.
**New or changed surface**: Two stacked Alert banners above the form fields — « Alert expired » (620×64, `#fbf1dc` warning tint, radius 16) and « Alert staff » (620×94, `#fbe9e7` danger tint, radius 16, with an inline action link). Below, the Latitude/Longitude row shows a red-bordered error variant with a validation line underneath.
**Copy**:
- Expired alert: « Votre inscription a expiré (fenêtre de 10 minutes). Renvoyez le formulaire pour continuer. »
- Already-staff alert: « Ce compte gère déjà un établissement. Connectez-vous à la console pour en ajouter un autre. » + inline link « Ouvrir la console »
- Position error line: « Latitude et longitude vont ensemble : renseignez les deux ou aucune. » (shown when only Latitude is filled: value « Latitude · 14.6937 », Longitude left empty with red border)
- Title/description/button/footer unchanged from JAQ8S baseline.
**Components used**: warning Notice (`#fbf1dc`), danger Notice with inline link action (`#fbe9e7`), Input error state (red border + helper line).
**States shown**: eligibility-expired error, already-staff blocking error, and invalid-position validation error — all three stacked in one frame for reference (not simultaneous in a real session).
**Notes**: this frame intentionally combines 3 independent error states into one canvas for compactness — when implementing, treat each Alert/error as conditionally rendered on its own trigger, not as a fixed always-three-banners layout. The "already staff" case reads as a hard stop (brief doesn't specify if the form below should still be interactable) — recommend disabling the form fields when this alert is showing, since submission cannot possibly succeed.

### m2ODiM · Auth · Créer un compte · Confirmation neutre

**Scene**: new public "register" screen confirmation state (brief §4 Flow — new owner step 1), shown after submitting an e-mail — enumeration-safe, always the same message regardless of whether the address exists.
**New or changed surface**: Centered icon chip (circular, pale lavender/blue, envelope glyph) + title/description + single primary button, 440px form column — same interstitial pattern as `S2ZUQo` (MFA activated).
**Copy**:
- Title: « Vérifiez votre boîte mail »
- Description: « Si cette adresse est nouvelle, un e-mail vient d'être envoyé avec un mot de passe provisoire. Il est valable pour une première connexion. »
- Button: « Se connecter »
- Footer: « Le message est le même quelle que soit l'adresse : c'est volontaire. »
**Components used**: icon chip (info/neutral tint), full-width primary Button — no ghost/secondary action.
**States shown**: single neutral confirmation state (deliberately identical for new vs. existing e-mail, per brief's enumeration-safety requirement).
**Notes**: the footer line explicitly documents the enumeration-safety intent for whoever reads the screen (« c'est volontaire ») — unusual to state design intent as user-facing copy; confirm this footer is meant to ship to real users (it reads more like a QA/reviewer note than end-user copy, but it's a real text node in the canvas, not an annotation layer).

### zwqdD · Membre · Ouvrir un établissement (conversion)

**Scene**: new member-facing entry point (brief §4 "member becomes owner" flow) — a logged-in member sees this landing screen with a 3-step explainer before starting the conversion.
**New or changed surface**: 440px form column with a numbered/checked step list (3 rows, 440×64 each: an icon/number badge + title + helper line), a primary button, and a secondary escape link.
**Copy**:
- Title: « Ouvrir un établissement »
- Description: « Vous gardez votre carte de membre et vos réservations. Vous obtiendrez en plus la console de gestion. »
- Step 1 (shown already completed — check mark, dark filled badge): « Activer la double authentification » / « Obligatoire pour gérer un établissement. »
- Step 2 (numbered "2"): « Vous reconnecter » / « Vos sessions actuelles seront fermées. »
- Step 3 (numbered "3"): « Décrire votre établissement » / « Nom, type, ville, fuseau horaire. »
- Button: « Commencer »
- Escape link: « Rester membre pour l'instant »
**Components used**: numbered Step list (with a completed/checked variant for step 1 vs. numbered-circle for pending steps 2–3), full-width primary Button, text link (secondary/ghost action, no button chrome).
**States shown**: step 1 pre-completed (implying MFA was already done, or this is shown to a member who is mid-conversion) — a single default state.
**Notes**: step 1 being shown as already-checked is worth double-checking — brief §4 says MFA enrolment (section 3) happens as part of this flow "if not done", so a fresh member landing on this screen for the first time should probably see step 1 as pending (numbered "1"), not pre-checked. This may be a template/placeholder artifact in the canvas rather than an intentional "returning user" state.

---

## Cross-flow observations (Flows 1–4)

- **Interstitial pattern reused three times**: `S2ZUQo` (MFA activated), `m2ODiM` (check your e-mail), and conceptually `zwqdD`'s step-list intro all use the same "centered icon chip + title + description + single full-width button" shape on a 440px column. Worth formalizing as one `AuthInterstitial` template (icon chip + copy + single CTA, no secondary action) versus the two-CTA `AuthCard` (form + primary + link) used by login/onboarding screens.
- **Alert/Notice tint reuse confirmed across flows**: `S0vta`'s expired-eligibility alert reuses the exact `#fbf1dc` warning tint from `zvJSN` (Flow 2's 409 conflict), and its already-staff alert reuses the `#fbe9e7` danger tint from `dAnIL`/`G1SDT` (Flow 1) and now also carries an inline text-link action, a variant not seen in Flows 1–2's Notice usage — the shared component needs to support an optional trailing link/action slot.
- **Form column widths vary by screen role, not consistently**: 620px for full data-entry forms (onboarding `JAQ8S`/`S0vta`), 440px for lighter forms/interstitials (`zwqdD`, `m2ODiM`, most of Flow 3), 400px for the standard login `AuthCard` (`PmD8D`, `yuFyw`). This is a legitimate three-tier system (heavy form / light form / login) rather than an inconsistency, but should be codified as named tokens (e.g. `form-wide`, `form-medium`, `auth-card`) so engineers don't invent a fourth width.

---

## Flow 5 · Aujourd'hui — dashboard day snapshot

Baseline: `/dashboard` (Tableau de bord). Brief §5. Same hero (date line + "Bonjour, Moussa" + command bar) and Stats strip (Passages aujourd'hui / Membres uniques / Occupation / Membres actifs) across all three frames — unchanged from baseline, not repeated in the copy lists below.

### s8LRy3 · Tableau de bord · Planning du jour · états de séance

**Scene**: `/dashboard`, « Planning du jour » tab, showing a date control (Aujourd'hui / Demain / Choisir une date) and a 4-tile grid demonstrating every session lifecycle tint in one row.
**New or changed surface**: Grid of 223×220 tiles, each background-tinted by lifecycle: **upcoming** default tint `#fafafa` (Yoga du matin, but see Notes — this tile is actually shown as "Terminée"), **active** `#e9f3ee` green tint with badge « En cours » (Pilates), **needs-attention** `#e8eefb` blue tint with badge « À régler » plus a reason line (Stretching midi), and a plain `#e8eefb` tint with no badge for a session that has bookings but starts later (Boxe). Each tile: time (22px/500) + lifecycle Badge top row, then title (16px/600), room · intervenant line, and a capacity line/bar.
**Copy**:
- Section link: « Voir les 5 séances du jour → »
- Date control: « Aujourd'hui », « Demain », « Choisir une date »
- Tile 1 — time « 06:30 », badge « Terminée », title « Yoga du matin », meta « Salle A · Aïssatou Ba », stats « 14 arrivés · 14 inscrits · 18 places »
- Tile 2 — time « 08:00 », badge « En cours », title « Pilates », meta « Salle B · Aïssatou Ba », stats « 9 arrivés · 12 inscrits · 12 places »
- Tile 3 — time « 12:15 », badge « À régler », title « Stretching midi », meta « Salle A · Aucun intervenant », stats « 0 arrivés · 6 inscrits · 16 places », reason line « Aucun intervenant »
- Tile 4 — time « 18:00 », no badge, title « Boxe », meta « Ring · Cheikh Fall », stats « 0 arrivés · 17 inscrits · 18 places »
**Components used**: lifecycle Badge (« Terminée » grey/muted, « En cours » green, « À régler » amber/blue), capacity bar/line, date-range Tabs (Aujourd'hui/Demain/Choisir une date).
**States shown**: completed (« Terminée », muted background per brief "atténué"), active (« En cours », accent tint), needs-attention with a specific reason (« Aucun intervenant »), and a plain upcoming tile with no badge.
**Notes**: brief §5 describes 4 lifecycle states as upcoming / active / completed / cancelled, but this frame shows Terminée, En cours, À régler (a `needs_attention` reason, not a lifecycle state per se) and a plain upcoming tile — **cancelled is not represented in this frame at all**, so its "atténué"/greyed treatment and "never flagged" rule from the brief has no visual reference; check whether a 5th tile or separate frame should exist. Also the completed tile ("Terminée") oddly still shows a fully-filled black capacity bar (14/14/18) rather than a visually "atténué" (dimmed) treatment the brief calls for.

### D2YWBH · Tableau de bord · À régler

**Scene**: `/dashboard`, « À régler (3) » tab selected, listing the day's three flagged sessions as rows (not tiles).
**New or changed surface**: Row list inside a 720×204 panel, 3 rows (Pilates 72px tall, Stretching midi/Boxe 66px each), each row: time, title + inline status Badge (only on the "En cours" row), room, a reason Badge (amber pill), and a quick-action button — either « Voir les participants » or, for the missing-instructor row, « Modifier le cours ».
**Copy**:
- Tab label: « À régler (3) »
- Row 1 — « 08:00 », « Pilates » + badge « En cours », « Salle B », reason badge « Personne n'est arrivé », action « Voir les participants »
- Row 2 — « 12:15 », « Stretching midi », « Salle A », reason badge « Aucun intervenant », action « Modifier le cours »
- Row 3 — « 18:00 », « Boxe », « Ring », reason badge « Au-delà de la capacité · 20/18 », action « Voir les participants »
**Components used**: reason Badge (amber, one of three copy variants), row-level quick-action Button (secondary/outline pill), status Badge (« En cours »).
**States shown**: all three `needs_attention` reasons from brief §5 represented at once: no-arrivals, no-instructor, over-capacity.
**Notes**: matches brief §5 copy exactly (« Personne n'est arrivé », « Au-delà de la capacité », « Aucun intervenant »), including the capacity detail suffix « · 20/18 » not explicitly spelled out in the brief text but consistent with its intent.

### r5BGk · Tableau de bord · À régler · Vide

**Scene**: `/dashboard`, « À régler » tab with zero flagged sessions.
**New or changed surface**: Centered empty state replacing the row list: icon chip (pale green, check-circle glyph) + title + description, no button (nothing to act on).
**Copy**:
- Tab label: « À régler » (no count badge when zero)
- Title: « Rien à régler pour l'instant. »
- Description: « Les séances sans arrivée, au-delà de la capacité ou sans intervenant apparaîtront ici. »
**Components used**: success/neutral icon chip (green, check-circle), no action buttons.
**States shown**: empty state.
**Notes**: the description usefully enumerates all three trigger reasons for engineers/QA — good source copy to mirror in code comments or tests. The tab count badge disappears entirely at zero (« À régler » not « À régler (0) ») — confirm this is the intended treatment vs. always showing a count.

---

## Cross-flow observations (Flows 1–5)

- **Reason/status Badge is one component with several color variants**: « Terminée » (muted/grey), « En cours » (green), « À régler » and the three specific reason badges (amber) in Flows 5 all share the same pill shape (radius, height, padding) as the planning-list status badges (« Disponible », « Complet », « Annulée ») seen in the Flow 2 background screens — one `Badge` component, tint driven by semantic status, not per-screen bespoke pills.
- **Empty-state template repeats a fourth time**: `r5BGk` (À régler vide) reuses the same "icon chip + title + description, no CTA" shape as `T518CJ`'s (Photos vide) empty state, except `T518CJ` does add a CTA button (« Ajouter des photos ») since there's an action to take, while `r5BGk` has none (nothing the user can do to force sessions to need attention). One `EmptyState` component with an optional action slot covers both.
- **`needs_attention` reason badges duplicate across two frames with slightly different framing**: `s8LRy3`'s tile shows the reason as a plain text line under the stats ("Aucun intervenant", no pill), while `D2YWBH`'s row list shows the same reason as a pill Badge. Confirm whether the dashboard tile's reason should also be pill-badged for visual consistency with the À régler list, or if the plain-text treatment in the tile is intentional (less visual weight for a glanceable tile vs. an actionable list row).

---

## Flows 6+7 · Participants d'une séance / Intervenant

Baseline: participants sheet (`skmEM`) opened from `/schedules`, and « Ajouter un cours » / « Modifier le cours » dialog (`jFogY`). Brief §6–7. The planning list behind the sheet/dialog is unchanged baseline in every frame below and is not repeated in the copy lists.

### tMtOv · Participants · Membres et visiteurs pass

**Scene**: `/schedules`, participants side sheet open for « Yoga du matin » (Aujourd'hui · Salle A, 06:30–07:30, 14/18 inscrits) — the owner/admin/receptionist view with full names and arrival detail.
**New or changed surface**: Sheet 460×1100 (full-height right panel, not a centered dialog). Row height 60px (66px when a two-line arrival-detail is shown). Each row: 36×36 avatar (tinted, pass rows use a distinct icon avatar `#eceef2` with a ticket/pass glyph instead of initials), name + optional grey arrival-detail sub-line, and a trailing status Badge or a Badge+« Valider » button pair for unconfirmed rows.
**Copy**:
- Header: « Aujourd'hui · Salle A », title « Yoga du matin », meta « 06:30–07:30 · 14/18 inscrits »
- Search placeholder: « Ajouter un participant »
- Row 1 — « Awa Ndiaye », « Arrivée 06:28 · QR », badge « Enregistré »
- Row 2 — « Visiteur pass » + chip « Pass », « Arrivé 06:31 · QR », badge « Enregistré »
- Row 3 — « Moussa Ndour », badge « Confirmé » + button « Valider »
- Row 4 — « Visiteur pass » + chip « Pass », badge « Confirmé » + button « Valider »
- Row 5 — « Fatou Ndao », « Arrivée 06:35 · manuel », badge « Enregistré »
- Row 6 — « Ousmane Kane », badge « Absent »
- Row 7 — « Babacar Dieng », badge « Annulé »
**Components used**: side Sheet (460px, full height), avatar (initials or pass-glyph icon, tinted per row), status Badge (« Enregistré » green, « Confirmé » blue/neutral, « Absent » amber, « Annulé » grey/muted), small « Valider » action Button (79×36), pass Chip (« Pass », inline next to the "Visiteur pass" label).
**States shown**: every roster status side by side: checked-in via QR, checked-in manually, confirmed-not-arrived (with a Valider action), absent, cancelled — plus the member/pass-holder distinction.
**Notes**: matches brief §6 exactly (arrival detail format « Arrivé(e) HH:MM · QR/manuel », distinct pass avatar+badge, never-named pass holders). Note grammatical gender agreement in arrival text: « Arrivée » (feminine, Awa/Fatou) vs « Arrivé » (masculine/neutral, Visiteur pass) — confirm this is driven by member gender data and not hardcoded.

### VM1jv · Participants · Vue coach (sans noms)

**Scene**: same sheet/session, but viewed as a trainer (no `member:read` on names) — brief §6 "Trainer view: rows without names".
**New or changed surface**: Adds a small mode-indicator Chip below the sheet header: « Vue coach · noms masqués ». Every member row's name is replaced by « Membre n° XXXX » (a short id), while pass-holder rows still read « Visiteur pass » (already anonymous) — arrival detail and status badges remain visible per brief.
**Copy**:
- Mode chip: « Vue coach · noms masqués »
- Rows: « Membre n° 4821 » (Enregistré, Arrivée 06:28 · QR), « Visiteur pass » (Enregistré, Arrivé 06:31 · QR), « Membre n° 4823 » (Confirmé), « Visiteur pass » (Confirmé), « Membre n° 4825 » (Enregistré, Arrivée 06:35 · manuel), « Membre n° 4826 » (Absent), « Membre n° 4827 » (Annulé)
**Components used**: same row/avatar/badge components as tMtOv, plus a new small grey mode-indicator Chip (12px/500 text) with an eye-off icon.
**States shown**: trainer/coach restricted view — same status set as tMtOv but identity-redacted.
**Notes**: the "Ajouter un participant" search field is still present and enabled for the coach view in this frame — confirm whether trainers should be able to add participants at all, since the brief doesn't explicitly scope the add-action to a permission level.

### baN1L · Participants · Erreur d'ajout (complète)

**Scene**: same sheet, owner/admin adding a participant to a session that's already at capacity — inline validation error on the search/add field.
**New or changed surface**: Add-field switches to an error border (red outline) with an inline error line underneath, no dropdown/results shown. Field contains a typed name (« Rokhaya Sy ») that triggered the check.
**Copy**: error line « Séance complète. » — rest of the sheet (header, roster) unchanged baseline from tMtOv.
**Components used**: Input error state (red border + inline helper line with icon).
**States shown**: add-participant validation error — session full.
**Notes**: matches brief §6 exactly.

### kVC5I · Participants · Erreur d'ajout (déjà inscrit)

**Scene**: same sheet, adding a participant who is already registered for this session.
**New or changed surface**: Same Input error treatment as baN1L, field contains « Awa Ndiaye » (an existing row's name).
**Copy**: error line « Déjà inscrit à cette séance. »
**Components used**: same Input error state as baN1L.
**States shown**: add-participant validation error — duplicate booking.
**Notes**: brief §6 also specifies a third inline error, « Membre non éligible à cet établissement », which has no dedicated frame among the 34 — implement as a third copy variant of this same error-state Input.

### O4Q8d · Planning · Ajouter un cours · Intervenant non éligible

**Scene**: `/schedules` → « Cours récurrents » tab, « Ajouter un cours » dialog open, « Intervenant » field set to a trainer without room access.
**New or changed surface**: The existing course-creation dialog's « Intervenant » select shows an error state (red border) with an inline message beneath it; everything else in the dialog (Titre, Salle, Description, Horaire section with Répétition/Intervalle/Les jours/Heure de début-fin/À partir du/Jusqu'au) is unchanged baseline.
**Copy**: error line « Cet intervenant n'a pas accès à cette salle. » (field value shown: « Cheikh Fall »). Dialog title/description unchanged: « Ajouter un cours » / « Un créneau récurrent (ou ponctuel) pour une salle. »
**Components used**: Select field error state (red border + inline helper line), otherwise the full baseline course-creation form (day-of-week pill picker L/M/M/J/V/S/D, date/time inputs).
**States shown**: instructor-eligibility validation error on submit/selection.
**Notes**: brief §7 also notes instructor is optional (« Aucun intervenant » stays valid) — no frame shows that empty-selection state explicitly, but it's presumably just the field's default/placeholder, not a new visual state worth a separate frame.

---

## Cross-flow observations (Flows 1–7)

- **Status Badge palette is now fully cross-referenced**: green = success/positive (« Enregistré », « Actif », « En cours »), amber/yellow = attention/warning (« Confirmé » pending action in some contexts, « À régler », reason badges, « Absent »), grey/muted = neutral/past (« Annulé », « Annulée », « Terminée »), red = destructive/error (delete, invalid). `Confirmé` reads blue/neutral rather than amber in tMtOv — verify against the design system's badge-color mapping doc (`DESIGN.json`) since "pending confirmation" could arguably be an attention color instead.
- **Right-side Sheet vs. centered Dialog are two distinct shell components**: the participants panel (tMtOv/VM1jv/baN1L/kVC5I) is a full-height 460px right Sheet, structurally different from the centered, fixed-width Dialogs used throughout Flows 1–4 (28px radius, scrim-centered). Both need to be documented as separate primitives, not variants of one "modal" component.
- **Inline field-error pattern reused a third time**: the red-border-Input-plus-helper-line pattern from Flow 4's position fields (`S0vta`) and Flow 6/7's add-participant and instructor-select fields (`baN1L`, `kVC5I`, `O4Q8d`) is identical — one `Input`/`Select` error variant, not bespoke per form.
- **Missing frame for a documented error**: brief §6's third add-participant error (« Membre non éligible à cet établissement ») has no frame; treat it as a copy-only variant of `baN1L`/`kVC5I`'s Input error state when implementing.

---

## Flows 8+9 · Établissement profile additions / Plan capabilities

Baseline: « Nouvel établissement » (`aussB`), « Établissement · Fiche » (`Ro3gM`), « Équipe » and « Établissements » list screens. Brief §8–9.

### jmpCT · Établissement · Fiche · Position et règles (1440×1700)

**Scene**: `/venues/[id]`, left column extended below the existing « Profil » card with two new sections: « Position sur la carte » and « Règles ». Right column (Activités, Ressources) unchanged baseline.
**New or changed surface**:
- « Position sur la carte » block, 502×312: header (title + helper), a Latitude/Longitude input pair (243×72 each), and a map-preview placeholder 502×160, fill `#e8eefb`, containing a pin icon + label (map not yet wired up).
- « Règles » block, 502×325: header (title + helper), a paired-input row « Délai d'annulation (minutes) » / « Anti-doublon sans réservation (minutes) » (243×96 each, each with its own helper line), a full-width « Qui peut scanner les QR » Select (502×48), and its own « Enregistrer » button (119×44) — a separate save action from the Profil section's save button above it.
**Copy**:
- Position header: « Position sur la carte », helper « Rend l'établissement trouvable dans la recherche « autour de moi ». »
- Field values (sample): Latitude « 14.6937 », Longitude « −17.4441 »
- Map placeholder label: « Aperçu de la carte (à venir) »
- Règles header: « Règles », helper « Comment les réservations et les entrées se comportent dans cet établissement. »
- Field labels + helpers: « Délai d'annulation (minutes) » / helper « Avant le début de la séance. », value « 120 »; « Anti-doublon sans réservation (minutes) » / helper « Deux entrées du même membre dans ce délai comptent une fois. », value « 30 »
- Select label: « Qui peut scanner les QR », value « Toute l'équipe »
- Button: « Enregistrer »
**Components used**: paired Input rows (matching the Latitude/Longitude pattern from `JAQ8S`), a placeholder Map preview block (info-tinted, "coming soon" state), Select, per-section save Button.
**States shown**: default/populated state for both new sections.
**Notes**: brief §8 phrases « Règles » as a "possible" sub-section ("Possible « Règles » sub-section") — this frame commits to building it. The map preview is explicitly marked "(à venir)" — implement as a static placeholder, not a broken map embed. Two independent « Enregistrer » buttons exist on this page now (Profil's and Règles')  — confirm whether Position-sur-la-carte saves with the Profil button above it or needs its own (it currently sits between the two save buttons with no button of its own, relying on Profil's).

### gLNNi · Établissement · Ressource utilisée par des cours (409)

**Scene**: `/venues/[id]`, attempting to delete resource « Salle A » via its row's « ··· » menu → « Supprimer »; the backend returns 409 because it's still referenced by active courses.
**New or changed surface**: Confirmation dialog, 480×339, radius 28. Header is compact (416×55, title + resource name as description). Body replaced by a warning Alert block, 416×128, fill `#fbf1dc`, containing an icon, an explanation line, and a bulleted list of the blocking courses. Footer: ghost « Fermer » + a redirect action « Voir les cours » (not a destructive button, since deletion is blocked).
**Copy**:
- Title: « Supprimer la ressource », description: « Salle A »
- Alert text: « Cette ressource est utilisée par des cours. Annulez-les d'abord. »
- Blocking courses list: « · Yoga du matin · Lun, Mer, Ven », « · Stretching midi · Tous les jours », « · Yoga du soir · Lun, Mar, Jeu »
- Footer: « Fermer » / « Voir les cours »
**Components used**: warning Notice/Alert (`#fbf1dc`, same tint as Flow 2's 409 conflict and Flow 4's expired-eligibility alert) with a bulleted sub-list, ghost Button, secondary/redirect Button (not destructive — matches brief §8's exact copy: « Cette ressource est utilisée par des cours. Annulez-les d'abord. »).
**States shown**: 409 blocking error on resource deletion, with the specific list of dependent courses named.
**Notes**: unlike Flow 2's cancellation dialogs, this dialog has no destructive action at all (deletion is simply not possible until courses are cancelled) — the "Voir les cours" button presumably deep-links to the planning list filtered to this resource, worth confirming the exact target route.

### zCLZV · Équipe · Verrouillée (plan Starter)

**Scene**: `/staff` (Équipe), viewed on the Starter plan, which lacks `staff_accounts`, `multi_venue`, and `analytics`.
**New or changed surface**: Full-page locked state (no team list at all): centered icon chip (64×64, `#eceef2`, lock glyph) + title + description, then a two-part capability list (420×244): 3 locked rows with a lock icon and a « Pro » tag (Comptes équipe, Plusieurs établissements, Statistiques), followed by 3 unlocked/checked rows with a check icon and a « Starter » tag (Tarification par activité, Entrée par QR, Espace membre) confirming what the current plan already includes. Below: primary « Passer au plan Pro » + ghost « Comparer les plans ». Sidebar also shows a small lock glyph next to the « Équipe » nav item and a new footer "Plan" row above the venue switcher.
**Copy**:
- Sidebar plan row: « Plan Starter » + link « Changer »
- Title: « Équipe »
- Description: « Disponible avec le plan Pro. Invitez des administrateurs, des coachs et des réceptionnistes, chacun avec son propre accès. »
- Locked rows (grey text, lock icon, tag « Pro »): « Comptes équipe », « Plusieurs établissements », « Statistiques »
- Unlocked rows (ink text, green check icon, tag « Starter »): « Tarification par activité », « Entrée par QR », « Espace membre »
- Buttons: « Passer au plan Pro », « Comparer les plans »
- Footer: « Un changement de plan est visible après reconnexion. »
**Components used**: full-page locked EmptyState, capability-row list with a lock/check leading icon and a trailing plan-name Tag, primary + ghost Button pair, sidebar nav lock glyph, sidebar Plan indicator row.
**States shown**: fully locked feature page (Starter plan viewing a Pro-gated section) plus a capability comparison list showing both locked and already-included features together.
**Notes**: matches brief §9 closely (« Disponible avec le plan Pro » + capability distinctions), and the footer note about re-login matches "A plan change is visible only after re-login" from the brief's data description.

### p6hCM · Établissements · Ajout verrouillé + tooltip nav

**Scene**: `/venues` list on the Starter plan (`multi_venue` locked), demonstrating three related locked-state treatments at once: the page's disabled add-button, a tooltip on hover, a tooltip on the sidebar nav lock glyph, and a 403 toast.
**New or changed surface**:
- Header action becomes a locked pill: lock icon + « Ajouter un lieu » (170×44), disabled-looking.
- Hover tooltip on that button, 280×76, dark (`#1f1f1f`) fill, white text: title + description.
- A second, smaller tooltip variant, 192×32, anchored to the sidebar's lock glyph next to a nav item.
- A dark 403-style Toast at the bottom, 469×52, fill `#1f1f1f`, with an icon, message, and an inline « Voir les plans » action (57×28) — distinct from the tooltip components.
**Copy**:
- Sidebar: « Plan Starter » / « Changer »
- Page title: « Établissements », subtitle « 1 établissement »
- Existing tile unchanged: « Studio Dakar Plateau » / « Yoga · Dakar » / « Actif »
- Button tooltip: title « Disponible avec le plan Pro », description « Gérez plusieurs établissements depuis la même console. »
- Nav lock tooltip: « Disponible avec le plan Pro » (title only, no description in the compact variant)
- Toast: « Passez au plan Pro pour ajouter un établissement. » + action « Voir les plans »
**Components used**: locked Button (icon + label, disabled state), two Tooltip sizes (280×76 with description, 192×32 title-only), dark 403 Toast with inline action link.
**States shown**: hover/locked affordance on a primary action, locked nav item tooltip, and the resulting 403 toast if the locked action is attempted anyway.
**Notes**: brief §9 asks to "distinguish `FEATURE_NOT_AVAILABLE` (upgrade message) from a plain 403 (« Accès refusé »)" — this toast's copy is the upgrade-style message (« Passez au plan Pro pour … »), consistent with `FEATURE_NOT_AVAILABLE`; no frame demonstrates the plain-403 « Accès refusé » copy — that variant needs to be added as a copy-only Toast variant. Three affordances (button tooltip, nav tooltip, toast) are shown simultaneously in one frame for reference — in the real product these fire at different times (hover vs. click) and shouldn't render all three at once.

---

## Cross-flow observations (all flows)

- **Status Badge palette is now fully cross-referenced**: green = success/positive (« Enregistré », « Actif », « En cours »), amber/yellow = attention/warning (« À régler », reason badges, « Absent »), grey/muted = neutral/past (« Annulé », « Annulée », « Terminée »), red = destructive/error (delete, invalid). `Confirmé` reads blue/neutral rather than amber in `tMtOv` — verify against the design system's badge-color mapping (`DESIGN.json`) since "pending confirmation" could arguably be an attention color instead.
- **Right-side Sheet vs. centered Dialog are two distinct shell components**: the participants panel (`tMtOv`/`VM1jv`/`baN1L`/`kVC5I`) is a full-height 460px right Sheet, structurally different from the centered, fixed-width Dialogs used throughout the rest of the set (28px radius, scrim-centered). Document both as separate primitives.
- **Inline field-error pattern reused across the whole set**: the red-border-Input-plus-helper-line pattern from Flow 4's position fields (`S0vta`), Flow 6/7's add-participant and instructor-select fields (`baN1L`, `kVC5I`, `O4Q8d`), and now Flow 8's Latitude/Longitude pair in `jmpCT` (happy path only, but same component as `S0vta`'s error variant) is identical — one `Input`/`Select` error variant, not bespoke per form.
- **The warning tint (`#fbf1dc`) is the most reused Notice variant in the whole set**: 409 conflict (`zvJSN`), expired eligibility (`S0vta`), and now the 409 resource-in-use dialog (`gLNNi`) all share it, each adding a different secondary content shape (plain text, plain text, bulleted list) inside the same tinted container — confirm the `Notice` component supports arbitrary rich content in its body slot, not just a single text line.
- **"Locked feature" has three separate visual treatments that should be unified under one system**: a full-page locked EmptyState (`zCLZV`), a locked-button-plus-tooltip pattern (`p6hCM`), and a sidebar nav lock glyph with its own compact tooltip (`p6hCM`). All three read the same two facts (which plan unlocks it, one-line benefit copy) — worth building a single `LockedFeature` data shape (`plan`, `title`, `description`) that renders through three presentational variants (page / tooltip / compact-tooltip) rather than duplicating copy three times.
- **Missing "plain 403" variant**: brief §9 explicitly wants `FEATURE_NOT_AVAILABLE` (upgrade copy) distinguished from a plain 403 (« Accès refusé »); only the upgrade-copy toast is drawn (`p6hCM`). Add "Accès refusé" as a second Toast copy variant sharing the same dark Toast shell.
- **Two independent save actions on one profile page**: `jmpCT` introduces a second « Enregistrer » button (for « Règles ») below the first one (for « Profil »), while « Position sur la carte » sits between them with no save button of its own — clarify which save action persists the position fields before implementing the form's submit boundaries.
