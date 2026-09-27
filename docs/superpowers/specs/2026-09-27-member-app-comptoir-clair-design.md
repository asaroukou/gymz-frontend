# SP-M — Member app on « Le comptoir clair »

**Date:** 2026-09-27
**Status:** approved design, ready for one plan
**Builds on:** SP-A tokens (web `packages/ui/src/styles/globals.css`), SP-D0 API sync (member `/me/*` hooks take an optional venue selector first), Tailwind root-cause fix 3e63ce6 (member app stays on NativeWind 4 / Tailwind 3).
**Canvas frames (source of truth, `screens.pen`, all 390×844):**
- Connexion: `J237z` Membre · Connexion, `BQAl7` Membre · Choisir un mot de passe, `DeeZA` Membre · Connexion · Erreur
- Carte: `NgWGe` Membre · Carte, `Q3ohJw` Carte · Carnet d'entrées, `HAIgO` Carte · Abonnement expiré, `bRIoW` Carte · Sans abonnement
- QR: `SHbyT` QR · Actif, `OHQlt` QR · Expiré, `vCv3M` QR · Avant génération, `pRb9A` QR · Indisponible
- Réservations: `d14X6` Réservations, `Y1K4c` Réservations · Annuler, `tDcja` Réservations · Vide, `H8Zdj4` Réservations · Délai dépassé

PNG exports: `docs/design-refs/comptoir-clair/member/<id>.png` (2×).

## 1. Purpose

The member app (Expo SDK 57, React Native 0.86, NativeWind 4) still wears the pre-studio look: green ink `#0c3d22`, Hanken Grotesk and Geist Mono, warm stone neutrals. The canvas now draws the member app in « Le comptoir clair », the same system as the owner console. SP-M restyles the app to the 15 frames and aligns its copy, keeping its screens, data hooks and behaviour. It also fixes one real bug the frames expose: Réservations shows when a booking was *made* (`booked_at`), not when the session is.

## 2. Decisions

- **M1 — Canvas look and copy win** (as SP-E E1 / SP-G T1), **except where data or policy contradict the illustration**:
  - Password rules follow the Cognito pool policy (shared by staff and members): 12 characters minimum, one uppercase, one lowercase, one digit. The canvas's « 8 caractères minimum » checklist is illustrative; the checklist shows the four real rules.
  - « Nº membre » shows the existing member-id prefix (first 8 characters, uppercase); « IWP-4821 » is illustrative.
  - « Carnet 10 entrées » needs the pack total, which the API does not expose; the line reads « {n} entrées restantes ».
  - Réservations rows show a neutral title (M8); class, room and instructor names are not exposed to members.
- **M2 — Restyle in place, tokens first.** `lib/theme.ts` stays the single native token source consumed by `tailwind.config.js`; components and screens keep their structure and logic. No shared cross-platform token package.
- **M3 — Tokens are pinned to the web.** A unit test reads `packages/ui/src/styles/globals.css` and asserts every shared value in `theme.ts` equals its web counterpart, so the two apps cannot drift.
- **M4 — Inter everywhere.** `@expo-google-fonts/inter` 400/500/600 replaces Hanken Grotesk and Geist Mono (both removed from dependencies). Numerals (times, countdown, member number, entry count) use Inter with `fontVariant: ['tabular-nums']`. The font gate in `app/_layout.tsx` keeps its behaviour (wait for fonts; `fontError` falls back to the system font).
- **M5 — Light theme only**, as today.
- **M6 — QR is generated on tap.** The screen opens in the « Avant génération » state; « Générer mon QR » mints the token (today it mints on open). « Régénérer » re-mints after expiry. Brightness boost stays while a live code is shown and is restored when leaving the screen or when the code expires.
- **M7 — Venue name comes from `/me/memberships`** (`gym_name`), choosing the membership whose `venue_id` equals the first id of `/me/venues` (the venue the QR is minted for), else the first membership. No venue picker in SP-M.
- **M8 — Session times come from `/me/slots`.** Réservations joins each booking's `slot_id` with `GET /me/slots?venue_id=<venue>&from=<today−30>&to=<today+30>` (the backend caps ranges below 62 days). Rows show the session's weekday, day number and start time in the device's local time. A booking whose slot is not in that window shows « Date indisponible » instead of any date. The row title is « Séance ». Backend follow-up (out of scope): enrich `GET /me/bookings` with slot start/end, class title, room and instructor names.
- **M9 — Bottom sheet, not system alert.** Cancelling a booking opens an in-app bottom sheet (`Y1K4c`), replacing `Alert.alert`.
- **M10 — One toast primitive** for transient errors (`H8Zdj4`): dark pill at the bottom above the tab bar, title + description, auto-dismiss after 4 s, `accessibilityLiveRegion="polite"`.
- **M11 — Touch targets ≥ 44 pt**; primary buttons 52 pt tall; tab bar 84 pt including the home-indicator inset.

## 3. Tokens (`lib/theme.ts`)

| Token | Value | Web variable |
| --- | --- | --- |
| `ink` (primary, foreground) | `#1f1f1f` | `--primary` / `--foreground` |
| `inkHover` | `#333333` | (canvas `primary-hover`) |
| `background` | `#ffffff` | `--background` |
| `side` | `#fafafa` | `--side` |
| `secondary` (pill grey) | `#eceef2` | `--secondary` |
| `muted` (text) | `#5f6368` | `--muted-foreground` |
| `mutedStrong` | `#4d5156` | `--muted-strong` |
| `border` (hairline) | `#dcdcdc` | `--border` |
| `success` / `successForeground` | `#e9f3ee` / `#1d5c3c` | `--success` / `--success-foreground` |
| `warning` / `warningForeground` | `#fbf1dc` / `#7a5c10` | `--warning` / `--warning-foreground` |
| `destructive` / `destructiveForeground` | `#fbe9e7` / `#8f2f22` | `--destructive` / `--destructive-foreground` |
| `info` / `infoForeground` | `#e8eefb` / `#2c4f8a` | `--info` / `--info-foreground` |
| `tint.bleu / vert / sable / rose / lavande` | `#e8eefb` / `#e9f3ee` / `#fbf1dc` / `#f6ecf2` / `#eee9f8` | `--tint-*` |

Radii: `field` 12, `card` 16, `panel` 24, `pill` 999. `tailwind.config.js` maps these to NativeWind classes (`bg-ink`, `text-muted`, `bg-tint-vert`, `rounded-pill`, `font-sans`, `font-sans-medium`, `font-sans-semibold`); old class names (`bg-primary`, `neutral-*`, `font-mono*`) are removed and every usage migrated.

## 4. Shared components

| Component | Change |
| --- | --- |
| `components/ui/text.tsx` (`AppText`) | Variants on Inter: `display` 32/500, `title` 28/500, `heading` 17/600, `body` 15/400, `label` 13/400 muted, `numeric` (tabular), `numericLarge` 40/500 |
| `components/ui/button.tsx` | Variants `primary` (ink pill, white label, 52 pt), `secondary` (white, 1 px hairline), `ghost` (text only, icon optional), `destructive` (destructive tint, destructive-foreground label); `loading`, `disabled`, `icon`, `fullWidth` kept |
| `components/ui/status-badge.tsx` | Pill 13/500; variants success / warning / neutral (`secondary` + `mutedStrong`) / info / destructive, from the existing `statusBadgeVariant` logic |
| `components/ui/card.tsx` | Rounded 24 panel; `tint` prop (default none) |
| `components/ui/screen.tsx` | White page, 24 pt gutters, safe-area aware; optional `wash` prop (soft blue radial wash at the top, login only) |
| `components/form/field.tsx` | Pill inputs 52 pt, label 13/500 above, hairline border, focus ring ink, error state (destructive border + message); password fields get an eye toggle (`accessibilityLabel` « Afficher le mot de passe » / « Masquer le mot de passe ») |
| New `components/ui/notice.tsx` | Inline tinted notice (icon + text), variants destructive / warning / info |
| New `components/ui/sheet.tsx` | Bottom sheet over a scrim: title, description, stacked actions; closes on scrim tap, back button and « Garder » |
| New `components/ui/toast.tsx` | M10; a small provider in `components/providers.tsx` exposes `showToast({ title, description })` |
| New `components/ui/progress-bar.tsx` | 4 pt track (`secondary`) with ink fill; `accessibilityRole="progressbar"` |
| New `components/ui/avatar.tsx` | Initials on a tint, 40 pt |
| Tab bar (`app/(app)/_layout.tsx`) | White bar, top hairline, Lucide icons stroke 1.5 (`Wallet`, `QrCode`, `CalendarCheck`), Inter 12 labels, active tab = grey pill (`secondary`) behind icon + label, inactive = `muted` |

## 5. Screens

### 5.1 Connexion (`J237z`, `DeeZA`, `BQAl7`)

- Screen with `wash`; wordmark (ink square + « IziWellPass »), title « Connexion », subtitle « Votre carte de membre, toujours à portée de main. »; fields « E-mail », « Mot de passe »; primary « Se connecter »; bottom footnote « Votre accès est créé par votre salle. Contactez l'accueil si besoin. ».
- Wrong credentials: destructive `Notice` « E-mail ou mot de passe incorrect. » above the fields (the footnote hides while the notice shows, as drawn); other errors keep their existing copy in the same notice.
- New-password challenge (`BQAl7`): « Retour » (ghost, chevron) back to Connexion, title « Choisir un mot de passe », subtitle « Créez votre mot de passe pour terminer l'activation. », fields « Nouveau mot de passe » and « Confirmer le mot de passe », live checklist (M1 rules: « 12 caractères minimum », « Une majuscule », « Une minuscule », « Un chiffre »; check icon success-foreground when met, muted dot when not), primary « Valider » (disabled until all rules pass and both fields match; mismatch shows « Les mots de passe ne correspondent pas. » under the confirm field).

### 5.2 Carte (`NgWGe`, `Q3ohJw`, `HAIgO`, `bRIoW`)

- Header: date line (« Samedi 20 septembre », device local date, capitalised weekday) 13 muted, title « Bonjour {prénom} » (claims name; « Bonjour » alone when unknown).
- Pass card (`Card tint="vert"`, radius 24, padding 20):
  - Row: venue name (M7) 13 mutedStrong · status badge right.
  - Member name 22/600.
  - State line (from `cardView`, §6):
    - active with an expiry date: « Valable jusqu'au {date longue} » 17/600;
    - entry pack: `{n}` numericLarge + « entrées restantes »;
    - expired: « Expiré le {date longue} » 17/600, badge « Expiré » (warning);
    - no subscription: « Aucun abonnement actif » 17/600 + « Rapprochez-vous de l'accueil pour en souscrire un. » 13 mutedStrong, badge « Aucun abonnement » (neutral).
  - Plan line 13 mutedStrong (not shown without a subscription): type label (`monthly` « Mensuel », `annual` « Annuel », `drop_in` « À la séance », `trial` « Essai ») + « illimité » when `entries_remaining` is null, + « · Renouvelé chaque mois » / « · Renouvelé chaque année » only for an active monthly / annual subscription.
  - Bottom row: « Nº membre » label + value (numeric), right « Membre depuis {mois année} ».
- « Afficher mon QR » primary with QR icon (hidden without a subscription), navigates to QR.
- « Coordonnées » heading, hairline rows label (13 muted) / value (15): « E-mail », « Téléphone » (numeric), « Salle » (venue name). Rows with no value are omitted.
- « Se déconnecter » ghost with `LogOut` icon, centered.
- Loading: card-shaped skeleton; error: destructive `Notice` with « Réessayer ».

### 5.3 QR (`vCv3M`, `SHbyT`, `OHQlt`, `pRb9A`)

- Title « Mon QR d'entrée », subtitle « Présentez ce code à l'accueil. ».
- Before generation (M6): white rounded box (radius 24, hairline) with a muted QR glyph, « Le code est valable 60 secondes après génération. », primary « Générer mon QR ».
- Active: QR (existing `react-native-qrcode-svg`) in the white box, `ProgressBar` of remaining / 60 s, « Expire dans {n} s » (numeric); member strip at the bottom: `Avatar` initials, name 15/600, « {plan label} · {venue} » 13 muted, badge « Actif ».
- Expired: the box shows « QR expiré » + « Régénérez-le pour entrer. » over a faded code, primary « Régénérer ».
- Unavailable (existing 403 case): warning `Notice`-style panel « QR indisponible » + « Le QR d'entrée n'est pas activé pour votre salle. Présentez votre nom à l'accueil. », no button.
- Generation error (other failures): destructive `Notice` with « Réessayer ».

### 5.4 Réservations (`d14X6`, `Y1K4c`, `tDcja`, `H8Zdj4`)

- Title « Mes réservations »; sections « À venir » and « Passées » (upcoming = confirmed and session start in the future or unknown; past = the rest), ordered by session start (unknown dates last).
- Row (hairline between rows, min 72 pt): date block 48×56 radius 16 on a tint (upcoming: `bleu`; past: `side`) with the day number 20/600 numeric and short weekday 12 (« Lun »); title « Séance » 15/600 + status badge right (Confirmée info, Enregistrée success, Absent warning, Annulée neutral); meta « {HH:mm} » numeric 13 muted, or « Date indisponible »; « Annuler » ghost small under the meta for cancellable bookings (`isCancellable`).
- Cancel (M9): `Sheet` titled « Annuler la réservation ? », description « Séance · {jour court} {date courte} à {HH:mm}. Cette action est définitive. » (« Séance. Cette action est définitive. » when the date is unknown), actions destructive « Annuler la réservation » (loading while pending) and secondary « Garder ». Success: sheet closes, bookings refetch. 409 cancellation window: sheet closes, toast « Annulation impossible » / « Le délai d'annulation est dépassé. ». Other errors: toast « Annulation impossible » / « Réessayez dans un instant. ».
- Empty: centred icon chip (`CalendarX2` on `secondary`), « Aucune réservation », « Vos prochaines séances apparaîtront ici. Réservez à l'accueil ou auprès de votre coach. ».

## 6. Units

| File | Responsibility |
| --- | --- |
| `lib/theme.ts` (+ test) | §3 tokens; test pins shared values to `packages/ui/src/styles/globals.css` (M3) |
| `lib/card-view.ts` (+ test) | `cardView(profile, subscription, now) → { state: 'active' \| 'pack' \| 'expired' \| 'none'; badge; validUntil?; entries?; expiredOn?; planLine? }` and `memberSince(profile)` |
| `lib/booking-slots.ts` (+ test) | `slotWindow(today) → { from, to }` (today−30 … today+30), `joinBookings(bookings, slots) → BookingView[]` with `startsAt: string \| null`, `splitBookingViews(views, now) → { upcoming, past }` (replaces the `booked_at` logic in `lib/bookings.ts`, whose `isCancellable` / label helpers stay) |
| `lib/password-rules.ts` (+ test) | `PASSWORD_RULES` (M1) and `passwordChecks(value)`; `lib/login-schema.ts`'s `newPasswordSchema` uses the same rules |
| `lib/venue.ts` (+ test) | `pickMembership(memberships, venueIds)` (M7) |
| `lib/format.ts` (+ test) | adds `formatDayLine(date)`, `formatMonthYear(iso)`, `formatWeekdayShort(iso)`, `formatTime(iso)` in fr |
| components | §4 |
| screens | `app/(auth)/login.tsx`, `app/(app)/index.tsx`, `app/(app)/qr.tsx`, `app/(app)/bookings.tsx`, `app/(app)/_layout.tsx`, `app/_layout.tsx` (fonts) |
| `messages/fr.json`, `messages/en.json` | Canvas copy (§5); keys kept in parity (existing `lib/i18n.test.ts` guard) |
| `scripts/mock-server.mjs` | Adds `GET /gms/v1/me/memberships` (one membership « Studio Dakar Plateau » for the mock venue) and `GET /gms/v1/me/slots` (slots matching the seeded bookings' `slot_id`s, incl. one past and one outside the window); seeded bookings gain `slot_id`s and include confirmed, checked-in, no-show; a booking cancel returns 409 for one fixed booking to demo `H8Zdj4`; `MOCK_CARD=active\|pack\|expired\|none` (default `active`) selects the subscription shape for the Carte states and `MOCK_BOOKINGS=empty` returns no bookings |

## 7. Errors

| Case | Result |
| --- | --- |
| Login bad credentials | destructive notice (5.1) |
| Profile load error | notice with « Réessayer » |
| `/me/memberships` error | venue name and « Salle » row omitted; rest of Carte renders |
| QR 403 | « QR indisponible » panel |
| QR other error | destructive notice with « Réessayer » |
| `/me/slots` error | rows render with « Date indisponible »; bookings still listed and cancellable |
| Cancel 409 | toast « Annulation impossible » / « Le délai d'annulation est dépassé. » |
| Cancel other error | toast « Annulation impossible » / « Réessayez dans un instant. » |
| Font load error | system font fallback (unchanged) |

## 8. Testing

- Vitest (node) for every `lib/*` unit above, incl. `cardView` for all four states and both renewal cases, the slot join with a missing slot and an unknown date, the window bounds (< 62 days), password rules against the policy, `pickMembership` fallback, and the theme pin test.
- Existing member tests stay green (`status-badge.logic`, `bookings`, `card-status`, `countdown`, `format`, `i18n`, `login-schema`, `nav`); update them where the behaviour intentionally changes (theme values, login schema rules).
- Gates: `pnpm --filter @iziwellpass/member typecheck lint test`, `expo export --platform web` (the member `build`), plus the repo-wide `pnpm check:design && pnpm typecheck && pnpm lint && pnpm test`.
- Visual check on Expo web (`expo start --web`) at 390×844 against each PNG in `docs/design-refs/comptoir-clair/member/`, driving the member mock server: all 15 states reachable with the offline auth (`EXPO_PUBLIC_AUTH_MOCK=1`: password `wrong` → error notice, `invite` → new-password screen), `MOCK_CARD` for the four Carte states, the QR flow (generate, wait 60 s for expiry, 403 via the existing mock hook), the cancel sheet, the 409 toast, and `MOCK_BOOKINGS=empty`.

## 9. Out of scope

- Backend enrichment of `/me/bookings` (class, room, instructor, session time) — follow-up for the iziwellpass repo.
- Venue picker for members with several gyms.
- Dark theme.
- NativeWind 5 / Tailwind 4 in the member app (NativeWind 5 is still a release candidate).
- Self-booking, marketplace pass, walk-in QR flows.
