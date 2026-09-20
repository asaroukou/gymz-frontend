'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { LockIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useRole } from '@iziwellpass/auth/provider';
import { Button } from '@iziwellpass/ui/components/button';
import { Card } from '@iziwellpass/ui/components/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@iziwellpass/ui/components/empty';

import { canAccessPath } from '@/lib/nav';

function NoAccessNotice() {
  const t = useTranslations('system.noAccess');

  return (
    <Card className="mx-auto max-w-md">
      <Empty>
        <EmptyMedia>
          <LockIcon />
        </EmptyMedia>
        <EmptyTitle>{t('title')}</EmptyTitle>
        <EmptyDescription>{t('body')}</EmptyDescription>
        <EmptyContent>
          <Button asChild variant="outline">
            <Link href="/">{t('home')}</Link>
          </Button>
        </EmptyContent>
      </Empty>
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
