import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { Wash } from '@iziwellpass/ui/components/wash';
import { Wordmark } from '@iziwellpass/ui/components/wordmark';

/**
 * The auth surface: the lavis wash at the top of the viewport, a 400px column
 * vertically centred — wordmark, the screen, the help line — on the white
 * page. No card, no band, no border (The No-Box Rule). `overflow-hidden`
 * keeps the wash from adding a scrollbar.
 */
export default async function AuthLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations('auth');

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10">
      <Wash />
      <div className="relative flex w-full max-w-[400px] flex-col items-center gap-10">
        <Wordmark name="IziWellPass" />
        {children}
        <p className="text-center text-sm text-muted-foreground">{t('footer')}</p>
      </div>
    </div>
  );
}
