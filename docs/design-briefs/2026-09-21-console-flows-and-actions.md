# Owner console — flows and actions to design (backend contract of 2026-09-21)

**Purpose:** the reference for the canvas work in `screens.pen`. Every flow below comes from the backend contract on `iziwellpass` `origin/main` (ab55b9a, `docs/openapi.json` + `docs/client-integration.md`). Each flow lists its entry point, steps, screens, actions, data shown, states and errors, and the frame to create or update. Design rules stay those of `DESIGN.md` (« Le comptoir clair »): one dark control per surface, hairlines, 44px targets below `md`, canvas « Secondary » = outline pill.

**Scope tags:** `[new screen]` needs a new frame; `[update]` changes an existing frame; `[no design]` is code only.

---

## 1. Photos de l'établissement — venue gallery `[new screen]`

**Who:** owner, admin (`venue:write`). **Where:** « Établissement · Fiche » (`Ro3gM`), new section « Photos »; cover reused on « Établissements » tiles (`EjThs`) and on the marketplace listing.

**Rules from the API:** max 10 photos per venue; JPEG, PNG, WebP; 5 MB each; the photo in position 1 is the cover (its URL becomes `cover_image_url` everywhere); no captions (only the file and its upload date exist).

**Flow A — add photos**
1. Section « Photos » shows the grid (or the empty state) with the add control « Ajouter des photos » (file picker, multiple; drop zone optional).
2. Client-side check of type and size before anything is sent; a rejected file shows an inline error on its placeholder (« Format non accepté » / « Fichier trop lourd (max 5 Mo) »).
3. Each accepted file appears as a placeholder tile with a progress bar (upload goes straight to storage; a few seconds on mobile).
4. On success the tile becomes the thumbnail, appended at the end (the first ever photo becomes the cover automatically).
5. Errors after upload: « Galerie pleine (10/10) », « Téléversement interrompu, réessayer » (retry on the tile).

**Flow B — choose the cover / reorder**
1. Each thumbnail has a « ··· » menu: « Définir comme couverture », « Déplacer à gauche », « Déplacer à droite », « Supprimer ». Drag-and-drop is an optional enhancement on desktop.
2. The cover tile carries a « Couverture » badge; changing the order sends the full list, so the UI reorders optimistically and reverts on error.

**Flow C — delete**
1. « Supprimer » opens a 480px confirmation: title « Supprimer cette photo », text « Elle sera retirée de la galerie et du marketplace. » If it is the cover: « La photo suivante deviendra la couverture. »
2. Ghost « Annuler » + destructive « Supprimer ». Focus returns to the tile menu.

**States to draw:** empty (invitation + rules line « Jusqu'à 10 photos · JPEG, PNG ou WebP · 5 Mo max »), grid 1–10 with cover badge, uploading placeholder, per-tile error, full (add control disabled + « 10 photos sur 10 »), delete dialog, phone (two columns, 44px menu buttons, add control reachable).

**Open design choices:** thumbnail ratio and radius (20px like subscription tiles?), cover as badge only or also a larger hero; whether the venue tile shows a thumbnail or keeps its icon.

---

## 2. Aperçu d'annulation — cancellation preview with safe confirm `[update]`

**Who:** owner, admin (`schedule:write`). **Where:** planning — « Annuler la séance » (row menu on « Séances », `s8ABF`) and « Annuler ce cours » (row menu on « Cours récurrents », `oouHs`). Replaces the current plain confirm dialogs.

**Flow**
1. Staff picks « Annuler la séance » / « Annuler ce cours ».
2. The dialog opens in a loading state and fetches the preview (read-only counts, no names).
3. Preview shown as a short key/value list:
   - « Réservations concernées » (active bookings affected), split « dont membres » / « dont visiteurs pass »
   - « Séances futures concernées » (course only)
   - « E-mails envoyés automatiquement » (members with an e-mail; sent per booking, so one member can receive several)
   - « Crédits pass remboursés » (pass bookings are refunded by the platform)
   - « Crédits membres remboursés : 0 » with the helper « Une annulation par l'équipe ne rembourse pas les crédits de séance des membres. »
   - « Inchangé » : past sessions preserved, bookings untouched (already checked-in, past)
4. Ghost « Retour » + destructive « Annuler la séance » / « Annuler le cours ». The confirm sends the preview's version.
5. Success: dialog closes, toast « Séance annulée » / « Cours annulé ».

**States and errors**
- Blocking: the preview says the target is already cancelled → dialog shows « Cette séance est déjà annulée » and only « Fermer ».
- Conflict (409): bookings or arrivals changed between preview and confirm → inline notice « Les réservations ont changé. Aperçu mis à jour. », preview reloads, the user confirms again.
- Preview failed to load → error line + « Réessayer », confirm disabled.
- Two frames: single session (slot) and whole course (schedule, cascades to future sessions; today's and past sessions are preserved).

---

## 3. Double authentification (TOTP) for owner and admin `[new screen]`

**Who:** owner and admin only (members, trainers and receptionists keep the current login). **Why:** the backend now rejects every owner/admin token without finalized MFA (`MFA_ENROLLMENT_REQUIRED`), including existing accounts on their next login.

**Flow A — first enrolment**
1. Login (existing `T9KwQ`), then set password if temporary (existing `ZllMy`).
2. « Activer la double authentification » — explainer: why, what app to use (Google Authenticator, 1Password, etc.); QR code to scan + the manual secret with a copy button; primary « Continuer ».
3. « Vérifier le code » — 6-digit code input (OTP field), primary « Vérifier ». Errors: « Code invalide » (inline), « Code expiré, entrez le suivant ».
4. Finalization runs (enabled + preferred verified, all sessions revoked) → interstitial « Double authentification activée. Reconnectez-vous avec votre code. » with one primary « Se reconnecter ». This sign-out is mandatory, not a bug.
5. Login again → new step « Code de vérification » (6 digits) after the password → console.

**Flow B — TOTP challenge at every login**
- After the password: « Entrez le code de votre application d'authentification » (6 digits), « Vérifier », error « Code invalide ». Link « Je n'ai plus accès à mon application » → contact support (no self-service reset in the contract).

**Flow C — gate**
- An owner/admin who reaches the console unenrolled (older account) is routed to Flow A step 2 with a banner « La double authentification est désormais obligatoire pour les propriétaires et administrateurs. »

**Frames:** enrolment explainer + QR, code entry, activated/sign-out interstitial, login challenge, gate banner variant of the login. Reuse the auth column (400px) and `AuthCard`.

---

## 4. Ouvrir un établissement — owner onboarding gate and member conversion `[update]`

**Who:** a new owner (registered with e-mail, temp password) or an existing member converting to owner on the same identity. **Where:** « Onboarding · Créer mon établissement » (`tZ9zj`), plus a new entry point for members.

**Flow — new owner**
1. Register (public, enumeration-safe: the screen always says « Si cette adresse est nouvelle, un e-mail vient d'être envoyé »).
2. First login, password, MFA enrolment (section 3) and re-login.
3. Onboarding form (existing fields) + optional « Position sur la carte » (latitude/longitude, both or none).
4. Submit: eligibility is granted just-in-time (10-minute window), then the venue is created; the app refreshes the session so the user becomes staff.

**Flow — member becomes owner**
1. Logged-in member sees « Ouvrir un établissement » (member area entry point; the member app or a link from the console login).
2. MFA enrolment if not done (section 3), re-login.
3. Same onboarding form; on success the member keeps their memberships and gains the owner console.

**Errors to draw:** eligibility expired (« Votre inscription a expiré, renvoyez le formulaire »), already staff (« Ce compte gère déjà un établissement »), missing/invalid position (« Latitude et longitude vont ensemble »), MFA missing (redirect to section 3).

---

## 5. Aujourd'hui — day snapshot for the dashboard and front desk `[update]`

**Who:** staff with `schedule:read` and `checkin:read`. **Where:** « Tableau de bord » (`ssgpT`), « Accueil » (`jhjgK`), and the deferred « À régler » pill.

**Data available per day (one call):** every session of the day including cancelled ones, each with lifecycle `upcoming | active | completed | cancelled`, booked count, checked-in count, capacity, room and instructor names, a `needs_attention` flag; day attendance: total check-ins, unique attendees (members + pass holders), occupancy % (check-ins ÷ capacity of non-cancelled sessions).

**`needs_attention` reasons (draw the copy):** active session with no arrivals (« Personne n'est arrivé »), over capacity (« Au-delà de la capacité »), bookings but no instructor (« Aucun intervenant »).

**Flow — À régler**
1. Third pill on the dashboard: « À régler (3) ».
2. List of flagged sessions: time, title, room, reason badge, quick actions « Voir les participants » (opens the sheet) and, for a missing instructor, « Modifier le cours ».
3. Empty state: « Rien à régler pour l'instant. »

**Flow — Planning du jour tiles**
- Tile shows « 6 arrivés · 8 inscrits · 20 places » (or a bar), and a lifecycle treatment: upcoming (default tint), active (accent/badge « En cours »), completed (atténué), cancelled (côté). Cancelled sessions are never flagged.
- Optional: a date control to view another day (« Demain », date picker).

**Stats strip:** check-ins today, unique attendees, occupancy %; already on the canvas, now fed by the snapshot.

---

## 6. Participants d'une séance — richer roster `[update]`

**Where:** participants sheet (`skmEM`).

**New data per row:** `kind` member or pass holder; first/last name only for owner, admin, receptionist (trainers see no names); `check_in_method` qr or manual and `checked_in_at`.

**Rows to draw**
- Member (existing) + arrival detail: « Arrivé 09:03 · QR » or « · manuel » under the name when checked in.
- Pass holder: « Visiteur pass », never named, distinct avatar (pass glyph) and a « Pass » badge; same status badges.
- Trainer view: rows without names (« Membre » + short id), status and arrival still visible.
- Adding a participant: inline errors « Séance complète », « Déjà inscrit à cette séance », « Membre non éligible à cet établissement ».

---

## 7. Planning — instructor eligibility `[update]`

**Where:** « Ajouter un cours » / « Modifier le cours » (`jFogY`).
- « Intervenant » only lists active staff who can access the room; if the backend still refuses (e.g. unassigned trainer), the field shows the inline error « Cet intervenant n'a pas accès à cette salle ».
- Instructor is optional (« Aucun intervenant » stays valid) but a session booked without instructor is flagged in « À régler ».

---

## 8. Établissement — profile additions and resource rules `[update]`

**Where:** « Nouvel établissement » (`aussB`), « Établissement · Fiche » (`Ro3gM`).
- Optional « Position sur la carte »: latitude + longitude together (helper « Rend l'établissement trouvable dans la recherche autour de moi »), or a map picker later.
- Possible « Règles » sub-section of the profile: cancellation window (minutes), walk-in anti-duplicate window (minutes), check-in scan mode (who may scan). All exist in the update contract today.
- Deleting a resource still used by courses fails: dialog copy « Cette ressource est utilisée par des cours. Annulez-les d'abord. » (409).

---

## 9. Plan capabilities — locked features `[update]`

**Data:** the tenant plan (`free`, `starter`, `pro`, `enterprise`) and its capabilities: `activity_pricing`, `qr_checkin`, `staff_accounts`, `multi_venue`, `analytics`, `member_self_service`, `member_qr`. Starter has the first three plus member self-service; pro/enterprise everything; free nothing. A plan change is visible only after re-login.

**To draw**
- Locked nav item or section: lock glyph + « Disponible avec le plan Pro » on hover/tap, and a locked-state page (e.g. « Équipe » on free, « Établissements » add-venue on starter, QR scan on free).
- Error distinction: `FEATURE_NOT_AVAILABLE` → upgrade message (« Passez au plan Pro pour … »), plain 403 → « Accès refusé ».
- Where the plan is shown: user menu or venue switcher footer (« Plan Starter »).

---

## 10. Code-only changes `[no design]`

- Cancel session / cancel course return no body (204); bookings endpoints add 409 codes; resource deletion adds 409.
- Roster field `booking_id` renamed `id`; the roster is a superset of the old booking shape.
- Onboarding requires an idempotency key; venue create/update accept latitude/longitude.
- Member app: `/me/*` routes take a venue selector; `GET /me/memberships` lists selectable gyms (member app scope, not the console).

---

## Suggested design order

1. Cancellation preview (small, unblocks the planning fixes).
2. Gallery (SP-D).
3. MFA + onboarding gate (blocks every owner login after the backend deploys).
4. Today snapshot: « À régler » and tile states.
5. Roster and instructor updates, profile additions.
6. Capabilities lock states.

Frames to export as starting points: `Ro3gM`, `s8ABF`, `oouHs`, `skmEM`, `jFogY`, `tZ9zj`, `T9KwQ`, `ssgpT`, `jhjgK`, `EjThs`, `aussB`.
