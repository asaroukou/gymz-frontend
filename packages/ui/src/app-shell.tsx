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

export interface AppShellProps {
  /** App name shown in the sidebar header and mobile topbar. */
  title: string;
  nav: NavItem[];
  /** Right-hand topbar slot (e.g. user menu / sign-out). */
  actions?: ReactNode;
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
      <span className="text-base font-semibold tracking-[-0.3px]">{title}</span>
    </div>
  );
}

function NavLinks({
  nav,
  currentPath,
  linkComponent: LinkComponent = DefaultLink,
  onNavigate,
}: {
  nav: NavItem[];
  currentPath?: string;
  linkComponent?: ComponentType<AnchorHTMLAttributes<HTMLAnchorElement>>;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1 p-2">
      {nav.map((item) => {
        const active = isActivePath(item.href, currentPath);
        return (
          <LinkComponent
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            data-active={active || undefined}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/15 lg:h-9',
              active
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {item.icon}
            {item.title}
          </LinkComponent>
        );
      })}
    </nav>
  );
}

export function AppShell({
  title,
  nav,
  actions,
  currentPath,
  linkComponent,
  onNavigate,
  openMenuLabel = 'Open menu',
  children,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavigate = () => {
    setMobileOpen(false);
    onNavigate?.();
  };

  return (
    <div className="flex min-h-screen bg-backdrop">
      {/* Desktop sidebar (transparent on the desk) */}
      <aside className="hidden w-[248px] shrink-0 flex-col md:flex">
        <div className="flex h-[72px] items-center">
          <Wordmark title={title} />
        </div>
        <NavLinks
          nav={nav}
          currentPath={currentPath}
          linkComponent={linkComponent}
          onNavigate={handleNavigate}
        />
      </aside>

      {/* Content column */}
      <div className="flex min-w-0 flex-1 flex-col p-3 pl-0 max-md:pl-3">
        <div className="flex min-h-full flex-1 flex-col overflow-hidden rounded-2xl border bg-background shadow-xs">
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
                className="w-[248px] bg-backdrop p-0"
                aria-describedby={undefined}
              >
                <SheetTitle asChild>
                  <div className="flex h-[72px] items-center">
                    <Wordmark title={title} />
                  </div>
                </SheetTitle>
                <NavLinks
                  nav={nav}
                  currentPath={currentPath}
                  linkComponent={linkComponent}
                  onNavigate={handleNavigate}
                />
              </SheetContent>
            </Sheet>
            <div className="ml-auto flex items-center gap-3">{actions}</div>
          </header>

          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
