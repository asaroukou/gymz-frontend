# Member management — frame inventory

Written for engineers implementing the member-management frames without opening pen.dev. Source: `screens.pen` (canvas rows « Flux · 10 » to « Flux · 14 », plus « Flux · 11 » in the member-app column), PNG exports in this folder (`<frameId>.png`, 1x), and the brief `docs/design-briefs/2026-09-28-member-management.md` (contract `iziwellpass` b572a8b). All copy is verbatim French from the canvas text nodes.

## Table of contents

| Brief # | Frame ID | Canvas name | Flow |
|---|---|---|---|
| 7 | caWdo | Membre · Fiche · App activée | 10 · Fiche membre |
| 8 | B50o8G | Membre · Fiche · Invitation envoyée · renvoi en cours | 10 · Fiche membre |
| 9 | bvlFy | Membre · Fiche · Invitation échouée | 10 · Fiche membre |
| 10 | x7QjF | Membre · Fiche · Changement d'adresse en attente | 10 · Fiche membre |
| 11 | pb6r0 | Membre · Fiche · Fiche seule (sans app) | 10 · Fiche membre |
| 12 | iWohO | Membre · Fiche · Vue réceptionniste | 10 · Fiche membre |
| 13 | f4Mtn | Membre · Renvoyer l'invitation | 10 · Dialogues |
| 13 | w6dqTN | Membre · Relancer la création de l'accès | 10 · Dialogues |
| 13 | L8mxU | Membre · Relancer · refusé (409) | 10 · Dialogues |
| 14 | tbCt2 | Membre · Changer l'adresse de connexion | 10 · Dialogues |
| 14 | OXBVd | Membre · Changer l'adresse · erreur | 10 · Dialogues |
| 15 | eLtfl | Membre · Déconnecter de tous les appareils | 10 · Dialogues |
| 3.2–3.4 | WeVjb | Membre · Accès à l'app · états et résultats | 10 · Référence |
| 17 | TOqY8 | Membre · Fiche · Téléphone · App activée | 10 · Téléphone |
| 17 | s3tkfq | Membre · Téléphone · Déconnecter de tous les appareils | 10 · Téléphone |
| 16 | Z9CwGl | Membre · Présences · états | 10 · Présences |
| 21 | c4qkl7 | Membre · Carte · Bannière nouvelle adresse | 11 · App membre |
| 22 | gTXh4 | Membre · Nouvelle adresse · Code · vide | 11 · App membre |
| 22 | DurV4 | Membre · Nouvelle adresse · Code · saisi · renvoi 0:45 | 11 · App membre |
| 22 | iNJZZ | Membre · Nouvelle adresse · Code · incorrect | 11 · App membre |
| 23 | plDHB | Membre · Nouvelle adresse · Changement expiré | 11 · App membre |
| 23 | F95Y7E | Membre · Nouvelle adresse · Adresse modifiée | 11 · App membre |
| 22 | QR7n0 | Membre · Nouvelle adresse · Adresse plus disponible | 11 · App membre |
| 24 | o5BPGj | Membre · Connexion · Session terminée | 11 · App membre |
| 1 | bRCjD | Membres · Recherche | 12 · Annuaire |
| 1 | ZInet | Membres · Recherche en cours | 12 · Annuaire |
| 2 | F7kU0F | Membres · Aucun résultat | 12 · Annuaire |
| 2 | rgAty | Membres · Onglet vide | 12 · Annuaire |
| 2 | cKk1G | Membres · Premier membre | 12 · Annuaire |
| 2 | Cl2bM | Membres · Chargement | 12 · Annuaire |
| 2 | b9IMGN | Membres · Erreur | 12 · Annuaire |
| 1 | ab1dg | Membres · Chargement de la suite · membre ajouté | 12 · Annuaire |
| 3 | f0WPx | Membres · Téléphone | 12 · Annuaire |
| 4 | MPUpF | Membres · Ajouter un membre · Avec l'app | 13 · Ajout |
| 5 | iYDIz | Membres · Ajouter un membre · Fiche seule | 13 · Ajout |
| 6 | eRgU6 | Membres · Ajouter un membre · Réceptionniste · e-mail déjà utilisé | 13 · Ajout |
| 4 | C5aey | Membres · Ajouter un membre · Avec l'app · e-mail manquant | 13 · Ajout |
| 4 | Xvbmu | Membres · Ajouter un membre · Téléphone · Avec l'app | 13 · Ajout |
| 18 | yw4t9 | Réglages · Connexion des membres | 14 · Réglages |
| 19 | L7nrt | Réglages · Plan rétrogradé | 14 · Réglages |
| 19 | I2dKEo | Réglages · Verrouillé (plan gratuit) | 14 · Réglages |
| 18 | GD3ef | Réglages · Enregistrement refusé | 14 · Réglages |
| 18 | MGrdU | Réglages · Chargement | 14 · Réglages |
| 18 | dkkTG | Réglages · Erreur | 14 · Réglages |
| 20 | tJQXE | Réglages · Téléphone | 14 · Réglages |

The original frames `xLxJY`, `nVkMG`, `L6sMyP`, `NgWGe` and `J237z` are untouched; every update is drawn as a new frame next to them.

---

## Decisions on the brief's open choices (§9)

- **App badge tones.** « Invitation envoyée » and « Compte existant lié » use Badge/Info. « App activée » uses Badge/Succès. « Invitation échouée » uses Badge/Erreur, the same weight as « Suspendu ». « Création en cours » and « Accès app » use Badge/Neutre, « Sans app » uses Badge/Outline.
- **« Accès à l'app » placement.** Right column, between « Modifier le membre » and « Zone sensible », as proposed. On phone it follows « Modifier le membre ».
- **Sign-out.** Lives in « Zone sensible » as an outline pill with danger-coloured label and `log-out` icon. Lifecycle and sign-out buttons stack vertically, because both do not fit side by side in the 502 px column.
- **Présences.** Text-only summary, no weekly strip.
- **Directory scope control.** Drawn as a compact select (« Cet établissement » / « Tous les établissements »), 230 px, between search and status tabs. A pill pair would squeeze the search field below the width of its placeholder. The subtitle shows the selected venue name, « Studio Dakar Plateau ».
- **Member-app banner.** Neutral grey pill (`$pill`) with a `mail` icon and a chevron. No warning tint, so the pass tile and « Afficher mon QR » stay the hero.

## Shared patterns

- **Operation status row.** One line under the section's actions: 16 px Lucide icon plus 14 px text, no container. In progress: `loader-circle`, `$muted-strong`, regular weight. Waiting for the member: `mail`, `$muted-strong`. Done: `circle-check`, `$succes-texte`, 500. Failed: `circle-alert`, `$erreur-texte`, 500. « Actualiser » is an underlined 14/500 ink text button under the line. The button that started the operation drops to 45 % opacity while it runs.
- **Key/value rows in « Accès à l'app ».** Hairline on top of every row after the first, 12 px vertical padding. Key 15 px `$muted`, value 15/500 ink or a badge. The explanation sits under the row at 13 px `$muted`.
- **Read-only field.** Same as Input but `$side` fill, `$muted-strong` value and a 16 px `lock` icon on the right. Helper at 13 px `$muted`. Link under it: 13/500 ink, underlined.
- **Dialogs.** 480 px, radius 28, padding 32, gap 24, ghost « Annuler » and a primary or danger confirm, close icon button top right. Phone uses a bottom sheet with a grab handle and full-width 52 px buttons.

---

## Flow 10 · Fiche membre (`L6sMyP` updated)

### caWdo · Membre · Fiche · App activée

**Changes from `L6sMyP`**: « Statut du compte » removed from the form. E-mail field read-only. New « Accès à l'app » section. « Zone sensible » shows one lifecycle button plus sign-out. New « Présences » section in the left column after « Abonnements ». Header gets the app badge after « Tous les établissements ».
**Copy**:
- Header badge: « App activée »
- E-mail helper: « Adresse de connexion : elle se change par une procédure sécurisée. »
- Link: « Changer l'adresse de connexion »
- Section title: « Accès à l'app ». Subtitle: « Connexion du membre à l'app IziWellPass : carte, QR code, réservations. »
- Row « Accès »: badge « App activée », line « Le membre se connecte à l'app. »
- Row « Adresse de connexion »: « awa.ndiaye@gmail.com »
- Row « Dernière action »: « Invitation acceptée le 3 mars à 10:12 »
- Action: « Changer l'adresse »
- Zone sensible: « Suspendre le membre », « Déconnecter de tous les appareils »
- Présences: title « Présences », summary « 12 passages sur 30 jours · Dernier passage hier à 18:04 », pills « 7 jours · 30 jours · 90 jours », select « Tous les établissements », rows (date, time, venue, kind, method badge):
  - « dim. 27 sept. » « 18:04 » « Studio Dakar Plateau » « Réservation » « QR »
  - « ven. 25 sept. » « 07:12 » « Studio Almadies » « Sans réservation » « Wallet »
  - « mer. 23 sept. » « 18:30 » « Studio Dakar Plateau » « Réservation » « QR »
  - « lun. 21 sept. » « 06:45 » « Studio Dakar Plateau » « Sans réservation » « Manuel »
  - « sam. 19 sept. » « 10:02 » « Studio Almadies » « Réservation » « QR »
  - Button « Afficher plus »
- Method badges: QR is Badge/Info, Manuel is Badge/Neutre, Wallet is Badge/Outline.

### B50o8G · Membre · Fiche · Invitation envoyée · renvoi en cours

- Header badge and row badge: « Invitation envoyée ». Line: « Le membre n'a pas encore choisi son mot de passe. »
- « Dernière action »: « Invitation envoyée le 25 sept. à 14:32 »
- Actions: « Renvoyer l'invitation » (disabled, 45 %), « Changer l'adresse »
- Status row: « Envoi de l'invitation… »

### bvlFy · Membre · Fiche · Invitation échouée

- Header badge and row badge: « Invitation échouée »
- Lines: « Cette adresse est déjà liée à un autre membre. » (`$erreur-texte`) then « Corrigez l'adresse si besoin, puis relancez. »
- E-mail field editable again, helper: « Corrigez l'adresse si besoin, enregistrez, puis relancez la création de l'accès. »
- « Dernière action »: « Échec de création le 25 sept. à 14:33 »
- Action: « Relancer la création de l'accès »
- Zone sensible: no sign-out, because no access exists.

### x7QjF · Membre · Fiche · Changement d'adresse en attente

- Under the top-right e-mail: « Changement d'adresse en attente » (12/500 muted)
- Row « Adresse de connexion »: « awa.ndiaye@gmail.com » over badge « Changement en attente » (Badge/Attention). Line: « Le membre doit saisir le code reçu à sa nouvelle adresse (24 h). Il se connecte avec l'adresse actuelle d'ici là. »
- « Dernière action »: « Changement demandé le 28 sept. à 09:15 »
- Status row: « Code envoyé à la nouvelle adresse. En attente de confirmation par le membre. »
- Toast, shown once right after sending: « Code envoyé à awa.diop@gmail.com » « 09:15 ». The new address never appears on the page itself.

### pb6r0 · Membre · Fiche · Fiche seule (sans app)

- Header badge and row badge: « Sans app ». Line: « Ce membre n'a pas d'accès à l'app. »
- No address row, no « Dernière action », no actions, no sign-out. E-mail field editable as before.

### iWohO · Membre · Fiche · Vue réceptionniste

- User menu: « Fatou Sarr », « Réceptionniste »
- Same account rows as B50o8G, no buttons, no « Changer l'adresse de connexion » link, no sign-out.
- Quiet line with `shield` icon: « Seul un propriétaire ou un administrateur peut agir sur l'accès à l'app. »
- Présences: only their venue, so no venue select.

## Flow 10 · Dialogues

### f4Mtn · Membre · Renvoyer l'invitation
- Title « Renvoyer l'invitation ? ». Text « Awa recevra un nouvel e-mail avec un nouveau mot de passe temporaire. Le précédent ne fonctionnera plus. » Buttons « Annuler », « Renvoyer ».

### w6dqTN · Membre · Relancer la création de l'accès
- Title « Relancer la création de l'accès ? ». Text « Une invitation sera envoyée à awa.ndiaye@gmail.com. » Buttons « Annuler », « Relancer ».

### L8mxU · Membre · Relancer · refusé (409)
- Same dialog with an error alert: « Votre club ne donne plus accès à l'app aux nouveaux membres. Modifiez ce réglage dans Réglages. » Link « Ouvrir les réglages ». « Relancer » disabled.
- Same slot for `CONFLICT`: « Cette adresse est déjà utilisée par un autre membre. »

### tbCt2 · Membre · Changer l'adresse de connexion
- Title « Changer l'adresse de connexion »
- Read-only row « Adresse actuelle » / « awa.ndiaye@gmail.com »
- Field « Nouvelle adresse », value « awa.diop@gmail.com »
- « Le membre recevra un code à la nouvelle adresse et devra le saisir dans l'app. D'ici là, il continue de se connecter avec l'adresse actuelle. Sans confirmation sous 24 h, le changement est annulé. »
- « S'il ne s'est jamais connecté, l'adresse est remplacée tout de suite et une nouvelle invitation y est envoyée. »
- Buttons « Annuler », « Envoyer le code »

### OXBVd · Membre · Changer l'adresse · erreur
- Field with `$danger` stroke and error under it: « Un changement vers une autre adresse est déjà en cours. Attendez qu'il aboutisse ou expire (24 h). »
- Same slot for the other inline errors: « C'est déjà l'adresse actuelle. » · « Adresse e-mail invalide. » · « Cette adresse est déjà utilisée. » · « Ce compte sert aussi ailleurs sur IziWellPass : contactez le support. » · « L'accès du membre n'est pas encore créé. » · « Demande en cours de traitement. Réessayez dans un instant. »

### eLtfl · Membre · Déconnecter de tous les appareils
- Title « Déconnecter Awa de tous ses appareils ? ». Text « Il devra se reconnecter avec son mot de passe. L'effet peut prendre jusqu'à 10 minutes. » Buttons « Annuler », « Déconnecter » (danger).

### s3tkfq · Membre · Téléphone · Déconnecter de tous les appareils
- Bottom sheet with the same copy. « Déconnecter » (danger) above « Annuler », both full width.

## Flow 10 · Référence

### WeVjb · Membre · Accès à l'app · états et résultats
Spec board, not a screen. It lists:
- every `account.invitation` state with its badge, explanation and owner/admin actions (brief §3.2 table);
- the four `provisioning.failure_code` lines;
- the `account.email` states « Changement en attente » and « Changement échoué »;
- the five operation states with every in-progress and done line (§3.3), including « Toujours en cours. Cela peut prendre quelques minutes. » + « Actualiser »;
- the results for Renvoyer, Relancer, Changer l'adresse and Déconnecter (§3.4);
- « Zone sensible » for active (« Suspendre le membre » + sign-out), suspended (« Réactiver ») and expired or cancelled members.

## Flow 10 · Présences

### Z9CwGl · Membre · Présences · états
Six cells at the real 502 px width:
- Chargement: 5 skeleton rows and a skeleton summary.
- Période vide: summary « 0 passage sur 30 jours · Dernier passage le 12 juin 2026 », then « Aucun passage sur les 30 derniers jours. » and « Dernier passage le 12 juin 2026. »
- Jamais venu: « Aucun passage enregistré pour ce membre. »
- Chargement de la suite: « Afficher plus » with a spinner at 60 %.
- Erreur: « Impossible de charger les présences. » + « Réessayer »
- Réceptionniste, un seul établissement: no venue select, no venue name on rows. Summary « 4 passages sur 7 jours · Dernier passage hier à 18:04 ».

### TOqY8 · Membre · Fiche · Téléphone · App activée
Full-scroll capture, 390 × 2965. Order: header, Adhésion, Abonnements, Présences, Modifier le membre, Accès à l'app, Zone sensible. Présences summary wraps to two lines. Period pills and the venue select scroll horizontally in one row. Each visit stacks date and time over venue, kind and badge. Account key/value rows stack label over value. Buttons are 44 px.

## Flow 11 · App membre

### c4qkl7 · Membre · Carte · Bannière nouvelle adresse
- Banner between the greeting and the pass: « Confirmez votre nouvelle adresse e-mail » / « Saisissez le code reçu pour terminer le changement. » with a chevron. « Se déconnecter » falls below the fold.

### gTXh4, DurV4, iNJZZ, QR7n0 · Code screens
- Title « Confirmer votre nouvelle adresse »
- Text « Votre club a demandé à changer votre adresse de connexion. Nous avons envoyé un code de vérification à la nouvelle adresse. »
- Label « Code de vérification », six 56 px boxes. Focused box has a 2 px ink stroke and a caret.
- « Confirmer » (disabled until six digits), « Renvoyer le code », « Plus tard »
- Foot « Sans confirmation sous 24 h, votre adresse actuelle est conservée. »
- DurV4: filled « 482916 », « Renvoyer le code (0:45) » disabled.
- iNJZZ: boxes with `$danger` stroke, error « Code incorrect. » The same slot carries « Ce code a expiré. Demandez-en un nouveau. » · « Trop d'essais. Réessayez dans quelques minutes. » · « Connexion impossible. Réessayez. »
- QR7n0: error « Cette adresse n'est plus disponible. Contactez votre club. », no retry, only « Retour ».

### plDHB · Membre · Nouvelle adresse · Changement expiré
- « Ce changement d'adresse a expiré. Demandez à votre club d'en relancer un. » + « Retour »

### F95Y7E · Membre · Nouvelle adresse · Adresse modifiée
- Check glyph on the success tint, title « Adresse modifiée », text « Pour votre sécurité, vous allez être déconnecté. Reconnectez-vous avec votre nouvelle adresse. », primary « Se reconnecter ». No back button.

### o5BPGj · Membre · Connexion · Session terminée
- Neutral notice above the e-mail field: « Votre session a pris fin. Reconnectez-vous. »

## Flow 12 · Annuaire (`xLxJY` updated)

### bRCjD · Membres · Recherche
- Subtitle « Studio Dakar Plateau » replaces « 128 membres ».
- Search placeholder « Rechercher par nom, e-mail ou téléphone ». Scope select « Cet établissement ». Tabs « Tous · Actifs · Expirés · Suspendus ».
- Numbered pager and « 8 membres sur 128 » removed. One « Afficher plus » under the table. No count line.
- The former « Annulé » row now reads « Expiré ».

### Other directory states
- ZInet: query « ndi », spinner and clear « × » in the field, previous rows kept.
- F7kU0F: query « kofi », « Aucun membre ne correspond à « kofi ». » + « Effacer la recherche »
- rgAty: tab « Suspendus » active, « Aucun membre suspendu. »
- cKk1G: toolbar and header button hidden. « Ajoutez votre premier membre », « Ses abonnements, ses passages et son accès à l'app se gèrent ensuite depuis sa fiche. », primary « Ajouter un membre ».
- Cl2bM: 8 skeleton rows.
- b9IMGN: « Impossible de charger les membres. » + « Réessayer »
- ab1dg: « Afficher plus » with a spinner, toast « Membre ajouté. Envoi de l'invitation… »
- f0WPx (phone): title, subtitle, « Ajouter », search « Nom, e-mail ou téléphone », scrolling pill row (scope select then tabs), rows with name, contact line, status badge and a 44 px « ··· », full-width « Afficher plus ».

## Flow 13 · Ajout (`nVkMG` updated)

- MPUpF: hint under the title with `smartphone` icon, « Le membre recevra une invitation par e-mail pour utiliser l'app. » E-mail helper « Obligatoire : il sert d'identifiant dans l'app. »
- iYDIz: hint with `file-text` icon, « Fiche sans accès à l'app. L'équipe gère tout depuis la console. » Label « E-mail (facultatif) ».
- eRgU6: receptionist, no hint. « Accès aux établissements » is a read-only line « Studio Dakar Plateau » with a lock. E-mail error « Un membre utilise déjà cette adresse. » Scope select hidden on the directory behind.
- C5aey: login mode, empty e-mail, error « L'e-mail est obligatoire : ce club donne accès à l'app à ses membres. »
- Xvbmu (phone): full-screen form, « Ajouter le membre » and « Ajouter et enchaîner » pinned at the bottom.
- Not drawn: « Adresse e-mail invalide. » uses the same error slot. Toasts are « Membre ajouté » for roster and « Membre ajouté. Envoi de l'invitation… » for login.

## Flow 14 · Réglages (new)

- Nav: « Réglages » with `settings-2`, last item of « Organisation », active pill.
- Page: « Réglages », « S'appliquent à toute l'organisation, dans tous les établissements. » One 720 px column.
- Section « Connexion des membres », text « Décide si les nouveaux membres reçoivent un accès à l'app. Ce réglage vaut pour toute l'organisation. »
- Options, selected one on a grey pill, hairline between:
  - « Avec l'app » / « Chaque nouveau membre reçoit une invitation par e-mail pour utiliser l'app IziWellPass : carte, QR code, réservations. L'e-mail devient obligatoire à la création. »
  - « Fiche seule » / « Les nouveaux membres sont enregistrés sans accès à l'app. L'équipe gère tout depuis la console. »
- Foot « Ce réglage ne concerne que les nouveaux membres. Les accès existants sont conservés. » Primary « Enregistrer », disabled until the selection changes. Toast after saving: « Réglage enregistré ».
- Section « Sécurité », row « Double authentification » / « Un code de votre application d'authentification est demandé à chaque connexion. » with badge « Activée ».
- L7nrt: warning « Votre plan n'inclut plus l'espace membre : les nouveaux membres sont créés sans accès à l'app. » + « Voir les plans ». « Avec l'app » stays selected with the outline tag « Inactif avec votre plan ».
- I2dKEo: « Fiche seule » selected. « Avec l'app » muted with a lock, « Disponible avec le plan Starter » + « Voir les plans ». Double authentification « Désactivée » + « Activer ».
- GD3ef: « Avec l'app » newly selected, « Enregistrer » enabled, error « Votre plan ne permet pas l'accès des membres à l'app. »
- MGrdU: skeleton of both options and the badge.
- dkkTG: « Impossible de charger les réglages. » + « Réessayer »
- tJQXE (phone): same sections stacked, full-width « Enregistrer », badge under the security text.

## Copy to check

- The sign-out dialog keeps the brief's « Il devra se reconnecter… » and « Déconnecter {Prénom} de tous ses appareils ? ». With a woman's name it reads « Déconnecter Awa… Il devra… ». The app does not know the member's gender, so a neutral line such as « Une nouvelle connexion avec le mot de passe sera nécessaire. » would read better. The same applies to « vous allez être déconnecté » on F95Y7E.
