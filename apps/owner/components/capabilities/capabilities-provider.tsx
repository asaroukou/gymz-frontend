'use client';

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { unwrap } from '@iziwellpass/api/client';
import { useGetCapabilities } from '@iziwellpass/api/generated';

import { capabilitiesValue, isKnownPlan, type CapabilitiesValue } from '@/lib/capabilities';

const CapabilitiesContext = createContext<CapabilitiesValue>(capabilitiesValue(undefined, true));

/**
 * Loads `GET /capabilities` once per session (the plan only changes after
 * re-login, which remounts the tree — spec T6) and fails open (T7).
 */
export function CapabilitiesProvider({ children }: { children: ReactNode }) {
  const query = useGetCapabilities({
    query: { select: unwrap, staleTime: Infinity, gcTime: Infinity, retry: 1 },
  });
  const value = useMemo(
    () => capabilitiesValue(query.data, query.isLoading),
    [query.data, query.isLoading],
  );
  return <CapabilitiesContext.Provider value={value}>{children}</CapabilitiesContext.Provider>;
}

export function useCapabilities(): CapabilitiesValue {
  return useContext(CapabilitiesContext);
}

/** « Starter », « Entreprise »… — a plan the console does not know shows as sent. */
export function usePlanLabel(): (plan: string) => string {
  const t = useTranslations('capabilities.plan');
  return useCallback((plan: string) => (isKnownPlan(plan) ? t(plan) : plan), [t]);
}
