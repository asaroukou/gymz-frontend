'use client';

import { Menu } from 'lucide-react';
import { useState, type AnchorHTMLAttributes, type ComponentType, type ReactNode } from 'react';

import { Button } from '@iziwellpass/ui/components/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@iziwellpass/ui/components/sheet';
import { Wordmark } from '@iziwellpass/ui/components/wordmark';
import { cn } from '@iziwellpass/ui/lib/utils';

export interface NavItem {
  title: string;
  href: string;
  icon?: ReactNode;
}

export interface NavGroup {
  /** Optional section label (13/500 atténué, sentence case). */
  label?: string;
  items: NavItem[];
}

export interface AppShellProps {
  /** App name shown in the wordmark (side column and drawer). */
  title: string;
  nav?: NavItem[];
  /** Grouped nav; takes precedence over `nav`. */
  navGroups?: NavGroup[];
  /** Column slot rendered under the brand row, above the nav. */
  navHeader?: ReactNode;
  /** Column slot pinned at the bottom (venue switcher, user menu). */
  navFooter?: ReactNode;
  /** Mobile top bar, left of the actions (e.g. the compact venue switcher). Desktop has no top bar. */
  leading?: ReactNode;
  /** Mobile top bar, right-aligned (e.g. the avatar menu). Desktop has no top bar. */
  actions?: ReactNode;
  /** Current pathname for active-item highlighting (pass from usePathname()). */
  currentPath?: string;
  /**
   * Component used to render nav links (e.g. pass next/link's Link).
   * Defaults to a plain <a>, which causes full page reloads.
   */
  linkComponent?: ComponentType<AnchorHTMLAttributes<HTMLAnchorElement>>;
  /** Called after any nav link is clicked (AppShell also closes the drawer). */
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
  if (!currentPath) return false;
  if (href === '/') return currentPath === '/';
  return currentPath === href || currentPath.startsWith(`${href}/`);
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
    <nav className="flex flex-col gap-0.5">
      {groups.map((group, i) => (
        <div key={group.label ?? `group-${i}`} className="flex flex-col gap-0.5">
          {group.label ? (
            <p className="px-3.5 pt-5 pb-1.5 text-sm font-medium text-muted-foreground">
              {group.label}
            </p>
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
                  'flex h-[42px] items-center gap-3 rounded-full px-3.5 text-base text-foreground transition-colors duration-200 [&_svg]:size-[18px] [&_svg]:shrink-0',
                  active ? 'bg-secondary font-semibold' : 'font-normal hover:bg-accent/60',
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

function Column({
  title,
  navHeader,
  navFooter,
  groups,
  currentPath,
  linkComponent,
  onNavigate,
}: {
  title: string;
  navHeader?: ReactNode;
  navFooter?: ReactNode;
  groups: NavGroup[];
  currentPath?: string;
  linkComponent?: ComponentType<AnchorHTMLAttributes<HTMLAnchorElement>>;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-0.5 overflow-y-auto px-3 py-4">
      <div className="px-2.5 pt-2 pb-5">
        <Wordmark name={title} />
      </div>
      {navHeader ? <div className="pb-2">{navHeader}</div> : null}
      <NavGroupList
        groups={groups}
        currentPath={currentPath}
        linkComponent={linkComponent}
        onNavigate={onNavigate}
      />
      <div className="flex-1" />
      {navFooter ? <div className="flex flex-col gap-0.5">{navFooter}</div> : null}
    </div>
  );
}

export function AppShell({
  title,
  nav,
  navGroups,
  navHeader,
  navFooter,
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

  const column = (
    <Column
      title={title}
      navHeader={navHeader}
      navFooter={navFooter}
      groups={groups}
      currentPath={currentPath}
      linkComponent={linkComponent}
      onNavigate={handleNavigate}
    />
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop: the côté column is the only frame — a tone, not a border */}
      <aside className="hidden w-[260px] shrink-0 bg-side md:sticky md:top-0 md:block md:h-screen">
        {column}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar; there is no desktop header */}
        <header className="flex h-14 shrink-0 items-center gap-2.5 px-3 md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={openMenuLabel}>
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[300px] bg-side p-0"
              aria-describedby={undefined}
            >
              <SheetTitle className="sr-only">{title}</SheetTitle>
              {column}
            </SheetContent>
          </Sheet>
          {leading}
          <div className="ml-auto flex items-center gap-2">{actions}</div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
