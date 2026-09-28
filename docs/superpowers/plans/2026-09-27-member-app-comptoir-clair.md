# SP-M Member App on « Le comptoir clair » Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the Expo member app (Connexion, Carte, QR, Réservations) to the 15 « Le comptoir clair » member frames, align its copy, and fix Réservations showing the booking-creation time instead of the session time.

**Architecture:** Tokens first: `lib/theme.ts` becomes the canvas palette (pinned to the web `globals.css` by a test), Inter replaces Hanken Grotesk / Geist Mono, and `tailwind.config.js` exposes the new NativeWind classes (with temporary legacy aliases so screens keep rendering until each is rewritten). Pure `lib/*` helpers carry every rule (card state, slot join, password policy, venue pick, formatting) with vitest tests; shared UI components are restyled and five small ones added; then each screen is rewritten against its frames; a final task removes the legacy aliases and old fonts.

**Tech Stack:** Expo SDK 57, React Native 0.86, expo-router, NativeWind 4 (Tailwind 3.4), react-hook-form + zod 4, TanStack Query via orval-generated hooks (`@iziwellpass/api/generated`), i18n-js, react-native-svg, lucide-react-native, vitest 3 (node environment).

**Spec:** `docs/superpowers/specs/2026-09-27-member-app-comptoir-clair-design.md` (M1–M11). Read it first.

## Global Constraints

- Canvas frames are the source of truth for look and copy; PNGs in `docs/design-refs/comptoir-clair/member/<id>.png` (`J237z BQAl7 DeeZA NgWGe Q3ohJw HAIgO bRIoW SHbyT OHQlt vCv3M pRb9A d14X6 Y1K4c tDcja H8Zdj4`). Data and policy win over illustration (M1).
- Password policy (M1): 12 characters minimum, one uppercase, one lowercase, one digit.
- Fonts (M4): Inter 400/500/600 only (`Inter_400Regular`, `Inter_500Medium`, `Inter_600SemiBold`); numerals use `fontVariant: ['tabular-nums']`.
- Tokens (spec §3): ink `#1f1f1f`, inkHover `#333333`, background `#ffffff`, side `#fafafa`, secondary `#eceef2`, muted `#5f6368`, mutedStrong `#4d5156`, border `#dcdcdc`, danger `#b23a2a`, wash `#dfe8fa`, success `#e9f3ee`/`#1d5c3c`, warning `#fbf1dc`/`#7a5c10`, destructive `#fbe9e7`/`#8f2f22`, info `#e8eefb`/`#2c4f8a`, tints bleu `#e8eefb` vert `#e9f3ee` sable `#fbf1dc` rose `#f6ecf2` lavande `#eee9f8`; radii field 12, card 16, panel 24, pill 999.
- Light theme only (M5). Touch targets ≥ 44 pt; primary buttons 52 pt (M11). Lucide icons stroke 1.5.
- Message files `apps/member/messages/{fr,en}.json`: edit by inserting/removing text with the Edit tool only, never parse + re-serialize; fr/en key parity is enforced by `lib/i18n.test.ts`.
- No new dependency except `@expo-google-fonts/inter` (Task 1). After any install, run `pnpm exec tsc --noEmit` in `apps/owner` and `apps/admin` too (pnpm peer-instance drift has broken siblings before).
- Gates (from `web/`): `pnpm --filter @iziwellpass/member typecheck`, `… lint`, `… test`; before committing a task also `pnpm check:design && pnpm typecheck && pnpm lint && pnpm test` (add `--force` if turbo output looks replayed from another checkout).
- Commits: `feat(member): …` / `test(member): …`, each ending with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- **Running the app for visual checks** (Tasks 5–9): member mock on port 8092 and Expo web on 8093 — never touch 8082, 8090, 3011. `PORT=8092 node apps/member/scripts/mock-server.mjs` (plus `MOCK_CARD=…`, `MOCK_BOOKINGS=empty`, `MOCK_QR=unavailable` per state), then `EXPO_PUBLIC_AUTH_MOCK=1 EXPO_PUBLIC_API_BASE_URL=http://localhost:8092 pnpm --filter @iziwellpass/member exec expo start --web --port 8093`. Sign in with any e-mail; password `owner` signs in, `wrong` shows the error, `invite` opens the new-password challenge (`packages/auth/src/mock.ts`). Drive Chrome for Testing over CDP from a `/tmp/spm-*.mjs` script (`/Users/abdel/.cache/puppeteer/chrome/mac_arm-151.0.7922.47/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing --headless=new --remote-debugging-port=9335 --user-data-dir=/tmp/spm-chrome`), viewport 390×844 via `Emulation.setDeviceMetricsOverride` (deviceScaleFactor 2), screenshots to `/tmp/spm-task<N>-*.png`, compare with the frame PNGs. Poll readiness with short loops, never long fixed sleeps. Stop everything you start.

**Plan rulings (spec deviations decided while planning):**

- **R1 — QR lifetime is the backend's, not the canvas's.** The backend signs member QR tokens for 300 s (`TOKEN_VALIDITY_SECS = 300`, iziwellpass `crates/iziwellpass-domain/src/checkin/qr.rs`); the canvas's « 60 secondes » / « Expire dans 42 s » are illustrative. The progress bar uses the token's real lifetime (`expires_at` minus the mint time), the countdown reads « Expire dans 4:12 » (`m:ss`), and the before-generation hint reads « Le code est valable 5 minutes après génération. ». Cost if wrong: copy tweak.
- **R2 — Badge colours follow the canvas.** `statusBadgeVariant` changes: `confirmed` → info (blue), `checked_in` → success, `no_show` → warning, `expired`/`exhausted` → warning, `cancelled` → neutral, `active` → success; a new `info` variant exists. Existing tests updated.
- **R3 — Legacy aliases during migration.** Task 1 keeps `primary`, `foreground`, `neutral-*`, `font-mono*`, `rounded`/`rounded-xl` and the `section`/`mono`/`monoLarge` text variants as aliases mapped onto the new values so every screen keeps rendering; Task 9 deletes them and fails on any leftover use.

## Review Focus

1. **A member with no `/me/venues` entry or several memberships** → Carte still renders (venue name and « Salle » row omitted), QR shows its error state rather than crashing; pinned in Task 3 (`pickMembership`) tests.
2. **A booking whose slot is outside the 61-day window or `/me/slots` failing** → the row shows « Date indisponible », stays listed and cancellable, never shows `booked_at`; pinned in Task 3 (`joinBookings`) tests.
3. **Clock around midnight / timezone** → the window and day line use the device's local calendar day, not UTC; pinned in Task 3 (`slotWindow` with a local late-evening date).
4. **Subscription with `expires_on` in the past but status still `active`** → Carte shows the expired state, not « Valable jusqu'au » a past date; pinned in Task 3 (`cardView`).
5. **Double-tap on « Générer mon QR » / « Annuler la réservation »** → one request in flight; the button shows loading and ignores taps; enforced in Tasks 7 and 8 via `loading`/`disabled` and checked in their browser steps.

---

## File Structure

| Path | Task | Responsibility |
| --- | --- | --- |
| `apps/member/lib/theme.ts` (+ `theme.test.ts`), `apps/member/types/raw.d.ts`, `apps/member/tailwind.config.js`, `apps/member/app/_layout.tsx`, `apps/member/components/ui/text.tsx`, `apps/member/package.json` | 1 | Tokens, Inter, NativeWind classes, type scale |
| `apps/member/components/ui/{button,card,screen,status-badge,status-badge.logic,query-boundary}.tsx`, `apps/member/components/form/field.tsx`, `apps/member/app/(app)/_layout.tsx` | 2 | Restyled shared components and tab bar |
| `apps/member/components/ui/{notice,sheet,toast,progress-bar,avatar,wash}.tsx`, `apps/member/components/providers.tsx` | 2 | New shared components |
| `apps/member/lib/{format,card-view,venue,booking-slots,password-rules,login-schema,bookings}.ts` (+ tests) | 3 | Pure rules |
| `apps/member/scripts/mock-server.mjs` | 4 | Mock data and switches |
| `apps/member/app/(auth)/login.tsx`, messages | 5 | Connexion |
| `apps/member/app/(app)/index.tsx`, messages | 6 | Carte |
| `apps/member/app/(app)/qr.tsx`, messages | 7 | QR |
| `apps/member/app/(app)/bookings.tsx`, messages | 8 | Réservations |
| legacy cleanup across the above, `package.json` | 9 | Remove aliases and old fonts; full 15-state visual pass |

Worktree: `web/.worktrees/feat-member-comptoir`, branch `feat/member-comptoir` off local `main`.

---

### Task 1: Tokens, Inter and the type scale

**Files:**
- Modify: `apps/member/lib/theme.ts`, `apps/member/lib/theme.test.ts`
- Create: `apps/member/types/raw.d.ts`
- Modify: `apps/member/tailwind.config.js`, `apps/member/components/ui/text.tsx`, `apps/member/app/_layout.tsx`, `apps/member/package.json` (+ `pnpm-lock.yaml`)

**Interfaces:**
- Produces: `colors` (keys `ink, inkHover, background, side, secondary, muted, mutedStrong, border, danger, wash, white, success, warning, destructive, info, tint` + legacy `primary, foreground, neutral`), `radius` (`field, card, panel, pill`), `fonts` (`regular, medium, semibold`); NativeWind classes `bg-ink text-ink bg-side bg-secondary text-muted text-muted-strong border-border bg-danger bg-wash bg-success text-success-foreground … bg-tint-vert … rounded-field rounded-card rounded-panel rounded-pill font-sans font-sans-medium font-sans-semibold`; `AppText` variants `display title heading body bodyStrong label caption numeric numericLarge` (+ legacy `section mono monoLarge`).

- [ ] **Step 1: Write the failing pin test**

Create `apps/member/types/raw.d.ts`:

```ts
// Vite (vitest) `?raw` imports return the file's text. Used by tests only.
declare module '*?raw' {
  const content: string;
  export default content;
}
```

Replace `apps/member/lib/theme.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import css from '../../../packages/ui/src/styles/globals.css?raw';
import { colors, fonts, radius } from './theme';

const root = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));
function webVar(name: string): string {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`).exec(root);
  if (!match?.[1]) throw new Error(`--${name} not found in globals.css :root`);
  return match[1].toLowerCase();
}

describe('theme is pinned to the web tokens (spec M3)', () => {
  const pairs: [string, string][] = [
    [colors.ink, 'primary'],
    [colors.inkHover, 'primary-hover'],
    [colors.background, 'background'],
    [colors.side, 'side'],
    [colors.secondary, 'secondary'],
    [colors.muted, 'muted-foreground'],
    [colors.mutedStrong, 'muted-strong'],
    [colors.border, 'border'],
    [colors.danger, 'danger'],
    [colors.wash, 'wash'],
    [colors.success.DEFAULT, 'success'],
    [colors.success.foreground, 'success-foreground'],
    [colors.warning.DEFAULT, 'warning'],
    [colors.warning.foreground, 'warning-foreground'],
    [colors.destructive.DEFAULT, 'destructive'],
    [colors.destructive.foreground, 'destructive-foreground'],
    [colors.info.DEFAULT, 'info'],
    [colors.info.foreground, 'info-foreground'],
    [colors.tint.bleu, 'tint-bleu'],
    [colors.tint.vert, 'tint-vert'],
    [colors.tint.sable, 'tint-sable'],
    [colors.tint.rose, 'tint-rose'],
    [colors.tint.lavande, 'tint-lavande'],
  ];
  it.each(pairs)('%s equals --%s', (value, name) => {
    expect(value.toLowerCase()).toBe(webVar(name));
  });
});

describe('radius and fonts', () => {
  it('uses the canvas radii', () => {
    expect(radius).toEqual({ field: 12, card: 16, panel: 24, pill: 999 });
  });
  it('uses Inter only', () => {
    expect(Object.values(fonts)).toEqual(['Inter_400Regular', 'Inter_500Medium', 'Inter_600SemiBold']);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `pnpm --filter @iziwellpass/member exec vitest run lib/theme.test.ts`
Expected: FAIL (`colors.ink` undefined / `fonts` not exported). If Vite refuses to read the file outside the app root, add `server: { fs: { allow: ['../..'] } }` to `apps/member/vitest.config.ts`.

- [ ] **Step 3: New theme**

Replace `apps/member/lib/theme.ts`:

```ts
// « Le comptoir clair » tokens for React Native (hex; RN OKLCH is unreliable).
// Pinned to packages/ui/src/styles/globals.css by theme.test.ts.
// Single source of truth: tailwind.config.js consumes these objects.
const ink = '#1f1f1f';

export const colors = {
  ink,
  inkHover: '#333333',
  background: '#ffffff',
  side: '#fafafa',
  secondary: '#eceef2',
  muted: '#5f6368',
  mutedStrong: '#4d5156',
  border: '#dcdcdc',
  danger: '#b23a2a',
  wash: '#dfe8fa',
  white: '#ffffff',
  success: { DEFAULT: '#e9f3ee', foreground: '#1d5c3c' },
  warning: { DEFAULT: '#fbf1dc', foreground: '#7a5c10' },
  destructive: { DEFAULT: '#fbe9e7', foreground: '#8f2f22' },
  info: { DEFAULT: '#e8eefb', foreground: '#2c4f8a' },
  tint: {
    bleu: '#e8eefb',
    vert: '#e9f3ee',
    sable: '#fbf1dc',
    rose: '#f6ecf2',
    lavande: '#eee9f8',
  },
  // Legacy aliases (plan R3) — removed in Task 9. Do not use in new code.
  foreground: ink,
  primary: { DEFAULT: ink, hover: '#333333', foreground: '#ffffff' },
  neutral: {
    50: '#fafafa',
    100: '#eceef2',
    200: '#dcdcdc',
    300: '#dcdcdc',
    400: '#9aa0a6',
    500: '#5f6368',
    600: '#4d5156',
    700: ink,
    800: ink,
    900: ink,
    950: ink,
  },
} as const;

export const radius = { field: 12, card: 16, panel: 24, pill: 999 } as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
} as const;

export type Theme = typeof colors;
```

- [ ] **Step 4: Run the test**

Run: `pnpm --filter @iziwellpass/member exec vitest run lib/theme.test.ts`
Expected: PASS.

- [ ] **Step 5: Install Inter and load it**

Run from `web/`: `pnpm --filter @iziwellpass/member add @expo-google-fonts/inter@^0.4.2`. Then `pnpm exec tsc --noEmit` in `apps/owner` and `apps/admin` must stay clean.

In `apps/member/app/_layout.tsx` replace the Hanken/Geist imports and the `useFonts` map with:

```tsx
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
```

```tsx
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
```

Keep the comment above it but change "brand fonts" to "Inter". `Splash` uses `colors.ink` for the spinner.

- [ ] **Step 6: NativeWind classes**

Replace `apps/member/tailwind.config.js`:

```js
const { colors, radius, fonts } = require('./lib/theme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: colors.ink, hover: colors.inkHover },
        background: colors.background,
        side: colors.side,
        secondary: colors.secondary,
        muted: colors.muted,
        'muted-strong': colors.mutedStrong,
        border: colors.border,
        danger: colors.danger,
        wash: colors.wash,
        success: colors.success,
        warning: colors.warning,
        destructive: colors.destructive,
        info: colors.info,
        tint: colors.tint,
        // Legacy aliases (plan R3) — removed in Task 9.
        foreground: colors.foreground,
        primary: colors.primary,
        neutral: colors.neutral,
      },
      borderRadius: {
        field: `${radius.field}px`,
        card: `${radius.card}px`,
        panel: `${radius.panel}px`,
        pill: `${radius.pill}px`,
        // Legacy aliases (plan R3) — removed in Task 9.
        DEFAULT: `${radius.field}px`,
        xl: `${radius.card}px`,
      },
      // Each weight is its own loaded font file (RN does not synthesize weights),
      // so weights are addressed by family name, never by fontWeight.
      fontFamily: {
        sans: [fonts.regular],
        'sans-medium': [fonts.medium],
        'sans-semibold': [fonts.semibold],
        // Legacy aliases (plan R3) — removed in Task 9.
        'sans-bold': [fonts.semibold],
        mono: [fonts.regular],
        'mono-medium': [fonts.medium],
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 7: Type scale**

Replace `apps/member/components/ui/text.tsx`:

```tsx
import { Text, type TextProps } from 'react-native';

// « Le comptoir clair » type scale on Inter. Weight = family (tailwind.config).
// `numeric*` variants carry every figure the member reads back (times, the
// countdown, entry counts, the member number) with tabular numerals.
type Variant =
  | 'display'
  | 'title'
  | 'heading'
  | 'body'
  | 'bodyStrong'
  | 'label'
  | 'caption'
  | 'numeric'
  | 'numericLarge'
  // Legacy aliases (plan R3) — removed in Task 9.
  | 'section'
  | 'mono'
  | 'monoLarge';

const CLASS: Record<Variant, string> = {
  display: 'font-sans-medium text-[32px] leading-[38px] tracking-[-0.6px] text-ink',
  title: 'font-sans-medium text-[28px] leading-[34px] tracking-[-0.4px] text-ink',
  heading: 'font-sans-semibold text-[17px] leading-[22px] text-ink',
  body: 'font-sans text-[15px] leading-[22px] text-ink',
  bodyStrong: 'font-sans-semibold text-[15px] leading-[22px] text-ink',
  label: 'font-sans text-[13px] leading-[18px] text-muted',
  caption: 'font-sans text-[12px] leading-[16px] text-muted',
  numeric: 'font-sans-medium text-[15px] leading-[20px] text-ink',
  numericLarge: 'font-sans-medium text-[40px] leading-[44px] tracking-[-1px] text-ink',
  section: 'font-sans-semibold text-[17px] leading-[22px] text-ink',
  mono: 'font-sans-medium text-[15px] leading-[20px] text-ink',
  monoLarge: 'font-sans-medium text-[40px] leading-[44px] tracking-[-1px] text-ink',
};

const TABULAR = new Set<Variant>(['numeric', 'numericLarge', 'mono', 'monoLarge']);

export function AppText({
  variant = 'body',
  className,
  style,
  ...rest
}: TextProps & { variant?: Variant }) {
  // Caller className comes last so a color/spacing override wins.
  return (
    <Text
      className={`${CLASS[variant]} ${className ?? ''}`}
      style={[TABULAR.has(variant) ? { fontVariant: ['tabular-nums'] } : null, style]}
      {...rest}
    />
  );
}
```

- [ ] **Step 8: Gates and a smoke run**

Run the member gates and the repo gates (Global Constraints). Start the mock and Expo web (Global Constraints), sign in with password `owner`, and confirm the Carte screen renders in Inter with ink (not green) and no red-box errors. Stop everything.

- [ ] **Step 9: Commit**

```bash
git add apps/member pnpm-lock.yaml
git commit -m "feat(member): « Le comptoir clair » tokens pinned to the web, Inter type scale

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Shared components and the tab bar

**Files:**
- Modify: `apps/member/components/ui/button.tsx`, `card.tsx`, `screen.tsx`, `status-badge.tsx`, `status-badge.logic.ts`, `status-badge.test.ts`, `query-boundary.tsx`, `apps/member/components/form/field.tsx`, `apps/member/components/providers.tsx`, `apps/member/app/(app)/_layout.tsx`
- Create: `apps/member/components/ui/notice.tsx`, `sheet.tsx`, `toast.tsx`, `progress-bar.tsx`, `avatar.tsx`, `wash.tsx`
- Modify: `apps/member/messages/fr.json`, `en.json` (password toggle labels)

**Interfaces:**
- Consumes: Task 1 tokens/classes, `AppText`.
- Produces:
  - `Button({ label, onPress, disabled?, loading?, variant?: 'primary' | 'secondary' | 'ghost' | 'destructive', size?: 'md' | 'sm', icon?, fullWidth? })` (legacy `variant="outline"` accepted as `secondary` until Task 9); `IconButton` unchanged API; `IconMedallion({ icon, tint?, wash? })` unchanged API.
  - `StatusBadge({ label, variant })` with `BadgeVariant = 'success' | 'warning' | 'destructive' | 'info' | 'neutral'`; `statusBadgeVariant(status)` per plan R2.
  - `Card({ children, className?, tint?: 'bleu' | 'vert' | 'sable' | 'rose' | 'lavande' })`.
  - `Screen({ children, scroll?, contentClassName?, wash? })`.
  - `TextField({ …existing, secure })` — secure fields render an eye toggle.
  - `Notice({ variant: 'destructive' | 'warning' | 'info', title?, message, action?: { label, onPress } })`.
  - `Sheet({ open, onClose, title, description, children })` — children are the action buttons.
  - `ToastProvider` (mounted in `Providers`) and `useToast(): { show: (t: { title: string; description?: string }) => void }`.
  - `ProgressBar({ value })` with `value` 0..1.
  - `Avatar({ name, tint? })`.
  - `Wash()` — the login radial wash.

- [ ] **Step 1: Badge logic test first (R2)**

Replace `apps/member/components/ui/status-badge.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { statusBadgeVariant } from './status-badge.logic';

describe('statusBadgeVariant (canvas colours, plan R2)', () => {
  it('active and checked-in read success', () => {
    expect(statusBadgeVariant('active')).toBe('success');
    expect(statusBadgeVariant('checked_in')).toBe('success');
    expect(statusBadgeVariant('paid')).toBe('success');
  });
  it('confirmed reads info', () => {
    expect(statusBadgeVariant('confirmed')).toBe('info');
  });
  it('expired, exhausted, no-show and pending read warning', () => {
    for (const s of ['expired', 'exhausted', 'no_show', 'pending', 'overdue']) {
      expect(statusBadgeVariant(s)).toBe('warning');
    }
  });
  it('suspended reads destructive; cancelled and unknown read neutral', () => {
    expect(statusBadgeVariant('suspended')).toBe('destructive');
    expect(statusBadgeVariant('cancelled')).toBe('neutral');
    expect(statusBadgeVariant('canceled')).toBe('neutral');
    expect(statusBadgeVariant('whatever')).toBe('neutral');
  });
  it('is case-insensitive', () => {
    expect(statusBadgeVariant('CONFIRMED')).toBe('info');
  });
});
```

Run: `pnpm --filter @iziwellpass/member exec vitest run components/ui/status-badge.test.ts` → FAIL.

Replace `status-badge.logic.ts`:

```ts
export type BadgeVariant = 'success' | 'warning' | 'destructive' | 'info' | 'neutral';

const SUCCESS = new Set(['active', 'paid', 'checked_in']);
const INFO = new Set(['confirmed']);
const WARN = new Set(['expired', 'exhausted', 'no_show', 'pending', 'trialing', 'grace', 'overdue']);
const DANGER = new Set(['suspended']);

/** Badge colour per status, matching the canvas (plan R2). */
export function statusBadgeVariant(status: string): BadgeVariant {
  const s = status.toLowerCase();
  if (SUCCESS.has(s)) return 'success';
  if (INFO.has(s)) return 'info';
  if (WARN.has(s)) return 'warning';
  if (DANGER.has(s)) return 'destructive';
  return 'neutral';
}
```

Re-run → PASS.

- [ ] **Step 2: StatusBadge, Card, Screen, Wash**

`status-badge.tsx`:

```tsx
import { Text, View } from 'react-native';

import type { BadgeVariant } from './status-badge.logic';

export type { BadgeVariant } from './status-badge.logic';
export { statusBadgeVariant } from './status-badge.logic';

const BG: Record<BadgeVariant, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  info: 'bg-info',
  neutral: 'bg-secondary',
};

const TEXT: Record<BadgeVariant, string> = {
  success: 'text-success-foreground',
  warning: 'text-warning-foreground',
  destructive: 'text-destructive-foreground',
  info: 'text-info-foreground',
  neutral: 'text-muted-strong',
};

export function StatusBadge({ label, variant }: { label: string; variant: BadgeVariant }) {
  return (
    <View className={`self-start rounded-pill px-3 py-1 ${BG[variant]}`}>
      <Text className={`font-sans-medium text-[13px] leading-[18px] ${TEXT[variant]}`}>{label}</Text>
    </View>
  );
}
```

`card.tsx`:

```tsx
import type { ReactNode } from 'react';
import { View } from 'react-native';

type Tint = 'bleu' | 'vert' | 'sable' | 'rose' | 'lavande';

const TINT: Record<Tint, string> = {
  bleu: 'bg-tint-bleu',
  vert: 'bg-tint-vert',
  sable: 'bg-tint-sable',
  rose: 'bg-tint-rose',
  lavande: 'bg-tint-lavande',
};

/** A 24-radius panel: tinted (the pass) or white with a hairline. */
export function Card({
  children,
  className,
  tint,
}: {
  children: ReactNode;
  className?: string;
  tint?: Tint;
}) {
  const surface = tint ? TINT[tint] : 'border border-border bg-background';
  return <View className={`rounded-panel p-5 ${surface} ${className ?? ''}`}>{children}</View>;
}
```

`wash.tsx` (react-native-svg radial wash, 390 wide, fades to white):

```tsx
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '@/lib/theme';

/** The one soft wash behind the login heading (canvas J237z). Decorative. */
export function Wash() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden>
      <Svg width="100%" height={420}>
        <Defs>
          <RadialGradient id="wash" cx="50%" cy="0%" rx="75%" ry="100%">
            <Stop offset="0" stopColor={colors.wash} stopOpacity="0.9" />
            <Stop offset="1" stopColor={colors.background} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="420" fill="url(#wash)" />
      </Svg>
    </View>
  );
}
```

`screen.tsx`:

```tsx
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wash } from './wash';

// White page, 24 pt gutters. Screens own their vertical rhythm via child
// margins. `wash` adds the login's soft radial wash behind the content.
export function Screen({
  children,
  scroll = true,
  contentClassName,
  wash = false,
}: {
  children: ReactNode;
  scroll?: boolean;
  contentClassName?: string;
  wash?: boolean;
}) {
  const padding = 'px-6 pt-4';
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {wash ? <Wash /> : null}
      {scroll ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName={`${padding} pb-12 ${contentClassName ?? ''}`}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View className={`flex-1 ${padding} pb-6 ${contentClassName ?? ''}`}>{children}</View>
      )}
    </SafeAreaView>
  );
}
```

(The tab bar now owns the bottom safe area, so `edges={['top']}`; the login screen has no tab bar — Task 5 adds bottom padding there.)

- [ ] **Step 3: Button**

Replace `button.tsx`:

```tsx
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors } from '@/lib/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type LegacyVariant = Variant | 'outline'; // Legacy alias (plan R3) — removed in Task 9.
type Size = 'md' | 'sm';

const CONTAINER: Record<Variant, string> = {
  primary: 'bg-ink active:bg-ink-hover',
  secondary: 'border border-border bg-background active:bg-side',
  ghost: 'bg-transparent active:bg-side',
  destructive: 'bg-destructive active:opacity-80',
};

const LABEL: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-ink',
  ghost: 'text-ink',
  destructive: 'text-destructive-foreground',
};

const INK: Record<Variant, string> = {
  primary: colors.white,
  secondary: colors.ink,
  ghost: colors.ink,
  destructive: colors.destructive.foreground,
};

export function Button({
  label,
  onPress,
  disabled,
  loading,
  variant: rawVariant = 'primary',
  size = 'md',
  icon: Icon,
  fullWidth = true,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: LegacyVariant;
  size?: Size;
  icon?: LucideIcon;
  fullWidth?: boolean;
}) {
  const variant: Variant = rawVariant === 'outline' ? 'secondary' : rawVariant;
  const height = size === 'sm' ? 'h-11' : 'h-[52px]';
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      className={`${height} ${fullWidth ? 'w-full' : 'self-start'} flex-row items-center justify-center gap-2 rounded-pill px-6 ${CONTAINER[variant]} ${
        disabled && !loading ? 'opacity-40' : ''
      }`}
    >
      {loading ? (
        <ActivityIndicator color={INK[variant]} />
      ) : (
        <>
          {Icon ? <Icon color={INK[variant]} size={18} strokeWidth={1.5} /> : null}
          <Text className={`font-sans-semibold text-[15px] ${LABEL[variant]}`}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

/** Icon-only pressable for quiet trailing actions. */
export function IconButton({
  icon: Icon,
  onPress,
  label,
  tint = colors.muted,
  loading,
}: {
  icon: LucideIcon;
  onPress: () => void;
  label: string;
  tint?: string;
  loading?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={loading}
      onPress={onPress}
      className="h-11 w-11 items-center justify-center rounded-pill active:bg-side"
    >
      {loading ? <ActivityIndicator color={tint} /> : <Icon color={tint} size={20} strokeWidth={1.5} />}
    </Pressable>
  );
}

/** A centered Lucide icon on a round chip (empty states). */
export function IconMedallion({
  icon: Icon,
  tint = colors.muted,
  wash = 'bg-secondary',
}: {
  icon: LucideIcon;
  tint?: string;
  wash?: string;
}) {
  return (
    <View className={`h-14 w-14 items-center justify-center rounded-pill ${wash}`}>
      <Icon color={tint} size={24} strokeWidth={1.5} />
    </View>
  );
}
```

- [ ] **Step 4: Field with the eye toggle**

Add to `messages/fr.json` inside `"login"` (after `"back"`): `"showPassword": "Afficher le mot de passe",` / `"hidePassword": "Masquer le mot de passe"` (mind commas); en: `"showPassword": "Show password"`, `"hidePassword": "Hide password"`.

Replace `components/form/field.tsx`:

```tsx
import { useState } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Pressable, TextInput, View } from 'react-native';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react-native';
import { AppText } from '@/components/ui/text';
import { t } from '@/lib/i18n';
import { colors } from '@/lib/theme';

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  secure,
  keyboardType,
  errorText,
  icon: Icon,
  autoComplete,
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
  secure?: boolean;
  keyboardType?: 'email-address' | 'default';
  errorText?: string;
  icon?: LucideIcon;
  autoComplete?: 'email' | 'password' | 'new-password' | 'off';
}) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const border = errorText ? 'border-danger' : focused ? 'border-ink' : 'border-border';
  return (
    <View className="gap-1.5">
      <AppText variant="label" className="font-sans-medium text-ink">
        {label}
      </AppText>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <View
            className={`h-[52px] flex-row items-center gap-2.5 rounded-pill border bg-background px-5 ${border}`}
          >
            {Icon ? <Icon color={focused ? colors.ink : colors.muted} size={18} strokeWidth={1.5} /> : null}
            <TextInput
              accessibilityLabel={label}
              className="h-[52px] flex-1 font-sans text-[15px] text-ink"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={autoComplete}
              secureTextEntry={secure && !revealed}
              keyboardType={keyboardType ?? 'default'}
              onBlur={() => {
                setFocused(false);
                onBlur();
              }}
              onFocus={() => setFocused(true)}
              onChangeText={onChange}
              value={value ?? ''}
            />
            {secure ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={revealed ? t('login.hidePassword') : t('login.showPassword')}
                onPress={() => setRevealed((r) => !r)}
                className="-mr-2 h-11 w-11 items-center justify-center"
              >
                {revealed ? (
                  <EyeOff color={colors.muted} size={20} strokeWidth={1.5} />
                ) : (
                  <Eye color={colors.muted} size={20} strokeWidth={1.5} />
                )}
              </Pressable>
            ) : null}
          </View>
        )}
      />
      {errorText ? (
        <AppText variant="label" className="text-destructive-foreground">
          {errorText}
        </AppText>
      ) : null}
    </View>
  );
}
```

- [ ] **Step 5: Notice, ProgressBar, Avatar**

`notice.tsx`:

```tsx
import { Pressable, View } from 'react-native';
import { CircleAlert, Info, TriangleAlert } from 'lucide-react-native';
import { AppText } from './text';
import { colors } from '@/lib/theme';

type Variant = 'destructive' | 'warning' | 'info';

const BG: Record<Variant, string> = {
  destructive: 'bg-destructive',
  warning: 'bg-warning',
  info: 'bg-info',
};
const FG: Record<Variant, string> = {
  destructive: colors.destructive.foreground,
  warning: colors.warning.foreground,
  info: colors.info.foreground,
};
const ICON = { destructive: CircleAlert, warning: TriangleAlert, info: Info } as const;

/** Inline tinted notice: icon + (title) + message (+ text action). */
export function Notice({
  variant,
  title,
  message,
  action,
}: {
  variant: Variant;
  title?: string;
  message: string;
  action?: { label: string; onPress: () => void };
}) {
  const Icon = ICON[variant];
  return (
    <View
      accessibilityRole="alert"
      className={`flex-row items-start gap-3 rounded-card px-4 py-3 ${BG[variant]}`}
    >
      <Icon color={FG[variant]} size={18} strokeWidth={1.5} />
      <View className="flex-1 gap-0.5">
        {title ? (
          <AppText variant="bodyStrong" style={{ color: FG[variant] }}>
            {title}
          </AppText>
        ) : null}
        <AppText variant="body" style={{ color: FG[variant] }}>
          {message}
        </AppText>
        {action ? (
          <Pressable accessibilityRole="button" onPress={action.onPress} className="mt-1 min-h-11 justify-center">
            <AppText variant="bodyStrong" className="underline" style={{ color: FG[variant] }}>
              {action.label}
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
```

`progress-bar.tsx`:

```tsx
import { View } from 'react-native';

/** 4 pt track with an ink fill; value is clamped to 0..1. */
export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }}
      className="h-1 w-full overflow-hidden rounded-pill bg-secondary"
    >
      <View className="h-1 rounded-pill bg-ink" style={{ width: `${v * 100}%` }} />
    </View>
  );
}
```

`avatar.tsx`:

```tsx
import { View } from 'react-native';
import { AppText } from './text';

/** Initials on a tint, 40 pt. */
export function Avatar({ name, tint = 'bg-tint-vert' }: { name: string; tint?: string }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || '?';
  return (
    <View className={`h-10 w-10 items-center justify-center rounded-pill ${tint}`}>
      <AppText variant="label" className="font-sans-semibold text-ink">
        {initials}
      </AppText>
    </View>
  );
}
```

- [ ] **Step 6: Sheet and Toast**

`sheet.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './text';

/** Bottom sheet over a scrim (canvas Y1K4c). `children` are the stacked actions. */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={title}
          onPress={onClose}
          className="absolute inset-0 bg-ink/25"
        />
        <View
          accessibilityViewIsModal
          className="gap-5 rounded-t-panel bg-background px-6 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}
        >
          <View className="h-1 w-10 self-center rounded-pill bg-border" />
          <View className="gap-2">
            <AppText variant="heading">{title}</AppText>
            {description ? <AppText variant="body" className="text-muted">{description}</AppText> : null}
          </View>
          <View className="gap-3">{children}</View>
        </View>
      </View>
    </Modal>
  );
}
```

`toast.tsx`:

```tsx
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from './text';

type ToastInput = { title: string; description?: string };
const ToastContext = createContext<{ show: (t: ToastInput) => void }>({ show: () => {} });

const TAB_BAR_HEIGHT = 84;
const DURATION_MS = 4000;

/** One transient dark pill above the tab bar (canvas H8Zdj4, spec M10). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastInput | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback((next: ToastInput) => {
    if (timer.current) clearTimeout(timer.current);
    setToast(next);
    timer.current = setTimeout(() => setToast(null), DURATION_MS);
  }, []);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast ? (
        <View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          className="absolute left-5 right-5 rounded-panel bg-ink px-5 py-3.5"
          style={{ bottom: TAB_BAR_HEIGHT + Math.max(insets.bottom - 34, 0) + 12 }}
        >
          <AppText variant="bodyStrong" className="text-white">
            {toast.title}
          </AppText>
          {toast.description ? (
            <AppText variant="label" className="text-white/70">
              {toast.description}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
```

In `components/providers.tsx`, wrap `AuthProvider`'s children: `<AuthProvider><ToastProvider>{children}</ToastProvider></AuthProvider>` (import from `@/components/ui/toast`). `SafeAreaProvider` is provided by expo-router; if `useSafeAreaInsets` throws on web, wrap with `SafeAreaProvider` from `react-native-safe-area-context` at the top of `Providers`.

- [ ] **Step 7: QueryBoundary on the new pieces**

In `query-boundary.tsx`, replace the error block with a `Notice` and the spinner colour:

```tsx
  if (isLoading) {
    if (loadingFallback) return <>{loadingFallback}</>;
    return (
      <View className="items-center py-12">
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }
  if (isError) {
    return (
      <View className="py-6">
        <Notice variant="destructive" message={errorText} action={{ label: t('common.retry'), onPress: onRetry }} />
      </View>
    );
  }
```

(Remove the now-unused imports.)

- [ ] **Step 8: Tab bar**

Replace `app/(app)/_layout.tsx`:

```tsx
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { CalendarCheck, QrCode, Wallet, type LucideIcon } from 'lucide-react-native';
import { t } from '@/lib/i18n';
import { colors, fonts } from '@/lib/theme';

function TabIcon({ icon: Icon, focused, color }: { icon: LucideIcon; focused: boolean; color: string }): ReactNode {
  return (
    <View className={`h-8 w-14 items-center justify-center rounded-pill ${focused ? 'bg-secondary' : ''}`}>
      <Icon color={color} size={20} strokeWidth={1.5} />
    </View>
  );
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 12 },
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 84,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.card'),
          tabBarIcon: ({ color, focused }) => <TabIcon icon={Wallet} focused={focused} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="qr"
        options={{
          title: t('tabs.qr'),
          tabBarIcon: ({ color, focused }) => <TabIcon icon={QrCode} focused={focused} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: t('tabs.bookings'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={CalendarCheck} focused={focused} color={color as string} />
          ),
        }}
      />
    </Tabs>
  );
}
```

Compare with the tab bar in `NgWGe.png` / `d14X6.png` and adjust the pill size or bar height if the rendered bar differs (keep ≥ 44 pt touch area).

- [ ] **Step 9: Gates, smoke run, commit**

Member + repo gates; start the app (Global Constraints), sign in, look at each tab once at 390×844 (screens still old layouts but new components/tab bar), no red box. Commit:

```bash
git add apps/member
git commit -m "feat(member): restyled shared components, tab bar, notice/sheet/toast/progress/avatar

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Pure rules (card state, venue, slots, password, formatting)

**Files:**
- Modify: `apps/member/lib/format.ts`, `format.test.ts`, `login-schema.ts`, `login-schema.test.ts`, `bookings.ts`, `bookings.test.ts`
- Create: `apps/member/lib/card-view.ts` (+ test), `venue.ts` (+ test), `booking-slots.ts` (+ test), `password-rules.ts` (+ test)

**Interfaces:**
- Consumes: `BadgeVariant` (Task 2), `membershipTypeLabelKey`, `subscriptionStatusLabelKey` from `lib/card-status.ts`.
- Produces:
  - `formatDayLine(date?: Date): string` (« Samedi 20 septembre »), `formatMonthYear(iso): string` (« mars 2026 »), `formatWeekdayShort(iso): string` (« Lun »), `formatDayNumber(iso): string` (« 22 »), `formatTime(iso): string` (« 06:30 »), `formatShortDate(iso): string` (« 22 sept. »), `formatCountdown(seconds): string` (« 4:12 »).
  - `cardView(profile, subscription, now?) → CardView`; `planLineText(planLine, translate) → string | null`; types `CardState`, `CardView`, `PlanLine`.
  - `pickMembership(memberships, venueIds) → T | null`.
  - `slotWindow(today?) → { from; to }`; `joinBookings(bookings, slots) → BookingView[]`; `splitBookingViews(views, nowMs?) → { upcoming; past }`; type `BookingView = { id: string; status: string; startsAt: string | null }`.
  - `PASSWORD_RULES`, `PasswordRuleKey`, `passwordChecks(value)`, `meetsPasswordPolicy(value)`; `newPasswordSchema` enforces them (error message `'policy'`, mismatch `'mismatch'`).
  - `lib/bookings.ts` keeps `bookingStatusLabelKey`, `isCancellable`; `splitBookings` is deleted.

- [ ] **Step 1: Failing tests**

Append to `lib/format.test.ts` (keep existing tests; imports extended):

```ts
import {
  formatCountdown,
  formatDayLine,
  formatDayNumber,
  formatMonthYear,
  formatShortDate,
  formatTime,
  formatWeekdayShort,
} from './format';

describe('screen formats (local time)', () => {
  const session = new Date(2026, 8, 21, 6, 30).toISOString(); // Mon 21 Sep 2026 06:30 local
  it('day line capitalises the weekday', () => {
    expect(formatDayLine(new Date(2026, 8, 20, 12))).toBe('Dimanche 20 septembre');
  });
  it('month and year', () => {
    expect(formatMonthYear(new Date(2026, 2, 3).toISOString())).toBe('mars 2026');
  });
  it('short weekday, day number, time, short date', () => {
    expect(formatWeekdayShort(session)).toBe('Lun');
    expect(formatDayNumber(session)).toBe('21');
    expect(formatTime(session)).toBe('06:30');
    expect(formatShortDate(session)).toBe('21 sept.');
  });
  it('invalid input gives an em dash', () => {
    for (const f of [formatMonthYear, formatWeekdayShort, formatDayNumber, formatTime, formatShortDate]) {
      expect(f('nope')).toBe('—');
    }
  });
  it('countdown is m:ss', () => {
    expect(formatCountdown(252)).toBe('4:12');
    expect(formatCountdown(42)).toBe('0:42');
    expect(formatCountdown(0)).toBe('0:00');
    expect(formatCountdown(-5)).toBe('0:00');
  });
});
```

Create `lib/card-view.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { cardView, planLineText } from './card-view';

const now = new Date(2026, 8, 20, 12);
const profile = { membership_type: 'monthly', membership_end: '2026-12-31', membership_status: 'active' };
const tr = (key: string) => ({
  'card.type.monthly': 'Mensuel',
  'card.type.annual': 'Annuel',
  'card.unlimited': 'illimité',
  'card.renewal.monthly': 'Renouvelé chaque mois',
  'card.renewal.annual': 'Renouvelé chaque année',
})[key] ?? key;

describe('cardView', () => {
  it('no subscription', () => {
    const v = cardView(profile, undefined, now);
    expect(v.state).toBe('none');
    expect(v.badgeKey).toBe('card.badge.none');
    expect(v.badgeVariant).toBe('neutral');
    expect(v.planLine).toBeNull();
  });

  it('active with an expiry date', () => {
    const v = cardView(profile, { status: 'active', expires_on: '2026-09-30', entries_remaining: null }, now);
    expect(v.state).toBe('active');
    expect(v.validUntil).toBe('2026-09-30');
    expect(v.badgeVariant).toBe('success');
    expect(planLineText(v.planLine, tr)).toBe('Mensuel illimité · Renouvelé chaque mois');
  });

  it('active falls back to membership_end', () => {
    const v = cardView(profile, { status: 'active', expires_on: null, entries_remaining: null }, now);
    expect(v.validUntil).toBe('2026-12-31');
  });

  it('entry pack', () => {
    const v = cardView(profile, { status: 'active', expires_on: '2026-10-30', entries_remaining: 3 }, now);
    expect(v.state).toBe('pack');
    expect(v.entries).toBe(3);
    expect(planLineText(v.planLine, tr)).toBe('Mensuel · Renouvelé chaque mois');
  });

  it('expired by status', () => {
    const v = cardView(profile, { status: 'expired', expires_on: '2026-08-31', entries_remaining: null }, now);
    expect(v.state).toBe('expired');
    expect(v.expiredOn).toBe('2026-08-31');
    expect(v.badgeKey).toBe('card.subscriptionStatus.expired');
    expect(v.badgeVariant).toBe('warning');
    expect(planLineText(v.planLine, tr)).toBe('Mensuel illimité');
  });

  it('expired by date even when the status still says active (Review Focus 4)', () => {
    const v = cardView(profile, { status: 'active', expires_on: '2026-09-19', entries_remaining: null }, now);
    expect(v.state).toBe('expired');
    expect(v.badgeKey).toBe('card.subscriptionStatus.expired');
  });

  it('exhausted pack is expired with its own label', () => {
    const v = cardView(profile, { status: 'exhausted', expires_on: '2026-10-30', entries_remaining: 0 }, now);
    expect(v.state).toBe('expired');
    expect(v.badgeKey).toBe('card.subscriptionStatus.exhausted');
  });

  it('annual renewal and unknown type', () => {
    const annual = cardView({ ...profile, membership_type: 'annual' }, { status: 'active', expires_on: '2027-01-01', entries_remaining: null }, now);
    expect(planLineText(annual.planLine, tr)).toBe('Annuel illimité · Renouvelé chaque année');
    const odd = cardView({ ...profile, membership_type: 'standard' }, { status: 'active', expires_on: '2027-01-01', entries_remaining: null }, now);
    expect(planLineText(odd.planLine, tr)).toBeNull();
  });
});
```

Create `lib/venue.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { pickMembership } from './venue';

const a = { venue_id: 'v-a', gym_name: 'A' };
const b = { venue_id: 'v-b', gym_name: 'B' };

describe('pickMembership (Review Focus 1)', () => {
  it('prefers the membership of the first entitled venue', () => {
    expect(pickMembership([a, b], ['v-b'])).toBe(b);
  });
  it('falls back to the first membership', () => {
    expect(pickMembership([a, b], ['v-z'])).toBe(a);
    expect(pickMembership([a, b], undefined)).toBe(a);
    expect(pickMembership([a, b], [])).toBe(a);
  });
  it('is null without memberships', () => {
    expect(pickMembership([], ['v-a'])).toBeNull();
    expect(pickMembership(undefined, ['v-a'])).toBeNull();
  });
});
```

Create `lib/booking-slots.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { joinBookings, slotWindow, splitBookingViews } from './booking-slots';

describe('slotWindow', () => {
  it('spans today−30 … today+30 in local days, under the 62-day cap', () => {
    const w = slotWindow(new Date(2026, 8, 20, 23, 30)); // late evening local (Review Focus 3)
    expect(w).toEqual({ from: '2026-08-21', to: '2026-10-20' });
    const days = (Date.parse(w.to) - Date.parse(w.from)) / 86_400_000;
    expect(days).toBeLessThan(62);
  });
});

describe('joinBookings (Review Focus 2)', () => {
  const bookings = [
    { id: 'b1', status: 'confirmed', slot_id: 's1', booked_at: '2026-01-01T00:00:00Z' },
    { id: 'b2', status: 'checked_in', slot_id: 's2', booked_at: '2026-01-01T00:00:00Z' },
    { id: 'b3', status: 'confirmed', slot_id: 'missing', booked_at: '2026-01-01T00:00:00Z' },
  ];
  const slots = [
    { id: 's1', start_time: '2026-09-22T06:30:00Z' },
    { id: 's2', start_time: '2026-09-19T06:30:00Z' },
  ];
  it('takes the session start from the slot, never booked_at', () => {
    expect(joinBookings(bookings, slots)).toEqual([
      { id: 'b1', status: 'confirmed', startsAt: '2026-09-22T06:30:00Z' },
      { id: 'b2', status: 'checked_in', startsAt: '2026-09-19T06:30:00Z' },
      { id: 'b3', status: 'confirmed', startsAt: null },
    ]);
  });
  it('without slots every date is unknown', () => {
    expect(joinBookings(bookings, undefined).every((v) => v.startsAt === null)).toBe(true);
  });
});

describe('splitBookingViews', () => {
  const now = Date.parse('2026-09-20T12:00:00Z');
  const v = (id: string, status: string, startsAt: string | null) => ({ id, status, startsAt });
  it('upcoming = confirmed and future or unknown; past = the rest', () => {
    const { upcoming, past } = splitBookingViews(
      [
        v('late', 'confirmed', '2026-09-26T18:00:00Z'),
        v('soon', 'confirmed', '2026-09-22T06:30:00Z'),
        v('unknown', 'confirmed', null),
        v('done', 'checked_in', '2026-09-19T06:30:00Z'),
        v('older', 'no_show', '2026-09-17T18:00:00Z'),
        v('missed', 'confirmed', '2026-09-18T06:30:00Z'),
        v('lost', 'cancelled', null),
      ],
      now,
    );
    expect(upcoming.map((x) => x.id)).toEqual(['soon', 'late', 'unknown']);
    expect(past.map((x) => x.id)).toEqual(['done', 'missed', 'older', 'lost']);
  });
});
```

Create `lib/password-rules.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { meetsPasswordPolicy, passwordChecks } from './password-rules';

describe('password policy (Cognito: 12+, upper, lower, digit)', () => {
  it('reports each rule in display order', () => {
    expect(passwordChecks('abc')).toEqual([
      { key: 'length', met: false },
      { key: 'uppercase', met: false },
      { key: 'lowercase', met: true },
      { key: 'digit', met: false },
    ]);
  });
  it('accepts only a password meeting all four rules', () => {
    expect(meetsPasswordPolicy('Motdepasse12')).toBe(true);
    expect(meetsPasswordPolicy('motdepasse12')).toBe(false);
    expect(meetsPasswordPolicy('MOTDEPASSE12')).toBe(false);
    expect(meetsPasswordPolicy('Motdepasseee')).toBe(false);
    expect(meetsPasswordPolicy('Motdepas12')).toBe(false);
  });
});
```

Replace the `newPasswordSchema` block in `lib/login-schema.test.ts`:

```ts
describe('newPasswordSchema', () => {
  it('enforces the password policy', () => {
    const r = newPasswordSchema.safeParse({ newPassword: 'longenough', confirmPassword: 'longenough' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe('policy');
  });
  it('requires a matching confirmation', () => {
    const r = newPasswordSchema.safeParse({ newPassword: 'Motdepasse12', confirmPassword: 'Motdepasse13' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe('mismatch');
  });
  it('accepts a valid pair', () => {
    expect(
      newPasswordSchema.safeParse({ newPassword: 'Motdepasse12', confirmPassword: 'Motdepasse12' }).success,
    ).toBe(true);
  });
});
```

In `lib/bookings.test.ts`, delete the `splitBookings` describe block and its import.

Run: `pnpm --filter @iziwellpass/member exec vitest run lib` → FAIL (missing modules/exports).

- [ ] **Step 2: Implement**

Append to `lib/format.ts`:

```ts
function valid(iso: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** « Samedi 20 septembre » — the Carte date line (device local day). */
export function formatDayLine(date: Date = new Date(), locale = 'fr-FR'): string {
  return cap(new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(date));
}

/** « mars 2026 » — « Membre depuis … ». */
export function formatMonthYear(iso: string, locale = 'fr-FR'): string {
  const d = valid(iso);
  return d ? new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(d) : '—';
}

/** « Lun » — the date block's weekday. */
export function formatWeekdayShort(iso: string, locale = 'fr-FR'): string {
  const d = valid(iso);
  return d ? cap(new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d).replace('.', '')) : '—';
}

/** « 22 » — the date block's day number. */
export function formatDayNumber(iso: string, locale = 'fr-FR'): string {
  const d = valid(iso);
  return d ? new Intl.DateTimeFormat(locale, { day: 'numeric' }).format(d) : '—';
}

/** « 06:30 ». */
export function formatTime(iso: string, locale = 'fr-FR'): string {
  const d = valid(iso);
  return d ? new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(d) : '—';
}

/** « 22 sept. » — the cancel sheet's date. */
export function formatShortDate(iso: string, locale = 'fr-FR'): string {
  const d = valid(iso);
  return d ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(d) : '—';
}

/** « 4:12 » — QR countdown (plan R1). */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
```

If a test fails only because this Node's ICU renders « lun. » / « sept. » differently, adjust the expectation to the Node output (keep the capitalisation and dot-stripping behaviour); do not change the helpers' contract.

Create `lib/card-view.ts`:

```ts
import type { BadgeVariant } from '@/components/ui/status-badge.logic';
import { membershipTypeLabelKey, subscriptionStatusLabelKey } from './card-status';

export type CardState = 'active' | 'pack' | 'expired' | 'none';

export interface PlanLine {
  typeKey: string | null;
  unlimited: boolean;
  renewalKey: string | null;
}

export interface CardView {
  state: CardState;
  badgeKey: string;
  badgeVariant: BadgeVariant;
  validUntil: string | null;
  entries: number | null;
  expiredOn: string | null;
  planLine: PlanLine | null;
}

interface ProfileLike {
  membership_type: string;
  membership_end?: string | null;
  membership_status: string;
}
interface SubscriptionLike {
  status: string;
  expires_on?: string | null;
  entries_remaining?: number | null;
}

const ENDED = new Set(['expired', 'exhausted', 'cancelled']);

function localKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Which pass state the Carte draws (spec §5.2). A subscription whose
 * `expires_on` is before today is expired even if its status still says
 * active (Review Focus 4).
 */
export function cardView(
  profile: ProfileLike,
  subscription: SubscriptionLike | undefined,
  now: Date = new Date(),
): CardView {
  if (!subscription) {
    return {
      state: 'none',
      badgeKey: 'card.badge.none',
      badgeVariant: 'neutral',
      validUntil: null,
      entries: null,
      expiredOn: null,
      planLine: null,
    };
  }
  const status = subscription.status.toLowerCase();
  const entries = typeof subscription.entries_remaining === 'number' ? subscription.entries_remaining : null;
  const pastDate = !!subscription.expires_on && subscription.expires_on.slice(0, 10) < localKey(now);
  const type = profile.membership_type.toLowerCase();
  const typeKey = membershipTypeLabelKey(type);

  if (ENDED.has(status) || pastDate) {
    return {
      state: 'expired',
      badgeKey: subscriptionStatusLabelKey(ENDED.has(status) ? status : 'expired'),
      badgeVariant: 'warning',
      validUntil: null,
      entries,
      expiredOn: subscription.expires_on ?? profile.membership_end ?? null,
      planLine: { typeKey, unlimited: entries === null, renewalKey: null },
    };
  }

  const renewalKey = type === 'monthly' ? 'card.renewal.monthly' : type === 'annual' ? 'card.renewal.annual' : null;
  return {
    state: entries !== null ? 'pack' : 'active',
    badgeKey: subscriptionStatusLabelKey(status),
    badgeVariant: 'success',
    validUntil: entries !== null ? null : (subscription.expires_on ?? profile.membership_end ?? null),
    entries,
    expiredOn: null,
    planLine: { typeKey, unlimited: entries === null, renewalKey },
  };
}

/** « Mensuel illimité · Renouvelé chaque mois »; null when the type is unknown. */
export function planLineText(line: PlanLine | null, translate: (key: string) => string): string | null {
  if (!line?.typeKey) return null;
  const head = line.unlimited ? `${translate(line.typeKey)} ${translate('card.unlimited')}` : translate(line.typeKey);
  return line.renewalKey ? `${head} · ${translate(line.renewalKey)}` : head;
}
```

Create `lib/venue.ts`:

```ts
/**
 * The membership shown on the Carte (spec M7): the one for the first venue the
 * member is entitled to (the QR venue), else the first membership.
 */
export function pickMembership<T extends { venue_id: string }>(
  memberships: readonly T[] | undefined,
  venueIds: readonly string[] | undefined,
): T | null {
  if (!memberships || memberships.length === 0) return null;
  const first = venueIds?.[0];
  return memberships.find((m) => m.venue_id === first) ?? memberships[0] ?? null;
}
```

Create `lib/booking-slots.ts`:

```ts
export interface BookingView {
  id: string;
  status: string;
  startsAt: string | null;
}

const DAY = 86_400_000;
function localKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** `/me/slots` window: today−30 … today+30 in local days (backend cap < 62, spec M8). */
export function slotWindow(today: Date = new Date()): { from: string; to: string } {
  const noon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  return {
    from: localKey(new Date(noon.getTime() - 30 * DAY)),
    to: localKey(new Date(noon.getTime() + 30 * DAY)),
  };
}

/** Session start per booking from its slot; unknown when the slot is not in the list. */
export function joinBookings(
  bookings: readonly { id: string; status: string; slot_id: string }[],
  slots: readonly { id: string; start_time: string }[] | undefined,
): BookingView[] {
  const start = new Map((slots ?? []).map((s) => [s.id, s.start_time]));
  return bookings.map((b) => ({ id: b.id, status: b.status, startsAt: start.get(b.slot_id) ?? null }));
}

/** Upcoming = confirmed and in the future or of unknown date; past = everything else. */
export function splitBookingViews(
  views: readonly BookingView[],
  nowMs: number = Date.now(),
): { upcoming: BookingView[]; past: BookingView[] } {
  const ts = (v: BookingView) => (v.startsAt ? Date.parse(v.startsAt) : Number.NaN);
  const upcoming: BookingView[] = [];
  const past: BookingView[] = [];
  for (const v of views) {
    const t = ts(v);
    const future = Number.isNaN(t) || t >= nowMs;
    if (v.status.toLowerCase() === 'confirmed' && future) upcoming.push(v);
    else past.push(v);
  }
  const nullsLast = (a: number, b: number, dir: 1 | -1) =>
    Number.isNaN(a) ? 1 : Number.isNaN(b) ? -1 : dir * (a - b);
  upcoming.sort((a, b) => nullsLast(ts(a), ts(b), 1));
  past.sort((a, b) => nullsLast(ts(a), ts(b), -1));
  return { upcoming, past };
}
```

Create `lib/password-rules.ts`:

```ts
/**
 * The Cognito pool password policy (members and staff share the pool; see
 * apps/owner/lib/password.ts): 12+ characters, an uppercase, a lowercase, a
 * digit. Display order = list order (spec M1).
 */
export const PASSWORD_RULES = [
  { key: 'length', test: (v: string) => v.length >= 12 },
  { key: 'uppercase', test: (v: string) => /[A-Z]/.test(v) },
  { key: 'lowercase', test: (v: string) => /[a-z]/.test(v) },
  { key: 'digit', test: (v: string) => /\d/.test(v) },
] as const;

export type PasswordRuleKey = (typeof PASSWORD_RULES)[number]['key'];

export function passwordChecks(value: string): { key: PasswordRuleKey; met: boolean }[] {
  return PASSWORD_RULES.map((r) => ({ key: r.key, met: r.test(value) }));
}

export function meetsPasswordPolicy(value: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(value));
}
```

In `lib/login-schema.ts` replace `newPasswordSchema`:

```ts
import { meetsPasswordPolicy } from './password-rules';

export const newPasswordSchema = z
  .object({
    newPassword: z.string().refine(meetsPasswordPolicy, { message: 'policy' }),
    confirmPassword: z.string().min(1, { message: 'mismatch' }),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'mismatch',
  });
```

In `lib/bookings.ts` delete `splitBookings` and its doc comment.

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @iziwellpass/member exec vitest run` → PASS. `pnpm --filter @iziwellpass/member typecheck` will fail only where `bookings.tsx` imports `splitBookings` and login uses `passwordTooShort`; make them compile with the smallest change: in `bookings.tsx` build views with `joinBookings(list.data ?? [], undefined)` + `splitBookingViews` and render `booking.startsAt ?? ''` where `booked_at` was used (Task 8 rewrites the screen); login keeps compiling (the key still exists until Task 5).

- [ ] **Step 4: Gates and commit**

```bash
git add apps/member
git commit -m "feat(member): card state, venue pick, slot join, password policy and screen formats

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Member mock server

**Files:**
- Modify: `apps/member/scripts/mock-server.mjs`

**Interfaces:**
- Produces: `GET /gms/v1/me/memberships`, `GET /gms/v1/me/slots?venue_id=&from=&to=`, switches `MOCK_CARD=active|pack|expired|none` (default `active`), `MOCK_BOOKINGS=empty`, `MOCK_QR=unavailable`, `MOCK_QR_TTL=<seconds>` (default 300, the backend lifetime — lower it only to reach the expired QR state quickly); seeded bookings with `slot_id`s whose slots start in the future, the past, and outside the window.

- [ ] **Step 1: Header comment**

Replace the usage paragraph's "In-memory state" lines with the list of switches:

```js
// Switches (read once at start):
//   MOCK_CARD=active|pack|expired|none   subscription shape for the Carte states (default active)
//   MOCK_BOOKINGS=empty                  /me/bookings returns []
//   MOCK_QR=unavailable                  POST /me/qr answers 403 FEATURE_NOT_AVAILABLE
//   MOCK_QR_TTL=<seconds>                QR token lifetime (default 300, the backend's)
// In-memory state: cancelling a booking flips it to `cancelled`; booking
// `bkg-fenetre` always answers 409 (cancellation window closed). Restart to reset.
```

- [ ] **Step 2: Data**

Replace `VENUE_ID`, the time helpers and the `bookings` array with:

```js
const VENUE_ID = 'venue-mock-dakar-01';
const iso = (d) => d.toISOString();
const daysFromNow = (n) => new Date(Date.now() + n * 86_400_000);
const atLocal = (dayOffset, hh, mm) => {
  const d = daysFromNow(dayOffset);
  d.setHours(hh, mm, 0, 0);
  return d;
};

const MOCK_CARD = process.env.MOCK_CARD ?? 'active';
const MOCK_BOOKINGS = process.env.MOCK_BOOKINGS ?? '';
const MOCK_QR = process.env.MOCK_QR ?? '';

const slots = [
  ['slot-yoga-lun', 2, 6, 30, 60],
  ['slot-yoga-mer', 4, 6, 30, 60],
  ['slot-boxe-ven', 6, 18, 0, 60],
  ['slot-yoga-passe', -1, 6, 30, 60],
  ['slot-boxe-passe', -3, 18, 0, 60],
  ['slot-tres-ancien', -45, 7, 0, 60],
].map(([id, day, hh, mm, dur]) => {
  const start = atLocal(day, hh, mm);
  return {
    id,
    tenant_id: 'tenant-mock',
    venue_id: VENUE_ID,
    schedule_id: `sch-${id}`,
    resource_id: 'res-mock',
    date: iso(start).slice(0, 10),
    start_time: iso(start),
    end_time: iso(new Date(start.getTime() + dur * 60_000)),
    capacity: 16,
    booked_count: 8,
    status: 'available',
    created_at: iso(daysFromNow(-60)),
  };
});

const mkBooking = (id, slotId, status, extra = {}) => ({
  id,
  slot_id: slotId,
  status,
  source: 'member_app',
  tenant_id: 'tenant-mock',
  member_id: 'mbr-mock-01',
  booked_at: iso(daysFromNow(-10)),
  created_at: iso(daysFromNow(-10)),
  updated_at: iso(daysFromNow(-10)),
  ...extra,
});

// --- mutable state (reset on restart) ---------------------------------------
const bookings =
  MOCK_BOOKINGS === 'empty'
    ? []
    : [
        mkBooking('bkg-confirmee', 'slot-yoga-lun', 'confirmed'),
        mkBooking('bkg-fenetre', 'slot-yoga-mer', 'confirmed'),
        mkBooking('bkg-boxe', 'slot-boxe-ven', 'confirmed'),
        mkBooking('bkg-enregistree', 'slot-yoga-passe', 'checked_in', { checked_in_at: iso(atLocal(-1, 6, 28)) }),
        mkBooking('bkg-absent', 'slot-boxe-passe', 'no_show'),
        mkBooking('bkg-hors-fenetre', 'slot-tres-ancien', 'checked_in'),
      ];
```

Replace `profileFor`'s `membership_type: 'standard'` with `'monthly'`, `membership_start` with `iso(atLocal(-200, 9, 0))`, and `last_name: given ? '' : '(mock)'` with `last_name: given ? 'Ndiaye' : '(mock)'`.

Replace `subscriptions` with:

```js
const SUBSCRIPTION_SHAPES = {
  active: { status: 'active', entries_remaining: null, expires_on: iso(daysFromNow(10)).slice(0, 10) },
  pack: { status: 'active', entries_remaining: 3, expires_on: iso(daysFromNow(40)).slice(0, 10) },
  expired: { status: 'expired', entries_remaining: null, expires_on: iso(daysFromNow(-20)).slice(0, 10) },
};
const subscriptions =
  MOCK_CARD === 'none'
    ? []
    : [
        {
          id: 'sub-mock-01',
          plan_id: 'plan-mensuel',
          venue_id: VENUE_ID,
          payment_status: 'paid',
          ...(SUBSCRIPTION_SHAPES[MOCK_CARD] ?? SUBSCRIPTION_SHAPES.active),
        },
      ];
```

- [ ] **Step 3: Routes**

`handle` receives the path without the query today (`url === '/gms/v1/me'`); parse first: at the top of `handle`, `const { pathname, searchParams } = new URL(url, 'http://mock');` and compare `pathname` everywhere instead of `url` (including `cancelMatch`). Add:

```js
  if (req.method === 'GET' && pathname === '/gms/v1/me/memberships') {
    return [
      200,
      envelope([
        { venue_id: VENUE_ID, gym_name: 'Studio Dakar Plateau', member_id: 'mbr-mock-01', tenant_id: 'tenant-mock' },
      ]),
    ];
  }
  if (req.method === 'GET' && pathname === '/gms/v1/me/slots') {
    const from = searchParams.get('from');
    const to = searchParams.get('to') ?? from;
    if (searchParams.get('venue_id') !== VENUE_ID || !from) {
      return [400, errorBody(400, 'VALIDATION_ERROR', 'venue_id and from are required')];
    }
    return [200, envelope(slots.filter((s) => s.date >= from && s.date <= to))];
  }
```

In the `/gms/v1/me/qr` branch: return `[403, errorBody(403, 'FEATURE_NOT_AVAILABLE', 'Feature not available: member_qr')]` when `MOCK_QR === 'unavailable'`; otherwise the token's `expires_at` is `Math.floor(Date.now() / 1000) + Number(process.env.MOCK_QR_TTL ?? 300)`.

Update the start log: `` `[mock] member API mock on http://localhost:${PORT} (card ${MOCK_CARD}${MOCK_BOOKINGS ? ', bookings ' + MOCK_BOOKINGS : ''}${MOCK_QR ? ', qr ' + MOCK_QR : ''})` ``.

- [ ] **Step 4: Verify with curl on 8092**

```bash
cd apps/member
PORT=8092 node scripts/mock-server.mjs & M=$!; sleep 1
H='authorization: Bearer x.eyJlbWFpbCI6ImF3YUB0ZXN0LnNuIn0.x'
curl -s -H "$H" localhost:8092/gms/v1/me/memberships
F=$(node -e "const d=new Date();d.setDate(d.getDate()-30);console.log(d.toISOString().slice(0,10))"); T=$(node -e "const d=new Date();d.setDate(d.getDate()+30);console.log(d.toISOString().slice(0,10))")
curl -s -H "$H" "localhost:8092/gms/v1/me/slots?venue_id=venue-mock-dakar-01&from=$F&to=$T" | node -e "console.log(JSON.parse(require('fs').readFileSync(0)).data.map(s=>s.id))"
curl -s -H "$H" localhost:8092/gms/v1/me/bookings | node -e "console.log(JSON.parse(require('fs').readFileSync(0)).data.map(b=>[b.id,b.slot_id,b.status]))"
kill $M
MOCK_CARD=none MOCK_QR=unavailable MOCK_BOOKINGS=empty PORT=8092 node scripts/mock-server.mjs & M=$!; sleep 1
curl -s -H "$H" localhost:8092/gms/v1/me/subscription; curl -s -o /dev/null -w '%{http_code}\n' -X POST -H "$H" localhost:8092/gms/v1/me/qr; curl -s -H "$H" localhost:8092/gms/v1/me/bookings
kill $M
```

Expected: one membership « Studio Dakar Plateau »; slots list excludes `slot-tres-ancien`; six bookings; with the switches: `[]` subscription, `403`, `[]` bookings. Paste real output in the report.

- [ ] **Step 5: Commit**

```bash
git add apps/member/scripts/mock-server.mjs
git commit -m "feat(member): mock memberships, slots and state switches for the canvas states

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Connexion

**Files:**
- Modify: `apps/member/app/(auth)/login.tsx`, `apps/member/messages/fr.json`, `en.json`

**Interfaces:**
- Consumes: `Screen({ wash })`, `TextField`, `Button`, `Notice`, `passwordChecks`, `newPasswordSchema` (messages `policy`/`mismatch`), `AppText`, `colors`.

- [ ] **Step 1: Messages**

fr, inside `"login"`: remove `"passwordTooShort"`; add `"footer": "Votre accès est créé par votre salle. Contactez l'accueil si besoin."`, `"passwordPolicy": "Le mot de passe ne respecte pas les règles."`, `"rules": { "length": "12 caractères minimum", "uppercase": "Une majuscule", "lowercase": "Une minuscule", "digit": "Un chiffre" }`. en: remove `"passwordTooShort"`; add `"footer": "Your access is created by your gym. Ask the front desk if needed."`, `"passwordPolicy": "The password doesn't meet the rules."`, `"rules": { "length": "At least 12 characters", "uppercase": "One uppercase letter", "lowercase": "One lowercase letter", "digit": "One number" }`.

- [ ] **Step 2: Rewrite the screen**

Replace `app/(auth)/login.tsx`:

```tsx
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { View } from 'react-native';
import { Check, ChevronLeft, Circle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { TextField } from '@/components/form/field';
import { useAuth } from '@/lib/auth/context';
import { t } from '@/lib/i18n';
import { authErrorMessageKey } from '@/lib/auth/errors';
import { passwordChecks } from '@/lib/password-rules';
import { colors } from '@/lib/theme';
import {
  credentialsSchema,
  newPasswordSchema,
  type CredentialsValues,
  type NewPasswordValues,
} from '@/lib/login-schema';

type Challenge = { complete: (pw: string) => Promise<{ idToken: string }> };

function Wordmark() {
  return (
    <View className="flex-row items-center gap-2">
      <View className="h-6 w-6 rounded-[7px] bg-ink" />
      <AppText variant="heading">IziWellPass</AppText>
    </View>
  );
}

function Checklist({ value }: { value: string }) {
  return (
    <View className="gap-1.5" accessibilityRole="list">
      {passwordChecks(value).map(({ key, met }) => (
        <View key={key} className="flex-row items-center gap-2">
          {met ? (
            <Check color={colors.success.foreground} size={16} strokeWidth={1.5} />
          ) : (
            <Circle color={colors.muted} size={8} fill={colors.muted} strokeWidth={0} />
          )}
          <AppText variant="label" className={met ? 'text-success-foreground' : 'text-muted'}>
            {t(`login.rules.${key}`)}
          </AppText>
        </View>
      ))}
    </View>
  );
}

export default function Login() {
  const { signIn, onSignedIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const creds = useForm<CredentialsValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: '', password: '' },
  });
  const pw = useForm<NewPasswordValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
    mode: 'onChange',
  });
  const newPassword = useWatch({ control: pw.control, name: 'newPassword' }) ?? '';
  const confirmPassword = useWatch({ control: pw.control, name: 'confirmPassword' }) ?? '';

  const onCredentials = creds.handleSubmit(async ({ email, password }) => {
    setFormError(null);
    try {
      const result = await signIn(email, password);
      if (result.kind === 'success') onSignedIn(result.idToken);
      else setChallenge({ complete: result.complete });
    } catch (err) {
      setFormError(t(authErrorMessageKey(err)));
    }
  });

  const onNewPassword = pw.handleSubmit(async ({ newPassword: value }) => {
    if (!challenge) return;
    setFormError(null);
    try {
      const { idToken } = await challenge.complete(value);
      onSignedIn(idToken);
    } catch (err) {
      setFormError(t(authErrorMessageKey(err)));
    }
  });

  if (challenge) {
    const policyMet = passwordChecks(newPassword).every((c) => c.met);
    const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;
    return (
      <Screen contentClassName="gap-6">
        <View className="-ml-2 self-start">
          <Button
            label={t('login.back')}
            variant="ghost"
            size="sm"
            fullWidth={false}
            icon={ChevronLeft}
            onPress={() => {
              setChallenge(null);
              setFormError(null);
              pw.reset();
            }}
          />
        </View>
        <View className="gap-2">
          <AppText variant="title">{t('login.newPasswordTitle')}</AppText>
          <AppText variant="body" className="text-muted">
            {t('login.newPasswordHint')}
          </AppText>
        </View>
        {formError ? <Notice variant="destructive" message={formError} /> : null}
        <TextField control={pw.control} name="newPassword" label={t('login.newPassword')} secure autoComplete="new-password" />
        <Checklist value={newPassword} />
        <TextField
          control={pw.control}
          name="confirmPassword"
          label={t('login.confirmPassword')}
          secure
          autoComplete="new-password"
          errorText={mismatch ? t('login.passwordMismatch') : undefined}
        />
        <Button
          label={t('login.newPasswordSubmit')}
          onPress={onNewPassword}
          loading={pw.formState.isSubmitting}
          disabled={!policyMet || mismatch || confirmPassword.length === 0}
        />
      </Screen>
    );
  }

  return (
    <Screen wash contentClassName="min-h-full">
      <View className="flex-1 justify-center gap-8 pt-10">
        <View className="items-center gap-4">
          <Wordmark />
          <AppText variant="display" className="text-center">
            {t('login.title')}
          </AppText>
          <AppText variant="body" className="text-center text-muted">
            {t('login.welcome')}
          </AppText>
        </View>
        {formError ? <Notice variant="destructive" message={formError} /> : null}
        <View className="gap-4">
          <TextField
            control={creds.control}
            name="email"
            label={t('login.email')}
            keyboardType="email-address"
            autoComplete="email"
            errorText={creds.formState.errors.email ? t('login.emailInvalid') : undefined}
          />
          <TextField
            control={creds.control}
            name="password"
            label={t('login.password')}
            secure
            autoComplete="password"
            errorText={creds.formState.errors.password ? t('login.passwordRequired') : undefined}
          />
        </View>
        <Button label={t('login.submit')} onPress={onCredentials} loading={creds.formState.isSubmitting} />
      </View>
      {formError ? null : (
        <AppText variant="caption" className="mt-10 text-center" style={{ marginBottom: insets.bottom }}>
          {t('login.footer')}
        </AppText>
      )}
    </Screen>
  );
}
```

- [ ] **Step 3: Gates + visual check**

Gates. Start mock + Expo web (Global Constraints). At 390×844: screenshot login (compare `J237z.png`), sign in with password `wrong` (compare `DeeZA.png`), sign out/clear, sign in with password `invite` (compare `BQAl7.png`); type `Motdepasse12` and watch all four rules turn green and « Valider » enable; mismatch shows the error. Screenshots `/tmp/spm-task5-*.png`; note differences vs the frames in the report. Stop everything.

- [ ] **Step 4: Commit**

```bash
git add apps/member
git commit -m "feat(member): Connexion and Choisir un mot de passe on the canvas

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Carte

**Files:**
- Modify: `apps/member/app/(app)/index.tsx`, `apps/member/messages/fr.json`, `en.json`

**Interfaces:**
- Consumes: `cardView`, `planLineText`, `pickMembership`, `formatDayLine`, `formatMonthYear`, `formatDate`, `Card`, `StatusBadge`, `Button`, `AppText`, `QueryBoundary`, `useMeMemberships`, `useMeVenues`, `useMeProfile`, `useMeSubscription`.

- [ ] **Step 1: Messages**

fr inside `"card"`: add `"badge": { "none": "Aucun abonnement" }`, `"unlimited": "illimité"`, `"renewal": { "monthly": "Renouvelé chaque mois", "annual": "Renouvelé chaque année" }`, `"expiredOn": "Expiré le {date}"`, `"noSubscriptionHint": "Rapprochez-vous de l'accueil pour en souscrire un."`, `"email": "E-mail"`, `"phone": "Téléphone"`. en: `"badge": { "none": "No subscription" }`, `"unlimited": "unlimited"`, `"renewal": { "monthly": "Renews every month", "annual": "Renews every year" }`, `"expiredOn": "Expired on {date}"`, `"noSubscriptionHint": "Ask the front desk to take one out."`, `"email": "Email"`, `"phone": "Phone"`. Change fr `"greeting"` is already « Bonjour {name} »; set `"memberSince": "Membre depuis {date}"` (unchanged).

- [ ] **Step 2: Rewrite the screen**

Replace `app/(app)/index.tsx`:

```tsx
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { LogOut, QrCode } from 'lucide-react-native';
import { useMeMemberships, useMeProfile, useMeSubscription, useMeVenues } from '@iziwellpass/api/generated';
import type {
  ApiResponseMyProfileResponseData,
  ApiResponseVecMySubscriptionResponseDataItem,
} from '@iziwellpass/api/schemas';
import { unwrap } from '@iziwellpass/api/client';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { QueryBoundary } from '@/components/ui/query-boundary';
import { useAuth } from '@/lib/auth/context';
import { t } from '@/lib/i18n';
import { formatDate, formatDayLine, formatMonthYear } from '@/lib/format';
import { cardView, planLineText } from '@/lib/card-view';
import { pickMembership } from '@/lib/venue';

type Profile = ApiResponseMyProfileResponseData;
type Subscription = ApiResponseVecMySubscriptionResponseDataItem;

function Pass({ profile, subscription, venue }: { profile: Profile; subscription?: Subscription; venue: string | null }) {
  const view = cardView(profile, subscription);
  const plan = planLineText(view.planLine, (key) => t(key));
  const name = `${profile.first_name} ${profile.last_name}`.trim();
  return (
    <Card tint="vert" className="gap-4">
      <View className="flex-row items-center justify-between gap-3">
        <AppText variant="label" className="flex-1 text-muted-strong" numberOfLines={1}>
          {venue ?? ''}
        </AppText>
        <StatusBadge label={t(view.badgeKey)} variant={view.badgeVariant} />
      </View>
      <AppText variant="heading" className="text-[22px] leading-[28px]">
        {name}
      </AppText>

      <View className="gap-1">
        {view.state === 'active' && view.validUntil ? (
          <AppText variant="bodyStrong" className="text-[17px]">
            {t('card.validUntil', { date: formatDate(view.validUntil) })}
          </AppText>
        ) : null}
        {view.state === 'pack' && view.entries !== null ? (
          <View className="flex-row items-baseline gap-2">
            <AppText variant="numericLarge">{String(view.entries)}</AppText>
            <AppText variant="label" className="text-muted-strong">
              {t('card.entriesUnit', { count: view.entries })}
            </AppText>
          </View>
        ) : null}
        {view.state === 'expired' ? (
          <AppText variant="bodyStrong" className="text-[17px]">
            {view.expiredOn ? t('card.expiredOn', { date: formatDate(view.expiredOn) }) : t(view.badgeKey)}
          </AppText>
        ) : null}
        {view.state === 'none' ? (
          <>
            <AppText variant="bodyStrong" className="text-[17px]">
              {t('card.noSubscription')}
            </AppText>
            <AppText variant="label" className="text-muted-strong">
              {t('card.noSubscriptionHint')}
            </AppText>
          </>
        ) : null}
        {plan ? (
          <AppText variant="label" className="text-muted-strong">
            {plan}
          </AppText>
        ) : null}
      </View>

      <View className="flex-row items-end justify-between">
        <View>
          <AppText variant="caption" className="text-muted-strong">
            {t('card.memberNo')}
          </AppText>
          <AppText variant="numeric">{profile.id.slice(0, 8).toUpperCase()}</AppText>
        </View>
        <AppText variant="caption" className="text-muted-strong">
          {t('card.memberSince', { date: formatMonthYear(profile.membership_start) })}
        </AppText>
      </View>
    </Card>
  );
}

function Row({ label, value, numeric }: { label: string; value: string; numeric?: boolean }) {
  return (
    <View className="min-h-[52px] flex-row items-center justify-between gap-4 border-b border-border">
      <AppText variant="label">{label}</AppText>
      <AppText variant={numeric ? 'numeric' : 'body'} className="flex-1 text-right" numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
}

function PassSkeleton() {
  return (
    <View className="mt-6 gap-5">
      <View className="h-[232px] rounded-panel bg-secondary" />
      <View className="h-[52px] rounded-pill bg-secondary" />
    </View>
  );
}

export default function CardScreen() {
  const router = useRouter();
  const { claims, signOut } = useAuth();
  const profileQ = useMeProfile(undefined, { query: { select: unwrap } });
  const subQ = useMeSubscription(undefined, { query: { select: unwrap } });
  const venuesQ = useMeVenues(undefined, { query: { select: unwrap } });
  const membershipsQ = useMeMemberships({ query: { select: unwrap } });
  const subscription = subQ.data?.[0]; // the pass reflects the first subscription
  const venue = pickMembership(membershipsQ.data, venuesQ.data)?.gym_name ?? null;
  const firstName = claims?.name?.split(' ')[0] ?? profileQ.data?.first_name ?? null;
  const profile = profileQ.data;

  return (
    <Screen>
      <AppText variant="label">{formatDayLine()}</AppText>
      <AppText variant="title" className="mt-1">
        {firstName ? t('card.greeting', { name: firstName }) : t('card.greetingNoName')}
      </AppText>

      <QueryBoundary
        isLoading={profileQ.isLoading}
        isError={profileQ.isError}
        errorText={t('card.error')}
        onRetry={() => void profileQ.refetch()}
        loadingFallback={<PassSkeleton />}
      >
        {profile ? (
          <>
            <View className="mt-6">
              <Pass profile={profile} subscription={subscription} venue={venue} />
            </View>
            {subscription ? (
              <View className="mt-5">
                <Button label={t('card.showQr')} icon={QrCode} onPress={() => router.navigate('/qr')} />
              </View>
            ) : null}
            <View className="mt-8">
              <AppText variant="heading" className="mb-1">
                {t('card.detailsTitle')}
              </AppText>
              {profile.email ? <Row label={t('card.email')} value={profile.email} /> : null}
              {profile.phone ? <Row label={t('card.phone')} value={profile.phone} numeric /> : null}
              {venue ? <Row label={t('card.venue')} value={venue} /> : null}
            </View>
            <View className="mt-6 items-center">
              <Button label={t('card.signOut')} variant="ghost" fullWidth={false} icon={LogOut} onPress={signOut} />
            </View>
          </>
        ) : null}
      </QueryBoundary>
    </Screen>
  );
}
```

If `useMeMemberships` takes different arguments than `({ query })`, match its generated signature in `packages/api/src/generated/endpoints.ts` (search `export function useMeMemberships`). Remove any now-unused keys only if nothing references them (`card.plan`, `card.status`, `card.validLabel`); leave them otherwise.

- [ ] **Step 3: Gates + visual check**

Gates. Mock + web; sign in (`owner`). Screenshot the Carte for each `MOCK_CARD` value (restart the mock between them; reload the app): `active` vs `NgWGe.png`, `pack` vs `Q3ohJw.png`, `expired` vs `HAIgO.png`, `none` vs `bRIoW.png`. Stop the mock mid-session and reload to confirm the memberships failure only hides the venue. Screenshots `/tmp/spm-task6-*.png`. Stop everything.

- [ ] **Step 4: Commit**

```bash
git add apps/member
git commit -m "feat(member): Carte on the canvas (active, pack, expired, no subscription)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: QR

**Files:**
- Modify: `apps/member/app/(app)/qr.tsx`, `apps/member/messages/fr.json`, `en.json`

**Interfaces:**
- Consumes: `useMintMemberQr`, `useMeVenues`, `useMeMemberships`, `useMeProfile`, `useMeSubscription`, `secondsUntil`, `formatCountdown`, `cardView`, `planLineText`, `pickMembership`, `ProgressBar`, `Avatar`, `StatusBadge`, `Button`, `Notice`, `AppText`, `colors`.

- [ ] **Step 1: Messages**

fr `"qr"`: set `"expiresIn": "Expire dans {time}"`, `"unavailableHint": "Le QR d'entrée n'est pas activé pour votre salle. Présentez votre nom à l'accueil."`; add `"beforeHint": "Le code est valable 5 minutes après génération."`, `"active": "Actif"`. en: `"expiresIn": "Expires in {time}"`, `"unavailableHint": "Entry QR isn't enabled for your gym. Give your name at the front desk."`, `"beforeHint": "The code is valid for 5 minutes once generated."`, `"active": "Active"`.

- [ ] **Step 2: Rewrite the screen**

Replace `app/(app)/qr.tsx`:

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Brightness from 'expo-brightness';
import QRCode from 'react-native-qrcode-svg';
import { QrCode, RefreshCw } from 'lucide-react-native';
import {
  useMeMemberships,
  useMeProfile,
  useMeSubscription,
  useMeVenues,
  useMintMemberQr,
} from '@iziwellpass/api/generated';
import { unwrap, ApiError } from '@iziwellpass/api/client';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Avatar } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/ui/status-badge';
import { t } from '@/lib/i18n';
import { secondsUntil } from '@/lib/countdown';
import { formatCountdown } from '@/lib/format';
import { cardView, planLineText } from '@/lib/card-view';
import { pickMembership } from '@/lib/venue';
import { colors } from '@/lib/theme';

const QR_BOX = 'h-[288px] w-[288px] items-center justify-center rounded-panel border border-border bg-background';

/** Raise brightness while `live`; restore when not live or when leaving (spec M6). */
function useBrightnessWhile(live: boolean) {
  const previous = useRef<number | null>(null);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (live) {
        void (async () => {
          try {
            previous.current = await Brightness.getBrightnessAsync();
            if (!cancelled) await Brightness.setBrightnessAsync(1);
          } catch {
            // brightness control unavailable (e.g. web) — the QR still shows
          }
        })();
      }
      return () => {
        cancelled = true;
        const restore = previous.current;
        previous.current = null;
        if (restore !== null) void Brightness.setBrightnessAsync(restore).catch(() => undefined);
      };
    }, [live]),
  );
}

export default function QrScreen() {
  // POST /me/qr requires venue_id; mint for the first entitled venue (no picker yet).
  const venues = useMeVenues(undefined, { query: { select: unwrap } });
  const venueId = venues.data?.[0];
  const memberships = useMeMemberships({ query: { select: unwrap } });
  const profile = useMeProfile(undefined, { query: { select: unwrap } });
  const subs = useMeSubscription(undefined, { query: { select: unwrap } });

  const mint = useMintMemberQr({ mutation: {} });
  const [mintedAt, setMintedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const data = mint.data ? unwrap(mint.data) : null;
  const remaining = data ? secondsUntil(data.expires_at, now) : 0;
  const lifetime = data && mintedAt ? Math.max(1, data.expires_at - Math.floor(mintedAt / 1000)) : 1;
  const expired = !!data && remaining <= 0;
  const live = !!data && !expired;
  const unavailable = mint.error instanceof ApiError && mint.error.status === 403;
  const hardError = (mint.isError && !unavailable) || venues.isError || (venues.isSuccess && !venueId);

  const doMint = useCallback(() => {
    if (!venueId || mint.isPending) return;
    mint.mutate({ data: { venue_id: venueId } }, { onSuccess: () => { setMintedAt(Date.now()); setNow(Date.now()); } });
  }, [venueId, mint]);

  useBrightnessWhile(live);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [live]);

  const venue = pickMembership(memberships.data, venues.data)?.gym_name ?? '';
  const view = profile.data ? cardView(profile.data, subs.data?.[0]) : null;
  const plan = view ? planLineText(view.planLine, (key) => t(key)) : null;
  const name = profile.data ? `${profile.data.first_name} ${profile.data.last_name}`.trim() : '';

  return (
    <Screen scroll={false}>
      <AppText variant="title" className="mt-1 text-center">
        {t('qr.title')}
      </AppText>
      <AppText variant="body" className="mt-1 text-center text-muted">
        {t('qr.subtitle')}
      </AppText>

      <View className="flex-1 items-center justify-center gap-6">
        {unavailable ? (
          <View className="w-full">
            <Notice variant="warning" title={t('qr.unavailable')} message={t('qr.unavailableHint')} />
          </View>
        ) : hardError ? (
          <View className="w-full">
            <Notice
              variant="destructive"
              message={t('qr.error')}
              action={{ label: t('common.retry'), onPress: venueId ? doMint : () => void venues.refetch() }}
            />
          </View>
        ) : live && data ? (
          <>
            <View className={QR_BOX}>
              <QRCode value={data.token} size={240} color={colors.ink} backgroundColor={colors.background} />
            </View>
            <View className="w-full max-w-[288px] gap-2">
              <ProgressBar value={remaining / lifetime} label={t('qr.expiresIn', { time: formatCountdown(remaining) })} />
              <AppText variant="numeric" className="text-center text-muted">
                {t('qr.expiresIn', { time: formatCountdown(remaining) })}
              </AppText>
            </View>
          </>
        ) : expired ? (
          <>
            <View className={`${QR_BOX} gap-2 bg-side`}>
              <AppText variant="heading">{t('qr.expired')}</AppText>
              <AppText variant="body" className="text-muted">
                {t('qr.expiredHint')}
              </AppText>
            </View>
            <Button label={t('qr.refresh')} icon={RefreshCw} onPress={doMint} loading={mint.isPending} fullWidth={false} />
          </>
        ) : (
          <>
            <View className={QR_BOX}>
              <QrCode color={colors.border} size={120} strokeWidth={1} />
            </View>
            <AppText variant="label" className="max-w-[288px] text-center">
              {t('qr.beforeHint')}
            </AppText>
            <Button
              label={t('qr.generate')}
              icon={QrCode}
              onPress={doMint}
              loading={mint.isPending || venues.isLoading}
              fullWidth={false}
            />
          </>
        )}
      </View>

      {live && name ? (
        <View className="mb-4 flex-row items-center gap-3 rounded-panel border border-border px-4 py-3">
          <Avatar name={name} />
          <View className="flex-1">
            <AppText variant="bodyStrong" numberOfLines={1}>
              {name}
            </AppText>
            <AppText variant="label" numberOfLines={1}>
              {[plan, venue].filter(Boolean).join(' · ')}
            </AppText>
          </View>
          <StatusBadge label={t('qr.active')} variant="success" />
        </View>
      ) : null}
    </Screen>
  );
}
```

Match the member-strip placement and the QR box to `SHbyT.png` (the canvas shows the strip at the bottom above the tab bar). Check `useMintMemberQr`'s `mutate` accepts per-call `{ onSuccess }` (TanStack v5 does).

- [ ] **Step 3: Gates + visual check**

Gates. Mock + web, sign in, open QR: before generation (vs `vCv3M.png`) → tap « Générer mon QR » twice quickly and confirm exactly one `POST /me/qr` in the mock log (Review Focus 5) → active (vs `SHbyT.png`, countdown `4:5x`, progress bar full). Restart the mock with `MOCK_QR_TTL=15`, generate again and wait for expiry → expired (vs `OHQlt.png`) → « Régénérer » shows a new code. Restart with `MOCK_QR=unavailable` → unavailable (vs `pRb9A.png`). Screenshots `/tmp/spm-task7-*.png`. Stop everything.

- [ ] **Step 4: Commit**

```bash
git add apps/member
git commit -m "feat(member): QR on the canvas — generate on tap, real lifetime, expired and unavailable states

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Réservations

**Files:**
- Modify: `apps/member/app/(app)/bookings.tsx`, `apps/member/messages/fr.json`, `en.json`

**Interfaces:**
- Consumes: `useMeListBookings`, `useMeCancelBooking`, `getMeListBookingsQueryKey`, `useMeSlots`, `useMeVenues`, `slotWindow`, `joinBookings`, `splitBookingViews`, `BookingView`, `bookingStatusLabelKey`, `isCancellable`, `statusBadgeVariant`, `formatWeekdayShort`, `formatDayNumber`, `formatTime`, `formatShortDate`, `Sheet`, `useToast`, `StatusBadge`, `Button`, `IconMedallion`, `QueryBoundary`, `AppText`.

- [ ] **Step 1: Messages**

fr `"bookings"`: set `"emptyHint": "Vos prochaines séances apparaîtront ici. Réservez à l'accueil ou auprès de votre coach."`, `"cancelConfirmBody": "{when}. Cette action est définitive."`; add `"session": "Séance"`, `"dateUnknown": "Date indisponible"`, `"when": "Séance · {weekday} {date} à {time}"`, `"whenUnknown": "Séance"`, `"cancelErrorHint": "Réessayez dans un instant."`; remove `"cancelError"` if nothing else uses it. en: `"emptyHint": "Your next sessions will show up here. Book at the front desk or with your coach."`, `"cancelConfirmBody": "{when}. This can't be undone."`, `"session": "Session"`, `"dateUnknown": "Date unavailable"`, `"when": "Session · {weekday} {date} at {time}"`, `"whenUnknown": "Session"`, `"cancelErrorHint": "Try again in a moment."`.

- [ ] **Step 2: Rewrite the screen**

Replace `app/(app)/bookings.tsx`:

```tsx
import { useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarX2 } from 'lucide-react-native';
import {
  getMeListBookingsQueryKey,
  useMeCancelBooking,
  useMeListBookings,
  useMeSlots,
  useMeVenues,
} from '@iziwellpass/api/generated';
import { ApiError, unwrap } from '@iziwellpass/api/client';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { Button, IconMedallion } from '@/components/ui/button';
import { StatusBadge, statusBadgeVariant } from '@/components/ui/status-badge';
import { QueryBoundary } from '@/components/ui/query-boundary';
import { Sheet } from '@/components/ui/sheet';
import { useToast } from '@/components/ui/toast';
import { t } from '@/lib/i18n';
import { bookingStatusLabelKey, isCancellable } from '@/lib/bookings';
import { joinBookings, slotWindow, splitBookingViews, type BookingView } from '@/lib/booking-slots';
import { formatDayNumber, formatShortDate, formatTime, formatWeekdayShort } from '@/lib/format';

function DateBlock({ startsAt, upcoming }: { startsAt: string | null; upcoming: boolean }) {
  return (
    <View className={`h-14 w-12 items-center justify-center rounded-card ${upcoming ? 'bg-tint-bleu' : 'bg-side'}`}>
      <AppText variant="numeric" className="text-[20px] leading-[24px]">
        {startsAt ? formatDayNumber(startsAt) : '—'}
      </AppText>
      {startsAt ? <AppText variant="caption">{formatWeekdayShort(startsAt)}</AppText> : null}
    </View>
  );
}

function Row({
  view,
  upcoming,
  onCancel,
}: {
  view: BookingView;
  upcoming: boolean;
  onCancel: (v: BookingView) => void;
}) {
  return (
    <View className="min-h-[72px] flex-row items-start gap-4 border-b border-border py-3">
      <DateBlock startsAt={view.startsAt} upcoming={upcoming} />
      <View className="flex-1 gap-1">
        <View className="flex-row items-center justify-between gap-3">
          <AppText variant="bodyStrong">{t('bookings.session')}</AppText>
          <StatusBadge label={t(bookingStatusLabelKey(view.status))} variant={statusBadgeVariant(view.status)} />
        </View>
        <AppText variant={view.startsAt ? 'numeric' : 'label'} className="text-[13px] text-muted">
          {view.startsAt ? formatTime(view.startsAt) : t('bookings.dateUnknown')}
        </AppText>
        {isCancellable(view.status) && upcoming ? (
          <View className="-ml-4 self-start">
            <Button label={t('bookings.cancel')} variant="ghost" size="sm" fullWidth={false} onPress={() => onCancel(view)} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mt-6">
      <AppText variant="heading" className="mb-1">
        {title}
      </AppText>
      {children}
    </View>
  );
}

function ListSkeleton() {
  return (
    <View className="mt-6 gap-4">
      {[0, 1, 2].map((i) => (
        <View key={i} className="h-[72px] rounded-card bg-secondary" />
      ))}
    </View>
  );
}

function whenLabel(view: BookingView): string {
  if (!view.startsAt) return t('bookings.whenUnknown');
  return t('bookings.when', {
    weekday: formatWeekdayShort(view.startsAt),
    date: formatShortDate(view.startsAt),
    time: formatTime(view.startsAt),
  });
}

export default function BookingsScreen() {
  const qc = useQueryClient();
  const toast = useToast();
  const list = useMeListBookings(undefined, { query: { select: unwrap } });
  const venues = useMeVenues(undefined, { query: { select: unwrap } });
  const venueId = venues.data?.[0];
  const window = useMemo(() => slotWindow(), []);
  const slots = useMeSlots(
    { venue_id: venueId ?? '', from: window.from, to: window.to },
    { query: { select: unwrap, enabled: !!venueId } },
  );
  const [pending, setPending] = useState<BookingView | null>(null);

  const cancel = useMeCancelBooking({
    mutation: {
      onSuccess: () => {
        setPending(null);
        void qc.invalidateQueries({ queryKey: getMeListBookingsQueryKey() });
      },
      onError: (err) => {
        setPending(null);
        toast.show({
          title: t('bookings.cancelWindowClosedTitle'),
          description:
            err instanceof ApiError && err.status === 409 ? t('bookings.cancelWindowClosed') : t('bookings.cancelErrorHint'),
        });
      },
    },
  });

  const views = joinBookings(list.data ?? [], slots.data);
  const { upcoming, past } = splitBookingViews(views);
  const isEmpty = !!list.data && list.data.length === 0;

  return (
    <Screen>
      <AppText variant="title" className="mt-1">
        {t('bookings.title')}
      </AppText>

      <QueryBoundary
        isLoading={list.isLoading}
        isError={list.isError}
        errorText={t('bookings.error')}
        onRetry={() => void list.refetch()}
        loadingFallback={<ListSkeleton />}
      >
        {isEmpty ? (
          <View className="items-center gap-4 py-16">
            <IconMedallion icon={CalendarX2} />
            <AppText variant="heading">{t('bookings.empty')}</AppText>
            <AppText variant="body" className="max-w-[300px] text-center text-muted">
              {t('bookings.emptyHint')}
            </AppText>
          </View>
        ) : (
          <>
            {upcoming.length > 0 ? (
              <Section title={t('bookings.upcoming')}>
                {upcoming.map((v) => (
                  <Row key={v.id} view={v} upcoming onCancel={setPending} />
                ))}
              </Section>
            ) : null}
            {past.length > 0 ? (
              <Section title={t('bookings.past')}>
                {past.map((v) => (
                  <Row key={v.id} view={v} upcoming={false} onCancel={setPending} />
                ))}
              </Section>
            ) : null}
          </>
        )}
      </QueryBoundary>

      <Sheet
        open={pending !== null}
        onClose={() => (cancel.isPending ? undefined : setPending(null))}
        title={t('bookings.cancelConfirmTitle')}
        description={pending ? t('bookings.cancelConfirmBody', { when: whenLabel(pending) }) : undefined}
      >
        <Button
          label={t('bookings.cancelConfirm')}
          variant="destructive"
          loading={cancel.isPending}
          onPress={() => pending && cancel.mutate({ bid: pending.id })}
        />
        <Button label={t('bookings.keep')} variant="secondary" disabled={cancel.isPending} onPress={() => setPending(null)} />
      </Sheet>
    </Screen>
  );
}
```

Check the generated `useMeSlots(params, options)` signature (`packages/api/src/generated/endpoints.ts`) and `useMeListBookings`'s item type — the `Booking` schema has `slot_id`, `status`, `id` — and adjust the call only if the argument order differs. `window` shadows the global on web; if lint flags it, rename to `range`.

- [ ] **Step 3: Gates + visual check**

Gates. Mock + web, sign in, open Réservations: list (vs `d14X6.png`; rows show session dates, one « Date indisponible » row in Passées for `bkg-hors-fenetre`); « Annuler » on the first row → sheet (vs `Y1K4c.png`), double-tap « Annuler la réservation » → one POST in the mock log; « Annuler » on `bkg-fenetre` (the Mer row) → confirm → toast (vs `H8Zdj4.png`); `MOCK_BOOKINGS=empty` → empty (vs `tDcja.png`). Screenshots `/tmp/spm-task8-*.png`. Stop everything.

- [ ] **Step 4: Commit**

```bash
git add apps/member
git commit -m "feat(member): Réservations on the canvas — session dates from slots, cancel sheet, toast

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Remove legacy aliases and old fonts; full visual pass

**Files:**
- Modify: `apps/member/lib/theme.ts`, `apps/member/tailwind.config.js`, `apps/member/components/ui/text.tsx`, `apps/member/components/ui/button.tsx`, `apps/member/package.json` (+ `pnpm-lock.yaml`), any file still using a legacy name

- [ ] **Step 1: Find leftovers**

Run from `apps/member`:

```bash
grep -rnE "\b(bg|text|border|active:bg)-(primary|foreground|neutral-[0-9]+)\b|font-mono|font-sans-bold|rounded-xl\b|\brounded\b[^-]|variant=\"(section|mono|monoLarge|outline)\"|colors\.(primary|neutral|foreground)\b|HankenGrotesk|GeistMono" app components lib | grep -v "\.test\.ts"
```

Replace each hit with its new name (`bg-ink`, `text-ink`, `text-muted`, `bg-secondary`, `bg-side`, `font-sans-medium`, `rounded-card`/`rounded-panel`/`rounded-field`, `heading`/`numeric`/`numericLarge`, `secondary`, `colors.ink`/`colors.muted`…). Re-run until it prints nothing.

- [ ] **Step 2: Delete the aliases**

Remove the `// Legacy aliases` blocks from `lib/theme.ts` (`foreground`, `primary`, `neutral`), `tailwind.config.js` (colors `foreground/primary/neutral`, radii `DEFAULT/xl`, fonts `sans-bold/mono/mono-medium`), `components/ui/text.tsx` (`section/mono/monoLarge` in the union, `CLASS` and `TABULAR`), `components/ui/button.tsx` (`LegacyVariant`, the `outline` mapping).

- [ ] **Step 3: Drop the old fonts**

`pnpm --filter @iziwellpass/member remove @expo-google-fonts/hanken-grotesk @expo-google-fonts/geist-mono`; then `pnpm exec tsc --noEmit` in `apps/owner` and `apps/admin`.

- [ ] **Step 4: Gates**

Member gates, `pnpm --filter @iziwellpass/member build` (`tsc --noEmit && expo export --platform web --output-dir dist`; delete `apps/member/dist` afterwards if it is not gitignored), repo gates, message parity (vitest `i18n.test.ts`).

- [ ] **Step 5: Full 15-state visual pass**

One run through all 15 states at 390×844 exactly as in Tasks 5–8 (mock switches + mock auth passwords), screenshots `/tmp/spm-final-<frameId>.png`, and a table in the report: frame id → screenshot → differences found (or « none »). Fix anything that regressed in Steps 1–3 before committing. Stop everything.

- [ ] **Step 6: Commit**

```bash
git add apps/member pnpm-lock.yaml
git commit -m "chore(member): drop legacy token aliases, Hanken Grotesk and Geist Mono

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Self-review (done while writing)

- **Spec coverage:** M1 password/number/pack/title → Tasks 3, 5, 6, 8; M2 in place → all; M3 pin test → Task 1; M4 Inter + tabular → Tasks 1, 9; M5 light → unchanged; M6 QR on tap + brightness → Task 7 (lifetime per R1); M7 venue → Tasks 3, 6, 7; M8 slots join → Tasks 3, 4, 8; M9 sheet → Tasks 2, 8; M10 toast → Tasks 2, 8; M11 targets → Tasks 2, 5–8. §3 tokens → Task 1; §4 components → Task 2; §5 screens → Tasks 5–8; §6 mock → Task 4; §7 errors → Tasks 2 (QueryBoundary), 6, 7, 8; §8 testing → Tasks 1, 3, 9.
- **Types:** `CardView`, `PlanLine`, `BookingView`, `BadgeVariant`, `PasswordRuleKey` defined once (Tasks 2–3) and used by the same names in Tasks 5–8.
- **Mock-only switch beyond the spec:** `MOCK_QR_TTL` (Task 4) exists only to reach the expired QR state without waiting 5 minutes.
