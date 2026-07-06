'use client';

import { useEffect, type AnchorHTMLAttributes, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { useAuth, useSession } from '@iziwellpass/auth/provider';
import { AppShell } from '@iziwellpass/ui/app-shell';
import { Button } from '@iziwellpass/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@iziwellpass/ui/components/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@iziwellpass/ui/components/dropdown-menu';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';

import { navForRole } from '@/lib/nav';

/**
 * AppShell's `linkComponent` prop is typed as
 * `ComponentType<AnchorHTMLAttributes<HTMLAnchorElement>>`, whose `href` is
 * `string | undefined`. next/link's `Link` requires `LinkProps.href: Url`
 * (never undefined), so passing `Link` directly fails to type-check
 * ("Type 'string | undefined' is not assignable to type 'Url'"), confirmed
 * via a throwaway tsc probe. The plan's fallback wrapper is required here.
 */
function NavLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <Link href={props.href ?? '#'} {...props} />;
}

function UserMenu() {
  const router = useRouter();
  const { signOut } = useAuth();
  const session = useSession();
  const email = session.status === 'signed-in' ? session.claims.email : null;

  const handleSignOut = () => {
    signOut();
    router.replace('/login');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          {email ?? 'Account'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={handleSignOut}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NoAccessNotice() {
  const router = useRouter();
  const { signOut } = useAuth();

  const handleSignOut = () => {
    signOut();
    router.replace('/login');
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>No access</CardTitle>
          <CardDescription>Your account has no venue-staff role.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" onClick={handleSignOut}>
            Sign out
          </Button>
        </CardContent>
      </Card>
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

  useEffect(() => {
    if (session.status === 'signed-out') {
      router.replace('/login');
    }
  }, [session.status, router]);

  if (session.status === 'loading') {
    return <LoadingShell />;
  }

  if (session.status === 'signed-out') {
    // Middleware is the primary guard; this effect + null render is
    // belt-and-braces for client-side navigations that bypass it.
    return null;
  }

  const nav = navForRole(session.claims.role);

  if (nav.length === 0) {
    return <NoAccessNotice />;
  }

  return (
    <AppShell
      title="IziWellPass"
      nav={nav}
      linkComponent={NavLink}
      currentPath={pathname}
      actions={<UserMenu />}
    >
      {children}
    </AppShell>
  );
}
