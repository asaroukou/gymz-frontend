---
name: IziWellPass
description: Le comptoir clair — flat, white, one action per screen; structure from tone, pills and space, never from elevation
colors:
  encre: '#1f1f1f'
  attenue: '#5f6368'
  attenue-fort: '#4d5156'
  fond: '#ffffff'
  cote: '#fafafa'
  pilule: '#eceef2'
  pilule-survol: '#e3e6ec'
  filet: '#dcdcdc'
  lavis: '#dfe8fa'
  teinte-bleu: '#e8eefb'
  teinte-vert: '#e9f3ee'
  teinte-sable: '#fbf1dc'
  teinte-rose: '#f6ecf2'
  teinte-lavande: '#eee9f8'
  statut-succes: '#e9f3ee'
  statut-succes-texte: '#1d5c3c'
  statut-attention: '#fbf1dc'
  statut-attention-texte: '#7a5c10'
  statut-erreur: '#fbe9e7'
  statut-erreur-texte: '#8f2f22'
  statut-info: '#e8eefb'
  statut-info-texte: '#2c4f8a'
  danger: '#b23a2a'
  scrim: '#1f1f1f40'
typography:
  display:
    fontFamily: 'Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: '2.75rem'
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: '-0.03em'
  page-title:
    fontFamily: 'Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: '2rem'
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: '-0.03em'
  section:
    fontFamily: 'Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1.375rem'
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: '-0.02em'
  title:
    fontFamily: 'Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: 'Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.9375rem'
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: 'Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.8125rem'
    fontWeight: 500
    lineHeight: 1.3
  numeric:
    fontFamily: 'Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: '2rem'
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: '-0.03em'
    fontFeature: "'tnum' 1"
rounded:
  pill: '999px'
  tile: '1.5rem'
  dialog: '1.75rem'
  field: '1.5rem'
  small: '0.375rem'
spacing:
  '1': '0.5rem'
  '2': '0.75rem'
  '3': '1rem'
  '4': '1.5rem'
  '5': '2rem'
  '6': '3rem'
components:
  button-primary:
    backgroundColor: '{colors.encre}'
    textColor: '{colors.fond}'
    rounded: '{rounded.pill}'
    padding: '0 1.25rem'
    height: '2.75rem'
  button-secondary:
    backgroundColor: 'transparent'
    textColor: '{colors.encre}'
    border: '1px solid {colors.filet}'
    rounded: '{rounded.pill}'
    padding: '0 1.25rem'
    height: '2.75rem'
  button-soft:
    backgroundColor: '{colors.pilule}'
    textColor: '{colors.encre}'
    rounded: '{rounded.pill}'
    padding: '0 1.25rem'
    height: '2.75rem'
  button-danger:
    backgroundColor: '{colors.statut-erreur}'
    textColor: '{colors.statut-erreur-texte}'
    rounded: '{rounded.pill}'
    padding: '0 1.25rem'
    height: '2.75rem'
  input:
    backgroundColor: '{colors.fond}'
    textColor: '{colors.encre}'
    border: '1px solid {colors.filet}'
    rounded: '{rounded.field}'
    padding: '0 1.125rem'
    height: '3rem'
  command-bar:
    backgroundColor: '{colors.fond}'
    textColor: '{colors.encre}'
    border: '1px solid {colors.filet}'
    rounded: '{rounded.pill}'
    height: '3.75rem'
    maxWidth: '45rem'
  nav-item-active:
    backgroundColor: '{colors.pilule}'
    textColor: '{colors.encre}'
    rounded: '{rounded.pill}'
    height: '2.625rem'
  tile:
    backgroundColor: '{colors.teinte-vert}'
    textColor: '{colors.encre}'
    rounded: '{rounded.tile}'
    padding: '1.25rem'
  badge-statut:
    backgroundColor: '{colors.statut-succes}'
    textColor: '{colors.statut-succes-texte}'
    rounded: '{rounded.pill}'
    padding: '0.25rem 0.75rem'
---

# Design System: IziWellPass

## 1. Overview

**Creative North Star: "Le comptoir clair"**

A white counter with nothing on it but the thing you came to do. The system borrows its posture from the calmest consumer assistants: a light grey column beside a white page, one large and quiet heading, one central action in a soft pill, and content that lives in pale tinted tiles or between hairlines. Nothing is raised. There are no cards, no borders around groups, no shadows, no glass. Structure comes from three tones (white page, grey side, grey pill), from generous space, and from a single hairline where a list needs rows.

The front desk is the reason for this. A receptionist standing at a counter with a member in front of them should see one thing: the command bar that scans a QR or finds a member. Everything else steps back. Owners reviewing a table at a laptop get the same calm at working density: a light 32 px title, a search pill, a hairline table.

This system replaces « Le studio documentaire » (bone ground, ink controls, drenched forest and clay surfaces, tracked uppercase eyebrows, heavy 750/800 weights). Those instruments are retired. Decision E-008 (no gradients) stands, with one sanctioned exception described under Elevation.

**Key Characteristics:**

- White page, grey side: `#ffffff` main area next to a `#fafafa` navigation column. The tonal step is the only frame.
- Near-black ink at 400 and 500: headings are light-weight and large; emphasis comes from size and space, not from bold.
- Pills for every control and every active state: buttons, fields, tabs, the active nav item, pagination, badges.
- One dark pill per screen: the primary action is the only solid dark control in view.
- Tinted tiles carry glanceable content: five pastels at lightness 0.93 to 0.96, dark ink on all of them.
- Hairlines, never boxes: tables and lists separate with a 1 px `#dcdcdc` line; nothing is wrapped in a bordered container.
- Zero elevation: no shadows, no blur, no borders on surfaces. Overlays separate with a 25 % ink scrim.

## 2. Colors

Three neutrals do the structural work; five pastels do the content work; four status pairs do the semantic work. Everything is measured with APCA against the surface it sits on.

### Neutrals

- **Encre** (`#1f1f1f`): all headings, body, labels, icons, and the single primary button fill. Lc 103 on white.
- **Atténué** (`#5f6368`): secondary text: subtitles, table headers, helper lines, timestamps, inactive tab labels. Lc 80 on white, Lc 77 on the side column. Body-text safe on both.
- **Atténué fort** (`#4d5156`): secondary text when it sits on a tinted tile or a pill. Lc 78 on the green tile, Lc 79 on the sand tile.
- **Fond** (`#ffffff`): the page.
- **Côté** (`#fafafa`): the navigation column and disabled or archived tiles. WCAG 1.04:1 against the page; the step is felt, not seen.
- **Pilule** (`#eceef2`): the active-state pill (nav, tabs, current page), soft buttons, neutral badges, the progress track. Encre on pilule is Lc 93.
- **Filet** (`#dcdcdc`): the only border. Table rows, list rows, secondary button and field outlines. Lc 18 on white, above the Lc 15 visibility floor and deliberately no higher.

### Tinted surfaces

Five pastels at equal lightness so no tile reads louder than another: **bleu** `#e8eefb`, **vert** `#e9f3ee`, **sable** `#fbf1dc`, **rose** `#f6ecf2`, **lavande** `#eee9f8`. They fill the session tiles on the dashboard, the plan tiles, the venue tiles, the onboarding steps, and avatars. Text on them is encre or atténué fort. Tints rotate by position, not by meaning, with one exception: a full session takes sable.

**Lavis** (`#dfe8fa`) is the single radial wash allowed behind a hub heading (see Elevation).

### Status

Badges are pale tint under dark text. Never a solid status fill, never colour without a label.

- **Succès** `#e9f3ee` / `#1d5c3c` (Lc 78): active, paid, confirmed, checked in, "En direct".
- **Attention** `#fbf1dc` / `#7a5c10` (Lc 72): expiring, pending, no-show, full.
- **Erreur** `#fbe9e7` / `#8f2f22` (Lc 76): suspended, cancelled, destructive buttons.
- **Info** `#e8eefb` / `#2c4f8a` (Lc 77): QR method, roles, cross-venue access.
- **Danger** `#b23a2a`: the error border on an invalid field. Not a fill.

### Named Rules

**The One Dark Rule.** Encre is the only solid dark control on a screen, and there is one of it. A second primary is a design error.

**The Pill Rule.** Active means "sits on a pilule". No underlines, no colour changes, no bold for selection.

**The Tile Rule.** Tints hold content people glance at (sessions, plans, venues, steps). They never hold forms, tables, or dialogs, and they never carry a border or a shadow.

## 3. Typography

**One family:** Inter (Inter Variable in the apps). No second face.

**Character:** light and large. Hub screens open with a 44 px regular-weight greeting; working screens with a 32 px regular-weight title. Section heads are 22 px at 500. Emphasis inside rows is 600, never 700 or above. There is no uppercase anywhere in the system; the tracked eyebrow is retired.

### Hierarchy

- **Display** (400, 2.75rem, 1.1, −0.03em): the greeting or question on a hub screen. One per screen.
- **Page title** (400, 2rem, 1.1, −0.03em): working screens.
- **Section** (500, 1.375rem, 1.2, −0.02em): "Planning du jour", "Adhésion", a day group in the sessions list.
- **Title** (600, 1rem, 1.3): a tile title, a row's primary text.
- **Body** (400, 0.9375rem, 1.5): everything else. Tables and dense rows also use 15 px.
- **Label** (500, 0.8125rem, 1.3): field labels, table headers, badge text, timestamps.
- **Numeric** (500, 2rem, tnum): the stat strip. Tabular figures on every count, time, and amount at any size.

### Named Rules

**The Light Heading Rule.** Headings are 400 or 500. If a heading needs to be bolder to be seen, it needs more space around it instead.

**The Sentence Case Rule.** French sentence case everywhere: headings, buttons, labels, badges, nav. No uppercase.

**The Tabular Rule.** Any value someone compares or reads back renders with tabular figures.

## 4. Elevation

None. The system has no shadows, no blur, no borders around surfaces, and no layered cards. Depth is expressed in exactly four ways:

1. **Tone.** White page, grey side column, grey pill. The eye reads three planes without a single edge.
2. **Space.** Sections are separated by 32 to 48 px of nothing. Hub screens centre their content in a 940 px column with 120 px side margins.
3. **Hairline.** A 1 px `#dcdcdc` line between rows in a table or list. Never around a group.
4. **Scrim.** Dialogs and sheets sit on a 25 % encre scrim over the page. The dialog itself is a white 28 px-radius panel with no border and no shadow.

**The wash exception.** A hub screen (dashboard, front desk, auth) may place one soft radial wash of lavis behind its heading, fading to transparent within about 640 px. It is the only gradient in the system, it carries no meaning, and it is optional. Decision E-008 otherwise stands: no linear gradients, no gradient fills on controls, no gradient text.

### Named Rules

**The No-Elevation Rule.** `box-shadow`, `backdrop-filter`, and container borders are prohibited. If two regions need separating, add space, change tone, or draw a hairline between rows.

**The No-Box Rule.** Content is never wrapped in a bordered or shadowed card. A group of fields is a heading and some fields. A table is rows with hairlines. A stat is a number over a label.

## 5. Components

Controls are pills; content is tiles or hairline rows; the page is white. Touch targets stay at 2.75rem minimum.

### Buttons

- **Primary:** encre fill, white label, 44 px pill, 15/500. One per screen.
- **Secondary:** transparent, 1 px filet outline, encre label.
- **Soft:** pilule fill, encre label. Filters, secondary emphasis.
- **Ghost:** no fill, no outline, encre label. Cancel, tertiary.
- **Danger:** statut-erreur tint fill, statut-erreur-texte label. Destructive confirmation only.
- **Small:** 36 px height, 14 px label, for rows, toolbars, dialog footers.
- **Icon:** 44 or 36 px circle, ghost by default; the dark variant is the submit control inside the command bar.

### Icons

- **Family:** Material Symbols Rounded, outlined, never filled. The rounded terminals match the pills; the thin stroke matches the 400-weight headings and the 1 px hairlines. Lucide is retired.
- **Weight:** 200 on desktop (20 px in navigation, 18 px inside pills and fields), 300 on mobile (24 px in the tab bar, 20 px elsewhere) so strokes survive small screens.
- **Colour:** encre at rest; atténué only when the surrounding label is atténué (inactive tabs, table headers).
- **Active state:** the icon does not change. The pill alone marks selection.
- **Names in use:** dashboard, door_open, calendar_month, sell, group, apartment, manage_accounts, badge, qr_code_2, qr_code_scanner, search, add, check, close, more_horiz, arrow_back, arrow_forward, arrow_upward, keyboard_arrow_down, unfold_more, left_panel_close, menu, visibility, check_circle, error, schedule, mail, person_add, logout.
- **States:** hover shifts the pill one step (pilule → pilule-survol, encre → `#333333`). Focus is a 3 px encre outline offset 4 px. Disabled is 50 % opacity.

### The command bar (signature)

A 60 px white pill, filet outline, max width 720 px, centred under the hub heading. Leading icon, placeholder in atténué, a mode selector, and the dark round submit. On the front desk it scans a QR or searches a member; on the dashboard it is the same control. This is the one thing a receptionist looks for.

### Fields

- **Input, Select:** 48 px pill, white, filet outline, 15 px text, 18 px horizontal padding. Label above in 13/500 atténué fort.
- **Textarea:** 20 px radius (1.25rem), same outline.
- **Focus:** outline becomes encre, plus the 3 px focus ring.
- **Error:** outline becomes danger; the message below in statut-erreur-texte.
- **Switch:** 40 × 24 pill, encre when on, filet when off, white thumb.
- **Checkbox:** 20 px, 6 px radius, encre when checked.

### Pills and tabs

- **Tab / Active:** pilule fill, 15/600 encre. **Tab / Inactive:** no fill, 15/400 atténué.
- **Chip:** pilule fill, label plus a small dismiss icon.
- **Badge:** 13/500 on a status tint. Always a text label. Two non-status variants: **Neutre** (pilule fill, atténué fort text: plan cadence, roles) and **Outline** (1 px filet, atténué fort text: archived, inactive). There is no dark badge.

### Navigation

- **Side column:** 260 px, côté fill, no border. Wordmark at the top, venue switcher and user menu pinned to the bottom.
- **Nav item:** 42 px pill, 15 px label; the active one takes pilule at 600, the rest are bare at 400.
- **Section label:** 13/500 atténué, no uppercase.
- **Mobile:** a 56 px top bar with the menu button, venue pill, and avatar; the column becomes a 300 px drawer over a scrim.

### Data

- **Stat:** a 32/500 number over a 13 px atténué label, no box, separated from its neighbours by a vertical hairline.
- **Tile:** 24 px radius, one of the five tints, 20 px padding. Time or number top-left, count top-right, title and meta bottom-left. Square on the dashboard, tall on plans and venues.
- **Table:** 13 px atténué headers over hairline rows at 15 px; the first column carries an avatar when it is a person. No outer border, no header fill.
- **Progress:** 6 px pilule track with an encre fill. Full sessions switch the fill to statut-attention-texte.
- **Avatar:** a tinted circle with 12/600 initials; the tint rotates by index (`tint` on the fallback).

### Overlays

- **Dialog:** 520 to 620 px, white, 28 px radius, 32 px padding, on a scrim. Title 24/500, description in atténué, fields, then a footer with a ghost cancel and one primary.
- **Sheet:** 460 px right panel on the same scrim, for lists that stay open while the page is used (session participants).
- **Toast:** 52 px encre pill with a white message and a 60 % white timestamp, bottom right.

### States

- **Empty:** a sentence in atténué under the section heading, or on hubs a tinted tile per suggested next step.
- **Loading:** pilule blocks the shape of the final content. No pulse.
- **Error:** the alert is a tinted row (status tint, dark status text) with a support reference in tabular figures.

## 6. Do's and Don'ts

### Do:

- **Do** open hub screens with one light heading and the command bar, centred, with nothing competing.
- **Do** keep exactly one dark pill per screen and let every other control be outline, soft, or ghost.
- **Do** mark active states with the grey pill and nothing else.
- **Do** separate rows with hairlines and sections with space; wrap nothing in a card.
- **Do** use the five tints for glanceable content, rotating by position, with dark ink on top.
- **Do** hold every text pair at APCA Lc 75 for body and Lc 60 for labels, and verify on the tint the text actually sits on.
- **Do** keep touch targets at 2.75rem, the 3 px focus ring visible, and reduced-motion honoured.

### Don't:

- **Don't** add a shadow, a blur, or a border around a group. The No-Elevation Rule has no exceptions.
- **Don't** use a second dark control, a coloured button, or a coloured underline for selection.
- **Don't** set a heading above 500 weight or a row label above 600.
- **Don't** use uppercase, tracked labels, or the retired eyebrow.
- **Don't** put a form, a table, or a dialog inside a tinted tile.
- **Don't** use a gradient anywhere except the optional lavis wash behind a hub heading.
- **Don't** revert to the bone ground, drenched forest or clay surfaces, or the 750/800 weights of the previous system.
