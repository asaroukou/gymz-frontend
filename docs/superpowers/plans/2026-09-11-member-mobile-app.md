# Member Mobile App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up `apps/member`, an Expo (React Native) app that is the gym member's digital membership card — log in (Main pool), see profile + plan, flash an entry QR at the door, and view/cancel bookings — against `/gms/v1/me/*`.

**Architecture:** New Expo SDK 57 workspace using Expo Router, wired into the existing pnpm/Turborepo monorepo. It **reuses** `@iziwellpass/api` (the `configureApi`/`customFetch` runtime + generated TanStack Query hooks + schemas) and `@iziwellpass/auth/claims`, and supplies its **own native runtime** for Cognito (an AsyncStorage-backed storage adapter for `amazon-cognito-identity-js`) and its own NativeWind-based UI (the web `@iziwellpass/ui` is DOM-only). Styling ports the DESIGN.md tokens to hex under NativeWind v4 (which requires Tailwind v3).

**Tech Stack:** Expo SDK 57, Expo Router v6, React 19, React Native, TypeScript, NativeWind v4 + Tailwind v3, TanStack Query 5, `amazon-cognito-identity-js`, `@react-native-async-storage/async-storage`, `react-native-get-random-values`, `react-native-qrcode-svg` + `react-native-svg`, `react-hook-form` + `zod`, `i18n-js` + `expo-localization`, vitest.

**Spec:** `docs/superpowers/specs/2026-09-11-member-mobile-app-design.md`

## Global Constraints

- **User & pool:** gym member (adhérent) only; **Main** pool `eu-west-1_JCAATFFzq`, client `57e746kskk9ccijelgsipmu424`. Staff-invited, **no self-signup**, no forgot-password. Login MUST handle the `newPasswordRequired` challenge.
- **API:** app plane, direct to `https://i6ekmmxyu5.execute-api.eu-west-1.amazonaws.com/v1` (native, no CORS, no dev proxy). `controlPlaneBaseUrl` left empty. Surface: `GET /gms/v1/me`, `/me/subscription`, `/me/venues`, `/me/bookings`; `POST /me/bookings/{bid}/cancel`; `POST /me/qr`. Booking a new slot is **out of scope (deferred)**.
- Never hand-edit `packages/api/src/generated/**`.
- French-first i18n, **exact fr/en key parity** (enforced by a test).
- `noUncheckedIndexedAccess` and `verbatimModuleSyntax` on wherever the Expo/Metro toolchain allows.
- **NativeWind v4 requires Tailwind CSS v3** (the web apps' Tailwind v4 must NOT be used here).
- Config values live in `.env.example` (committed) via `EXPO_PUBLIC_*`; `.env.local` gitignored.
- Prettier on touched files; quote paths containing `()`/`[]` in single quotes.
- Brand: calm, warm, precise (PRODUCT.md); no emoji, no hype, no gamification; meaning-only color; WCAG AA. Reuse the owner app's de-jargoned error convention (plain French fallback + `· ref: <8 chars>` suffix, never a raw enum code).
- Reuse, do not fork: import `configureApi`, `customFetch`, `ApiError`, `unwrap` from `@iziwellpass/api/client`; `createQueryClient` from `@iziwellpass/api/provider`; generated hooks from `@iziwellpass/api/generated`; types from `@iziwellpass/api/schemas`; `parseClaims`/`SessionClaims` from `@iziwellpass/auth/claims`.
- **Gates (run from repo root `/Users/abdel/dev/gymz-v1/web`):** `pnpm build && pnpm typecheck && pnpm lint && pnpm test` must be green. Never run a build while a `turbo run dev` / Metro server is up.

### Reused API surface — exact hook names (from `@iziwellpass/api/generated`)

| Purpose | Hook | Envelope type (`@iziwellpass/api/schemas`) | `.data` shape highlights |
|---|---|---|---|
| Profile | `useMeProfile` | `ApiResponseMyProfileResponse` | `first_name, last_name, membership_status, membership_type, membership_start, membership_end?, email?, phone?, access_scope` |
| Subscription | `useMeSubscription` | `ApiResponseMemberSubscription` | `status, payment_status, plan_id, starts_on, expires_on?, entries_remaining?, entries_total?, price_amount_minor, price_currency, venue_id` |
| Venues | `useMeVenues` | `ApiResponseVecVenue` (list) | array of venue summaries |
| Bookings | `useMeListBookings` | `ApiResponseVecBooking` (list) | items: `id, slot_id, status, booked_at, checked_in_at?, cancelled_at?` |
| Cancel booking | `useMeCancelBooking` | mutation, path `bid` | — |
| Mint entry QR | `useMintMemberQr` | `ApiResponseMeQrResponseSchema` | `token` (`"iwp1.<payload>.<mac>"`, 300s), `expires_at` (unix seconds) |

All success responses are `{ data, request_id }`; use `select: unwrap` (from `@iziwellpass/api/client`) to read `.data`. Query hooks accept a final options arg `{ query: { select, enabled, ... } }`; mutation hooks accept `{ mutation: { onSuccess, onError } }`.

### Ported design tokens (DESIGN.md OKLCH → hex, light theme)

Neutrals (warm stone): `50 #fafaf9, 100 #f5f5f4, 200 #e7e5e4, 300 #d6d3d1, 400 #a8a29e, 500 #78716c, 600 #57534e, 700 #44403c, 800 #292524, 900 #1c1917, 950 #0c0a09`. Background `#fffefd`. Primary (green ink) `#0c3d22`, primary-hover `#19482c`, primary-foreground `#fafaf9`. Destructive `#dc2626`, success `#16a34a`, warning `#f59e0b`, info `#2563eb`. Text-stop foregrounds: success `#166534`, warning `#92400e`, info `#1d4ed8`. Radius `10px` (xl `16px`, pill `9999px`). v1 ships **light theme only**; dark values are recorded in the spec for a later pass.

---

## Task 1: Scaffold Expo app + monorepo wiring

**Files:**
- Create: `apps/member/package.json`
- Create: `apps/member/app.json`
- Create: `apps/member/tsconfig.json`
- Create: `apps/member/babel.config.js`
- Create: `apps/member/metro.config.js`
- Create: `apps/member/eslint.config.mjs`
- Create: `apps/member/vitest.config.ts`
- Create: `apps/member/.env.example`
- Create: `apps/member/app/_layout.tsx`
- Create: `apps/member/app/index.tsx`
- Create: `apps/member/lib/smoke.test.ts`
- Create: `apps/member/expo-env.d.ts`
- Modify: `turbo.json` (add `EXPO_PUBLIC_*` to `globalEnv`)
- Modify: `.git/info/exclude` (ignore `apps/member/.env.local`, `apps/member/.expo/`)

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a bootable Expo app; the workspace `@iziwellpass/member`; Turbo tasks `dev`/`build`/`lint`/`typecheck`/`test` for it.

- [ ] **Step 1: Create the workspace manifest**

`apps/member/package.json`:

```json
{
  "name": "@iziwellpass/member",
  "version": "0.0.0",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "dev": "expo start",
    "build": "tsc --noEmit && expo export --platform web --output-dir dist",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@iziwellpass/api": "workspace:*",
    "@iziwellpass/auth": "workspace:*",
    "@tanstack/react-query": "^5.80.0"
  },
  "devDependencies": {
    "@iziwellpass/config": "workspace:*",
    "eslint": "^9.25.0",
    "typescript": "^5.8.0",
    "vitest": "^3.1.0"
  }
}
```

Rationale for `build`: `expo export --platform web` is a non-interactive, Metro-based static export that keeps `turbo run build` meaningful without launching a dev server, and `tsc --noEmit` first fails fast on type errors. (If web export proves flaky in CI-less local runs, the reviewer may approve narrowing `build` to `tsc --noEmit`; record any such change as a ledger ruling.)

- [ ] **Step 2: Install Expo + native deps at pinned-by-SDK versions**

From `apps/member/`, initialize the Expo/React versions the SDK expects (do NOT hand-pin native versions — `expo install` resolves SDK-compatible ones):

```bash
cd apps/member
npx expo install expo expo-router expo-constants expo-linking expo-status-bar react react-native react-dom react-native-web
```

Then return to repo root and install the workspace so symlinks resolve:

```bash
cd ../.. && pnpm install
```

- [ ] **Step 3: Write `app.json`**

```json
{
  "expo": {
    "name": "IziWellPass",
    "slug": "iziwellpass-member",
    "scheme": "iziwellpass",
    "version": "0.1.0",
    "orientation": "portrait",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "plugins": ["expo-router"],
    "ios": { "supportsTablet": true },
    "android": {},
    "web": { "bundler": "metro", "output": "single" }
  }
}
```

- [ ] **Step 4: Write `metro.config.js` (monorepo-aware)**

```js
// Metro must watch the workspace root and resolve hoisted deps, and honor the
// package "exports" maps that point @iziwellpass/* at their .ts source.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
```

- [ ] **Step 5: Write `babel.config.js`**

```js
module.exports = function (api) {
  api.cache(true);
  return { presets: ['babel-preset-expo'] };
};
```

- [ ] **Step 6: Write `tsconfig.json`**

Extend Expo's base and re-assert the monorepo's strictness knobs:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "verbatimModuleSyntax": true,
    "paths": { "@/*": ["./*"] }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"],
  "exclude": ["node_modules", "dist"]
}
```

Create `apps/member/expo-env.d.ts` with the single line: `/// <reference types="expo/types" />`

- [ ] **Step 7: Write `eslint.config.mjs` and `vitest.config.ts`**

`eslint.config.mjs` — reuse the base (non-Next) config:

```js
export { default } from '@iziwellpass/config/eslint/base';
```

`vitest.config.ts` — node environment for pure-logic tests (no RN runtime):

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node', include: ['**/*.test.ts'] },
});
```

- [ ] **Step 8: Write the placeholder route and root layout**

`apps/member/app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

`apps/member/app/index.tsx`:

```tsx
import { Text, View } from 'react-native';

export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>IziWellPass</Text>
    </View>
  );
}
```

- [ ] **Step 9: Write `.env.example` and the smoke test**

`apps/member/.env.example`:

```
EXPO_PUBLIC_API_BASE_URL=https://i6ekmmxyu5.execute-api.eu-west-1.amazonaws.com/v1
EXPO_PUBLIC_COGNITO_USER_POOL_ID=eu-west-1_JCAATFFzq
EXPO_PUBLIC_COGNITO_CLIENT_ID=57e746kskk9ccijelgsipmu424
```

`apps/member/lib/smoke.test.ts` (keeps `vitest run` non-empty until real tests land):

```ts
import { describe, expect, it } from 'vitest';

describe('member app scaffold', () => {
  it('runs the test toolchain', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 10: Wire Turbo env + local ignores**

In `turbo.json`, change `"globalEnv": ["NEXT_PUBLIC_*"]` to `"globalEnv": ["NEXT_PUBLIC_*", "EXPO_PUBLIC_*"]`.

Append to `.git/info/exclude`:

```
apps/member/.env.local
apps/member/.expo/
apps/member/dist/
```

- [ ] **Step 11: Verify gates and boot**

Run from repo root (no dev server running):

```bash
pnpm --filter @iziwellpass/member typecheck
pnpm --filter @iziwellpass/member lint
pnpm --filter @iziwellpass/member test
```

Expected: all green. Then confirm the bundler boots (Ctrl-C after "Bundled"):

```bash
cd apps/member && npx expo start --web --no-dev --max-workers 1
```

Expected: Metro bundles `app/index.tsx` without resolver errors.

- [ ] **Step 12: Commit**

```bash
git add apps/member turbo.json && git commit -m "feat(member): scaffold Expo app wired into the monorepo"
```

---

## Task 2: Design tokens, NativeWind, and UI atoms

**Files:**
- Create: `apps/member/lib/theme.ts`
- Create: `apps/member/lib/theme.test.ts`
- Create: `apps/member/tailwind.config.js`
- Create: `apps/member/global.css`
- Create: `apps/member/nativewind-env.d.ts`
- Create: `apps/member/components/ui/screen.tsx`
- Create: `apps/member/components/ui/text.tsx`
- Create: `apps/member/components/ui/card.tsx`
- Create: `apps/member/components/ui/button.tsx`
- Create: `apps/member/components/ui/status-badge.tsx`
- Create: `apps/member/components/ui/status-badge.test.ts`
- Modify: `apps/member/babel.config.js` (add nativewind)
- Modify: `apps/member/metro.config.js` (wrap with withNativeWind)
- Modify: `apps/member/app/_layout.tsx` (import global.css)
- Modify: `apps/member/app/index.tsx` (use atoms, prove styling)

**Interfaces:**
- Consumes: Task 1 scaffold.
- Produces: `colors` token object and `Theme` type from `lib/theme.ts`; `statusBadgeVariant(status: string): BadgeVariant` from `components/ui/status-badge.tsx`; styled atoms `Screen`, `AppText`, `Card`, `Button` (`{ label, onPress, disabled?, loading?, variant?: 'primary' | 'ghost' }`), `StatusBadge` (`{ label, variant }`).

- [ ] **Step 1: Install NativeWind (Tailwind v3)**

```bash
cd apps/member
pnpm add nativewind react-native-reanimated react-native-safe-area-context
pnpm add -D tailwindcss@^3.4.17
cd ../.. && pnpm install
```

(NativeWind v4 pairs with Tailwind v3; `react-native-reanimated` and `safe-area-context` are NativeWind/Expo Router peers — install SDK-matched versions with `npx expo install react-native-reanimated react-native-safe-area-context` instead if the plain add resolves an incompatible version.)

- [ ] **Step 2: Write the failing token test**

`apps/member/lib/theme.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { colors } from './theme';

describe('colors', () => {
  it('ports the green-ink primary and warm-stone neutrals as hex', () => {
    expect(colors.primary.DEFAULT).toBe('#0c3d22');
    expect(colors.primary.foreground).toBe('#fafaf9');
    expect(colors.neutral[900]).toBe('#1c1917');
    expect(colors.background).toBe('#fffefd');
  });

  it('exposes the four meaning colors with AA text-stop foregrounds', () => {
    expect(colors.success.DEFAULT).toBe('#16a34a');
    expect(colors.success.foreground).toBe('#166534');
    expect(colors.destructive.DEFAULT).toBe('#dc2626');
  });
});
```

- [ ] **Step 3: Run it (fails — no theme module)**

Run: `pnpm --filter @iziwellpass/member test`
Expected: FAIL, cannot find `./theme`.

- [ ] **Step 4: Write `lib/theme.ts`**

```ts
// DESIGN.md tokens ported OKLCH -> hex for React Native (RN OKLCH is unreliable).
// Single source of truth: tailwind.config.js consumes this object.
export const colors = {
  background: '#fffefd',
  foreground: '#1c1917',
  border: '#e7e5e4',
  neutral: {
    50: '#fafaf9',
    100: '#f5f5f4',
    200: '#e7e5e4',
    300: '#d6d3d1',
    400: '#a8a29e',
    500: '#78716c',
    600: '#57534e',
    700: '#44403c',
    800: '#292524',
    900: '#1c1917',
    950: '#0c0a09',
  },
  primary: { DEFAULT: '#0c3d22', hover: '#19482c', foreground: '#fafaf9' },
  destructive: { DEFAULT: '#dc2626', foreground: '#166534' },
  success: { DEFAULT: '#16a34a', foreground: '#166534' },
  warning: { DEFAULT: '#f59e0b', foreground: '#92400e' },
  info: { DEFAULT: '#2563eb', foreground: '#1d4ed8' },
} as const;

export const radius = { DEFAULT: 10, xl: 16, pill: 9999 } as const;

export type Theme = typeof colors;
```

- [ ] **Step 5: Run the token test (passes)**

Run: `pnpm --filter @iziwellpass/member test`
Expected: PASS.

- [ ] **Step 6: Write `tailwind.config.js` consuming the tokens**

```js
const { colors, radius } = require('./lib/theme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: colors.background,
        foreground: colors.foreground,
        border: colors.border,
        neutral: colors.neutral,
        primary: colors.primary,
        destructive: colors.destructive,
        success: colors.success,
        warning: colors.warning,
        info: colors.info,
      },
      borderRadius: { DEFAULT: `${radius.DEFAULT}px`, xl: `${radius.xl}px`, pill: '9999px' },
    },
  },
  plugins: [],
};
```

- [ ] **Step 7: Write `global.css`, nativewind types, and wire babel/metro**

`apps/member/global.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`apps/member/nativewind-env.d.ts`: `/// <reference types="nativewind/types" />`

`babel.config.js` presets become:

```js
presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
```

`metro.config.js` — wrap the exported config:

```js
const { withNativeWind } = require('nativewind/metro');
// ...existing config setup...
module.exports = withNativeWind(config, { input: './global.css' });
```

Import the stylesheet once in `app/_layout.tsx` (add as the first import): `import '../global.css';`

- [ ] **Step 8: Write the failing status-badge test**

`apps/member/components/ui/status-badge.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { statusBadgeVariant } from './status-badge';

describe('statusBadgeVariant', () => {
  it('maps active/confirmed states to success', () => {
    expect(statusBadgeVariant('active')).toBe('success');
    expect(statusBadgeVariant('confirmed')).toBe('success');
  });
  it('maps expired/cancelled to destructive and pending to warning', () => {
    expect(statusBadgeVariant('cancelled')).toBe('destructive');
    expect(statusBadgeVariant('expired')).toBe('destructive');
    expect(statusBadgeVariant('pending')).toBe('warning');
  });
  it('falls back to neutral for unknown states', () => {
    expect(statusBadgeVariant('whatever')).toBe('neutral');
  });
});
```

- [ ] **Step 9: Run it (fails), then implement the atoms**

Run: `pnpm --filter @iziwellpass/member test` → FAIL (no `statusBadgeVariant`).

`components/ui/status-badge.tsx` — pure mapper + component (the mapper is import-safe for vitest because it references no RN symbol at module load; the component below it is only imported by screens):

```tsx
import { Text, View } from 'react-native';

export type BadgeVariant = 'success' | 'warning' | 'destructive' | 'neutral';

const SUCCESS = new Set(['active', 'confirmed', 'paid', 'checked_in']);
const DANGER = new Set(['cancelled', 'canceled', 'expired', 'suspended', 'overdue']);
const WARN = new Set(['pending', 'trialing', 'grace']);

export function statusBadgeVariant(status: string): BadgeVariant {
  const s = status.toLowerCase();
  if (SUCCESS.has(s)) return 'success';
  if (DANGER.has(s)) return 'destructive';
  if (WARN.has(s)) return 'warning';
  return 'neutral';
}

const STYLES: Record<BadgeVariant, string> = {
  success: 'bg-success/10 text-success-foreground',
  warning: 'bg-warning/10 text-warning-foreground',
  destructive: 'bg-destructive/10 text-destructive-foreground',
  neutral: 'bg-neutral-100 text-neutral-600',
};

export function StatusBadge({ label, variant }: { label: string; variant: BadgeVariant }) {
  return (
    <View className={`self-start rounded-pill px-2.5 py-1 ${STYLES[variant].split(' ')[0]}`}>
      <Text className={`text-xs font-medium ${STYLES[variant].split(' ')[1]}`}>{label}</Text>
    </View>
  );
}
```

Run: `pnpm --filter @iziwellpass/member test` → PASS.

- [ ] **Step 10: Write the remaining atoms**

`components/ui/screen.tsx`:

```tsx
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const Body = scroll ? ScrollView : View;
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <Body className="flex-1 px-5 pt-2" contentContainerClassName={scroll ? 'pb-8 gap-5' : undefined}>
        {children}
      </Body>
    </SafeAreaView>
  );
}
```

`components/ui/text.tsx`:

```tsx
import { Text, type TextProps } from 'react-native';

type Variant = 'title' | 'section' | 'body' | 'label' | 'mono';
const CLASS: Record<Variant, string> = {
  title: 'text-2xl font-semibold text-foreground',
  section: 'text-lg font-semibold text-foreground',
  body: 'text-base text-foreground',
  label: 'text-sm text-neutral-500',
  mono: 'text-base font-mono text-foreground',
};

export function AppText({ variant = 'body', className, ...rest }: TextProps & { variant?: Variant }) {
  return <Text className={`${CLASS[variant]} ${className ?? ''}`} {...rest} />;
}
```

`components/ui/card.tsx`:

```tsx
import type { ReactNode } from 'react';
import { View } from 'react-native';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <View className={`rounded-xl border border-border bg-neutral-50 p-5 ${className ?? ''}`}>
      {children}
    </View>
  );
}
```

`components/ui/button.tsx`:

```tsx
import { ActivityIndicator, Pressable, Text } from 'react-native';

export function Button({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'ghost';
}) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      className={`min-h-12 flex-row items-center justify-center rounded-pill px-5 ${
        isPrimary ? 'bg-primary' : 'bg-transparent'
      } ${disabled || loading ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#fafaf9' : '#0c3d22'} />
      ) : (
        <Text className={`text-base font-medium ${isPrimary ? 'text-primary-foreground' : 'text-primary'}`}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
```

- [ ] **Step 11: Prove styling in `app/index.tsx`**

```tsx
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { Card } from '@/components/ui/card';

export default function Index() {
  return (
    <Screen>
      <AppText variant="title">IziWellPass</AppText>
      <Card>
        <AppText variant="label">Aperçu</AppText>
        <AppText>Carte membre</AppText>
      </Card>
    </Screen>
  );
}
```

- [ ] **Step 12: Verify gates and commit**

```bash
pnpm --filter @iziwellpass/member typecheck && pnpm --filter @iziwellpass/member lint && pnpm --filter @iziwellpass/member test
git add apps/member && git commit -m "feat(member): NativeWind tokens and UI atoms from DESIGN.md"
```

---

## Task 3: Native Cognito runtime (storage adapter + auth client)

**Files:**
- Create: `apps/member/lib/auth/storage.ts`
- Create: `apps/member/lib/auth/storage.test.ts`
- Create: `apps/member/lib/auth/errors.ts`
- Create: `apps/member/lib/auth/errors.test.ts`
- Create: `apps/member/lib/auth/cognito.ts`
- Create: `apps/member/polyfills.ts`
- Modify: `apps/member/app/_layout.tsx` (import polyfills first)

**Interfaces:**
- Consumes: Task 1/2.
- Produces:
  - `createMemoryBackedStorage(kv: AsyncKV): { storage: ICognitoStorageLike; hydrate(): Promise<void> }` where `AsyncKV = { getAllKeys, multiGet, setItem, removeItem }` and `ICognitoStorageLike` has sync `getItem/setItem/removeItem/clear`.
  - `authErrorMessageKey(err: unknown): string` returning an i18n key under `auth.error.*`.
  - `createMemberAuthClient(config: { userPoolId: string; clientId: string; storage: ICognitoStorageLike }): MemberAuthClient`.
  - `MemberAuthClient`: `signIn(email, password): Promise<SignInResult>`, `getIdToken(): Promise<string | null>`, `forceRefreshSession(): Promise<string | null>`, `signOut(): void`. `SignInResult = { kind: 'success'; idToken: string } | { kind: 'new-password-required'; complete(newPassword: string): Promise<{ idToken: string }> }`.

- [ ] **Step 1: Install native deps**

```bash
cd apps/member
npx expo install @react-native-async-storage/async-storage
pnpm add amazon-cognito-identity-js react-native-get-random-values
cd ../.. && pnpm install
```

- [ ] **Step 2: Write the failing storage test**

The Cognito SDK requires a **synchronous** storage; AsyncStorage is async. The adapter hydrates all keys into memory once at startup, serves reads/writes from memory synchronously, and mirrors writes back to the async KV. The test injects a fake KV (no RN import), so it runs under vitest.

`apps/member/lib/auth/storage.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createMemoryBackedStorage, type AsyncKV } from './storage';

function fakeKV(initial: Record<string, string> = {}): AsyncKV & { dump: () => Record<string, string> } {
  const map = new Map(Object.entries(initial));
  return {
    getAllKeys: () => Promise.resolve([...map.keys()]),
    multiGet: (keys) => Promise.resolve(keys.map((k) => [k, map.get(k) ?? null] as [string, string | null])),
    setItem: (k, v) => { map.set(k, v); return Promise.resolve(); },
    removeItem: (k) => { map.delete(k); return Promise.resolve(); },
    dump: () => Object.fromEntries(map),
  };
}

describe('createMemoryBackedStorage', () => {
  it('hydrates existing keys and serves reads synchronously', async () => {
    const kv = fakeKV({ 'CognitoIdentityServiceProvider.x.idToken': 'abc' });
    const { storage, hydrate } = createMemoryBackedStorage(kv);
    await hydrate();
    expect(storage.getItem('CognitoIdentityServiceProvider.x.idToken')).toBe('abc');
    expect(storage.getItem('missing')).toBeNull();
  });

  it('mirrors sync writes and removals back to the async KV', async () => {
    const kv = fakeKV();
    const { storage, hydrate } = createMemoryBackedStorage(kv);
    await hydrate();
    storage.setItem('k', 'v');
    expect(storage.getItem('k')).toBe('v');
    storage.removeItem('k');
    expect(storage.getItem('k')).toBeNull();
    await Promise.resolve();
    expect(kv.dump()).toEqual({});
  });

  it('clear() empties memory and the KV', async () => {
    const kv = fakeKV({ a: '1', b: '2' });
    const { storage, hydrate } = createMemoryBackedStorage(kv);
    await hydrate();
    storage.clear();
    expect(storage.getItem('a')).toBeNull();
  });
});
```

- [ ] **Step 3: Run it (fails), then implement `storage.ts`**

Run: `pnpm --filter @iziwellpass/member test` → FAIL.

```ts
export interface ICognitoStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

export interface AsyncKV {
  getAllKeys(): Promise<readonly string[]>;
  multiGet(keys: readonly string[]): Promise<[string, string | null][]>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export function createMemoryBackedStorage(kv: AsyncKV): {
  storage: ICognitoStorageLike;
  hydrate: () => Promise<void>;
} {
  const mem = new Map<string, string>();

  async function hydrate(): Promise<void> {
    const keys = await kv.getAllKeys();
    const entries = await kv.multiGet(keys);
    for (const [k, v] of entries) {
      if (v !== null) mem.set(k, v);
    }
  }

  const storage: ICognitoStorageLike = {
    getItem: (key) => (mem.has(key) ? (mem.get(key) as string) : null),
    setItem: (key, value) => {
      mem.set(key, value);
      void kv.setItem(key, value); // fire-and-forget mirror
    },
    removeItem: (key) => {
      mem.delete(key);
      void kv.removeItem(key);
    },
    clear: () => {
      for (const key of [...mem.keys()]) {
        mem.delete(key);
        void kv.removeItem(key);
      }
    },
  };

  return { storage, hydrate };
}
```

Run: `pnpm --filter @iziwellpass/member test` → PASS.

- [ ] **Step 4: Write the failing auth-error test**

Map Cognito SDK error names/codes to i18n keys under `auth.error.*` (used by the login screen in Task 7). Pure; vitest-safe.

`apps/member/lib/auth/errors.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { authErrorMessageKey } from './errors';

describe('authErrorMessageKey', () => {
  it('maps wrong credentials', () => {
    expect(authErrorMessageKey({ name: 'NotAuthorizedException' })).toBe('auth.error.invalidCredentials');
  });
  it('maps unknown user to the same generic credential error (no account enumeration)', () => {
    expect(authErrorMessageKey({ name: 'UserNotFoundException' })).toBe('auth.error.invalidCredentials');
  });
  it('maps network failures', () => {
    expect(authErrorMessageKey({ code: 'NetworkError' })).toBe('auth.error.network');
  });
  it('falls back to a generic key', () => {
    expect(authErrorMessageKey(new Error('boom'))).toBe('auth.error.generic');
  });
});
```

- [ ] **Step 5: Run it (fails), then implement `errors.ts`**

```ts
export function authErrorMessageKey(err: unknown): string {
  const name = typeof err === 'object' && err !== null ? String((err as { name?: unknown }).name ?? '') : '';
  const code = typeof err === 'object' && err !== null ? String((err as { code?: unknown }).code ?? '') : '';
  if (name === 'NotAuthorizedException' || name === 'UserNotFoundException') {
    // Deliberately identical message: never reveal whether an account exists.
    return 'auth.error.invalidCredentials';
  }
  if (name === 'UserNotConfirmedException') return 'auth.error.notConfirmed';
  if (name === 'TooManyRequestsException' || name === 'LimitExceededException') {
    return 'auth.error.tooMany';
  }
  if (code === 'NetworkError' || name === 'NetworkError') return 'auth.error.network';
  return 'auth.error.generic';
}
```

Run: `pnpm --filter @iziwellpass/member test` → PASS.

- [ ] **Step 6: Write `cognito.ts` (adapted from `packages/auth/src/cognito.ts`)**

No unit test (it wraps network SRP + SDK callbacks); the pure parts are tested above. Mirror the shape of `@iziwellpass/auth`'s `AuthClient` minus signup, adding the injected `Storage`.

```ts
import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserPool,
  type CognitoUserSession,
  type ICognitoUserPoolData,
} from 'amazon-cognito-identity-js';
import type { ICognitoStorageLike } from './storage';

export type SignInResult =
  | { kind: 'success'; idToken: string }
  | { kind: 'new-password-required'; complete: (newPassword: string) => Promise<{ idToken: string }> };

export interface MemberAuthClient {
  signIn(email: string, password: string): Promise<SignInResult>;
  getIdToken(): Promise<string | null>;
  forceRefreshSession(): Promise<string | null>;
  signOut(): void;
}

export interface MemberAuthConfig {
  userPoolId: string;
  clientId: string;
  storage: ICognitoStorageLike;
}

export function createMemberAuthClient(config: MemberAuthConfig): MemberAuthClient {
  const poolData: ICognitoUserPoolData = {
    UserPoolId: config.userPoolId,
    ClientId: config.clientId,
    Storage: config.storage,
  };
  const pool = new CognitoUserPool(poolData);
  const user = (email: string) =>
    new CognitoUser({ Username: email, Pool: pool, Storage: config.storage });

  function signIn(email: string, password: string): Promise<SignInResult> {
    const cognitoUser = user(email);
    const details = new AuthenticationDetails({ Username: email, Password: password });
    return new Promise((resolve, reject) => {
      cognitoUser.authenticateUser(details, {
        onSuccess: (session) => resolve({ kind: 'success', idToken: session.getIdToken().getJwtToken() }),
        onFailure: (err) => reject(err),
        newPasswordRequired: () => {
          resolve({
            kind: 'new-password-required',
            complete: (newPassword) =>
              new Promise((res, rej) => {
                cognitoUser.completeNewPasswordChallenge(
                  newPassword,
                  {},
                  {
                    onSuccess: (session) => res({ idToken: session.getIdToken().getJwtToken() }),
                    onFailure: (e) => rej(e),
                  },
                );
              }),
          });
        },
      });
    });
  }

  function currentSession(): Promise<CognitoUserSession | null> {
    return new Promise((resolve) => {
      const current = pool.getCurrentUser();
      if (!current) return resolve(null);
      current.getSession((err: Error | null, session: CognitoUserSession | null) => {
        resolve(err || !session || !session.isValid() ? null : session);
      });
    });
  }

  return {
    signIn,
    getIdToken: async () => {
      const session = await currentSession();
      return session ? session.getIdToken().getJwtToken() : null;
    },
    forceRefreshSession: () =>
      new Promise((resolve) => {
        const current = pool.getCurrentUser();
        if (!current) return resolve(null);
        current.getSession((err: Error | null, session: CognitoUserSession | null) => {
          if (err || !session) return resolve(null);
          current.refreshSession(session.getRefreshToken(), (rErr, newSession) => {
            resolve(rErr || !newSession ? null : newSession.getIdToken().getJwtToken());
          });
        });
      }),
    signOut: () => {
      pool.getCurrentUser()?.signOut();
    },
  };
}
```

- [ ] **Step 7: Add the crypto polyfill entry**

`apps/member/polyfills.ts`:

```ts
// amazon-cognito-identity-js SRP needs a CSPRNG; RN provides none by default.
import 'react-native-get-random-values';
```

In `app/_layout.tsx`, make `import '../polyfills';` the very first import (before `../global.css`).

- [ ] **Step 8: Verify and commit**

```bash
pnpm --filter @iziwellpass/member typecheck && pnpm --filter @iziwellpass/member lint && pnpm --filter @iziwellpass/member test
git add apps/member && git commit -m "feat(member): native Cognito runtime with async-backed storage adapter"
```

---

## Task 4: Auth context + API configuration

**Files:**
- Create: `apps/member/lib/auth/session.ts`
- Create: `apps/member/lib/auth/session.test.ts`
- Create: `apps/member/lib/auth/context.tsx`
- Create: `apps/member/lib/env.ts`
- Create: `apps/member/components/providers.tsx`

**Interfaces:**
- Consumes: Task 3 (`createMemberAuthClient`, `createMemoryBackedStorage`); `@iziwellpass/api/client` (`configureApi`), `@iziwellpass/api/provider` (`createQueryClient`), `@iziwellpass/auth/claims` (`parseClaims`, `SessionClaims`).
- Produces:
  - `reduceSession` state machine + `SessionState = { status: 'loading' | 'signed-in' | 'signed-out'; claims: SessionClaims | null }`.
  - `useAuth(): { status; claims; signIn; completeNewPassword; signOut; getToken }` from `context.tsx`.
  - `<Providers>` wrapping QueryClient + auth context + `configureApi`.
  - `env` object from `lib/env.ts` reading `EXPO_PUBLIC_*`.

- [ ] **Step 1: Write the failing session-reducer test**

`apps/member/lib/auth/session.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { reduceSession, initialSession, type SessionClaimsLike } from './session';

const claims: SessionClaimsLike = { sub: 's', name: 'Awa', role: 'consumer' } as SessionClaimsLike;

describe('reduceSession', () => {
  it('starts loading', () => {
    expect(initialSession.status).toBe('loading');
  });
  it('resolves to signed-in with claims', () => {
    const s = reduceSession(initialSession, { type: 'resolved', claims });
    expect(s.status).toBe('signed-in');
    expect(s.claims).toBe(claims);
  });
  it('resolves to signed-out when no claims', () => {
    const s = reduceSession(initialSession, { type: 'resolved', claims: null });
    expect(s.status).toBe('signed-out');
  });
  it('signOut clears claims', () => {
    const inA = reduceSession(initialSession, { type: 'resolved', claims });
    const out = reduceSession(inA, { type: 'signed-out' });
    expect(out).toEqual({ status: 'signed-out', claims: null });
  });
});
```

- [ ] **Step 2: Run it (fails), then implement `session.ts`**

```ts
import type { SessionClaims } from '@iziwellpass/auth/claims';

export type SessionClaimsLike = SessionClaims;

export interface SessionState {
  status: 'loading' | 'signed-in' | 'signed-out';
  claims: SessionClaims | null;
}

export type SessionAction =
  | { type: 'resolved'; claims: SessionClaims | null }
  | { type: 'signed-in'; claims: SessionClaims }
  | { type: 'signed-out' };

export const initialSession: SessionState = { status: 'loading', claims: null };

export function reduceSession(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'resolved':
      return action.claims
        ? { status: 'signed-in', claims: action.claims }
        : { status: 'signed-out', claims: null };
    case 'signed-in':
      return { status: 'signed-in', claims: action.claims };
    case 'signed-out':
      return { status: 'signed-out', claims: null };
    default:
      return state;
  }
}
```

Run: `pnpm --filter @iziwellpass/member test` → PASS.

- [ ] **Step 3: Write `lib/env.ts`**

```ts
// EXPO_PUBLIC_* are inlined at build time by Expo; read them once here.
function required(name: string, value: string | undefined): string {
  if (!value) {
    console.error(`[env] ${name} is not set — check apps/member/.env.local`);
    return '';
  }
  return value;
}

export const env = {
  apiBaseUrl: required('EXPO_PUBLIC_API_BASE_URL', process.env.EXPO_PUBLIC_API_BASE_URL),
  cognitoUserPoolId: required('EXPO_PUBLIC_COGNITO_USER_POOL_ID', process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID),
  cognitoClientId: required('EXPO_PUBLIC_COGNITO_CLIENT_ID', process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID),
} as const;
```

- [ ] **Step 4: Write `lib/auth/context.tsx`**

Hydrate session on mount (build storage, hydrate it, create the auth client, read the current token → `parseClaims`), expose auth actions, and configure the api client with a refresh-once `onUnauthorized`.

```tsx
import { createContext, useContext, useEffect, useReducer, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureApi } from '@iziwellpass/api/client';
import { parseClaims, type SessionClaims } from '@iziwellpass/auth/claims';
import { createMemoryBackedStorage, type AsyncKV } from './storage';
import { createMemberAuthClient, type MemberAuthClient, type SignInResult } from './cognito';
import { reduceSession, initialSession } from './session';
import { env } from '../env';

interface AuthContextValue {
  status: 'loading' | 'signed-in' | 'signed-out';
  claims: SessionClaims | null;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  onSignedIn: (idToken: string) => void;
  signOut: () => void;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const asyncKV: AsyncKV = {
  getAllKeys: () => AsyncStorage.getAllKeys(),
  multiGet: (keys) => AsyncStorage.multiGet(keys) as Promise<[string, string | null][]>,
  setItem: (k, v) => AsyncStorage.setItem(k, v),
  removeItem: (k) => AsyncStorage.removeItem(k),
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reduceSession, initialSession);

  // Build ONE storage adapter and ONE auth client for the app's lifetime, in a
  // useState initializer (runs once). The effect hydrates *this* storage before
  // the client's first token read — the ordering hazard is why they must be the
  // same instance.
  const [{ client, hydrate }] = useState(() => {
    const { storage, hydrate } = createMemoryBackedStorage(asyncKV);
    const client = createMemberAuthClient({
      userPoolId: env.cognitoUserPoolId,
      clientId: env.cognitoClientId,
      storage,
    });
    return { client, hydrate };
  });

  useEffect(() => {
    let active = true;
    // Configure the shared api client: real gateway, this session's token,
    // refresh-once-then-sign-out on 401. controlPlaneBaseUrl stays empty.
    configureApi({
      baseUrl: env.apiBaseUrl,
      getToken: () => client.getToken(),
      onUnauthorized: async () => {
        const fresh = await client.forceRefreshSession();
        if (!fresh) {
          client.signOut();
          if (active) dispatch({ type: 'signed-out' });
        }
        return fresh;
      },
    });
    void (async () => {
      await hydrate();
      const token = await client.getToken();
      if (active) dispatch({ type: 'resolved', claims: token ? parseClaims(token) : null });
    })();
    return () => {
      active = false;
    };
  }, [client, hydrate]);

  const value: AuthContextValue = {
    status: state.status,
    claims: state.claims,
    signIn: (email, password) => client.signIn(email, password),
    onSignedIn: (idToken) => dispatch({ type: 'signed-in', claims: parseClaims(idToken) }),
    signOut: () => {
      client.signOut();
      dispatch({ type: 'signed-out' });
    },
    getToken: () => client.getToken(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
```

- [ ] **Step 5: Write `components/providers.tsx`**

```tsx
import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@iziwellpass/api/provider';
import { useState } from 'react';
import { AuthProvider } from '@/lib/auth/context';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 6: Verify and commit**

```bash
pnpm --filter @iziwellpass/member typecheck && pnpm --filter @iziwellpass/member lint && pnpm --filter @iziwellpass/member test
git add apps/member && git commit -m "feat(member): auth context and api client configuration"
```

---

## Task 5: i18n (French-first) + parity test

**Files:**
- Create: `apps/member/messages/fr.json`
- Create: `apps/member/messages/en.json`
- Create: `apps/member/lib/i18n.ts`
- Create: `apps/member/lib/i18n.test.ts`

**Interfaces:**
- Consumes: nothing app-specific.
- Produces: `t(key: string, params?: Record<string, string | number>): string` and `useT(): typeof t` from `lib/i18n.ts`; `flattenKeys(obj): string[]` for the parity test.

- [ ] **Step 1: Install i18n libs**

```bash
cd apps/member && npx expo install expo-localization && pnpm add i18n-js && cd ../..
```

- [ ] **Step 2: Write the failing parity + lookup test**

`apps/member/lib/i18n.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import fr from '../messages/fr.json';
import en from '../messages/en.json';
import { flattenKeys, t } from './i18n';

describe('i18n message parity', () => {
  it('fr and en have the exact same key set', () => {
    const frKeys = flattenKeys(fr).sort();
    const enKeys = flattenKeys(en).sort();
    expect(frKeys).toEqual(enKeys);
  });
});

describe('t', () => {
  it('resolves a nested key in the default (fr) locale', () => {
    expect(t('login.title')).toBe('Connexion');
  });
  it('interpolates params', () => {
    expect(t('card.greeting', { name: 'Awa' })).toBe('Bonjour Awa');
  });
});
```

- [ ] **Step 3: Run it (fails), then write the message files**

`apps/member/messages/fr.json`:

```json
{
  "login": {
    "title": "Connexion",
    "email": "E-mail",
    "password": "Mot de passe",
    "submit": "Se connecter",
    "newPasswordTitle": "Choisir un mot de passe",
    "newPassword": "Nouveau mot de passe",
    "confirmPassword": "Confirmer le mot de passe",
    "newPasswordSubmit": "Valider"
  },
  "auth": {
    "error": {
      "invalidCredentials": "E-mail ou mot de passe incorrect.",
      "notConfirmed": "Compte non confirmé.",
      "tooMany": "Trop de tentatives. Réessayez plus tard.",
      "network": "Connexion impossible. Vérifiez votre réseau.",
      "generic": "Une erreur est survenue."
    }
  },
  "tabs": { "card": "Carte", "qr": "QR", "bookings": "Réservations" },
  "card": {
    "greeting": "Bonjour {name}",
    "greetingNoName": "Bonjour",
    "plan": "Abonnement",
    "status": "Statut",
    "venue": "Salle",
    "validUntil": "Valable jusqu'au {date}",
    "entriesRemaining": "{count} entrées restantes",
    "noSubscription": "Aucun abonnement actif",
    "signOut": "Se déconnecter",
    "error": "Impossible de charger votre profil"
  },
  "qr": {
    "title": "Mon QR d'entrée",
    "subtitle": "Présentez ce code à l'accueil",
    "expiresIn": "Expire dans {seconds} s",
    "expired": "QR expiré",
    "refresh": "Régénérer",
    "generate": "Générer mon QR",
    "error": "Impossible de générer le QR"
  },
  "bookings": {
    "title": "Mes réservations",
    "empty": "Aucune réservation",
    "cancel": "Annuler",
    "cancelConfirmTitle": "Annuler la réservation ?",
    "cancelConfirmBody": "Cette action est définitive.",
    "cancelConfirm": "Annuler la réservation",
    "keep": "Garder",
    "error": "Impossible de charger vos réservations",
    "cancelError": "Impossible d'annuler la réservation",
    "status": {
      "confirmed": "Confirmée",
      "cancelled": "Annulée",
      "checked_in": "Enregistrée",
      "pending": "En attente"
    }
  },
  "common": { "retry": "Réessayer", "loading": "Chargement…" }
}
```

`apps/member/messages/en.json` — same structure, English values (`login.title`: "Sign in", `card.greeting`: "Hello {name}", etc.). Keep every key present in `fr.json`.

- [ ] **Step 4: Write `lib/i18n.ts`**

```ts
import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import fr from '../messages/fr.json';
import en from '../messages/en.json';

const i18n = new I18n({ fr, en });
i18n.defaultLocale = 'fr';
i18n.enableFallback = true;
i18n.locale = getLocales()[0]?.languageCode === 'en' ? 'en' : 'fr';

export function t(key: string, params?: Record<string, string | number>): string {
  return i18n.t(key, params);
}

export function useT(): typeof t {
  return t;
}

export function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return v !== null && typeof v === 'object'
      ? flattenKeys(v as Record<string, unknown>, key)
      : [key];
  });
}
```

> Note: `expo-localization`'s `getLocales()` is native; under vitest the i18n test only exercises `t` at the default locale and `flattenKeys`. If importing `expo-localization` breaks the vitest import graph, guard the locale line with `typeof getLocales === 'function'` and default to `'fr'`; keep `t`/`flattenKeys` pure. Record the approach taken as a ledger note.

- [ ] **Step 5: Run tests (pass), verify, commit**

```bash
pnpm --filter @iziwellpass/member test && pnpm --filter @iziwellpass/member typecheck && pnpm --filter @iziwellpass/member lint
git add apps/member && git commit -m "feat(member): French-first i18n with fr/en parity test"
```

---

## Task 6: Navigation + auth gating

**Files:**
- Create: `apps/member/lib/nav.ts`
- Create: `apps/member/lib/nav.test.ts`
- Modify: `apps/member/app/_layout.tsx` (wrap in Providers + gate)
- Delete: `apps/member/app/index.tsx`
- Create: `apps/member/app/(auth)/_layout.tsx`
- Create: `apps/member/app/(auth)/login.tsx` (temporary stub; real UI in Task 7)
- Create: `apps/member/app/(app)/_layout.tsx` (tabs)
- Create: `apps/member/app/(app)/index.tsx` (Card placeholder; real UI in Task 8)
- Create: `apps/member/app/(app)/qr.tsx` (placeholder; real UI in Task 9)
- Create: `apps/member/app/(app)/bookings.tsx` (placeholder; real UI in Task 10)

**Interfaces:**
- Consumes: `useAuth` (Task 4), `Providers` (Task 4), `t` (Task 5), atoms (Task 2).
- Produces: `redirectTarget(status, inAuthGroup): '/login' | '/' | null` from `lib/nav.ts`; the route-group structure `(auth)` / `(app)`.

- [ ] **Step 1: Write the failing redirect-logic test**

`apps/member/lib/nav.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { redirectTarget } from './nav';

describe('redirectTarget', () => {
  it('sends signed-out users in the app group to login', () => {
    expect(redirectTarget('signed-out', false)).toBe('/login');
  });
  it('sends signed-in users on the login screen into the app', () => {
    expect(redirectTarget('signed-in', true)).toBe('/');
  });
  it('does nothing while loading', () => {
    expect(redirectTarget('loading', true)).toBeNull();
    expect(redirectTarget('loading', false)).toBeNull();
  });
  it('leaves correctly-placed users alone', () => {
    expect(redirectTarget('signed-in', false)).toBeNull();
    expect(redirectTarget('signed-out', true)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it (fails), then implement `lib/nav.ts`**

```ts
export type AuthStatus = 'loading' | 'signed-in' | 'signed-out';

/**
 * Where to redirect given auth status and whether the current route is inside
 * the (auth) group. Returns null when no navigation is needed.
 */
export function redirectTarget(status: AuthStatus, inAuthGroup: boolean): '/login' | '/' | null {
  if (status === 'loading') return null;
  if (status === 'signed-out' && !inAuthGroup) return '/login';
  if (status === 'signed-in' && inAuthGroup) return '/';
  return null;
}
```

Run: `pnpm --filter @iziwellpass/member test` → PASS.

- [ ] **Step 3: Rewrite the root layout with gating**

Delete `app/index.tsx` (routes now live in groups). `app/_layout.tsx`:

```tsx
import '../polyfills';
import '../global.css';
import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { Providers } from '@/components/providers';
import { useAuth } from '@/lib/auth/context';
import { redirectTarget } from '@/lib/nav';

function Gate() {
  const { status } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    const target = redirectTarget(status, inAuthGroup);
    if (target) router.replace(target);
  }, [status, segments, router]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <Providers>
      <Gate />
    </Providers>
  );
}
```

- [ ] **Step 4: Create the route groups and placeholders**

`app/(auth)/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

`app/(auth)/login.tsx` (temporary stub):

```tsx
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { useAuth } from '@/lib/auth/context';

export default function Login() {
  const { signIn, onSignedIn } = useAuth();
  return (
    <Screen>
      <AppText variant="title">Connexion</AppText>
      <Button
        label="Se connecter (stub)"
        onPress={async () => {
          const r = await signIn('', '');
          if (r.kind === 'success') onSignedIn(r.idToken);
        }}
      />
    </Screen>
  );
}
```

`app/(app)/_layout.tsx` (tabs, French labels):

```tsx
import { Tabs } from 'expo-router';
import { t } from '@/lib/i18n';
import { colors } from '@/lib/theme';

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary.DEFAULT,
        tabBarInactiveTintColor: colors.neutral[500],
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.card') }} />
      <Tabs.Screen name="qr" options={{ title: t('tabs.qr') }} />
      <Tabs.Screen name="bookings" options={{ title: t('tabs.bookings') }} />
    </Tabs>
  );
}
```

`app/(app)/index.tsx`, `app/(app)/qr.tsx`, `app/(app)/bookings.tsx` — each a placeholder `Screen` with its title `AppText` (replaced in Tasks 8/9/10). Example `qr.tsx`:

```tsx
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { t } from '@/lib/i18n';

export default function Qr() {
  return (
    <Screen>
      <AppText variant="title">{t('qr.title')}</AppText>
    </Screen>
  );
}
```

- [ ] **Step 5: Verify gates and boot the gated flow**

```bash
pnpm --filter @iziwellpass/member typecheck && pnpm --filter @iziwellpass/member lint && pnpm --filter @iziwellpass/member test
```

Then (a `.env.local` copied from `.env.example` must exist) boot and confirm the app lands on `/login` when signed out:

```bash
cd apps/member && npx expo start --web
```

- [ ] **Step 6: Commit**

```bash
git add -A apps/member && git commit -m "feat(member): route groups with auth-gated navigation"
```

---

## Task 7: Login screen (credentials + new-password challenge)

**Files:**
- Create: `apps/member/lib/login-schema.ts`
- Create: `apps/member/lib/login-schema.test.ts`
- Create: `apps/member/components/form/field.tsx`
- Modify: `apps/member/app/(auth)/login.tsx` (real UI)

**Interfaces:**
- Consumes: `useAuth`, `t`, `authErrorMessageKey`, atoms, `SignInResult`.
- Produces: `credentialsSchema` / `newPasswordSchema` (zod) from `lib/login-schema.ts`; `TextField` component.

- [ ] **Step 1: Install form libs**

```bash
cd apps/member && pnpm add react-hook-form zod @hookform/resolvers && cd ../.. && pnpm install
```

- [ ] **Step 2: Write the failing schema test**

`apps/member/lib/login-schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { credentialsSchema, newPasswordSchema } from './login-schema';

describe('credentialsSchema', () => {
  it('rejects an invalid email', () => {
    expect(credentialsSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false);
  });
  it('accepts a valid pair', () => {
    expect(credentialsSchema.safeParse({ email: 'a@b.co', password: 'secret' }).success).toBe(true);
  });
});

describe('newPasswordSchema', () => {
  it('requires 8+ chars and matching confirmation', () => {
    expect(newPasswordSchema.safeParse({ newPassword: 'short', confirmPassword: 'short' }).success).toBe(false);
    expect(newPasswordSchema.safeParse({ newPassword: 'longenough', confirmPassword: 'different' }).success).toBe(false);
    expect(newPasswordSchema.safeParse({ newPassword: 'longenough', confirmPassword: 'longenough' }).success).toBe(true);
  });
});
```

- [ ] **Step 3: Run it (fails), then implement `lib/login-schema.ts`**

```ts
import { z } from 'zod';

export const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const newPasswordSchema = z
  .object({
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'mismatch',
  });

export type CredentialsValues = z.infer<typeof credentialsSchema>;
export type NewPasswordValues = z.infer<typeof newPasswordSchema>;
```

Run: `pnpm --filter @iziwellpass/member test` → PASS.

- [ ] **Step 4: Write `components/form/field.tsx`**

A labelled, controlled text input bound to react-hook-form, with an error line.

```tsx
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { TextInput, View } from 'react-native';
import { AppText } from '@/components/ui/text';
import { colors } from '@/lib/theme';

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  secure,
  keyboardType,
  errorText,
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
  secure?: boolean;
  keyboardType?: 'email-address' | 'default';
  errorText?: string;
}) {
  return (
    <View className="gap-1.5">
      <AppText variant="label">{label}</AppText>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            className="min-h-12 rounded-xl border border-border bg-neutral-50 px-4 text-base text-foreground"
            placeholderTextColor={colors.neutral[400]}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={secure}
            keyboardType={keyboardType ?? 'default'}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value ?? ''}
          />
        )}
      />
      {errorText ? <AppText className="text-destructive">{errorText}</AppText> : null}
    </View>
  );
}
```

- [ ] **Step 5: Implement the real login screen**

Two-step flow: credentials → (if challenge) set new password. On success, `onSignedIn(idToken)` (the Gate then routes into `(app)`). Errors via `authErrorMessageKey` → `t`.

```tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { View } from 'react-native';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/form/field';
import { useAuth } from '@/lib/auth/context';
import { t } from '@/lib/i18n';
import { authErrorMessageKey } from '@/lib/auth/errors';
import { credentialsSchema, newPasswordSchema, type CredentialsValues, type NewPasswordValues } from '@/lib/login-schema';

type Challenge = { complete: (pw: string) => Promise<{ idToken: string }> };

export default function Login() {
  const { signIn, onSignedIn } = useAuth();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const creds = useForm<CredentialsValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: '', password: '' },
  });
  const pw = useForm<NewPasswordValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

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

  const onNewPassword = pw.handleSubmit(async ({ newPassword }) => {
    if (!challenge) return;
    setFormError(null);
    try {
      const { idToken } = await challenge.complete(newPassword);
      onSignedIn(idToken);
    } catch (err) {
      setFormError(t(authErrorMessageKey(err)));
    }
  });

  if (challenge) {
    return (
      <Screen>
        <AppText variant="title">{t('login.newPasswordTitle')}</AppText>
        <View className="gap-4">
          <TextField control={pw.control} name="newPassword" label={t('login.newPassword')} secure
            errorText={pw.formState.errors.newPassword ? t('auth.error.generic') : undefined} />
          <TextField control={pw.control} name="confirmPassword" label={t('login.confirmPassword')} secure
            errorText={pw.formState.errors.confirmPassword ? t('auth.error.generic') : undefined} />
          {formError ? <AppText className="text-destructive">{formError}</AppText> : null}
          <Button label={t('login.newPasswordSubmit')} onPress={onNewPassword} loading={pw.formState.isSubmitting} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText variant="title">{t('login.title')}</AppText>
      <View className="gap-4">
        <TextField control={creds.control} name="email" label={t('login.email')} keyboardType="email-address"
          errorText={creds.formState.errors.email ? t('auth.error.invalidCredentials') : undefined} />
        <TextField control={creds.control} name="password" label={t('login.password')} secure />
        {formError ? <AppText className="text-destructive">{formError}</AppText> : null}
        <Button label={t('login.submit')} onPress={onCredentials} loading={creds.formState.isSubmitting} />
      </View>
    </Screen>
  );
}
```

- [ ] **Step 6: Verify, boot, sign in live**

```bash
pnpm --filter @iziwellpass/member typecheck && pnpm --filter @iziwellpass/member lint && pnpm --filter @iziwellpass/member test
```

Boot (`npx expo start`) and sign in with a real member of the Main pool to confirm `success` and the `newPasswordRequired` path (for a freshly-invited member).

- [ ] **Step 7: Commit**

```bash
git add apps/member && git commit -m "feat(member): login with new-password challenge"
```

---

## Task 8: Card screen (profile + subscription)

**Files:**
- Create: `apps/member/lib/format.ts`
- Create: `apps/member/lib/format.test.ts`
- Create: `apps/member/components/ui/query-boundary.tsx`
- Modify: `apps/member/app/(app)/index.tsx`

**Interfaces:**
- Consumes: `useMeProfile`, `useMeSubscription`, `unwrap`, `useAuth`, `statusBadgeVariant`, `StatusBadge`, atoms, `t`.
- Produces: `formatDate(iso: string, locale?: string): string`, `formatMoney(minor: number, currency: string): string` from `lib/format.ts`; `QueryBoundary` (renders loading/error/children) component.
- Note: the subscription exposes `venue_id` (an id, not a name), so v1 shows status/plan/validity but **not** a venue name; venue-name display (via `useMeVenues`) is deferred to keep this screen tight. The `card.venue` message key stays defined for that follow-up.

- [ ] **Step 1: Write the failing formatter test**

`apps/member/lib/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatDate, formatMoney } from './format';

describe('formatDate', () => {
  it('formats an ISO date as a fr day-month-year', () => {
    expect(formatDate('2026-09-11')).toMatch(/2026/);
  });
  it('returns an em-dash-free placeholder for empty input', () => {
    expect(formatDate('')).toBe('—');
  });
});

describe('formatMoney', () => {
  it('renders minor units in the given currency', () => {
    // 25000 minor XOF = 25 000 (XOF has 0 fraction digits handled as minor==major here)
    expect(formatMoney(25000, 'XOF')).toContain('25');
  });
});
```

- [ ] **Step 2: Run it (fails), then implement `lib/format.ts`**

```ts
export function formatDate(iso: string, locale = 'fr-FR'): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

export function formatMoney(minor: number, currency: string, locale = 'fr-FR'): string {
  // FCFA (XOF) has no minor unit in practice; show integer major units.
  const zeroDecimal = new Set(['XOF', 'XAF', 'JPY']);
  const amount = zeroDecimal.has(currency) ? minor : minor / 100;
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: zeroDecimal.has(currency) ? 0 : 2 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}
```

Run tests → PASS.

- [ ] **Step 3: Write `components/ui/query-boundary.tsx`**

```tsx
import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AppText } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';

export function QueryBoundary({
  isLoading,
  isError,
  errorText,
  onRetry,
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  errorText: string;
  onRetry: () => void;
  children: ReactNode;
}) {
  if (isLoading) {
    return (
      <View className="items-center py-10">
        <ActivityIndicator color="#0c3d22" />
      </View>
    );
  }
  if (isError) {
    return (
      <View className="items-center gap-3 py-10">
        <AppText className="text-neutral-500">{errorText}</AppText>
        <Button label={t('common.retry')} variant="ghost" onPress={onRetry} />
      </View>
    );
  }
  return <>{children}</>;
}
```

- [ ] **Step 4: Implement the Card screen**

```tsx
import { View } from 'react-native';
import { useMeProfile, useMeSubscription } from '@iziwellpass/api/generated';
import { unwrap } from '@iziwellpass/api/client';
import { Screen } from '@/components/ui/screen';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { StatusBadge, statusBadgeVariant } from '@/components/ui/status-badge';
import { QueryBoundary } from '@/components/ui/query-boundary';
import { useAuth } from '@/lib/auth/context';
import { t } from '@/lib/i18n';
import { formatDate } from '@/lib/format';

export default function CardScreen() {
  const { claims, signOut } = useAuth();
  const profile = useMeProfile({ query: { select: unwrap } });
  const sub = useMeSubscription({ query: { select: unwrap } });
  const name = claims?.name ?? null;

  return (
    <Screen>
      <AppText variant="title">{name ? t('card.greeting', { name }) : t('card.greetingNoName')}</AppText>

      <QueryBoundary
        isLoading={profile.isLoading}
        isError={profile.isError}
        errorText={t('card.error')}
        onRetry={() => void profile.refetch()}
      >
        {profile.data ? (
          <Card>
            <AppText variant="section">{`${profile.data.first_name} ${profile.data.last_name}`}</AppText>
            <View className="mt-2 flex-row items-center gap-2">
              <AppText variant="label">{t('card.status')}</AppText>
              <StatusBadge label={profile.data.membership_status} variant={statusBadgeVariant(profile.data.membership_status)} />
            </View>
            {profile.data.membership_end ? (
              <AppText variant="label" className="mt-2">
                {t('card.validUntil', { date: formatDate(profile.data.membership_end) })}
              </AppText>
            ) : null}
          </Card>
        ) : null}
      </QueryBoundary>

      <QueryBoundary
        isLoading={sub.isLoading}
        isError={sub.isError}
        errorText={t('card.error')}
        onRetry={() => void sub.refetch()}
      >
        <Card>
          <AppText variant="label">{t('card.plan')}</AppText>
          {sub.data ? (
            <>
              <View className="mt-1 flex-row items-center gap-2">
                <StatusBadge label={sub.data.status} variant={statusBadgeVariant(sub.data.status)} />
              </View>
              {typeof sub.data.entries_remaining === 'number' ? (
                <AppText className="mt-2">{t('card.entriesRemaining', { count: sub.data.entries_remaining })}</AppText>
              ) : null}
              {sub.data.expires_on ? (
                <AppText variant="label" className="mt-2">{t('card.validUntil', { date: formatDate(sub.data.expires_on) })}</AppText>
              ) : null}
            </>
          ) : (
            <AppText className="mt-1 text-neutral-500">{t('card.noSubscription')}</AppText>
          )}
        </Card>
      </QueryBoundary>

      <Button label={t('card.signOut')} variant="ghost" onPress={signOut} />
    </Screen>
  );
}
```

- [ ] **Step 5: Verify, boot, commit**

```bash
pnpm --filter @iziwellpass/member typecheck && pnpm --filter @iziwellpass/member lint && pnpm --filter @iziwellpass/member test
git add apps/member && git commit -m "feat(member): membership card with profile and subscription"
```

---

## Task 9: Entry QR screen

**Files:**
- Create: `apps/member/lib/countdown.ts`
- Create: `apps/member/lib/countdown.test.ts`
- Modify: `apps/member/app/(app)/qr.tsx`

**Interfaces:**
- Consumes: `useMintMemberQr`, `unwrap`, atoms, `t`.
- Produces: `secondsUntil(expiresAtUnix: number, nowMs?: number): number` from `lib/countdown.ts`.

- [ ] **Step 1: Install QR renderer**

```bash
cd apps/member && npx expo install react-native-svg && pnpm add react-native-qrcode-svg && cd ../.. && pnpm install
```

- [ ] **Step 2: Write the failing countdown test**

`apps/member/lib/countdown.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { secondsUntil } from './countdown';

describe('secondsUntil', () => {
  it('computes whole seconds remaining, floored', () => {
    expect(secondsUntil(1000, 990_500)).toBe(9); // (1000_000 - 990_500)/1000 = 9.5 -> 9
  });
  it('never returns negative', () => {
    expect(secondsUntil(1000, 2_000_000)).toBe(0);
  });
});
```

- [ ] **Step 3: Run it (fails), then implement `lib/countdown.ts`**

```ts
/** Whole seconds from now until a Unix-seconds expiry, floored at 0. */
export function secondsUntil(expiresAtUnix: number, nowMs: number = Date.now()): number {
  const remainingMs = expiresAtUnix * 1000 - nowMs;
  return remainingMs <= 0 ? 0 : Math.floor(remainingMs / 1000);
}
```

Run tests → PASS.

- [ ] **Step 4: Implement the QR screen**

Mint on mount and on demand; render the token as a QR; show a live countdown; when it hits 0, disable and offer regenerate. QR mint is `POST /me/qr` (`useMintMemberQr`) gated on `member_qr` (Pro/Enterprise) — a 403 surfaces as the error state, honestly.

```tsx
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useMintMemberQr } from '@iziwellpass/api/generated';
import { unwrap } from '@iziwellpass/api/client';
import { Screen } from '@/components/ui/screen';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { secondsUntil } from '@/lib/countdown';

export default function QrScreen() {
  const mint = useMintMemberQr({ mutation: {} });
  const [now, setNow] = useState(Date.now());
  const data = mint.data ? unwrap(mint.data) : null;
  const remaining = data ? secondsUntil(data.expires_at, now) : 0;
  const expired = !!data && remaining <= 0;

  useEffect(() => {
    mint.mutate({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <Screen>
      <AppText variant="title">{t('qr.title')}</AppText>
      <AppText variant="label">{t('qr.subtitle')}</AppText>

      <Card className="items-center gap-4 py-8">
        {mint.isError ? (
          <>
            <AppText className="text-neutral-500">{t('qr.error')}</AppText>
            <Button label={t('qr.generate')} onPress={() => mint.mutate({})} loading={mint.isPending} />
          </>
        ) : data && !expired ? (
          <>
            <View className="rounded-xl bg-neutral-50 p-4">
              <QRCode value={data.token} size={220} color="#1c1917" backgroundColor="#fffefd" />
            </View>
            <AppText variant="mono">{t('qr.expiresIn', { seconds: remaining })}</AppText>
          </>
        ) : data && expired ? (
          <>
            <AppText className="text-neutral-500">{t('qr.expired')}</AppText>
            <Button label={t('qr.refresh')} onPress={() => mint.mutate({})} loading={mint.isPending} />
          </>
        ) : (
          <Button label={t('qr.generate')} onPress={() => mint.mutate({})} loading={mint.isPending} />
        )}
      </Card>
    </Screen>
  );
}
```

> Interface note: confirm `useMintMemberQr().mutate` takes `{}` (no body) — the generated signature is `mutate(variables)`; if it requires `{ data: undefined }` or `undefined`, match the generated type exactly. The response `.data` is `{ token, expires_at }`.

- [ ] **Step 5: Verify, boot (scan the QR at a staging door if possible), commit**

```bash
pnpm --filter @iziwellpass/member typecheck && pnpm --filter @iziwellpass/member lint && pnpm --filter @iziwellpass/member test
git add apps/member && git commit -m "feat(member): entry QR with live expiry countdown"
```

---

## Task 10: Bookings screen (list + cancel)

**Files:**
- Create: `apps/member/lib/bookings.ts`
- Create: `apps/member/lib/bookings.test.ts`
- Modify: `apps/member/app/(app)/bookings.tsx`

**Interfaces:**
- Consumes: `useMeListBookings`, `useMeCancelBooking`, `unwrap`, `useQueryClient`, atoms, `StatusBadge`/`statusBadgeVariant`, `t`, `formatDate`.
- Produces: `bookingStatusLabelKey(status: string): string` and `isCancellable(status: string): boolean` from `lib/bookings.ts`.

- [ ] **Step 1: Write the failing bookings-logic test**

`apps/member/lib/bookings.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { bookingStatusLabelKey, isCancellable } from './bookings';

describe('bookingStatusLabelKey', () => {
  it('maps known statuses to i18n keys', () => {
    expect(bookingStatusLabelKey('confirmed')).toBe('bookings.status.confirmed');
    expect(bookingStatusLabelKey('cancelled')).toBe('bookings.status.cancelled');
  });
  it('falls back to pending for unknown', () => {
    expect(bookingStatusLabelKey('mystery')).toBe('bookings.status.pending');
  });
});

describe('isCancellable', () => {
  it('only confirmed/pending bookings can be cancelled', () => {
    expect(isCancellable('confirmed')).toBe(true);
    expect(isCancellable('pending')).toBe(true);
    expect(isCancellable('cancelled')).toBe(false);
    expect(isCancellable('checked_in')).toBe(false);
  });
});
```

- [ ] **Step 2: Run it (fails), then implement `lib/bookings.ts`**

```ts
const LABELS: Record<string, string> = {
  confirmed: 'bookings.status.confirmed',
  cancelled: 'bookings.status.cancelled',
  canceled: 'bookings.status.cancelled',
  checked_in: 'bookings.status.checked_in',
  pending: 'bookings.status.pending',
};

export function bookingStatusLabelKey(status: string): string {
  return LABELS[status.toLowerCase()] ?? 'bookings.status.pending';
}

export function isCancellable(status: string): boolean {
  const s = status.toLowerCase();
  return s === 'confirmed' || s === 'pending';
}
```

Run tests → PASS.

- [ ] **Step 3: Implement the Bookings screen**

List `me/bookings`; each cancellable row has a cancel action with a confirm `Alert`; on success invalidate the bookings query. Cancel rejection (window closed) surfaces via a de-jargoned message (fallback + ref).

```tsx
import { Alert, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useMeListBookings, useMeCancelBooking, getMeListBookingsQueryKey } from '@iziwellpass/api/generated';
import { unwrap, ApiError } from '@iziwellpass/api/client';
import { Screen } from '@/components/ui/screen';
import { Card } from '@/components/ui/card';
import { AppText } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { StatusBadge, statusBadgeVariant } from '@/components/ui/status-badge';
import { QueryBoundary } from '@/components/ui/query-boundary';
import { t } from '@/lib/i18n';
import { formatDate } from '@/lib/format';
import { bookingStatusLabelKey, isCancellable } from '@/lib/bookings';

export default function BookingsScreen() {
  const qc = useQueryClient();
  const list = useMeListBookings({ query: { select: unwrap } });
  const cancel = useMeCancelBooking({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getMeListBookingsQueryKey() }),
      onError: (err) => {
        const ref = err instanceof ApiError && err.requestId ? ` · ref: ${err.requestId.slice(0, 8)}` : '';
        Alert.alert(t('bookings.cancelError') + ref);
      },
    },
  });

  const confirmCancel = (bid: string) =>
    Alert.alert(t('bookings.cancelConfirmTitle'), t('bookings.cancelConfirmBody'), [
      { text: t('bookings.keep'), style: 'cancel' },
      { text: t('bookings.cancelConfirm'), style: 'destructive', onPress: () => cancel.mutate({ bid }) },
    ]);

  return (
    <Screen>
      <AppText variant="title">{t('bookings.title')}</AppText>
      <QueryBoundary
        isLoading={list.isLoading}
        isError={list.isError}
        errorText={t('bookings.error')}
        onRetry={() => void list.refetch()}
      >
        {list.data && list.data.length === 0 ? (
          <AppText className="py-8 text-center text-neutral-500">{t('bookings.empty')}</AppText>
        ) : (
          (list.data ?? []).map((b) => (
            <Card key={b.id}>
              <View className="flex-row items-center justify-between">
                <AppText>{formatDate(b.booked_at)}</AppText>
                <StatusBadge label={t(bookingStatusLabelKey(b.status))} variant={statusBadgeVariant(b.status)} />
              </View>
              {isCancellable(b.status) ? (
                <View className="mt-3 self-start">
                  <Button
                    label={t('bookings.cancel')}
                    variant="ghost"
                    onPress={() => confirmCancel(b.id)}
                    loading={cancel.isPending && cancel.variables?.bid === b.id}
                  />
                </View>
              ) : null}
            </Card>
          ))
        )}
      </QueryBoundary>
    </Screen>
  );
}
```

> Interface note: verify the generated cancel mutation variable name (`{ bid }`) and the query-key helper name (`getMeListBookingsQueryKey`) against `@iziwellpass/api/generated`; match them exactly.

- [ ] **Step 4: Verify, boot, commit**

```bash
pnpm --filter @iziwellpass/member typecheck && pnpm --filter @iziwellpass/member lint && pnpm --filter @iziwellpass/member test
git add apps/member && git commit -m "feat(member): bookings list with cancel"
```

- [ ] **Step 5: Final full-suite gate from repo root**

```bash
pnpm build && pnpm typecheck && pnpm lint && pnpm test
```

Expected: all four gates green across the whole monorepo (owner + admin + member + packages).

---

## Notes for the executor

- **Generated-hook signatures are the source of truth.** Where this plan names a hook option shape (`{ query: { select } }`, `{ mutation: { onSuccess } }`), mutation variables (`{ bid }`), or query-key helpers, open `packages/api/src/generated/endpoints.ts` and match the exact generated names/types. The plan's names were read from that file but confirm at the call site.
- **vitest tests must not import React Native or Expo native modules.** Keep every `*.test.ts` targeting a pure module (`theme`, `storage` via injected KV, `errors`, `session`, `nav`, `i18n` flatten/`t`, `format`, `countdown`, `bookings`, `login-schema`). Never write a `.test.tsx` that renders a RN component under vitest.
- **Never run `pnpm build` / `expo export` while a Metro or `turbo run dev` server is up** (shared caches cause phantom failures — see the `next-build-vs-dev-server-collision` memory; the same applies to Metro).
- **`.env.local`** must be created from `.env.example` before booting; it is gitignored via `.git/info/exclude`.
- If Metro fails to resolve `@iziwellpass/*` `.ts` exports, confirm `unstable_enablePackageExports = true` (Task 1) and that `pnpm install` created the workspace symlinks under `node_modules`.
