# Member management: screens, actions and states to design (backend contract of 2026-09-28)

**Purpose:** the design-stage reference for the canvas work in `screens.pen` covering the backend's Phase 5A member-management routes. Each section gives who can act, where it lives, the flow, the data available, every state and error to draw, and the frames to create or update. The contract is `iziwellpass` `main` b572a8b (`docs/openapi.json` and `docs/client-integration.md`, sections « Annuaire des membres » through « Gestion des membres »).

**Design rules** stay those of `DESIGN.md` (« Le comptoir clair »):
- flat surfaces, one dark ink control per surface, grey pills for active states;
- hairlines between rows, never boxes;
- pastel tints only for meaning (status, capacity);
- Lucide icons at stroke 1.5;
- mono numerals (`18:04`, `12/30`);
- 44px targets below `md`;
- sentence case, no em dashes in UI copy;
- canvas « Secondary » is the outline pill.

Frames are drawn at 1440×900 (console) and 390×844 (phone), like the existing ones.

**Scope tags:**
- `[new screen]` needs a new frame.
- `[update]` changes an existing frame.
- `[no design]` is code only and listed so nobody draws it.

**What the API never gives the console:**
- the member's Cognito identifier;
- the new address of a pending e-mail change (only its state);
- who scanned a visit;
- a total count of members in the directory.

Designs must not show any of these.

---

## 0. Who can do what

| Action | Owner | Admin | Receptionist | Trainer |
| --- | --- | --- | --- | --- |
| See the directory, search, open a member | yes, one venue or all venues | yes, one venue or all venues | yes, only their venues, never « Tous les établissements » | no (no Membres page) |
| Create a member | yes | yes | yes, venue-scoped to the selected venue only | no |
| Edit identity fields, notes, membership | yes | yes | yes | no |
| Suspend / reactivate | yes | yes | yes | no |
| See account state (invitation, e-mail) | yes | yes | yes, read-only | no |
| Resend invitation / relaunch access creation | yes | yes | no | no |
| Change the sign-in e-mail (secure change) | yes | yes | no | no |
| Sign the member out everywhere | yes | yes | no | no |
| See visits (Présences) | yes, every venue | yes, every venue | yes, their venues only | no |
| Member sign-in policy (Réglages) | yes | yes | no (hidden) | no |

For a receptionist, owner/admin-only actions are **hidden**, not disabled. The account section shows one quiet line instead: « Seul un propriétaire ou un administrateur peut agir sur l'accès à l'app. »

---

## 1. Membres: server search and exact filters `[update]` `xLxJY`

**Why it changes:**
- Search now runs on the server (`POST /members/search`) and covers first name, last name, full name, e-mail and phone.
- Results are cursor-paginated with **no total count**.
- Cancelled members are **never** listed.

**Header**
- Title « Membres ».
- The subtitle « 128 membres » cannot be computed any more. Replace it with the scope line, e.g. « Studio Dakar Plateau », or drop it.
- The primary « Ajouter un membre » button is unchanged.

**Toolbar (left to right)**
1. **Search field:**
   - Placeholder « Rechercher par nom, e-mail ou téléphone ».
   - 1 to 100 characters. Results update as the user types (debounced).
   - A clear control (×) appears once there is text.
   - While a request is in flight, show a small spinner in the field. Never blank the list.
2. **Scope control (owner/admin with 2 or more venues only):**
   - Two options, « Cet établissement » (default, meaning the venue selected in the sidebar switcher) and « Tous les établissements ».
   - Drawn as a pill pair or a compact select.
   - Hidden for receptionists and for single-venue tenants.
3. **Status tabs:**
   - « Tous · Actifs · Expirés · Suspendus ».
   - **Remove « Annulés »:** the API never lists cancelled members.
   - Each tab is an exact filter. « Actifs » no longer includes expired members.

**Table (desktop), unchanged columns**
- Membre, Contact, Type, Statut, Fin d'abonnement, row menu « ··· ».
- The row menu offers « Suspendre » only for active members (already true in code).
- No account/app column: the directory does not return account state.

**Pagination**
- Replace the numbered pager (« 1 2 3 … 13 ») with a single outline button « Afficher plus » under the last row.
- It appends the next 20 rows and disappears when there is no next page.
- Footer text « 20 membres affichés », or nothing. Never « sur 128 ».

**States to draw**

| State | What to show |
| --- | --- |
| Loading (first load) | 8 skeleton rows |
| Searching (typing, refetch) | Spinner in the search field; the previous rows stay visible |
| Results | As above |
| No match for the search | Centred text « Aucun membre ne correspond à « kofi ». », link-button « Effacer la recherche » |
| Empty tab | « Aucun membre suspendu. » (one line per tab: actif, expiré, suspendu) |
| Empty directory (new venue) | Invitation « Ajoutez votre premier membre » + primary button |
| Loading more | Spinner inside « Afficher plus » |
| Error | « Impossible de charger les membres. » + « Réessayer » |

**Phone (390):**
- Search full width, with the scope and status controls on a horizontally scrollable pill row below it.
- Rows collapse to name, contact line and status badge, with a 44px « ··· ».
- « Afficher plus » is a full-width outline pill.

---

## 2. Ajouter un membre: sign-in mode and access creation `[update]` `nVkMG`

**Why it changes:**
- The tenant's sign-in policy (section 5) decides whether a new member gets an app login (`login`) or stays a record without app access (`roster`).
- In `login` mode the e-mail is required, and access is created **asynchronously**: the member exists at once, and the invitation leaves a few seconds later.

**Form changes**
- **Mode hint under the title**, visible to owner/admin (they can read the policy):
  - Login: « Le membre recevra une invitation par e-mail pour utiliser l'app. »
  - Roster: « Fiche sans accès à l'app. L'équipe gère tout depuis la console. »
  - Receptionists cannot read the policy, so they see no hint; the result arrives after creation (below).
- **E-mail field:**
  - Login mode: label « E-mail » with the helper « Obligatoire : il sert d'identifiant dans l'app. »
  - Roster mode: « E-mail (facultatif) ».
- **« Accès aux établissements » for a receptionist:**
  - Fixed to the selected venue, drawn as a read-only line « Studio Dakar Plateau » instead of the select.
  - « Tous les établissements » is owner/admin only.

**After « Ajouter le membre »**
- **Roster:** the dialog closes; toast « Membre ajouté ».
- **Login:**
  - The dialog closes; toast « Membre ajouté. Envoi de l'invitation… ».
  - The member page shows the progress in its account section (section 3.2).
  - Never show « Invitation envoyée » before the backend confirms it.
- **« Ajouter et enchaîner »:** the same toasts, and the form resets.

**Errors to draw (inline, dialog stays open)**
- Missing e-mail in login mode: under the field, « L'e-mail est obligatoire : ce club donne accès à l'app à ses membres. »
- Duplicate e-mail, case-insensitive (409): under the field, « Un membre utilise déjà cette adresse. »
- Invalid e-mail format: « Adresse e-mail invalide. »
- A receptionist attempting all venues cannot happen (the control is hidden).

**Frames:** login-mode variant (hint + required e-mail), roster-mode variant, receptionist variant (fixed venue), error variant (duplicate), phone.

---

## 3. Membre · Fiche: account, secure e-mail, sign-out `[update]` `L6sMyP`

### 3.1 Changes to what is already drawn

- **« Modifier le membre » form:**
  - **Remove « Statut du compte »** (select + helper « Autorise ou bloque l'accès du membre. »). The API rejects it; lifecycle lives only in « Zone sensible ». The code already dropped it.
  - **E-mail field for an app member:**
    - Read-only (muted field, lock glyph optional).
    - Helper: « Adresse de connexion : elle se change par une procédure sécurisée. »
    - For owner/admin, a text link under it: « Changer l'adresse de connexion » (opens 3.4).
    - Exception: when the invitation **failed** (3.2), the field is editable again so the address can be corrected.
  - Roster member: e-mail editable as today.
  - Version conflict notice (already built, draw it): a warning banner above the form actions, « Ce membre a été modifié entre-temps. Vérifiez puis enregistrez à nouveau. » The typed values are kept.
- **Header:**
  - Add one **app badge** after the status badges; mapping in 3.2.
  - Under the top-right e-mail, when a change is pending: small muted line « Changement d'adresse en attente ».
- **« Zone sensible »:**
  - Only one lifecycle button at a time: « Suspendre le membre » when active, « Réactiver » when suspended (the current frame shows both).
  - Add « Déconnecter de tous les appareils » (3.5) for app members, owner/admin only.
  - Nothing for expired or cancelled members, except the sign-out when relevant.

### 3.2 New section « Accès à l'app » (account)

**Placement:**
- Right column, between « Modifier le membre » and « Zone sensible »; on phone, after « Modifier le membre ».
- Title « Accès à l'app ». Subtitle: « Connexion du membre à l'app IziWellPass : carte, QR code, réservations. »

**Content: a short key/value list (hairlines between rows)**

| Row | Value |
| --- | --- |
| Accès | Status text + badge (table below) |
| Adresse de connexion | The member's e-mail + e-mail state badge when not verified |
| Dernière action | Latest operation line (3.3), e.g. « Invitation renvoyée le 25 sept. à 14:32 » |

Then the action buttons, owner/admin only, as outline pills: « Renvoyer l'invitation » or « Relancer la création de l'accès », and « Changer l'adresse ». Which ones appear depends on the state below.

**Invitation state → badge, explanation, actions**

| `account.invitation` | Badge (tone) | One-line explanation | Actions (owner/admin) |
| --- | --- | --- | --- |
| `not_applicable` (roster) | « Sans app » (neutral outline) | « Ce membre n'a pas d'accès à l'app. » | none (no conversion route exists) |
| `pending` | « Création en cours » (neutral + spinner) | « L'accès est en cours de création. L'invitation part dans quelques secondes. » | none (a resend would return the same running operation) |
| `sent` | « Invitation envoyée » (info) | « Le membre n'a pas encore choisi son mot de passe. » | Renvoyer l'invitation · Changer l'adresse |
| `linked_existing` | « Compte existant lié » (info) | « Cette personne avait déjà un compte IziWellPass : aucune invitation n'a été envoyée. » | Changer l'adresse |
| `accepted` | « App activée » (success) | « Le membre se connecte à l'app. » | Changer l'adresse |
| `untracked` | « Accès app » (neutral) | « Accès créé avant le suivi des invitations. » | Renvoyer l'invitation · Changer l'adresse |
| `failed` | « Invitation échouée » (danger) | Reason from `provisioning.failure_code` (below) + « Corrigez l'adresse si besoin, puis relancez. » | Relancer la création de l'accès (e-mail editable in the form) |

**Provisioning failure reasons (`failed`):**
- `invalid_email`: « L'adresse e-mail est invalide. »
- `missing_email`: « Aucune adresse e-mail. »
- `identity_already_linked`: « Cette adresse est déjà liée à un autre membre. »
- `provider_unavailable`: « Le service de connexion n'a pas répondu pendant 24 h. »

**E-mail state (`account.email`), shown next to the address**

| State | Badge | Line |
| --- | --- | --- |
| `verified` | none | none |
| `change_pending` | « Changement en attente » (warning) | « Le membre doit saisir le code reçu à sa nouvelle adresse (24 h). Il se connecte avec l'adresse actuelle d'ici là. » |
| `change_failed` | « Changement échoué » (neutral) | Reason (3.4) + « L'adresse actuelle reste l'adresse de connexion. » |
| `not_applicable` | none | none |

**Receptionist:** the same rows, no buttons, plus the line « Seul un propriétaire ou un administrateur peut agir sur l'accès à l'app. »

### 3.3 Tracking an operation (shared pattern)

Resend, relaunch, e-mail change and sign-out all answer **202** with an operation that finishes later. The page follows it by reloading the member.

**Draw these generic states once, as one inline status row under the section's actions:**
1. **In progress** (`requested`, `dispatched`):
   - Spinner + « Envoi de l'invitation… », « Création de l'accès… », « Envoi du code à la nouvelle adresse… » or « Déconnexion en cours… ».
   - The action button is disabled while it runs.
2. **Still in progress after about 30 s** (the backend retries in the background):
   - « Toujours en cours. Cela peut prendre quelques minutes. »
   - A text button « Actualiser ».
3. **Waiting for the member** (`pending_verification`, e-mail change only):
   - « Code envoyé à la nouvelle adresse. En attente de confirmation par le membre. »
4. **Done** (`completed`):
   - Success check + result line with time: « Invitation envoyée à 14:32 », « Nouvelle invitation envoyée à la nouvelle adresse », « Adresse modifiée », « Membre déconnecté de tous ses appareils. L'effet peut prendre jusqu'à 10 minutes. »
5. **Failed** (`failed`, `expired`): danger text line with the reason (per action below).

**Timestamps:** the « Dernière action » row keeps the latest finished operation of each kind as history, e.g. « Déconnecté de tous les appareils le 12 sept. à 09:10 ».

### 3.4 Flows and dialogs

All dialogs are 480px with ghost « Annuler » + a primary or destructive confirm. Focus returns to the triggering button.

**A. Renvoyer l'invitation** (`sent`, `untracked`)
- Title « Renvoyer l'invitation ? ». Text « {Prénom} recevra un nouvel e-mail avec un nouveau mot de passe temporaire. Le précédent ne fonctionnera plus. »
- Confirm « Renvoyer ».
- Then the inline progress (3.3), ending in « Invitation envoyée à 14:32 ».
- **Outcomes to draw:**
  - Already active (`account_already_active`, or 409 `ACCOUNT_ALREADY_ACTIVE`): the badge flips to « App activée » and the line reads « Ce membre a déjà activé son compte : rien n'a été envoyé. »
  - Shared account (409 `IDENTITY_SHARED` / `identity_shared`): « Ce compte sert aussi dans une autre organisation ou pour un accès équipe. Un renvoi bloquerait ces accès : contactez le support. »
  - E-mail no longer matches the account (`account_email_mismatch`): « L'adresse du membre ne correspond plus à son compte. Contactez le support. »
  - Service down (`provider_unavailable`): « Le service d'envoi est indisponible. Réessayez plus tard. »
  - Generic failure for the rest (`account_not_invited`, `account_not_found`, `login_not_provisioned`, `invalid_email`, `missing_email`, `member_cancelled`): « L'invitation n'a pas pu être renvoyée. »

**B. Relancer la création de l'accès** (`failed`)
- Flow: the owner corrects the e-mail in « Modifier le membre » if needed and saves, then clicks « Relancer la création de l'accès ».
- Dialog: « Relancer la création de l'accès ? Une invitation sera envoyée à {email}. » Confirm « Relancer ».
- Progress « Création de l'accès… », ending in:
  - « Invitation envoyée à 14:32 »; or
  - « Compte existant lié : aucune invitation envoyée. »; or
  - the provisioning failure reasons (3.2).
- **Refusals (409, shown in the dialog):**
  - `LOGIN_NOT_AVAILABLE`: « Votre club ne donne plus accès à l'app aux nouveaux membres. Modifiez ce réglage dans Réglages. » (link)
  - `CONFLICT`: « Cette adresse est déjà utilisée par un autre membre. »

**C. Changer l'adresse de connexion** (owner/admin, app member with created access)

This is a two-step flow split between the console and the member app (section 6).
- **Dialog content:**
  - Title « Changer l'adresse de connexion ».
  - Read-only row « Adresse actuelle » with the address.
  - Field « Nouvelle adresse ».
  - Explanatory text:
    - « Le membre recevra un code à la nouvelle adresse et devra le saisir dans l'app. D'ici là, il continue de se connecter avec l'adresse actuelle. Sans confirmation sous 24 h, le changement est annulé. »
    - « S'il ne s'est jamais connecté, l'adresse est remplacée tout de suite et une nouvelle invitation y est envoyée. »
  - Confirm « Envoyer le code ».
- **Inline errors (dialog stays open):**
  - Identical to the current address: « C'est déjà l'adresse actuelle. »
  - Invalid: « Adresse e-mail invalide. »
  - `CONFLICT`: « Cette adresse est déjà utilisée. »
  - `EMAIL_CHANGE_IN_PROGRESS`: « Un changement vers une autre adresse est déjà en cours. Attendez qu'il aboutisse ou expire (24 h). »
  - `IDENTITY_SHARED`: « Ce compte sert aussi ailleurs sur IziWellPass : contactez le support. »
  - `LOGIN_NOT_PROVISIONED`: « L'accès du membre n'est pas encore créé. »
  - Request still processing (`IDEMPOTENCY_KEY_IN_PROGRESS`): « Demande en cours de traitement. Réessayez dans un instant. »
- **After confirm:** the dialog closes. The section shows the e-mail badge « Changement en attente » and the status « Code envoyé à la nouvelle adresse. En attente de confirmation par le membre. »
- **Terminal lines:**
  - `email_changed`: « Adresse modifiée. Le membre a été déconnecté et se reconnecte avec sa nouvelle adresse. »
  - `email_changed_sessions_kept`: « Adresse modifiée. »
  - `email_changed_reinvited`: « Adresse remplacée. Une nouvelle invitation a été envoyée. »
  - `verification_expired`: « Le membre n'a pas confirmé sous 24 h. L'adresse actuelle est conservée. »
  - `email_unavailable`: « Cette adresse n'est pas disponible. »
  - Other failures: « Le changement d'adresse n'a pas abouti. »
- **No cancel:** the contract has no route to cancel a pending change, so draw no « Annuler le changement ».
- **The new address is never returned.** Show it only in the success toast right after sending (« Code envoyé à nouvelle@adresse.com »), never on the page afterwards.

**D. Déconnecter de tous les appareils** (in « Zone sensible »; owner/admin; app member whose access exists)
- Use case: lost phone, shared device.
- Outline destructive pill « Déconnecter de tous les appareils ».
- Dialog:
  - Title « Déconnecter {Prénom} de tous ses appareils ? ».
  - Text « Il devra se reconnecter avec son mot de passe. L'effet peut prendre jusqu'à 10 minutes. »
  - Destructive confirm « Déconnecter ».
- Result « Membre déconnecté de tous ses appareils à 14:32. »
- **Refusals:**
  - `IDENTITY_SHARED`: « Ce compte sert aussi dans une autre organisation ou pour un accès équipe : une déconnexion les toucherait aussi. Contactez le support. »
  - `LOGIN_NOT_PROVISIONED`: « L'accès du membre n'est pas encore créé : aucune session à fermer. »
- Hidden for roster members.

**Frames for section 3:**
- Full page variants, desktop:
  - app activated;
  - invitation sent + resend in progress;
  - invitation failed (e-mail editable, relaunch);
  - change pending;
  - roster member;
  - receptionist view.
- Dialogs: renvoyer, relancer, changer l'adresse (+ error variant), déconnecter.
- Zone sensible: active vs suspended.
- Phone: one page variant (app activated) + one dialog.

---

## 4. Membre · Fiche: « Présences » (visit history) `[update]` `L6sMyP`

**Who:** owner and admin see every venue; receptionists see only visits in their venues.

**Where:** a new section in the left column, after « Abonnements ».

**Data per visit:**
- date and time;
- venue name;
- method: « QR », « Manuel » or « Wallet »;
- kind: « Réservation » (linked to a booking) or « Sans réservation » (walk-in).

The API never says who scanned.

**Per period:**
- `total_visits`: visits in the period;
- `last_visit_at`: the most recent visit at **any** date.

**Layout**
- **Title and summary:**
  - Title « Présences ».
  - Summary line in mono numerals: « 12 passages sur 30 jours · Dernier passage hier à 18:04 ».
- **Controls, on one row:**
  - Period pills « 7 jours · 30 jours · 90 jours » (default 30).
  - Venue select « Tous les établissements / Studio Dakar Plateau / … ». Shown only when the viewer can see 2 or more venues; a receptionist's list holds only their venues.
- **List:**
  - One row per visit, hairline-separated.
  - Left: « jeu. 25 sept. » with « 18:04 » in mono.
  - Middle: venue name (multi-venue only) and the kind as muted text.
  - Right: method badge.
  - 20 rows, then an outline « Afficher plus ».
- Optional: a tiny weekly bar strip above the list. It is not required, and the data only supports it if computed from the loaded page, so a plain summary is safer.

**States**

| State | What to show |
| --- | --- |
| Loading | 5 skeleton rows |
| List | As above |
| Empty period, older visit exists | « Aucun passage sur les 30 derniers jours. » + « Dernier passage le 12 juin 2026. » |
| Never visited | « Aucun passage enregistré pour ce membre. » |
| Loading more | Spinner in « Afficher plus » |
| Error | « Impossible de charger les présences. » + « Réessayer » |

**Phone:** the summary wraps onto two lines; period pills scroll horizontally; rows stack date/time over venue + badge.

**Frames:** section with visits (multi-venue owner), empty period, phone.

---

## 5. Réglages: member sign-in policy (and security) `[new screen]`

**Who:** owner and admin. The nav item is hidden for receptionists and trainers.

**Where:**
- New nav item « Réglages » (Lucide `Settings2`) at the end of « Organisation ».
- A working page with one column (max 720px), like `/plan`.

### 5.1 Section « Connexion des membres »

**Purpose:** the tenant-wide policy that decides whether **new** members get an app login. It is never per venue or per member.

**Control:** two selectable rows (radio group drawn as hairline-separated options with a grey pill for the selected one, not cards):
- **« Avec l'app »** (`login`): « Chaque nouveau membre reçoit une invitation par e-mail pour utiliser l'app IziWellPass : carte, QR code, réservations. L'e-mail devient obligatoire à la création. »
- **« Fiche seule »** (`roster`): « Les nouveaux membres sont enregistrés sans accès à l'app. L'équipe gère tout depuis la console. »

Footnote: « Ce réglage ne concerne que les nouveaux membres. Les accès existants sont conservés. »

**Save:** primary « Enregistrer », enabled only when the selection changed. Toast « Réglage enregistré ».

**States**

| State | What to show |
| --- | --- |
| Loading | Skeleton of the two rows |
| Login active (configured and effective `login`) | « Avec l'app » selected |
| Roster (default) | « Fiche seule » selected |
| Plan lacks the capability, `login` not configured | « Avec l'app » row locked: lock glyph + « Disponible avec le plan Starter » + link « Voir les plans » (to `/plan`) |
| **Downgraded**: configured `login`, effective `roster` (`downgrade_reason = plan_lacks_member_self_service`) | Warning banner above the options: « Votre plan n'inclut plus l'espace membre : les nouveaux membres sont créés sans accès à l'app. » + « Voir les plans ». « Avec l'app » still shows as the configured choice with the muted tag « Inactif avec votre plan ». |
| Save refused (`FEATURE_NOT_AVAILABLE`) | Inline error: « Votre plan ne permet pas l'accès des membres à l'app. » |
| Error loading | « Impossible de charger les réglages. » + « Réessayer » |

### 5.2 Section « Sécurité » (draw now, wired after the backend change)

**Context:**
- Today the backend forces TOTP for owners and admins.
- The next backend change makes it an opt-in for owners, managed here.
- Draw it so the page has its final shape.

**Row « Double authentification »:**
- Description: « Un code de votre application d'authentification est demandé à chaque connexion. »
- States:
  - « Activée » (success badge), with no action while it is enforced;
  - « Désactivée », with outline « Activer ». It leads to the existing `/mfa` enrolment screens: `Setup · QR` etc. in `docs/design-refs/comptoir-clair/mfa/`.
- Later (not in the contract yet): « Désactiver ». Leave room but do not draw it.

**Frames:** Réglages desktop (login active), downgraded state, locked state (free plan), phone.

---

## 6. Member app: confirm a new e-mail address `[new screen]`

**Who:** a member with an app account whose sign-in address the club asked to change (3.4 C).

**Trigger:**
- `GET /me` returns `pending_email_change: true`.
- The new address itself is **not** returned. The member knows it; the screen must not print it.

**Rule:** never block the member at the front desk. The QR code, card and bookings keep working while a change is pending.

**Entry point, in « Carte » (`NgWGe`):**
- A banner at the top: « Confirmez votre nouvelle adresse e-mail ».
- Sub-line « Saisissez le code reçu pour terminer le changement. »
- Chevron; the banner opens the code screen.
- It stays until the change is confirmed or expires.

**Code screen: « Confirmer votre nouvelle adresse »**
- Text: « Votre club a demandé à changer votre adresse de connexion. Nous avons envoyé un code de vérification à la nouvelle adresse. »
- 6-digit code input: one box per digit, auto-advance, paste support, 44px boxes.
- Primary « Confirmer ».
- Text button « Renvoyer le code », disabled with a countdown « Renvoyer le code (0:45) » for 60 s after sending.
- Text button « Plus tard » returns to Carte.
- Small print: « Sans confirmation sous 24 h, votre adresse actuelle est conservée. »

**Errors (inline under the code)**

| Cause | Copy |
| --- | --- |
| Wrong code | « Code incorrect. » |
| Expired code | « Ce code a expiré. Demandez-en un nouveau. » |
| Too many attempts | « Trop d'essais. Réessayez dans quelques minutes. » |
| Address taken meanwhile | « Cette adresse n'est plus disponible. Contactez votre club. » (no retry; « Retour ») |
| No change pending any more (expired or failed) | Full state: « Ce changement d'adresse a expiré. Demandez à votre club d'en relancer un. » + « Retour » |
| Network | « Connexion impossible. Réessayez. » |

**Success screen:**
- Check glyph, title « Adresse modifiée ».
- Text « Pour votre sécurité, vous allez être déconnecté. Reconnectez-vous avec votre nouvelle adresse. »
- Primary « Se reconnecter », which goes to « Connexion » (`J237z`).

**Also, a small update to « Connexion » (`J237z`):** an optional notice when the session was closed remotely (staff sign-out or e-mail change): « Votre session a pris fin. Reconnectez-vous. » Neutral banner above the form.

**Frames (390×844):**
- Carte with the banner;
- code screen (empty; filled; error « Code incorrect »; resend countdown);
- expired state;
- success;
- Connexion with the session-ended notice.

---

## 7. Code only `[no design]`

- `GET /members/{mid}/venues`: the access dialog already reads the profile's `access`.
- `version` / `expected_version` on edits: already built in SP-H; the conflict banner is listed in 3.1.
- Polling cadence and back-off for operations, and idempotency keys for the e-mail change.
- Search debounce, request cancellation, and keeping personal data out of URLs (search is a `POST`).
- Reading `effective_mode` and `provisioning` from the create response.

---

## 8. Frames to produce

| # | Frame | Base | Tag |
| --- | --- | --- | --- |
| 1 | Membres · Recherche (results, scope toggle, 4 tabs, « Afficher plus ») | `xLxJY` | update |
| 2 | Membres · Aucun résultat / erreur | `xLxJY` | update |
| 3 | Membres · Téléphone | `xLxJY` | update |
| 4 | Ajouter un membre · Avec l'app (hint, required e-mail) | `nVkMG` | update |
| 5 | Ajouter un membre · Fiche seule | `nVkMG` | update |
| 6 | Ajouter un membre · Réceptionniste (venue fixed) + error duplicate | `nVkMG` | update |
| 7 | Membre · Fiche · App activée (new sections, no « Statut du compte ») | `L6sMyP` | update |
| 8 | Membre · Fiche · Invitation envoyée + renvoi en cours | `L6sMyP` | update |
| 9 | Membre · Fiche · Invitation échouée | `L6sMyP` | update |
| 10 | Membre · Fiche · Changement d'adresse en attente | `L6sMyP` | update |
| 11 | Membre · Fiche · Fiche seule (roster) | `L6sMyP` | update |
| 12 | Membre · Fiche · Vue réceptionniste | `L6sMyP` | update |
| 13 | Membre · Renvoyer l'invitation / Relancer (dialogs) | new | new |
| 14 | Membre · Changer l'adresse de connexion (+ erreur) | new | new |
| 15 | Membre · Déconnecter de tous les appareils | new | new |
| 16 | Membre · Présences (list, empty, phone) | `L6sMyP` | update |
| 17 | Membre · Fiche · Téléphone | `L6sMyP` | update |
| 18 | Réglages · Connexion des membres (+ Sécurité) | new | new |
| 19 | Réglages · Plan rétrogradé / verrouillé | new | new |
| 20 | Réglages · Téléphone | new | new |
| 21 | App membre · Carte avec bannière | `NgWGe` | update |
| 22 | App membre · Confirmer la nouvelle adresse (empty, filled, error, countdown) | new | new |
| 23 | App membre · Changement expiré / Adresse modifiée | new | new |
| 24 | App membre · Connexion · Session terminée | `J237z` | update |

**Suggested order:**
1. Member page account section and dialogs (7–15). This carries the most states and unblocks the member app flow.
2. Member app confirmation (21–24).
3. Directory (1–3) and create (4–6).
4. Présences (16).
5. Réglages (18–20).

Export PNGs to `docs/design-refs/comptoir-clair/members/` with an `INVENTORY.md` (frame id, name, verbatim copy), like `wave-2/`.

## 9. Open design choices

- **App badge tones:** « Invitation envoyée » and « Compte existant lié » in the info tint vs neutral; how loud « Invitation échouée » should be next to the status badge.
- **Placement of « Accès à l'app »:** right column under the form (proposed) vs left column under « Adhésion »; the page gets long on desktop either way.
- **Sign-out location:** « Zone sensible » (proposed, since it cuts access) vs inside « Accès à l'app ».
- **Présences extras:** whether it gets a small visual summary (weekly strip) or stays text-only.
- **Directory scope control:** pill pair vs select; whether the selected venue name appears as the page subtitle.
- **Member app banner:** tone of the Carte banner (neutral with icon vs warning tint), given that the QR must stay the hero of the screen.
