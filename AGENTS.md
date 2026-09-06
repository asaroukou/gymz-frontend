# Agent notes — IziWellPass web

## Design Context

Before any UI work in this repo, read:

- **[PRODUCT.md](PRODUCT.md)** — strategy: register (`product`), users (front-desk staff, francophone West Africa, mobile-heavy), brand personality (**calm, warm, precise**), anti-references (generic SaaS dashboard, loud fitness app, dense enterprise admin, playful/gamified), design principles, WCAG AA baseline.
- **[DESIGN.md](DESIGN.md)** — the visual system ("**Le comptoir calme**"): green ink `#0c3d22` as the only accent on a single paper surface, stone neutrals, pill controls, Hanken Grotesk + Geist Mono (mono for all numerals), border-led depth with three whisper-level shadows, French sentence-case copy. `DESIGN.json` is the machine-readable sidecar.

Tokens live in `packages/ui/src/styles/globals.css` (Tailwind v4 `@theme inline`); UI primitives in `packages/ui/src/components/`. The design reference kit is the `prj-design` skill (`.claude/skills/prj-design/`).

Hard rules: one ink accent, color only for meaning (status badges, capacity), no gradients/glassmorphism/emoji, mono numerals (`06:30`, `14/18`), 1px stone hairlines before shadows, ≥44px touch targets on front-desk screens, AA contrast in both themes.
