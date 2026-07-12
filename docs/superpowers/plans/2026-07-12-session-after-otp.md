# Session After OTP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan.

**Goal:** After OTP confirmation, auto-sign-in the just-created account and land the user directly on `/onboarding` instead of bouncing them to `/login`.

**Architecture:** Cognito `confirmSignUp` returns no tokens; a session only comes from `signIn(email, password)`. We carry the signup credentials to the confirm step in an in-memory React context (mounted on the `(auth)` layout, so it survives the soft `signup → confirm` navigation but dies on any full reload). On OTP success we call `signIn` and redirect to `/onboarding`. If the credentials are gone (page was refreshed) or `signIn` doesn't succeed, we gracefully fall back to today's redirect-to-login behavior.

**Tech Stack:** Next.js 15 App Router, React 19, `@iziwellpass/auth` provider, next-intl, sonner.

---

### Context for the implementer

- Working dir: `/Users/abdel/dev/gymz-v1/web`
- `useAuth()` (`packages/auth/src/provider.tsx`) exposes `client`, `signIn(email, password): Promise<SignInResult>`. On `result.kind === 'success'` the provider already calls `refresh()`, which calls `setSessionCookie()` synchronously — so after `await signIn(...)` returns success, the `iwp_session` cookie is set and the `/onboarding` middleware guard will pass.
- `SignInResult` is a discriminated union with a `.kind` field; `'success'` is the happy case. Treat anything other than `'success'` as "fall back to login" (a fresh signup won't hit challenge kinds, but handle it defensively).
- `(auth)/layout.tsx` is an async **server** component — render the client provider inside it.
- No test setup in the owner app — verify with `pnpm typecheck` from `apps/owner/`.
- Another agent has uncommitted work in this tree (`bookings-sheet.tsx`, `combobox.tsx`, `slotFull` i18n key). Do NOT touch or stage those files. Only stage the files this plan names.

---

### Task 1: In-memory pending-credentials context + capture on signup + consume on confirm

**Files:**
- Create: `apps/owner/app/(auth)/pending-credentials.tsx`
- Modify: `apps/owner/app/(auth)/layout.tsx`
- Modify: `apps/owner/app/(auth)/signup/page.tsx`
- Modify: `apps/owner/app/(auth)/confirm/page.tsx`
- Modify: `apps/owner/messages/en.json`
- Modify: `apps/owner/messages/fr.json`

- [ ] **Step 1: Create the context**

Create `apps/owner/app/(auth)/pending-credentials.tsx`:

```tsx
'use client';

import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';

interface PendingCredentials {
  email: string;
  password: string;
}

interface PendingSignupContextValue {
  /** Stash credentials captured at signup, in memory only. */
  set: (email: string, password: string) => void;
  /** Return the stashed credentials and clear them. Null if none held. */
  consume: () => PendingCredentials | null;
  /** Drop any held credentials without reading them. */
  clear: () => void;
}

const PendingSignupContext = createContext<PendingSignupContextValue | null>(null);

/**
 * Holds the password from the signup step just long enough to auto-sign-in
 * after OTP confirmation. Kept in a ref (not state) so it never lands in the
 * React state tree, never touches the URL or storage, and is wiped on any full
 * page reload. Mounted on the (auth) layout so it survives the soft
 * signup → confirm navigation.
 */
export function PendingSignupProvider({ children }: { children: ReactNode }) {
  const ref = useRef<PendingCredentials | null>(null);
  const value = useMemo<PendingSignupContextValue>(
    () => ({
      set: (email, password) => {
        ref.current = { email, password };
      },
      consume: () => {
        const held = ref.current;
        ref.current = null;
        return held;
      },
      clear: () => {
        ref.current = null;
      },
    }),
    [],
  );
  return <PendingSignupContext.Provider value={value}>{children}</PendingSignupContext.Provider>;
}

export function usePendingSignup(): PendingSignupContextValue {
  const ctx = useContext(PendingSignupContext);
  if (!ctx) {
    throw new Error('usePendingSignup must be used inside <PendingSignupProvider>');
  }
  return ctx;
}
```

- [ ] **Step 2: Mount the provider on the (auth) layout**

In `apps/owner/app/(auth)/layout.tsx`, import the provider and wrap `{children}`.

Add the import at the top (after the existing imports):
```tsx
import { PendingSignupProvider } from './pending-credentials';
```

Change:
```tsx
      <div className="w-full max-w-[400px] space-y-6">
        {children}
        <p className="text-center text-sm text-backdrop-foreground">{t('footer')}</p>
      </div>
```
to:
```tsx
      <div className="w-full max-w-[400px] space-y-6">
        <PendingSignupProvider>{children}</PendingSignupProvider>
        <p className="text-center text-sm text-backdrop-foreground">{t('footer')}</p>
      </div>
```

- [ ] **Step 3: Capture credentials on signup**

In `apps/owner/app/(auth)/signup/page.tsx`:

Add import (with the other `@/` imports):
```tsx
import { usePendingSignup } from '../pending-credentials';
```

Add the hook near the other hooks in `SignupPage` (after `const resolveError = useAuthError();`):
```tsx
  const pendingSignup = usePendingSignup();
```

Change the `onSubmit` success path from:
```tsx
      await client.signUp(values.email, values.password);
      setRedirecting(true);
      router.push(`/confirm?email=${encodeURIComponent(values.email)}`);
```
to:
```tsx
      await client.signUp(values.email, values.password);
      pendingSignup.set(values.email, values.password);
      setRedirecting(true);
      router.push(`/confirm?email=${encodeURIComponent(values.email)}`);
```

- [ ] **Step 4: Consume credentials + auto-sign-in on confirm**

In `apps/owner/app/(auth)/confirm/page.tsx`:

Add import (with the other `@/` imports):
```tsx
import { usePendingSignup } from '../pending-credentials';
```

Change the destructure from:
```tsx
  const { client } = useAuth();
```
to:
```tsx
  const { client, signIn } = useAuth();
```

Add the hook after `const resolveError = useAuthError();`:
```tsx
  const pendingSignup = usePendingSignup();
```

Replace the entire `onSubmit` handler:
```tsx
  const onSubmit = async (values: ConfirmValues) => {
    try {
      await client.confirmSignUp(values.email, values.code);
      toast.success(t('confirm.success'));
      setRedirecting(true);
      router.push('/login');
    } catch (err) {
      const { message } = resolveError(err, t('confirm.error'));
      form.setError('root', { message });
    }
  };
```
with:
```tsx
  const onSubmit = async (values: ConfirmValues) => {
    try {
      await client.confirmSignUp(values.email, values.code);
    } catch (err) {
      const { message } = resolveError(err, t('confirm.error'));
      form.setError('root', { message });
      return;
    }

    // Try to auto-sign-in with the credentials captured at signup so the user
    // goes straight to onboarding. If they're gone (page was refreshed) or the
    // sign-in doesn't succeed, fall back to the manual login flow.
    const creds = pendingSignup.consume();
    if (creds && creds.email === values.email) {
      try {
        const result = await signIn(creds.email, creds.password);
        if (result.kind === 'success') {
          toast.success(t('confirm.created'));
          setRedirecting(true);
          router.replace('/onboarding');
          return;
        }
      } catch {
        // fall through to the login fallback below
      }
    }

    toast.success(t('confirm.success'));
    setRedirecting(true);
    router.push('/login?next=/onboarding');
  };
```

Note: the confirm error is now caught in its own try/catch and returns early, so a failed auto-sign-in never gets misreported as a confirmation error.

- [ ] **Step 5: Add the `confirm.created` i18n key**

In `apps/owner/messages/en.json`, inside `auth.confirm`, add after `"success"`:
```json
"created": "Account created — welcome!",
```

In `apps/owner/messages/fr.json`, inside `auth.confirm`, add after `"success"`:
```json
"created": "Compte créé — bienvenue !",
```

- [ ] **Step 6: Typecheck**

```bash
cd apps/owner && pnpm typecheck
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/owner/app/\(auth\)/pending-credentials.tsx \
        apps/owner/app/\(auth\)/layout.tsx \
        apps/owner/app/\(auth\)/signup/page.tsx \
        apps/owner/app/\(auth\)/confirm/page.tsx \
        apps/owner/messages/en.json apps/owner/messages/fr.json
git commit -m "feat(auth): create session after OTP and land on onboarding"
```
