'use client';

import { useEffect, type AnchorHTMLAttributes, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Building2,
  CalendarDays,
  DoorOpen,
  LayoutDashboard,
  Tags,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useAuth, useSession } from '@iziwellpass/auth/provider';
import { AppShell, type NavGroup } from '@iziwellpass/ui/app-shell';
import { Avatar, AvatarFallback } from '@iziwellpass/ui/components/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@iziwellpass/ui/components/dropdown-menu';
import { Skeleton } from '@iziwellpass/ui/components/skeleton';

import { navGroupsForRole, type NavLabelKey } from '@/lib/nav';
import { VenueProvider } from '@/lib/venue-context';
import { VenueSwitcher } from '@/components/venue-switcher';

/** Lucide icon per nav item, rendered at the start of each sidebar link. */
const NAV_ICONS: Record<NavLabelKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  frontdesk: DoorOpen,
  members: Users,
  planning: CalendarDays,
  plans: Tags,
  venues: Building2,
  staff: UserCog,
};

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

function initials(nameOrEmail: string): string {
  const local = nameOrEmail.split('@')[0] ?? '';
  const parts = local.split(/[\s._+-]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const second = parts[1]?.[0] ?? '';
  return (first + second).toUpperCase() || '?';
}

function UserMenu({ variant = 'avatar' }: { variant?: 'avatar' | 'row' }) {
  const router = useRouter();
  const { signOut } = useAuth();
  const session = useSession();
  const t = useTranslations('shell');
  const email = session.status === 'signed-in' ? session.claims.email : null;
  const name = session.status === 'signed-in' ? (session.claims.name ?? email) : null;
  const role = session.status === 'signed-in' ? session.claims.role : null;

  const handleSignOut = () => {
    signOut();
    router.replace('/login');
  };

  const avatar = (
    <Avatar size={variant === 'row' ? 'default' : 'sm'}>
      <AvatarFallback>{initials(name ?? t('account'))}</AvatarFallback>
    </Avatar>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === 'row' ? (
          <button
            type="button"
            aria-label={t('account')}
            className="flex h-12 w-full items-center gap-2.5 rounded-xl py-1.5 pr-3.5 pl-2 text-left transition-colors hover:bg-accent/60"
          >
            {avatar}
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-md font-medium">{name ?? t('account')}</span>
              {role ? <span className="truncate text-xs text-muted-foreground">{role}</span> : null}
            </span>
          </button>
        ) : (
          <button type="button" aria-label={t('account')} className="rounded-full">
            {avatar}
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={handleSignOut}>{t('signOut')}</DropdownMenuItem>
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
  const tNav = useTranslations('nav');
  const tShell = useTranslations('shell');
  const groups = session.status === 'signed-in' ? navGroupsForRole(session.claims.role) : [];
  const navItemCount = groups.reduce((count, group) => count + group.items.length, 0);
  const navGroups: NavGroup[] = groups.map((group) => ({
    label: group.scope === 'org' ? tNav('organizationGroup') : undefined,
    items: group.items.map((item) => {
      const Icon = NAV_ICONS[item.labelKey];
      return {
        title: tNav(item.labelKey),
        href: item.href,
        icon: <Icon aria-hidden />,
      };
    }),
  }));

  useEffect(() => {
    if (session.status === 'signed-out') {
      router.replace('/login?next=' + encodeURIComponent(pathname));
      return;
    }
    if (session.status === 'signed-in' && navItemCount === 0) {
      // Signed in but no venue-staff role yet — send them to create one
      // instead of stranding them on a dead-end "no access" screen.
      router.replace('/onboarding');
    }
  }, [session.status, navItemCount, router, pathname]);

  if (session.status === 'loading') {
    return <LoadingShell />;
  }

  if (session.status === 'signed-out') {
    // Middleware is the primary guard; this effect + null render is
    // belt-and-braces for client-side navigations that bypass it.
    return null;
  }

  if (navItemCount === 0) {
    // The effect above is redirecting to /onboarding; render nothing while
    // that navigation completes.
    return null;
  }

  return (
    <VenueProvider>
      <AppShell
        title="IziWellPass"
        navGroups={navGroups}
        navFooter={
          <>
            <VenueSwitcher className="w-full" />
            <UserMenu variant="row" />
          </>
        }
        linkComponent={NavLink}
        currentPath={pathname}
        openMenuLabel={tShell('openMenu')}
        leading={<VenueSwitcher compact className="max-w-[200px]" />}
        actions={<UserMenu />}
      >
        {children}
      </AppShell>
    </VenueProvider>
  );
}
