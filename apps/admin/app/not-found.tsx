import Link from 'next/link';
import { CompassIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Button } from '@iziwellpass/ui/components/button';
import { Card } from '@iziwellpass/ui/components/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@iziwellpass/ui/components/empty';

export default async function NotFound() {
  const t = await getTranslations('system.notFound');

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <Empty>
          <EmptyMedia>
            <CompassIcon />
          </EmptyMedia>
          <EmptyTitle>{t('title')}</EmptyTitle>
          <EmptyDescription>{t('body')}</EmptyDescription>
          <EmptyContent className="mt-4">
            <Button asChild>
              <Link href="/">{t('home')}</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </Card>
    </div>
  );
}
