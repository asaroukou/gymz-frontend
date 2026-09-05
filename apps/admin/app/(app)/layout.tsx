'use client';

import { useEffect, type AnchorHTMLAttributes, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useAuth, useSession } from '@iziwellpass/auth/provider';
import { AppShell } from '@iziwellpass/ui/app-shell';
import { Button } from '@iziwellpass/ui/components/button';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';

/** AppShell's linkComponent takes href?: string; next/link requires href — wrap. */
function NavLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <Link href={props.href ?? '#'} {...props} />;
}

function UserMenu() {
  const router = useRouter();
  const { signOut } = useAuth();
  const session = useSession();
  const t = useTranslations('shell');
  const email = session.status === 'signed-in' ? session.claims.email : null;

  return (
    <div className="flex items-center gap-2">
      {email ? <span className="text-sm text-muted-foreground">{email}</span> : null}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          signOut();
          router.replace('/login');
        }}
      >
        {t('signOut')}
      </Button>
    </div>
  );
}

function LoadingShell() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const session = useSession();
  const t = useTranslations('shell');

  useEffect(() => {
    if (session.status === 'signed-out') {
      router.replace('/login?next=' + encodeURIComponent(pathname));
    }
  }, [session.status, router, pathname]);

  if (session.status === 'loading') {
    return <LoadingShell />;
  }

  if (session.status === 'signed-out') {
    // Middleware is the primary guard; this effect + null render is
    // belt-and-braces for client-side navigations that bypass it.
    return null;
  }

  return (
    <AppShell
      title={t('title')}
      nav={[{ title: t('navClients'), href: '/', icon: <Building2 className="size-4" /> }]}
      actions={<UserMenu />}
      currentPath={pathname}
      linkComponent={NavLink}
      openMenuLabel={t('openMenu')}
    >
      {children}
    </AppShell>
  );
}
