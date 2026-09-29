import type { ReactNode } from 'react';

import { Wash } from '@iziwellpass/ui/components/wash';
import { Wordmark } from '@iziwellpass/ui/components/wordmark';

// Same surface as (auth) at 620px — deliberately NOT the AppShell: a
// signed-in-but-role-less user has nothing to navigate to yet. Session
// presence is enforced by the proxy (see apps/owner/proxy.ts); the page
// re-checks client-side for the loading/signed-out/has-role branches.
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10">
      <Wash />
      <div className="relative flex w-full max-w-[620px] flex-col items-center gap-10">
        <Wordmark name="IziWellPass" />
        {children}
      </div>
    </div>
  );
}
