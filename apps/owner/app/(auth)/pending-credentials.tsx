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
