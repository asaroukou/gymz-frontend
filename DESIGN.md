---
name: IziWellPass
description: Le studio documentaire — flat color, honest type, one brand from landing to front desk
colors:
  encre: '#141512'
  os: '#f2eee5'
  blanc: '#ffffff'
  foret: '#244f3c'
  argile: '#c66f50'
  ocre: '#d9b84b'
  sauge: '#b9c9a4'
  eucalyptus: '#9fc0bb'
  eau: '#8ebbd2'
  statut-succes: '#257a4e'
  statut-succes-texte: '#1d5c3c'
  statut-attention: '#d9b84b'
  statut-attention-texte: '#7a5c10'
  statut-erreur: '#b23a2a'
  statut-erreur-texte: '#8f2f22'
  statut-info: '#8ebbd2'
  statut-info-texte: '#2c6a8a'
typography:
  display:
    fontFamily: 'Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: 'clamp(2.25rem, 6vw, 4rem)'
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: '-0.05em'
  headline:
    fontFamily: 'Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: 'clamp(1.35rem, 1rem + 1.5vw, 2rem)'
    fontWeight: 750
    lineHeight: 1.05
    letterSpacing: '-0.035em'
  title:
    fontFamily: 'Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1.05rem'
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: '-0.01em'
  body:
    fontFamily: 'Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: 'clamp(1rem, 0.95rem + 0.25vw, 1.125rem)'
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: 'Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 750
    lineHeight: 1.3
    letterSpacing: '0.14em'
  numeric:
    fontFamily: 'Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 650
    lineHeight: 1.3
    fontFeature: "'tnum' 1"
rounded:
  pill: '999px'
  panel: '1.25rem'
  field: '0.75rem'
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
    textColor: '{colors.blanc}'
    rounded: '{rounded.pill}'
    padding: '0.75rem 1rem'
    height: '2.75rem'
  button-outline:
    backgroundColor: 'transparent'
    textColor: '{colors.encre}'
    rounded: '{rounded.pill}'
    padding: '0.75rem 1rem'
    height: '2.75rem'
  input:
    backgroundColor: '{colors.blanc}'
    textColor: '{colors.encre}'
    rounded: '{rounded.field}'
    padding: '0.65rem 1rem'
    height: '2.75rem'
  panel:
    backgroundColor: '{colors.blanc}'
    textColor: '{colors.encre}'
    rounded: '{rounded.panel}'
    padding: '1.5rem'
  panel-drenched-foret:
    backgroundColor: '{colors.foret}'
    textColor: '{colors.blanc}'
    rounded: '{rounded.panel}'
    padding: '1.5rem'
  panel-drenched-argile:
    backgroundColor: '{colors.argile}'
    textColor: '{colors.encre}'
    rounded: '{rounded.panel}'
    padding: '1.5rem'
  badge-statut:
    textColor: '{colors.statut-succes-texte}'
    rounded: '{rounded.pill}'
    padding: '0.125rem 0.5rem'
---

# Design System: IziWellPass

## 1. Overview

**Creative North Star: "Le studio documentaire"**

One brand from the public landing to the front desk to the member's pocket. The system is a documentary of real places: warm bone paper, near-black ink, and the flat colors of the venues themselves (forest, clay, ochre, sage, eucalyptus, water). Nothing shines that isn't real: a recorded product decision prohibits gradients outright; all depth comes from photography, flat color, typography, and contrast. Type does the heavy lifting: a single family (Inter Variable) speaking at documentary volume through weight (650/750/800) and scale, from a whispered letterspaced eyebrow to an editorial display headline.

The landing shouts; the apps speak. **Tempered adoption** is the doctrine for product surfaces: the full palette, shape, and typographic voice carry over, but display scale is reserved for hero moments (a page title, the member's pass face), and working screens hold front-desk density. The forest/clay duality is meaningful, not decorative: forest belongs to the consumer/member side, clay to the partner/operator side, exactly as the landing's two branches divide.

This system explicitly rejects PRODUCT.md's anti-references: the generic SaaS dashboard, the loud consumer fitness app, the dense enterprise admin, anything playful/gamified, and cold corporate minimalism.

**Key Characteristics:**

- Bone paper, ink controls: warm `#f2eee5` ground, near-black `#141512` as the single control fill; white panels sit on bone.
- Two drenched hues with assigned meaning: forêt (member/consumer), argile (partner/owner). Rare, deliberate, full-bleed when used.
- One family, heavy hand: Inter Variable only; hierarchy through weight (400 → 650 → 750 → 800) and scale, never through a second font.
- The eyebrow: a 0.75rem, 750-weight, 0.14em-tracked uppercase overline is the system's signature label, and the only sanctioned uppercase.
- Flat, hairline-bounded: zero shadows; 1px `color-mix(in srgb, currentColor 18%, transparent)` hairlines; pills for controls, 1.25rem panels for surfaces.
- Numerals are tabular: every time, capacity, amount, and code renders in Inter with `'tnum'` at weight 650.
- French-first, sentence case, operational; 2.75rem minimum touch targets; 3px `currentColor` focus outlines.

## 2. Colors

A documentary palette: ink on bone, two drenched place-colors, and an accent family drawn from the venues themselves.

### Primary
- **Encre** (#141512): the ink. All text on light surfaces, the primary button fill, active-nav underlines, wordmark. A warm near-black with a breath of green: never `#000`.
- **Os** (#f2eee5): the bone paper. The application ground everywhere. Panels sit on it in white; it is never used as text.
- **Blanc** (#ffffff): panel and card surfaces on bone, and text on drenched forêt. The one place pure white is allowed is as a surface/ink pairing against bone or a drenched hue; blanc never touches blanc.

### Secondary
- **Forêt** (#244f3c): the member/consumer color. Drenched surfaces only: the member pass face, member-side heroes, media fallbacks. White or bone text on it.
- **Argile** (#c66f50): the partner/operator color. Drenched surfaces only: owner-side mastheads and identity moments. Encre text on it.

### Tertiary — the documentary accents
- **Ocre** (#d9b84b), **Sauge** (#b9c9a4), **Eucalyptus** (#9fc0bb), **Eau** (#8ebbd2): the venue-category family from the landing's imagery system (racquet, mind-body, recovery, water). In the apps they carry category coding and data-viz series, always flat, never as text.

### Neutral
There is no grey scale. Neutrals are mixes of encre into the surface: hairlines at `color-mix(in srgb, currentColor 18%, transparent)`, muted text at reduced opacity of encre (0.62 is the landing's inactive-nav value), washes at low-percentage encre mixes over os/blanc.

### Status (app register; derived from the documentary family)
Badges are pills: an 18% tint of the base color under its dark text stop. Never a solid status fill, never color without a text label.
- **Statut succès** (#257a4e, text stop #1d5c3c): active, paid, confirmed, checked-in. Forest family, one step brighter than forêt so a badge never reads as a member surface.
- **Statut attention** (#d9b84b, text stop #7a5c10): expiring, pending, no-show, near-capacity. The native ochre.
- **Statut erreur** (#b23a2a, text stop #8f2f22): destructive actions, full capacity, suspended, cancelled. A brick from the clay family, hotter and darker than argile.
- **Statut info** (#8ebbd2, text stop #2c6a8a): secondary facts (method badges, links). The native water blue.

### Named Rules
**The Flat Ink Rule.** Encre is the only control color. If a screen needs a second "brand" color on a button, the design is wrong, not the palette.

**The Two Places Rule.** Forêt and argile are places, not paint: forêt = member side, argile = operator side. They appear drenched (a full surface) or not at all; never as borders, icons, or text accents.

**The Documentary Color Rule.** Color states a fact: whose side a surface belongs to, what category a thing is, what status it holds. Decorative color, and every gradient, is prohibited (recorded decision E-008).

## 3. Typography

**Display Font:** Inter Variable (with ui-sans-serif, system-ui)
**Body Font:** Inter Variable (same family, weight-differentiated)
**Label/Mono Font:** none: Inter carries figures with `'tnum'`.

**Character:** one variable family speaking every register: editorial weight (800, tight tracking, sub-1 line-height) for hero moments, confident middles (650/750) for working text, a letterspaced uppercase whisper for eyebrows. The odd weights (650, 750) are the signature; do not round them to 600/700.

### Hierarchy
- **Display** (800, clamp(2.25rem, 6vw, 4rem), 0.95, −0.05em): hero moments only: one per surface (a page title, the pass face name). The landing goes bigger; the apps stay at this tempered ceiling.
- **Headline** (750, clamp(1.35rem, 1rem + 1.5vw, 2rem), 1.05, −0.035em): section heads inside a page.
- **Title** (650, 1.05rem, 1.3): card/panel and row titles.
- **Body** (400, clamp(1rem, 0.95rem + 0.25vw, 1.125rem), 1.5): the default reading size. Cap prose at 65–75ch.
- **Label / Eyebrow** (750, 0.75rem, 0.14em tracking, uppercase): section overlines and micro-labels. The only uppercase in the system.
- **Numeric** (650, `'tnum' 1`): every time (`06:30`), capacity (`14/18`), amount (`FCFA 120 000`), and reference code, column-aligned.

### Named Rules
**The One Family Rule.** Inter Variable is the entire typographic system. A second font is a bug.

**The Eyebrow Rule.** Uppercase exists only as the tracked 0.75rem eyebrow. Headings, buttons, and body are French sentence case, always.

**The Tabular Rule.** Any value someone compares, counts, or reads back renders with tabular figures at weight 650. No exceptions.

## 4. Elevation

Flat. The system has **no shadows at all**: depth is conveyed by surface steps (white panel on bone ground; drenched panel above both), 1px hairlines at `color-mix(in srgb, currentColor 18%, transparent)`, and contrast. Overlays (dialogs, sheets) separate themselves with a scrim (`rgb(10 13 11 / 34%)`, deepening to 52% on interaction) rather than a drop shadow. Hover and focus are expressed in color, opacity, and the 3px `currentColor` focus outline (offset 0.25rem), never in depth.

### Named Rules
**The No-Shadow Rule.** `box-shadow` is prohibited. If a boundary needs asserting, use the hairline; if a layer needs separating, use a surface step or scrim.

**The Hairline Rule.** Every border is 1px and derived from `currentColor`, so it recolors correctly on bone, white, forêt, and argile without new tokens.

## 5. Components

Controls are pills; surfaces are 1.25rem panels; everything sits flat on bone. One obvious primary action per screen. All interactive targets are at least 2.75rem.

### Buttons
- **Shape:** full pill (999px), min-height 2.75rem, 0.75rem × 1rem padding, weight 750–800 labels.
- **Primary:** encre fill, blanc text, 1px encre border. On drenched surfaces it inverts: blanc fill, encre text.
- **Outline / Ghost:** transparent fill, 1px `currentColor` border; on media/drenched contexts the border softens to `rgb(255 255 255 / 66%)`.
- **Hover / Focus:** color/opacity shifts over the standard motion token (360ms cubic-bezier(0.22, 1, 0.36, 1)); focus adds the 3px `currentColor` outline. Disabled is 40% opacity, nothing else.
- **Split label:** a button may carry a small 0.65rem, 800-weight, 0.08em-tracked uppercase kicker above its label (the landing's product-action pattern) for launch-style CTAs; not for everyday actions.

### Chips / Badges
- **Style:** pills, 0.75rem, weight 650–750 text; status badges are an 18% tint of the status color under its dark text stop.
- **State:** every badge carries a text label; color is the echo, never the message.

### Cards / Containers
- **Corner Style:** 1.25rem (`radius-panel`); controls inside remain pills.
- **Background:** blanc on the os ground; drenched forêt or argile for identity moments (pass face, mastheads).
- **Shadow Strategy:** none (see Elevation); a hairline only when two white surfaces would otherwise merge.
- **Internal Padding:** 1.5rem (`space-4`), tighter 0.75–1rem inside dense lists.

### Inputs / Fields
- **Style:** blanc fill, 0.75rem radius, 1px hairline, min-height 2.75rem, 0.65rem × 1rem padding. (The one non-pill control family: multiline and typed input want corners.)
- **Focus:** border takes `currentColor` and the 3px outline blooms.
- **Error:** border and message shift to statut erreur's text stop; message below the field.

### Navigation
- **Style:** wordmark at 800 weight with −0.04em tracking; nav items at 0.875rem, weight 650, inactive at 0.62 opacity.
- **Active:** full opacity, weight 800, and the signature **2px rounded underline** sitting 0.25rem under the label. Mobile keeps the same pills and underline in a drawer/tab form.

### Le panneau imprégné (signature)
The drenched panel: a full forêt or argile surface with white/encre content, an eyebrow, and a display-weight statement. It is the system's loudest instrument, borrowed from the landing's two-branch gateway. In the apps it appears exactly where identity lives: the member's pass face (forêt), an owner masthead (argile), an auth screen. One per screen, maximum.

### Graphiques (data-viz)
Charts stay in the family: encre for the primary series, the documentary accents (ocre, sauge, eucalyptus, eau) for categories, hairline gridlines, tabular numerals on axes. Status colors appear in a chart only to encode the same fact they encode on a badge.

## 6. Do's and Don'ts

### Do:
- **Do** ground every screen in os (#f2eee5) with encre (#141512) ink; panels are blanc, hairlines are 18% `currentColor` mixes.
- **Do** reserve forêt for member-side identity and argile for operator-side identity, always drenched, at most one per screen.
- **Do** use the eyebrow (0.75rem, 750, 0.14em, uppercase) to introduce sections, and Inter's odd weights (650/750/800) exactly.
- **Do** render every time, capacity, amount, and code with `'tnum'` tabular figures at weight 650.
- **Do** keep every touch target at 2.75rem minimum, the 3px `currentColor` focus outline visible, and `prefers-reduced-motion` honored with the single 360ms ease-out motion token.
- **Do** give every list a designed empty state with one CTA, every region a skeleton matching its final layout, and every error a calm message with a support reference.

### Don't:
- **Don't** use gradients, ever: a recorded product decision prohibits them; depth comes from photography, flat color, typography, and contrast.
- **Don't** use `box-shadow`, glassmorphism, or blur-as-decoration: the system is flat (see The No-Shadow Rule).
- **Don't** build the "generic SaaS dashboard" PRODUCT.md forbids: no cream-and-blurple, no hero-metric cards, no identical icon+heading grids.
- **Don't** drift toward the "loud consumer fitness app" (neon, gamified badges, hype copy) or "playful/gamified" (mascots, confetti, emoji).
- **Don't** compress into the "dense enterprise admin": body never drops below 1rem, rows breathe with hairlines, screens survive a 375px phone.
- **Don't** go "cold corporate minimalism": no pure-white grounds, no cool greys, no timid 400-weight headings; the studio is warm and inked.
- **Don't** uppercase anything except the eyebrow, use a second font family, put forêt/argile on borders/icons/text, or use `border-left`/`border-right` thicker than 1px as a colored stripe.
