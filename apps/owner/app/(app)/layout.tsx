'use client';

import { useEffect, type AnchorHTMLAttributes, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { useAuth, useSession } from '@iziwellpass/auth/provider';
import { AppShell } from '@iziwellpass/ui/app-shell';
import { Button } from '@iziwellpass/ui/components/button';
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
  const nav = session.status === 'signed-in' ? navForRole(session.claims.role) : [];

  useEffect(() => {
    if (session.status === 'signed-out') {
      router.replace('/login?next=' + encodeURIComponent(pathname));
      return;
    }
    if (session.status === 'signed-in' && nav.length === 0) {
      // Signed in but no venue-staff role yet — send them to create one
      // instead of stranding them on a dead-end "no access" screen.
      router.replace('/onboarding');
    }
  }, [session.status, nav.length, router, pathname]);

  if (session.status === 'loading') {
    return <LoadingShell />;
  }

  if (session.status === 'signed-out') {
    // Middleware is the primary guard; this effect + null render is
    // belt-and-braces for client-side navigations that bypass it.
    return null;
  }

  if (nav.length === 0) {
    // The effect above is redirecting to /onboarding; render nothing while
    // that navigation completes.
    return null;
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
