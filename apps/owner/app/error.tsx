'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { TriangleAlertIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@iziwellpass/ui/components/button';
import { Card } from '@iziwellpass/ui/components/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@iziwellpass/ui/components/empty';

// A route-segment error boundary: it renders inside the root layout, so the
// next-intl provider and app fonts are available here (unlike `global-error`,
// which replaces the root layout).
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('system.error');

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <Empty>
          <EmptyMedia>
            <TriangleAlertIcon />
          </EmptyMedia>
          <EmptyTitle>{t('title')}</EmptyTitle>
          <EmptyDescription>{t('body')}</EmptyDescription>
          {error.digest ? (
            <p className="mt-1 font-numeric text-xs text-muted-foreground">
              {t('ref', { digest: error.digest })}
            </p>
          ) : null}
          <EmptyContent className="mt-4">
            <Button onClick={reset}>{t('retry')}</Button>
            <Button asChild variant="outline">
              <Link href="/">{t('home')}</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </Card>
    </div>
  );
}
