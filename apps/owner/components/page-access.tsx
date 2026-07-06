'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

import { useRole } from '@iziwellpass/auth/provider';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@iziwellpass/ui/components/card';

import { canAccessPath } from '@/lib/nav';

function NoAccessNotice() {
  return (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>No access</CardTitle>
        <CardDescription>Your role doesn&apos;t have access to this page.</CardDescription>
      </CardHeader>
      <CardContent>
        <Link href="/" className="text-sm text-primary underline underline-offset-4">
          Back to dashboard
        </Link>
      </CardContent>
    </Card>
  );
}

/**
 * Inline, belt-and-braces role gate for a slice page. The nav already hides
 * links a role can't use, but a role-holder can still navigate to the URL
 * directly (e.g. a trainer opening `/venues`) — this renders a no-access
 * card instead of the page content in that case. Role-less sessions never
 * reach these pages at all: the `(app)` layout redirects them to
 * `/onboarding` before any page renders.
 */
export function RequirePageAccess({ href, children }: { href: string; children: ReactNode }) {
  const role = useRole();

  if (!canAccessPath(role, href)) {
    return <NoAccessNotice />;
  }

  return <>{children}</>;
}
