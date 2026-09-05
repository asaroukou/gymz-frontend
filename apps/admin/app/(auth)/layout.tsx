import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations('auth');

  return (
    <div className="flex min-h-screen items-center justify-center bg-backdrop p-4">
      <div className="w-full max-w-[400px] space-y-6">
        {children}
        <p className="text-center text-sm text-backdrop-foreground">{t('footer')}</p>
      </div>
    </div>
  );
}
