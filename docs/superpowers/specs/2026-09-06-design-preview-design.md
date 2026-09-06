# Design-system preview surface (`/design`)

**Date:** 2026-09-06
**Status:** approved, ready for implementation planning
**Scope:** a public route group in `apps/admin` that renders the IziWellPass
design system as curated specimens.

## Purpose

Three jobs, in priority order:

1. **Audit.** Spot drift between what `DESIGN.md` says and what the code does.
2. **Reference.** Find the right primitive and see how it is used.
3. **Composition sandbox.** Check that primitives still hold together once
   assembled into realistic fragments.

Read by the maintainer and a design/dev teammate, at a laptop. Not a product
surface, not for venue operators.

**Primary action:** scan a column and see the one thing that is off. Every
decision below serves that: themes are paired rather than toggled, specimens
are dense rather than spaced, and the chrome carries no color of its own.

## Design direction

**Scene sentence.** Two people at one laptop in an office in daylight,
mid-review, comparing paired columns looking for the item that does not match
its neighbours. This forces **light chrome**, and it forces it permanently:
dark is *content* on this surface, not a mode.

**Color strategy: Restrained, pushed to zero.** The chrome uses the greige desk
(`--backdrop`), `--backdrop-foreground` text, and stone hairlines, with **no ink
accent and no status color of its own**. A measuring instrument must not add
color to what it measures: any color visible on the page came out of a specimen.
This is a deliberate override of the app's normal one-ink-accent allowance, in
the stricter direction.

**Anchor references.**

- **Letraset / Monotype type-specimen sheets** — mono annotation, hairline
  rules, one specimen per row with its name set beside it rather than above it.
- **A Pantone fandeck** — the chip is large, its identifier sits under it in
  mono, and neighbouring chips touch so the step between them is legible.
- **The SBB design manual** — numbered sections, a strict grid, annotation that
  never competes with the specimen.

**Anti-goals.** Not a Storybook clone with a chrome-heavy toolbar. Not the
generic SaaS docs-site look (sidebar, cards, a copy button on everything). No
cards wrapping specimens: a card is itself a design decision and would
contaminate every reading. No icon-plus-heading grids.

## Scope

Production-quality, built to last. Five routes, curated specimens, no live prop
knobs. Tested where there is logic to test (contrast math, specimen coverage),
not snapshot-tested.

**Language.** Not internationalised, and deliberately so: chrome labels are
hardcoded French to stay coherent with the system they document, and all
specimen sample copy is French at realistic lengths, because surviving French
text length is a property of the system worth seeing.

## Architecture

### Theme pairing (the one genuinely open fork)

The token layer is class-based (`@custom-variant dark (&:is(.dark *))`), so a
nested `<div class="dark">` correctly re-declares the CSS custom properties for
its subtree. The problem runs the other way: when `next-themes` has put `.dark`
on `<html>` because of the OS preference, a "light" pane nested inside it still
matches `.dark *`, so every `dark:` utility inside a component leaks into the
light column and that pane is a lie.

Alternatives considered:

| Option | Verdict |
| --- | --- |
| **A. Force the route to light, wrap dark panes.** A client `layout.tsx` under `/design` strips `.dark` from `<html>` on mount and restores it on unmount. Light becomes the ambient truth; `.dark` wrappers are the only dark context; `dark:` utilities resolve correctly on both sides. | **Chosen.** ~10 lines, one documented side effect, no token duplication. |
| **B. Add a `.light` escape class.** Change `:root` to `:root, .light` in `globals.css` and wrap each pane explicitly. | **Also do, but not relied on.** One line, zero duplication, makes nested light-on-dark possible app-wide. Does *not* fix `dark:` utility leakage, which CSS cannot resolve by nearest ancestor. |
| **C. One iframe per pane.** True isolation, free width-framing later. | Rejected. Font re-loading, height syncing, and substantial machinery for a problem A solves in ten lines. |

### Chrome kit

`apps/admin/app/design/_chrome/`, built from raw elements rather than
`packages/ui`, so chrome decisions can never be mistaken for system decisions:

- `Section` — numbered, hairline-ruled, anchor-linkable.
- `Specimen` — mono name and prop signature on the left, paired `clair` /
  `sombre` panes on the right, stacking below `lg`.
- `Matrix` — variant x size grid with mono axis labels.
- `Swatch` — a color chip with its token name, OKLCH value, and measured
  contrast ratio.
- `Toc` — sticky rail.

### Contrast readout

Swatches compute their real contrast ratio at runtime from the OKLCH tokens
(oklch to sRGB to relative luminance) and display e.g. `4.9:1 AA`, or a
failure. This is what makes the page an audit tool rather than a catalog, and
it is the only part with real logic, so it is built test-first.

### Honesty about states

Prop-driven states (disabled, loading, invalid, checked, empty) render for real.
Hover and `focus-visible` cannot be simulated without lying about the CSS, so
they are annotated with the exact utility string and verified by interacting.
The page admits this rather than fabricating the state.

## Pages

| Route | Contents |
| --- | --- |
| `/design` | What this is, the four sections, and `DESIGN.md`'s hard rules as a live checklist |
| `/design/foundations` | 01 Couleur (stone ramp with OKLCH values and measured ratios, semantic tokens by role, status colors), 02 Typographie (scale, weights, mono-numeral proof), 03 Espacement et rayons, 04 Élévation (the three shadows and the hairline that precedes them), 05 Focus et états, 06 Mouvement, 07 Icônes |
| `/design/primitives` | Every export in `packages/ui/src/components`: button, input, textarea, select, combobox, checkbox, switch, label, form, badge, alert, capacity, stat, progress, table, tabs, card, dialog, sheet, popover, tooltip, dropdown-menu, avatar, separator, skeleton, empty, input-otp, sonner |
| `/design/compositions` | Member row, capacity strip, form section, a list in empty / loading / error, page header, stat panel, table with numeric cells |
| `/design/shell` | AppShell chrome, nav states, breakpoints |

Specimen definitions live in the admin app (`apps/admin/app/design/**`), not in
`packages/ui`: preview code stays out of the shipped UI package, and the whole
system is visible in one place.

## Wiring

Add `'/design'` to `publicPaths` in `apps/admin/middleware.ts`. The middleware
matches by prefix, so the single entry covers the whole group.

**Accepted consequence.** The surface is reachable unauthenticated in any
deployed admin build. It exposes components only, never data. Mitigated with
`robots: noindex` metadata; can be moved behind an env check later if that
changes.

## Build order

1. Chrome kit, route scaffold, theme mechanism, contrast utility (with tests)
2. Foundations
3. Primitives
4. Compositions
5. Shell and index

## Relationship to the existing backlog

`docs/app-design-baseline.md` carries a system-layer backlog with two decisions
still open (the 44px sizing strategy, and stat tile versus hero card). This
surface does not resolve them, but it is the instrument that makes resolving
them a matter of looking rather than arguing. Settling them is separate work.
