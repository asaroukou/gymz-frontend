import type { ReactNode } from 'react';

// Centered-card layout, same shape as (auth) — deliberately NOT the AppShell:
// a signed-in-but-role-less user has nothing to navigate to yet. Session
// presence is enforced by middleware (see apps/owner/middleware.ts); the page
// itself re-checks client-side for the loading/signed-out/has-role branches.
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-lg">
        <h1 className="mb-6 text-center text-2xl font-semibold text-primary">IziWellPass</h1>
        {children}
      </div>
    </div>
  );
}
