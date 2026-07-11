# Login screen — design critique & fix plan

**Date:** 2026-07-08
**Target:** `apps/owner/app/(auth)/login/page.tsx` + `(auth)/layout.tsx` and what they compose (`components/wordmark.tsx`, `components/password-checklist.tsx`, `lib/password.ts`, UI primitives, `messages/fr.json` `auth` namespace).
**Method:** `/impeccable critique` — two isolated assessments (LLM design director review + deterministic detector), synthesized.
**Design context:** register = **product**; system = "Le comptoir calme" (warm ink `#1c1917`, greige desk `#d6d2cc`, white rounded-2xl sheet, pill controls, Hanken Grotesk + Geist Mono, border-led depth, French sentence case, WCAG AA). See `PRODUCT.md` / `DESIGN.md`.

## Score: 19/40 (needs work)

Strong surface, weak failure paths. The token layer is executed faithfully; the states a user actually hits when login _fails_ betray the calm.

| #   | Heuristic                | Score | Key issue                                                                                 |
| --- | ------------------------ | ----- | ----------------------------------------------------------------------------------------- |
| 1   | Visibility of status     | 2     | `Suspense fallback={null}` blank void on load; success has no held "redirecting" state    |
| 2   | Match real world         | 1     | Raw Cognito English reaches francophone users; `t('login.error')` fallback is unreachable |
| 3   | User control / freedom   | 1     | Wrong password = dead end; no forgot-password, not even a disabled affordance             |
| 4   | Consistency              | 3     | Tokens faithful; missing forgot-password breaks convention; card title < wordmark         |
| 5   | Error prevention         | 2     | Good zod + checklist; masked 12-char password on phone, no reveal toggle                  |
| 6   | Recognition vs recall    | 3     | Labels + autoComplete good; no autofocus                                                  |
| 7   | Flexibility / efficiency | 2     | Password-manager friendly only; `UserNotConfirmedException` doesn't route to `/confirm`   |
| 8   | Aesthetic / minimalist   | 3     | Genuinely calm; docked for double error signaling                                         |
| 9   | Error recovery           | 1     | Same English error twice (inline + toast), undifferentiated, no support ref, no next step |
| 10  | Help / documentation     | 1     | "Contactez votre administrateur" is circular: the primary persona IS the administrator    |

## Anti-patterns verdict: not slop, but anonymous

Surface passes every ban (no gradients, glass, glows, side-stripes, card grids). Greige desk + ink pills + ring bloom are authored. But the **composition is the stock shadcn auth block**, decision for decision (centered 400px column, logo-over-card, stacked fields, full-width button, footer link). Skin is authored; skeleton is the template. The `iW` chip is a placeholder by its own code comment.

**Deterministic detector:**

- Static JSX scan: **0 findings** (corroborates the clean surface).
- Live-page scan (`http://localhost:3011/login`): **4 findings**
  - `low-contrast` **[real, must fix]**: footer help line `#78716c` on greige `#d6d2cc` = **3.2:1** (needs 4.5:1). AA is "enforced, not aspirational" per PRODUCT.md.
  - `flat-type-hierarchy` **[real]**: 14/16/18px, steps too close; the 24px display scale is unused on this screen.
  - `layout-transition` **[real, minor]**: `transition: height` in rendered CSS = the Button's `transition-all`; layout props shouldn't animate.
  - `design-system-color` on `nextjs-portal` = **false positive** (dev tooling).
- Overlay server (`impeccable live`) unavailable in the installed CLI build (detect-only); findings read from the URL scan.

## What's working (keep)

1. **Password checklist** (`lib/password.ts` + `password-checklist.tsx`): one `PASSWORD_RULES` array drives both zod and the live UI, so they can't drift; ticks are text + color, never color alone. Best-crafted piece on the screen. Note the irony: it lives in the state almost nobody sees.
2. **Token fidelity**: greige desk, white sheet, pill inputs, 3px/15% ring bloom, ink-tinted whisper shadows, correct `aria-invalid` borders.
3. **Authored French microcopy**: sentence case, imperative buttons, the onboarding-arrival notice. Only the _unauthored_ strings (vendor errors) break voice.

## Priority issues (with file references)

Line numbers are from the assessment; treat as pointers, re-locate on edit.

- **[P1] English Cognito errors at the anxiety peak.** `page.tsx:~182` passes `err.message` straight through; `t('login.error')` fallback is dead because Cognito rejects with `Error` instances. `packages/auth/.../cognito.ts:~87,99` does `onFailure: (err) => reject(err)`.
  **Fix:** map Cognito error `code`/`name` (`NotAuthorizedException`, `LimitExceededException`, `UserNotConfirmedException`, `InvalidPasswordException`, `PasswordResetRequiredException`) to French strings (in the auth package or a shared mapper); route `UserNotConfirmedException` to the existing `/confirm` flow instead of toasting.
- **[P1] No forgot-password affordance.** Violates PRODUCT.md principle 4 ("flag known gaps as disabled affordances instead of hiding them"). **Decision: disabled link with tooltip** — « Mot de passe oublié ? » rendered disabled with « Bientôt disponible », matching the existing Réactiver pattern (see `members/[id]/page.tsx`). Placed near the password field.
- **[P1] AA contrast failure on the footer** (3.2:1). Footer « Besoin d'aide ? … » is muted-on-greige. **Fix:** darken to `pierre-600`/`700` on the desk, or move the line onto the white card. Re-verify both themes.
- **[P2] Double error signaling.** Inline root error + identical `toast.error` fire together (`page.tsx:~183-184`, both cards). **Fix:** keep the inline message (next to the fields), drop the toast; reserve toasts for off-screen-origin events.
- **[P2] Dead moments at both ends.** `page.tsx:~278` `Suspense fallback={null}` = blank void on load; on success the button silently re-enables before `router.replace(next)`. **Fix:** card-shaped skeleton (title bar + two field lines + button pill) per DESIGN.md's skeleton rule; held pending / `isRedirecting` state on success (peak-end).

## Minor observations (in scope — user chose "everything")

- **Type hierarchy:** `CardTitle` ~16px sits _below_ the wordmark (~18px); the page's real title is subordinate to the logo; 24px display scale unused here.
- **Touch targets:** controls are `h-9` (36px); PRODUCT.md wants ≥44px on phone-at-the-counter screens, and login is one. (Accueil already uses 44px — match it.)
- **Screen readers:** `FormMessage` and root error `<p>` have no `role="alert"`/`aria-live` — failure is announced silently.
- **Show-password toggle:** absent against a 12-char masked policy on mobile; adding one may let the confirm-password field in the challenge card go (one less field).
- **« Créer un compte »** is shown to invited staff, for whom self-signup is a trap (creates a new establishment, not access to their employer's). Recontextualize or gate.
- **Subtitle voice:** « …accéder à votre établissement » is owner-voiced; a receptionist doesn't think of it as _their_ establishment.
- **Help line** is circular for owners, vague for staff (which administrator? how?).
- **No autofocus** on email (small desktop loss; defensible on mobile).
- **`transition-all`** on Button animates layout properties; scope to color/shadow.

## Persona red flags

- **Awa, réceptionniste (6am, phone, temp password from WhatsApp):** masked 12-char temp password, no reveal, on a 36px input; wrong → "Incorrect username or password." twice in English; footer says contact the admin (asleep); sees a « Créer un compte » trap.
- **Owner locked out:** the help line points to himself. No reset path, no support reference to quote.
- **Screen-reader user:** errors not announced (no `aria-live`).

## Decisions locked (this session)

- **Priority:** failure paths first, then AA/mobile, then identity.
- **Scope:** **everything** (P1s, P2s, and minors).
- **Forgot-password:** **disabled link with « Bientôt disponible » tooltip** (interim, matches Réactiver pattern).

## Action plan (ordered)

1. **`$impeccable harden` (login + auth errors)** — French Cognito-error mapping; route `UserNotConfirmedException` → `/confirm`; disabled « Mot de passe oublié ? » + tooltip; single error signal (drop toast); `role="alert"`/`aria-live` on errors; recontextualize « Créer un compte » for staff.
2. **`$impeccable polish` (auth screens)** — footer AA fix; card-shaped skeleton (no `fallback={null}`); held redirect state on success; scope `transition-all` → color/shadow; email autofocus on desktop.
3. **`$impeccable adapt` (auth mobile)** — 44px inputs/buttons; show-password toggle (then reconsider the confirm field).
4. **`$impeccable typeset` (auth hierarchy)** — real page-title step (use 24px display), demote wordmark so « Connexion » leads, fix the flat 14/16/18 scale.
5. **`$impeccable bolder` (auth identity)** — one signature compositional move so the auth screens stop being the stock shadcn block; decide the `iW` placeholder mark.
6. **`$impeccable clarify` (auth copy)** — staff-inclusive subtitle, non-circular help per audience, differentiated error copy (wrong password vs rate-limited vs unconfirmed).
7. **`$impeccable polish` (final)** — re-verify contrast, states, both themes; re-run `$impeccable critique` (target: well above 19/40).

## Non-goals / dependencies

- Real forgot-password flow is a **backend gap** (Cognito reset) — the interim affordance ships now; the real flow is a separate ticket (relates to the backlog in the project memory).
- French error mapping should live where it can be reused by signup/confirm too, not only login.
