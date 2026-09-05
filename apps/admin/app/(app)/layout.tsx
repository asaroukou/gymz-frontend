'use client';

import type { AnchorHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useAuth, useSession } from '@iziwellpass/auth/provider';
import { AppShell } from '@iziwellpass/ui/app-shell';
import { Button } from '@iziwellpass/ui/components/button';

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

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations('shell');

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
