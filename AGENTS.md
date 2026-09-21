# Agent notes — IziWellPass web

## Design Context

Before any UI work in this repo, read:

- **[PRODUCT.md](PRODUCT.md)** — strategy: register (`product`), users (front-desk staff, francophone West Africa, mobile-heavy), brand personality (**calm, warm, precise**), anti-references (generic SaaS dashboard, loud fitness app, dense enterprise admin, playful/gamified), design principles, WCAG AA baseline.
- **[DESIGN.md](DESIGN.md)** — the visual system ("**Le comptoir clair**"): flat and unelevated; white page beside a `#fafafa` side column, near-black ink `#1f1f1f` as the only dark control (one per screen), grey pills for every active state, five pastel tints for glanceable tiles, hairlines between rows and never boxes; Inter at 400/500 headings, sentence case only, tabular numerals; icons are Lucide at stroke 1.5, never filled. `DESIGN.json` is the machine-readable sidecar.

Tokens live in `packages/ui/src/styles/globals.css` (Tailwind v4 `@theme inline`); UI primitives in `packages/ui/src/components/`. The design source of truth is the pen.dev canvas `screens.pen` at the repo root (components sheet « IziWellPass · Plat » plus the owner screens); PNG exports live in `docs/design-refs/comptoir-clair/`.

Hard rules: one ink accent, color only for meaning (status badges, capacity), no gradients/glassmorphism/emoji, mono numerals (`06:30`, `14/18`), 1px stone hairlines before shadows, ≥44px touch targets on front-desk screens, AA contrast in both themes.
