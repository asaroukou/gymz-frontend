# App-wide design baseline (Phase 1 sweep)

**Date:** 2026-07-11
**Method:** `$impeccable critique` + `$impeccable audit` per surface (6 parallel subagents), each scoring Nielsen /40 + technical audit /20 and running the deterministic detector. Scored against PRODUCT.md + DESIGN.md ("Le comptoir calme").
**Auth surfaces already done** (harden → polish → adapt → typeset → bolder → clarify); not re-scored here.

## Scoreboard

| Surface | Critique /40 | Audit /20 | Band | Detector |
| --- | --- | --- | --- | --- |
| Staff | 37 | 19 | excellent | 0 findings |
| Dashboard + shell | 32 | 14 | good (top) | 0 findings |
| Venues | 31 | 16 | good | 0 findings |
| Planning / schedules | 31 | 16 | good | 0 findings |
| Check-in / front desk | 30 | 18 | good | 0 findings |
| Members | 29 | 14 | good | 0 findings |

Average ~31.7/40 critique, ~16.2/20 audit. The app is uniformly **good, not broken**: authored, token-driven, no AI-slop (detector clean everywhere). This is a refinement effort, and the highest-leverage work is systemic (fix once at the token/primitive/shell layer), not per-screen.

## Phase 2 — STATUS: A/B/C/D shipped (2026-07-11)

All four batches executed at the primitive/token layer, verified (UI tests 15/15, owner production build green, live checks both themes):

- **Batch A (interaction):** responsive 44px sizing baked into Button/Input/Select/Combobox/Tabs/DropdownMenu/app-shell nav (44px phone → 36px `lg`); app-shell focus ring + warm hover; ink-tinted `--overlay` token on dialog/sheet scrims; one focus-ring convention on close buttons; select/combobox hovers; combobox French defaults.
- **Batch B (status/signature):** new `Capacity` component (mono count + threshold color + label, visible on mobile, badge/bar agree via `capacityLevel`); Badge AA via `--*-foreground` stops (green/amber bumped to 800 for margin, verified 6:1); Alert `success`/`warning`/`info` variants + `AlertReference` mono slot.
- **Batch C (lists/numerals):** `Input[type=number]` mono; `TableCell`/`TableHead` `numeric` variant; deduped `memberStatusBadgeVariant` into `lib/member-status.ts`.
- **Batch D (polish):** skeleton `rounded-md`→`rounded-xl`; tooltip `shadow-lg`→`shadow-popover`; switch thumb `bg-white`→`bg-background`; DESIGN.md label token 12px→14px (doc reconciled to code).

**Deferred to Phase 3 (per-screen usage, not primitive):**
- True mobile card-reflow for wide tables (members especially) — needs per-list column priority; primitive offers `numeric` cell + contained overflow.
- Wire Alert `success/warning/info` + `AlertReference` + retry into each list's error state.
- Mono discipline on header counts, dates, phone numbers (call-site).
- Front-desk row actions still using explicit `icon-sm`/`sm` → switch to `icon`/default so they inherit 44px.
- Auth screens' now-redundant explicit `h-11` overrides → drop to inherit the responsive default.

**Identity follow-up (not interaction):** app-shell wordmark still shows the `iW` chip; auth went wordmark-only. Align for consistency.

---

## Phase 2 — SYSTEM-LAYER backlog (authoritative; from the primitive conformance audit)

This supersedes the rough systemic list below. It comes from a dedicated conformance audit of every `packages/ui` primitive + `globals.css` against DESIGN.json (3 parallel agents), merged with the 6-surface usage findings. The token layer (colors, radii, shadows, fonts) is already aligned; these are gaps where the **primitives don't encode the DESIGN rule by default**. Grouped by coherent fix; execute in batches.

### Batch A — Interaction layer (controls, overlays, nav)

- **A1 [P0] 44px touch sizing.** No 44px size exists anywhere: Button maxes at `lg` `h-10` (40px); Input/Select/Combobox/Textarea are `h-9` (36px); Tabs triggers `py-1` (~28px), DropdownMenu items `py-1.5`, Dialog/Sheet close buttons, app-shell nav `h-9` + mobile trigger `size="icon"` all <44px. This one gap is the root cause of every front-desk touch failure. **Fix:** encode the DESIGN "≥44px on front-desk (phone) screens" rule into the primitives (see sizing-strategy decision below).
- **A2 [P0] App-shell hardening.** Nav links `hover:bg-black/5 dark:hover:bg-white/5` (raw cool wash, breaks Warm-Neutral); **no focus ring** (browser default only, app-wide AA keyboard fail); `h-9`/`size="icon"` targets. **Fix:** warm hover (`hover:bg-muted`), the ring convention, 44px.
- **A3 [P1] One focus-ring + scrim convention.** Dialog/Sheet close buttons use legacy `focus:ring-2 ring-offset-2` instead of the system `focus-visible:ring-[3px] ring-ring/15 focus-visible:border-ring`. Dialog/Sheet overlays use raw `bg-black/50` (cool black) instead of an ink-tinted scrim. **Fix:** standardize the ring utility; add an ink-tint overlay token.
- **A4 [P1] Missing hover states.** Select trigger has `dark:hover` only (no light hover); Combobox trigger has no hover at all. **Fix:** `hover:bg-accent` on both.
- **A5 [P2] Combobox French + focus.** Ships English defaults (« Select… » / « Search… » / « No results. ») — French-first violation; command input has `outline-none` and no focus ring.

### Batch B — Status & signature (meaning-only color)

- **B1 [P0] Progress → `Capacity` signature.** `progress.tsx` is raw shadcn: the signature "barre de capacité" encodes NONE of its rules — no mono `booked/capacity` count, no amber->85% / red-full threshold color (all delegated to call sites), and `transition-all` instead of scoped `transition-[width]`. The system's one expressive instrument is reconstructed by every caller. **Fix:** a `Capacity` wrapper that bakes in mono count + threshold color + text label, so "Complet" agrees everywhere. Also fixes the schedules P0 (bar `hidden sm:block` on mobile) and the badge-grey-vs-bar-red disagreement.
- **B2 [P0] Badge AA.** `warning: text-warning` (`#f59e0b`) on `bg-warning/15` fails AA; `success` borderline. **Fix:** darker AA stops (`#b45309` etc.). Map `full`->`destructive` so badge + capacity bar agree on "Complet".
- **B3 [P2] Alert status variants + support ref.** Only `default`/`destructive`; no calm `success`/`warning`/`info`, no mono support-reference slot. **Fix:** add variants + an `AlertReference` mono slot + retry, and adopt it as the shared list error state (every list currently lacks retry + ref).

### Batch C — Lists & numerals (data display)

- **C1 [P1] Responsive `Table`.** Only `overflow-x-auto`; every cell `whitespace-nowrap` -> 6-col tables side-scroll at 375px (the forbidden dense-admin look). **Fix:** a reflow/stacked-card mode; a `numeric` cell applying `font-mono tabular-nums`. Fixes members/venues/staff/schedules.
- **C2 [P1/P2] Mono numeral discipline.** Neither Table cells, Progress, number `<Input>`, header counts, dates, nor phone numbers enforce Geist Mono `tabular-nums` — Mono Numbers is call-site luck. **Fix:** a shared numeric utility/convention; `[type=number]` mono on Input.
- **C3 [P2] Dedupe `statusBadgeVariant`** (copy-pasted across members list + detail) into a shared helper.

### Batch D — Polish drift (P3)

- Skeleton `rounded-md` -> `rounded-xl` (drifts from the surfaces it stands in for); tokenize skeleton radius to target.
- Tooltip `shadow-lg` -> `shadow-popover` (elevation over-reach).
- Switch thumb `bg-white` -> `bg-background` (cool-white leak).
- Reconcile the **label token**: DESIGN.json says 12px but the app (and accessibility for non-technical phone users) wants 14px -> update the DOC, keep 14px.

### Design decision (not a primitive): stat tile vs hero card

The dashboard KPI row + check-in stats strip read as the banned hero-metric template (dodge every pixel tell, but the *form* is the trap; decorative `aria-hidden` icons add noise). Decide once: a quiet inline/hairline-divided stat strip, or a proper restrained `Stat` primitive. Do as part of Batch B or a small standalone call.

### Sizing-strategy decision (the one high-blast-radius call — needs sign-off before A1)

How to encode 44px:
- **Responsive default (recommended):** primitives default to 44px on touch/phone, step to 36px at `lg` (`h-11 lg:h-9`), matching the idiom check-in already uses and the "front-desk = phone" rule. Biggest reach, no per-call-site memory; blast radius is every control (intended for a mobile-heavy counter app; desktop unchanged).
- **Explicit touch size:** add a `touch`/`lg`=44px size, applied on front-desk call sites only. Safer, but per-site and easy to forget.

### Execution order
Batch A (interaction/accessibility) -> Batch B (status/signature) -> Batch C (lists/numerals) -> Batch D (polish). Then re-verify (typecheck/lint/build + browser, both themes), then Phase 3 per-surface (now much lighter, since primitives carry the rules).

---

## Phase 2 — systemic fixes (SUPERSEDED by the conformance backlog above; kept for the surface-usage context)

Ordered by reach.

1. **Front-desk control sizing (44px).** Root cause: shared button `sm`/`icon-sm` = 32px and default `h-9` = 36px, used on front-desk rows/menus/dialogs. Below the app's own ≥44px tap floor. Hits: members (P0), schedules (P1), dashboard shell (P2), venues (P3), staff (P3), check-in desktop. **Fix once:** a front-desk control size (or bump the shared defaults on those routes). Command: `$impeccable adapt` at the primitive layer.
2. **Responsive `Table` primitive.** No overflow/reflow wrapper; 6-column tables side-scroll at 375px (the forbidden "dense enterprise admin"). Hits: members (P1), venues (P2), staff (P3), schedules. **Fix once:** bake `overflow-x-auto` + a card-reflow mode into `packages/ui` Table. Command: `$impeccable adapt`.
3. **The "stat tile vs hero card" line.** KPI row reads as the banned hero-metric template (dashboard P1, borderline slop verdict; check-in stats strip P2). Dodges every pixel tell but the *form* is the trap; decorative `aria-hidden` icons add noise. **Fix once:** decide a non-template stat treatment (inline strip / hairline-divided row, drop decorative icons). Command: `$impeccable distill`.
4. **Capacity bar + slot-status helper.** The signature "barre de capacité" is `hidden sm:block` so it vanishes on phones (schedules **P0** — the receptionist loses the `14/18` they act on); and the `full` badge is grey while the bar is red (status disagrees on "Complet"). Reused on dashboard/planning/bookings. **Fix once:** a shared helper co-decides status color; keep the bar + mono count visible on mobile. Command: `$impeccable adapt` + `$impeccable colorize`.
5. **Shared list error state.** Load errors lack the DESIGN-mandated mono support reference and a retry, on every list (members, venues, staff, schedules, dashboard). **Fix once:** `apiErrorMessage` emits a mono ref; a shared error component with "Réessayer". Command: `$impeccable harden`.
6. **Mono numeral discipline.** Header counts, dates, and phone numbers render in Hanken, not Geist Mono (staff P2 count; members dates; venues phone) — violates the Mono Numbers rule. **Fix once:** a shared count/date/phone mono convention. Command: `$impeccable typeset`.
7. **Shell primitive gaps.** Nav links have no visible focus ring (dashboard P1, app-wide AA keyboard fail); raw `hover:bg-black/5 dark:hover:bg-white/5` breaks the warm-neutral rule. **Fix once** in the app shell. Command: `$impeccable harden` + `$impeccable colorize`.
8. **Skeleton fidelity.** Skeletons don't mirror final layout, and radius drifts (`rounded-2xl` skeleton vs `rounded-xl` Card). Hits check-in, staff, venues. **Fix once:** tokenize skeleton radii to the target primitive; layout-matched skeletons. Command: `$impeccable polish`.

## Phase 3 — per-surface residuals (after systemic), front-desk-first order

1. **Check-in** — `booking_id` UUID recall trap in the manual flow (needs a member→today's-booking resolver; **backend gap**); QR field autofocus on mount/tab-switch. `$impeccable clarify` + backend.
2. **Members** — dual status model (`is_active` vs `membership_status`) confuses; clarify or unify. Rapid-enroll friction (keep dialog open / "enregistrer et ajouter un autre"). `$impeccable clarify` + `$impeccable distill`.
3. **Dashboard** — KPI treatment (folded into systemic #3).
4. **Schedules** — no week/day navigation (owner can't reach next week; **backend range dependency**); 8-field dialog grouping. `$impeccable layout` + `$impeccable clarify`.
5. **Venues** — flat 9-field settings form needs sectioning (Identité / Localisation / Contact / Statut); missing "Ajouter un lieu" CTA (dead-end empty state). `$impeccable layout` + `$impeccable onboard`.
6. **Staff** — search no-results needs a clear-search CTA; otherwise minor. `$impeccable clarify`.

## Backend-gap cluster (not frontend design; for the backend team)

These surfaced as UX problems but are API-contract limits, already tracked in `docs/backend-issues.md`: member-first check-in resolver (`booking_id`), schedule date-range/week queries, `/members` pagination. Flag, don't paper over.

## Phase 4 — consolidation

After Phase 2 + 3: `$impeccable extract` to fold any new one-offs into the system, refresh DESIGN.md via `$impeccable document`, then re-`critique` the touched surfaces to confirm the lift.

## Recommended start

Phase 2, items 1 + 7 + 2 first (control sizing, shell gaps, responsive Table) — they touch every screen, are pure system-layer wins, and clear the P0/P1 accessibility + front-desk failures in one pass.

---

## Phase 3 findings (from /design)

**Date:** 2026-09-06
**Method:** built the `/design` preview surface (foundations, primitives, compositions, shell), then walked all five routes in both themes at 1280px and 375px. Findings below are recorded, not fixed; each is separate work.

### Drift between the documented system and the shipped one

- **[P2] Motion scale has no shared values.** `DESIGN.json` `extensions.motion` documents exactly two durations: `state-change` at 120ms and `progress` at 250ms. `packages/ui` uses five (`duration-150`, `duration-200`, `duration-300`, `duration-500`, `duration-1000`), and none of the five is either documented value. The documented motion scale and the shipped one share no values at all.
- **`DESIGN.md` still contradicts itself on the Label size.** The frontmatter (`typography.label.fontSize`) says `14px`; the prose still says "**Label** (500, 12px, 1.3)". Batch D (Phase 2) recorded reconciling this to 14px, but only the frontmatter was updated: the prose line is the one still wrong.
- **Capacity's full-class color needs B2 reconciled to it, not the other way round.** B2 above says "Map `full`->`destructive` so badge + capacity bar agree on 'Complet'." The shipped `capacityLevel` in `packages/ui/src/components/capacity.tsx` returns `tight` (amber) when `booked === capacity`, and reserves `over` (red) for a genuine overbook (`booked > capacity`); the code comment explains why: a full class is expected, not an error, so red would be an alarm the brand does not raise. This is the more considered behavior. It's a doc/backlog reconciliation, not a code defect: B2's text should be updated to match the shipped rule, not the reverse.
- **Stale contrast figure in a token comment.** `packages/ui/src/styles/globals.css` comments that `--backdrop-foreground` (neutral-600) on `--backdrop` "clears AA (~4.9:1)". Measured live on `/design/foundations`, that pair is 5.07:1. Still AA, still correct in substance; the number in the comment is stale.

### What the audit confirmed as healthy

- **Every token pair on the foundations page passes AA in both themes.** 18 measured pairs on `/design/foundations`, band tally AA 7 / AAA 11, zero failures. Notably the three status tints, which are what Batch B2 was about, measure: success 5.99:1, warning 6.28:1, info 5.39:1 on the light `/15` tint; success 8.75:1, warning 9.00:1, info 6.36:1 on the dark. **Batch B2's AA remediation is confirmed effective**, which was previously asserted but never measured.
- **Batch A1's responsive touch sizing works as intended.** Measured on `/design/primitives`: default-size buttons render 44px at a 375px viewport and 36px at 1280px. The `md`-breakpoint shell collapse and its 44px menu trigger also check out on `/design/shell`.

### Defects the preview had in itself, now fixed

- `parseCssColor` didn't handle the `oklab()` form Chrome returns for `color-mix(in oklab, ...)`, so the three status-tint contrast rows rendered a no-data glyph in both themes: the audit surface was silently blind at exactly the pairs that mattered most. Fixed in `apps/admin/lib/contrast.ts` (commit `78f31cb`). The general lesson: a measuring instrument that renders "no data" identically to "cannot parse" hides its own failures.
- The six status-tint figures above were first measured from a stand-in: `tint()` on `/design/foundations` built its swatch by interpolating in OKLab against the pane background, but Tailwind v4 actually compiles a `/15` opacity modifier to an alpha-0.15 color composited over the surface in gamma-encoded sRGB, a different operation. The preview and its tests were corrected to measure the real composite; the figures above are the corrected values, still AA/AAA throughout. This is the second time this surface's own instrument was wrong in a way that looked like data.
- The design route bar overflowed at 375px, putting two of five routes off-screen and giving every page a horizontal scrollbar. Fixed by wrapping (commit `4d5fa0c`).
- Specimen panes had the default `min-width: auto` as grid items, so wide specimen content was clipped and unreachable instead of scrolling inside the `Table` primitive's own scroller. Fixed with `min-w-0` (commit `f01a777`).
