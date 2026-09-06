---
name: IziWellPass Owner App
description: Green ink on paper — the calm operating surface for wellness venues
# Color space is OKLCH (the runtime token layer is OKLCH throughout). Values
# round-trip to the documented hex, so the AA ratios below still hold. Hex
# equivalents are named in prose for human reference.
colors:
  encre-verte: 'oklch(0.32 0.07 155)'
  encre-verte-hover: 'oklch(0.36 0.07 155)'
  encre-chaude: 'oklch(0.2161 0.0061 56)'
  papier: 'oklch(0.9848 0.0013 75)'
  surface: 'oklch(0.9971 0.0018 78)'
  pierre-100: 'oklch(0.9699 0.0013 75)'
  pierre-200: 'oklch(0.9232 0.0026 49)'
  pierre-300: 'oklch(0.8687 0.0043 56)'
  pierre-400: 'oklch(0.7161 0.0091 56)'
  pierre-500: 'oklch(0.5534 0.0116 58)'
  pierre-700: 'oklch(0.3741 0.0087 68)'
  pierre-900: 'oklch(0.2161 0.0061 56)'
  pierre-950: 'oklch(0.1469 0.0041 49)'
  statut-erreur: 'oklch(0.5771 0.2152 27.33)'
  statut-succes: 'oklch(0.6271 0.1699 149.21)'
  statut-attention: 'oklch(0.7686 0.1647 70.08)'
  statut-info: 'oklch(0.5461 0.2152 262.88)'
  chart-ink: 'oklch(0.32 0.07 155)'
  chart-stone: 'oklch(0.5534 0.0116 58)'
  chart-grid: 'oklch(0.9232 0.0026 49)'
  chart-track: 'oklch(0.9699 0.0013 75)'
typography:
  display:
    fontFamily: 'Hanken Grotesk, ui-sans-serif, system-ui, sans-serif'
    fontSize: '24px'
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: '-0.6px'
  title:
    fontFamily: 'Hanken Grotesk, ui-sans-serif, system-ui, sans-serif'
    fontSize: '16px'
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: 'Hanken Grotesk, ui-sans-serif, system-ui, sans-serif'
    fontSize: '14px'
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: 'Hanken Grotesk, ui-sans-serif, system-ui, sans-serif'
    fontSize: '14px'
    fontWeight: 500
    lineHeight: 1.3
  mono:
    fontFamily: 'Geist Mono, ui-monospace, monospace'
    fontSize: '14px'
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: '6px'
  md: '8px'
  lg: '10px'
  xl: '16px'
  pill: '9999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '12px'
  lg: '16px'
  xl: '24px'
components:
  button-primary:
    backgroundColor: '{colors.encre-chaude}'
    textColor: '{colors.papier}'
    rounded: '{rounded.pill}'
    padding: '0 16px'
    height: '36px'
  button-primary-hover:
    backgroundColor: '{colors.encre-hover}'
    textColor: '{colors.papier}'
    rounded: '{rounded.pill}'
  button-outline:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.pierre-900}'
    rounded: '{rounded.pill}'
    padding: '0 16px'
    height: '36px'
  input:
    backgroundColor: 'transparent'
    textColor: '{colors.pierre-900}'
    rounded: '{rounded.pill}'
    padding: '4px 16px'
    height: '36px'
  card:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.pierre-900}'
    rounded: '{rounded.xl}'
    padding: '24px'
  badge-status:
    backgroundColor: '{colors.pierre-100}'
    textColor: '{colors.pierre-900}'
    rounded: '{rounded.pill}'
    padding: '2px 8px'
  nav-pill-active:
    backgroundColor: '{colors.encre-chaude}'
    textColor: '{colors.papier}'
    rounded: '{rounded.pill}'
    padding: '0 16px'
    height: '36px'
  tab-trigger-active:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.pierre-900}'
    rounded: '{rounded.pill}'
---

# Design System: IziWellPass Owner App

## 1. Overview

**Creative North Star: "Le comptoir calme"** — the calm front desk.

The whole system behaves like a tidy counter at a well-run venue: everything the operator needs is at hand, nothing shouts, and the work in progress is always the loudest thing on the surface. Warm near-black ink writes on warm stone-grey paper; the app itself sits as a white sheet on a greige desk. Controls are fully rounded pills — smooth, finger-sized objects made to be tapped by someone standing at that counter with a member in front of them. The register is product: design serves the workflow and then recedes.

This system explicitly rejects the four lanes named in PRODUCT.md: the generic SaaS dashboard (cream-and-blurple, hero metrics, gradient accents), the loud consumer fitness app (neon, gamification, hype), the dense enterprise admin (cramped tables, tiny type), and anything playful or gamified (mascots, confetti, emoji). Color is reserved for meaning — status badges and capacity bars — never for decoration. Blue exists in this system but only as a secondary informational accent; it is never the brand.

**Key Characteristics:**

- One green ink: a single near-black green accent on a warm "stone" neutral scale; no cool greys anywhere.
- A single sheet of paper: the app is one near-white surface divided by 1px hairlines. There is no desk and no floating card.
- Pill-forward shape language: every control (button, input, tab, nav item, search) is fully rounded; surfaces are `16px`.
- Numerals are mono: times (`06:30`), capacity (`4/4`), amounts, codes, and references always render in Geist Mono with tabular figures.
- French-first, sentence case, operational voice; meaning carried by Lucide icons and badge color, never emoji.
- Full light/dark parity: dark mode inverts ink and paper (light ink on near-black) rather than introducing new hues.

## 2. Colors

A restrained palette: one green ink, one warm stone scale, and four semantic status colors used strictly for meaning. The runtime color space is **OKLCH** throughout — it keeps chroma low at the light and dark extremes and holds the whole neutral family warm. Hex equivalents below are the human reference; the OKLCH values in the frontmatter are canonical.

### Primary

- **Encre verte** (#0c3d22, `oklch(0.32 0.07 155)`): the single accent. Primary buttons, the active nav pill, toggles pressed on, focus rings, the auth masthead, single-series charts. A near-black green at low chroma: an ink that happens to be green, never "a green". Papier reads on it at 11.8:1. In dark mode the ink inverts to **Papier** (#fafaf9) on near-black surfaces rather than introducing a hue; the green is a daylight colour.
- **Encre verte hover** (#19482c, `oklch(0.36 0.07 155)`): the only hover shift for solid ink surfaces — one step lighter, nothing else changes.
- **Encre chaude** (#1c1917) remains the text ink: body copy, headings, icons. It is no longer an accent.

### Neutral

- **Grège** (#d6d2cc): retired. The desk model is gone; `--backdrop` survives only as an alias of the surface so older layouts keep compiling, and new code uses `--background`.
- **Surface** (`oklch(0.9971 0.0018 78)`, a whisper-warm near-white — never raw `#ffffff`): the sheet of paper — app surface, cards, popovers. The faint warmth keeps the paper in the same family as the stone hairlines and the green ink. Dark mode: pierre-950/900.
- **Papier** (#fafaf9): text and icons sitting on ink (button labels, active nav text).
- **Pierre 100** (#f5f5f4): secondary surfaces — tab rails, avatar chips, muted fills, hover washes.
- **Pierre 200** (#e7e5e4): the workhorse hairline. Borders, row separators, input strokes.
- **Pierre 500** (#78716c): muted text — descriptions, timestamps, table headers.
- **Pierre 900 → 950** (#1c1917 → #0c0a09): foreground text and the dark-mode surface stack.

### Status (semantic only)

- **Statut succès** (#16a34a): active memberships, confirmed states. Used as a 15% tint with a dark text stop (L 0.45) in badges, and never as a solid fill: that role and lightness gap is what keeps it distinct from encre verte (a solid at L 0.32), so a "Payé" badge never reads as brand.
- **Statut attention** (#f59e0b): expiring soon, capacity above 85%.
- **Statut erreur** (#dc2626): destructive actions, full capacity ("Complet"), suspended members.
- **Statut info** (#2563eb): secondary informational accents (QR method badge, links). The old brand blue, demoted on purpose.

### Named Rules

**The One Ink Rule.** There is exactly one accent: encre verte. Encre chaude is text, not accent. If a screen needs a second "brand" color, the design is wrong, not the palette.

**The Meaning-Only Color Rule.** Green, amber, red, and blue may appear only to state a fact (status, capacity, method). Decorative color use is prohibited.

**The Warm Neutral Rule.** Every grey comes from the stone scale. Cool greys, `#000`, and `#fff`-with-blue-undertones are forbidden; even shadows are tinted with ink (`rgba(28,25,23,…)`).

## 3. Typography

**Display Font:** Hanken Grotesk (with ui-sans-serif, system-ui)
**Body Font:** Hanken Grotesk (same family, weight-differentiated)
**Label/Mono Font:** Geist Mono (with ui-monospace)

**Character:** one clean geometric grotesque doing all the talking, with a mono voice reserved for anything the operator counts on being exact — times, capacities, amounts, codes. Quiet, legible, unornamented.

### Hierarchy

- **Display** (600, 24px, 1.2, −0.6px tracking): page titles only — one per screen ("Membres", "Planning").
- **Title** (600, 16px, 1.4): card and section headings ("Planning du jour", "Derniers passages").
- **Body** (400, 14px, 1.5): the default reading size for the entire app. Cap prose at 65–75ch.
- **Label** (500, 12px, 1.3): badge text, helper text, table headers (sentence case — never uppercase).
- **Mono** (400, 14px, tabular-nums): times as `HH:MM`, capacity as `14/18`, phone numbers, IDs, support references.

### Named Rules

**The Mono Numbers Rule.** Any value an operator compares, counts, or reads back — time, capacity, amount, code — renders in Geist Mono with `tabular-nums`. No exceptions.

**The Sentence Case Rule.** French sentence case everywhere: headings, buttons, labels, tabs. ALL-CAPS is forbidden outside mono reference codes.

## 4. Elevation

Border-led, shadow-whisper. Depth in this system comes from the 1px pierre-200 hairline: between rows, around cards, under the topbar, beside the sidebar. Shadows exist at exactly three levels and are barely audible: a whisper under resting cards and controls, a lift for transient popovers, and a clear raise for dialogs and sheets. Nothing else casts a shadow, and shadows never darken on hover — state changes are expressed in color, not depth.

### Shadow Vocabulary

- **Whisper** (`box-shadow: 0 1px 2px 0 rgba(28,25,23,0.05)`): cards, buttons, inputs at rest. Just enough to separate the sheet from the desk.
- **Popover** (`box-shadow: 0 8px 24px -6px rgba(28,25,23,0.16), 0 2px 8px -3px rgba(28,25,23,0.08)`): dropdown menus, selects, popovers, tooltips.
- **Raise** (`box-shadow: 0 12px 28px -6px rgba(28,25,23,0.16), 0 4px 10px -4px rgba(28,25,23,0.1)`): dialogs, sheets, toasts — true overlays only.

### Named Rules

**The Hairline-First Rule.** If a boundary can be drawn with a 1px pierre-200 border, it must be. Shadows are never used to compensate for a missing border.

**The Ink-Tint Rule.** Every shadow is tinted with encre (`rgba(28,25,23,…)`), never neutral black.

## 5. Components

Refined and restrained: controls are smooth pills, surfaces are soft rectangles, and nothing is decorated. Each screen has one obvious primary action; everything else steps back.

### Buttons

- **Shape:** fully rounded pill (`9999px`), 36px tall (`h-9`), 16px horizontal padding; touch-critical screens (Accueil) use 44px (`h-11`).
- **Primary:** encre chaude fill, papier text, whisper shadow. Hover shifts only the fill to encre hover (#292524).
- **Hover / Focus:** 120–150ms ease on color and shadow; focus is a 3px ring at 15% ring color plus a ring-colored border. Disabled is 50% opacity, no other change.
- **Outline / Secondary / Ghost:** outline = surface fill + hairline + whisper; secondary = pierre-100 fill; ghost = transparent until a pierre-100 hover wash. Destructive uses statut erreur fill and is always paired with a confirm dialog.

### Chips / Badges

- **Style:** fully rounded, 12px medium text, 8px horizontal padding. Solid variants (ink, erreur) for identity and hard states; 15%-tint variants (succès/attention/info on their own text color) for soft status.
- **State:** badges always carry a text label ("Actif", "Complet", "Manuel") — color alone is never the message.

### Cards / Containers

- **Corner Style:** 16px (`rounded-xl` token) — surfaces are soft, never pill-shaped.
- **Background:** surface white (pierre-900 in dark), on the greige desk or inside the app sheet.
- **Shadow Strategy:** whisper at rest; see Elevation. Never elevated on hover.
- **Border:** always the 1px pierre-200 hairline.
- **Internal Padding:** 24px; internal gaps 8–12px.

### Inputs / Fields

- **Style:** pill-shaped, 36px tall, transparent fill with a pierre-200 stroke and whisper shadow; 16px horizontal padding. Textareas are the one non-pill control (16px radius — multiline can't be a pill).
- **Focus:** border takes the ring color and a 3px 15%-opacity ring blooms around it.
- **Error / Disabled:** invalid fields swap border and ring to statut erreur with `applyFieldErrors` messages below; disabled is 50% opacity with `not-allowed`.

### Navigation

- **Style:** 248px sidebar resting directly on the greige desk (no panel), wordmark chip on ink; items are full pills.
- **States:** inactive items are pierre-500 text with a translucent hover wash; the active item is a solid encre pill with papier text and a Lucide icon at 16px. Mobile collapses to a drawer with the same pills.

### La barre de capacité (signature)

The capacity bar is the system's one expressive instrument: a 8px-tall pill track in pierre-100 with an ink fill, preceded by mono `booked/capacity` text. The fill turns statut attention above 85% and statut erreur at full — where a "Complet" chip joins it, placed before the count. It appears identically on the dashboard, planning, and bookings surfaces.

### Graphiques (data-viz)

Occupancy and attendance charts stay inside the palette — no decorative hues. Four tokens carry them: `chart-ink` (encre, the default single series), `chart-stone` (pierre-500, a comparison or second series), `chart-grid` (pierre-200, gridlines and axes), and `chart-track` (pierre-100, the unfilled bar/progress track). Categorical breakdowns (by status or payment method) borrow the `statut-*` colors so a green segment always means the same thing it does on a badge. In dark mode `chart-ink` inverts to papier and `chart-stone` lifts to pierre-400 so lines read on the dark card. Gridlines are hairline-quiet; the data is the loudest thing on the chart, mono axis labels with `tabular-nums`.

**The Monochrome Chart Rule.** A chart's default is ink-on-stone. Status color enters a chart only to encode the same fact it encodes everywhere else (succès/attention/erreur/info); a chart never invents a categorical palette for visual variety.

## 6. Do's and Don'ts

### Do:

- **Do** use encre chaude (#1c1917) as the only accent, on ≤10% of any screen — the active pill, the primary button, and little else.
- **Do** draw every boundary with the 1px pierre-200 hairline first; reach for a shadow only at the three defined levels.
- **Do** render every time, capacity, amount, and code in Geist Mono with `tabular-nums` (`06:30`, `14/18`, `FCFA 120 000`).
- **Do** write French, sentence case, operational: nouns for labels ("Abonnement"), imperatives for buttons ("Ajouter", "Valider").
- **Do** give every list a designed empty state with one CTA, every region a skeleton matching its final layout, and every error a calm message with a mono support reference.
- **Do** keep touch targets ≥44px on front-desk screens and ship AA contrast in both themes.

### Don't:

- **Don't** build the "generic SaaS dashboard" PRODUCT.md forbids: no cream-and-blurple, no hero-metric cards, no identical icon+heading grids, no gradient accents — gradients are banned outright.
- **Don't** drift toward the "loud consumer fitness app": no neon, no gamified badges, no aggressive motion, no hype copy.
- **Don't** compress into the "dense enterprise admin": body text never drops below 14px, tables breathe with row hairlines, and screens must survive a 375px phone.
- **Don't** add anything "playful / gamified": no mascots, no confetti, no emoji anywhere in the UI.
- **Don't** use `border-left`/`border-right` thicker than 1px as a colored stripe, gradient text, glassmorphism, `#000`, `#fff` on cool greys, or ALL-CAPS labels.
- **Don't** use blue as a brand color — statut info (#2563eb) states facts (a QR badge, a link) and nothing more.
- **Don't** communicate status with color alone; the badge text is the message, the color is the echo.
