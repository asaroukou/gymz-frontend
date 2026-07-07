'use client';

import { useTranslations } from 'next-intl';

import { Alert, AlertDescription, AlertTitle } from '@iziwellpass/ui/components/alert';

import { apiErrorMessage } from '@/lib/api-error';

/**
 * Shared destructive alert for any dashboard data region that fails to load.
 * `apiErrorMessage` folds the machine-readable `ApiError.code` (and a request
 * ref, when present) into the description so support can grep logs.
 */
export function SectionError({ error, fallback }: { error: unknown; fallback: string }) {
  const t = useTranslations('dashboard');
  return (
    <Alert variant="destructive">
      <AlertTitle>{t('errors.loadTitle')}</AlertTitle>
      <AlertDescription>{apiErrorMessage(error, fallback)}</AlertDescription>
    </Alert>
  );
}
