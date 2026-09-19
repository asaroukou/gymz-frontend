'use client';

import { Menu } from 'lucide-react';
import { useState, type AnchorHTMLAttributes, type ComponentType, type ReactNode } from 'react';

import { Button } from '@iziwellpass/ui/components/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@iziwellpass/ui/components/sheet';
import { cn } from '@iziwellpass/ui/lib/utils';

export interface NavItem {
  title: string;
  href: string;
  icon?: ReactNode;
}

export interface NavGroup {
  /** Optional section heading. Omit for the leading (venue) group headed by navHeader. */
  label?: string;
  items: NavItem[];
}

export interface AppShellProps {
  /** App name shown in the sidebar header and mobile topbar. */
  title: string;
  nav?: NavItem[];
  /** Grouped nav; takes precedence over `nav`. Groups render top-to-bottom with a hairline between them. */
  navGroups?: NavGroup[];
  /** Sidebar slot rendered below the wordmark, above the nav (e.g. the venue switcher). */
  navHeader?: ReactNode;
  /** Right-hand topbar slot (e.g. user menu / sign-out). */
  actions?: ReactNode;
  /** Left-hand topbar slot, before the actions group (e.g. a venue switcher). */
  leading?: ReactNode;
  /** Current pathname for active-item highlighting (pass from usePathname()). */
  currentPath?: string;
  /**
   * Component used to render nav links (e.g. pass next/link's Link).
   * Defaults to a plain <a>, which causes full page reloads — fine for
   * static shells, pass a client-side Link for SPA navigation.
   */
  linkComponent?: ComponentType<AnchorHTMLAttributes<HTMLAnchorElement>>;
  /** Called after any nav link is clicked (AppShell also closes the mobile drawer). */
  onNavigate?: () => void;
  /** Accessible label for the mobile menu trigger. Defaults to "Open menu". */
  openMenuLabel?: string;
  children: ReactNode;
}

function DefaultLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} />;
}

/** Active when the path exactly matches `/`, or is a prefix match for any other href. */
function isActivePath(href: string, currentPath?: string): boolean {
  if (!currentPath) {
    return false;
  }
  if (href === '/') {
    return currentPath === '/';
  }
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

function Wordmark({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <span
        aria-hidden="true"
        className="grid size-8 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
      >
        iW
      </span>
      <span className="font-[800] text-base tracking-[-0.04em]">{title}</span>
    </div>
  );
}

function NavGroupList({
  groups,
  currentPath,
  linkComponent: LinkComponent = DefaultLink,
  onNavigate,
}: {
  groups: NavGroup[];
  currentPath?: string;
  linkComponent?: ComponentType<AnchorHTMLAttributes<HTMLAnchorElement>>;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col px-2 py-2">
      {groups.map((group, i) => (
        <div
          key={group.label ?? `group-${i}`}
          className={cn('flex flex-col gap-1', i > 0 && 'mt-3 border-t border-border pt-3')}
        >
          {group.label ? (
            <p className="eyebrow px-4 pb-1 text-muted-foreground">{group.label}</p>
          ) : null}
          {group.items.map((item) => {
            const active = isActivePath(item.href, currentPath);
            return (
              <LinkComponent
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                data-active={active || undefined}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-11 items-center gap-2 px-4 text-sm transition-colors outline-none lg:h-9',
                  active
                    ? 'relative font-[800] text-foreground after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:rounded-pill after:bg-current after:content-[""]'
                    : 'font-[650] text-foreground opacity-[0.62] transition-opacity duration-[360ms] hover:opacity-100',
                )}
              >
                {item.icon}
                {item.title}
              </LinkComponent>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function toGroups(navGroups?: NavGroup[], nav?: NavItem[]): NavGroup[] {
  if (navGroups && navGroups.length > 0) return navGroups;
  return nav ? [{ items: nav }] : [];
}

export function AppShell({
  title,
  nav,
  navGroups,
  navHeader,
  actions,
  leading,
  currentPath,
  linkComponent,
  onNavigate,
  openMenuLabel = 'Open menu',
  children,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const groups = toGroups(navGroups, nav);

  const handleNavigate = () => {
    setMobileOpen(false);
    onNavigate?.();
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar: a hairline, not a desk, separates it from the content */}
      <aside className="hidden w-[248px] shrink-0 flex-col border-r md:flex">
        <div className="flex h-[72px] items-center">
          <Wordmark title={title} />
        </div>
        {navHeader ? <div className="px-2 pb-2">{navHeader}</div> : null}
        <NavGroupList
          groups={groups}
          currentPath={currentPath}
          linkComponent={linkComponent}
          onNavigate={handleNavigate}
        />
      </aside>

      {/* Content column: the page is the sheet, so no card, radius or shadow */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-full flex-1 flex-col">
          {/* Topbar */}
          <header className="flex h-[60px] shrink-0 items-center gap-3 border-b px-6">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label={openMenuLabel}
                >
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[248px] bg-background p-0"
                aria-describedby={undefined}
              >
                <SheetTitle asChild>
                  <div className="flex h-[72px] items-center">
                    <Wordmark title={title} />
                  </div>
                </SheetTitle>
                {navHeader ? <div className="px-2 pb-2">{navHeader}</div> : null}
                <NavGroupList
                  groups={groups}
                  currentPath={currentPath}
                  linkComponent={linkComponent}
                  onNavigate={handleNavigate}
                />
              </SheetContent>
            </Sheet>
            {leading}
            <div className="ml-auto flex items-center gap-3">{actions}</div>
          </header>

          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
