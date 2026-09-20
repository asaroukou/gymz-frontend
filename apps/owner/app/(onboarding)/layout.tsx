import type { ReactNode } from 'react';

import { Wordmark } from '@iziwellpass/ui/components/wordmark';

// Centered-card layout on the paper surface, same shape as (auth) — deliberately
// NOT the AppShell: a signed-in-but-role-less user has nothing to navigate to
// yet. Session presence is enforced by middleware (see apps/owner/middleware.ts);
// the page itself re-checks client-side for the loading/signed-out/has-role branches.
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-backdrop p-4">
      <div className="w-full max-w-[560px] space-y-6">
        <div className="flex justify-center">
          <Wordmark name="IziWellPass" />
        </div>
        {children}
      </div>
    </div>
  );
}
